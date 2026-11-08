# Hari Fishing

Simulatore di pesca in 3D con cel shading, **senza violenza**: Hari, col cappellino di paglia, pesca dal pontile al lago
o al mare. Dopo il lancio la camera si tuffa: sott'acqua si muove l'esca piano per attirare i pesci (troppo veloce li
spaventa), poi si torna in superficie per la lotta, con le espressioni di Hari in un riquadro. Il pesce preso si guarda, si fotografa, va nell'album e torna in acqua con un cuoricino. Su telefono si
gioca muovendo il telefono come una canna da pesca (sensori di movimento); su PC col mouse e due comandi a schermo.

- id `fish`, brand **Hari Fishing** (non tradotto), regole `r_fish`, brano `fish`, tinta `--tint-fish`, token `--fsh-*`.
- File: `src/games/fish-logic.js` (logica pura), `src/games/fish-ui.js` (three.js), `src/games/fish.css`,
  `tests/fish.test.mjs`, `tests/_fish-bot.mjs` (bot dei test), blocco in `tools/selftest.mjs`.
- three.js r160 è lo stesso file di Hari Rally (`src/vendor/three.min.js`): nel catalogo è tra i `files` di entrambi;
  `HH.loadGame` non ricarica un file già caricato da un altro gioco e il service worker lo mette in cache una volta.

## Regole
1. **Lancio**. La forza (0..1) decide la distanza dell'amo: 5 m (debole) … 30 m (pieno). Più lontano vivono le specie
   più rare (ogni specie ha una distanza minima).
2. **Sott'acqua** (v0.30, fase `wait`). Quando l'amo tocca l'acqua la camera si immerge (velo di bollicine, la
   superficie che si allontana). Si vedono 3–5 pesci delle specie del posto, ognuno con il suo carattere, e si muove
   l'esca di lato (−1..1) e in profondità (0..1):
   - **lenta o a piccoli scatti** (velocità 0,03–0,5 · `vFear` unità/s) = interessante; **ferma** = poco (i pesci
     arrivano lo stesso, più lentamente); **troppo veloce** (oltre `vFear` della specie, nel raggio 1,3 · `sense`) =
     il pesce sobbalza ("!"), scappa con una nuvoletta di bolle e per `3 + 5 · shy` s è **diffidente** (interesse ×0,25,
     paura più facile ×0,8);
   - l'**interesse** (0..1) cresce di `lureG · (1 − 0,65 shy) · stimolo · vicinanza` al secondo entro `sense`: a 0,25 il
     pesce diventa **curioso** ("?", si gira e si avvicina), a 0,6 **gira attorno all'esca** (cuore che cresce con
     l'interesse), a 1 la **annusa** (0–2 assaggi: il galleggiante trema) e **abbocca**. Un solo pesce alla volta annusa;
   - tirare di colpo mentre un pesce annusa lo spaventa ("Troppo presto!"); tirare piano riavvicina l'amo e alza
     l'esca: sotto i 2 m si rilancia, senza penalità. I pesci che se ne vanno escono dalla vista, ne arrivano altri.
3. **Abboccata**. Avviso chiaro: vibrazione, galleggiante che va sotto (visto da sotto), "!" grande, suono. Si ferra
   tirando (pulsante **Tira**, ↑/spazio, o punta del telefono in su) entro la finestra del livello (1,6 s → 0,9 s), e
   la camera **torna in superficie** per la lotta. Se scade il pesce se ne va (gli altri restano).
   *Perché la lotta in superficie*: l'indicatore della tensione, la canna che si piega, la lenza che si tende e i salti
   del pesce si leggono meglio dal pontile; il cambio di scena (calma sott'acqua → azione in superficie) segna il
   passaggio di fase; la fisica della lotta resta quella collaudata della v0.28.
4. **Tira e molla**. Indicatore verticale della tensione con la **finestra verde** `[tMin, tMax]`: sopra (rosso) si
   riempie il misuratore di rottura, sotto (blu) quello della lenza molle. Pieno il primo, la lenza si rompe; pieno il
   secondo, il pesce si slama. Nessuna vita persa: si rilancia subito (contano solo per le stelle).
5. **Preso** a 1 m dal pontile: scheda con nome, peso, rarità (1–4 stelle) e "Nuovo!"; pulsanti **Foto** (flash,
   la foto va nell'album) e **Liberalo** (il pesce salta in acqua, cuoricini).
6. **Obiettivo del livello**: N pesci (2 → 5) e dal livello 3 una **pesca speciale** (specie indicata nel chip in
   alto). Vinto quando entrambe sono fatte.
7. **Stelle**: 3 senza perdere pesci ed entro il tempo di riferimento (`par`), 2 con al massimo 2 persi ed entro
   1,6 × par, altrimenti 1.

## Specie
| Specie | Dove | Rarità | Forza | Velocità | Fiato (s) | Da (m) | Peso | Diffidenza `shy` | Profondità |
|---|---|---|---|---|---|---|---|---|---|
| Pesciolino `minnow` | lago | 1 | 0,45 | 0,9 | 6 | 0 | 30–120 g | 0,1 | 0,3 |
| Pesce rosso `goldfish` | lago | 1 | 0,55 | 1,0 | 7 | 0 | 80–300 g | 0,15 | 0,45 |
| Pesce gatto `catfish` | lago | 2 | 0,8 | 0,7 | 11 | 11 | 0,6–2,5 kg | 0,35 | 0,8 (sul fondo) |
| Carpa koi `koi` | lago | 3 | 0,75 | 1,1 | 11 | 16 | 0,8–3 kg | 0,55 | 0,55 |
| Pesce pagliaccio `clown` | mare | 1 | 0,5 | 1,15 | 6 | 0 | 60–250 g | 0,1 | 0,4 |
| Pesce palla `puffer` | mare | 2 | 0,65 | 0,8 | 9 | 9 | 0,2–0,9 kg | 0,3 | 0,6 |
| Tonno `tuna` | mare | 3 | 0,95 | 1,3 | 14 | 17 | 2–9 kg | 0,6 | 0,35 |
| Pesce d'oro `golden` | entrambi, dal livello 6 | 4 | 0,9 | 1,25 | 13 | 21 | 0,5–1,5 kg | 0,8 | 0,6 |

Specie dei pesci sott'acqua: tra quelle del posto raggiungibili a quella distanza, con pesi 10 / 5 / 2,2 / 0,7 per
rarità (le non comuni pesano di più più l'amo è lontano). Chi abbocca è il pesce che il giocatore ha attirato. La
diffidenza rallenta l'interesse (pesce d'oro: ×0,48) e abbassa la velocità che spaventa (pesce d'oro: ×0,64): le specie
rare vanno attirate con pazienza. **Garanzia della pesca speciale**: dopo 2 abboccate senza, se l'amo è abbastanza
lontano al tuffo c'è lei e gli altri pesci non hanno fame (girano attorno all'esca ma non abboccano); se è troppo
vicino Hari dice "Lancia più lontano!".

## Fisica della lenza (passi fissi da 1/60 s)
- Forza del pesce `F = str · strMul · (0,35 + 0,75 · scatto) · (0,35 + 0,65 · fiato)`; gli **scatti** arrivano a caso
  (riposo 1,2–3 s / velocità, fuga 0,5–1,4 s) e si vedono come schizzi e salti del pesce fuori dall'acqua.
- Tensione verso `base = 0,10 + 0,55 F`; tirando (`r > 0`) `base + r · (0,55 − 0,1 F)`; mollando `base · (1 + 0,85 r)`;
  costante di tempo 0,12 s.
- Distanza: il mulinello recupera `4,2 r · max(0,2; 1 − 0,5 F)` m/s, il pesce si allontana a `0,7 F · spd`
  (× 2,2 a lenza tutta mollata).
- Fiato: cala di `(0,02 + 0,9 T²) / sta` al secondo (più tiri, prima si stanca), risale piano a lenza molle.

## Curva di difficoltà
`k = min(1, (livello − 1) / 11)`. Lago ai livelli 1, 2 e pari; mare ai dispari dal 3.

| Livello | Posto | Pesci | Speciale | Finestra verde | Rottura / molle (s) | Ferrata (s) | Forza × | Par (s) | Bot: tempo medio |
|---|---|---|---|---|---|---|---|---|---|
| 1 | lago | 2 | — | 0,14–0,90 | 1,3 / 2,6 | 1,6 | 1,00 | 64 | 44 s |
| 3 | mare | 3 | pesce palla | 0,17–0,87 | 1,2 / 2,4 | 1,5 | 1,07 | 143 | 77 s |
| 6 | lago | 4 | koi | 0,21–0,83 | 1,0 / 2,1 | 1,3 | 1,18 | 203 | 116 s |
| 9 | mare | 5 | pesce d'oro | 0,26–0,78 | 0,9 / 1,7 | 1,1 | 1,29 | 275 | 170 s |
| 12 | lago | 5 | pesce d'oro | 0,30–0,74 | 0,7 / 1,4 | 0,9 | 1,40 | 305 | 197 s |

Sott'acqua:

| Livello | Paura `vFear` (unità/s) | Interesse `lureG` (/s) | Raggio `sense` | Pesci `crowd` | Distanza `spread` |
|---|---|---|---|---|---|
| 1 | 1,25 | 0,95 | 1,00 | 3 | 0,30 |
| 3 | 1,18 | 0,87 | 0,96 | 3 | 0,37 |
| 6 | 1,07 | 0,75 | 0,91 | 4 | 0,48 |
| 9 | 0,96 | 0,62 | 0,85 | 5 | 0,59 |
| 12 | 0,85 | 0,50 | 0,80 | 5 | 0,70 |

(`npm run bench` stampa la tabella aggiornata; il bot è un giocatore perfetto, un bambino ci mette di più.) Livelli 3–4:
speciale non comune, 5–8 rara (koi o tonno), dal 9 ogni 3 livelli il pesce d'oro. Oltre il 12 i parametri restano
quelli del 12. `spread` = quanto lontano dall'esca compaiono i pesci (dal livello 9 alcuni oltre il raggio in cui la
notano: bisogna andare a cercarli, piano). Par = pesci × (32 + 22 k) s + 35 s se c'è la speciale.

## Risolvibilità (regola 3)
`tests/fish.test.mjs` fa giocare un **bot indipendente** (`tests/_fish-bot.mjs`) che vede solo quello che vede il
giocatore (fase, pesci sott'acqua con i loro indicatori, esca, galleggiante, tensione, finestra verde, distanza; non
legge fame, soglie di paura, forza o fiato): sott'acqua porta l'esca **piano** (≤ 0,2 unità/s con un piccolo dondolio)
vicino al pesce più vicino, o alla specie speciale se si vede, e in lotta regola il mulinello con un controllo
proporzionale-integrale-derivativo sulla tensione osservata. Vince ogni livello 1–14 con 8 semi ciascuno (e i primi 4
lanciando a metà forza). Le strategie sbagliate falliscono: **muovere l'esca sempre a scatti velocissimi** non fa mai
abboccare nessuno (livelli 1–14, centinaia di spaventi), tirare sempre al massimo rompe la lenza dal livello 5, non
tirare mai non porta pesci, mollare sempre li fa slamare; al livello 1 basta tenere premuto "Tira". Altri test: esca
lenta più attraente di quella ferma, specie rare più lente da attirare e più facili da spaventare, ordine "?" → cuore →
abboccata, garanzia della speciale, pesci che se ne vanno e che arrivano, curva sott'acqua monotona, salvataggi v0.28,
espressioni di Hari (quella voluta e l'isteresi).

## Comandi
**Orientamento: verticale.** Il lato lungo del telefono fa da canna: "punta in su / in giù" è la rotazione attorno
all'asse corto, un asse solo e naturale da tenere in mano; la scena ha profondità (la distanza del lancio) e sta bene
in un quadro alto. A schermo intero su telefono si blocca in verticale (`screen.orientation.lock('portrait')`, come
Rally e Street fanno con l'orizzontale) e, se il telefono è girato coi sensori attivi, un velo chiede di raddrizzarlo.
Coi pulsanti e col mouse va bene anche in orizzontale (l'inquadratura si adatta, la scheda del pesce va a destra).

- **Sensori** (`deviceorientation` + `devicemotion`): `pitchFrom(beta, gamma, angolo)` = inclinazione del lato alto
  dello **schermo** sopra l'orizzontale (non si ripiega oltre la verticale; con l'angolo dello schermo funziona anche
  col telefono girato dove il blocco non c'è, es. iPhone). L'angolo viene da `window.orientation` o
  `screen.orientation.angle`, e se contraddice la forma della finestra vale la finestra.
  - **Lancio**: `flick()` — la punta va indietro (velocità di inclinazione > 70°/s) e poi avanti di scatto
    (< −150°/s entro 1,2 s): forza = `(−picco − 150) / 650` + accelerazione, tra 0,12 e 1. Movimenti lenti non lanciano.
  - **Recupero**: `tiltToReel(pitch − zero)`: zona morta ±4°, tutto tirato a +30°, tutto mollato a −22°.
  - **Taratura** della posizione neutra a ogni lancio: mezzo secondo dopo che il galleggiante si posa ("Fermo un
    attimo…"), e alla ripresa dalla pausa.
  - **iOS**: il pulsante **"Attiva movimento"** chiede `DeviceOrientationEvent.requestPermission()` (e poi
    `DeviceMotionEvent.requestPermission()`) dentro il tocco. Permesso negato, sensori assenti o nessun evento entro
    1,8 s → pulsanti a schermo e messaggio. Il pulsante in alto passa da sensori a pulsanti e viceversa (scelta salvata).
- **Mouse / tocco**: trascina in giù (indietro) e lascia per lanciare, di lato per mirare (anello della forza);
  **Tira** e **Allenta** da tenere premuti: Tira sale piano fino al massimo in 0,7 s, Allenta molla subito. Prima del
  lancio Tira diventa **Lancia** (tieni premuto per caricare, lascia per lanciare).
- **Tastiera**: ↑/W/spazio tira (prima del lancio: tieni e lascia), ↓/S allenta, ←/→ mira (sott'acqua: muovono
  l'esca), A album, P/Esc pausa.
- **L'esca sott'acqua** (la UI calcola il bersaglio `{ lx, ly }`; la logica la fa seguire con 0,1 s di ritardo e al
  massimo 3 unità/s, e ne misura la velocità):
  - **telefono**: inclinazione **di lato** = velocità laterale (`rollFrom(beta, gamma, angolo)` = quanto il lato destro
    dello schermo è più basso, anche col telefono quasi in piedi; `tiltToLure`: zona morta ±3°, massimo 1,1 unità/s a
    25°, cioè inclinare di colpo e tanto spaventa); avanti/indietro = su e giù (±3° di zona morta, 0,35 unità/s a 15°).
    La posizione neutra (anche di lato) si tara a ogni tuffo come prima ("Fermo un attimo…"). Sott'acqua l'inclinazione
    avanti/indietro non tira: per ferrare si dà un colpo in su quando il pesce abbocca;
  - **mouse**: l'esca va dove si punta (dallo schermo al piano dell'esca con la camera vera);
  - **dito**: trascinamento relativo sulla scena (l'esca non finisce sotto il dito);
  - **pulsanti** ◀ ▶ (al centro, solo sott'acqua e senza sensori) e ←/→: 0,32 unità/s; **Allenta** = l'esca scende,
    **Tira** = sale e riavvicina l'amo.
- Vibrazione breve su assaggio, pesce spaventato, abboccata (più lunga) e pesce preso (se il telefono la supporta).

## Hari nel riquadro
Durante tutta la partita, in alto a sinistra sotto la barra dello schermo intero (non copre comandi né indicatore), un
riquadro a fumetto col volto di Hari col cappellino di paglia (SVG disegnato in `fish-ui.js`, nello stile della mascotte
ma coi token `--fsh-*`, quindi tema chiaro e scuro; il contenitore è `dir="ltr"` come la scena, quindi uguale in RTL).
Nove espressioni: **wait** concentrato (guarda giù verso l'esca) · **curious** (un sopracciglio su, "?") ·
**surprised** (abboccata, "!") · **effort** (occhi > <, guance gonfie, denti stretti, gocce di sudore, trema) ·
**worried** (tensione fuori dal verde o misuratori pieni a metà) · **happy** (tensione nel verde) · **sad** (lenza
rotta, pesce slamato o scappato, spavento) · **win** (pesce preso, stelline) · **wow** (pesce raro o d'oro interessato,
che abbocca o preso, occhi a stella). Il bordo colorato del riquadro cambia con l'umore.
- `mood(s)` (logica) dice quella che la situazione chiede; gli eventi (snap, slack, missed, early, scare, catch, bite)
  ne impongono una per un tempo fisso.
- `moodStep` evita lo sfarfallio: un'espressione resta almeno 0,7 s e la nuova deve essere chiesta per 0,2 s di fila;
  le forti (sorpresa, stupore, tristezza, vittoria) passano dopo 0,25 s.

## Grafica (three.js, cel shading)
- `MeshToonMaterial` con rampa a **4 bande** (DataTexture 4×1, `NearestFilter`), contorni a **guscio rovesciato**
  (ShaderMaterial che gonfia la geometria lungo le normali nello spazio della camera, quindi spessore in metri anche su
  geometrie unitarie scalate; facce posteriori, colore `--fsh-ink`).
- **Acqua** in ShaderMaterial: bande di colore a gradini con la distanza, strisce di luce che scorrono, scintille,
  onde nei vertici, cerchi di schiuma attorno al galleggiante e scia del pesce, nebbia verso l'orizzonte.
- Cielo a cupola con colori nei vertici, sole (o luna con le stelle e la lanterna accesa la sera), nuvole a palline,
  colline e alberi (lago), isoletta col faro, palme e boa (mare), canne e ninfee, pontile con secchiello e lanterna,
  Hari col cappellino di paglia e la canna a 4 pezzi che si piega con la tensione, lenza che si tende o fa la pancia,
  galleggiante, ombra del pesce sott'acqua, pesci 3D kawaii (vedi sotto).
- **Pesci** (dopo la v0.30; prima erano un ellissoide con un cono per coda, montato al contrario: base larga sul corpo e punta
  fuori). Forme condivise dal 3D e dagli SVG (`FB`, `TAILS`, `RIDGES`, `PEC`, `FCOL` in `fish-ui.js`):
  - **corpo generato** da un profilo d'altezza e uno di larghezza lungo x: muso pieno (superellisse, `nose`), punto più
    alto `xm`, poi si assottiglia a S fino a un **peduncolo caudale stretto** (`ped`, `wp`); sezione ovale, schiena e
    pancia diverse (`top`, `bot`); pancia più chiara nei vertici (colore 2), tranne il pagliaccio;
  - **pinne sottili** a lente (spessore 0 sul bordo, il contorno segue la sagoma), attaccate al peduncolo e larghe verso
    l'esterno: coda **forcuta** (pesciolino), **a mezzaluna rigida** (tonno, con la carena), **a ventaglio doppia e
    velata** (pesce rosso, pesce d'oro: due ventagli uniti sopra e aperti sotto), **ventaglio ampio e morbido** (koi),
    **arrotondata** (pagliaccio, pesce gatto), **piccola** (pesce palla); dorsale (a vela nel pesce rosso, lunga nella
    koi, a due lobi bordati di scuro nel pagliaccio, bassa + seconda gialla a falce nel tonno), anale, pettorali dietro
    l'opercolo (a falce nel tonno), ventrali;
  - dettagli: tre bande bianche bordate di scuro del pagliaccio (decalcomanie che seguono la superficie), macchie rosse
    della koi, riga del pesciolino, pinnule gialle del tonno su schiena e ventre verso la coda, aculei del pesce palla
    (corpo quasi sferico), baffi del pesce gatto (due lunghi, due corti) e della koi vicino alla bocca, coroncina del
    pesce d'oro.
- **Nuoto** nel vertex shader (`onBeforeCompile` su `MeshToonMaterial`, il contorno usa la stessa `fishDef`): ogni vertice
  ha `aSw` = (parte, cerniera). Onda del corpo lungo x con ritardo di fase dalla testa alla coda e ampiezza che cresce
  verso la coda (`head + (1 − head)·s^ex`: la testa oscilla pochissimo, il corpo si piega a S), piega a C nelle virate
  (proporzionale alla velocità di virata) e nello scatto di fuga; pettorali che remano alternate (più ampie e veloci da
  fermo davanti all'esca), dorsale e anale che ondeggiano, code velate in ritardo; il pesce palla nuota con le pettorali
  e la coda quasi ferma; il tonno ha il corpo quasi fermo (`ex` = 5) e la coda rigida e veloce che ruota sul peduncolo.
  Parametri per specie in `SWP`; frequenza, fase e ampiezza variano per individuo. `swimUp()` aggiorna solo gli uniform
  (niente oggetti per fotogramma): colpi di coda a impulsi e planata (con un piccolo slancio in avanti), virate con
  inerzia (molla critica, nella fuga molto rigida = scatto a C), rollio in curva, muso in su o in giù salendo e
  scendendo. In superficie il pesce si dimena nei salti e, appeso alla bocca, a tratti. I pesciolini dei banchi virano
  ognuno col suo ritardo e scodinzolano col loro ritmo.
- **SVG** (album, card, tutorial): stessa sagoma di profilo (corpo dal profilo, coda dal peduncolo verso l'esterno,
  dorsale, anale, ventrale, pettorale, bande e macchie dentro la sagoma), testa a destra; colori dai token, temi chiaro
  e scuro.
- Prove visive (Playwright, `el._fish`): `lab({ yaw, elev, t, v, turn, k, only })` disegna la tavola delle 8 specie
  su fondo neutro (di lato, in 3/4, dall'alto; `t` fisso = posa del nuoto ripetibile), `jump(durata, lato)` fa saltare
  il pesce in lotta, `heads()` dà per ogni pesce sott'acqua il verso di marcia della logica e quello della testa.
- **Sott'acqua** (seconda scena, disegnata al posto della superficie in `wait` e `bite`): sfondo a sfumatura e nebbia
  `--fsh-uw-2` (5–26 m) per la profondità; superficie vista da sotto con bande di luce che scorrono (e al lago le ninfee
  coi gambi fino al fondo); **raggi di luce** (una InstancedMesh additiva); fondale con dune, rocce, coralli (mare) o
  tronchi e sassi (lago); **piante** che ondeggiano in tre strati di parallasse (davanti alla camera, vicino, lontano):
  una InstancedMesh da 84 con ShaderMaterial che le piega nel vertex shader; **banchi di pesciolini** (al lago anche i
  girini) come InstancedMesh con contorno che condivide le matrici, che si sparpagliano quando un pesce si spaventa;
  **bollicine** come Points da un insieme fisso di 70; i pesci della logica coi loro modelli 3D (un modello per pesce
  vivo, ricambi per specie) e l'indicatore DOM sopra la testa ("?", cuore che cresce, "!"); esca con amo e piombino,
  lenza e galleggiante visto da sotto. Camera che segue un po' l'esca (parallasse) e scende dalla superficie al tuffo.
- **Abitanti** che non abboccano, ognuno con la sua animazione: mare = granchio che cammina di lato aprendo le chele,
  medusa che pulsa, stella marina, polpo coi tentacoli che si arricciano, tartaruga che attraversa sullo sfondo,
  cavalluccio marino, conchiglia che si apre (con la perla). Lago = rana che nuota a scatti, girini, ninfee viste da
  sotto, due lumache, due gamberetti che saltellano, tartaruga, conchiglia d'acqua dolce.
- Colori **solo** da `--fsh-*` in `fish.css`, letti a runtime con `getComputedStyle` (cambio di tema ricostruisce la scena).
- Prestazioni: pixel ratio ≤ 1,5 (cala fino a 0,7 se i fotogrammi sono lenti e risale), 2 luci (3 di sera), niente
  ombre, ~150 draw call, ~25 k triangoli, gocce da un insieme fisso. In pausa il ciclo si ferma. Sott'acqua: 2 luci,
  **~35 draw call (lago) / ~45–52 (mare)** (v0.30: 41 / 47–60; prima ancora 142 / 230–254), 38–64 k triangoli:
  `bake()` fonde la geometria statica (fondale, dune, rocce, coralli, tronchi, ninfee) in una mesh con i colori nei
  vertici + una di contorno con lo spessore nei vertici, e per le creature fonde i pezzi fermi di ogni gruppo animato;
  un pesce intero (corpo, pinne, occhi) = **2 draw call** (erano 4), perché si muove nel vertex shader; piante, raggi, banchi e bollicine sono InstancedMesh / Points; materiali condivisi; niente oggetti creati per fotogramma (vettori riusati, anche
  in superficie). Misura (Chromium headless con SwiftShader, cioè GPU software, 402×874): **≈ 1–2,5 ms di CPU per
  fotogramma** sott'acqua (logica + aggiornamenti + invio dei comandi), massimo 6,4 ms (coi pesci nuovi); i fotogrammi al secondo in
  SwiftShader non sono indicativi di un telefono (la rasterizzazione software è il collo di bottiglia).

## Suoni e musica
Brano `fish` (barcarola in Re, koto + carillon). Effetti nuovi in `src/core/audio.js`: `whoosh` (lancio), `splash`,
`reel` (clic del mulinello, più fitti tirando forte), `twang` (lenza rotta), `shutter` (foto), `fishScare` ("pip!" e
bolle: pesce spaventato), `fishBite` (blob e due campanelle: abboccata); riusati `bubble` (tuffo), `blip` (un pesce
si innamora dell'esca), `plop` (assaggio), `pick` (ferrata), `cupDone` (preso), `heart` (liberato), `lightOff`
(slamato). Rispettano il silenzio.

## Salvataggio
`snapshot()` = stato della logica (JSON, `v: 2` con `lu` = esca, `sw` = pesci sott'acqua, `nid`, `lr`, `scares`).
Alla ripresa (`migrate`) le fasi a metà lancio e sott'acqua tornano a "pronto a lanciare"; la lotta riprende in pausa.
Le partite salvate dalla v0.28 (`v: 1`) passano a `v: 2` (test con uno stato v1 in attesa e uno in lotta). L'album (`HH.store` `fish:album`: per specie quante, il più pesante, la foto)
resta tra i livelli. Preferenza dei comandi in `fish:ctl`.

## Tutorial
5 passi (`tu_fish_1`, `tu_fish_5`, `tu_fish_2`, `tu_fish_3`, `tu_fish_4`): lancio, **sott'acqua** (muovi piano l'esca:
"?" curioso, cuore, troppo veloce = "!" e il pesce scappa; disegno con un pesce rosso innamorato e un pesciolino che
fugge), abboccata, tira e molla, album.
