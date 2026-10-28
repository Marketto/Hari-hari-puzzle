# Hari Sudoku

Il sudoku classico con i numeri, con Hari accanto alla griglia che fa il tifo e reagisce a ogni mossa.
File: `src/games/sudoku-logic.js` (logica pura), `sudoku-ui.js`, `sudoku.css`; riusa `hog-kit.js` e `hedgedoku.css` (il riccio animato di Hedgedoku).
Chiave delle regole `r19`, tutorial `tu_sudoku_1..3`, testi `sk_*`, brano `sudoku`, `since: '0.19.0'`.

## Regole
Griglia 9×9 divisa in 9 riquadri 3×3: ogni riga, ogni colonna e ogni riquadro contiene i numeri da 1 a 9 una volta sola.
Ogni livello ha **una sola soluzione** e si risolve **senza tentativi**.

## Comandi
- Tocca una casella, poi un numero del tastierino (una riga di 9 tasti; col telefono girato a schermo intero, tastierino 3×3 a destra della griglia).
  Senza casella libera scelta, il tasto evidenzia quel numero su tutta la griglia.
- **Matita**: i tasti scrivono note (3×3 piccole nella casella). **Note auto** (attivo di serie, preferenza `sk:auto` nello store):
  un numero giusto toglie la sua nota da riga, colonna e riquadro (l'annulla la rimette).
- **Gomma** (numero sbagliato o note), **Annulla** (anche dal pulsante dell'app), cronologia salvata nella partita.
- Evidenziazioni: riga, colonna e riquadro della casella scelta; numeri uguali; nelle note la cifra in evidenza diventa rosa.
- Ogni tasto mostra quanti ne mancano; a 0 si spegne con una ✓.
- **Aiuto** (lampadina): 1° tocco = Hari spiega la tecnica con un'icona e la frase (`sk_t1..7`), si accendono la zona del ragionamento
  e la casella (per i single nascosti anche i numeri uguali che "bloccano"); 2° tocco = mette il numero. Se c'è un numero sbagliato,
  l'aiuto indica prima quello (`sk_t0`). Più di 2 aiuti tolgono una fragolina.
- Tastiera: frecce, 1–9, Canc/Backspace = gomma, N = matita, H = aiuto.
- Un numero diverso dalla soluzione diventa rosso (con sottolineatura ondulata, non solo colore) e costa un cuore; i numeri giusti restano
  fissi. 3 cuori come Hedgedoku (`lives: 3`, `ctx.mistake`); al terzo errore l'app propone di ricominciare lo stesso puzzle.
- Fragoline: 3 − errori − (aiuti > 2 ? 1 : 0), minimo 1. Tempo di riferimento: caselle vuote × (5 + 2 × tecnica) secondi.
- `progress` = caselle giuste inserite / caselle da riempire (gli errori non contano): guida musica e traguardi.

## Hari che reagisce
Riccio di `hog-kit.js` (lo stesso dei ricci di Hedgedoku: respiro, ciglia, occhi ^^, lacrime, goccia, cuoricino) sopra la griglia,
con una nuvoletta (`aria-live`). Il gioco è registrato con `coach: true`: il fumetto generale dell'app tace durante la partita
e parla solo questo Hari (vedi `docs/audio.md`). Guarda e inclina la testa verso la casella toccata.

| Momento | Espressione | Frasi (pool, mai una delle ultime 2) |
|---|---|---|
| Inizio / ripresa | saluto con salto | `m_start1/2`, `m_poke2`, `sk_start1..3` |
| Numero giusto | salto e occhi ^^ (frase nel 55% dei casi) | `m_good1/2`, `sk_good1..4` |
| Riga/colonna/riquadro completati | cuoricino, onda di menta sulla linea, suono | `sk_row/col/box` con il numero (65%) oppure `sk_line1/2`, `m_good1`, `m_cheer`… |
| Numero completato (tutti i 9) | tasto che salta, onda sui 9 numeri | `sk_digit` |
| A metà / quasi fatto | gioia | `m_half`, `m_almost1/2` |
| Errore | lacrime e singhiozzi | `m_oops1/2`, `sk_oops1..4` |
| Resta un cuore | spaventato: bocca aperta, goccia, tremarella, bordo rosso | `sk_scared1..5`, `m_idle2` |
| Fermo da 20 s (poi ogni 28 s, 36 s…) | pensieroso, guarda la casella | 2 volte su 3 indica una casella facile (`easyMove`): `sk_try_row/col/box` con il numero + alone menta sulla casa e anello sulla casella; altrimenti `m_idle1/2`, `sk_idle1`… |
| Vittoria | festa: salti continui e cuoricini, onda sulla griglia | `sk_win1/2`, `m_cheer`; dopo 1,7 s la finestra di vittoria |
| Tocco su Hari | risatina | — |

## Risolutore a tecniche (`logicSolve`, `findStep`)
Stesso contratto del `logicSolve` di Hedgedoku (`{ ok, tech, steps }`), più `uses` (passi per tecnica) e `score`.
A ogni passo si applica la tecnica più facile disponibile, poi si riparte dalla prima:

| Tecnica | Nome | Peso nel punteggio |
|---|---|---|
| 1 | single nascosto (prima nei riquadri) | 1 |
| 2 | single nudo | 2 |
| 3 | candidati bloccati: pointing e box-line | 6 |
| 4 | coppie nude e nascoste | 10 |
| 5 | triple nude e nascoste | 16 |
| 6 | X-wing | 24 |
| 7 | swordfish, XY-wing | 32 |

Candidati e posizioni sono maschere di bit (`POS[casa][cifra]`), così un passo costa pochi microsecondi.
Un puzzle risolto da sole deduzioni ha per forza una soluzione sola.

## Generatore (soluzione prima + scavo con filtro logico, come Hedgedoku)
1. Griglia piena casuale: backtracking con MRV e cifre in ordine casuale (`countSolutions(…, 1, rnd)`).
2. Scavo a coppie simmetriche (rotazione di 180°) in ordine casuale: una coppia resta tolta solo se `logicSolve(puzzle, maxTech)` risolve ancora;
   ci si ferma al numero minimo di indizi della fascia.
3. Se la tecnica più difficile richiesta è sotto `minTech`, nuovo tentativo (massimo 60); altrimenti si tiene il più difficile trovato.
4. Controllo finale col contatore di soluzioni a backtracking (deve essere 1).

### Riuso di Hedgedoku
- Stessa strategia del generatore (soluzione prima, filtro "risolvibile con pura logica", finestra `minTech`/`maxTech` con il migliore come riserva)
  e stesso contratto del risolutore umano; il codice dei due risolutori resta separato perché le regole non hanno niente in comune
  (Hedgedoku è un "Queens" con zone e adiacenze, il sudoku ha cifre e candidati).
- **Riccio animato estratto** da `hedgedoku-ui.js` in `src/games/hog-kit.js` (`HH.hogKit.svg/at/template`), caricato da entrambi i giochi;
  Hari Sudoku carica anche `hedgedoku.css` per i token `--hog-*` e le animazioni `hh-*`. Hedgedoku è invariato (i suoi test passano).
- Stessi cuori (3, `ctx.mistake`), stesse fragoline per errori, stesso tutorial in 3 schede con SVG animati, stesso schema di salvataggio
  (`snapshot()` = stato JSON con cronologia).

## Livelli e curva di difficoltà
`tierFor(level)`: 7 fasce, 30 livelli curati e poi senza fine (fascia esperto).

| Livelli | Fascia | Tecniche (min–max) | Indizi minimi |
|---|---|---|---|
| 1–3 | facile | 1–1 (solo single nascosti) | 46 → 42 |
| 4–6 | facile | 1–2 | 40 → 36 |
| 7–10 | medio | 2–2 | 33 → 30 |
| 11–15 | medio | 3–3 (pointing / box-line) | 26 |
| 16–20 | difficile | 4–4 (coppie) | 24 |
| 21–25 | difficile | 5–5 (triple) | 22 |
| 26+ | esperto | 6–7 (X-wing, swordfish, XY-wing) | 22 |

**Semi curati** (`CURATED_SEEDS`): per ogni livello 1–30 il seme è stato scelto offline fra ~24 candidati che al primo tentativo
rispettano la fascia, prendendo il quantile giusto della fascia e imponendo che la difficoltà, ordinata per (tecnica, punteggio),
non cali mai da un livello al successivo. Risultato (indizi · tecnica · punteggio · passi per tecnica 1..7):

| L | Indizi | Tecnica | Punteggio | Passi | | L | Indizi | Tecnica | Punteggio | Passi |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 46 | 1 | 35 | 35 | | 16 | 29 | 4 | 76 | 50·2·2·1 |
| 2 | 44 | 1 | 37 | 37 | | 17 | 26 | 4 | 86 | 52·3·3·1 |
| 3 | 42 | 1 | 39 | 39 | | 18 | 26 | 4 | 93 | 51·4·4·1 |
| 4 | 40 | 1 | 41 | 41 | | 19 | 30 | 4 | 113 | 51·0·7·2 |
| 5 | 38 | 1 | 43 | 43 | | 20 | 26 | 4 | 135 | 55·0·10·2 |
| 6 | 36 | 1 | 45 | 45 | | 21 | 26 | 5 | 98 | 52·3·4·0·1 |
| 7 | 34 | 2 | 48 | 46·1 | | 22 | 29 | 5 | 132 | 50·2·6·1·2 |
| 8 | 32 | 2 | 50 | 48·1 | | 23 | 27 | 5 | 136 | 52·2·9·1·1 |
| 9 | 32 | 2 | 51 | 47·2 | | 24 | 26 | 5 | 139 | 55·0·8·2·1 |
| 10 | 30 | 2 | 52 | 50·1 | | 25 | 26 | 5 | 174 | 54·1·7·6·1 |
| 11 | 26 | 3 | 61 | 55·0·1 | | 26 | 26 | 7 | 91 | 51·4·0·0·0·0·1 |
| 12 | 26 | 3 | 67 | 55·0·2 | | 27 | 28 | 7 | 106 | 50·3·3·0·0·0·1 |
| 13 | 26 | 3 | 74 | 54·1·3 | | 28 | 29 | 7 | 126 | 52·0·2·3·0·0·1 |
| 14 | 26 | 3 | 82 | 52·3·4 | | 29 | 24 | 7 | 155 | 57·0·4·1·0·0·2 |
| 15 | 27 | 3 | 93 | 51·3·6 | | 30 | 27 | 7 | 206 | 50·4·5·3·0·1·2 |

**Varianti e senza fine**: "Nuova partita" sullo stesso livello usa la variante successiva (`seedFor(livello, variante)`), dal livello 31
il seme dipende dal livello. Sempre deterministici dal seme, a soluzione unica ed entro `maxTech`; la tecnica minima è un obiettivo
(fino a 60 tentativi, poi il più difficile trovato). Frequenza al primo tentativo: tecnica 2 ≈ 3%, 3 ≈ 8%, 4 ≈ 1,3%, 5 < 1%, 6–7 ≈ 10%:
per le fasce 4–5 una variante può uscire di una tecnica più facile del livello curato.

## Tempi (Node, JIT caldo)
- Livelli curati (un tentativo): media 1,5–2,7 ms per fascia (`npm run bench`).
- Varianti: 10–170 ms (fino a 60 tentativi da ~3 ms).

## Stato salvato
`{ v, level, variant, tier, tech, clues, puzzle, solution, board, notes, hist, moves, mistakes, hints }`:
`puzzle`/`solution` stringhe di 81 cifre, `notes` maschere di bit, `hist` = `[{ c: [[cella, valore, note], ...] }]` (max 300 mosse).
`restore()` valida struttura e coerenza (indizi = soluzione, soluzione valida) e rifiuta i salvataggi rotti; con 3 errori si ricomincia.

## Test (`tests/sudoku.test.mjs`)
- Oracolo indipendente (backtracking scritto nel test, senza maschere né codice del gioco): soluzione unica per i livelli 1–30 e per 11 semi
  di varianti e livelli senza fine.
- `logicSolve` risolve ogni livello entro la tecnica massima della fascia (e almeno la minima); livelli 1–10 coi soli single, 1–3 coi soli single nascosti.
- Ogni deduzione del risolutore è corretta rispetto alla soluzione (nessuna cifra giusta scartata, nessuna sbagliata messa).
- Difficoltà monotona (tecnica non decrescente, punteggio non decrescente a parità di tecnica), obiettivi `tierFor` monotoni fino al livello 80.
- Determinismo, ripresa da JSON con note, cronologia, errori e aiuti; salvataggi rotti rifiutati.
- Note automatiche (e annulla), errori, gomma, numeri bloccati, contatori, completamenti di riga/colonna/riquadro/numero, progresso.
- Suggerimento sempre giusto e con tecnica entro la fascia, fino alla fine della partita; prima segnala un numero sbagliato.
- Tempi di generazione (con `SLOW` = 3 in CI) e `hog-kit` condiviso.
