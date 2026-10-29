# Multigiocatore locale (`HH.mp`)

Due telefoni giocano insieme **senza internet**: Wi-Fi di casa o hotspot di uno dei due.
Nessun server, nessun account e nessuna libreria esterna. L'abbinamento passa per una **melodia di Hari** e, se non va,
per un **QR** o un **codice da copiare**. Alla fine i due schermi mostrano **4 frutti** da confrontare.

Il contratto con i giochi è nel file condiviso dagli agenti (`mp-contract.md`, v1). Qui c'è come è fatto il modulo.

## File (lazy load, mai nel nucleo)

| File | Contenuto | Dimensione |
|---|---|---|
| `src/net/sonic.js` | modem acustico (puro + microfono/altoparlante), Reed-Solomon `HH.rs`, CRC-16 | ~23 KB |
| `src/net/qr.js` | QR: generatore v1–10 e lettore locale, fotocamera con `BarcodeDetector` o decoder locale, base45 | ~26 KB |
| `src/net/mp.js` | payload SDP compatto, codici, frutti, `Link` (WebRTC e in memoria), sessione host-autoritativa | ~29 KB |
| `src/net/mp-ui.js` + `mp.css` | dialogo `HH.mp.pair` | ~37 KB |

Un gioco che usa il multigiocatore li elenca nei `files` del catalogo nell'ordine **sonic, qr, mp, mp-ui, mp.css**
(`qr.js` usa `HH.rs` di `sonic.js`). `tools/mp-demo.html` è una piccola demo (non è nel catalogo).

## Architettura

```
HH.mp.pair(opts) ──► dialogo (mp-ui.js)
   │  Ospita: HH.mp.peer('host').offer() → payload ~40 byte
   │     ├─ suono: HH.sonic.open() → send(payload) … ascolta la risposta      (ripete fino a 5 volte)
   │     ├─ QR:    HH.qr.svg(HH.qr.encode(HH.mp.toQr(payload)))  → poi inquadra la risposta
   │     └─ codice: HH.mp.toCode(payload) da copiare / incollare
   │  Unisciti: ascolta (o inquadra / incolla) → peer('guest').accept(offerta) → risposta (canta / QR / codice)
   ▼
RTCPeerConnection (iceServers: [] → solo candidati "host" della LAN)
   DataChannel 'rel' (id 0, ordinato, affidabile) + 'un' (id 1, non ordinato, maxRetransmits 0)
   ▼
Link: send(msg, { reliable }) · on('message' | 'close' | 'rtt' | 'hello') · ping 1 s · chiusura dopo 6 s di silenzio
   ▼  frutti: SHA-256("hari-sas-v1|" + impronte DTLS ordinate) → 4 × 4 bit → 16 frutti
   ▼  "Sì, è uguale" su entrambi → la Promise di pair() risolve col Link
HH.mp.session(link, opts): host = autorità a tick fissi; ospite = input + interpolazione
```

### Payload (offerta e risposta, formato v1)

Da un SDP di Chromium (~600 byte) restano solo i campi che servono a ricostruirlo:

| Byte | Campo |
|---|---|
| 0 | `vv t c s nnn`: versione (1) · tipo (0 offerta, 1 risposta) · credenziali esplicite · setup passive · numero di IPv4 |
| 1 | etichetta del gioco (8 bit di FNV-1a del nome): l'ospite di un altro gioco riceve un errore chiaro |
| 2–33 | impronta SHA-256 del certificato DTLS |
| (se `c`) | lunghezza + ufrag, lunghezza + pwd in ASCII |
| 6 × n | candidati host UDP IPv4: 4 byte indirizzo + 2 byte porta (al massimo 4, doppioni tolti) |
| resto | solo se non c'è nessun IPv4: 19 byte per candidato (tipo 1 = IPv6 globale, 2 = nome mDNS `uuid.local`) |

- **Credenziali ICE a 0 byte**: prima di `setLocalDescription` ufrag e pwd vengono sostituiti con valori ricavati dall'impronta
  (`ufrag` = base64 dei byte 0–2 → 4 caratteri, `pwd` = base64 dei byte 3–20 → 24 caratteri; minimi ICE 4 e 22, alfabeto `A–Z a–z 0–9 + /`).
  Chromium 153 accetta questo "munging"; se un browser lo rifiuta si usa l'SDP originale e si attiva il bit `c` (+30 byte).
- Si tengono solo candidati `host` UDP: niente STUN/TURN (offline non servono), niente TCP, srflx, link-local `fe80::`.
- Un'offerta tipica (un IPv4) è di **40 byte**; con mDNS 53. La risposta ha lo stesso formato (setup `active`).
- **Codice testuale**: `HH` + base64url(payload + CRC-16), 58 caratteri. **QR**: `HH:` + base45 (RFC 9285), modo alfanumerico, versione 4-M (33×33).

### Candidati mDNS e IP reali (verificato in Chromium 153)

Senza permessi di cattura Chromium nasconde gli IP locali dietro nomi `uuid.local` (mDNS). Offline la risoluzione mDNS
funziona solo se la rete inoltra il multicast (spesso no sugli hotspot e sulle reti ospiti). **Con un `getUserMedia` concesso**
(microfono o fotocamera) Chromium espone invece gli IP host reali (`192.168.x.y`). Dato che l'abbinamento chiede comunque il
microfono (suono) o la fotocamera (QR), il payload contiene di norma l'IP vero. Solo nel percorso "codice testuale" senza alcun
permesso restano i nomi `.local` (fixture `tests/fixtures/sdp/chromium-offer-mdns.sdp`).

## Modem acustico (`sonic.js`)

### Scelta della banda: melodia udibile, non ultrasuoni

| | Pentatonica udibile (scelta) | 17–19 kHz |
|---|---|---|
| Altoparlanti dei telefoni | ottimi tra 0,5 e 4 kHz | molti calano sopra i 16 kHz, alcuni filtrano |
| Microfoni / elaborazione | ok con `echoCancellation`, `noiseSuppression`, `autoGainControl` disattivati | alcuni Android tagliano sopra 16 kHz; a 44,1 kHz si è vicini a Nyquist |
| Deriva di clock ±0,5 % | 3–21 Hz su note distanti ≥ 12 %: innocua con finestre a Q costante | 90 Hz: più della spaziatura delle note (~130 Hz), serve inseguire la frequenza |
| Esperienza | si sente Hari cantare: il giocatore capisce che sta funzionando e se alzare il volume | silenzio: impossibile capire se va |

### Parametri

- **16 note** della pentatonica maggiore di Do, da Do5 (523 Hz) a Do8 (4186 Hz): ogni sequenza suona intonata.
  1 nota = 4 bit, **50 ms** per nota (20 baud, 80 bit/s lordi). Note pure (niente armoniche, cadrebbero su altre note),
  attacco di 3 ms e decadimento da carillon (riduce l'eco sulla nota successiva).
- **Trama**: preambolo di 10 note fisse (il "jingle" di Hari) · lunghezza L in 6 note (due nibble, tre copie permutate,
  decisione soft) · corpo = [dati + CRC-16] + nsym byte Reed-Solomon (nsym = 2·⌈L/10⌉ + 4), sbiancato con una sequenza
  xorshift fissa (melodia varia, mai la stessa nota a lungo) · nota finale (Do7, solo estetica).
- **Durata**: offerta di 40 byte = **6,7 s** (46 byte 7,3 s; 52 byte 8,1 s).
- **Ricezione**: microfono senza filtri → AudioWorklet (blocchi da 1024 campioni; ScriptProcessor se manca) → per ogni nota
  una DFT scorrevole (fasore ricorsivo, somme complesse per hop da 1 ms, somme prefisse). Energia di simbolo con finestre a Q
  costante (~20 cicli: 39 ms a 523 Hz, 5 ms a 4 kHz) mediate sul simbolo, soglia di rumore per nota (30° percentile sulla trama).
  Il preambolo si cerca in continuo (rapporto energia attesa/totale > 0,42, centro dell'altopiano); poi la lunghezza; poi il corpo
  con una ricerca a griglia di inizio (±3 ms) e velocità (±0,8 %, passo 0,1 %), tentando anche la sottrazione dell'eco della
  nota precedente (β = 0,5 e 0,8). Reed-Solomon GF(256) con errori e **cancellazioni** (le note meno sicure), poi CRC-16.
  Costo: ~45 ms di CPU per 7 s di audio.
- **Ripetizione**: l'host canta, ascolta 11,5 s, ricanta (fino a 5 volte). L'ospite risponde 0,35 s dopo aver capito
  l'offerta; se risente la stessa offerta (l'host non l'ha sentito) ricanta subito, altrimenti dopo 7,5 s (fino a 4 volte).
  La conferma è il DataChannel che si apre.
- **Volume**: l'host ascolta anche sé stesso mentre canta. Se non sente il proprio preambolo compare "Alza il volume!";
  alla seconda volta si passa al QR.

### Tasso di successo (tests/sonic.test.mjs, stanza simulata)

Ogni condizione: 8 trasmissioni da 40–52 byte, a 48 e 44,1 kHz.

| Condizione | Successo |
|---|---|
| pulito | 8/8 |
| rumore bianco, SNR banda larga ~0 dB | 8/8 |
| riverbero leggero (RT60 0,4 s, 35 % riflesso) | 8/8 |
| riverbero medio (RT60 0,8 s, 50 %) | 8/8 |
| deriva di clock +0,5 % e −0,5 % | 8/8 e 8/8 |
| volume basso (−30 dB) + fruscio | 8/8 |
| tutto insieme (deriva, riverbero, −20/−26 dB, rumore, ronzio a 100 Hz) | 8/8 e 8/8 |

Prove manuali più dure: SNR a banda larga fino a −6 dB ok; deriva ±0,9 % ok; RT60 1,0 s ok con la sottrazione dell'eco,
RT60 1,2 s con 60 % di riflesso ~50 %. La simulazione non riproduce la risposta degli altoparlanti né l'AGC dei telefoni:
per questo le note stanno tra 0,5 e 4 kHz e c'è sempre il QR.

## QR (`qr.js`)

- **Generatore** scritto qui (algoritmo dello standard ISO/IEC 18004, stile Nayuki): versioni 1–10, livelli L/M/Q/H, modi
  alfanumerico e byte, scelta della maschera per penalità. Verificato in sviluppo con il lettore di OpenCV.
- **Lettore locale**: binarizzazione adattiva (Bradley, integrale; secondo tentativo con sfocatura 3×3), ricerca dei tre
  finder con run 1:1:3:1:1 su riga, colonna e **due diagonali** (vale a ogni rotazione), scelta della terna più "a squadra",
  modulo misurato lungo i lati, pattern di allineamento cercato con un modello 5×5, omografia a 4 punti, lettura del formato
  (distanza di Hamming ≤ 3), demascheramento, deinterlacciamento, Reed-Solomon (`HH.rs`), segmenti numerico/alfanumerico/byte.
  Prova anche l'immagine speculare. ~5–30 ms per fotogramma da 640 px.
- **Fotocamera**: `BarcodeDetector` dove esiste (Android), altrimenti il lettore locale a ~6 fotogrammi/s.
- Il QR è sempre scuro su carta chiara (`--mp-qr-ink` / `--mp-qr-paper`) anche nel tema scuro.

## Quando si passa al QR

| Situazione | Cosa succede |
|---|---|
| host con gli effetti sonori spenti (`HH.audio.sfx.isMuted()`) | l'host mostra subito il QR ("Il suono è spento…") |
| Web Audio sospeso (`AudioContext.state !== 'running'` dopo `resume`) | QR |
| microfono assente o permesso negato | QR (host: mostra; ospite: inquadra) |
| l'host non sente la propria canzone due volte (volume basso) | QR |
| nessuna risposta dopo 5 canzoni | QR |
| l'ospite non sente nulla per 24 s | passa a inquadrare il QR, ma continua ad ascoltare |
| l'ospite canta 4 volte senza collegamento | mostra il QR della risposta |
| sempre | "Inquadra un QR code" (ospite), "Problemi?" → QR o codice testuale |
| niente fotocamera | codice testuale (copia, condividi, incolla) |

L'ospite con gli effetti spenti canta comunque la risposta: ha scelto lui "Unisciti" e il suono serve solo all'abbinamento.
Durante l'abbinamento la musica dell'app si ferma (coprirebbe la canzone) e riparte alla fine.

## Link e sessione

`Link` (WebRTC o `HH.mp.loopback`) incapsula ogni messaggio in una trama di testo: `m` messaggio del gioco, `c` canale con nome
(lo usa la sessione: non arriva agli ascoltatori di `message`), `h` saluto con `{ name, avatar }`, `p`/`q` ping e pong (rtt
con media esponenziale), `s` conferma dei frutti, `b` ciao. Sul canale non affidabile si scarta se il buffer supera 64 KB.
Chiusura: `close('local')` → l'altro riceve `close('remote')`; 6 s di silenzio o ICE `failed` → `close('lost')`.

`HH.mp.session(link, opts)` — host-autoritativa a tick fissi (`tick` Hz, default 30):

- **Host** (giocatore 1): a ogni tick `step(dt, [inputP1, inputP2])`; ogni `sendEvery` tick `snapshot()` quantizzato a 3
  decimali e spedito sul canale non affidabile come **delta** rispetto all'ultima istantanea confermata dall'ospite
  (completo se la conferma manca o ha più di 2 s). Input dell'ospite: il più recente, con le pressioni brevi (campi `true`/`1`)
  degli input saltati che restano vere per un tick.
- **Ospite** (giocatore 2): a ogni tick manda il proprio input con i 2 precedenti (ridondanza) e la conferma dell'ultima
  istantanea; `predict(dt, input)` facoltativo. In `frame(now)` stima l'orologio dell'host (campione meno ritardato degli
  ultimi 3 s), disegna `delay` ms (100) nel passato e chiama `apply(nuova, alpha, vecchia)`. `HH.mp.lerp(vecchia, nuova, alpha)`
  interpola in profondità i campi numerici.
- **Eventi** `session.event(obj)` nei due sensi, sul canale affidabile, numerati: una volta sola e in ordine,
  `on('event', (obj, { tick }) => …)`.
- `on('close', why)`, `on('snapshot', (s, tick))`, `latest`, `stats = { rtt, lost, tick, bytes, maxBytes, full, delta, stale }`.
- **Dimensione delle istantanee**: consigliato ≤ ~1 KB per delta (un pacchetto UDP: sul canale non affidabile un messaggio
  più grande viene spezzato da SCTP in frammenti da ~1,2 KB e basta perderne uno per perdere tutto). Le istantanee complete
  grandi (> 1,1 KB, cioè la base dei delta, all'inizio o dopo 2 s senza conferme) vanno sul canale **affidabile**, al massimo
  ogni 300 ms. Limite pratico: complete fino a ~16 KB, delta medi sotto 1 KB. Test: 60 nemici, ~6 KB completi, 60 Hz,
  `sendEvery: 3`, 15 % di perdite → l'ospite converge. Per stati più grandi: mandare meno campi (solo ciò che serve a disegnare),
  arrotondare (la sessione quantizza già a 3 decimali), usare array al posto di oggetti con chiavi lunghe.

## Test

- `tests/sonic.test.mjs`: Reed-Solomon (errori e cancellazioni), CRC, scala e durata, ricezione a blocchi da 128 campioni,
  nessun falso allarme su rumore e su musica nelle stesse note, e la tabella di successo qui sopra (`tests/_channel.mjs`:
  ricampionamento per la deriva, riverbero di Schroeder, rumore, ronzio, guadagno).
- `tests/mp.test.mjs`: payload con SDP reali di Chromium (`tests/fixtures/sdp/`, con e senza mDNS, più un SDP "Android" sintetico
  con IPv6, TCP, srflx, link-local e doppioni), codici e QR con errori, lettore QR su immagini ruotate/prospettiche/rumorose/macchiate,
  frutti, link in memoria, sessione con 60 ms ± 30 ms e 20 % di perdite (l'ospite converge allo stato dell'host), eventi.
  I tempi si allungano con `CI=1` (`SLOW = 3`).
- `tools/mp-e2e.mjs` (Playwright, a mano): due contesti Chromium con microfono e fotocamera finti collegati dallo script;
  percorsi suono, QR (host muto) e codice; fino ai 4 frutti, al DataChannel aperto, a una partita della demo e alla chiusura;
  screenshot 360×760 nei due temi; nessun errore in console.

## Limiti

- **Isolamento dei client** (reti ospiti, alcuni router "AP isolation", Wi-Fi pubblici): i telefoni non si vedono. L'errore
  lo dice; la soluzione è l'hotspot di uno dei due telefoni.
- **Hotspot**: chi fa l'hotspot ha un IP del tipo `10.x` / `192.168.43.x`; funziona, sono candidati host come gli altri.
- **iOS / Safari**: WebRTC c'è, ma il munging delle credenziali potrebbe essere rifiutato (si passa al formato esplicito,
  canzone ~3,5 s più lunga); `BarcodeDetector` non esiste (lettore locale); la cattura audio con `echoCancellation: false`
  può comunque passare per l'elaborazione "voice". Non provato su un iPhone vero.
- **Android**: con il microfono aperto alcuni telefoni abbassano o spostano l'audio; per questo l'host controlla di sentirsi.
- **Rumore** forte (TV accesa, musica nella stessa banda) o telefoni lontani più di ~1 m: la canzone si ripete e poi c'è il QR.
- Solo **2 giocatori**. Niente reconnessione automatica dopo una caduta: decide il gioco (CPU o menu).

## Privacy

Tutto resta nella rete locale: nessun server, nessuno STUN/TURN, nessuna richiesta fuori dal telefono. Il microfono
analizza il suono in memoria (niente registrazioni, niente invii) e si spegne alla fine dell'abbinamento; lo stesso vale
per la fotocamera. Nel payload ci sono solo l'impronta del certificato temporaneo, gli IP locali e le porte: valgono
solo per quella partita. Il nome mostrato all'altro è quello che il gioco passa a `pair()` (di default vuoto).
Vedi anche [privacy.md](privacy.md).
