# Hari Escape

Escape room kawaii: Hari è chiuso in una **casetta**, un **castello**, una **nave** o un **laboratorio** (tema a
rotazione col livello) e deve uscire. Ogni livello ha **1–3 stanze** collegate da porte e **3–10 enigmi** generati dal
seme, sempre diversi. Niente di pauroso (anche la stanza buia è un cielo prugna con le stelline) e **niente sconfitta**.
Tutti gli enigmi sono **visivi e senza parole**: colori + forme (6 "gemme": cuore rosso, stella gialla, foglia verde,
goccia blu, luna viola, fiore arancione), cifre, simboli, giocattoli.

File: `src/games/escape-logic.js` (logica pura, `HH.escape`) · `src/games/escape-art.js` (disegni SVG, `HH.escapeArt`) ·
`src/games/escape-ui.js` · `src/games/escape.css` (token `--er-*`, tinta card `--tint-escape`) · `tests/escape.test.mjs`.
Chiave regole `r18` (per ora testo inglese `rulesEn` nel catalogo, `since: '0.19.0'`), prefisso CSS `er-`, brano `escape`
ed effetto `unlock` in `src/core/audio.js`, tutorial `tu_escape_1..3`.

## Come si gioca
- **In alto**: frecce e pallini delle stanze (si torna indietro quando si vuole), lucchetto con `risolti/totale` e barra,
  **lampadina** degli aiuti (col numero di aiuti chiesti).
- **La stanza** (SVG 400×300, stesse proporzioni a schermo intero): muro con 4 posti (quadri, poster, orologi, pannelli,
  finestra), 3 mobili sul pavimento, 2 vasi davanti, il tappeto, la porta a destra (cartello verde con freccia e stellina =
  **uscita**; cartello con i pallini = porta verso la stanza successiva). Il dispositivo disegnato sul contenitore dice che
  cosa serve (rotelle con i pallini colorati, tasti colorati, buco della serratura del colore della chiave, leve…).
- **Tocco su un oggetto**: i nascondigli si aprono sul posto (tappeto che si arrotola, vaso che si rovescia, pianta che si
  sposta, quadro che ruota, cuscino della poltrona che si alza) e mostrano cosa c'è (o niente: alcuni sono finti); mobili,
  pannelli e indizi appesi si aprono in uno **zoom** (stesso riquadro della stanza: il gioco non cambia altezza).
- **Borsa** in basso: si tocca un oggetto per prenderlo in mano e poi si tocca dove usarlo; due oggetti toccati uno dopo
  l'altro si **combinano**; i **biglietti** si guardano toccandoli. Con lo zoom aperto su un contenitore che vuole un oggetto,
  toccare l'oggetto della borsa lo usa subito lì. In una stanza buia toccare la torcia accesa illumina la stanza.
- Un contenitore risolto si apre e mostra il premio (si tocca per metterlo in borsa); la porta aperta porta alla stanza
  successiva; l'uscita aperta fa scappare Hari (saltella verso la porta luminosa e ci sparisce dentro) → vittoria.
- Tastiera: frecce nel labirinto, `Esc` chiude lo zoom. `prefers-reduced-motion`: niente animazioni continue.

## Tipi di enigma (sbloccati coi livelli)
| Tipo | Da | Contenitore | Regola | Indizio |
|---|---|---|---|---|
| `paint` | 1 | cassaforte / baule | rotelle 0–9 con una gemma sopra ciascuna | quadro con le cifre dentro cerchi del colore della gemma (dal 3 una gemma in più, di disturbo) |
| `key` | 1 | armadietto / scrivania / baule / porta | serve la chiave col fiocco della stessa gemma | — (la chiave è nascosta o in un altro contenitore) |
| `colors` | 1 | baule / armadietto / porta | tasti colorati da premere in ordine (sbagliato → si azzera) | quadro coi palloncini colorati e la freccia di lettura |
| `slide` | 2 | scatolina sullo sgabello | puzzle a scorrimento (2×3 poi 3×3) col disegno in miniatura nell'angolo | — |
| `count` | 2 | baule / cassaforte | rotelle con le gemme | poster di formine sparse: conta quante di ogni gemma (1–4, dal 5 fino a 6) |
| `levers` | 3 | pannello a muro | leve su/giù | disegno con le leve nella posizione giusta |
| `books` | 3 | scrivania / cassaforte | rotelle con le gemme | libri colorati con una cifra sul dorso |
| `balance` | 3 | bilancia | metti sul piatto i pesi (numero + pallini) che pareggiano il pacco | — (dall'8 un peso manca: va trovato, e senza non si pareggia) |
| `maze` | 4 | vassoio-labirinto | porta la pallina al buco con le frecce | — |
| `simon` | 4 | xilofono | suona le note | spartito con le note colorate (altezza = barra più acuta/grave) |
| `lights` | 5 | pannello a muro | ogni lampadina cambia sé e le vicine: accendile tutte | — |
| `clock` | 5 | baule / scrivania | rotelle con le gemme | orologi con la cornice colorata: l'ora della lancetta corta (1–9) |
| `fish` | 5 | tombino con la grata | serve la **canna** = filo + calamita (da combinare) | — |
| `pipes` | 6 | pannello a muro | ruota i tubi finché l'acqua arriva al fiore | — |
| `mirror` | 6 | pannello a muro | gira gli specchi `/` `\` finché il raggio colpisce il cristallo | — |
| `cipher` | 7 | cassaforte / scrivania | rotelle senza gemme, da leggere da sinistra a destra | messaggio di simboli (lavagna o biglietto) + tabella simbolo → cifra (6 simboli, dal 10 otto) |
| `dark` | 7 | la stanza intera | stanza buia: serve la **torcia accesa** = torcia + pila (trovate in stanze precedenti) | icona della torcia nel buio |
| `shadow` | 8 | schermo con la lampada | tocca i giocattoli nell'ordine delle ombre (dal 12 alcune ombre sono specchiate) | — |

Gli enigmi a indizio possono avere l'indizio appeso al muro **oppure** su un **biglietto** (la foto dell'indizio) chiuso in
un altro contenitore o in un nascondiglio: è questo che crea le catene. In una stanza non ci sono mai due lucchetti della
stessa famiglia (rotelle colorate: paint/count/books/clock; sequenze: colors/simon), così un indizio non si confonde con
un altro.

## Generazione (`generate(level, rnd, avoid)`)
**All'indietro dalla porta** (strategia "soluzione prima"), stanza per stanza:
1. Si divide il numero di enigmi fra le stanze (la stanza buia ha in più l'enigma `dark`).
2. La radice di ogni stanza è la **porta** (l'uscita nell'ultima): un tipo adatto a una porta (cifre, colori, chiave,
   leve, lampadine) e, se la stanza ha altri enigmi, con almeno un ingresso.
3. Finché ci sono enigmi da piazzare si sceglie un **ingresso aperto** (preferendo gli oggetti) e gli si attacca un nuovo
   enigma che lo **contiene** (la chiave, il filo, la calamita, il peso o il biglietto con l'indizio); gli ingressi del nuovo
   enigma si aggiungono a quelli aperti. Il tipo si sceglie con pesi: mai due volte nello stesso livello (finché il
   repertorio basta), meno probabile se era nel livello precedente (`avoid` = tipi della partita appena giocata), molto
   probabile se è stato appena sbloccato; e solo tipi che lasciano almeno un ingresso aperto se restano enigmi da piazzare.
4. Gli ingressi rimasti diventano **fonti libere**: indizi appesi al muro (se il muro è pieno, biglietto nascosto) e oggetti
   nei nascondigli (tappeto e vasi più spesso). Dal livello 8 il 35% delle fonti sta in una **stanza precedente** (si torna
   indietro); torcia e pila della stanza buia sono sempre in stanze precedenti.
5. Posti: contenitori sul pavimento (F) o al muro (W), indizi al muro, nascondigli; poi arredo senza doppioni (finestra,
   mensola, festoni, quadretto con Hari, lampada, pianta, poltrona-nascondiglio vuota, tappeto e vasi finti).
6. **Simulazione del grafo** (`simulate`): partendo dalla stanza 1 si risolve ogni enigma i cui oggetti sono raggiungibili
   (stanza aperta e illuminata, nascondiglio o contenitore già aperto, pezzi da combinare), gli indizi visibili e la stanza
   accessibile; se tutto si risolve si ottiene l'**ordine di soluzione**, altrimenti si rigenera (fino a 40 tentativi, poi
   ripiego sicuro). Il grafo è aciclico per costruzione: ogni fonte sta in una stanza ≤ di chi la usa ed è creata dopo.

Sotto-puzzle (tutti **mai già risolti** all'inizio):
- **scorrimento**: dalla soluzione, `d` mosse casuali della casella vuota senza tornare indietro (generazione inversa);
- **lampadine**: da tutte accese si premono `k` caselle diverse;
- **tubi**: cammino casuale senza incroci da sinistra a destra (DFS), tubi I/L sul cammino, a caso fuori (T dalle griglie
  da 12 caselle); rotazioni mescolate finché l'acqua non arriva;
- **labirinto**: labirinto perfetto (DFS), buco nella casella più lontana dalla partenza;
- **specchi**: raggio con `turns` svolte, specchio su ogni svolta, 1–2 specchi esca fuori dal cammino; almeno uno girato male;
- **bilancia**: pesi distinti 1–7, un sottoinsieme fa il pacco (≤ 14); col peso mancante nessun sottoinsieme senza di lui pareggia;
- **sequenze**: mai due uguali di fila; ripetizioni non consecutive dal livello 6.

Ripresa: lo stato salvato contiene solo `level`, `seed`, `avoid` e cosa è stato fatto (`solved`, `open`, `taken`, `used`,
`inv`, `ps` = stato di ogni sotto-puzzle, stanza corrente, aiuti, mosse, secondi): il livello si rigenera identico dal seme.

## Curva di difficoltà (`config(level)`)
"Mosse minime" = azioni di un giocatore che segue sempre la strada giusta (anche andare in un'altra stanza, sollevare,
raccogliere, combinare); media su 20 semi.

| Liv. | Stanze | Enigmi | Cifre | Sequenza (tasti) | Scorrimento | Labirinto | Tubi | Specchi (svolte) | Stanza buia | Mosse minime | par (s) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | 3 | 3 | 3 (4) | 3×2, 8 | — | — | — | — | 19 | 100 |
| 2 | 1 | 3 | 3 | 3 (4) | 3×2, 8 | — | — | — | — | 20 | 135 |
| 3 | 2 | 4 | 3 | 3 (4) | 3×2, 8 | — | — | — | — | 28 | 158 |
| 4 | 2 | 5 | 3 | 4 (4) | 3×3, 10 | 4×4 | — | — | — | 41 | 180 |
| 5 | 2 | 6 | 3 | 4 (5) | 3×3, 13 | 4×4 | — | — | — | 48 | 218 |
| 6 | 3 | 6 | 4 | 4 (5) | 3×3, 16 | 5×5 | 3×3 | 4×4 (2) | — | 61 | 254 |
| 7 | 3 | 7 | 4 | 4 (5) | 3×3, 19 | 5×5 | 3×3 | 4×4 (2) | 70% | 79 | 275 |
| 8 | 3 | 8 | 4 | 4 (5) | 3×3, 22 | 5×5 | 3×3 | 4×4 (2) | 80% | 83 | 299 |
| 10 | 3 | 9 | 4 | 5 (6) | 3×3, 28 | 6×6 | 4×3 | 5×5 (3) | 80% | 103 | 327 |
| 12 | 3 | 10 | 4 | 5 (6) | 3×3, 34 | 7×7 | 4×3 | 5×5 (3) | 95% | 106 | 348 |
| 15+ | 3 | 10 | 4 | 5 (6) | 3×3, 36 | 7×7 | 4×4 | 5×5 (4) | ~80% | 115–121 | ~350 |

Altri parametri: leve 3 → 5, lampadine 3×2 (2 tocchi) → 3×3 (4), bilancia 3 → 5 pesi e 2 → 3 da scegliere (peso mancante
dall'8), ombre 2 → 3 fra 4 → 6 giocattoli (specchiate dal 12), conteggi fino a 4 poi 6, simboli 6 → 8; livello 1: indizi già
nell'ordine delle rotelle; indizi di disturbo dal 3. `diffOf(level)` riassume tutto in un punteggio **monotono** (test).
Varietà: in un livello i tipi sono tutti diversi; fra livelli consecutivi (con `avoid`) si ripete in media ~37% dei tipi.

## Aiuti e fragoline
La lampadina calcola il **prossimo passo** (`next(s)`: il primo enigma non risolto nell'ordine di soluzione e, se manca
qualcosa, come procurarselo: andare in un'altra stanza, cercare in un nascondiglio, raccogliere, combinare, usare):
- **1° tocco = aiuto vago**: cornice tratteggiata pulsante sull'oggetto giusto (o sulla freccia della stanza, o sugli oggetti
  della borsa da usare/combinare);
- **2° tocco sullo stesso passo = aiuto preciso**: manina sull'oggetto; per gli enigmi si apre lo zoom con la guida
  (`guide(s, pid)`): cifre fantasma accanto alle rotelle, prossimo tasto/nota/giocattolo cerchiato, leve/specchi/tubi da
  girare cerchiati, lampadine da premere, tessera da far scorrere (A* sul momento), percorso del labirinto a puntini, pesi
  giusti; si evidenziano anche gli indizi. Ritoccare la lampadina sullo stesso passo non costa di nuovo.

**Fragoline** = 3 − ⌊(aiuti vaghi + 2 × aiuti precisi) / 2⌋ − 1 se il tempo di gioco supera il doppio di `parTime`; minimo 1
(due aiuti vaghi o uno preciso costano una fragolina). Il tempo conta solo con la partita visibile e senza finestre aperte;
il punteggio dell'app aggiunge il solito bonus se si finisce prima di `parTime` (somma dei secondi di riferimento dei tipi
di enigma + 15 s a stanza + 20 s). Gli errori (sequenza sbagliata, oggetto usato nel posto sbagliato, combinazione
impossibile) fanno solo scuotere l'oggetto: niente sconfitta. Annulla non fa nulla (in una escape room non serve).

## Test (`tests/escape.test.mjs`)
- **Bot esploratore indipendente**: usa solo ciò che il giocatore vede (oggetti delle stanze raggiunte e illuminate, indizi
  appesi o sui biglietti in borsa, parametri visibili dei contenitori) e regole scritte nel test (legge le cifre dal quadro,
  dai libri, dagli orologi, conta le formine, decodifica il messaggio con la tabella, legge palloncini/spartito/leve), prova
  gli oggetti sui contenitori e combina tutto con tutto; risolve i sotto-puzzle con risolutori propri (IDA\* per lo
  scorrimento, sottoinsiemi per lampadine e bilancia, DFS per i tubi, BFS per il labirinto, forza bruta per gli specchi).
  Esce da ogni livello 1–20 con 6 semi, risolvendo **tutti** gli enigmi, senza aiuti, con 3 fragoline.
- Grafo delle dipendenze ricostruito dai dati: aciclico, ogni enigma serve all'uscita, fonti in stanze ≤ di chi le usa
  (torcia e pila in stanze precedenti alla stanza buia).
- Sotto-puzzle risolvibili e mai già risolti; il peso mancante serve davvero; indizi leggibili (cifre 0–9, conteggi entro il
  massimo, ore 1–9, formine mai sovrapposte), nei livelli < 8 nella stessa stanza; mai due oggetti nello stesso posto.
- Varietà (tipi diversi nel livello, < 45% di ripetizioni fra livelli consecutivi, semi diversi = livelli diversi, ogni tipo
  nuovo compare nel suo livello), determinismo, ripresa da JSON a metà partita, aiuti che da soli portano all'uscita e
  costi in fragoline, mosse non valide, generazione < 10 ms, solo token CSS nei disegni.
