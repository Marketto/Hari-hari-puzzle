# Hari Fishing

Simulatore di pesca in 3D con cel shading, **senza violenza**: Hari, col cappellino di paglia, pesca dal pontile al lago
o al mare. Il pesce preso si guarda, si fotografa, va nell'album e torna in acqua con un cuoricino. Su telefono si
gioca muovendo il telefono come una canna da pesca (sensori di movimento); su PC col mouse e due comandi a schermo.

- id `fish`, brand **Hari Fishing** (non tradotto), regole `r_fish`, brano `fish`, tinta `--tint-fish`, token `--fi-*`.
- File: `src/games/fish-logic.js` (logica pura), `src/games/fish-ui.js` (three.js), `src/games/fish.css`,
  `tests/fish.test.mjs`, `tests/_fish-bot.mjs` (bot dei test), blocco in `tools/selftest.mjs`.
- three.js r160 è lo stesso file di Hari Rally (`src/vendor/three.min.js`): nel catalogo è tra i `files` di entrambi;
  `HH.loadGame` non ricarica un file già caricato da un altro gioco e il service worker lo mette in cache una volta.

## Regole
1. **Lancio**. La forza (0..1) decide la distanza dell'amo: 5 m (debole) … 30 m (pieno). Più lontano vivono le specie
   più rare (ogni specie ha una distanza minima).
2. **Attesa**. Il galleggiante dondola; qualche **assaggio** lo fa tremare (non bisogna tirare: tirare forte entro
   0,5 s da un assaggio spaventa il pesce, "Troppo presto!"). Tirare piano riavvicina l'amo: sotto i 2 m si rilancia,
   senza penalità.
3. **Abboccata**. Il galleggiante va sotto: si ferra tirando entro la finestra del livello (1,6 s → 0,9 s). Se scade
   il pesce se ne va e se ne aspetta un altro.
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
| Specie | Dove | Rarità | Forza | Velocità | Fiato (s) | Da (m) | Peso |
|---|---|---|---|---|---|---|---|
| Pesciolino `minnow` | lago | 1 | 0,45 | 0,9 | 6 | 0 | 30–120 g |
| Pesce rosso `goldfish` | lago | 1 | 0,55 | 1,0 | 7 | 0 | 80–300 g |
| Pesce gatto `catfish` | lago | 2 | 0,8 | 0,7 | 11 | 11 | 0,6–2,5 kg |
| Carpa koi `koi` | lago | 3 | 0,75 | 1,1 | 11 | 16 | 0,8–3 kg |
| Pesce pagliaccio `clown` | mare | 1 | 0,5 | 1,15 | 6 | 0 | 60–250 g |
| Pesce palla `puffer` | mare | 2 | 0,65 | 0,8 | 9 | 9 | 0,2–0,9 kg |
| Tonno `tuna` | mare | 3 | 0,95 | 1,3 | 14 | 17 | 2–9 kg |
| Pesce d'oro `golden` | entrambi, dal livello 6 | 4 | 0,9 | 1,25 | 13 | 21 | 0,5–1,5 kg |

Scelta della specie all'abboccata: tra quelle del posto raggiungibili a quella distanza, con pesi 10 / 5 / 2,2 / 0,7
per rarità (le non comuni pesano di più più l'amo è lontano). **Garanzia della pesca speciale**: dopo 2 abboccate
senza, se l'amo è abbastanza lontano la prossima è quella (se è troppo vicino Hari dice "Lancia più lontano!").

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
| 1 | lago | 2 | — | 0,14–0,90 | 1,3 / 2,6 | 1,6 | 1,00 | 52 | 48 s |
| 3 | mare | 3 | pesce palla | 0,17–0,87 | 1,2 / 2,4 | 1,5 | 1,07 | 113 | 78 s |
| 6 | lago | 4 | koi | 0,21–0,83 | 1,0 / 2,1 | 1,3 | 1,18 | 162 | 118 s |
| 9 | mare | 5 | pesce d'oro | 0,26–0,78 | 0,9 / 1,7 | 1,1 | 1,29 | 220 | 198 s |
| 12 | lago | 5 | pesce d'oro | 0,30–0,74 | 0,7 / 1,4 | 0,9 | 1,40 | 245 | 201 s |

(`npm run bench` stampa la tabella aggiornata; il bot è un giocatore perfetto, un bambino ci mette di più.) Livelli 3–4:
speciale non comune, 5–8 rara (koi o tonno), dal 9 ogni 3 livelli il pesce d'oro. Oltre il 12 i parametri restano
quelli del 12. Par = pesci × (26 + 18 k) s + 25 s se c'è la speciale.

## Risolvibilità (regola 3)
`tests/fish.test.mjs` fa giocare un **bot indipendente** (`tests/_fish-bot.mjs`) che vede solo quello che vede il
giocatore (fase, galleggiante, tensione, finestra verde, distanza) e regola il mulinello con un controllo
proporzionale-integrale-derivativo sulla tensione osservata: vince ogni livello 1–14 con 8 semi ciascuno (e i primi 4
lanciando a metà forza). Le strategie sbagliate falliscono: tirare sempre al massimo rompe la lenza dal livello 5,
non tirare mai non porta pesci, mollare sempre li fa slamare; al livello 1 basta tenere premuto "Tira".

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
- **Tastiera**: ↑/W/spazio tira (prima del lancio: tieni e lascia), ↓/S allenta, ←/→ mira, A album, P/Esc pausa.
- Vibrazione breve su assaggio, abboccata e pesce preso (se il telefono la supporta).

## Grafica (three.js, cel shading)
- `MeshToonMaterial` con rampa a **4 bande** (DataTexture 4×1, `NearestFilter`), contorni a **guscio rovesciato**
  (ShaderMaterial che gonfia la geometria lungo le normali nello spazio della camera, quindi spessore in metri anche su
  geometrie unitarie scalate; facce posteriori, colore `--fi-ink`).
- **Acqua** in ShaderMaterial: bande di colore a gradini con la distanza, strisce di luce che scorrono, scintille,
  onde nei vertici, cerchi di schiuma attorno al galleggiante e scia del pesce, nebbia verso l'orizzonte.
- Cielo a cupola con colori nei vertici, sole (o luna con le stelle e la lanterna accesa la sera), nuvole a palline,
  colline e alberi (lago), isoletta col faro, palme e boa (mare), canne e ninfee, pontile con secchiello e lanterna,
  Hari col cappellino di paglia e la canna a 4 pezzi che si piega con la tensione, lenza che si tende o fa la pancia,
  galleggiante, ombra del pesce sott'acqua, pesci 3D kawaii (8 specie, occhioni, guance, dettagli: righe del pagliaccio,
  macchie e baffi della koi, baffi del pesce gatto, aculei del pesce palla, pinnette del tonno, coroncina del pesce d'oro).
- Colori **solo** da `--fi-*` in `fish.css`, letti a runtime con `getComputedStyle` (cambio di tema ricostruisce la scena).
- Prestazioni: pixel ratio ≤ 1,5 (cala fino a 0,7 se i fotogrammi sono lenti e risale), 2 luci (3 di sera), niente
  ombre, ~150 draw call, ~25 k triangoli, gocce da un insieme fisso. In pausa il ciclo si ferma.

## Suoni e musica
Brano `fish` (barcarola in Re, koto + carillon). Effetti nuovi in `src/core/audio.js`: `whoosh` (lancio), `splash`,
`reel` (clic del mulinello, più fitti tirando forte), `twang` (lenza rotta), `shutter` (foto); riusati `plop`
(assaggio), `pick` (ferrata), `cupDone` (preso), `heart` (liberato), `lightOff` (slamato). Rispettano il silenzio.

## Salvataggio
`snapshot()` = stato della logica (JSON). Alla ripresa (`migrate`) le fasi a metà lancio tornano a "pronto a
lanciare"; la lotta riprende in pausa. L'album (`HH.store` `fish:album`: per specie quante, il più pesante, la foto)
resta tra i livelli. Preferenza dei comandi in `fish:ctl`.
