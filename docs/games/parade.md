# Hari Parade

Gioco in tempo reale tipo Snake: Hari guida una sfilata in un giardino. Ogni frutto mangiato fa unire in coda
un riccetto (con un fiocchetto colorato), e la fila saltella a tempo dietro di lui.

## Regole
- La sfilata avanza da sola; tu scegli la direzione (swipe, frecce/WASD o la croce sotto il prato).
- Mangia i frutti (fragola, mela, mirtilli, pesca, ciliegie, arancia): +1 frutto e un riccetto in più in coda.
- Non urtare la siepe (il bordo), gli ostacoli (vasi di tulipani, sassi, funghi) o la tua stessa fila.
  Inseguire la propria coda è lecito: la coda si sposta nello stesso passo (a meno che la fila stia crescendo).
- **Scontro = un cuore** (3 cuori). La sfilata riparte dal **cancello fiorito** a sinistra con la stessa lunghezza:
  Hari esce con un riccetto e gli altri rientrano in fila uno per passo. Prima di ripartire c'è la pausa "Pronti?… Via!".
  I frutti già mangiati restano. A cuori finiti la partita è persa (finestra "cuori finiti" dell'app).
- Si vince mangiando l'obiettivo del livello.
- Oggetti speciali (dal livello 2, 20% di probabilità dopo ogni frutto, uno alla volta, spariscono dopo 34 passi
  e lampeggiano negli ultimi 9):
  - **Stellina**: vale 2 frutti per l'obiettivo, senza allungare la fila.
  - **Orologio**: rallenty al 60% della velocità per 22 passi (~6 s); il prato si tinge di menta e nella barra compare un timer.
- Combo: frutti mangiati a meno di `cols + rows` passi l'uno dall'altro → "Combo ×N" (solo festa, nessun effetto sul punteggio).

## Fragoline
3 senza scontri, 2 con uno, 1 oltre. Tempo di riferimento (`parTime`) ≈ `goal × (cols + rows) × 0,55 / velocità + 6` s.

## Difficoltà (`config(level)`)
| | Livello 1 | 4 | 8 | 12 | 16+ |
|---|---|---|---|---|---|
| Prato | 9×10 | 10×11 | 11×12 | 11×12 | 11×12 |
| Frutti da mangiare | 8 | 14 | 22 | 30 | 30 |
| Velocità (celle/s) | 3,4 | 4,15 | 5,15 | 6,15 | 7,15 (max 7,5) |
| Ostacoli | 0 | 3 | 7 | 11 | 14 (max) |
| Oggetti speciali | no | sì | sì | sì | sì |

La fila più lunga (3 + obiettivo) occupa sempre meno del 35% delle celle libere.

## Generatore e garanzie
`src/games/parade-logic.js`, puro e deterministico: `newLevel(level, rnd)` usa `rnd` per il prato e per un seme interno;
da lì in poi il generatore vive nello stato (`rs`, mulberry32), quindi lo stato è JSON puro e la partita è riproducibile
anche dopo un salvataggio.

- **Ostacoli**: mai sul bordo esterno, mai attaccati tra loro (nemmeno in diagonale), mai nella corsia del cancello
  (riga centrale, prime 8 celle, più le celle sopra e sotto le prime 4). Ogni ostacolo viene accettato solo se
  `validLayout` resta vero: **tutte le celle libere connesse** e **ognuna con almeno 2 vicine libere** (niente vicoli ciechi).
- **Frutto e oggetti**: su una cella libera (non fila, non ostacolo, non sull'altro oggetto, non sulle celle di ripartenza)
  **raggiungibile dalla testa** con BFS che tratta la fila come muro (tranne la coda, che si sposta). Si preferiscono celle
  ad almeno 3 passi dalla testa e non in una tasca chiusa dalla fila.
- **Input**: `turn(s, dir)` accoda fino a 2 svolte; rifiuta la stessa direzione e l'**inversione a 180°** rispetto
  all'ultima direzione in coda (due svolte rapide "su, poi sinistra" sono lecite e si eseguono in due passi).
- **Tempo**: `advance(s, dt)` gestisce la pausa "Pronti?" (1,6 s), la velocità (col rallenty) e chiama `step`;
  `frac(s)` dà la frazione di cella per l'interpolazione grafica.

## Test (`tests/parade.test.mjs`)
Oracolo indipendente (BFS e simulatore del serpente scritti nel test):
- prato connesso e senza vicoli ciechi, corsia libera: livelli 1–20 × 60 semi, quasi tutti gli ostacoli piazzati;
- un **bot sfilata** (BFS al frutto + controllo "dopo il percorso la testa raggiunge ancora la coda") vince ogni livello
  1–20 (10 partite ciascuno); a ogni comparsa di frutto si verifica che sia libero e raggiungibile; ≥ 95% partite senza scontri;
- collisioni con bordo, ostacolo, fila; coda che si sposta; crescita;
- tre scontri = sconfitta; fragoline; coda di input senza 180° anche con 3000 passi di tasti casuali;
- stellina, orologio, scadenza oggetti; "Pronti?" e velocità reale;
- determinismo e ripresa da JSON a metà partita; difficoltà monotona; `newLevel` < 10 ms (in pratica < 1 ms).
`tools/selftest.mjs` (`npm run bench`) controlla 4 gradini di prato.

## Interfaccia (`parade-ui.js`, `parade.css`)
- **Rendering**: DOM + `transform` (strati compositi). Il prato è un SVG statico su uno strato proprio (dipinto una volta);
  i personaggi sono elementi con SVG inline spostati con `translate3d` a ogni fotogramma, interpolando tra cella
  precedente e cella attuale (la logica avanza a passi interi). Niente animazioni continue *dentro* gli SVG dei personaggi
  (ridipingerebbero ogni riccetto a ogni fotogramma): l'occhiolino è gestito da JS, un personaggio alla volta.
- **Controlli**: swipe sul prato (anche a catena senza alzare il dito, soglia ~mezza cella), frecce/WASD,
  croce direzionale compatta (sinistra/destra alte, su/giù al centro), Spazio/P o il tasto nella barra = pausa.
- **Pausa**: automatica quando la pagina si nasconde (`visibilitychange`); il ciclo si ferma da solo se la schermata
  viene chiusa (`!el.isConnected`, rimuove anche gli ascoltatori). Ripresa da salvataggio = in pausa, tocca per ripartire
  (con un breve "Pronti?").
- **Annulla**: in tempo reale non ha senso tornare indietro; il tasto "Annulla" dell'app mette in pausa / riprende.
- **Salvataggio**: `snapshot()` = stato della logica; `ctx.changed()` dopo ogni frutto, oggetto, scontro e pausa
  (l'app salva anche ogni 5 s e quando la pagina va in background).

### Animazioni
Riccetti che saltellano a turno a tempo coi passi (con schiacciamento all'atterraggio), Hari e i riccetti che guardano
nella direzione di marcia, frutti con faccina che pulsano con alone e scintille, oggetti che ruotano/ticchettano e
lampeggiano prima di sparire; mangiando: scintille, cuoricini, "+1", occhi felici e bocca aperta, nuovo riccetto che
"spunta" in coda, contatore che rimbalza; combo con scritta; scontro: scossa del prato, stelline, occhi a spirale
e riccetti che vacillano, "Ahia!"; "Pronti?… Via!" a inizio livello e a ogni ripartenza; vittoria: tutta la fila
salta a onda con stelle e cuori. Ambiente: fiorellini che ondeggiano, tulipani nei vasi, arco fiorito che respira,
nuvole e sole nella barra-cielo, petali che cadono; **tema scuro** = giardino di notte con luna e lucciole.
`prefers-reduced-motion`: niente saltelli, scossa, particelle, petali, lucciole e animazioni CSS.

### Colori
Solo token `--pa-*` definiti in `parade.css` per tema chiaro e scuro (più `--tint-parade` per la card).

## Musica e suoni
Brano `parade` (`src/core/audio.js`): marcetta saltellante pluck + marimba a 126 bpm in Fa, gli strati entrano con i frutti.
Effetti: `place` (frutto), `cupDone` (combo ≥ 3 e vittoria), `star` (stellina), `lightOn` (orologio), `blip` ("Pronti?"),
`milestone` ("Via!"), `tap` (croce), `set` (ripresa); lo scontro usa `ctx.mistake` (suono e cuore dell'app).

## Testi (i18n)
Regole `r6`; chiavi `pa_*` con fallback inglese nel codice (`label(k, en)`), da aggiungere a `locales.js`.
