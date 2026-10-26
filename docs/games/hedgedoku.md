# Hedgedoku

Puzzle di deduzione nello stile "Queens" (lo stesso genere di Meowdoku), con i ricci al posto dei gatti.

## Regole
Griglia N×N divisa in N zone colorate. Metti N ricci: uno per riga, uno per colonna, uno per zona; due ricci non si toccano mai, neanche in diagonale.

## Controlli (v0.2)
- Selettore **Riccio / Segna** sopra la griglia (ricordato tra le sessioni).
- Riccio: tocco = metti/togli riccio.
- Segna: tocco = metti/togli ✕ · trascinamento = tante ✕ (se parti da una ✕, le cancella) · pressione lunga = riccio.
- Si aggiorna solo la cella cambiata: niente animazioni ripetute sugli altri ricci. I ricci in conflitto mostrano strisce rosse.
- 8 tinte di zona ben distinte (rosa, giallo, verde, azzurro, lilla, arancio, acqua, grigio) + bordi spessi tra zone.

## Difficoltà
| Livello | Griglia |
|---|---|
| 1–2 | 5×5 |
| 3–5 | 6×6 |
| 6–9 | 7×7 |
| 10+ | 8×8 |

## Generatore v2 (`src/games/hedgedoku-logic.js`)
1. Soluzione casuale: permutazione con `|p[r] − p[r+1]| > 1`.
2. Zone: crescita dalle celle-soluzione, sempre connesse; nel 60% dei casi bilanciate (favorisce le zone piccole).
3. **Riparazione dell'unicità**: finché esiste una seconda soluzione, una sua cella (non della vera) passa a una zona vicina, purché la zona d'origine resti connessa.
4. **Filtro logico** (`logicSolve`): il livello è accettato solo se risolvibile senza tentativi, con queste tecniche:
   1 posto unico in riga/colonna/zona · 2 casella che svuoterebbe un'altra unità · 3–5 confinamento di k=1..3 zone in k righe/colonne (e viceversa).
5. Difficoltà: `minTech` 2 dal livello 4, 4 dal livello 12.

Misure (60 livelli per taglia): 100% logici; tempo medio 0,7 ms (5×5) → 3,8 ms (8×8).

## Test (`tests/hedgedoku.test.mjs`)
Per 25 semi × taglie 5–8: tutte le celle assegnate, N zone connesse, soluzione valida, **unicità verificata da un solver a forza bruta indipendente** (tutte le N! permutazioni), risolvibilità logica. Più test di `check()` su riga, colonna, zona, diagonale e ✕.

## Idee
- Suggerimento: evidenzia una cella deducibile (riga/colonna/zona con una sola cella libera).
- Puzzle del giorno con seme dalla data.
