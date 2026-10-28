# Hedgedoku

Puzzle di deduzione nello stile "Queens" (lo stesso genere di Meowdoku), con i ricci al posto dei gatti.

## Regole
Griglia N×N divisa in N zone colorate. Metti N ricci: uno per riga, uno per colonna, uno per zona; due ricci non si toccano mai, neanche in diagonale.

## Verifica e cuori (v0.3)
- Ogni riccio viene confrontato subito con l'unica soluzione (`judge()`): se è giusto resta, se è sbagliato diventa triste,
  si illuminano in rosso i ricci con cui viola una regola (stessa riga, colonna, zona o una delle 8 caselle intorno), si perde un cuore
  e al suo posto resta una ✕. Sulla griglia quindi restano solo ricci corretti.
- 3 cuori: al 3° errore compare "Hai finito i cuori" e il livello ricomincia (stesso puzzle).
- Stelle: 3 senza errori, 2 con un errore, 1 con due.
- Dal livello 6 (7×7 e 8×8) un **riccio d'aiuto** già piazzato, con bollino dorato, non rimovibile.

## Controlli (v0.4: tap / doppio tap, niente modalità)
- **Tap**: cella vuota ↔ ✕. Su un riccio lo toglie e la cella resta **vuota** (non diventa ✕: chi toglie un riccio di solito vuole ripensarci, non escludere la casella). Il riccio d'aiuto non si toglie (trema).
- **Doppio tap** (stessa cella, secondo tocco entro **300 ms** dal rilascio del primo, `HH.hedgedoku.isDoubleTap`): mette il riccio, o lo toglie se c'è.
  Il primo tap viene applicato **subito** (la ✕ compare senza ritardo); al secondo tap la ✕ viene ritirata (si toglie la sua voce dalla cronologia e la mossa)
  e al suo posto si giudica il riccio. Risultato: **una sola mossa**, una sola voce di "Annulla", nessun cuore perso per la ✕ intermedia (le ✕ non costano mai cuori).
  Se il primo tap aveva tolto un riccio, il secondo non fa nulla (il riccio resta tolto). Un tap su un'altra cella o dopo 300 ms è un nuovo tap singolo.
- **Trascina**: tante ✕ in fila (se parti da una ✕, le cancella); i ricci non vengono toccati. Un trascinamento non avvia mai un doppio tap.
- **Tastiera**: frecce = sposta il focus (una sola cella nel tab order), **Invio** = ✕, **Spazio** = riccio. Lettori di schermo (click senza puntatore) = tap.
  `aria-label` della cella: "riga,colonna" + "· Riccio" / "· crossed out".
- Due pastiglie sopra la griglia ricordano i comandi ("Tap or drag" con ✕, "Double tap" con riccio). Rimossi il selettore Riccio/Segna e la pressione lunga.
- Si aggiorna solo la cella cambiata. 8 tinte di zona ben distinte + bordi spessi tra zone.

## Ricci vivi (v0.4)
SVG proprio (`HH.hogKit.svg()` in `src/games/hog-kit.js`, condiviso con Hari Sudoku; colori dai token `--hog-*` in `src/games/hedgedoku.css`, chiaro e scuro), gruppi annidati
`g.hh-b` (respiro, salti) › `g.hh-h` (inclinazione `--tilt`) › `g.hh-look` (sguardo `--lx/--ly`); goccia e cuore stanno in un `<g>` interno a un `<g transform>`.
- **Idle** (solo CSS): respiro e battito di ciglia con durata/ritardo casuali per riccio. Ogni 1,5 s un riccio a caso si guarda intorno (sinistra/destra/su, a volte inclinando la testa) per ~1–2 s.
  Un solo `setInterval`, si ferma quando la griglia esce dal DOM, salta se la pagina è nascosta; disattivato con `prefers-reduced-motion` (che spegne anche tutte le animazioni CSS).
- **✕ messa/tolta o riccio tolto**: i ricci entro 2 caselle guardano quella cella (`lookAt`, `nearHogs`).
- **Riccio giusto**: saltello con occhi ^^ e orecchie che vibrano; tutti lo guardano, quelli entro 3 caselle sorridono con un cuoricino.
- **Riccio sbagliato**: occhi stretti > <, bocca aperta, lacrime e singhiozzi; chi lo blocca ha sopracciglia preoccupate e goccia di sudore; gli altri lo guardano.
- **Vittoria**: tutti con occhi ^^ saltellano a ola, colonna dopo colonna (`--c` × 90 ms), poi la schermata di vittoria (1,25 s).

## Tutorial (prima partita)
`tutorial` nella registrazione del gioco: 3 passi con SVG animati (classi `.hdt-*`): regola (4×4, banda che scorre sulle righe, ricci che spuntano),
niente contatti (le 8 caselle intorno si accendono, riccio preoccupato), comandi (dito: 1× = ✕, 2× = riccio).

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
Per 25 semi × taglie 5–8: tutte le celle assegnate, N zone connesse, soluzione valida, **unicità verificata da un solver a forza bruta indipendente** (tutte le N! permutazioni), risolvibilità logica. Più test di `tapValue`, `isDoubleTap`, `lookAt`, `nearHogs` (comandi e reazioni), di `check()` su riga, colonna, zona, diagonale e ✕, di `judge()` (solo le celle della soluzione sono giuste; chi blocca un riccio sbagliato) e del riccio d'aiuto.

## Idee
- Suggerimento: evidenzia una cella deducibile (riga/colonna/zona con una sola cella libera).
- Puzzle del giorno con seme dalla data.
