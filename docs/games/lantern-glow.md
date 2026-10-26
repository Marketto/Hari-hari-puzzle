# Lantern Glow

"Lights Out" al contrario: accendi tutte le lanterne di carta.

## Regole
Toccare una lanterna inverte lei e le quattro vicine (su, giù, sinistra, destra).

## Difficoltà
| Livello | Griglia | Tocchi di mescolamento |
|---|---|---|
| 1–3 | 4×4 | 4–6 |
| 4+ | 5×5 | 7–14 |

## Generatore (`src/games/lantern-logic.js`)
Parte da tutto acceso e applica tocchi casuali distinti: lo stato è sempre risolvibile (basta ripetere gli stessi tocchi).

## Idee
- Contatore "mosse minime" calcolato con eliminazione di Gauss su GF(2).
- Variante con lanterne a 3 colori (modulo 3).
