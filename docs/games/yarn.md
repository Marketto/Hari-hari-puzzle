# Yarn Link

Puzzle in stile "Flow / Numberlink" con gomitoli-gattino e fili di lana.
File: `src/games/yarn-logic.js` (logica pura, `HH.yarn`), `src/games/yarn-ui.js` (UI), `src/games/yarn.css` (stile, token `--yl-*`),
test: `tests/yarn.test.mjs`, blocco in `tools/selftest.mjs`.

## Regole (chiave `r9`)
- Sulla griglia ci sono coppie di gomitoli dello stesso colore.
- Collega ogni coppia con un filo fatto di passi orizzontali e verticali.
- I fili non si incrociano e non si sovrappongono.
- Si vince quando **tutte** le coppie sono collegate **e tutte** le caselle sono coperte.
  Se le coppie sono tutte collegate ma restano buchi, compare "Fill every square!" (`yl_fill`) e le caselle vuote pulsano.

## Comandi
| Gesto | Effetto |
|---|---|
| Trascina da un gomitolo | il filo di quel colore riparte da lì e si srotola casella per casella |
| Trascina da un filo già steso | il filo si accorcia fino a quel punto e prosegue da lì |
| Torna indietro sul filo | il filo si riavvolge |
| Passa sopra un altro filo | l'altro filo viene tagliato prima del punto d'incrocio |
| Arriva sul gomitolo gemello | filo chiuso: i due micini fanno festa ("Meow!", scintille, salto) |
| Parti dall'altro gomitolo quando c'è già un pezzo di filo | se raggiungi il pezzo, i due pezzi si uniscono |
| Tocco su un filo (o sul suo gomitolo) | cancella il filo |
| Tastiera | frecce = cursore (o filo preso) · Invio/Spazio = prendi/lascia · Canc/Backspace = cancella · Esc = annulla il tratto |

Gomitoli non attraversabili: un filo si ferma sui gomitoli di altri colori e, una volta chiuso, non va oltre.
Le regole del disegno sono funzioni pure testate in Node: `beginStroke`, `extend`, `strokeStep`, `strokePaths`, `applyStroke`, `lostCells`.

## Curva di difficoltà
`sizeFor(level)`: 1–2 → 5×5 · 3–5 → 6×6 · 6–9 → 7×7 · 10–14 → 8×8 · 15+ → 9×9.
`colorsFor(level)`: a parità di griglia i colori calano (fili più lunghi = più difficile). Il generatore può aggiungerne 1–2 per l'unicità.

Misure (40 semi, Node; "nodi" = nodi del risolutore per dimostrare l'unicità):

| Livello | Griglia | Colori target | Colori medi | Lunghezza media filo | Nodi medi | ms medi |
|---|---|---|---|---|---|---|
| 1 | 5×5 | 5 | 4.6 | 5.4 | 22 | 1.1 |
| 2 | 5×5 | 4 | 4.1 | 6.1 | 23 | 0.7 |
| 3 | 6×6 | 6 | 5.8 | 6.2 | 35 | 0.6 |
| 4 | 6×6 | 5 | 5.1 | 7.0 | 39 | 0.6 |
| 6 | 7×7 | 7 | 7.1 | 6.9 | 51 | 0.6 |
| 7 | 7×7 | 6 | 6.2 | 7.9 | 106 | 0.8 |
| 10 | 8×8 | 8 | 8.3 | 7.8 | 171 | 1.4 |
| 12 | 8×8 | 7 | 7.2 | 8.9 | 385 | 2.3 |
| 15 | 9×9 | 9 | 9.4 | 8.6 | 606 | 3.3 |
| 19 | 9×9 | 8 | 8.4 | 9.6 | 683 | 7.8 |
| 20 | 9×9 | 8 | 8.6 | 9.4 | 774 | 6.7 |

## Generatore (soluzione-prima + riparazione dell'unicità)
1. **Copertura con fili "puliti"** (`grow`): si parte da n² fili di una casella e si uniscono a caso estremi vicini,
   preferendo i fili corti. Un'unione è ammessa solo se il filo risultante **non tocca sé stesso** (due sue caselle vicine
   sono sempre consecutive): i fili che rientrano su sé stessi lasciano quasi sempre una scorciatoia alternativa.
   Se non ci sono più unioni ma restano fili corti (< 3) o troppi fili, un estremo "ruba" un pezzo del filo vicino
   (che si spezza) e si riprova. Si scarta la copertura se ha fili < 3 caselle o più di `colori + 2` fili.
2. Degli estremi di ogni filo restano solo i gomitoli; i colori vengono mescolati.
3. **Risolutore** (`solve`, DFS a due teste): ogni colore cresce da entrambi i gomitoli, si ramifica sulla testa con meno mosse.
   Potature: testa senza mosse; casella vuota con meno di 2 vicini utilizzabili; casella vuota con esattamente 2 vicini di cui
   uno è una testa = mossa obbligata (due teste di colori diversi = impossibile); le due teste di un colore devono toccare la
   stessa zona vuota; ogni zona vuota deve essere toccata da entrambe le teste di almeno un colore. Conta fino a 2 soluzioni
   (limite 4000 nodi: oltre, il candidato viene scartato).
4. **Riparazione**: se esiste una seconda soluzione, un filo della nostra viene spezzato in due in un tratto che l'altra
   soluzione non usa. I due nuovi gomitoli devono avere grado 1, mentre nell'altra soluzione erano caselle di passaggio
   (grado 2): quella soluzione (e ogni soluzione del vecchio puzzle) diventa impossibile. Massimo 2 riparazioni, poi si riparte.
5. Fallback garantito (mai usato nelle misure): una riga dritta per colore, soluzione unica verificata nei test.

## Prova di unicità nei test (`tests/yarn.test.mjs`)
Oracolo **indipendente** dal generatore e dal DFS: programmazione dinamica sul profilo ("broken profile"). Scorre le caselle
riga per riga; lo stato è l'insieme dei fili che attraversano il bordo tra la parte vista e il resto, ognuno etichettato con
il colore (se parte da un gomitolo) o come coppia di estremi senza colore. Impone grado 1 ai gomitoli, grado 2 alle altre
caselle, niente cicli e niente colori misti, e conta le soluzioni (saturando a 2).
- Livelli 1–20 (20 semi fino al livello 9, 10 oltre): soluzione dichiarata valida e conteggio dell'oracolo = 1.
- Il DFS del gioco concorda con l'oracolo anche su puzzle con più soluzioni; casi noti a mano (2×2, 3×3).
- Regole del disegno, unione dei pezzi, `status`/`isSolved`, fragoline, determinismo, salvataggio JSON, tempo medio.

## Fragoline
Un **ripensamento** è ogni azione che toglie lana già stesa: filo accorciato, cancellato con un tocco, tagliato da un altro
filo, ripartito da capo dal gomitolo, e ogni "Annulla". Allungare un filo o unire due pezzi non conta.
- 3 fragoline: al massimo 1 ripensamento (2 se il livello ha 8 o più colori)
- 2 fragoline: al massimo un ripensamento per colore
- 1 fragolina: oltre

Niente cuori (non ci sono errori veri). `parTime = 1.6 s × caselle`.
`progress` = 60% caselle libere coperte + 40% coppie collegate (max 0.99; 1 solo a puzzle risolto).

## Salvataggio
`snapshot()` = `{ v, n, ends, paths, hist, moves, rethinks }` (cronologia ≤ 80). Alla ripresa livello e fili vengono
validati (`validLevel`, `validPath`, nessuna sovrapposizione); dati rovinati = nuova partita.

## Tutorial
1. `tu_yarn_1` — trascina da un gomitolo al gemello (filo che si srotola, manina che trascina).
2. `tu_yarn_2` — i fili non si incrociano e riempiono ogni casella (mini-griglia piena, stellina).
3. `tu_yarn_3` — tocco su un filo per cancellarlo, trascinamento per cambiarlo (filo che svanisce sotto la manina).

## Grafica
Coperta a maglia (punti a "V") in cornice caramello, di notte prugna. Gomitoli-gattino con orecchie, giri di lana, musetto
"ω", baffi e codina di lana; occhi che sbattono, il gomitolo tirato dondola e si rimpicciolisce mentre il filo si srotola.
Filo: ombra, peluria, corpo, ritorto a strisce diagonali (pattern), riflesso tratteggiato; l'ultimo tratto si srotola con
`stroke-dashoffset`. 12 colori `--yl-c0…11`, ognuno con un simbolo sul gomitolo. `prefers-reduced-motion` spegne le animazioni.
