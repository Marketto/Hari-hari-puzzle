# Hari Rally

Gara di **kart-rally** in vero 3D con grafica cartoon (cel shading) nello stile della mascotte, in **quattro
ambientazioni a rotazione** (bosco, città, mare, neve) di **giorno, al tramonto e di notte**, con **power-up buffi e
innocui** stile kart. **Visuale in terza persona** (predefinita, stile Mario Kart): si vede il kart-fragola di Hari da
dietro e sopra, con Hari al volante (testa a riccio con gli aculei, si inclina in curva, festeggia); un pulsante (o il
tasto C/V) passa alla **visuale pilota** (cofano a fragola, cruscotto SVG col volante e le zampine, contagiri) e la scelta
resta salvata (`rally:cam`). Hari sfida tre animaletti sui loro **kart a forma di frutto**: **Coniglietta** (pesca),
**Volpe** (mandarino) e **Panda** (fetta d'anguria). **Niente violenza né danni**: fuori strada si rallenta molto,
alberi, rocce e transenne fermano o fanno girare, chi esce troppo viene riportato in pista da una nuvoletta, i contatti
tra kart sono spintarelle, i power-up fanno scivolare, appiccicare o rallentare un attimo.

- id `rally`, brand **Hari Rally** (non tradotto), regole `r14`, brano `rally`, tinta `--tint-rally`, token `--ry-*`.
- File: `src/games/rally-logic.js` (logica pura, niente DOM né THREE), `src/games/rally-ui.js` (three.js + HUD HTML),
  `src/games/rally.css`, `src/games/rally-net.js` + `src/games/rally-mp.css` (a due giocatori, vedi sotto), `src/vendor/three.min.js` + `src/vendor/three.LICENSE`, `tests/rally.test.mjs` +
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
- **Acceleratore e freno manuali**: pedale destro (grande) per accelerare, pedale sinistro per frenare; tenendo il freno
  da fermi si va in **retromarcia** (fino a 5 m/s). Senza gas il kart rallenta piano. **Acceleratore automatico**
  come opzione (interruttore nel menu di pausa, scelta salvata in `rally:auto`): se il giocatore non l'ha mai scelto è
  acceso solo al **livello 1** (il primo giro serve a imparare a sterzare e a frenare, con le note) e spento dal 2 (dove
  le curve strette chiedono di alzare il piede e frenare: con l'acceleratore sempre giù non si impara a dosare). Nella
  logica `input.gas` assente = automatico.
- Partenza da fermi dopo il semaforo (3 rossi → verde, "Via!"); Hari parte **ultimo** (4°) sulla griglia 2×2.
- **Obiettivo**: arrivare **tra i primi 3**. Fragoline per posizione: 1° = 3, 2° = 2, 3° = 1 (anche in tempo reale
  nell'indicatore). 4° = gara persa: pannello con la classifica e "Riprova" (nessuna vita).
- "Mosse" (zampette) = **posizioni guadagnate** con i sorpassi.
- **Fuori strada vero** (oltre 5 m dal centro): **erba** nel bosco (velocità massima 42%, aderenza ×0,68), **marciapiede**
  in città (45%, ×0,8), **sabbia** al mare (38%, ×0,62), **neve alta** (36%, ×0,58); oltre il massimo si frena forte
  (13–14 m/s²). La camera sobbalza, il kart rimbalza sulle sospensioni e alza polvere (o neve, o sabbia).
- **Bordi** (`WALLS`, `HARD`, `sideAt(g, s, lato)`): in **città** transenne continue a 7,2 m e al **mare** staccionata con la
  corda (lato spiaggia) e muretto di pietra (lato terra) a 8,2 m sono **muri veri**; nel **bosco** e sulla **neve** non c'è
  muro: tra 7,8 m e il limite (12 m, all'interno delle curve strette 0,62 × raggio) c'è la **fascia degli ostacoli**
  (`g.props`, cerchi nel mondo: alberi, rocce, ceppi e cespugli nel bosco; pini, cumuli, pupazzi di neve e rocce sulla
  neve), oltre il limite (cespugli e staccionate decorativi) si è **usciti troppo**. **Ponti**: ringhiere a 4,95 m
  (`RAIL`); **gallerie**: pareti a 5,9 m (`TUBE`); prima e dopo, un **guardrail a imbuto** lungo 20 m (`FUN`) porta dal
  limite dell'ambientazione alla ringhiera o alla parete (niente muri che spuntano di colpo: la pendenza del muro entra
  nella velocità d'urto). **Ostacoli "non tagliare"** all'interno di alcune curve: rocce (bosco, mare), vasi di fiori
  (città), pupazzi di neve (neve), cerchi di raggio 1 m.
- **Muri e ostacoli fermano**: urto proporzionale alla velocità contro il muro (si perde fino al 60%), strisciando contro
  il muro si frena a 12 m/s², un urto deciso (> 4,5 m/s di lato, o > 5 m/s contro albero/roccia) fa fare a Hari un giro
  buffo (niente sterzo per mezzo secondo). Cespugli e cumuli sono più morbidi.
- **Nuvoletta** (`rescue`): oltre il limite senza muro, o fermi fuori strada per 2,5 s col gas giù, Hari sparisce in una
  nuvola di fiori, viene posato **6 m più indietro** nel posto libero più vicino alla traiettoria ideale (fermo, dritto),
  in **1,5 s** (`RESCUE`); finché non è libero è "fantasma" (non urta). Evento `rescue`, poi `back` ("Di nuovo in
  strada!").
- **Aderenza limitata e derapata**: la direzione di marcia gira al massimo di aderenza / v; il muso può girare fino a 1,6
  volte di più e allora il kart **derapa** (angolo di deriva `bet`, la velocità si sposta di lato e si perde un po'
  strisciando). Lo sterzo a fondo corsa chiede al massimo 1,5 volte l'aderenza (`DRIFT.lock`): tenerlo fa derapare, mai
  un testacoda per uno sterzo tenuto. Entrando troppo veloci la curva chiede di più di quanto si può: **si va larghi**,
  sull'erba o contro il muro; le curve strette vanno prese **frenando** (frenando l'aderenza laterale cala al 82%). Una
  **derapata tenuta** (deriva > 0,12 rad sopra i 10 m/s) per 0,75 s dà all'uscita una **mini-spinta** (+1,8 m/s e
  velocità massima +12% per 0,55 s), per 1,6 s una più forte (+3 m/s per 0,95 s), con le scintille gialle e poi arancioni
  dalle ruote. Oltre 0,6 rad di deriva: **sbandata** (giro buffo, velocità × 0,55).
- **Dossi**: oltre 16,5 m/s si fa un saltino (niente sterzo in aria). **Curve paraboliche** (alcune 2–3, soprattutto in
  città e sulla neve): strada inclinata verso l'interno e +15–24% di aderenza.
- **Ghiande bonus** in file di 5 lungo la strada: ognuna +0,5% di velocità massima (fino a 10 = +5%). Una buccia ne fa
  perdere 2. Contatore in alto a destra.
- **Checkpoint** a un terzo e a due terzi (arco di palloncini): compare la posizione e il tempo.
- Il kart non si gira mai al contrario (angolo con la strada limitato a 1,1 rad).

## Power-up
**Scatole-sorpresa** (regali colorati che girano) in file di 4 di traverso, ogni ~345–400 m, mai su ponti, in galleria,
sui dossi o in curve strette; una scatola presa ricompare dopo 2,5 s. Chi ha già un power-up rompe la scatola ma non ne
prende un altro. Il power-up tenuto si vede nel **pulsante grande** sopra l'acceleratore (con la "ruota" che gira appena
preso e il nome la prima volta); si usa con un tocco sul pulsante (anche tenendo giù i pedali: tocco multiplo), con
spazio/E/Invio o col clic.

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
- **Pedali** (tocco multiplo: si possono tenere insieme pedale, sterzo e power-up): **acceleratore** grande in basso a
  destra, **freno/retromarcia** a sinistra (coi sensori in basso a sinistra, col tocco accanto all'acceleratore); il
  **pulsante del power-up** sta sopra l'acceleratore. Col tasto premuto il pedale si abbassa e si colora; con
  l'acceleratore automatico il pedale ha il bollino giallo e si illumina da solo.
- **Sterzo**: coi **sensori** (schermo intero, telefono in orizzontale) si inclina il telefono come un volante
  (componente della verticale lungo il lato lungo dello schermo, da `beta`/`gamma` e dall'angolo di
  `screen.orientation`; zero tarato al "Via!", alla ripresa e al cambio di modo, zona morta 6%, fondo corsa a 24°). Senza
  sensori: **frecce** ◀ ▶ in basso a sinistra (partono al 42% e arrivano al massimo in ~0,25 s; scivolando da una
  all'altra il comando segue il dito) oppure **trascinamento** in un punto libero dello schermo (lo sterzo segue lo
  spostamento orizzontale del dito, fondo corsa a un quinto della larghezza). Su iOS il permesso dei sensori si chiede al
  primo tocco. A schermo intero si prova `screen.orientation.lock('landscape')`; in verticale compare l'invito a girarlo
  (e la gara va in pausa).
- **Tastiera**: ↑/W acceleratore, ↓/S freno (e retromarcia), ←→/A-D sterzo, **spazio**, E o Invio power-up, C/V
  visuale, P/Esc pausa.
- In alto a destra: **visuale** (terza persona ↔ pilota, `rally:cam`), **sensori ↔ tocco** (`rally:ctl`), pausa. Il
  **menu di pausa** ha tre interruttori: visuale, acceleratore automatico (`rally:auto`), sensori ↔ tocco.
- A schermo intero la barra del logo e l'uscita galleggiano in basso agli angoli; pedali, frecce e power-up salgono un
  po' e si ingrandiscono; gli indicatori dell'app (`fs-hud`) sono nascosti (tutto in `rally.css` con `:has(.ry-wrap)`,
  nessuna modifica ad `app.js`).
- Pausa automatica a pagina nascosta, col tutorial (4 pagine: comandi, note e derapata, power-up, gara e fuori strada),
  col telefono in verticale a schermo intero; ripresa con un breve conto alla rovescia. "Annulla" = pausa/riprendi.

## Visuale e camera
- **Terza persona** (predefinita): camera 5,8 m (+1,4 m in velocità) dietro e 2,55 m sopra il kart, inseguimento con
  una **molla smorzata in modo critico** (ω = 7,5) sulla posizione e una direzione morbida, sguardo 6–9 m davanti al
  kart; mai sotto il terreno; **inclinazione** leggera verso l'interno delle curve; **campo visivo** che si allarga col
  turbo (+9°) e con la mini-spinta (+5°); **scossoni** negli urti (spinta, muro, albero) e sobbalzi fuori strada; si
  rimette a posto da sola dopo la nuvoletta. Campo visivo 52–68° secondo il formato; nebbia un po' più vicina (−12%) e
  dettagli dello scenario che calano prima (72 m) perché dall'alto si vede più lontano.
- **Visuale pilota**: occhio `EYE_BACK = 2,9 − CAR_L/2` dietro il centro del kart, così il bordo del cofano a fragola
  (2,9 m davanti) è il muso del rettangolo di collisione; il cofano sta al 65% dell'altezza, sopra il cruscotto.
- Note del navigatore, posizione, tempo, ghiande e power-up restano in alto e ai lati; da dietro il contachilometri è un
  quadrante tondo in basso a sinistra (al posto del cruscotto) e la barra della tappa scende sotto le note.

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
in coordinate di Frenet (s, d, psi, bet) con aderenza 8,5 m/s² (neve × 0,88, asfalto × 1,02–1,04, fuori strada × 0,58–0,86),
sterzo massimo 1/8,5 m⁻¹ (a velocità alta limitato a 1,5 volte l'aderenza), derapata e sottosterzo che fanno scivolare
verso l'esterno, aiutino allo sterzo che riallinea solo nei primi livelli. Le collisioni invece sono nel piano del mondo.

**Traiettoria ideale** (`g.line`, scostamento dal centro per ogni metro): curvatura minima, cioè il d(s) che rende minima
∑ (k + d″)² con |d| ≤ 3,2 m. Nodi ogni 4 m, equazioni normali pentadiagonali risolte con una fattorizzazione a banda
(LDLᵀ) e un **insieme attivo** per i vincoli (chi esce va sul bordo, chi "tira" verso il centro torna libero). Ne
escono da sé i punti di corda: fuori prima della curva, dentro sull'apice, fuori in uscita; nelle chicane dritto da un
apice all'altro. Il **profilo di velocità** `g.prof` usa la curvatura vera di quella traiettoria (cerchio per tre punti
a ±5 m, il peggiore nei ±4 m): √(aderenza × (1 + 1,5 × inclinazione) / k), poi frenate a 8 m/s² all'indietro.

## Kart a forma di frutto
Tutti costruiti con le misure del rettangolo di collisione **`CAR_L × CAR_W` = 3,2 × 1,8 m** (ruote, paraurti, scocca e
contorni compresi): telaio comune (pianale, paraurti, quattro ruote tonde coi mozzi, faretti davanti, fanalini dietro,
volantino) e scocca a forma di frutto, coi token `--ry-straw*`, `--ry-peach*`, `--ry-mand*`, `--ry-melon*`, `--ry-kleaf*`.
- **Fragola** (Hari): ellissoide con la punta davanti, semini gialli (anche dietro, che si vedono dalla camera), corona di
  foglie come spoiler.
- **Pesca** (Coniglietta): tonda con la piega e la guancia rosata, una foglia grande e il picciolo.
- **Mandarino** (Volpe): schiacciato coi pori della buccia, due foglioline.
- **Fetta d'anguria** (Panda): mezzo cilindro con la buccia a strisce, la polpa rossa coi semini neri sui due lati e un
  ricciolo con la foglia.
- Animazioni: **sospensioni** (rimbalzo, più forte fuori strada), inclinazione in curva, beccheggio in frenata, **foglia che
  sventola** più forte in velocità, pilota che si inclina verso l'interno e gira la testa sulla buccia; a fine gara chi è
  sul podio **festeggia** (Hari salta e si dondola). **Ombra** a disco sotto ogni kart (resta a terra nei salti),
  **faretti e fanalini** che brillano al buio (sprite additivi), molla e bolla dei power-up.
- Pezzi: scocca (corpo + contorno, 2 draw call), foglia (1, senza contorno), pilota di Hari a parte (2, per inclinarsi e
  festeggiare); i piloti degli avversari sono fusi con la loro scocca. **LOD**: gli avversari oltre 32 m sono una forma
  sola senza contorno (1 draw call). Ombre: un `InstancedMesh` per tutti.

## Collisioni (nel piano del mondo)
**Causa delle compenetrazioni della versione 2**: le collisioni si risolvevano nelle coordinate di Frenet (s, d) come se
fossero un piano, ma in curva un metro lungo s alla distanza d dal centro vale (1 − k·d) metri veri: all'interno di un
tornante due auto "staccate" in (s, d) si sovrapponevano nel mondo (fino a 24 cm disegnati, 612 fotogrammi oltre 5 cm in
24 gare del bot); in più il cofano della visuale pilota seguiva una direzione ammorbidita e nel bosco i cespugli del bordo
avevano dei buchi (muro invisibile).
- Ogni kart è un **rettangolo orientato nel mondo**: centro `world(s, d)`, direzione `th + psi` — la stessa **`pose(g, car)`**
  con cui la grafica piazza i kart (niente interpolazione: si disegna lo stato risolto).
- **Sotto-passi**: ogni passo fisso (1/60 s) si divide in `SUB = 2` sotto-passi di movimento e collisioni quando due kart
  sono vicini o qualcuno è fuori dalla carreggiata (altrimenti uno solo).
- **Auto–auto**: SAT sui 4 assi nel mondo; separazione **completa** (+2 mm) lungo l'asse di minima compenetrazione,
  divisa a metà (chi ha lo scudo-bolla non si sposta e la spinta va tutta all'altro); impulso sulla velocità relativa
  lungo la normale con poco rimbalzo (e = 0,25) e attrito (μ = 0,3). Spostamenti e velocità tornano in (s, d) con la
  base locale della pista (Δs = Δ·t / (1 − k·d), Δd = Δ·n). **Risoluzione iterativa**: fino a 10 giri per sotto-passo
  finché nessuno si tocca più, rimettendo dentro ai muri e fuori dagli ostacoli chi è stato spinto. Pose calcolate solo
  per le coppie vicine. Chi ha finito la gara da più di 15 m, vola sulla molla, è nella nuvoletta o appena posato non urta.
- **Muri**: ingombro laterale del rettangolo `HL·|sin ψ| + HW·cos ψ`, velocità d'urto con la pendenza del muro (imbuti).
- **Ostacoli** (alberi, rocce, ceppi, cespugli, pini, cumuli, pupazzi, vasi): cerchi nel mondo (`x, y` precalcolati),
  punto del rettangolo più vicino al centro, stessa risoluzione con impulso e attrito; si controllano solo se un angolo del
  kart può arrivarci (|d| + HL + HW oltre 7,6 m per la fascia, oltre 4,5 m per quelli "non tagliare").
- **Grafica coerente**: kart costruiti con `P.CAR_L`/`P.CAR_W` e piazzati con `P.pose`; ostacoli disegnati col loro raggio
  (`pr.r`, `rk.r`; tronchi grossi quanto il cerchio, chiome sopra i 2,3 m così il kart che sbatte non le attraversa);
  transenne, staccionata, muretto, ringhiere, pareti delle gallerie e guardrail a imbuto dove la logica ferma il
  rettangolo (`P.edgeAt`, `P.sideAt`, `P.RAIL`, `P.TUBE`, `P.FUN`).

## Avversari
- Seguono la **traiettoria ideale** guardando 5 m + 0,3 s avanti (ognuno con una piccola preferenza di corsia), con
  velocità = profilo (il minimo tra qui e un po' avanti) × **bravura**, al massimo `aiTop` × velocità massima sui
  rettilinei (+ ghiande), e **frenano prima delle curve** (il profilo contiene già le frenate). Sterzano gradualmente
  (il muso gira al massimo di 2,5 rad/s). Non vanno mai oltre 6,7 m dal centro (gli ostacoli della fascia cominciano a 7,8).
- **Più forti dal livello 3** (un gradino di +0,03 sulla bravura e +0,02 sui rettilinei) e via via fino al livello 12–13.
- **Rubber band moderato** (`rb`): chi è più di 12 m dietro a Hari va fino a +3% (livello 1) … +6% (dal 11) più forte, a
  pieno effetto 70 m dietro; chi è davanti **non rallenta mai**.
- **Sorpassi**: se chi è davanti entro 14 m + 0,45 s sta sulla loro linea ed è più lento, si spostano di `CAR_W + 0,8` m dal
  lato con spazio e tengono la scelta per 1,4 s; se non c'è spazio restano in scia senza tamponare. Affiancati si allargano
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
curva più stretta, frequenza di curve e di curve strette, bravura e velocità sui rettilinei degli avversari, rubber band,
uso dei power-up, meno errori e meno aiuto allo sterzo. Le ambientazioni modulano solo il "carattere" (più chicane in
città, più tornanti sulla neve, aderenza diversa, muri veri in città e al mare, ostacoli nel bosco e sulla neve).
Aderenza di base `GRIP` = 8,5 m/s² (prima 9,5: con l'acceleratore manuale le curve 2–3 vanno davvero preparate).

| | L1 | L3 | L6 | L10 | L14+ |
|---|---|---|---|---|---|
| Lunghezza | 1300 m | 1840 m | 2650 m | 3730 m | 4300 m |
| Curva più stretta | gravità 3 | 2 | 1 (tornanti) | 1 | 1 |
| Curve strette (quota) | 0 | 10% | 20% | 28% | 34% |
| Velocità massima | 81 km/h | 85 km/h | 90 km/h | 97 km/h | 104–106 km/h |
| Avversari (bravura) | .70/.77/.83 | .76/.83/.89 | .805/.875/.935 | .865/.935/.975 | .91/.945/.975 |
| Velocità sui rettilinei | 95% | 98,2% | 100% | 101% | 101% |
| Rubber band | 3% | 3,6% | 4,5% | 5,7% | 6% |
| Power-up dispettosi IA | 30% | 48% | 75% | 100% | 100% |
| Errori avversari / km | 1,3 | 1,14 | 0,9 | 0,58 | 0,3 |
| Aiuto allo sterzo | 0,45 | 0,29 | 0,05 | 0 | 0 |
| Acceleratore automatico predefinito | sì | no | no | no | no |
| Nebbia in più | — | — | 15% | 30% | 45% |

**Bot dei test** (4 semi per livello, `tests/_rally-bot.mjs`):
- **attento** (reazione ~0,22 s, aderenza stimata 8,4 m/s² × asfalto × curve paraboliche, frenate pianificate a 7,5 m/s²,
  traiettoria a inseguimento puro della mezzeria, power-up con regole semplici): **1° in tutte le gare dei livelli 1–6**,
  1°–2° nei 7–8 (media 1,3), 2°–3° nei 9–12 con una sola gara persa (11) — posizione media 2,8;
- **lento** (reazione 0,45 s, aderenza stimata 6,5, sterzo impreciso): vince i livelli 1–2, sul podio fino al 5, 4° dal 7;
- **senza freno** (acceleratore sempre giù): vince i livelli 1–4 (curve larghe) ma da lì è sempre fuori strada (5–36 s a
  gara), nel bosco e sulla neve finisce nella nuvoletta (3–12 volte a gara) e perde (4° in tutte le gare 11–12 con
  25–60 s di distacco); in città e al mare, dove i muri lo tengono dentro, arriva di solito 2°–3°, quasi sempre dietro al
  bot attento.

Livello 1: ~63 s per il bot attento (che vince con 10–13 s di vantaggio), 1–2 minuti per un bambino. `parTime` =
lunghezza / (62% della velocità massima). `progress` = metri fatti / lunghezza (1 alla vittoria).

## Grafica e prestazioni
- `MeshToonMaterial` con rampa a 3 toni e **contorni a guscio rovesciato** (copia ingrandita per asse, faccia interna,
  color inchiostro). Colori solo dai token `--ry-*` (anche di oggetti, kart e power-up); intensità delle luci nei token
  (`--ry-amb`, `--ry-sunI`, `--ry-sunH` = altezza del sole, bassa al tramonto).
- **Notte**: cielo stellato con la luna, fari di Hari (spot), faretti e fanalini di tutti i kart (sprite additivi),
  finestre accese (`MeshBasicMaterial`, non illuminate), lampadine e **aloni** (Points additivi) + **pozze di luce** sulla
  strada (quad additivi): niente luci puntiformi vere (costose).
- Scenario a **blocchi di 120 m** costruiti uno per fotogramma quando mancano 320 m e nascosti oltre la nebbia. Strada
  per blocco: una mesh con colori nei vertici (strisce, cordoli, bordi chiusi fino al terreno). Oggetti poco numerosi
  (anche gli ostacoli della fascia fuori strada e i guardrail a imbuto) **fusi in una geometria per blocco** (corpo +
  contorno = 2 draw call); oggetti numerosi con **InstancedMesh** (alberi, cespugli, cumuli, massi, fiori, finestre,
  lampadine, animaletti) con variazioni di scala, colore e rotazione. **LOD semplice**: oltre ~85 m (72 m da dietro) alberi
  e cespugli usano una forma sola senza contorno; i kart avversari oltre 32 m pure. Animaletti, pubblico, barche e faro si
  animano solo nei blocchi vicini. Oggetti dei power-up: InstancedMesh globali (scatole, nastri, ghiande, bucce, pozze,
  nuvolette, anche quella che riporta in pista).
- **Budget** (Chromium headless, `renderer.info`, stessa gara col `Math.random` fissato, 14 campioni lungo i primi ~60 s,
  livelli 1, 2, 3, 5, 6, 8; prima → dopo, mediane): a 360×760 **draw call 42–65 → 47–74** (+0…+12, in media +6),
  **triangoli 99–159k → 106–172k** (in media +3%); a 800×380 **41–70 → 46–74** draw call (in media +3), **96–159k →
  99–168k** triangoli (+1%). Punte sui lunghi rettilinei verso una galleria sulla neve: 112 draw call e 249k triangoli (da
  dietro si vede più lontano). Costruzione di un blocco 2–47 ms (prima 2–36). Pixel ratio ≤ 1,5, cala da solo fino a 0,6
  se i fotogrammi superano ~26 ms e risale se c'è margine. Contesto WebGL liberato all'uscita (anche da partita in pausa).
- Logica: un minuto di gara con 4 kart, power-up e sotto-passi 30–100 ms in Node (a regime 0,01–0,06 ms a fotogramma).
- Senza WebGL compare un messaggio (`ry_nogl`).

## A due giocatori
"Gioca insieme" (pulsante in alto durante il conto alla rovescia, e nel menu di pausa) apre il veil `.ry-mpv` con
**Due telefoni** (rete locale, modulo `HH.mp`, spento se il modulo manca) e **Schermo diviso** (spento sui dispositivi
non capaci). Il secondo giocatore sceglie il personaggio: **Micia** sul nuovo **kart-mela** (5º kart, gialla con la
guancia rossa, picciolo e foglia; Micia lilla con le orecchie a punta, le strisce e la coda) oppure Coniglietta, Volpe o
Panda, che allora non corre come avversario. Token nuovi in `rally-mp.css`: `--ry-apple*`, `--ry-kitty*`, `--ry-p4`,
`--ry-mate` (contorno dell'altro giocatore negli indicatori).

**Regole.** 4 kart come in singolo: Hari (giocatore 1, fragola), il giocatore 2 e **2 avversari** con le due bravure
più morbide della curva (`c.ai[0]`, `c.ai[1]`). Due e non tre: stessa griglia 2×2 e stessi pesi dei power-up per
posizione, una vista in meno di kart vicini da disegnare sullo schermo diviso, istantanee più piccole, e una regola
chiara: **si vince insieme se uno dei due arriva primo** (con due avversari almeno uno dei due umani sarebbe sempre sul
podio). Fragoline per ciascuno secondo la propria posizione (1° = 3 … 4° = 0): `rate(s)` usa `s.me` (il giocatore di
quel telefono), sullo schermo diviso il migliore dei due. Gli umani partono dietro. La gara finisce quando sono
arrivati entrambi o `LATE` = 40 s dopo il primo (chi manca è classificato col tempo stimato, `late`). Rimasti in uno
(link caduto) vale la regola del singolo (tra i primi 3).

**Logica** (`rally-logic.js`, singolo identico bit per bit: stessi stati ed eventi su 14 gare del bot prima/dopo).
`newLevel(level, rnd, { humans: 2, p2, seed })` → `s.hu = [0, 1]` (umani), `s.who` (personaggi), `s.ps` (posizioni
degli umani), `car.hm = 1`; senza opzioni nessun campo nuovo. `step(s, dt, [inP1, inP2])` (input null = fermo, niente
acceleratore automatico) passa per `tickMulti`: fisica del giocatore per ogni umano, IA per gli altri, power-up,
note, checkpoint e sorpassi per ciascuno (eventi con `by`), traguardo. `toAI(s, id)` passa un umano all'IA (bravura
`c.ai[1]`, nuvoletta in corso conclusa). `predict(s, id, dt, input)`: solo la fisica del proprio kart (ospite).
`posOf`, `humans`, `upcoming(s, n, id)`. Nel singolo `!car.id` = "è Hari" è diventato `hum(s, car)`.

**Rete** (`rally-net.js`, puro, testabile in Node; programma contro il contratto `HH.mp`). Sessione a 60 Hz,
un'istantanea ogni 3 passi (20 al secondo).
- **Host** = giocatore 1: `step(dt, [input host, input ospite])` fa correre la gara intera; `snapshot()` = istantanea
  compatta (`encode`): per kart un array di 26 numeri arrotondati (posizione, deriva, velocità, salto, effetti, power-up,
  ghiande, arrivo…), bucce/pozze, nuvolette, scatole in ricarica, classifica; le ghiande prese (`a`) solo quando
  cambiano o ogni 15 invii. **~400 B** (mediana), massimo osservato ~500 B, caso peggiore costruito (10 bucce, 8
  nuvolette, tutti i campi pieni) < 1,5 KB; col modulo vero, a delta, `maxBytes` < 1,1 KB.
- **Ospite** = giocatore 2: stessa gara dallo stesso seme (si manda solo `{ level, seed, p2 }`), `apply(snap, alpha,
  prev)` interpola gli altri kart (niente interpolazione oltre 12 m: nuvoletta), `predict` muove il proprio kart con la
  fisica locale, e una **correzione morbida** (k = 1 − e^(−6·dt)) lo porta verso lo stato dell'host più recente
  (evento `snapshot` del modulo) portato avanti di mezzo giro di rete; scarti > 7 m o > 2,6 m di lato, nuvoletta e
  semaforo: si copia. Power-up, colpi, nuvoletta e arrivo del proprio kart sono dell'host.
- **Input** sul filo `{ x, g, b, u }`: `u` è il **contatore** del tasto power-up (non si perde coi pacchetti persi).
- **Eventi affidabili** (`session.event`, campo `ry`): `hello` (kart scelto), `start`, `pause`, `resume`, `ev` (eventi di
  gioco dell'ospite e dei kart, semaforo), `fin` (classifica, posizioni, vittoria), `quit`. La pausa di uno mette in pausa
  l'altro; la ripresa ha il conto alla rovescia dell'host.
- **Link caduto** o `quit`: l'host passa il kart dell'ospite all'IA e continua (messaggio `ry_mp_left`); l'ospite torna
  alla sua gara in singolo (`ry_mp_lost`). Il link resta paziente all'avvio di ogni gara (`link.timeout` 60 s dal saluto
  al semaforo verde, poi 15 s): costruire la pista 3D e compilare gli shader può bloccare il telefono qualche secondo
  (senza GPU, in Chromium headless, anche 17 s).
- Rivincita e livello successivo li decide l'host (nuovo seme); l'ospite aspetta (`ry_mp_host`). La vittoria apre la
  finestra dell'app su entrambi i telefoni (fragoline e livello di ciascuno).

**Schermo diviso.** Due viste nello stesso canvas (`setViewport`/`setScissor`): in orizzontale affiancate, in
verticale una sopra l'altra (giocatore 1 a sinistra / in alto). Ogni vista (`views[i]`) ha la sua camera a molla, il
suo terreno (griglia che segue la camera), i suoi indicatori `.ry-v[data-v]` e i suoi comandi nella propria metà;
`inView(i, fn)` scambia le variabili della vista. Tastiera: giocatore 1 **frecce + Invio**, giocatore 2 **W A S D +
spazio/E**; niente sensori (sempre al tocco) né visuale pilota. Prestazioni: pixel ratio ≤ 1 (poi cala da solo fino a 0,6
se i fotogrammi sono lenti), nebbia −15%, LOD dello scenario a 70% della distanza, kart lontani da 24 m, un solo blocco
di scenario costruito per fotogramma, particelle e oggetti dei power-up aggiornati una volta. **Solo dispositivi
capaci**: ≥ 4 core, ≥ 3 GB (`deviceMemory`), schermo ≥ 640 × 320 (due scene 3D raddoppiano draw call e triangoli; sui
telefoni piccoli o lenti la gara scenderebbe sotto i 30 fps).

| Chromium headless, 1024 × 768, mediana di 7 punti della gara (massimo) | singolo | schermo diviso (2 viste) |
|---|---|---|
| Livello 2: draw call / triangoli | 47 (56) / 110k (128k) | 101 (122) / 203k (264k) |
| Livello 5 | 70 (118) / 173k (248k) | 148 (168) / 365k (408k) |
| Livello 8 | 71 (72) / 164k (184k) | 144 (164) / 318k (360k) |
| 800 × 380, livello 5 | 62 (123) / 161k (269k) | 155 (164) / 278k (325k) |

Circa il doppio del singolo (una vista per giocatore costa poco meno di una vista singola), con metà dei pixel per vista
a pixel ratio ≤ 1. Il tempo del disegno lato JavaScript passa da ~0,6 a ~1 ms per fotogramma.

**Salvataggio.** La partita a due non si salva: `snapshot()` restituisce lo stato a due con dentro `solo` (la gara in
singolo messa da parte, in pausa) e `mp`; riaprendo l'app si riprende `solo` (o una gara nuova). "Da solo" (menu di
pausa o fine gara) torna alla gara in singolo.

**File e caricamento.** `src/games/rally-net.js`, `src/games/rally-mp.css` e i file del modulo `src/net/sonic.js`,
`qr.js`, `mp.js`, `mp-ui.js`, `mp.css` tra i `files` del rally nel catalogo (costante `NET`, nell'ordine del
contratto; il build inline li include una volta sola, anche se li usa pure Hari Snack Street).

**Prove.** `tests/rally-mp.test.mjs`: logica a 2 umani deterministica (anche da JSON a metà gara), bot come P2 (10 livelli
× 3 combinazioni, vittoria di squadra in ≥ 50% e P2 primo ≥ 3 volte), regola dei 40 s, nessuna compenetrazione con due
umani (oracolo nel mondo indipendente, 20 gare), host e ospite con lo stub `tests/_mp-stub.js` (orologio virtuale,
latenza 25–110 ms, jitter 5–40 ms, perdite 0–20%: kart dell'ospite in media < 1,2 m dall'host, avversari < 0,35 m dalla
posa dell'host di 60–420 ms prima, classifica identica), istantanee < 1 KB, link caduto, tempi (un minuto a due < 150 ms
a regime) e la stessa gara col **modulo vero** (`src/net/mp.js`, loopback in tempo reale). Prova reale a due pagine:
`node tools/rally-e2e.mjs [--port 5197] [--shots DIR] [--w 800 --h 400]` (abbinamento col suono col microfono finto come
`tools/street-e2e.mjs`, scelta del kart, input dell'ospite, viste coerenti, pausa/ripresa, traguardo, vittoria o
rivincita, uscita dell'ospite). QA: `el._rally.split(p2)`, `solo()`, `menu()`, `mp()`, `netCtl()`, `views()`, `auto2(on)`
(autopilota attraverso l'input), `info()` (draw call e triangoli di tutte le viste), `forceSplit`, `lastDrop`.

## Salvataggio
`snapshot` = stato JSON (< 4,5 KB) con `v: 3`: kart (con deriva `bet`, derapata `dr`, mini-spinta `mini`, nuvoletta `res`,
fantasma `gh`, power-up, ghiande, timer degli effetti, spinta laterale), bucce/pozze (`hz`), nuvolette (`cl`), scatole in
ricarica (`bx`), ghiande prese (`ag`, bit in esadecimale), checkpoint (`chk`), nuvolette usate (`nres`), generatore
casuale (`rs`). La pista non si salva: si rigenera dal seme. I salvataggi v1 e v2 passano da `migrate()`: campi nuovi a
zero, bravura degli avversari aggiornata, kart rimessi dentro i bordi nuovi e separati se si toccano (i kart sono più
piccoli: 3,2 × 1,8 m invece di 4 × 1,96); la gara riprende da lì, in pausa.

## Controlli di qualità
`el._rally` (sul `#board`): `state()`, `geo()`, `three()` (renderer, blocchi, tempi di costruzione `buildT`, statistiche
per blocco `stat`, kart `karts`), `mode()`, `cam()`, `setCam(c)`, `auto()`, `setAuto(on)`, `ctl()` (sterzo, gas, freno,
ruoli dei tocchi), `input(dt)`, `sensor`, `ff(sec, {d, k, steer, gas, brake})` avanti veloce con un autopilota semplice
(eventi compresi), `give(item, who, use)` dà un power-up (0 = Hari) e lo usa, `use()`, `draw()`, `drawn()` (posa
effettivamente disegnata dei kart, dalle matrici delle mesh), `place()` (piazza i kart senza disegnare e restituisce
`drawn()`), `hold(on)` ferma il tempo reale (per le foto), `winDelay`. In Chromium headless WebGL funziona già via
SwiftShader con gli argomenti predefiniti (a 2–4 fps: per questo `ff`, `place` e `hold`). Con Playwright, a passi a dt
variabile (anche fotogrammi lenti da 50–100 ms) e scenari provocati (tamponamenti, affiancati in curva, IA contro IA,
molla, buccia, ponti e gallerie, dopo un salto) su 5 livelli: ~50 000 coppie controllate, nessuna sovrapposizione > 1 cm
tra le pose disegnate, posa disegnata = posa della logica.

## Test
`tests/rally.test.mjs`:
- pista percorribile (raggio ≥ 14 m con un oracolo a tre punti, nessun riavvicinamento < 30 m a forza bruta);
- note coerenti (verso, gravità dal raggio misurato, ogni curva con R < 130 m coperta, dossi/ponti/gallerie con la loro
  nota sui tratti dritti e separati, ostacoli dentro curve "non tagliare" e fuori dalla carreggiata, paraboliche 2–3
  segnalate), note lette 110 m prima e in ordine;
- ambientazioni a rotazione, tracciati vari, traiettoria ideale (come prima);
- **bot attento**: 1° nei livelli 1–2, sul podio nei 1–5, posizione media 6–8 tra 1,1 e 2,6 (al massimo 2 gare perse),
  9–12 più indietro ma sotto 3,7; avversari che usano i power-up. **Bot lento**: vince il livello 1 (5 semi, 55–120 s) e
  i livelli 2–3, nei 7–10 perde almeno metà delle gare ed è in media quasi un posto dietro. **Bot senza freno**: fuori
  strada in (quasi) tutte le gare 5–12, in media mezzo posto dietro al bot attento, primo al massimo 3 volte e mai dal
  livello 10, dal livello 8 perde almeno metà delle gare, almeno 6 nuvolette;
- avversari che finiscono sempre e restano dentro i bordi;
- **collisioni nel mondo**: 60 gare intere (3 bot, livelli 2–12, 2 semi) con un **oracolo indipendente** (pose ricavate
  dai punti della pista): nessuna coppia di kart sovrapposta oltre 1,5 cm, né oltre 5 mm con la **posa disegnata**
  (`R.pose`, quella della grafica), che coincide con l'oracolo; nessun angolo oltre un muro vero, oltre il limite senza
  muro solo finché arriva la nuvoletta; mai dentro un albero, una roccia o un cumulo; nessun salto (tranne la nuvoletta);
  il caso che sbagliava prima (due kart all'interno di un tornante "staccati" in (s, d)) ora è separato nel mondo;
- tamponamento con scambio di velocità proporzionale all'urto; spinta laterale limitata; lo scudo-bolla non si sposta e
  scoppia;
- **fisica**: gas, freno, retromarcia, rallentamento senza gas, acceleratore automatico; erba che rallenta; muro di
  striscio e deciso; guardrail a imbuto senza scalini; uscita nel bosco con nuvoletta (6 m indietro, 1,5 s); albero o
  roccia che ferma senza compenetrare; ostacoli "non tagliare"; mai al contrario;
- **aderenza**: entrando 1,2 volte troppo veloci in una curva 3 si va larghi e si derapa (e frenando prima si resta in
  strada); la derapata tenuta dà la mini-spinta; troppa deriva fa sbandare;
- hitbox coerenti con la grafica (la UI usa `P.CAR_L`, `P.CAR_W`, `P.pose(g, c)`, `rk.r`, `pr.r`, `P.edgeAt`, `P.sideAt`,
  `P.RAIL`, `P.TUBE`, `P.FUN`, i raggi dei power-up; `EYE_BACK = 2,9 − P.CAR_L / 2`; ostacoli tra `PROP_IN` e il limite);
- ogni power-up e il bilanciamento per posizione;
- determinismo e ripresa da JSON, **migrazione dei salvataggi v1 e v2** (anche kart sovrapposti e fuori dai bordi), conto
  alla rovescia, checkpoint, fragoline, difficoltà monotona, tempi (generazione < 10 ms, un minuto con 4 kart e power-up
  < 150 ms; in CI × 3).
