# Boba Sort

Il classico "water sort" con bicchieri di bubble tea.

## Regole
Tocca un bicchiere, poi quello di destinazione: versi tutti gli strati in cima dello stesso gusto che ci stanno. Si può versare solo su un bicchiere vuoto o con lo stesso gusto in cima. Vinci quando ogni bicchiere è vuoto o pieno di un solo gusto (compare la cannuccia).
Ogni gusto ha un simbolo (cuore, stella, goccia…) per chi distingue male i colori.

## Animazione del travaso (v0.2)
Il bicchiere scelto si solleva; al secondo tocco vola sopra la destinazione, ruota di ~108° attorno all'angolo della bocca e versa:
getto del colore del gusto (clip-path animato), strati della sorgente che si svuotano dall'alto, strati della destinazione che salgono dal basso, schizzi, gorgoglio sonoro, rimbalzo del bicchiere. Se il bicchiere diventa completo compaiono coperchio e cannuccia. Durata ~1,6 s (+150 ms per strato); con "riduci movimento" il travaso è istantaneo.

## Liquido con la gravità (v0.3)
Il bicchiere in volo è disegnato su canvas. Il contorno interno è un poligono convesso: a ogni fotogramma viene ruotato nel
"sistema della gravità" (angolo del bicchiere meno lo sciabordio) e per ogni strato si cerca con ricerca binaria la quota orizzontale
che ne racchiude esattamente il volume. Così la superficie resta sempre orizzontale, il liquido scivola verso la bocca quando il
bicchiere si inclina, e gli strati si svuotano dall'alto. Lo sciabordio è una molla smorzata guidata da rotazione e spostamento.

## Mosse contate e sconfitta (v0.4)
- **Minimo esatto** calcolato con A* (`solveOptimal`): euristica ammissibile = segmenti di colore − gusti (ogni versata unisce al
  massimo un segmento). Verificato contro una ricerca in ampiezza esaustiva nei test.
- **Mosse concesse** = minimo + 15%, con almeno **2** e al massimo **6** mosse in più (`extraMoves`).
- Contatore "Mosse rimaste" con barra; diventa rosso e pulsa quando ne restano 2 o meno.
- **Annulla** rimette i bicchieri com'erano ma la mossa resta spesa: il limite non si aggira.
- **Sconfitta** (`status()` dopo ogni travaso) → finestra con Riprova:
  - mosse finite senza aver risolto;
  - nessuna versata possibile;
  - vicolo cieco: si può ancora versare ma il livello non è più risolvibile (A* esplora tutto e non trova soluzione).
- Valutazione a **fragoline** (lo spuntino di Hari): 3 col minimo esatto, 2 se usi al massimo il 70% delle mosse in più concesse
  (arrotondato per difetto), 1 oltre. Es. minimo 10, limite 12: 10 → 3, 11 → 2, 12 → 1.
- Suoni: vetro sollevato (fruscio + "tink") e riappoggiato ("tok"), niente campanella.

## Difficoltà
Gusti = `min(9, 3 + ⌊(livello − 1) / 2⌋)`, sempre 2 bicchieri vuoti, capienza 4.

## Generatore (`src/games/boba-logic.js`)
Mescolamento casuale degli strati → scarto se già risolto o con un bicchiere già completo → verifica con DFS + memo (chiave canonica ordinata, limite 40 000 nodi). Risolvibilità garantita.

## Idee
- Pulsante "+1 bicchiere" una volta per livello.
- Strati nascosti ("?") nei livelli avanzati.
