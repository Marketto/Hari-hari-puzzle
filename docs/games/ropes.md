# Hari Knots

Corde colorate intrecciate su lastre pastello: riaggancia i capi nei fori liberi finché tutte le corde volano via e le lastre cadono.
File: `src/games/ropes-logic.js` (logica pura, `HH.ropes`), `src/games/ropes-ui.js` (UI), `src/games/ropes.css` (stile, token `--rk-*`),
test: `tests/ropes.test.mjs`, blocco in `tools/selftest.mjs`.

## Regole — modello 2, "la mano che solleva il capo" (chiave `r10b`)
Il modello 1 (v0.9.0: la corda spostata finiva sopra o sotto da sola) era troppo semplice. Nel modello 2 il capo viene tirato su
dalla mano e attraversa il tavolo IN ARIA: se passa sopra una corda che copriva la sua, ci si avvolge.

- **Campo**: griglia di punti `cols × rows`. Le **lastre** sono rettangoli di punti `[x0, y0, x1, y1]` (indice più alto = più in alto),
  anche sovrapposte. I **fori** sono punti forati attraverso tutte le lastre che li coprono.
- **Corde**: collegano due fori (un capo per foro). La **traccia logica** è il segmento chiuso tra i due fori.
- **Incrocio** (geometria esatta, coordinate intere): due segmenti chiusi con almeno un punto in comune. Conta anche una corda che passa
  esattamente sopra il foro dove è agganciata l'altra, e conta un tratto collineare sovrapposto. Passare sopra un foro vuoto non conta.
- **Strati**: per ogni coppia che si incrocia si sa chi sta sopra (relazione a coppie, anche ciclica).
- **Avvolte** (attorcigliate): coppie in cui una corda è avvolta attorno all'altra. È un nodo fisico: **non** si scioglie quando i segmenti
  smettono di incrociarsi, solo ripassando un capo (di una delle due) sopra l'altra. Una coppia avvolta non ha strato.
  Nello stato pubblico la coppia è ordinata `[a, b]` = "a avvolta attorno a b" (serve solo al disegno: le regole sono simmetriche).
- **Mossa**: il capo E della corda A va dal foro h0 a un foro **libero** h1 seguendo in aria il segmento h0→h1; l'altro capo F resta fermo.
  Per ogni altra corda B: `p` = il percorso h0→h1 interseca B; `c1` = il nuovo segmento F→h1 interseca B.

  | Prima | Dopo |
  |---|---|
  | A sopra B | A sopra B se `c1`, altrimenti niente |
  | nessuna relazione | A sopra B se `c1` (arriva dall'alto), altrimenti niente |
  | B sopra A | se `p`: **A si avvolge attorno a B**; altrimenti B sopra A se `c1`, o niente |
  | avvolte | se `p` (il capo ripassa sopra B): si srotolano → B sopra A se `c1`, o niente; altrimenti restano avvolte |

  Vale lo stesso spostando il capo di B (regola simmetrica).
- **Sparizione a cascata**: dopo ogni mossa sparisce, a turni, ogni corda senza corde sopra e non avvolta.
- **Nodino coperto**: un capo su cui passa un'altra corda **si può** sollevare. Non serve un divieto: quella corda conta già come incrocio
  (sta sopra), quindi se il capo la attraversa in aria vale la regola "B sopra A" → avvolgimento. È coerente con la fisica (la mano tira il
  capo da sotto e la corda ci resta impigliata).
- **Lastre**: una corda in un foro tiene tutte le lastre che contengono quel punto. Una lastra cade quando nessuna corda la tiene e nessuna
  lastra presente sopra di lei la sovrappone; i suoi fori spariscono con lei.
- **Obiettivo**: far sparire tutte le corde. Nessuna sconfitta: se lo stato è davvero irrisolvibile (A* esaurisce lo spazio entro 400 nodi)
  compare "All tangled up! Tap Undo." e Hari fa "oops".

La sfida: una corda che sta sotto non si libera portando il capo sopra chi la copre (ci si avvolgerebbe). Bisogna scegliere percorsi
(fori) che girano intorno, oppure togliere prima chi sta sopra, con pochi fori liberi.

## Comandi
| Gesto | Effetto |
|---|---|
| Trascina un nodino o un fiocchetto | il capo sale in aria (ombra lunga, corda sopra tutto) e segue il dito; i fori liberi si illuminano; calamita vicino ai fori |
| Sopra un foro, prima di rilasciare | anteprima: un anello rosso tratteggiato pulsa dove la corda si avvolgerebbe |
| Rilascia su un foro libero | mossa; altrove il capo torna al suo foro |
| Tocca un nodino, poi un foro | stessa mossa senza trascinare |
| Tastiera | frecce = nodino/foro · Invio/Spazio = prendi/aggancia · Esc = lascia |
| Annulla | torna allo stato prima; **la mossa resta contata** |

## Curva di difficoltà (`config(level)`)
| Livelli | Griglia | Corde | Lastre | Fori liberi | Coppie avvolte | Minimo richiesto |
|---|---|---|---|---|---|---|
| 1 | 4×4 | 3 | 1 | 2 | 1 | 2 |
| 2–3 | 4×5 | 4 | 1 | 2 | 1 | 2–3 |
| 4–6 | 5×5 | 5 | 2 | 2 | 2 | 2–4 |
| 7–10 | 5×5 | 6 | 2 | 2 | 2 | 3–5 |
| 11–15 | 5×6 | 7 | 3 | 2 | 3 | 4–5 |
| 16–20 | 5×6 | 8 | 3 | 1 | 3 | 4–6 |
| 21+ | 5×6 | 9 | 3 | 1 | 4 | 5–7 |

Una parte delle coppie avvolte può non incrociarsi (`loose`: anse). Dal livello 4 un livello è scartato se la **giocata ingenua**
(golosa: ogni volta la mossa che fa sparire più corde) lo risolve nel minimo. Tra i candidati validi vince quello con più mosse minime.

Misure (`node tools/selftest.mjs`, 12 semi, Node):

| Livello | Corde | Minimo medio | Mosse oltre l'euristica | ms medi |
|---|---|---|---|---|
| 1 | 3 | 2.0 | +1.0 | 17 |
| 3 | 4 | 2.0 | +0.9 | 4 |
| 6 | 5 | 2.1 | +0.1 | 1.5 |
| 10 | 6 | 3.1 | +0.7 | 14 |
| 14 | 7 | 4.0 | +1.0 | 20 |
| 18 | 8 | 4.6 | +1.2 | 15 |
| 24 | 9 | 5.2 | +0.8 | 40 |

"Mosse oltre l'euristica" ≈ quante mosse in più costano le trappole di avvolgimento rispetto al conteggio di nodi e cicli.
Il generatore resta sotto i 50 ms medi della specifica, non sotto i 10 ms: la ricerca A* è più profonda che nel modello 1
(~100 nodi × ~150 figli a 9 corde). Livelli con minimo 7–9 richiederebbero più corde o più fori e una ricerca molto più costosa: per ora il massimo è 6–7.

## Generatore
1. Lastre (`platesFor`), fori e corde (`layout`): corde lunghe che si incrociano, mai sopra un foro.
2. `dress`: sceglie `T` coppie avvolte (tra quelle che si incrociano e, con probabilità `loose`, anche coppie separate), poi uno strato a caso
   per le altre coppie che si incrociano; ripara finché ogni corda non avvolta è coperta.
3. `deepen`: ricerca locale che gira strati per alzare l'euristica iniziale (solo stati stabili).
4. A* (`solve`, 500 nodi) → minimo e soluzione; scarto se fuori fascia o se `naive` risolve nel minimo.
5. Tetti di tempo (30 ms dopo il primo valido, 150 ms con un fallback) → `FALLBACK` fisso solo se non c'è nulla.

## Risolutore
- Stato: capi, maschere "copre", maschere "avvolta attorno a", lastre presenti. La chiave usa gli avvolgimenti simmetrici.
- **Euristica ammissibile e consistente**: le corde mai spostate mantengono tra loro strati e avvolgimenti (solo spostare una delle due li
  cambia). Per sparire devono formare un insieme senza coppie avvolte e senza cicli di copertura. `h` = corde da togliere per ottenerlo.
  Calcolo esatto: si sbucciano le corde libere, poi programmazione dinamica sui sottoinsiemi del "nocciolo" bloccato (memo per struttura).
- A* con code a due livelli (f crescente, a parità g più alto), tabella pigra degli incroci, figli calcolati in un buffer riusato.

## Oracolo nei test (`tests/ropes.test.mjs`)
Indipendente: simulatore riscritto dalla tabella delle regole (incroci con la formula di Cramer, `Map` strati, `Map` avvolgimenti con
direzione, lastre in array) e BFS esaustiva con chiavi JSON.
- i 4 casi della tabella su un livello a mano, simmetria (spostando A o B), avvolgimento che resta senza incrocio, scioglimento, cascata;
- livelli 1–24: validi, stabili, ogni corda coperta o avvolta, soluzione dichiarata che libera tutto nell'oracolo;
- livelli 1–10: minimo A* = BFS; anche da stati intermedi;
- mosse casuali: logica e oracolo identici (inclusa la direzione degli avvolgimenti);
- difficoltà crescente e giocata ingenua insufficiente; determinismo; salvataggi (i livelli del modello 1 sono scartati: `rule: 2`).

## Disegno e fisica
- Corde: particelle Verlet, vincoli di lunghezza, gravità leggera; i capi inseguono foro o dito.
- **Capo in aria**: la corda presa (o appena posata, per ~20 fotogrammi) è disegnata sopra tutte, con ombra lunga.
- **Avvolgimento = gancio**: punto H sulla corda B (incrocio dei segmenti, oppure il punto di B più vicino al segmento di A).
  Una particella di A e una di B sono fissate in H; A fa un'ansa fino a H (la sua lunghezza cresce di conseguenza) e lì tre giri del suo
  colore stringono B. Entrata e uscita animate (`grow` 0↔1). All'avvolgimento compaiono "Oh no, wrapped!" e `ctx.react('oops')`;
  allo scioglimento scintille e "Unwrapped!".
  Nota: quando l'ansa è lunga, la curva disegnata di A può passare sopra corde che logicamente non incrocia (l'ordine di disegno lì non ha significato).
- Ordine di disegno = relazione logica (topologico + ridisegno locale nei cicli). rAF solo finché qualcosa si muove; `prefers-reduced-motion`:
  tutto subito a riposo, ganci già stretti, niente voli.

## Fragoline
`HH.rules.rateMoves(mosse, minimo)`: 3 col minimo esatto, 2 entro il 70% delle mosse in più concesse, 1 oltre. L'Annulla non restituisce la mossa.

## Tutorial
1. `tu_ropes_1` — la manina trascina un capo in un foro libero.
2. `tu_ropes_4` — il capo della corda di sotto passa sopra la corda di sopra: compaiono i giri e l'anello rosso.
3. `tu_ropes_5` — la corda di sopra vola via, poi quella che era sotto; la lastra cade.
