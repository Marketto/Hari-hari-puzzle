# Hari Airlines

Hari è l'**assistente di volo** (cappellino blu e foulard rosa) di un aereo pieno di animaletti kawaii; ai comandi
c'è il **capitano gufo**. Ogni livello è un **volo diviso in fasi**, mini-giochi in sequenza; la barra in alto mostra
la fase corrente, quelle fatte (spunta verde) e l'atterraggio finale. **Niente sconfitta**: gli errori costano solo
fragoline e sorrisi.

File: `src/games/flight-logic.js` (logica pura, `HH.flight`) · `src/games/flight-art.js` (disegni SVG, `HH.flightArt`) ·
`src/games/flight-ui.js` · `src/games/flight.css` (token `--fl-*`, tinta card `--tint-flight`) · `tests/flight.test.mjs`.
Chiave regole `r17` (per ora testo inglese `rulesEn` nel catalogo, `since: '0.18.0'`), prefisso CSS `fl-`, brano `flight` e
effetto `chime` ("ding-dong" di cabina) in `src/core/audio.js`, tutorial `tu_flight_1..4`.

## Scena
Cabina vista **di sbieco dal muso**: in alto la coda con la cucina e le tendine, in basso la cabina di pilotaggio col
capitano; file di sedili 2+2 col corridoio rosa in mezzo, una cappelliera sopra ogni coppia di sedili, finestrini con la
**tratta** del livello (mare → montagne → città → notte, a rotazione). Dai livelli 5+ una fila è l'**uscita di sicurezza**
(cartelli verdi, corridoio a strisce). Hari (riccio piccolo con cappellino e foulard) cammina nel corridoio fino alla fila
toccata; nel servizio spinge il carrello. **Tema scuro = volo notturno**: cabina prugna e finestrini stellati.

## Fasi
Ogni fase si apre con un **cartello** (icona, nome, suggerimento; **"Nuovo!"** quando la fase arriva per la prima volta).
Le fasi a tempo (imbarco, cinture, cucina, servizio, rifiuti) partono solo al tocco su **Via!** e si fermano con il
tutorial (`pause`/`resume`); alla ripresa di una partita salvata compare "Pronti?" e l'imbarco riparte da capo.

| Fase | Da | Regole |
|---|---|---|
| **Imbarco** (`board`) | 1 | Scena del portellone: i passeggeri entrano dal finestrone del pontile, da soli o a gruppi; dal livello 4 qualcuno è **nascosto dietro** un altro (spuntano le orecchie), dal 3 qualcuno **torna indietro** (fumetto con la valigia dimenticata) e rientra più tardi. Contatore facoltativo `+1`/`−`. Alla fine si sceglie fra 4 numeri quanti sono a bordo; nei livelli pari dal 6 la **lista del capitano** mostra i prenotati e si chiede **quanti mancano**. Risposta sbagliata: il numero si cancella, si riprova; **Rivedi** riproduce l'imbarco (entrambi contano come errore). Dal 4 i ritardatari corrono a bordo dopo la risposta. |
| **Bagagli** (`bags`) | 2 | Borse fuori posto nel corridoio, sui sedili liberi, sotto i piedi e (dal 5) davanti all'uscita di sicurezza (alone rosso). Le cappelliere hanno **4 spazi** e sono già in parte piene (valigie degli altri, sbiadite e fisse); zaino = 1 spazio, borsone = 2, trolley = 3. Si **trascina** la borsa sulla cappelliera oppure si tocca la borsa e poi la cappelliera (si illuminano in verde quelle dove entra). Le borse già sistemate si possono spostare di nuovo; **Annulla** torna indietro. Cappelliera troppo piena: "Non c'è posto!" (nessun errore). |
| **Cinture** (`belts`) | 1 | Segnale acceso e barra del tempo fino al decollo. Chi ha la cintura slacciata ha il sedile cerchiato e la cintura che lampeggia: si tocca per chiederle di allacciarla. I **testardi** vanno convinti con più tocchi (pallini rossi = tocchi che mancano); i **ribelli** la slacciano di nuovo una volta dopo 2–3,5 s; dal 5 un **sobbalzo buffo** (la cabina saltella con un "boing") a metà fase ne fa saltare 1–2. La fase finisce quando tutte sono allacciate e nessun ribelle o sobbalzo è in sospeso. Allo scadere si decolla comunque: Hari allaccia da sé quelle rimaste e quei passeggeri perdono il sorriso. |
| **Cucina** (`galley`) | 3 | Biglietto del capitano con la ricetta: si toccano gli ingredienti **nell'ordine** (quello successivo saltella); un ingrediente sbagliato è un errore. Fornetti (2, dal 5 tre, con tempi diversi: 3 s, 4,5 s, 6 s): tocco su un fornetto vuoto = infila un vassoio; la lancetta scorre su blu → **zona verde** → rosso; tocco nella zona verde = vassoio caldo; prima = "Ancora freddo!" (errore, resta dentro); oltre = **bruciato** (errore, si rifà). Servono tanti vassoi quanti pasti caldi saranno chiesti. |
| **Servizio** (`serve`) | 1 | Fumetti con le richieste (acqua, succo, tè, biscotto, pasto caldo, coperta, cuscino; dal 6 alcune doppie) e barra della pazienza. Si sceglie l'oggetto sul carrello e si tocca il passeggero; oggetto o persona sbagliati = errore (scuote la testa). Pazienza finita: faccina triste (perde il sorriso) ma si può ancora servire. I pasti caldi disponibili sono quelli scaldati in cucina (badge sul carrello). |
| **Rifiuti** (`trash`) | 4 | Bicchieri, bottiglie, tovaglioli, giornali, bucce e torsoli sui tavolini; si sceglie il sacco e si tocca il rifiuto prima dell'atterraggio. Livello 4: un sacco solo; 5–6: carta / plastica; dal 7 anche umido. Sacco sbagliato = errore. Allo scadere si atterra comunque: chi resta coi rifiuti perde il sorriso. |
| **Atterraggio** | — | Aereo che tocca la pista, **passeggeri felici** x/y con tutte le faccine, pulsante **Atterra!** → finestra di vittoria dell'app. |

Errori leggeri, scelta documentata: niente cuori. Ogni errore e ogni passeggero triste costano fragoline; nei primi livelli
i tempi sono larghissimi (bot lento con 0,9 s di reazione vince con ≥ 2 fragoline).

## Curva di difficoltà (`config(level)`)
| Liv. | Cabina | Pass. | Imbarco | Bagagli (spazi liberi in più) | Cinture: slacciate / testardi / ribelli / sobbalzo | Cucina | Servizio (pazienza) | Rifiuti | Tratta |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 3×4 | 7 | 1,7 s, uno alla volta | — | 3 / 1 (≤2 tocchi) / 0 | — | 4 rich., 3 oggetti, 2 insieme, 36 s | — | mare |
| 2 | 3×4 | 8 | 1,6 s, gruppi ≤2 | **Nuovo!** 3 (4) | 3 / 1 / 1 | — | 5, 4 oggetti, 33,6 s | — | montagne |
| 3 | 4×4 | 11 | 1,5 s, 1 esce | 4 (3) | 4 / 2 (≤3) / 1 | **Nuovo!** 3 ingr., 2 vassoi, 2 forni, verde 2,8 s | 6, 5 oggetti, 3 insieme, 31,2 s | — | città |
| 4 | 4×4 | 11 | 1,4 s, gruppi ≤3, nascosti, 1 ritardatario | 5 (2) | 5 / 2 / 2 | 3, 3, 2, 2,6 s | 7, 6 oggetti, 28,8 s | **Nuovo!** 5, 1 sacco | notte |
| 5 | 5×4 | 15 | 1,3 s, 2 escono | 5 (1), uscita | 6 / 3 (≤4) / 2 / 1 | 4, 3, 3 forni, 2,4 s | 8, 7 oggetti, 4 insieme, 26,4 s | 6, 2 sacchi | mare |
| 6 | 5×4 | 16 | 1,2 s, 1–3 ritardatari, «quanti mancano?» | 6 (0: incastro esatto) | 7 / 3 / 3 / 1 | 4, 4, 2,2 s | 9, 24 s, 2 doppie | 7, 2 | montagne |
| 7 | 6×4 | 20 | 1,1 s, 3 escono | 7 (0) | 8 / 4 / 3 / 1 | 5, 4, 2 s | 10, 21,6 s, 3 doppie | 8, 3 sacchi | città |
| 8 | 6×4 | 21 | 1,0 s, «quanti mancano?» | 8 (0) | 8 / 4 / 3 / 2 | 5, 5, 1,8 s | 11, 19,2 s | 9, 3 | notte |
| 10 | 6×4 | 21 | 0,8 s | 8 (0) | 9 / 4 / 3 / 2 | 6, 5, 1,4 s | 12, 14,4 s, 4 doppie | 10, 3 | montagne |

Tutti i parametri sono monotoni (test); il gradino massimo arriva al livello 10 (intervallo d'imbarco 0,8 s, zona verde 1,4 s,
pazienza 14 s minimi). Tempo delle cinture = `5 + 0,9 × tocchi × mult + 3,5 × ribelli + 3 (sobbalzo)` con `mult` da 2,4 a 1,35;
tempo dei rifiuti = `8 + 1,5 × rifiuti × mult` con `mult` da 2,6 a 1,6.

## Algoritmo (`generate(level, seed)`)
Tutto si decide alla generazione (mulberry32 dal seme); `step(s, dt)` è deterministico e lo stato è JSON puro (snapshot = stato).
- **Posti**: `pax` sedili presi a caso, specie e magliette a caso; ordine d'imbarco mescolato.
- **Imbarco**: coda dei passeggeri (tolti i ritardatari); a ogni passo entra un gruppo di 1..`gmax` oppure (se restano uscite) esce
  uno già seduto, che viene reinserito più avanti nella coda: alla fine sono a bordo esattamente `pax − ritardatari`. 4 opzioni
  (risposta + vicini ≥ 0).
- **Bagagli**: prima la **soluzione** (ogni borsa in una cappelliera con spazio, preferendo quelle già scelte per incastri
  stretti), poi gli spazi liberi in più (`slack`) sparsi, infine il resto di ogni cappelliera si riempie con valigie fisse da
  1–2 spazi. Così esiste sempre una sistemazione; dal livello 6 gli spazi liberi sono esattamente quelli che servono.
- **Cinture**: slacciate, testardi (2..`needMax` tocchi), ribelli con ritardo fisso, ordine del sobbalzo (i primi allacciati in
  un ordine fissato); il sobbalzo scatta 0,9 s dopo che metà degli slacciati ha allacciato.
- **Cucina**: ricetta = ingredienti distinti; tavolozza = ricetta + 2–5 distrattori; vassoi = pasti caldi del servizio.
- **Servizio**: richiedenti distinti; i primi `meals` chiedono il pasto caldo, poi oggetti del carrello; richieste doppie in coda;
  ordine mescolato; al massimo `active` fumetti insieme, nuovo fumetto 0,9–1,4 s dopo.
- **Rifiuti**: un rifiuto per tavolino occupato, tipi a rotazione fra quelli dei sacchi del livello.

## Fragoline, tempo, progresso
`penalty = errori + 2 × passeggeri tristi + spostamenti in più dei bagagli`; soglie `a = 1 + ⌊livello/2⌋`:
3 fragoline se `penalty ≤ a`, 2 se `≤ 2a + 3`, altrimenti 1. `parTime` = somma dei tempi tipici delle fasi.
`progress(s)` = (fasi finite + avanzamento della fase) / fasi (musica dinamica e frasi di Hari).

## Test (`tests/flight.test.mjs`)
Oracoli indipendenti: conteggio dell'imbarco ricostruito dagli ingressi/uscite visibili (ognuno entra una volta, chi esce
rientra), **risolutore a backtracking** dei bagagli sulle capienze libere, sacchi giusti da una tabella scritta nel test.
Bot con reazioni umane (un'azione ogni 0,55 s, legge solo ciò che è disegnato) vince i livelli 1–14 su più semi senza timeout,
senza pazienza finita né vassoi bruciati, con 3 fragoline; bot lento (0,9 s) vince i livelli 1–10. Inoltre: curva monotona,
fasi e "Nuovo!" ai livelli giusti, determinismo, ripresa da JSON a metà del servizio (stessi eventi), errori che abbassano le
fragoline senza far perdere, generazione < 10 ms, nessun colore letterale nei file JS. Blocco anche in `tools/selftest.mjs`.

## Aereo
Di lato (card della home e scena dell'atterraggio, `plane()` in `flight-art.js`) il muso è a sinistra: ali e piano di
coda sono **a freccia all'indietro** (le punte stanno più verso la coda della radice), la deriva è inclinata verso la
coda. L'icona della fase di atterraggio è vista dall'alto, muso in giù, con la stessa freccia.
