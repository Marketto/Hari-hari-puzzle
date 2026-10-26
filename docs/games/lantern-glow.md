# Lantern Glow

"Lights Out" al contrario: accendi tutte le lanterne di carta.

## Regole
Toccare una lanterna inverte lei e le quattro vicine (su, giù, sinistra, destra).

## Difficoltà
| Livello | Griglia | Tocchi di mescolamento |
|---|---|---|
| 1–3 | 4×4 | 4–6 |
| 4+ | 5×5 | 7–14 |

## Mosse contate e fragoline (v0.5)
- **Minimo esatto** con l'eliminazione di Gauss su GF(2) (`minPresses`): soluzione particolare + tutte le combinazioni del nucleo
  (4×4: 16 combinazioni, 5×5: 4), si tiene quella con meno tocchi. Verificato nei test contro la forza bruta su tutti i 65 536 sottoinsiemi del 4×4.
- **Mosse concesse** = minimo + 15% (da +2 a +6), contatore "Mosse rimaste"; a mosse finite compare "Hai finito le mosse".
- Annulla rimette le lanterne ma il tocco resta speso.
- Fragoline con la regola condivisa `HH.rules.rateMoves` (come Boba Sort): 3 col minimo, 2 entro il 70% delle mosse in più, 1 oltre.

## Generatore (`src/games/lantern-logic.js`)
Parte da tutto acceso e applica tocchi casuali distinti: lo stato è sempre risolvibile (basta ripetere gli stessi tocchi).

## Idee
- Variante con lanterne a 3 colori (modulo 3).
