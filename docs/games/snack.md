# Hari Snack Rush

Gioco d'azione in tempo reale "a corridoio" (stile *mob control*), **senza violenza**: Hari corre in fondo a un
sentiero in pseudo-prospettiva e lancia merende agli animaletti affamati che arrivano a ondate. Quando sono sazi
sorridono (occhi `^^`, guance rosse, cuoricini) e tornano a casa saltellando. Alla fine arriva un **animalone goloso**
col bavaglino che lancia grandi merende da **rimandargli indietro**: quando la sua pancia è piena si addormenta felice
(Zzz) e il livello è vinto.

- id `snack`, brand **Hari Snack Rush** (non tradotto), regole `r11`, brano `snack`, tinta `--tint-snack`, token `--sr-*`.
- File: `src/games/snack-logic.js` (logica pura), `src/games/snack-ui.js` (canvas), `src/games/snack.css`,
  `tests/snack.test.mjs`, `tests/_snack-bot.mjs` (bot dei test).

## Regole
- Hari si muove **solo a destra/sinistra**: trascinamento relativo sul sentiero (il dito può stare ovunque, Hari segue lo
  spostamento senza essere coperto), oppure frecce/A-D. Spazio/P/Esc o il tasto ⏸ = pausa; "Annulla" = pausa/riprendi.
- Si parte dopo "Pronti?… Via!" **al primo trascinamento/freccia**; in pausa (anche automatica a pagina nascosta) e alla
  ripresa da salvataggio si riparte con "Pronti?" e di nuovo al primo input.
- Hari lancia merende in avanti **da solo**, una raffica ogni 0,3 s, a ventaglio. Ogni merenda è un boccone.
  La merenda cambia aspetto con quante ne partono per lancio: 1–2 semi di girasole · 3–4 mirtilli · 5–6 fragole ·
  7–8 ciliegie · 9–10 mele (solo grafica).
- **Animali** (affamati, di fronte, camminano verso Hari):

  | Animale | Larghezza | Fame base | Velocità | Note | Dal livello |
  |---|---|---|---|---|---|
  | pulcino | 0,10 | 1 | ×1 | | 1 |
  | coniglietto | 0,11 | 1 | ×1,15 | zig-zag | 2 |
  | maialino | 0,15 | 3 | ×0,9 | | 3 |
  | criceto | 0,10 | 2 | ×1,45 | velocissimo | 4 |
  | orsetto | 0,20 | 7 | ×0,78 | | 5 |
  | ranocchia | 0,12 | 2 | ×0,95 | a metà strada salta nell'altra metà del sentiero | 6 |
  | pecorella | 0,17 | 4 | ×0,95 | zig-zag lento | 7 |

  La fame di chi ne ha più di 1 cresce dell'8% a livello. Sopra c'è il **numerino dei bocconi che mancano** su un
  **pancino** che si riempie. A ogni boccone l'animale fa una faccina felice e un saltello.
- **Cuori** (3): se ne perde uno quando un animale affamato raggiunge Hari (merenda rubata), quando Hari inciampa in un
  ostacolo ("Bump!"/"Splash!"), quando un soffio dell'animalone gli cade sul naso ("Boop!") o quando una grande merenda
  lo raggiunge ("Bup!"). Hari fa "oh no!", divide la merenda con gli animali a meno di 5 m (che tornano a casa contenti)
  e segue 1,6 s di calma (Hari lampeggia): ciò che arriva in quel momento passa e basta.
- **Porte** (pannelli azzurri = buone, rosa = cattive) dividono il sentiero a metà: si passa da quella del proprio lato.
  Operazioni per lancio: `×2 ×3 +1 +2 +3` (buone), `−1 −2 ÷2` (cattive, ÷ arrotondato per eccesso). La prima porta è
  singola e buona. **Ogni porta ha sempre almeno un lato buono.** Il potere va da 1 a `min(10, 4 + livello)` e resta
  per tutto il livello (anche col boss); lo cambiano solo le porte.
  - **Porta presidiata** (dal livello 2): la corsia della porta migliore ha **pozzanghere** (dal 7 anche un **carretto di
    frutta**) poco prima della porta, che coprono tutta quella metà del sentiero; la porta peggiore ha la strada libera.
    Per prenderla bisogna aspettare di lato che l'ostacolo passi e **infilarsi** nella porta subito dopo
    (0,9 s al livello 2 → 0,6 s dal 14). Chi resta sulla corsia comoda perde potere e le ondate dopo lo travolgono.
  - **Porta regalo** (dal 5): il lato cattivo porta anche un **power-up** (pacchetto sopra il pannello): meno merende
    ma, per esempio, un cestino-scudo. Un'alternativa vera, non una trappola.
  - **Porta che si scambia** (dal 6): i due pannelli si scambiano di posto ogni 1–1,4 s (frecce che girano sopra) e si
    fermano a 6 m da Hari (≥ 0,9 s per reagire).
- **Ostacoli** (dal 3, dentro le ondate; niente di pericoloso, ci si inciampa e la merenda cade):
  pozzanghera (larga 0,48, ferma sul sentiero), rotolo di fieno (0,32, rotola 1,3 volte più veloce del sentiero),
  carretto di frutta (0,68, dal 7). Una fila (due dal 7) per ondata al massimo, **sempre con un varco**, mai insieme a
  una porta o a un'altra fila (≥ 1,4 s). Sulla linea di Hari una **fascia rosa lampeggia** dove arriveranno.
- **Power-up** (dal 4): bolle sul sentiero, si prendono passandoci sopra. Raffica (lanci ogni 0,15 s, 5 s), merenda
  doppia (ogni merenda vale 2 bocconi, 7 s), poi dall'8 calamita (le merende curvano verso il primo affamato, 7 s) e
  cestino-scudo (para il prossimo cuore perso). In alto a sinistra un bollino col tempo che resta.
- **Ondata di mangioni** (dall'8): una volta per livello un muro di soli maialini/orsetti/pecorelle.
- Formazioni: righe, a V, colonna, sparsi; dal 5 anche **muro** (righe piene) e **zig-zag** (righe alternate ai lati).
- **Novità**: la prima volta che compare qualcosa di nuovo, un cartello "Nuovo!" con disegno e frase breve
  (pozzanghere 2 · fieno 3 · power-up e criceti 4 · porte regalo 5 · porte che si scambiano e ranocchie 6 ·
  carretti 7 · mangioni e nuovi power-up 8 · panda 9 · ippopotamo 11; "lanciagli merende per rimandarla" ai livelli 1–4 e
  all'arrivo dei boss nuovi).

## Animalone goloso
Arriva quando il copione è finito e il sentiero è libero, si ferma a 12 m e va a destra/sinistra. Un'azione alla volta
(si aspetta che la precedente sia risolta): **soffio** (cose innocue che cadono ad arco su un cerchietto tratteggiato,
c'è sempre una via di fuga) oppure **grande merenda**: un proiettile con un numerino = merende che servono per
**rimandarlo indietro**. Colpito abbastanza, torna all'animalone e lo sfama di `1,5 × numerino + 3% della pancia`
("Rimandata!", +N); se arriva su Hari, "Bup!" (−1 cuore). Un "!" e una sfumatura rosa in basso avvisano quando sta per
prendere Hari. Le **fasi** cambiano col riempirsi della pancia (50% e 80%: "Ancora fame!", si muove più veloce,
attacchi più fitti). Turni per fase: grande merenda, soffio, soffio → grande merenda, soffio → grande merenda, soffio,
grande merenda.

| Animalone | Stagione | Soffia | Grande merenda: fase 1 · 2 · 3 | Livelli |
|---|---|---|---|---|
| scoiattolo | autunno | gusci di noce | ghianda mirata (schivabile) · 2 ghiande a muro · 3 ghiande a muro + 1 mirata | 1 5 10 |
| gattino | primavera | petali | gomitolo che rimbalza · 2 gomitoli · **gomitolo gigante** (tutto il sentiero) | 2 6 12 |
| gufo | estate | piume | muffin che ondeggia · muffin più veloce · 2 muffin a muro; chiama più amici | 3 7 13 |
| orso polare | inverno | fiocchi di neve | **palla di neve-gelato** gigante lenta · più veloce · due di fila | 4 8 15 |
| panda (nuovo) | primavera | foglie di bambù | **panino al vapore** gigante veloce · due di fila · tre di fila | 9 14 |
| ippopotamo (nuovo) | estate | bolle | **cocomero** gigante lentissimo e pesante · più veloce · cocomero + ghianda mirata | 11 16 |

"A muro" = coprono tutto il sentiero: l'unico modo è rimandarne una (quella davanti). Dal 17 i sei animaloni ruotano.
Dal livello 4 (gufo dal 3) chiama 3 amichetti affamati ogni tot secondi (mai durante una grande merenda).
Numerino = `max(2, round(k · ballK · gp · (volo − 0,45 s) / 0,3 s))`, con `gp` il potere garantito scegliendo sempre
la porta migliore, `k` il peso del colpo (tabella `VOLLEYS`), `ballK` 0,30 → 0,62.

## Fragoline e punteggio
3 senza cuori persi, 2 con uno, 1 oltre. "Mosse" (zampette) = porte attraversate.
`parTime` = fine del copione + 25 s + bocconi dell'animalone / 18.
`progress` = 0..0,7 lungo il copione delle ondate, poi 0,7..1 con la pancia dell'animalone (guida la musica a strati).

## Curva di difficoltà (`config(level)`, monotona)
Gradini (`tier`): 0 = livelli 1–2 · 1 = 3–5 · 2 = 6–9 · 3 = 10–14 · 4 = 15+.

| | L1 | L2 | L3 | L4 | L6 | L8 | L10 | L12 | L15 |
|---|---|---|---|---|---|---|---|---|---|
| Velocità (m/s) | 3,5 | 3,7 | 3,9 | 4,1 | 4,5 | 4,9 | 5,3 | 5,7 | 6,3 |
| Secondi tra ondate | 8 | 7,7 | 7,4 | 7,1 | 6,5 | 5,9 | 5,3 | 4,7 | 4,4 |
| Pressione (fame/ondata ÷ potere garantito) | 0,36 | 0,45 | 0,46 | 0,47 | 0,50 | 0,52 | 0,52 | 0,52 | 0,52 |
| Porte presidiate | – | 60% | 65% | 70% | 80% | 90% | 90% | 90% | 90% |
| Tempo per infilarsi (s) | – | 0,90 | 0,88 | 0,85 | 0,80 | 0,75 | 0,70 | 0,65 | 0,60 |
| Ondate con ostacoli | – | – | 45% | 50% | 60% | 70% | 80% | 85% | 85% |
| Porte che si scambiano | – | – | – | – | 25% | 31% | 37% | 43% | 50% |
| Grandi merende (`ballK`) | 0,30 | 0,32 | 0,35 | 0,37 | 0,42 | 0,47 | 0,52 | 0,56 | 0,62 |
| Animalone | scoiattolo | gattino | gufo | orso polare | gattino | orso polare | scoiattolo | gattino | orso polare |

Ondate `min(13, 5 + ⌈L/2⌉)`, porte `3 + ⌊L/3⌋`, bocconi dell'animalone `min(560, 200 + 22(L−1))`, soffi 1/2/3 oggetti
(dal 3 e dall'8) ogni `max(1,8; 2,6 − 0,07(L−1))` s. Il livello 1 resta un tutorial: niente porte cattive, ostacoli,
power-up; ghianda leggera.

### Bot (`tests/_snack-bot.mjs`, 8 semi per livello, reazione 0,3 s)
- **Attento** (porta migliore anche se presidiata, schiva e si infila, prende i power-up, rimanda le grandi merende o
  cerca un varco): vince **88/88** partite dei livelli 1–11 e **27/32** dei livelli 12–15 (sconfitte: 2 al 12, 1 al 13,
  1 al 14, 1 al 15; quasi sempre animali arrivati mentre schiva ostacoli). In media perde 0–0,3 cuori fino al 5 e
  1–1,6 cuori dal 9.
- **Pigro** (prende sempre la porta più comoda, cioè la corsia senza ostacoli o quella dove si trova, ignora i
  power-up; per il resto gioca uguale): vince il livello 1 (8/8), poi 3/8 al 2, 2/8 al 3, 4/8 al 4, 2/8 al 5 e quasi mai
  dal 6 (0/8 tranne 2/8 all'11). Arriva al boss con 1–3 merende per lancio e non riesce a rimandare le grandi merende.
- **A caso** (lato delle porte casuale): perde la maggior parte delle partite dal 5.
- Anche un bot lento (reazione 0,45 s) e impreciso vince i livelli 1–6 (al più una sconfitta dal 4).

Livello 1: circa 60 s per il bot (6 ondate, 3 porte buone, scoiattolo).

## Algoritmo
`newLevel(level, rnd)` genera un **copione** (JSON) di eventi a tempo: animali (`a`), porte (`g`, con `sw` se si
scambiano e `gift` se regalano un power-up), ostacoli (`o`, `guard` se presidiano una porta), power-up (`p`) e inizio
ondata (`w`, `big` per l'ondata di mangioni). Poi tutto è deterministico: passi fissi da 1/60 s (`step` accumula il
tempo reale, `tick` fa un passo) e generatore interno nello stato (`rs`, mulberry32).

- **Potere garantito** `gp`: il potere scegliendo sempre il lato migliore. Ogni ondata ha una fame totale
  `≈ pressione · gp · (secondi tra ondate / 0,3 s)`: chi rinuncia alle porte buone resta indietro. `gp` finale è nello
  stato e dimensiona le grandi merende.
- **Porte presidiate**: se i due lati danno potere diverso (anche "porta contro niente"), con probabilità `guard` si
  mettono 2 pozzanghere (o un carretto) sulla metà della porta migliore, `guardGap` secondi prima della porta (stessa
  velocità del sentiero, quindi la distanza resta fissa). Mai su porte che si scambiano.
- **Ostacoli nelle ondate**: istanti d'arrivo calcolati; una fila viene scartata se arriva a meno di 1,4–1,5 s da
  un'altra o a meno di 1,2 s da una porta; ogni fila lascia un varco (verificato con `HARI_R` = 0,12).
- **Power-up**: tra un'ondata e l'altra, a 0,4–0,75 dal centro, mai sopra un ostacolo che arriva insieme.
- **Collisioni**: una merenda va a ciò che incrocia per primo nel passo (animale o grande merenda più vicini); se
  nessuno, all'animalone. Ostacoli e grandi merende colpiscono Hari se `|x − px| < r + 0,12` quando arrivano.
- **Animalone**: un'azione alla volta (`atkT`), coda delle grandi merende ritardate (`q`), fase `ph` (0/1/2).
- **Salvataggi**: lo stato è `v: 2`. `migrate(s)` porta i salvataggi `v: 1` (senza ostacoli, power-up e grandi merende)
  alla struttura nuova; l'interfaccia la chiama prima di riprendere la partita.

## Grafica (stile anime anni '90/2000)
Un solo `<canvas>` (DPR ≤ 2) con proiezione `k = 9 / (9 + z)`: orizzonte al 30% dell'altezza, Hari all'88,5%.
Cielo, sole/luna con stelle, montagne con neve e colline dipinte una volta su un canvas fuori schermo; prato e sentiero a
fasce che scorrono, cordoli pastello e mezzeria; alberi, cespugli fioriti e lanterne (accese di notte) ai bordi.
**Stagioni** (classe `sr-spring|summer|autumn|winter` su `.sr-wrap`, tema chiaro e scuro): cambiano alberi, prato,
colline e ciò che cade dal cielo (petali, lucciole, foglie, neve), sempre leggero (≤ 22 particelle).
Personaggi, ostacoli, power-up, grandi merende e soffi sono SVG cel **cotti in bitmap** all'avvio sostituendo i
`var(--sr-*)` con i valori calcolati (si ricuociono se il tema cambia): nessun colore nel JS.
Il cartello "Nuovo!" è HTML (`.sr-new`) sopra il canvas. `prefers-reduced-motion` toglie le animazioni.

## Test (`tests/snack.test.mjs`)
Il bot e l'oracolo delle porte usano solo lo stato pubblico:
- l'attento vince i livelli 1–11 su 4 semi (≤ 1 cuore perso fino al 6), dal 12 al 15 al massimo 3 sconfitte su 16;
  nessun animale nutrito "sparisce" senza saziarsi;
- il pigro perde ≥ 70% delle partite dei livelli 4–12 (l'attento al massimo 2 su 27) e finisce sempre con meno potere;
  il livello 1 lo vince anche il pigro; chi sceglie le porte a caso perde spesso dal 5; un bot lento vince i livelli 1–6;
- porte presidiate (coprono la corsia migliore, l'altra è libera, ≥ 0,6 s per infilarsi), ostacoli con varco e mai
  insieme, inciampo solo sulla propria corsia, porte che si scambiano (mai sotto `SWAP_STOP`) e regalo, power-up;
- grandi merende: ogni raffica di ogni animalone e fase, livelli 1–20, si rimanda col potere atteso (bot che reagisce
  ogni 0,3 s, nessun "Bup!"); i "muri" coprono davvero tutto il sentiero; "Bup!" e bonus della merenda rimandata;
- fasi, cartelli delle novità (una volta sola, al livello giusto), migrazione dei salvataggi v1;
- determinismo (stessi input = stessa partita, ripresa da JSON a metà, passi di durata diversa), ventaglio, fame,
  merenda rubata e sconfitta, via di fuga dai soffi, curva monotona con ≥ 4 gradini, `newLevel` < 10 ms (< 1 ms).
`tools/selftest.mjs` (`npm run bench`) controlla 5 gradini (porte, varchi negli ostacoli, tempi).
