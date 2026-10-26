# Hedgedoku

Puzzle di deduzione nello stile "Queens" (lo stesso genere di Meowdoku), con i ricci al posto dei gatti.

## Regole
Griglia N×N divisa in N zone colorate. Metti N ricci: uno per riga, uno per colonna, uno per zona; due ricci non si toccano mai, neanche in diagonale.
Tocco su una cella: vuoto → ✕ (promemoria) → riccio → vuoto. I ricci in conflitto lampeggiano a strisce.

## Difficoltà
| Livello | Griglia |
|---|---|
| 1–2 | 5×5 |
| 3–5 | 6×6 |
| 6–9 | 7×7 |
| 10+ | 8×8 |

## Generatore (`src/games/hedgedoku-logic.js`)
1. Soluzione casuale: permutazione con `|p[r] − p[r+1]| > 1`.
2. Regioni: crescita casuale da ogni cella-soluzione (regioni sempre connesse).
3. **Riparazione dell'unicità**: finché il solver trova 2 soluzioni, prende una cella della soluzione alternativa (non della vera) e la cede a una regione vicina, purché la regione d'origine resti connessa.
Risultato in test: 10/10 puzzle unici per ogni taglia, ~1 ms in Node.

## Idee
- Suggerimento: evidenzia una cella deducibile (riga/colonna/zona con una sola cella libera).
- Puzzle del giorno con seme dalla data.
