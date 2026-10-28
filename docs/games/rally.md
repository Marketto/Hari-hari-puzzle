# Hari Rally

Gara di **rally in prima persona nel bosco**, in vero 3D con grafica cartoon (cel shading) nello stile della mascotte.
Visuale pilota: cofano 3D della macchinina di Hari, cruscotto SVG col volante e le **zampine di Hari** che girano con lo
sterzo, contagiri con la lancetta e la faccina di Hari. Hari sfida tre animaletti con le loro macchinine: **Coniglietta**
(lilla), **Volpe** (azzurra) e **Panda** (menta), che spuntano dal tettuccio. **Niente violenza né danni**: fuori strada
si rallenta, contro il bosco c'è un "boing" morbido con foglie che volano, i contatti tra auto sono spintarelle.

- id `rally`, brand **Hari Rally** (non tradotto), regole `r14`, brano `rally`, tinta `--tint-rally`, token `--ry-*`.
- File: `src/games/rally-logic.js` (logica pura, niente DOM né THREE), `src/games/rally-ui.js` (three.js + HUD HTML),
  `src/games/rally.css`, `src/vendor/three.min.js` + `src/vendor/three.LICENSE`, `tests/rally.test.mjs` +
  `tests/_rally-bot.mjs` (bot pilota), blocco "Hari Rally" in `tools/selftest.mjs`.
- Audio nuovo in `src/core/audio.js`: brano `rally`, effetto `pace(dir, g)` (bip del navigatore a destra/sinistra) e
  `HH.audio.engine(on, rpm, grit)` (ronzio del motore che segue i giri, con tre "marce", più ghiaia quando si scivola).

## three.js in locale (offline, lazy)
`src/vendor/three.min.js` è la build UMD classica di **three r160** (npm `three@0.160.0`, `build/three.min.js`, ~654 KB,
licenza MIT in `src/vendor/three.LICENSE`) che definisce `THREE` globale. Unica modifica: tolto il `console.warn` di
deprecazione in testa (sostituito da `void 0,`), così la console resta pulita. È **solo** tra i `files` del gioco nel
catalogo (`src/games/catalog.js`): si scarica e va nella cache del service worker solo aprendo il rally (`isGameFile` usa i
percorsi del catalogo, quindi anche `src/vendor/…`); mai in `index.html` né in `SHELL`. Nel file unico (`npm run build`)
è inline come gli altri file dei giochi (il file passa da ~2,7 a ~3,3 MB).

## Regole
- **Acceleratore automatico**: si sterza e si frena. Partenza da fermi dopo il semaforo (3 rossi → verde, "Via!");
  Hari parte **ultimo** (4°) sulla griglia 2×2.
- **Obiettivo**: arrivare **tra i primi 3** in ogni livello. Fragoline per posizione: 1° = 3, 2° = 2, 3° = 1 (anche in
  tempo reale nell'indicatore). 4° = gara persa: pannello con la classifica e "Riprova" (nessuna vita: `lives` non usato).
- "Mosse" (zampette) = **posizioni guadagnate** con i sorpassi.
- **Fuori strada** (oltre 5 m dal centro): velocità massima 42% e meno aderenza. **Bosco** a 8 m: rimbalzo morbido
  (−28% di velocità, l'auto si raddrizza). **Ponticelli**: ringhiere a 4,8 m (−15%). **Rocce** all'interno di alcune curve
  ("non tagliare"): −40% se si taglia. **Dossi**: oltre 16,5 m/s si fa un saltino (niente sterzo in aria).
- L'auto non si gira mai al contrario (angolo con la strada limitato a 1 rad) e va sempre avanti.
- **Contatti** tra auto: spinta laterale e chi tampona rallenta; nessun danno.

## Controlli
- **Sensori** (schermo intero, telefono in orizzontale): si inclina il telefono come un volante. Si usa la componente
  della verticale lungo il lato lungo dello schermo (da `beta`/`gamma` e dall'angolo di `screen.orientation`), quindi
  funziona sia col telefono tenuto dritto sia quasi in piano; zero tarato al "Via!", alla ripresa e al cambio di modo,
  zona morta 6%, fondo corsa a 24°. **Freno: tieni premuto ovunque**. Su iOS il permesso
  (`DeviceOrientationEvent.requestPermission()`) si chiede al primo tocco. Entrando a schermo intero si prova
  `screen.orientation.lock('landscape')`; se il telefono resta in verticale compare l'invito a girarlo (e la gara va in pausa).
- **Tocco** (senza sensori, fuori dallo schermo intero, desktop): tieni premuta la metà sinistra/destra per sterzare
  (parte al 42% e arriva al massimo in ~0,25 s), **pedale** in basso al centro per frenare; si può scivolare col dito.
- **Tastiera**: frecce/A-D sterzo, giù/S/spazio freno, P/Esc pausa.
- Interruttore in alto a destra **sensori ↔ tocco** (scelta salvata in `rally:ctl`); i sensori valgono solo a schermo
  intero e se arrivano eventi `deviceorientation`, altrimenti si usa il tocco.
- A schermo intero la barra del logo e l'uscita galleggiano in basso agli angoli; gli indicatori dell'app (`fs-hud`) sono
  nascosti perché il gioco ha i suoi (tutto in `rally.css` con `:has(.ry-wrap)`, nessuna modifica a `app.js`).
- Pausa automatica a pagina nascosta, col tutorial, col telefono in verticale a schermo intero; ripresa con un breve
  conto alla rovescia. "Annulla" = pausa/riprendi. Il salvataggio (`snapshot` = stato JSON, < 3 KB) riprende la gara in pausa.

## Note del navigatore
Dedotte dalla **curvatura vera** della pista campionata (non dai pezzi del generatore): tratti con |k| > 1/300 m⁻¹ dello
stesso verso (uniti se separati da ≤ 8 m), gravità dal **raggio minimo**:

| Gravità | 6 | 5 | 4 | 3 | 2 | 1 |
|---|---|---|---|---|---|---|
| Raggio minimo | ≥ 140 m | 95–140 | 62–95 | 40–62 | 24–40 | < 24 (tornante "U" se > 115°) |

Modificatori (icone, lingua neutra): **attenzione** (triangolo giallo: gravità ≤ 2 dopo un tratto veloce, o curva ≤ 3 subito
dopo un dosso), **non tagliare** (roccia barrata: c'è una roccia all'interno), **lunga** (> 100°), **e subito** (»: la
nota dopo comincia entro 18 m). Note a sé per **dosso** e **ponte**. La nota compare (e suona: due bip nell'orecchio del
verso della curva, più gravi per le curve strette) **110 m prima**; la barretta sotto mostra quanto manca. Si vedono la
nota attuale e, più piccola, la successiva. Ondulazioni di gravità 6 sotto i 10° non hanno nota.

## Pista
Tappa punto-punto da seme: 30 m di griglia, lunghezza `len`, 90 m dopo il traguardo. Pezzi: rettilinei e curve con
**raccordi a clotoide** (curvatura che cresce linearmente, lunghi 0,35 R tra 8 e 28 m). Campionata ogni metro
(x, y, direzione, curvatura). Ogni pezzo nuovo deve stare a **≥ 32 m** da ogni punto della pista di almeno 160 m prima
(griglia spaziale), altrimenti si prova il verso opposto o una curva che riporta verso nord; dopo troppi tentativi si
rigenera con un seme derivato. Raggio minimo 15 m. Dossi e ponti solo sui tratti dritti (|k| < 1/400 per ≥ 60 m), rocce
all'apice interno di alcune curve 2–4. Colline e dossi sono solo grafica (`height(g, x, y)`); la fisica è in coordinate
di Frenet (s, d, psi) con aderenza 9,5 m/s² (neve × 0,88), sterzo massimo 1/8,5 m⁻¹, sottosterzo che fa scivolare
verso l'esterno e perdere velocità, aiutino allo sterzo che riallinea dolcemente quando non si sterza forte.

**Avversari**: seguono un profilo di velocità (√(aderenza × R) col raggio peggiore nei ±6 m, poi frenate a 8 m/s²) moltiplicato
per la loro bravura, stanno all'interno delle curve in arrivo, si spostano di lato per sorpassare chi è più lento, e ogni
tanto sbagliano (curva larga fin sull'erba o alzata di piede; frequenza per km che cala coi livelli). Quando Hari arriva,
chi è ancora in corsa viene simulato fino al traguardo per la classifica finale.

## Curva di difficoltà (`config(level)`, monotona)
Gradini (`tier`): 0 = livelli 1–2 · 1 = 3–4 · 2 = 5–7 · 3 = 8–10 · 4 = 11+. Tappa: primavera (1–2), autunno (3–4), neve
(5–6, più scivolosa), tramonto (7–8, fari accesi), poi di nuovo; col tema scuro è sempre notte coi fari.

| | L1 | L3 | L6 | L10 | L14+ |
|---|---|---|---|---|---|
| Lunghezza | 1300 m | 1840 m | 2650 m | 3730 m | 4300 m |
| Curva più stretta | gravità 3 | 2 | 1 (tornanti) | 1 | 1 |
| Quota di curve 1–2 | 0 | 8% | 16% | 22% | 28% |
| Velocità massima | 81 km/h | 85 km/h | 90 km/h | 97 km/h | 104–106 km/h |
| Avversari (bravura) | .58/.66/.73 | .63/.71/.78 | .71/.79/.86 | .81/.89/.96 | .84/.91/.97 |
| Errori avversari / km | 1,3 | 1,16 | 0,95 | 0,67 | 0,39 |
| Aiuto allo sterzo | 0,70 | 0,58 | 0,40 | 0,16 | 0,12 |
| Nebbia in più | — | — | 15% | 30% | 45% |

Livello 1: ~70 s per il bot, 1–2 minuti per un bambino; il pilota "lento e impreciso" dei test lo vince sempre.
`parTime` = lunghezza / (62% della velocità massima). `progress` = metri fatti / lunghezza (1 alla vittoria).

## Grafica e prestazioni
- `MeshToonMaterial` con rampa a 3 toni (`DataTexture` 3×1, filtro nearest) e **contorni a guscio rovesciato**: per ogni
  parte una copia ingrandita per asse di `spessore/mezza misura` (niente crepe sugli spigoli), faccia interna, color
  inchiostro. Le parti di un oggetto sono fuse in una geometria con i colori nei vertici (`merge`): una macchinina =
  2 draw call.
- Intensità delle luci nei token (`--ry-amb`, `--ry-sunI`…), già compensate per l'illuminazione fisica di three ≥ r155
  (niente fattore π). La luce principale arriva da dietro chi guida (niente controluce sulle macchinine).
- Scenario a **blocchi di 120 m** costruiti uno per fotogramma quando mancano 320 m e nascosti oltre la nebbia;
  alberi (tondi o pini, coi colori della tappa), cespugli lungo il bordo morbido, funghi a pois, fiori, rocce con
  `InstancedMesh` (+ contorno che condivide `instanceMatrix`). Terreno: griglia 64×64 (6 m) che segue la camera.
- Misure (headless, livello 12): ~45–60 draw call, ~50–75 mila triangoli visibili, 3–17 ms per costruire un blocco
  (i primi, più lenti, durante il conto alla rovescia). Pixel ratio ≤ 1,5, cala da solo fino a 0,6 se i fotogrammi
  superano ~26 ms e risale se c'è margine. Contesto WebGL liberato all'uscita (anche da partita in pausa).
- Senza WebGL compare un messaggio (`ry_nogl`).

## Controlli di qualità
`el._rally` (sul `#board`): `state()`, `geo()`, `three()` (renderer, blocchi, tempi di costruzione `buildT`), `mode()`,
`sensor`, `ff(sec, {d, k, steer})` avanti veloce con un autopilota semplice (eventi compresi), `winDelay` per ritardare
la finestra di vittoria negli screenshot. In Chromium headless WebGL funziona già via SwiftShader con gli argomenti
predefiniti (a 2–4 fps: per questo `ff`).

## Test
`tests/rally.test.mjs`: pista percorribile (raggio ≥ 14 m con un oracolo a tre punti, nessun riavvicinamento < 30 m a
forza bruta), note coerenti (verso, gravità dal raggio misurato, ogni curva con R < 130 m coperta, rocce dentro curve
"non tagliare"), note lette 110 m prima e in ordine, **bot pilota** (reazione ~0,22 s, stima dell'aderenza "umana",
legge solo punti della pista e stato della sua auto) tra i primi 3 nei livelli 1–10 su 4 semi (1° al livello 1), pilota
lento e impreciso che vince i livelli 1–4, avversari che finiscono sempre, determinismo e ripresa da JSON, fisica
(freno, fuori strada, bosco morbido, spintarelle), conto alla rovescia, difficoltà monotona, tempi (generazione < 10 ms,
un minuto simulato < 150 ms).
