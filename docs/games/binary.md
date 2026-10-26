# Mochi Binary

Takuzu / Binairo con due gusti di mochi: **fragola** (rosa, tondo, fragolina in cima) e **matcha** (verde, più largo, fogliolina e spolverata).
Le due forme e i due "cappellini" sono diversi apposta: si distinguono anche senza vedere bene i colori.

File: `src/games/binary-logic.js` (logica pura, `HH.binary`) · `src/games/binary-ui.js` · `src/games/binary.css` (token `--mb-*`, tinta card `--tint-binary`) · `tests/binary.test.mjs`.
Chiave regole `r8`, prefisso CSS `mb-`.

## Regole
- Ogni cella contiene un mochi rosa o verde.
- Mai tre uguali in fila, né in orizzontale né in verticale.
- Ogni riga e ogni colonna ha tanti rosa quanti verdi.
- Nessuna riga è uguale a un'altra, nessuna colonna è uguale a un'altra.
- I mochi con lo **stecchino a bandierina** su piattino scuro sono indizi fissi: non si possono cambiare.
- Ogni livello ha **una sola soluzione**.

## Comandi
- **Tocco**: vuoto → rosa → verde → vuoto.
- **Trascinamento** ("pennello"): il valore che il tocco darebbe alla prima cella viene dipinto su tutte le celle attraversate (partendo da un verde si cancella). Un trascinamento è una sola mossa e un solo passo di Annulla.
- **Tastiera**: frecce per spostarsi (tabindex "itinerante": un solo tab-stop nella griglia), Invio/Spazio = cicla, `1`/`P` = rosa, `2`/`G` = verde, `0`/Canc/Backspace = vuoto. Ogni cella ha `aria-label` "Riga r, colonna c: gusto (fisso)".
- Annulla: fino a 80 passi; non restituisce cuori.

## Errori e cuori (3)
1. **Violazioni di regola** (verifica immediata, nessuna penalità): tris, più di metà di un colore in una riga/colonna (anche incompleta), due righe o due colonne complete identiche. Le celle coinvolte prendono un anello rosso a strisce e i mochi diventano preoccupati (sopracciglia, goccia di sudore, tremolio).
2. **Cuore perso** quando un'azione **completa** una riga o colonna diversa dalla soluzione. Il giudizio è "assestato": avviene 0,9 s dopo l'ultima mossa (`SETTLE_MS`) confrontando con l'ultima griglia giudicata (`s.settled`). Così ciclare rosa → verde sull'ultima cella libera non costa cuori, e non si può "sbirciare" l'esito senza pagare: le faccine felici/preoccupate delle linee complete compaiono solo dopo il giudizio.
   - Al massimo un cuore per giudizio, anche se si completano più linee sbagliate insieme.
   - Cambiare colore in una linea già completa non la ri-giudica; svuotarla e ricompletarla sbagliata sì.
   - Annulla prima del giudizio cancella la mossa senza costi.
3. Linea completata giusta: mochi felici (occhi ad arco, boccuccia aperta, saltello) + scintille dorate lungo la linea.
4. Al terzo cuore l'app mostra "cuori finiti" e il livello ricomincia (stesso puzzle).

## Fragoline
`rate(s) = max(1, 3 − cuori persi)`: 3 senza errori, 2 con un errore, 1 con due. Tempo di riferimento `parTime = 1,6 s × celle` (26 s per il 4×4, 160 s per il 10×10).
`progress(s)` = celle non fisse uguali alla soluzione / celle non fisse (guida musica e frasi di Hari; non è mostrato al giocatore).
La barra in alto mostra invece solo quante celle sono riempite (non rivela la correttezza).

## Vittoria
Griglia identica alla soluzione (equivale a "tutte le regole rispettate", perché la soluzione è unica): tutti i mochi diventano felici e fanno **la ola** (salto a onda, ritardo `70 ms × colonna + 30 ms × riga`, due volte), poi `ctx.win()`.

## Generatore (`generate(level, rnd)`)
Strategia "soluzione-prima + rimozione":
1. **Soluzione casuale**: righe scelte tra le righe valide (bilanciate e senza tris: 6 / 14 / 34 / 84 per 4 / 6 / 8 / 10) con backtracking; a ogni riga si controllano le colonne (non più di n/2 per colore, niente tris), alla fine che le colonne siano tutte diverse. Limite di 300 nodi per tentativo, poi si riparte.
2. **Rimozione degli indizi**: si parte con tutta la soluzione come indizi; in ordine casuale si toglie un indizio e lo si lascia via solo se il risolutore a deduzioni del livello (`logicSolve(n, clues, tier)`) completa ancora la griglia.
3. **Indizi extra**: per i livelli facili si rimettono `extra` indizi tra quelli tolti.

### Prova di unicità
Ogni passo di `logicSolve` è una deduzione **valida** (implicata dalle regole): se il risolutore completa la griglia senza tentativi, ogni soluzione deve coincidere con quella trovata, quindi è unica. Il generatore accetta solo griglie che il risolutore completa, quindi ogni livello è risolvibile e a soluzione unica **per costruzione**.
Nei test lo confermiamo con un **oracolo indipendente** (`tests/binary.test.mjs`): righe come stringhe `a`/`b` generate da zero, backtracking riga per riga con potatura sulle colonne e controllo finale di tutte le regole, che conta le soluzioni compatibili con gli indizi (deve essere esattamente 1 e coincidere con la soluzione dichiarata) per i livelli 1–20 × 8 semi.

### Tecniche del risolutore (tier)
- **tier 1**: coppie e panini (`xx_ → y`, `x_x → y`) e conteggio (se una linea ha già n/2 di un colore, il resto è dell'altro).
- **tier 2**: in più, per ogni linea si confrontano tutte le righe valide compatibili con le celle note (escluse quelle uguali a linee già complete); le celle uguali in tutte le candidate sono forzate. Copre il ragionamento sul conteggio a distanza e la regola "righe diverse".

## Curva di difficoltà
`sizeFor(level)`: 4×4 (1–2) → 6×6 (3–6) → 8×8 (7–12) → 10×10 (13+). Dentro ogni taglia prima solo tecniche tier 1 con indizi in più, poi tier 2 con sempre meno indizi.

Misure (40 semi per livello, Node, dopo riscaldamento):

| Livello | Griglia | Tier | Extra | Indizi medi | Deduzioni | ms medi |
|---|---|---|---|---|---|---|
| 1 | 4×4 | 1 | 2 | 6,3 (39%) | 10 | 0,3 |
| 2 | 4×4 | 1 | 1 | 5,3 (33%) | 11 | 0,2 |
| 3 | 6×6 | 1 | 2 | 11,3 (31%) | 25 | 0,4 |
| 4 | 6×6 | 1 | 1 | 10,4 (29%) | 26 | 0,3 |
| 5 | 6×6 | 2 | 1 | 9,4 (26%) | 27 | 0,4 |
| 6 | 6×6 | 2 | 0 | 8,3 (23%) | 28 | 0,4 |
| 7 | 8×8 | 1 | 3 | 19,4 (30%) | 45 | 1,6 |
| 8 | 8×8 | 1 | 2 | 18,8 (29%) | 45 | 1,2 |
| 9 | 8×8 | 2 | 3 | 17,5 (27%) | 47 | 1,8 |
| 10 | 8×8 | 2 | 2 | 16,5 (26%) | 48 | 1,4 |
| 11 | 8×8 | 2 | 1 | 15,2 (24%) | 49 | 1,3 |
| 12 | 8×8 | 2 | 0 | 14,6 (23%) | 49 | 1,3 |
| 13 | 10×10 | 1 | 3 | 28,2 (28%) | 72 | 3,5 |
| 14 | 10×10 | 1 | 1 | 26,1 (26%) | 74 | 2,7 |
| 15 | 10×10 | 2 | 4 | 26,0 (26%) | 74 | 6,6 |
| 16 | 10×10 | 2 | 3 | 25,2 (25%) | 75 | 4,1 |
| 17 | 10×10 | 2 | 2 | 23,4 (23%) | 77 | 4,0 |
| 18 | 10×10 | 2 | 1 | 23,1 (23%) | 77 | 4,4 |
| 19+ | 10×10 | 2 | 0 | 22 (22%) | 78 | 4,2 |

## Salvataggio
`snapshot()` = `{ v, n, level, tier, seed, solution, givens, board, settled, hist, moves, mistakes }` (celle: 0 vuota, 1 rosa, 2 verde).
`validate()` controlla taglia, soluzione valida, indizi coerenti con la soluzione e con la griglia; un salvataggio non valido fa partire un livello nuovo.
Alla ripresa, se c'era una mossa non ancora giudicata viene giudicata subito dopo (0,9 s).

## Tutorial
1. `tu_binary_1` — tre piattini vuoto → fragola → matcha (saltellano a turno), freccia di ritorno e dito che tocca.
2. `tu_binary_2` — fila rosa-rosa-(rosa barrato ↔ verde)-verde e barra metà rosa / metà verde.
3. `tu_binary_3` — due righe diverse con "≠" e un mochi fisso con bandierina.

## Test (`tests/binary.test.mjs`)
Oracolo indipendente (numero di righe valide noto, conteggio soluzioni = 1 per livelli 1–20 × 8 semi), risolvibilità con il tier del livello, curva di difficoltà, tempo medio < 10 ms sul 10×10, determinismo col seme, livello iniziale mai già risolto, `check` (tris, eccesso, righe/colonne gemelle), `judge` (cuore solo quando si completa una linea sbagliata), vittoria, salvataggio JSON e `validate`, `solveCount` contro l'oracolo (il 4×4 vuoto ha 72 soluzioni).
In più `tools/selftest.mjs` (`npm run bench`) misura i livelli 1, 2, 5, 10, 15, 20.
