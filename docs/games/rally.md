# Hari Rally

Gara di **rally in prima persona**, in vero 3D con grafica cartoon (cel shading) nello stile della mascotte, in
**quattro ambientazioni a rotazione** (bosco, città, mare, neve) di **giorno, al tramonto e di notte**, con
**power-up buffi e innocui** stile kart. Visuale pilota: cofano 3D della macchinina di Hari, cruscotto SVG col volante e
le **zampine di Hari** che girano con lo sterzo, contagiri con la lancetta e la faccina di Hari. Hari sfida tre
animaletti con le loro macchinine: **Coniglietta** (lilla), **Volpe** (azzurra) e **Panda** (menta), che spuntano dal
tettuccio. **Niente violenza né danni**: fuori strada si rallenta, i bordi sono morbidi (cespugli, transenne a cuscino,
cumuli di neve), i contatti tra auto sono spintarelle, i power-up fanno scivolare, appiccicare o rallentare un attimo.

- id `rally`, brand **Hari Rally** (non tradotto), regole `r14`, brano `rally`, tinta `--tint-rally`, token `--ry-*`.
- File: `src/games/rally-logic.js` (logica pura, niente DOM né THREE), `src/games/rally-ui.js` (three.js + HUD HTML),
  `src/games/rally.css`, `src/vendor/three.min.js` + `src/vendor/three.LICENSE`, `tests/rally.test.mjs` +
  `tests/_rally-bot.mjs` (bot pilota), blocco "Hari Rally" in `tools/selftest.mjs`.
- Audio in `src/core/audio.js`: brano `rally`, `pace(dir, g)` (bip del navigatore a destra/sinistra),
  `HH.audio.engine(on, rpm, grit)` (motore con tre "marce", ghiaia quando si scivola) e gli effetti dei power-up
  `gift` (scatola), `zoom` (turbo), `whee` (buccia), `squish` (miele), `puff` (nuvoletta), `bubble`/`pop` (scudo),
  `sproing` (molla), `tink` (ghianda), `plop` (buccia o miele lasciati).

## three.js in locale (offline, lazy)
`src/vendor/three.min.js` è la build UMD classica di **three r160** (npm `three@0.160.0`, `build/three.min.js`, ~654 KB,
licenza MIT in `src/vendor/three.LICENSE`) che definisce `THREE` globale. Unica modifica: tolto il `console.warn` di
deprecazione in testa (sostituito da `void 0,`), così la console resta pulita. È **solo** tra i `files` del gioco nel
catalogo (`src/games/catalog.js`): si scarica e va nella cache del service worker solo aprendo il rally; mai in
`index.html` né in `SHELL`. Nel file unico (`npm run build`) è inline come gli altri file dei giochi.

## Regole
- **Acceleratore automatico**: si sterza, si frena e si usano i power-up. Partenza da fermi dopo il semaforo (3 rossi →
  verde, "Via!"); Hari parte **ultimo** (4°) sulla griglia 2×2.
- **Obiettivo**: arrivare **tra i primi 3**. Fragoline per posizione: 1° = 3, 2° = 2, 3° = 1 (anche in tempo reale
  nell'indicatore). 4° = gara persa: pannello con la classifica e "Riprova" (nessuna vita).
- "Mosse" (zampette) = **posizioni guadagnate** con i sorpassi.
- **Fuori strada** (oltre 5 m dal centro: erba, marciapiede, sabbia, neve): velocità massima 42% e meno aderenza.
- **Bordo morbido** dell'ambientazione (`WALLS`, distanza dal centro della sua faccia interna): bosco 8,8 m (cespugli,
  staccionate), città 7,2 m (transenne a cuscino dopo il marciapiede), mare 8,2 m (paletti con la corda dal lato
  spiaggia, massi dal lato scogliera), neve 8,4 m (cumuli). **Ponti**: ringhiere a 4,95 m (`RAIL`). **Gallerie**:
  pareti a 5,9 m (`TUBE`). **Ostacoli** all'interno di alcune curve ("non tagliare"): rocce (bosco, mare), vasi di fiori
  (città), pupazzi di neve (neve), cerchi di raggio 1 m.
- **Dossi**: oltre 16,5 m/s si fa un saltino (niente sterzo in aria). **Curve paraboliche** (alcune 2–3, soprattutto in
  città e sulla neve): strada inclinata verso l'interno e +15–24% di aderenza.
- **Ghiande bonus** in file di 5 lungo la strada: ognuna +0,5% di velocità massima (fino a 10 = +5%). Una buccia ne fa
  perdere 2. Contatore in alto a destra.
- **Checkpoint** a un terzo e a due terzi (arco di palloncini): compare la posizione e il tempo.
- L'auto non si gira mai al contrario (angolo con la strada limitato a 1 rad) e va sempre avanti.

## Power-up
**Scatole-sorpresa** (regali colorati che girano) in file di 4 di traverso, ogni ~345–400 m, mai su ponti, in galleria,
sui dossi o in curve strette; una scatola presa ricompare dopo 2,5 s. Chi ha già un power-up rompe la scatola ma non ne
prende un altro. Il power-up tenuto si vede nel **pulsante grande** a destra (con la "ruota" che gira appena preso e il
nome la prima volta); si usa con un tocco sul pulsante (anche coi sensori: il pulsante non frena e non sterza), con
↑/W/E/Invio o col clic.

| Power-up | Effetto | Durata |
|---|---|---|
| Turbo carota | +2,5 m/s subito, poi fino al 130% della velocità massima con spinta tripla; campo visivo un po' più largo e righe di velocità | 1,8 s |
| Scudo-bolla | la prossima spinta, buccia, pozza o nuvoletta non fa nulla (lo scudo scoppia con un "pop"); chi sbatte sulla bolla rimbalza | 9 s |
| Buccia di banana | lasciata dietro; chi la prende fa un giro buffo su se stesso (niente sterzo), −28% di velocità, −2 ghiande | 0,9 s |
| Pozza di miele | lasciata dietro (raggio 1,6 m); dentro si va al massimo al 52% e ci si appiccica | 22 s in pista |
| Nuvoletta di fiori | vola lungo la pista fino a chi è subito davanti e lo rallenta (massimo 72%) tra i petali | 2,4 s |
| Calamita | le ghiande entro 6 m arrivano da sole | 7 s |
| Salto a molla | saltino alto con la molla: si passa sopra bucce, pozze e altre auto, +2,5 m/s | 0,95 s |

Al massimo 10 bucce/pozze in pista (le più vecchie spariscono). **Bilanciamento (rubber band leggero)**: i pesi della
scatola dipendono dalla posizione di chi la prende (`IW`): il 1° trova soprattutto scudo, bucce, miele e calamita (mai la
nuvoletta), il 4° soprattutto turbo, nuvoletta e molla. Per gli avversari i pesi dei power-up "dispettosi" (buccia,
miele, nuvoletta) sono moltiplicati per `aiItem` (0,3 al livello 1 → 1 dal 9): al livello 1 si subiscono pochi scherzi.
**IA**: turbo quando i prossimi 70 m sono veloci, scudo e calamita quasi subito, buccia/miele quando qualcuno è dietro
entro 26 m, nuvoletta quando qualcuno è davanti entro 160 m, molla per saltare una buccia davanti; dopo 9–10 s lo usano
comunque. Un attimo di esitazione prima di usarlo (più lungo per i meno bravi).

## Controlli
- **Sensori** (schermo intero, telefono in orizzontale): si inclina il telefono come un volante (componente della
  verticale lungo il lato lungo dello schermo, da `beta`/`gamma` e dall'angolo di `screen.orientation`); zero tarato al
  "Via!", alla ripresa e al cambio di modo, zona morta 6%, fondo corsa a 24°. **Freno: tieni premuto ovunque** (tranne sul
  pulsante del power-up). Su iOS il permesso si chiede al primo tocco. A schermo intero si prova
  `screen.orientation.lock('landscape')`; in verticale compare l'invito a girarlo (e la gara va in pausa).
- **Tocco**: tieni premuta la metà sinistra/destra per sterzare (parte al 42% e arriva al massimo in ~0,25 s), **pedale**
  in basso al centro per frenare, **pulsante del power-up** a destra sopra il cruscotto.
- **Tastiera**: frecce/A-D sterzo, giù/S/spazio freno, su/W/E/Invio power-up, P/Esc pausa.
- Interruttore in alto a destra **sensori ↔ tocco** (scelta salvata in `rally:ctl`).
- A schermo intero la barra del logo e l'uscita galleggiano in basso agli angoli (il pulsante del power-up resta sopra);
  gli indicatori dell'app (`fs-hud`) sono nascosti (tutto in `rally.css` con `:has(.ry-wrap)`, nessuna modifica ad `app.js`).
- Pausa automatica a pagina nascosta, col tutorial (4 pagine, la terza sui power-up), col telefono in verticale a schermo
  intero; ripresa con un breve conto alla rovescia. "Annulla" = pausa/riprendi.

## Note del navigatore
Dedotte dalla **curvatura vera** della pista campionata (non dai pezzi del generatore): tratti con |k| > 1/300 m⁻¹ dello
stesso verso (uniti se separati da ≤ 8 m), gravità dal **raggio minimo**:

| Gravità | 6 | 5 | 4 | 3 | 2 | 1 |
|---|---|---|---|---|---|---|
| Raggio minimo | ≥ 140 m | 95–140 | 62–95 | 40–62 | 24–40 | < 24 (tornante "U" se > 115°) |

Modificatori (icone, lingua neutra, al massimo 3): **attenzione** (gravità ≤ 2 dopo un tratto veloce, o curva ≤ 3 subito
dopo un dosso), **non tagliare** (c'è un ostacolo all'interno), **parabolica** (strada inclinata), **lunga** (> 100°),
**e subito** (la nota dopo comincia entro 18 m). Note a sé per **dosso**, **ponte** e **galleria**. La nota compare (e
suona) **110 m prima**; la barretta sotto mostra quanto manca. Ondulazioni di gravità 6 sotto i 10° non hanno nota.

## Pista
Tappa punto-punto da seme: 30 m di griglia, lunghezza `len`, 90 m dopo il traguardo. Pezzi: rettilinei, curve con
**raccordi a clotoide** e **chicane** (due curve medie di verso opposto quasi attaccate; più frequenti in città).
Campionata ogni metro (x, y, direzione, curvatura). Ogni pezzo nuovo deve stare a **≥ 33 m** da ogni punto della pista
di almeno 160 m prima, altrimenti si prova il verso opposto o una curva che riporta verso nord; dopo troppi tentativi si
rigenera con un seme derivato. Raggio minimo 15 m. Sui tratti dritti (|k| < 1/400 per ≥ 60 m), senza sovrapporsi:
**gallerie** (34–70 m: città, mare, neve), **ponti** (18 m, su ruscelli, canali o insenature) e **dossi**. Colline e
dossi sono solo grafica (`height(g, x, y)`; al mare quasi piatto, perché il livello dell'acqua è uno solo); la fisica è
in coordinate di Frenet (s, d, psi) con aderenza 9,5 m/s² (neve × 0,88, asfalto × 1,02–1,04), sterzo massimo 1/8,5 m⁻¹,
sottosterzo che fa scivolare verso l'esterno, aiutino allo sterzo che riallinea quando non si sterza forte.

**Traiettoria ideale** (`g.line`, scostamento dal centro per ogni metro): curvatura minima, cioè il d(s) che rende minima
∑ (k + d″)² con |d| ≤ 3,2 m. Nodi ogni 4 m, equazioni normali pentadiagonali risolte con una fattorizzazione a banda
(LDLᵀ) e un **insieme attivo** per i vincoli (chi esce va sul bordo, chi "tira" verso il centro torna libero). Ne
escono da sé i punti di corda: fuori prima della curva, dentro sull'apice, fuori in uscita; nelle chicane dritto da un
apice all'altro. Il **profilo di velocità** `g.prof` usa la curvatura vera di quella traiettoria (cerchio per tre punti
a ±5 m, il peggiore nei ±4 m): √(aderenza × (1 + 1,5 × inclinazione) / k), poi frenate a 8 m/s² all'indietro.

## Collisioni
Ogni auto è un **rettangolo orientato** `CAR_L × CAR_W` = 4,0 × 1,96 m (le stesse misure con cui `rally-ui.js` costruisce
le macchinine: carrozzeria, paraurti e ruote stanno dentro).
- **Auto–auto**: test degli assi separatori (SAT) sui 4 assi; separazione **completa** lungo l'asse di minima
  compenetrazione, divisa a metà (chi ha lo scudo-bolla non si sposta e la spinta va tutta all'altro); poi impulso sulla
  velocità relativa lungo la normale con poco rimbalzo (e = 0,25) e attrito (μ = 0,3). La parte di velocità lungo il muso
  resta in `v`, quella di lato diventa **spinta laterale** `pd` (≤ 4 m/s) che si smorza (×e^(−5t)). Fino a 6 passaggi
  per passo fisso finché non ci sono più sovrapposizioni, rimettendo dentro ai bordi chi è stato spinto. Chi ha finito la
  gara da più di 15 m o vola sulla molla non urta.
- **Bordi**: l'ingombro laterale vero del rettangolo è `HL·|sin ψ| + HW·cos ψ`; se supera il bordo si sposta fuori di
  quanto serve, si toglie solo la velocità contro il bordo (rimbalzo 0,2, il muso si raddrizza un po') e si perde
  velocità **in proporzione all'urto** (½ della velocità d'impatto, mai sotto il 55%); strisciando si rallenta appena.
- **Ostacoli** (cerchi): punto del rettangolo più vicino al centro; stessa risoluzione con impulso e attrito, mai sotto
  il 45% della velocità.
- **Grafica coerente**: le facce interne di cespugli, transenne, ringhiere, pareti delle gallerie e massi sono alla
  distanza di `edgeAt(g, s).lim`; ostacoli disegnati col raggio `rk.r` (girano solo in orizzontale); la camera sta 0,9 m
  (`EYE_BACK = 2,9 − CAR_L/2`) dietro il centro, così il bordo del cofano (2,9 m davanti all'occhio) è il muso del
  rettangolo: tamponando, il retro dell'altra auto tocca il cofano. Le chiome degli alberi non sporgono sulla zona guidabile.

## Avversari
- Seguono la **traiettoria ideale** guardando 5 m + 0,3 s avanti (ognuno con una piccola preferenza di corsia), con
  velocità = profilo (il minimo tra qui e un po' avanti) × **bravura**, al massimo `aiTop` × velocità massima sui
  rettilinei (+ ghiande), e **frenano prima delle curve** (il profilo contiene già le frenate). Sterzano gradualmente
  (il muso gira al massimo di 2,5 rad/s: niente scatti nell'ingombro).
- **Sorpassi**: se chi è davanti entro 16 m + 0,45 s sta sulla loro linea ed è più lento, si spostano di 2,6 m dal lato
  con spazio e tengono la scelta per 1,4 s; se non c'è spazio restano in scia senza tamponare. Affiancati si allargano
  un pochino. Scansano bucce e pozze viste in tempo (i più bravi le vedono prima).
- Ogni tanto sbagliano (curva larga fin sull'erba o alzata di piede; frequenza per km che cala coi livelli).
- Quando Hari arriva, chi è ancora in corsa viene simulato (anche coi power-up tra loro) fino al traguardo.

## Ambientazioni (`config(level)`)
Rotazione di 12 livelli: 1 bosco di primavera (giorno) · 2 città (giorno) · 3 mare (giorno) · 4 bosco d'autunno
(tramonto) · 5 neve (giorno) · 6 città (notte) · 7 mare (tramonto) · 8 bosco di primavera (notte) · 9 città (tramonto) ·
10 mare (notte) · 11 neve (notte) · 12 bosco d'autunno (giorno), poi di nuovo. Col tema scuro è sempre notte. `config`
dà `theme` (forest/city/sea/snow), `stage` (spring/autumn/city/sea/snow, su `.ry-wrap[data-stage]`), `time`
(day/dusk/night, su `.ry-wrap[data-time]`) e `night` (0 / 0,5 / 1).
- **Bosco**: sterrato coi solchi, alberi tondi e pini, cespugli, staccionate, funghi (anche giganti con la porticina),
  case sugli alberi con la scala, laghetti, ruscelli coi ponti di legno, animaletti che saltellano sui ceppi, raggi di
  sole; di sera lanterne di carta.
- **Città**: asfalto con le strisce e la riga gialla, cordoli a scacchi, marciapiedi a piastrelle, transenne a cuscino,
  palazzi pastello su due file con finestre (accese di sera), negozi con vetrina, tenda a righe e insegna, vie laterali
  con strisce pedonali e semafori decorativi, lampioni col braccio, alberelli, gallerie (sottopassi) con le luci, ponti
  sui canali, pubblico in tribuna; profilo dei grattacieli all'orizzonte.
- **Mare**: litoranea con la sabbia ai bordi; il mare è sempre a destra (terreno che scende sotto il livello dell'acqua),
  spiaggia con ombrelloni, asciugamani, cabine a righe, castelli di sabbia; palme; scogliere e casette bianche dal lato
  della terra; un **faro** (col fascio che gira di notte) e un **porticciolo** con le barche che dondolano; gabbiani;
  lampioni sul lungomare; tramonto rosa-viola; isole all'orizzonte.
- **Neve**: pini col cappuccio, cumuli ai bordi, chalet con le finestre accese, pupazzi di neve (anche come ostacoli),
  laghetto ghiacciato, lanterne di sera, montagne con le cime innevate; più tornanti (+6% di curve strette).
- Ovunque: archi di partenza/arrivo a scacchi con semafori, checkpoint coi palloncini, cartelli a freccia nelle curve
  strette, tribune con bandierine e animaletti che tifano.

## Curva di difficoltà (`config(level)`)
Gradini (`tier`): 0 = livelli 1–2 · 1 = 3–4 · 2 = 5–7 · 3 = 8–10 · 4 = 11+. Monotoni con i livelli: lunghezza, velocità,
curva più stretta, frequenza di curve, bravura e velocità sui rettilinei degli avversari, uso dei power-up, meno errori e
meno aiuto allo sterzo. Le ambientazioni modulano solo il "carattere" (più chicane in città, più tornanti sulla neve,
aderenza diversa).

| | L1 | L3 | L6 | L10 | L14+ |
|---|---|---|---|---|---|
| Lunghezza | 1300 m | 1840 m | 2650 m | 3730 m | 4300 m |
| Curva più stretta | gravità 3 | 2 | 1 (tornanti) | 1 | 1 |
| Velocità massima | 81 km/h | 85 km/h | 90 km/h | 97 km/h | 104–106 km/h |
| Avversari (bravura) | .68/.75/.81 | .72/.79/.85 | .77/.84/.90 | .84/.91/.97 | .88/.93/.97 |
| Velocità sui rettilinei | 95% | 96% | 98% | 100% | 100% |
| Power-up dispettosi IA | 30% | 48% | 75% | 100% | 100% |
| Errori avversari / km | 1,3 | 1,16 | 0,95 | 0,67 | 0,39 |
| Aiuto allo sterzo | 0,70 | 0,58 | 0,40 | 0,16 | 0,12 |
| Nebbia in più | — | — | 15% | 30% | 45% |

Livello 1: ~65 s per il bot attento (che vince con 10–15 s di vantaggio), 1–2 minuti per un bambino; il pilota "lento e
impreciso" dei test lo vince sempre. `parTime` = lunghezza / (62% della velocità massima). `progress` = metri fatti /
lunghezza (1 alla vittoria).

## Grafica e prestazioni
- `MeshToonMaterial` con rampa a 3 toni e **contorni a guscio rovesciato** (copia ingrandita per asse, faccia interna,
  color inchiostro). Colori solo dai token `--ry-*` (anche di oggetti e power-up); intensità delle luci nei token
  (`--ry-amb`, `--ry-sunI`, `--ry-sunH` = altezza del sole, bassa al tramonto).
- **Notte**: cielo stellato con la luna, fari di Hari (spot), fanalini e fari degli avversari (sprite additivi), finestre
  accese (`MeshBasicMaterial`, non illuminate), lampadine e **aloni** (Points additivi) + **pozze di luce** sulla strada
  (quad additivi): niente luci puntiformi vere (costose).
- Scenario a **blocchi di 120 m** costruiti uno per fotogramma quando mancano 320 m e nascosti oltre la nebbia. Strada
  per blocco: una mesh con colori nei vertici (strisce, cordoli, bordi chiusi fino al terreno). Oggetti poco numerosi
  **fusi in una geometria per blocco** (corpo + contorno = 2 draw call); oggetti numerosi con **InstancedMesh** (alberi,
  cespugli, cumuli, massi, fiori, finestre, lampadine, animaletti) con variazioni di scala, colore e rotazione.
  **LOD semplice**: oltre ~85 m alberi e cespugli usano una forma sola senza contorno (stesse matrici e colori).
  Animaletti, pubblico, barche e faro si animano solo nei blocchi vicini. Oggetti dei power-up: InstancedMesh globali
  (scatole, nastri, ghiande, bucce, pozze, nuvolette).
- **Budget** (Chromium headless, misurato con `renderer.info` a 360×760 e 800×380): **35–90 draw call** (città 35–60,
  mare 40–65, bosco/neve 60–90), **80–170 mila triangoli** disegnati (città ~80–125k, mare ~100–150k, bosco/neve
  ~130–170k; prima del LOD erano fino a 230k). Costruzione di un blocco 3–20 ms (i primi tre, con tribune e arco di
  partenza, 17–30 ms: si costruiscono prima del via). Pixel ratio ≤ 1,5, cala da solo fino a 0,6 se i fotogrammi superano
  ~26 ms e risale se c'è margine. Contesto WebGL liberato all'uscita (anche da partita in pausa).
- Senza WebGL compare un messaggio (`ry_nogl`).

## Salvataggio
`snapshot` = stato JSON (< 4,5 KB) con `v: 2`: auto (con power-up, ghiande, timer degli effetti, spinta laterale),
bucce/pozze (`hz`), nuvolette (`cl`), scatole in ricarica (`bx`), ghiande prese (`ag`, bit in esadecimale), checkpoint
(`chk`), generatore casuale (`rs`). La pista non si salva: si rigenera dal seme. I salvataggi della versione 1 passano
da `migrate()` (campi nuovi a zero, auto rimesse dentro i bordi nuovi).

## Controlli di qualità
`el._rally` (sul `#board`): `state()`, `geo()`, `three()` (renderer, blocchi, tempi di costruzione `buildT`, statistiche
per blocco `stat`), `mode()`, `sensor`, `ff(sec, {d, k, steer})` avanti veloce con un autopilota semplice (eventi
compresi), `give(item, who, use)` dà un power-up (0 = Hari) e lo usa, `use()`, `draw()`, `hold(on)` ferma il tempo reale
(per le foto), `winDelay`. In Chromium headless WebGL funziona già via SwiftShader con gli argomenti predefiniti (a 2–4
fps: per questo `ff` e `hold`).

## Test
`tests/rally.test.mjs`:
- pista percorribile (raggio ≥ 14 m con un oracolo a tre punti, nessun riavvicinamento < 30 m a forza bruta);
- note coerenti (verso, gravità dal raggio misurato, ogni curva con R < 130 m coperta, dossi/ponti/gallerie con la loro
  nota sui tratti dritti e separati, ostacoli dentro curve "non tagliare" e fuori dalla carreggiata, paraboliche 2–3
  segnalate), note lette 110 m prima e in ordine;
- ambientazioni a rotazione (tutte di giorno e di notte/tramonto, mai due livelli di fila uguali, gallerie in città,
  bordi per ambientazione), tracciati vari (chicane, tornanti, dossi, checkpoint, scatole e ghiande ben piazzate);
- traiettoria ideale (apice all'interno e ingresso da fuori nella grande maggioranza delle curve isolate 1–3, profilo
  all'apice ≥ 95% di √(aderenza × R) del centro, scostamento graduale e dentro la carreggiata);
- **bot pilota** (reazione ~0,22 s, stima dell'aderenza "umana", legge solo i punti della pista, la sua auto e le cose
  sulla strada; usa i power-up con regole semplici): tra i primi 3 nei livelli 1–10 su 4 semi, 1° al livello 1; eccezioni
  ammesse: al massimo 2 gare perse, solo dal livello 9 (con i semi attuali: nessuna). Con l'ultimo assetto il bot arriva
  1° nei livelli 1–6, 1°–3° nei 7–10. **Bot lento** (reazione 0,45 s, aderenza stimata 6,5, sterzo impreciso): vince i
  livelli 1–4, perde almeno metà delle gare 7–10 e arriva in media più indietro di quasi un posto;
- avversari che finiscono sempre e restano dentro i bordi; avversari che usano i power-up; sorpasso di lato senza
  compenetrazioni;
- **collisioni**: in 12 gare intere (livelli 2–10) nessuna compenetrazione residua > 1 cm tra rettangoli (SAT scritto a
  parte nel test), nessun angolo oltre i bordi, nessuno dentro un ostacolo, nessun salto laterale > 0,2 m per passo né
  in avanti oltre la velocità; tamponamento con scambio di velocità proporzionale all'urto; spinta laterale limitata; lo
  scudo-bolla non si sposta e scoppia; bordo: urto di striscio quasi gratis, urto deciso rallenta; ostacoli;
- hitbox coerenti con la grafica (la UI usa `P.CAR_L`, `P.CAR_W`, `rk.r`, `P.edgeAt`, `P.RAIL`, `P.TUBE`, raggi dei
  power-up; `EYE_BACK = 2,9 − P.CAR_L / 2`);
- ogni power-up (turbo, scudo, buccia, miele, nuvoletta, calamita, molla) e il bilanciamento per posizione;
- determinismo e ripresa da JSON (anche con i power-up), migrazione dei salvataggi v1, conto alla rovescia,
  checkpoint, fragoline, difficoltà monotona, tempi (generazione < 10 ms, un minuto con 4 auto e power-up < 150 ms;
  in CI × 3).
