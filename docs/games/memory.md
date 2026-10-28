# Hari Memory

Memory classico con gli abitanti e i tesori del bosco: carte coperte su un tavolino, se ne girano due per volta,
le coppie uguali restano scoperte. Pensato anche per i più piccoli: **niente sconfitta e niente limite di mosse**,
le fragoline dipendono dalle mosse usate.

File: `src/games/memory-logic.js` (logica pura, `HH.memory`) · `src/games/memory-art.js` (disegni SVG, `HH.memoryArt`) ·
`src/games/memory-ui.js` · `src/games/memory.css` (token `--mm-*`, tinta card `--tint-memory`) · `tests/memory.test.mjs`.
Chiave regole `r15` (per ora testo inglese `rulesEn` nel catalogo), prefisso CSS `mm-`, brano `memory` in `src/core/audio.js`.

## Regole
- Una **mossa** = due carte girate.
- Due carte che vanno insieme restano scoperte (bordo dorato, saltello, pop di cuori e stelline, Hari salta di gioia).
- Due carte diverse scuotono la testa e tornano coperte da sole dopo 1,1 s (`MISS_MS`), oppure subito al tocco successivo.
- Si vince quando tutte le coppie sono scoperte.
- **Annulla** non fa nulla: in un Memory permetterebbe di sbirciare le carte senza pagarle. **Ricomincia** rimette coperte le stesse carte negli stessi posti; **Nuovo puzzle** mescola un mazzo nuovo.
- Hari fa la faccia "oops" solo per un **errore da distrazione** (la compagna di una delle due carte era già stata vista), mai per la sfortuna di girare due carte nuove.

## Varianti
| Variante | Da | Cosa cambia |
|---|---|---|
| `mixed` | livello 1 | soggetti ben distinti: metà animali e metà oggetti, al massimo **uno per famiglia** (una sola noce, una sola foglia…) |
| `similar` | livello 4 | 1–3 **famiglie intere di soggetti simili** (tutta la frutta secca, tutte le bacche, tutte le foglie, tutti gli alberi) |
| `themed` | livello 6 (cartello "Nuovo!") | **coppie a tema**: l'animale va con il suo cibo o la sua casa; carte tutte diverse, si abbina per significato |
| `swap` | livello 7 (cartello "Nuovo!") | dopo un errore una delle due carte sbagliate **scivola al posto di una vicina coperta** (in orizzontale o verticale). Lo scambio è animato e la carta che arriva brilla: chi guarda non perde l'informazione |

Sotto il tavolino compare un suggerimento per le varianti a tema e swap.

## Curva di difficoltà (`tierFor(level)`)
| Livello | Griglia | Coppie | Variante | Difficoltà (`diff`) |
|---|---|---|---|---|
| 1 | 3×4 | 6 | mixed | 6 |
| 2 | 4×4 | 8 | mixed | 8 |
| 3 | 4×5 | 10 | mixed | 10 |
| 4 | 4×6 | 12 | similar (1 famiglia) | 14 |
| 5 | 5×6 | 15 | similar (2 famiglie) | 19 |
| 6 | 5×6 | 15 | themed · Nuovo! | 21 |
| 7 | 5×6 | 15 | similar (2) + swap · Nuovo! | 24 |
| 8, 11, 14… | 6×6 | 18 | similar (3 famiglie) | 24 |
| 9, 12, 15… | 6×6 | 18 | themed | 24 |
| 10, 13, 16… | 6×6 | 18 | similar (2) + swap | 27 |

`diff = coppie + 2 × famiglie simili + 6 (a tema) + 5 (swap)`: non decresce fino al gradino 8; da lì i tre giri si alternano
e nessuno è più facile del livello 7 (verificato dai test). La griglia più grande è 6×6: su 360 px le carte sono di ~50 px.

## Fragoline (niente sconfitta)
Un giocatore con **memoria perfetta** impiega in media ~1,55 mosse a coppia (bot dei test; il minimo teorico, con
fortuna sfacciata, è 1 mossa a coppia). Soglie (`thresholds(s)`, con `n` = coppie e `extra` = 2 a tema + 3 swap + famiglie simili):

- 3 fragoline: mosse ≤ `2n + extra`
- 2 fragoline: mosse ≤ `3n + 2·extra`
- 1 fragolina oltre

Calibrazione (300 partite per livello, bot che dimentica ogni carta ricordata con probabilità 12% a mossa):
livello 1 → 95% tre fragoline, livello 5 → 59%, livello 8 → 46%. Il bot perfetto prende 3 fragoline in ≥ 90% dei casi a ogni livello.
Scelta voluta: **nessun limite di mosse** (un limite dipenderebbe troppo dalla fortuna dei primi giri e frustrerebbe i bambini).

`parTime = 5 s × coppie (+15 s a tema, +15 s swap)`. `progress(s)` = carte trovate / carte (musica e frasi di Hari);
la barra in alto mostra le coppie trovate.

## Soggetti (49 disegni, 39 nelle coppie uguali)
- **Animali (18)**: riccio Hari, scoiattolo, volpe, gufo, coniglio, cervo, tasso, procione, rana, lumaca, coccinella, orsetto, ape, topolino, pettirosso, castoro, bruco, cinghiale
- **Semi (2)**: seme di girasole, seme di zucca
- **Frutta secca (5)**: ghianda, nocciola (col suo involucro verde), noce, castagna (nel riccio), pigna
- **Bacche (4)**: mirtilli, mora, fragolina di bosco, ribes
- **Alberi e cespugli (4)**: quercia (con le ghiande), abete, betulla, cespuglio
- **Foglie (4)**: acero, quercia, ginkgo, felce
- **Funghi (2)**: amanita, porcino
- **Solo nelle coppie a tema (10)**: mela, carota, fiore, miele, uva, ninfea, nido, luna, trifoglio, tronco

Coppie a tema (`THEMED`): scoiattolo↔ghianda, riccio↔mela, coniglio↔carota, ape↔fiore, orsetto↔miele, volpe↔uva,
rana↔ninfea, lumaca↔fragolina, topolino↔seme di girasole, pettirosso↔nido, gufo↔luna, cervo↔trifoglio, castoro↔tronco,
procione↔mirtilli, tasso↔porcino, bruco↔foglia d'acero, cinghiale↔castagna, coccinella↔foglia di quercia.

Disegni: viewBox 100×100, contorni da 3 px, forme grandi; frutti e funghi hanno una faccina. Tutti i colori sono token
`--mm-*` (nel tema scuro cambiano tavolo, retro e fronte delle carte; i soggetti restano coi colori naturali).
Per controllarli a colpo d'occhio: una pagina che stampa `HH.memoryArt.face(id)` per ogni `HH.memory.SUBJECTS` a 56 e 100 px.
I nomi dei soggetti **non** sono mostrati né tradotti: le carte hanno `aria-label` "Carta N" e `aria-pressed` (girata/trovata).

## Generatore (`generate(level, rnd)`)
1. `tierFor(level)` dà griglia, variante e numero di coppie.
2. `mixed`: si prende al massimo un oggetto per famiglia (seme, frutta secca, bacca, albero, foglia, fungo) per metà delle coppie, il resto animali.
   `similar`: k famiglie simili intere, poi un oggetto per ciascuna famiglia rimasta, poi animali.
   `themed`: k coppie a caso da `THEMED`.
3. Mescolamento Fisher–Yates delle posizioni. Tutto deterministico dato `rnd`; `newGame(level, seed)` usa un mulberry32 interno.

Ogni mazzo ha per costruzione esattamente `n` coppie e soggetti tutti distinti, quindi è sempre risolvibile e senza ambiguità
(nessuna carta ha più di una compagna possibile). Generazione < 0,5 ms anche per il 6×6.

Lo scambio della variante swap usa un generatore con seme `seed ^ (mosse+1)·φ`: rigiocando la stessa partita gli scambi sono identici,
e il salvataggio non deve memorizzare uno stato del generatore.

## Stato e salvataggio
`{ v, level, seed, tier, cols, rows, pairs, mode, sim, swap, isNew, deck[], key[], found[], seen[], up[], moves, misses, slips }`
(`key` = indice di coppia; `seen` = carte già viste, per gli errori da distrazione). Il fronte delle carte coperte non è nel DOM.
Se si chiude con due carte sbagliate ancora girate, alla ripresa tornano coperte (con l'eventuale scambio).

## Test (`tests/memory.test.mjs`)
Oracoli indipendenti: elenco delle coppie a tema riscritto nel test e un bot che decide da solo cosa girare.
- ogni mazzo (16 livelli × 30 semi): dimensioni, esattamente `n` coppie valide, soggetti distinti, regole di `mixed`/`similar`
- determinismo; regole di flip (stessa carta, carta trovata, terza carta durante l'errore, rimettere giù)
- errore da distrazione; variante swap (solo carte vicine coperte, mazzo invariato)
- bot che conosce tutto: vince in `n` mosse con 3 fragoline; bot a memoria perfetta: < 1,8 mosse a coppia e ≥ 90% tre fragoline
- bot smemorato: finisce sempre, nei livelli 1–3 almeno 2 fragoline nell'85% dei casi
- difficoltà monotona (≥ 4 gradini), ripresa da JSON identica, salvataggi rotti rifiutati
- tutti i soggetti hanno un disegno diverso, solo token `--mm-*` definiti nel CSS, `--tint-memory` in entrambi i temi
- generazione < 10 ms (× 3 in CI)
