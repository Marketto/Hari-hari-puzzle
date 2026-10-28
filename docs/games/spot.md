# Hari Spot (`spot`)

Trova le differenze: due illustrazioni kawaii quasi uguali, di **città** o di **bosco**, generate da seme componendo oggetti.
Tocca una differenza su una delle due scene e viene cerchiata su entrambe.

File: `src/games/spot-logic.js` (logica pura, `HH.spot`) · `src/games/spot-art.js` (disegni SVG, `HH.spotArt`) ·
`src/games/spot-ui.js` (interfaccia, registrazione) · `src/games/spot.css` (token `--sd-*`) · `tests/spot.test.mjs` ·
blocco in `tools/selftest.mjs`.

## Regole (chiave `r16`)
- Le due scene (A sopra, B sotto; affiancate a schermo intero in orizzontale e sugli schermi larghi) differiscono in **N** punti.
- Un tocco dentro la zona di una differenza (su A o su B) la trova: cerchietto su tutte e due le scene, stelline e pallino pieno in alto.
- Un tocco a vuoto mostra una piccola ✕. **Niente cuori** (scelta voluta: nessuna sconfitta, nessuna frustrazione):
  - livelli 1–3: gli errori non costano nulla;
  - dal livello 4: ogni tocco a vuoto toglie 4 s al tempo di riferimento (meno bonus) e ogni 3 tocchi a vuoto una fragolina;
  - tre tocchi a vuoto entro 2,5 s: la scena "trema" e i tocchi si fermano per 1,2 s (scoraggia il tocco a raffica).
- **Lente** (pulsante in alto a destra): evidenzia per 3 s una zona più larga attorno a una differenza non trovata (prima quelle mai indicate).
  1 lente fino a 4 differenze, 2 fino a 7, 3 oltre. Ogni lente costa una fragolina.
- Si vince trovando tutte le differenze.

## Comandi
| Gesto | Effetto |
|---|---|
| Tocco / clic | cerca una differenza in quel punto |
| Pizzico su una scena | zoom fino a 3× (le due scene si muovono insieme) |
| Trascina (con zoom) | sposta la vista |
| Rotella del mouse | zoom sul punto indicato |
| Pulsante lente-meno / "Annulla" | torna a 1× (le differenze trovate non si annullano) |

Le scene hanno `touch-action: pan-y` a 1× (la pagina scorre ancora) e `none` quando sono ingrandite.

## Scene
Riquadro 400×280; ogni oggetto è `{ id, t, x, y, s, f, r, c, c2, c3, v }` con appoggio in basso al centro (vedi l'intestazione di `spot-logic.js`).
- **Città** (livelli dispari): fila di case (muro, tetto, porta, 2 finestre), palazzi (6 finestre), negozi (tenda a righe, insegna con icona
  torta/pesce/fiore/libro/tazza/stella); marciapiede con lampioni, semafori, alberelli, panchine, vasi di fiori, idranti, bancarella
  di frutta, cartelli; gatti sui tetti piatti; auto su due corsie; nuvole, uccellini, palloncino.
- **Bosco** (livelli pari): fila di alberi (con mele) e pini; laghetto con anatra; funghi (a pois o no), fiori, sassi, cespugli con bacche,
  coniglio, volpe, tronco; nuvole, uccellini, farfalle.
- **Hari** c'è sempre (mini mascotte) e non è mai una differenza.
- **Stagioni** (primavera, estate, autunno, inverno con neve su tetti e chiome) e **ora** (giorno, tramonto, notte con luna, stelle,
  finestre e lampioni accesi) cambiano i token di cielo/terra tramite le classi `sd-<stagione>` e `sd-<ora>` sull'SVG.
  Livello 1: primavera di giorno; livelli 1–2 sempre di giorno.
- Stile: contorno prugna `--sd-ink`, riflessi bianchi, guance rosa, facce (contenta / addormentata / stupita). Colori solo da token:
  tavolozza `--sd-c-*` (20 colori), più i token di scena; tema scuro con cielo e prato un po' più profondi.

## Tipi di differenza
| Tipo | Cosa cambia in B | Area "visibile" usata per la soglia |
|---|---|---|
| `remove` | l'oggetto manca | riquadro dell'oggetto |
| `add` | c'è un oggetto nuovo (nuvola, uccellino, palloncino, vaso, idrante, fungo, fiore, sasso, tronco, farfalla) in uno spazio libero | riquadro |
| `color` | colore del corpo, del tetto, della porta, della tenda o dei frutti | riquadro della parte colorata |
| `size` | ×1,5 → ×1,28 (o il contrario) | riquadro minore × 2 × (k − 1) |
| `flip` | specchiato (auto, negozio, gatto, uccellino, anatra, coniglio, volpe) | riquadro × 0,6 |
| `move` | spostato in orizzontale di 38–55 unità, in uno spazio libero | riquadro |
| `tilt` | inclinato di 24–32° (vaso, lampione, cartello, fungo, fiore) | riquadro × 0,5 |
| `detail` | finestra accesa/spenta, icona dell'insegna, frutti/mele/bacche (±2–3), semaforo, lampione acceso, faccia di un animale, pois del fungo, forma del cartello | parte × fattore di contrasto (0,8–1,6) |

Vincoli di ogni differenza (in `tryDiff`/`tryAdd`):
1. **visibile**: area sopra `minArea(livello)`; parte cambiata almeno all'85% dentro la scena e coperta al massimo al 22% dagli oggetti
   disegnati davanti, sia in A sia in B; colori a distanza CIELAB ≥ `minDE`;
2. **non sovrapposta**: la zona (cerchio) non tocca le altre (distanza fra i centri ≥ somma dei raggi + 4);
3. **un oggetto, una differenza** e varietà: al massimo metà delle differenze dello stesso tipo, e lo stesso tipo di oggetto al massimo
   una volta (due da 7 differenze in su);
4. **hitbox generosa**: raggio = 0,42 × diagonale del riquadro cambiato + 4, minimo 30 unità (≈ 46 px di diametro con la scena larga 312 px),
   massimo 64 (84 per gli spostamenti, che coprono la posizione vecchia e la nuova).

Se una scena non riesce a ospitare N differenze valide se ne genera un'altra (in pratica succede ~1 volta su 10 al livello 2).

## Curva di difficoltà (`paramsFor`)
| Livello | Differenze | Area minima | ΔE minimo | Tipi |
|---|---|---|---|---|
| 1–2 | 3 | 1400 → 1190 | 45 | manca, aggiunto, colore |
| 3–4 | 4 | 1011 → 860 | 45 → 34 | + dimensione, + specchiato |
| 5–6 | 5 | 731 → 621 | 34 | + dettaglio, + spostato |
| 7–8 | 6 | 528 → 449 | 34 → 26 | colori più vicini (sceglie fra i 2 più simili ammessi) |
| 9–10 | 7 | 381 → 324 | 26 | + inclinato |
| 11–12 | 8 | 300 | 26 | |
| 13–15 | 9 | 300 | 26 | |
| 16+ | 10 | 300 | 26 | |

Densità della scena `d = (livello − 1) / 14`: più edifici e più stretti, più arredo, auto, uccellini; oggetti in media da ~14 (livello 1)
a ~29 (livello 20). Il fattore di dimensione scende da 1,5 a 1,28 e lo spostamento da 48 a 38 unità.

## Fragoline e tempi
- `rate`: 3 − lenti usate − (dal livello 4) ⌊tocchi a vuoto / 3⌋, minimo 1.
- `parTime`: 20 s + 12 s a differenza, meno 4 s per tocco a vuoto dal livello 4.
- `progress`: differenze trovate / N (guida la musica `spot`: marimba e carillon, passo di passeggiata, percussioni "lullaby").

## Salvataggio
`snapshot()` = `{ v: 1, level, seed, n, found, hints, hinted, misses, moves }`: la scena si rigenera identica da `level` + `seed`
(`HH.rng`), quindi il salvataggio è piccolo. `restore` scarta indici fuori scala.

## Test (`tests/spot.test.mjs`)
- **Oracolo indipendente**: confronta per id le liste di oggetti di A e B e ricava da sé le differenze (solo in A, solo in B, campi cambiati);
  devono essere esattamente N, una per oggetto, e coincidere per id e tipo con quelle dichiarate (livelli 1–20 × 12 semi).
- Zone: raggio ≥ 30, dentro la scena, mai sovrapposte, vicine all'oggetto cambiato (per gli spostamenti: il centro dell'oggetto, prima e dopo, è dentro la zona).
- Visibilità: area ≥ soglia del livello (≥ 1100 ai livelli 1–2); colori riletti **dal CSS** (tema chiaro e scuro) con ΔE ≥ 40 nei
  livelli 1–3 e ≥ 22 dopo; oggetti interi coperti al massimo al 30% (calcolo dell'oracolo); oggetti aggiunti in spazio libero; Hari sempre uguale.
- Tocchi: 8 punti a 0,9 r dentro ogni zona contano, una griglia di punti fuori da tutte no; una differenza conta una volta sola.
- Determinismo, varietà fra semi, alternanza città/bosco, ripresa da JSON, monotonia della curva (40 livelli), fragoline/lente, tempo medio < 10 ms (×3 in CI).
- Tempo medio di `generate` in Node: 1–5 ms.
