# Hari Knots

"Shanghai/Mikado" con le corde su lastre pastello: sposti solo le corde che non hanno niente sopra, finché tutte volano via e le lastre cadono.
File: `src/games/ropes-logic.js` (logica pura, `HH.ropes`), `src/games/ropes-ui.js` (UI), `src/games/ropes.css` (stile, token `--rk-*`),
test: `tests/ropes.test.mjs`, blocco in `tools/selftest.mjs`.

## Storia delle regole
- Modello 1 (v0.9.0): la corda spostata andava sopra o sotto da sola. Troppo semplice.
- Modello 2 (v0.9.1): il capo passava in aria e si avvolgeva attorno alle corde che lo coprivano. Ancora poco sfidante.
- **Modello 3** (attuale, `rule: 3`, snapshot `v: 3`): Mikado. I salvataggi dei modelli precedenti vengono scartati.

## Regole (chiave `r10c`)
- **Campo**: griglia di punti; **lastre** = rettangoli di punti (indice più alto = più in alto, anche sovrapposte); **fori** = punti
  forati attraverso tutte le lastre che li coprono. **Corde** tra due fori (un capo per foro); traccia logica = segmento chiuso.
- **Incrocio** (geometria esatta su coordinate intere): segmenti chiusi con almeno un punto in comune. Conta anche una corda che passa
  esattamente sopra il foro di un capo altrui, e un tratto collineare sovrapposto. Passare sopra un foro vuoto non conta.
- **Strati**: ogni coppia che si incrocia ha esattamente un "sopra". Il modello non crea mai cicli (la corda spostata va in cima).
- **Libera** = nessuna corda le sta sopra. Solo le corde libere si possono prendere; le altre sono **bloccate**.
- **Mossa**: un capo di una corda libera va in un foro **libero**; il capo passa in aria e la corda si posa **sopra a tutte** le corde che
  incrocia nella nuova posizione (le relazioni con quelle che non incrocia più spariscono).
- **Sparizione**: una corda vola via quando **non incrocia nessun'altra** (niente sopra e niente sotto), anche se è una corda di sotto.
  Togliere una corda senza incroci non toglie incroci a nessuno, quindi basta un turno; le corde che si liberano insieme volano in sequenza.
  All'inizio ogni corda ne incrocia almeno un'altra.
- **Lastre**: cadono quando nessuna corda è agganciata ai loro fori e nessuna lastra sopra le sovrappone; i loro fori spariscono.
- **Mosse contate** (come Boba Sort): mosse concesse = minimo + `HH.rules.extraMoves(minimo)` (15%, da 2 a 6). Finite senza aver liberato
  tutto → `ctx.outOfMoves('moves')` (finestra "Oh no! You're out of moves" con Riprova). Annulla rimette le corde ma la mossa resta spesa.
  Perché il limite: nel modello 3 i veri vicoli cieci sono rarissimi (la corda appena spostata è sempre libera, e i fori liberi finiscono
  solo se una lastra cade portandoseli via), quindi senza limite non si perderebbe mai. Il limite rende la pianificazione la vera sfida;
  è giusto perché il minimo è esatto e il margine è quello di Boba Sort.
- **Vicolo cieco**: dopo ogni mossa il risolutore (1500 nodi) controlla lo stato. Se è irrisolvibile, o se il minimo rimasto supera le mosse
  rimaste, compare "All tangled up! Tap Undo." (`rk_stuck`) e Hari fa "oops".

## Comandi
| Gesto | Effetto |
|---|---|
| Trascina il nodino o il fiocchetto di una corda libera | il capo sale in aria (corda sopra tutto, ombra lunga) e segue il dito; i fori liberi si illuminano; calamita vicino ai fori |
| Rilascia su un foro libero | mossa; altrove il capo torna al suo foro |
| Tocca un nodino, poi un foro | stessa mossa senza trascinare |
| Tocca una corda bloccata | trema, suona, il lucchetto e le corde che la coprono si illuminano di rosso, compare "This rope is locked…" |
| Tastiera | frecce = nodino/foro · Invio/Spazio = prendi/aggancia · Esc = lascia |

## Leggibilità
- Ordine di disegno topologico (da sotto a sopra).
- A ogni incrocio la corda di sotto si "affossa" (tratto scurito, token `--rk-sink`) e quella di sopra viene ridisegnata con la sua ombra.
- Corde libere: alone dorato (`--rk-halo`), occhi aperti; ogni ~4 s una corda libera ondeggia (il rAF parte solo per quel colpetto).
- Corde bloccate: lucchettino a metà corda (`--rk-lock`), nodini velati (`--rk-dim`), occhi chiusi.
- Simbolo sul fiocchetto e motivo sul corpo diversi per ogni corda (daltonici).

## Curva di difficoltà (`config(level)`)
| Livelli | Griglia | Corde | Lastre | Fori liberi | Minimo richiesto |
|---|---|---|---|---|---|
| 1 | 4×4 | 3 | 1 | 2 | 2 |
| 2–3 | 4×5 | 4 | 1 | 2 | 3–4 |
| 4–6 | 5×5 | 5 | 2 | 2 | 3–5 |
| 7–10 | 5×5 | 6 | 2 | 2 | 4–6 |
| 11–15 | 5×6 | 7 | 3 | 2 | 5–7 |
| 16–20 | 5×6 | 8 | 3 | 1 | 6–9 |
| 21+ | 5×6 | 9 | 3 | 1 | 7–10 |

Dal livello 2 un livello è scartato se la **giocata ingenua** (ogni volta la mossa che fa volare via più corde, a parità la prima) lo risolve
nel minimo. Tra i candidati validi vince quello con più mosse minime, poi più mosse "nascoste" (oltre l'euristica), poi meno corde libere.

Misure (`node tools/selftest.mjs`, 12 semi, Node):

| Livello | Corde | Incroci | Libere all'inizio | Minimo medio | Oltre l'euristica | ms medi |
|---|---|---|---|---|---|---|
| 1 | 3 | 2.5 | 1.2 | 2.0 | +0.0 | 0.8 |
| 3 | 4 | 5.3 | 1.0 | 3.9 | +1.0 | 25 |
| 6 | 5 | 7.3 | 1.0 | 4.9 | +1.1 | 16 |
| 10 | 6 | 10.7 | 1.1 | 5.8 | +1.3 | 18 |
| 14 | 7 | 13.9 | 1.1 | 6.9 | +1.3 | 20 |
| 18 | 8 | 19.9 | 1.3 | 8.8 | +2.1 | 10 |
| 24 | 9 | 21.4 | 1.7 | 9.8 | +2.3 | 11 |

I tempi sono dominati dalla ricerca dei candidati (tetto di 30 ms dopo il primo valido). Il risolutore espande ~10 nodi per livello.

## Generatore
1. Lastre (`platesFor`), fori e corde (`layout`): corde lunghe che si incrociano, mai sopra un foro.
2. `dress`: strati da un ordine casuale delle corde (nessun ciclo, almeno una corda libera); scarto se una corda non incrocia nessuna.
3. A* (1500 nodi) → minimo esatto e soluzione; scarto se fuori fascia o risolto dalla giocata ingenua.
4. Tetti di tempo (30 ms dopo il primo valido, 120 ms con un fallback) → `FALLBACK` fisso (tre corde in pila) solo se non c'è nulla.

## Risolutore
- Stato: capi, maschere "copre", lastre presenti. Mosse solo dalle corde libere.
- **Euristica ammissibile**: sia M l'insieme delle corde che verranno spostate almeno una volta.
  1. Per ogni incrocio attuale almeno una delle due è in M: due corde mai spostate che si incrociano non restano mai senza incroci.
  2. Se j è in M, ogni corda che ora le sta sopra è in M: prima di prendere j, chi la copre deve smettere di coprirla. Questo succede solo
     spostando una delle due, e la corda di sopra non può sparire mentre incrocia j.

  h = |M| minimo (copertura dei vertici "chiusa verso l'alto"), calcolato con una ricerca esatta per ramificazione, con memo.
  A* con riapertura dei nodi → minimo esatto; code a due livelli (f crescente, a parità g più alto), tabella pigra degli incroci.

## Oracolo nei test (`tests/ropes.test.mjs`)
Indipendente: simulatore riscritto dalle regole (incroci con la formula di Cramer, strati in una `Map`, sparizione ricalcolata con la
geometria e ripetuta finché cambia qualcosa, lastre in array) e BFS esaustiva con chiavi JSON.
- corde bloccate che non si muovono; corda spostata sopra a tutte quelle che incrocia; sparizione solo senza incroci (anche di una corda di
  sotto); lastre; mosse illegali;
- livelli 1–24: validi, stabili, ogni corda con almeno un incrocio, uno strato per incrocio, almeno una corda libera; la soluzione dichiarata
  libera tutto nell'oracolo;
- livelli 1–8: minimo A* = BFS; anche da stati intermedi;
- mosse casuali: logica e oracolo identici (stato, fori liberi, corde libere);
- difficoltà crescente, giocata ingenua insufficiente, determinismo, salvataggi (modelli 1 e 2 scartati), tempo < 50 ms.

## Fisica
Particelle Verlet con vincoli di lunghezza, gravità leggera; i capi inseguono foro o dito; la corda in mano (o appena posata) sta sopra tutto
con ombra lunga; le corde che non incrociano più nulla si sfilano e volano via con scintille; le lastre cadono ruotando.
rAF solo finché qualcosa si muove e mai fuori dal DOM. `prefers-reduced-motion`: tutto subito a riposo, niente ondeggiamenti né voli.

## Fragoline
`HH.rules.rateMoves(mosse, minimo, concesse)`: 3 col minimo esatto, 2 entro il 70% delle mosse in più concesse, 1 oltre.

## Tutorial
1. `tu_ropes_6` — due corde incrociate: quella sotto ha il lucchetto che trema, quella sopra brilla e la manina la tocca.
2. `tu_ropes_7` — la manina trascina il nodino in un foro libero: la corda passa sopra quella che incrocia.
3. `tu_ropes_8` — la corda di sopra vola via, poi quella che non incrocia più nulla; la lastra cade.
