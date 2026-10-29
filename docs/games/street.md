# Hari Snack Street

Picchiaduro a scorrimento laterale "alla Double Dragon", ma **senza violenza**: Hari e la sua amica scoiattolina **Kiki**
avanzano per le strade e "combattono" sfamando. Gli avversari sono animali affamati con una **pancia da riempire** al
posto della vita: quando sono sazi si siedono felici, fanno un cuoricino e se ne vanno saltellando. Alla fine di ogni
livello arriva un **golosone** (animalone col bavaglino e la coroncina) con attacchi a schema.

- id `street`, brand **Hari Snack Street** (non tradotto), regole `r20`, `since: '0.21.0'`, brano `street`,
  tinta `--tint-street`, token `--st-*`.
- Nome: continua la famiglia "Snack" (Hari Snack Rush): stesso modo gentile di "combattere" (le merende), mentre
  *Street* richiama i picchiaduro di strada a scorrimento. Corto, leggibile su una card e uguale in tutte le lingue.
- File: `src/games/street-logic.js` (logica pura), `src/games/street-art.js` (disegni SVG), `src/games/street-ui.js`
  (canvas, comandi, modalità, rete), `src/games/street.css`, `tests/street.test.mjs`, `tests/_street-bot.mjs` (bot dei
  test), `src/net/mp-stub.js` (stub di sviluppo del multigiocatore, **non** nel catalogo).

## Regole
- La strada è un piano pseudo-3D: `x` lungo la strada, `y` profondità del marciapiede (0 davanti … 3 m in fondo),
  `z` altezza del salto. La telecamera vede 10 m e avanza solo in avanti.
- **Mosse** (P1 · P2 da tastiera; touch: levetta a sinistra, pulsanti a destra):

  | Mossa | Tasti | Cosa fa |
  |---|---|---|
  | muoversi | frecce · WASD | avanti/indietro e su/giù nella profondità |
  | porgi | Z · F | merenda da vicino (Hari 2 bocconi ogni 0,26 s, Kiki 1 ogni 0,16 s); senza nessuno davanti ci si gira da soli |
  | lancia | X · G | merenda a distanza (Hari 6 m, Kiki 8,5 m) |
  | salta | C · H | evita angurie, onde d'urto e morsi; in salto si raggiunge la gazza in volo |
  | speciale | V · R | quando la barra è piena: **torta gigante** (Hari, 9 bocconi a tutti nel raggio, 14 al golosone) o **pioggia di frutti** (Kiki, 5 bocconi a tutti in scena, 11 al golosone) |
  | presa | camminare contro un animale imbambolato | poi "porgi" = **cesto intero** (8 bocconi + 2 a chi è vicino) |

  La barra dello speciale si carica sfamando (5,5% a boccone) e con le stelle. Tre bocconi di fila allo stesso animale lo
  **imbambolano** (1,5 s, stelline): è il momento della presa.
- **Personaggi**: Hari ha 6 pallini di energia, porge di più e salta meno; Kiki ne ha 5, è più veloce, lancia più lontano
  e salta più in alto.
- **Animali affamati** (fame base × curva del livello):

  | Animale | Fame | Comportamento | Dal livello |
  |---|---|---|---|
  | coniglietto | 3 | si avvicina e mordicchia | 1 |
  | procione | 4 | **ruba le merende lanciate** (scappa ridacchiando e torna): va sfamato da vicino; se ti mordicchia ruba anche un po' di speciale | 2 |
  | cinghialotto | 5 | si mette **in fila** con te e, dopo un preavviso (fascia rosa + "!"), **carica** in linea retta: spostati in profondità o salta; se lo sfami mentre si prepara si ferma | 3 |
  | gazza | 3 | vola: **prende al volo** le merende lanciate (da lontano è il modo giusto); ogni tanto **mira** (0,45 s) e scende in **picchiata** sul punto mirato; bassa la si sfama anche porgendo | 4 |
  | volpi | 4 | arrivano **in coppia** dai due lati e mordicchiano insieme | 5 |
  | orsetto | 9 | lento e grosso, il morso spinge un po' | 6 |

  Sopra la testa c'è la barra della pancia; un "!" lampeggiante annuncia il morso (0,3–0,6 s): chi lo vede in tempo si
  sposta o lo sfama (un boccone ferma il morso). Al massimo **1–3 animali** (secondo il livello) possono preparare un
  attacco contro lo stesso giocatore insieme: niente accerchiamenti impossibili.
- **Energia e cuori**: un morso (o un'anguria, un'onda, l'animalone) toglie un pallino e dà 1,1 s di invulnerabilità
  (il personaggio lampeggia). A energia finita il personaggio fa un **pisolino** di 1,8 s e la squadra perde **un cuore**
  (3 in tutto, contratto `lives: 3`); poi torna con l'energia piena. Dopo ogni ondata saziata c'è la **merenda della
  pausa**: un pallino a testa.
- **Ambiente**: cassette di frutta (si aprono porgendo o lanciando: mela = +2 energia, stella = +50% speciale, cesto = il
  prossimo "porgi" è un cesto intero), **carrelli** (camminandoci contro partono e sfamano di 4 chi incontrano), ceste.
- **Livello**: 3–5 tratti di strada da 12 m. A ogni blocco arriva un'ondata (gli animali entrano dai lati, un po' alla
  volta); quando tutti sono sazi compare **"GO →"** e si avanza. Ambientazioni a rotazione: **mercato del bosco, città,
  porto, fiera, treno** (in tema scuro: di notte).
- **Golosone** (fine livello), uno per ambientazione: orso (mercato), cinghiale (città), gabbiano (porto), re procione
  (fiera), panda (treno). Pancia grande (60 bocconi al livello 1, +9 a livello, ×1,6 in due), fasi a 50% e 80% con
  attacchi più fitti. Davanti alla bocca mordicchia (si sfama meglio da un passo di distanza). Attacchi:
  - **angurie che rotolano** su file che coprono **tutta la profondità** della strada (3–5 file, a volte sfalsate): non
    si evitano camminando, **si saltano**, oppure se ne ferma una con 2 merende lanciate (diventa una fetta e carica lo
    speciale);
  - **pestone**: un'onda d'urto ellittica che si allarga su tutta la strada: **si evita solo saltando** al momento giusto;
  - **carica** lungo la tua fila (la fila si decide nei primi 0,4 s del preavviso, poi resta ferma);
  - **picchiata** (gabbiano): ombra rossa sul punto in cui atterra dopo 1 s;
  - **risucchio goloso**: tira tutti verso la bocca; **si interrompe dandogli da mangiare** ("Gulp!");
  - **chiamata dei piccoli** (2, in due 3).
- **Fragoline**: 3 senza cuori persi, 2 con uno, 1 oltre. `parTime` = ondate × 22 s + 30 s + pancia/4. "Mosse" =
  animali saziati. `progress`: 0..0,7 lungo i tratti, 0,7..1 la pancia del golosone.
- **Novità**: la prima volta che compare un animale, le cassette, il carrello, la presa, il furto del procione o il
  golosone appare un cartello "Nuovo!" con disegno e frase breve.

## Modalità
Pulsante "persone" in alto a destra (e la prima volta in assoluto, prima della partita):
- **Hari da solo**;
- **Con Kiki (CPU)**: `cpuInput()` nella logica, deterministico e solo con lo stato pubblico (si avvicina al più vicino,
  porge, lancia alla gazza, salta angurie e onde, usa lo speciale quando c'è folla);
- **2 giocatori qui**: tastiera (P1 frecce + Z X C V, P2 WASD + F G H R) oppure **schermo diviso**: due levette e due
  gruppi di pulsanti, una metà a testa (su telefono i comandi si rimpiccioliscono);
- **Gioca insieme (Wi-Fi)**: compare attiva solo se il modulo `HH.mp` è caricato (vedi sotto).

In 2 giocatori ci sono più animali (×1,5 per ondata, +2 in scena), più fame (×1,15) e un golosone più affamato (×1,6).
La scelta resta salvata (`street:mode`).

## Multigiocatore in rete (contratto HH.mp v1)
L'abbinamento (suono, QR di riserva, codice di 4 frutti) e il trasporto WebRTC sono del modulo `src/net/*` (lavoro
separato, vedi `docs/multiplayer.md` quando arriva). Il gioco usa solo il contratto:
- "Gioca insieme" → `HH.mp.pair({ game: 'street', players: 2, title })` → `Link` (oppure `null` = annullato).
- `HH.mp.session(link, { tick: 60, sendEvery: 3, step, snapshot, apply, predict })`:
  - **host = P1 (Hari)**: `step(dt, [inputP1, inputP2])` chiama `HH.street.step`; `snapshot()` = `HH.street.view(s)`,
    una vista compatta (solo ciò che serve a disegnare, ~2–5 KB in JSON, niente copione né generatore) a 20 Hz;
    gli eventi della logica (sazio, morso, vittoria, cuore perso…) vanno all'ospite con `session.event({ k: 'ev', list })`;
  - **ospite = P2 (Kiki)**: `apply(snap, alpha, prev)` interpola posizioni di giocatori, animali, merende, angurie e
    golosone tra le ultime due viste (ritardo ~100 ms); `predict(dt, input)` muove subito Kiki in locale e la riporta
    dolcemente verso la posizione vera (scatto se l'errore supera 1,2 m o durante pisolino/presa).
- **Input robusti alle perdite**: `{ mx, my, a, b, c, s }` con `a/b/c/s` **contatori** di pressioni; un pacchetto perso
  non perde i tocchi (vale l'ultimo contatore ricevuto, le pressioni arretrate si consumano una per passo).
- Pausa propagata come evento; vittoria e cuori persi arrivano all'ospite come eventi (dialoghi dell'app su entrambi).
- **Caduta del link**: sull'host Kiki diventa CPU e si continua; l'ospite riparte in locale con Kiki CPU.
- Salvataggio: l'host salva lo stato completo; l'ospite salva solo i numeri della vista (alla riapertura si riparte in
  locale).
- **Stub di sviluppo** `src/net/mp-stub.js` (non nel catalogo): `loopback()` con latenza/perdite (test Node),
  `session()` del contratto, e `pair()` tra due pagine dello stesso browser via BroadcastChannel (Playwright:
  `HH.mpStubRole = 'host' | 'guest'`). Non tocca nulla se il modulo vero è già caricato.
- Al merge col modulo: aggiungere nel catalogo, prima di `street-ui.js`, i file `src/net/sonic.js`, `src/net/qr.js`,
  `src/net/mp.js`, `src/net/mp-ui.js`, `src/net/mp.css`.

## Curva di difficoltà
`config(level, np)` è monotona (verificato fino al 30):

| Livello | Ambiente | Golosone | Ondate | Animali per ondata (1 / 2 gioc.) | In scena | Attacchi insieme | Fame × | Velocità × | Pausa morsi × | Pancia (1 / 2) | Attacco ogni | Angurie | Animali |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | mercato | orso | 3 | 2 / 3 | 2 / 4 | 1 | 1 | 1 | 1 | 60 / 96 | 3,4 s | 3 | coniglietto |
| 2 | città | cinghiale | 3 | 3 / 5 | 2 / 4 | 1 | 1,07 | 1,02 | 0,98 | 69 / 110 | 3,3 s | 3 | + procione |
| 3 | porto | gabbiano | 3 | 3 / 5 | 3 / 5 | 1 | 1,14 | 1,04 | 0,96 | 78 / 125 | 3,2 s | 3 | + cinghialotto |
| 4 | fiera | re procione | 4 | 4 / 6 | 3 / 5 | 1 | 1,21 | 1,06 | 0,94 | 87 / 139 | 3,0 s | 4 | + gazza |
| 5 | treno | panda | 4 | 4 / 6 | 3 / 5 | 2 | 1,28 | 1,08 | 0,92 | 96 / 154 | 2,9 s | 4 | + volpi |
| 6 | mercato | orso | 4 | 5 / 8 | 3 / 5 | 2 | 1,35 | 1,10 | 0,90 | 105 / 168 | 2,8 s | 4 | + orsetto |
| 8 | porto | gabbiano | 5 | 6 / 9 | 4 / 6 | 2 | 1,49 | 1,14 | 0,86 | 123 / 197 | 2,6 s | 5 | tutti |
| 10 | treno | panda | 5 | 7 / 11 | 4 / 6 | 2 | 1,63 | 1,18 | 0,82 | 141 / 226 | 2,3 s | 5 | tutti |
| 12 | città | cinghiale | 5 | 8 / 12 | 5 / 7 | 2 | 1,77 | 1,22 | 0,78 | 159 / 254 | 2,1 s | 5 | tutti |
| 15+ | … | … | 5 | 8 / 12 | 5 / 7 | 3 | +0,07/liv. | 1,25 | 0,75 | +9/liv. | 2,0 s | 5 | tutti |

Il livello 1 dura 30–50 s ed è vinto dal bot senza perdere cuori. Le fasi del golosone (50%, 80%) cambiano il ciclo di
attacchi (per esempio orso: angurie+piccoli → angurie+pestone+piccoli → pestone+angurie+risucchio).

## Algoritmo
- Stato JSON puro con il generatore dentro (`s.rs`, mulberry32): salvataggio, ripresa e rete senza sorprese.
- `newLevel(level, rnd, { players, cpu })` genera le ondate (liste di animali, le volpi a coppie, la prima ondata con un
  animale noto) e gli oggetti (cassette con il loro contenuto, carrelli) lungo i tratti.
- `step(s, dt, inputs)`: pausa "Pronti?" (1,4 s) e poi passi fissi da 1/60 s; ogni passo: giocatori (input o CPU),
  telecamera e blocchi, comparsa degli animali, intelligenza degli animali (bersaglio = giocatore più vicino; posto
  d'attacco al suo fianco; preavviso; separazione per non sovrapporsi), merende lanciate (gazza, procione, angurie,
  golosone, cassette), carrelli e raccolta, golosone, angurie e onde d'urto.
- Eventi per la grafica e i suoni (vedi intestazione di `street-logic.js`).

## Grafica e suono
- Un solo `<canvas>` 2D: cielo dipinto una volta, strati con parallasse per ambientazione (alberi, palazzi con finestre,
  mare con barche, ruota panoramica, colline e vagoni), bancarelle con tende a strisce, marciapiede a lastre. Personaggi
  SVG in stile cel (street-art.js) cotti in bitmap con i colori dei token (tema chiaro/scuro e ambientazione), ordinati
  per profondità, specchiati secondo la direzione. Indicatori sul canvas: energia e speciale per giocatore, cuori della
  squadra, pancia del golosone, "GO →".
- In verticale a schermo intero la vista si stringe a 6,5 m attorno ai giocatori (personaggi più grandi) e i comandi
  stanno sotto; in orizzontale la strada riempie tutto e i comandi sono sovrapposti. `prefers-reduced-motion`: niente
  oscillazioni, scossoni, pioggia di frutti animata.
- Brano `street` (136 bpm, pluck + marimba, basso che marcia sulle ottave), effetti esistenti (`mark`, `place`,
  `boing`, `sproing`, `cupDone`, `giggle`, `zoom`, `whee`…).

## Test
`tests/street.test.mjs`: determinismo e ripresa da JSON; contatori di pressioni contro le perdite; livelli 1–12 vinti dal
bot da solo e in due (e con Kiki CPU 1–8); livelli 13–16 completabili; ogni golosone battuto con le sue fasi; angurie
che coprono tutta la profondità e onda del pestone che raggiunge ogni punto (un bot che non salta prende molti più
morsi); curva monotona, più morsi nei livelli alti, più animali in due; chi non fa niente perde; vista compatta
< 6 KB; partita a due via `HH.mp.loopback` con 15% di perdite (modulo vero se presente, altrimenti lo stub); tempi.
`tools/selftest.mjs`: 4 gradini × 1/2 giocatori, generazione < 10 ms, passo < 0,5 ms.
