# Pixel Mochi (`pixel`)

Nonogram (picross) kawaii: risolvendo gli indizi appare un disegno fatto a mano, che alla vittoria si colora e prende vita.

File: `src/games/pixel-logic.js` (logica pura, `HH.pixel`) · `src/games/pixel-ui.js` (interfaccia, registrazione) ·
`src/games/pixel.css` (stile, token `--pm-*`) · `tests/pixel.test.mjs` · blocco in `tools/selftest.mjs`.

## Regole (chiave `r7`)
- Ogni riga e ogni colonna ha una lista di numeri: sono le lunghezze dei blocchi di celle piene, **in ordine**, separati da almeno una cella vuota.
- Ogni mossa è controllata subito contro l'unica soluzione (come Hedgedoku), **3 cuori**:
  - riempire una cella che va vuota → cuore perso, la cella diventa ✕;
  - segnare ✕ una cella che va piena → cuore perso, la cella si riempie.
  - Al terzo errore l'app mostra "cuori finiti" e si ricomincia il livello.
- Quando tutte le celle piene di una linea sono a posto, l'indizio si **spegne** (fa un piccolo "ding") e le celle ancora ignote ricevono la ✕ in automatico.
- Si vince quando tutte le celle piene sono state trovate (le vuote possono restare senza ✕).

## Comandi
| Gesto | Effetto |
|---|---|
| Tocco | usa lo strumento scelto (Riempi / Segna ✕). Con "Segna" un tocco su una ✕ la toglie. |
| Trascinamento | applica lo strumento a tutta la fila: l'asse (riga o colonna) si blocca dopo la prima cella. Il tratto si ferma al primo errore. |
| Pressione lunga (430 ms) | l'altro strumento su quella cella (vibrazione breve). |
| Tastiera | frecce per muoversi (roving tabindex), Invio/Spazio = strumento, `X` = ✕, `F` = riempi. |

Durante tocco/trascinamento si illuminano gli indizi della riga e della colonna sotto il dito. Nell'angolo in alto a sinistra una miniatura mostra il disegno che sta nascendo.
"Annulla" torna indietro di un tocco o di un tratto intero (✕ automatiche comprese); gli errori restano contati.

## Disegni e "generatore"
- 43 disegni fatti a mano in `PICS` (`[id, nome inglese, righe]`): 11 da 5×5, 10 da 7×7, 10 da 8×8, 12 da 10×10.
  Formato: `.` vuota · `@` vuota nel puzzle ma alla vittoria diventa un occhio · lettera = cella piena col colore `--pm-c-<lettera>`
  (r R p P o y Y g G t b B l L n N w k e s).
- `generate(level, rnd, { avoid })`: taglia da `sizeFor(level)`, disegno casuale del gruppo evitando gli ultimi 6 giocati
  (`pm:recent` in storage), specchiato in orizzontale con probabilità ½ (dal livello 2). Livello 1 = sempre il cuore.
  Prima di restituirlo verifica con `lineSolve` che sia risolvibile per logica; altrimenti passa al successivo (fallback: cuore).
- Tempo medio di `generate` sul 10×10: ~0,1 ms in Node.

## Prova di unicità
1. **Risolutore di linea** (`solveLine`, programmazione dinamica O(L·k)): per ogni linea calcola l'intersezione di tutte le
   sistemazioni dei blocchi compatibili con le celle note. `lineSolve` lo ripete su righe e colonne fino al punto fisso.
   Ogni disegno arriva alla griglia **completa** senza tentativi ⇒ la soluzione è unica e si trova con sola logica riga/colonna
   (anche ai livelli bassi, come richiesto). Lo specchio orizzontale conserva la proprietà.
2. **Oracolo indipendente** nei test (`tests/pixel.test.mjs`): forza bruta che elenca tutte le sistemazioni di ogni riga e scende
   riga per riga controllando i prefissi delle colonne; conta le soluzioni fino a 2. Verifica `count === 1` e soluzione = disegno
   per tutti i 43 disegni, diritti e specchiati, e per i livelli 1–20 su molti semi.
   I disegni non unici trovati in fase di disegno (sole, Hari, ramen, gattino: scambi 2×2 negli angoli) sono stati ritoccati.

## Curva di difficoltà
| Livelli | Griglia | Disegni | Deduzioni di linea medie | Passate medie |
|---|---|---|---|---|
| 1–3 | 5×5 | 11 | 9,8 | 2,5 |
| 4–7 | 7×7 | 10 | 13,6 | 2,8 |
| 8–12 | 8×8 | 10 | 18,8 | 3,3 |
| 13+ | 10×10 | 12 | 26,2 | 3,3 |

"Deduzioni" = linee che hanno prodotto almeno una cella nuova in `lineSolve` (`steps`); "passate" = giri completi righe+colonne.

## Fragoline e tempi
- `rate`: 3 senza errori, 2 con un errore, 1 con due (come Hedgedoku).
- `parTime`: 1,6 s per cella (5×5 = 40 s, 10×10 = 160 s).
- `progress`: celle piene trovate / celle piene della soluzione (le celle piene sono sempre giuste, grazie alla verifica immediata).

## Salvataggio
`snapshot()` = `{ id, mirror, total, board, hist, moves, mistakes }` (board: 0 ignota, 1 piena, 2 ✕). Il puzzle si ricostruisce da
`id` + `mirror`. `HH.pixel.restore(json)` scarta le celle incoerenti con la soluzione, cronologie illeggibili e, se la partita era
persa (3 errori), riparte da zero. Un salvataggio con disegno inesistente o taglia sbagliata viene rifiutato (nuova partita).

## Vittoria
Le celle si colorano a onda diagonale (34 ms per passo), le fessure si chiudono, appaiono gli occhi (sul colore più frequente
intorno), il disegno si centra e si ingrandisce nel foglio con un bordo "adesivo", poi rimbalza, sbatte le palpebre e oscilla
fra scintille; sotto compare il nome (`pm_n_<id>`). Dopo ~2 s parte la finestra di vittoria dell'app.
Con `prefers-reduced-motion` tutto resta fermo (colori e occhi compaiono subito).

## Tutorial
1. `tu_pixel_1` — un indizio "3 1" e la riga che si riempie.
2. `tu_pixel_2` — la manina trascina lungo la riga; pulsanti Riempi / ✕.
3. `tu_pixel_3` — il cuore che si perde e il disegno che prende vita.
