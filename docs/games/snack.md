# Hari Snack Rush

Gioco d'azione in tempo reale "a corridoio" (stile *mob control*), **senza violenza**: Hari corre in fondo a un
sentiero in pseudo-prospettiva e lancia merende agli animaletti affamati che arrivano a ondate. Quando sono sazi
sorridono (occhi `^^`, guance rosse, cuoricini) e tornano a casa saltellando. Alla fine arriva un **animalone goloso**
col bavaglino: quando la sua pancia è piena si addormenta felice (Zzz) e il livello è vinto.

- id `snack`, brand **Hari Snack Rush** (non tradotto), regole `r11`, brano `snack`, tinta `--tint-snack`, token `--sr-*`.
- File: `src/games/snack-logic.js` (logica pura), `src/games/snack-ui.js` (canvas), `src/games/snack.css`, `tests/snack.test.mjs`.

## Regole
- Hari si muove **solo a destra/sinistra**: trascinamento relativo sul sentiero (il dito può stare ovunque, Hari segue lo
  spostamento senza essere coperto), oppure frecce/A-D. Spazio/P/Esc o il tasto ⏸ = pausa; "Annulla" = pausa/riprendi.
- Si parte dopo "Pronti?… Via!" **al primo trascinamento/freccia**; in pausa (anche automatica a pagina nascosta) e alla
  ripresa da salvataggio si riparte con "Pronti?" e di nuovo al primo input.
- Hari lancia merende in avanti **da solo**, una raffica ogni 0,3 s, a ventaglio. Ogni merenda è un boccone.
  La merenda cambia aspetto con quante ne partono per lancio: 1–2 semi di girasole · 3–4 mirtilli · 5–6 fragole ·
  7–8 ciliegie · 9–10 mele (solo grafica, il valore è sempre 1 boccone).
- **Animali** (affamati, di fronte, camminano verso Hari):

  | Animale | Larghezza | Fame base | Velocità | Note | Dal livello |
  |---|---|---|---|---|---|
  | pulcino | 0,10 | 1 | ×1 | | 1 |
  | coniglietto | 0,11 | 1 | ×1,15 | zig-zag | 2 |
  | maialino | 0,15 | 3 | ×0,9 | | 3 |
  | orsetto | 0,20 | 7 | ×0,78 | | 5 |
  | pecorella | 0,17 | 4 | ×0,95 | zig-zag lento | 7 |

  La fame dei grandi cresce del 6% a livello. Sopra chi ha fame > 1 c'è il **numerino dei bocconi che mancano** su un
  **pancino** (pillola) che si riempie. A ogni boccone l'animale fa una faccina felice e un saltello.
- **Merenda rubata**: se un animale ancora affamato raggiunge Hari gli ruba la merenda → **−1 cuore** (3 cuori, `lives: 3`).
  Hari fa una faccina "oh no!", e divide la merenda con gli animali a meno di 5 m (che tornano a casa contenti).
  Segue 1,6 s di calma (Hari lampeggia): chi arriva in quel momento passa e basta. Animali che arrivano insieme = un solo cuore.
- **Porte** (pannelli azzurri = buone, rosa = cattive) dividono il sentiero a metà (linea di mezzeria): si passa da quella
  del proprio lato. Operazioni sulle merende per lancio: `×2 ×3 +1 +2 +3` (buone), `−1 −2 ÷2` (cattive, arrotondato per eccesso).
  Spesso sono in **coppia**: scelta sinistra/destra. La prima porta di ogni livello è singola e buona.
- **Potere**: minimo 1, massimo `min(10, 4 + livello)` (5 al livello 1, 10 dal 6). **Resta per tutto il livello**
  (anche contro l'animalone) e non cala da solo: lo cambiano solo le porte. Una merenda rubata non lo riduce.
- **Animalone goloso** (a rotazione): scoiattolo → orso polare → gufo → gattino, tutti con coroncina e bavaglino col cuore.
  Arriva quando il copione è finito e il sentiero è libero, si ferma a 12 m e si sposta a destra/sinistra
  (rimbalza ai lati e ogni tanto cambia idea). Soffia cose **innocue e buffe** che arrivano ad arco: gusci di noce
  (scoiattolo), bolle (orso polare), foglie (gufo), petali (gattino). Dove cadranno c'è un **cerchietto tratteggiato**
  che pulsa sul sentiero. Se finiscono sul naso di Hari ("Boop!") la merenda cade → −1 cuore.
  Dal livello 6 chiama 3 amichetti affamati (piccoli) ogni 5–9 s. La sua barra è la **pancia che si riempie**
  (non energia che cala); piena = si addormenta = `ctx.win()`.

## Fragoline e punteggio
3 senza merende rubate, 2 con una, 1 oltre. "Mosse" (zampette) = porte attraversate.
`parTime` = fine del copione + 15 s + bocconi dell'animalone / 18.
`progress` = 0..0,7 lungo il copione delle ondate, poi 0,7..1 con la pancia dell'animalone (guida la musica a strati).

## Curva di difficoltà (`config(level)`, monotona)
Gradini (`tier`): 0 = livelli 1–2 · 1 = 3–5 · 2 = 6–9 · 3 = 10–14 · 4 = 15+.

| | L1 | L3 | L6 | L10 | L15+ |
|---|---|---|---|---|---|
| Ondate | 5 | 6 | 7 | 9 | 12 (max) |
| Velocità (m/s) | 2,8 | 3,12 | 3,6 | 4,24 | 5,04 (max 5,2) |
| Secondi tra ondate | 9,6 | 9,0 | 8,1 | 6,9 | 5,4 (min 5,2) |
| Pressione (fame/ondata ÷ potere garantito) | 0,11 | 0,14 | 0,19 | 0,25 | 0,32 (max) |
| Animali per ondata (max) | 4 | 6 | 9 | 13 | 16 |
| Porte | 3 | 4 | 5 | 6 | 8 |
| Porte cattive | no | no | −1 −2 | −1 −2 | −1 −2 ÷2 (dal L8) |
| Merende per lancio (max) | 5 | 7 | 10 | 10 | 10 |
| Animalone | scoiattolo | gufo | orso polare | orso polare | gufo (rotazione di 4) |
| Bocconi animalone | 150 | 190 | 250 | 330 | 430 (max 450) |
| Soffi | 1 ogni 2,9 s | 1 ogni 2,76 s | 2 ogni 2,55 s | 3 ogni 2,27 s | 3 ogni 2,0 s |
| Amici chiamati | no | no | ogni 9 s | ogni 8 s | ogni 6,75 s |

Livello 1: circa 55 s per il bot, 60–90 s per un bambino (5 ondate da pulcini, 3 porte buone, scoiattolo).

## Algoritmo
`newLevel(level, rnd)` genera un **copione** (JSON) di eventi a tempo: animali (`a`, tipo, x, distanza oltre l'orizzonte),
porte (`g`, operazione a sinistra/destra) e inizio ondata (`w`). Poi tutto è deterministico: passi fissi da 1/60 s
(`step` accumula il tempo reale, `tick` fa un passo) e generatore interno nello stato (`rs`, mulberry32).

- **Porte**: a metà tra un'ondata e l'altra, distribuite su tutto il livello. In coppia con probabilità
  `min(0,85; 0,45 + 0,03·L)`; la seconda è cattiva con probabilità `min(0,75; 0,3 + 0,04·L)` (dal livello 4),
  altrimenti un'altra buona diversa. **Ogni porta ha sempre almeno un lato buono.**
- **Potere garantito** `gp`: il potere che si ha scegliendo sempre il lato migliore. Ogni ondata ha una fame totale
  `≈ pressione · gp · (secondi tra ondate / 0,3 s)`: le ondate crescono solo quanto le porte permettono.
  Gli animali sono scelti tra i tipi sbloccati (i grandi più spesso ai gradini alti) senza superare il budget,
  i più affamati in fondo.
- **Formazioni**: righe da 2–5 (meno se grossi, mai sovrapposti), a V, in colonna o sparse.
- **Collisioni**: una merenda va al primo animale (il più vicino) che incrocia nel passo; se nessuno, all'animalone.
- **Soffi**: mirano a dove sta Hari quando soffia; più oggetti insieme sono affiancati a 0,42 m. Un soffio alla volta in
  aria (intervallo > tempo di volo ≈ 1,3 s) e **c'è sempre un punto del sentiero libero** (verificato nei test per ogni
  mira e livello 1–30).

## Grafica (stile anime anni '90/2000)
Un solo `<canvas>` (DPR ≤ 2) con proiezione `k = 9 / (9 + z)`: orizzonte al 30% dell'altezza, Hari all'88,5%.
Cielo, sole/luna con stelle, montagne con neve e colline sono dipinti una volta su un canvas fuori schermo; il prato e il
sentiero a fasce scorrono, con cordoli pastello e linea di mezzeria; sakura, cespugli fioriti e lanterne (accese di notte)
ai bordi; foschia all'orizzonte; nuvole che passano.
Personaggi, merende e soffi sono SVG cel (contorni sottili, un'ombra netta, riflessi, occhioni con due luci) **cotti in
bitmap** all'avvio sostituendo i `var(--sr-*)` con i valori calcolati: tema chiaro/scuro senza colori nel JS
(si ricuociono se il tema cambia). Tutto è ordinato per profondità.
Animazioni: passo a due fotogrammi, saltelli, inclinazione di Hari quando sterza, rinculo a ogni lancio, faccina felice a
ogni boccone, ritorno a casa a saltelli (1,4 s), riflesso che scorre sulle porte, pancia/numerino, cuoricini e stelline,
testi che rimbalzano, animalone che mastica/soffia (guance gonfie)/dorme. `prefers-reduced-motion` toglie le animazioni.

## Test (`tests/snack.test.mjs`)
Bot indipendente (guarda lo stato ogni 0,3 s, sceglie la porta migliore con un oracolo delle operazioni scritto nel test,
insegue l'animale più vicino, schiva i soffi) con un po' di imprecisione:
- vince i livelli 1–15 su 4 semi con al più una merenda rubata; nessun animale nutrito "sparisce" senza saziarsi;
- livello 1 tra 40 e 75 s, senza porte cattive; un bot più lento (0,45 s) e impreciso vince i livelli 1–6;
- determinismo (stessi input = stessa partita, ripresa da JSON a metà, passi di durata diversa);
- porte (operazioni, massimo per livello, sempre un lato buono, negative dal 4, ÷2 dall'8, lato sinistro/destro);
- ventaglio e merende; fame e sazietà; merenda rubata, grazia, condivisione e sconfitta; animalone che si riempie e rotazione;
- via di fuga dai soffi; difficoltà monotona con ≥ 4 gradini; `newLevel` < 10 ms (in pratica < 0,3 ms).
`tools/selftest.mjs` (`npm run bench`) controlla 5 gradini.
