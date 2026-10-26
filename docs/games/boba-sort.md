# Boba Sort

Il classico "water sort" con bicchieri di bubble tea.

## Regole
Tocca un bicchiere, poi quello di destinazione: versi tutti gli strati in cima dello stesso gusto che ci stanno. Si può versare solo su un bicchiere vuoto o con lo stesso gusto in cima. Vinci quando ogni bicchiere è vuoto o pieno di un solo gusto (compare la cannuccia).
Ogni gusto ha un simbolo (cuore, stella, goccia…) per chi distingue male i colori.

## Animazione del travaso (v0.2)
Il bicchiere scelto si solleva; al secondo tocco vola sopra la destinazione, ruota di ~108° attorno all'angolo della bocca e versa:
getto del colore del gusto (clip-path animato), strati della sorgente che si svuotano dall'alto, strati della destinazione che salgono dal basso, schizzi, gorgoglio sonoro, rimbalzo del bicchiere. Se il bicchiere diventa completo compaiono coperchio e cannuccia. Durata ~1,6 s (+150 ms per strato); con "riduci movimento" il travaso è istantaneo.

## Difficoltà
Gusti = `min(9, 3 + ⌊(livello − 1) / 2⌋)`, sempre 2 bicchieri vuoti, capienza 4.

## Generatore (`src/games/boba-logic.js`)
Mescolamento casuale degli strati → scarto se già risolto o con un bicchiere già completo → verifica con DFS + memo (chiave canonica ordinata, limite 40 000 nodi). Risolvibilità garantita.

## Idee
- Pulsante "+1 bicchiere" una volta per livello.
- Strati nascosti ("?") nei livelli avanzati.
