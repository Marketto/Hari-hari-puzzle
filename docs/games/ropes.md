# Hari Knots

Corde colorate intrecciate su lastre pastello: riaggancia i capi nei fori liberi finché tutte le corde volano via e le lastre cadono.
File: `src/games/ropes-logic.js` (logica pura, `HH.ropes`), `src/games/ropes-ui.js` (UI), `src/games/ropes.css` (stile, token `--rk-*`),
test: `tests/ropes.test.mjs`, blocco in `tools/selftest.mjs`.

## Regole (chiave `r10`)
- **Campo**: griglia di punti `cols × rows`. Le **lastre** sono rettangoli di punti `[x0, y0, x1, y1]`; indice più alto = più in alto.
  Possono sovrapporsi in parte. I **fori** sono alcuni punti della griglia, forati attraverso tutte le lastre che li coprono.
- **Corde**: collegano due fori; un foro tiene al massimo un capo. La **traccia logica** è il segmento chiuso tra i due fori
  (il disegno è una curva morbida con pochissima pendenza, ma le regole usano solo il segmento).
- **Incrocio** (geometria esatta su coordinate intere): due corde si incrociano se i segmenti chiusi hanno almeno un punto comune.
  Non hanno mai capi in comune (fori distinti), quindi i casi sono:
  - incrocio vero;
  - una corda che passa esattamente sopra il foro in cui è agganciata l'altra (**conta come incrocio**: ci passa sopra);
  - tratti collineari sovrapposti (**conta come incrocio**);
  - passare sopra un foro **vuoto** non conta nulla. Il generatore evita all'inizio le corde che passano sopra un foro.
- **Strati**: per ogni coppia che si incrocia si sa quale corda sta sopra. È una relazione a coppie e può essere ciclica
  (A sopra B, B sopra C, C sopra A), come con le corde vere.
- **Attorcigliate**: alcune coppie partono avvolte (si incrociano sempre). Restano attorcigliate finché si incrociano; appena una mossa le
  separa, lo scioglimento è definitivo.
- **Mossa**: un capo di una corda va in un foro **libero** (foro presente e vuoto); l'altro capo resta fermo.
  - con le corde che incrociava e incrocia ancora: l'ordine non cambia (chi la copriva continua a coprirla);
  - con le corde che incrocia ora per la prima volta: la corda spostata va **sopra** (il capo viene sollevato);
  - con le corde che non incrocia più: strato e attorcigliamento si sciolgono.
- **Sparizione a cascata**: dopo ogni mossa, ogni corda **non coperta** da nessun'altra e **non attorcigliata** sparisce (libera i fori);
  si ripete a turni finché succede qualcosa. All'inizio nessuna corda sparisce (garantito dal generatore).
- **Lastre**: una corda agganciata in un foro tiene **tutte** le lastre che contengono quel punto. Una lastra cade quando nessuna corda la tiene
  **e** nessuna lastra presente sopra di lei la sovrappone (quella sotto aspetta che cada quella sopra); cascata dall'alto, a turni.
  Un foro esiste finché almeno una lastra presente lo contiene: con la lastra spariscono i suoi fori (sono sempre vuoti, perché era libera).
- **Obiettivo**: far sparire tutte le corde → cadono tutte le lastre. Nessuna sconfitta: se lo stato diventa davvero irrisolvibile
  (A* esplora tutto senza soluzione, limite 3000 nodi) compare "All tangled up! Tap Undo." e Hari fa "oops". Nelle misure non è mai successo
  partendo da livelli generati, ma con poche mosse sbagliate è possibile (es. una lastra che cade portandosi via gli unici fori liberi).

## Comandi
| Gesto | Effetto |
|---|---|
| Trascina un nodino (o il fiocchetto) | il capo segue il dito, la corda si tende; i fori liberi si illuminano; vicino a un foro il capo ci scivola (calamita) |
| Rilascia su un foro libero | mossa; altrove il capo torna al suo foro |
| Tocca un nodino, poi un foro libero | stessa mossa senza trascinare (il capo resta sollevato finché scegli) |
| Tastiera | frecce = scegli nodino (o foro, se ne hai preso uno) · Invio/Spazio = prendi/aggancia · Esc = lascia |
| Annulla | torna allo stato prima della mossa; **la mossa resta contata** (come Boba Sort) |

## Curva di difficoltà (`config(level)`)
| Livelli | Griglia | Corde | Lastre | Fori liberi | Coppie attorcigliate | Minimo richiesto | Candidati |
|---|---|---|---|---|---|---|---|
| 1 | 4×4 | 3 | 1 | 3 | 1 | 1 | 1 |
| 2 | 4×4 | 3 | 1 | 2 | 1 | 1–2 | 3 |
| 3–4 | 5×5 | 4 | 2 | 2 | 2 | 2 | 4 |
| 5–7 | 5×5 | 5 | 2 | 2 | 2 | 2–3 | 5 |
| 8–11 | 5×5 | 6 | 2 | 2 | 2 | 2–3 | 6 |
| 12–15 | 5×6 | 7 | 3 | 2 | 3 | 3–4 | 6 |
| 16–20 | 5×6 | 8 | 3 | 2 | 3 | 3–4 | 6 |
| 21+ | 5×6 | 9 | 3 | 2 | 4 | 4–5 | 6 |

Tra i candidati validi si sceglie quello con la quota più bassa di "prime mosse giuste" (mosse iniziali che abbassano l'euristica):
meno mosse giuste = più bisogna leggere sopra/sotto prima di muovere.

Misure (40 semi, Node):

| Livello | Corde | Lastre | Incroci medi | Minimo medio | Prime mosse giuste | Nodi A* | ms medi | ms peggiore |
|---|---|---|---|---|---|---|---|---|
| 1 | 3 | 1 | 2.5 | 1.0 | 35% | 1 | 0.6 | 6 |
| 3 | 4 | 2 | 3.6 | 2.0 | 51% | 2 | 1.3 | 6 |
| 5 | 5 | 2 | 6.1 | 2.0 | 41% | 2 | 1.0 | 2 |
| 8 | 6 | 2 | 9.7 | 2.0 | 26% | 2 | 1.7 | 5 |
| 12 | 7 | 3 | 13.4 | 3.0 | 41% | 3 | 3.2 | 7 |
| 16 | 8 | 3 | 17.1 | 3.0 | 30% | 3 | 4.4 | 6 |
| 21 | 9 | 3 | 24.0 | 4.05 | 37% | 4 | 7.6 | 9 |

## Generatore
1. **Lastre** (`platesFor`): 1 lastra = tutto il campo; 2 lastre affiancate (o una sopra l'altra) con una colonna/riga in comune e un piccolo
   sfalsamento; 3 lastre = due bande (alto/basso) e una centrale sopra che le sovrappone entrambe.
2. **Fori** (`layout`): almeno 2 per lastra, poi a caso fino a `2K + F`. **Corde**: 2K fori a caso accoppiati scegliendo per ogni capo il
   partner con punteggio `0.55·lunghezza + 0.7·incroci già creati + rumore`; vietate corde più corte di 2 passi e corde che passano sopra un foro.
3. **Strati e attorcigliamenti** (`dress`): ogni coppia che si incrocia riceve uno strato a caso; si scelgono `T` coppie disgiunte da attorcigliare.
   **Riparazione**: finché esiste una corda scoperta e non attorcigliata, una coppia a caso in cui è coinvolta viene girata in modo che sia coperta.
   Si scartano le corde senza incroci e le riparazioni che non convergono.
4. **Stabilità**: all'inizio non sparisce nessuna corda e non cade nessuna lastra (`stableStart`).
5. **Euristica prima della ricerca**: `h0` è già un minimo garantito; si scarta subito se `h0` supera la fascia.
6. **A\*** (`solve`, limite 1500 nodi in generazione): minimo esatto e soluzione. Il livello salva `min`, `solution`, `nodes`, `opt`.
7. Fallback: il candidato più vicino alla fascia, poi un livello fisso a mano (`FALLBACK`, minimo 1, verificato nei test).

## Risolutore e prova del minimo
- Stato compatto: capi (`Int8Array`), maschere "copre" e "attorcigliata con" per corda, maschera delle lastre presenti; chiave stringa.
- **Euristica ammissibile e consistente**: le corde mai spostate mantengono tra loro incroci, strati e attorcigliamenti; per sparire tutte
  devono formare un insieme senza coppie attorcigliate e senza cicli di copertura (si "sbucciano" dall'alto). `h` = minimo numero di corde da
  togliere per ottenere un insieme così (sottoinsiemi in ordine di grandezza, tetto 4). Una mossa cambia solo le relazioni della corda spostata,
  quindi `h` scende al massimo di 1 per mossa (consistente → A* con insieme chiuso è ottimo). In pratica `h0` coincide quasi sempre con il minimo,
  per questo A* espande pochissimi nodi.
- Mosse equivalenti: tutti i fori che fanno sparire la corda spostata portano allo stesso stato e vengono fusi dalla chiave.

### Oracolo nei test (`tests/ropes.test.mjs`)
Indipendente dalla logica: simulatore riscritto da zero dalle regole (incroci con la **formula parametrica di Cramer** e casi paralleli/collineari
per proiezione, strati in una `Map` di coppie, attorcigliamenti in un `Set`, lastre in un array) e **BFS esaustiva** con chiavi JSON, senza euristica.
- geometria: casi a mano (X, T sopra un foro, collineari sovrapposte/disgiunte, parallele) e 20 000 casi casuali confrontati con l'oracolo;
- regole a mano: copertura, attorcigliamento che resta o si scioglie, corda sollevata sopra le nuove, cascata, mosse illegali, lastre sovrapposte
  (quella sotto cade al turno dopo), fori condivisi che tengono due lastre;
- livelli 1–24 (12/6/4 semi): validi, stabili, ogni corda coperta o attorcigliata, strati solo tra corde che si incrociano, la soluzione dichiarata
  libera tutto nell'oracolo;
- livelli 1–14: **minimo A\* = BFS dell'oracolo**; anche da stati intermedi dopo mosse casuali (e "irrisolvibile" solo se la BFS lo conferma);
- mosse casuali: logica e oracolo producono sempre lo stesso stato (capi, strati, attorcigliamenti, lastre, fori liberi);
- determinismo, salvataggio JSON (livello + stato + ripresa del risolutore, stati rotti scartati), fragoline, avanzamento, tempo < 10 ms.

## Disegno e fisica
- Lastre e fori in SVG (vassoio a pois, venature, linguetta con faccina che diventa felice e poi la lastra cade ruotando).
- Corde su canvas: particelle Verlet (8–22 per corda), vincoli di lunghezza (12 iterazioni), gravità leggera, smorzamento, lunghezza a riposo =
  distanza tra i capi + 0,6%; i capi inseguono il bersaglio (foro o dito) e la lunghezza si adatta con ritardo, così la corda si tende e si assesta.
  Una corda che sparisce si sfila dai fori con uno strattone, sale fluttuando e svanisce, con scintille; i turni della cascata sono distanziati.
- Ordine di disegno = relazione logica: ordinamento topologico; nei cicli la corda di sopra viene ridisegnata in un cerchietto attorno al punto
  d'incrocio reale delle due curve. Le coppie attorcigliate mostrano due giri della corda di sotto avvolti su quella di sopra. Durante il
  trascinamento l'ordine è un'anteprima calcolata con il dito come capo (stesse regole della mossa).
- Accessibilità colori: ogni corda ha un motivo diverso sul corpo (6 motivi) e un simbolo sul fiocchetto (10 simboli), più la faccina sul nodino.
- Prestazioni: rAF solo finché qualcosa si muove (si ferma dopo 20 fotogrammi fermi) e mai se il canvas non è nel DOM; ResizeObserver e
  MutationObserver (tema) si scollegano da soli. `prefers-reduced-motion`: corde subito a riposo, niente volo né cadute animate.

## Fragoline
`HH.rules.rateMoves(mosse, minimo)`: 3 col minimo esatto, 2 se le mosse in più sono al massimo il 70% (per difetto) di `extraMoves(minimo)`
(15% del minimo, da 2 a 6), 1 oltre. Es. minimo 3: 3 mosse → 3, 4 → 2, 5+ → 1. L'Annulla non restituisce la mossa.

## Avanzamento
`progress = 0,85 × corde sparite + 0,15 × lastre cadute` (massimo 0,99), 1 solo a livello risolto.

## Tutorial (`tu_ropes_1..3`)
1. La manina trascina un capo: la corda ruota attorno al nodino fermo fino al foro che brilla.
2. La corda di sopra vola via, poi quella che era sotto.
3. Coppia attorcigliata con i giri visibili; la lastra cade.
