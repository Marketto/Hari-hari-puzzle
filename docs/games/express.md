# Hari Express

Gestionale di trasporti in stile OpenTTD / Transport Tycoon, in 3D con cel shading e vista isometrica. Hari collega i
villaggi degli animali (coniglietti, gatti, panda, orsetti, papere, volpi) con strade e ferrovie, compra bus, camion e
treni, porta passeggeri e merci e fa crescere le città. Campagna a livelli con obiettivi e fino a 3 fragoline, più la
modalità **Libera** su una mappa generata (seme, grandezza, acqua).

- id `express`, brand **Hari Express** (non tradotto), regole `r_express`, brano `express`, tinta `--tint-express`,
  token `--exp-*` (express.css). Fase 1 (questa): strade, bus e camion, binari con treni e semafori, 4 catene di
  merci, città che crescono, livelli 1–5 (+ sfide dal 6), Libera. Fase 2: navi, dirigibili, invecchiamento e guasti,
  avversari, livelli 7–12. Fase 3: mappe reali dal modulo condiviso `src/maps/`, livelli 13–18.
- Due posti di salvataggio (`slot()`): `express` (Campagna) ed `express@free` (Libera, nel catalogo `slots`).
- three.js r160 è lo stesso file di Hari Rally e Hari Fishing (`src/vendor/three.min.js`), caricato una volta sola.

## File
| File | Righe | Cosa |
|---|---|---|
| `express-map.js` | logica | terreno, acqua, alberi, villaggi, industrie; modelli dei livelli; `fromShared` (fase 3) |
| `express-net.js` | logica | maschere di strade e binari, costi, percorso proposto (A* della costruzione), ponti, A* dei mezzi |
| `express-sim.js` | logica | passo fisso: movimento, prenotazioni e semafori, carico/scarico, pagamento, produzione, valutazioni, città, calendario |
| `express-logic.js` | logica | stato, livelli e obiettivi, azioni (UI e bot), salvataggio, consigli di Hari, stelle, progresso |
| `express-sky.js` | logica | ciclo del giorno e della notte della scena: fasi, curva della luce `light(t)`, durata del giorno |
| `express-art.js` | UI | testi di riserva, icone (merci con forma propria), card, tutorial |
| `express-3d.js` | UI | renderer, materiali toon + contorni, `bake()`, terreno, acqua, alberi e case a istanze, industrie |
| `express-tracks.js` | UI | geometria di strade, binari, ponti, stazioni, frecce; semafori a istanze; anteprima e area di raccolta |
| `express-vehicles.js` | UI | mezzi a istanze (faccine sul lato della cabina, merci sopra i vagoni, fumo) |
| `express-hud.js` | UI | barra, obiettivo, fumetto di Hari, strumenti, schede a foglio, scelta della modalità, etichette |
| `express-input.js` | UI | camera ortografica isometrica / vista libera, gesti, mouse, tastiera |
| `express-ui.js` | UI | `create()`, ciclo, strumenti, eventi, suoni, registrazione |

Test: `tests/express.test.mjs`, `tests/express-sky.test.mjs` + bot `tests/_express-bot.mjs`; benchmark in `tools/selftest.mjs`.

## Regole
1. **Mappa** a caselle con altezze 0–2 (colline: dislivello massimo 1 tra caselle vicine), acqua (mare attorno
   all'isola, laghi, fiumi), alberi e cespugli, villaggi con le loro strade a croce, industrie 2×2.
2. **Costruire**: si trascina da una casella all'altra; Hari propone il percorso più economico (A* sui costi: casella
   libera, albero da togliere, collina, salita, curva) e mostra caselle e costo prima di confermare. Pezzi già fatti
   costano 0. **Ponti e gallerie**: vedi la sezione sotto. **Passaggi a livello**:
   strada e binario si incrociano solo dritti e perpendicolari. Dove due linee si toccano nasce uno **scambio
   automatico** (il mezzo sceglie l'uscita col suo percorso).
3. **Stazioni e fermate**: stazione dei treni dritta da 1 a 5 caselle (in piano), fermata di bus e camion su una strada
   dritta o una casella libera. Caselle vicine sullo stesso asse si uniscono alla stessa stazione. **Area di
   raccolta**: 3 caselle attorno per i treni, 2 per bus e camion (si vede toccando la stazione).
4. **Mezzi**: bus (30 passeggeri), furgone della posta (20), camion (20 di una merce), locomotiva a vapore "Castagna"
   con fino a 6 vagoni (passeggeri 40, posta 30, latte 30, formaggio 25, grano 35, pane 25, legna 30, giocattoli 25);
   l'elettrica "Fragola" dal 1° marzo dell'anno 1 (in Libera, ~28 minuti veri a ×1). Al massimo 80 mezzi su telefono,
   200 su PC.
5. **Percorso**: le fermate in ordine (da 2 a 12), ciascuna con un modo: **carica e scarica** (normale), **aspetta il
   pieno**, **solo scarica** (lì non carica, e la stazione non comincia a raccogliere quella merce), **solo carica**
   (lì non scarica). A ogni fermata il mezzo scarica quello che la stazione accetta (non quello caricato lì), poi
   carica; riparte dopo mezz'ora se non c'è altro da caricare (carico e scarico: 2 unità per vagone ogni 2,5 minuti, un
   camion pieno in ~25 minuti). Il percorso si **modifica** in ogni momento dalla scheda del mezzo (vedi sotto).
6. **Merci e catene**: passeggeri e posta tra villaggi; fattoria → latte → caseificio → formaggio → città; campo →
   grano → forno → pane → città; bosco → legna → segheria → giocattoli → città. Le fabbriche trasformano 1:1.
   Un villaggio accetta passeggeri e posta con almeno 1 casa nell'area, formaggio, pane e giocattoli con almeno 2.
7. **Treni e semafori** (versione semplice ma robusta, vedi sotto). Binari a **senso unico** (frecce).
8. **Città**: ogni giorno crescono se servite bene (passeggeri presi nelle ultime 30 ore con valutazione ≥ 35%,
   merci e posta consegnate nel giorno): `crescita = ⌊punti × (1,6 + 2,4% abitanti)⌋`, punti = 1 (servita) +
   min(3, merci/8) + min(1, posta e passeggeri/32). Le case nuove (una ogni 30 abitanti) nascono vicino alle strade e
   alle altre case.
9. **Ghiande finite**: a fine giornata, se il saldo è sotto zero, Hari vende il mezzo che rende meno.

## Ponti e gallerie
- **Ponte**: dalla riva, dritto sopra 1–**6** caselle d'acqua, fino alla riva opposta **alla stessa altezza** (se no:
  "Le due rive non sono alla stessa altezza"). Costo per casella d'acqua 160 (strada) / 260 (binario) × (1 + 0,25 per
  ogni casella oltre la terza): fino a 3 caselle come prima, 6 caselle = × 1,75. Sopra l'acqua niente incroci.
- **Galleria**: da una casella a quota h, dritto dentro la collina (caselle più alte di h, niente acqua), fino alla
  prima casella di nuovo a quota h; al massimo **8** caselle dentro; 140 (strada) / 220 (binario) per casella. Dentro
  (`W.tun`) non ci sono altri pezzi, case, stazioni né semafori ("Niente semafori in galleria"); sopra restano alberi e
  terreno. Se l'uscita è più bassa o è acqua: "La galleria deve uscire alla stessa altezza da cui entra".
- Entrambi sono **archi** dell'A* della costruzione (`hop()` in express-net.js: un salto da una casella all'altra, con
  regole e costo), ma restano maschere casella per casella: gli A* dei mezzi non cambiano e i mezzi ci passano come
  su ogni altra casella (test). Un ponte o una galleria già fatti si riusano gratis.
- **Trascinamento dritto** (stessa riga o colonna, al più una casella di scarto alla fine; `propose()`): se sulla linea
  c'è acqua o una collina da attraversare, la proposta è la **linea dritta col ponte o la galleria** (tratto in giallo
  nell'anteprima, con "Ponte · 4 caselle · 825" nel pannello) e la proposta dell'A* diventa l'alternativa ("Altra via ·
  costo", pulsante ⇄). Il dito che si ferma sull'acqua porta il ponte alla riva di là; il dito che si ferma *dentro* la
  collina propone di salirci, con la galleria fino all'altra parte come alternativa. Se il salto dritto è impossibile
  il pannello (o il suggerimento) dice perché: "Ponte troppo lungo: al massimo 6 caselle d'acqua", rive diverse,
  galleria troppo lunga o uscita sbagliata.
- Perché prima "non si potevano fare i ponti" (0.32.x): il limite era 3 caselle, ma soprattutto l'A* sceglieva sempre
  il giro più economico (un ponte costa come 6 caselle di strada per casella d'acqua): trascinando attraverso il fiume
  compariva un giro lungo e il ponte non si vedeva mai, senza nessun messaggio. Nelle mappe generate (livelli 1–5,
  Libera 32/64) un attraversamento dritto su tre è più lungo di 3 caselle e uno su sei ha le rive ad altezze diverse.
- **Demolire** una casella di un ponte o di una galleria (o la riva / l'imbocco a cui è attaccato) toglie tutto il
  ponte o la galleria: 8 ghiande per casella, come ogni demolizione, niente rimborso; non si può con un mezzo sopra o
  dentro.
- Libera con colline: con almeno 8 pezzi di rete fatti e nessuna galleria Hari dice "Una collina in mezzo? Trascina
  dritto attraverso: Hari propone una galleria. Sull'acqua, un ponte!" (`ex_c_tunnel`).

## Modifica del percorso
- Nella scheda del mezzo: **Modifica percorso** → elenco delle fermate con il modo (scelta nativa), **su / giù / togli**
  (pulsanti da 44 px, niente trascinamento), **Aggiungi una fermata** (stessa scelta sulla mappa del mezzo nuovo:
  si toccano le stazioni, poi Fatto), Annulla / Applica. Il giro stimato si aggiorna mentre si modifica.
- Controlli (`act({ k: 'orders' })` → `setOrders()`): 2–12 fermate della rete giusta, niente stessa fermata due volte di
  fila (anche dall'ultima alla prima), ogni tratto percorribile da quel mezzo (A* dei mezzi da ogni uscita della
  stazione, `legs()`); se no niente cambia e l'editor dice "Questo mezzo non arriva da A a B" con le due fermate
  evidenziate (Applica è spento finché non si sistema).
- **A metà viaggio**: se la meta di adesso c'è ancora il mezzo continua ad andarci (o a caricare lì, coi modi nuovi);
  se è stata tolta va alla fermata successiva del vecchio giro che c'è ancora (se nessuna, alla prima); un mezzo fermo
  a caricare in una fermata tolta riparte subito. Il carico resta a bordo e si scarica nella prima fermata che lo
  accetta (e che non è "solo carica"). Tutto deterministico (test).
- Non fatto: cambiare i vagoni di un treno già comprato.

## Economia (media)
- **Pagamento** = quantità × distanza (Manhattan tra le stazioni) × prezzo × fattore tempo; fattore 1 fino a `d1`
  **ore** di viaggio (dal carico), poi cala fino a 0,3 in `d2` ore.

| Merce | Prezzo (ghiande per unità e casella) | d1 | d2 |
|---|---|---|---|
| passeggeri | 0,32 | 10 | 40 |
| posta | 0,45 | 12 | 40 |
| latte | 0,38 | 8 | 30 |
| formaggio | 0,55 | 15 | 50 |
| grano | 0,30 | 20 | 80 |
| pane | 0,50 | 8 | 30 |
| legna | 0,30 | 30 | 100 |
| giocattoli | 0,62 | 20 | 80 |

- **Costi** di costruzione: strada 25, binario 60, salita +20/+40, albero +10, collina +5, ponte 160 (strada) / 260
  (binario) per casella d'acqua (× 1 + 0,25 oltre la terza), galleria 140 / 220 per casella, fermata 220, stazione 360 per casella, semaforo 80, senso unico 30, demolizione 8.
- **Mezzi**: bus e posta 900 (esercizio 10 al giorno), camion 1.100 (12), Castagna 3.500 (46), Fragola 7.000 (72),
  vagone 400 (4). Vendita: metà del prezzo.
- **Manutenzione** giornaliera: 0,8 per casella di binario, 0,4 per casella di strada costruita, 2,4 per casella di
  stazione (si paga ogni giorno, arrotondata sul totale).
- **Valutazione** della stazione per merce (0–100%), ogni ora verso un obiettivo di 17% + passaggi recenti (40% entro 7
  ore … 0 oltre 60) + poca merce in attesa (25% sotto 40 … −10% oltre 300) + velocità del mezzo (fino a 15%), ±2%
  all'ora. La produzione arriva alla stazione moltiplicata per la valutazione; la merce che aspetta troppo se ne va
  (3% × (1 − valutazione) all'ora). Una merce compare in una stazione solo dopo il primo passaggio di un mezzo che la
  porta.
- **Produzione**: fattoria 64 latte al giorno, campo 72 grano, bosco 64 legna (arrivano un po' ogni ora); villaggi:
  passeggeri = abitanti / 40 all'ora, posta = abitanti / 120, divisi tra le stazioni in proporzione alle case coperte.
- Niente prestiti né inflazione.

## Tempo
**L'orologio e i viaggi vanno d'accordo** (prima, 0.32: un "giorno" durava 1,2 s e un camion tra due villaggi ci metteva
4–6 giorni, mentre il cielo faceva un giro ogni 150 "giorni"). Adesso:
- passo fisso: **1 ora = 24 passi**, 1 giorno = 24 ore = 576 passi; a ×1 la UI fa 20 passi al secondo: **1 ora = 1,2 s,
  1 giorno = 28,8 s** (14,4 s a ×2, 7,2 s a ×4), poi pausa. Il ritmo in secondi veri non è cambiato: il "giorno" di
  prima è l'ora di adesso, quindi i numeri della simulazione al passo (velocità, carico) sono gli stessi.
- velocità in **caselle all'ora**: bus 1,8, posta 1,9, camion 1,6, Castagna 3, Fragola 5. Tra due villaggi vicini (8–12
  caselle) un bus ci mette **4–6 ore**, un camion fattoria → caseificio 2–4 ore; una linea di treno di 20–30 caselle
  6–10 ore. Fermata: carico e scarico in 25–30 minuti (ad "aspetta il pieno" si aspetta la merce: ore).
- ogni ora produzione, valutazioni e merce che se ne va; ogni giorno esercizio dei mezzi, manutenzione, crescita delle
  città, ghiande finite; anni di 365 giorni coi mesi veri.
- la barra mostra **data e ora** ("6 gen · 14:00", ore intere, con `Intl.DateTimeFormat` nella lingua dell'app; dall'anno
  2 anche l'anno). Una partita nuova parte alle **7:00 del 1° gennaio** (`h0`).
- durate nell'interfaccia (`dur()` in express-hud.js, unità di `Intl.NumberFormat`): "5 h", "2 giorni 5 h" sotto i 3
  giorni, poi "14 giorni": tempo che resta, 3 fragoline, ultimo passaggio, giro stimato (anche nella scheda del mezzo).
- Tutto deterministico: lo stato contiene anche il generatore casuale (`rs`) usato per le case nuove.

| Misura | Prima (0.32.1) | Adesso |
|---|---|---|
| un giorno di gioco a ×1 | 1,2 s | 28,8 s (= un giro del cielo) |
| giro del cielo a ×1 / ×4 | 180 s / 60 s (150 / 50 "giorni") | 28,8 s / 7,2 s (1 giorno) |
| bus tra due villaggi (≈10 caselle, mediana del bot) | ≈4 giorni | ≈4 ore |
| treno del livello 4 (mediana) | ≈2 giorni | ≈2,5 ore |
| sosta in fermata senza "pieno" | mezzo giorno | mezz'ora |
| livello 1: scadenza / par / bot | 365 / 90 / 39 giorni | 15 giorni / 4 giorni / 34 ore (0,7 min veri) |
| livello 5: scadenza / par / bot | 730 / 380 / 222 giorni | 30 giorni / 16 giorni / 225 ore (4,5 min veri) |

## Treni e semafori
- Ogni treno **prenota** le caselle prima di entrarci (`W.resv`); una casella prenotata da un treno non può esserlo da un
  altro, quindi due treni non si toccano mai (test: nessuna casella sotto due treni a ogni passo).
- Quando serve la casella successiva il treno prenota, tutto o niente, il tratto del suo percorso da lì fino al prossimo
  **semaforo** (escluso) o fino in fondo alla banchina di arrivo; se una casella è di un altro treno aspetta (rosso).
  Le caselle si liberano quando l'ultimo vagone le lascia. Il semaforo è rosso se il tratto dopo è prenotato.
- **Senza semafori** una linea è un tratto unico: un solo treno per volta (due treni su un anello senza semafori si
  aspettano a vicenda: fermi, mai scontrati; Hari lo dice). Coi semafori più treni si seguono.
- Hari dice "un treno è bloccato" solo se un treno in viaggio è fermo da più di 8 ore (10 s veri a ×1) davanti a un
  tratto prenotato da **un altro treno** (contatore `v.bk`, `S.blocked(v)`); l'attesa del pieno e l'inversione al capolinea non contano.
- Rete di salvataggio: un treno fermo al rosso da 20 ore prova a girarsi se dietro c'è una strada per la meta.
- I treni si girano solo alle stazioni di testa (binario cieco dopo la banchina) o con la rete di salvataggio; bus e
  camion fanno inversione ai fondi ciechi e alle fermate, e non si scontrano (mondo gentile).
- Livello 5 (e la soluzione del bot): anello con una freccia di senso unico per via e un semaforo ogni 4 caselle.

## Livelli
`config(level)`: livelli 1–5 dai modelli di `express-map.js` (`LEVELS`), dal 6 sfide che riusano i modelli 3–5 con
obiettivi × (1 + 0,2 · ⌈(livello − 5) / 3⌉). I siti sono piazzati col seme e verificati raggiungibili (BFS con dislivello
≤ 1 e ponti ≤ 3); per le ferrovie (4, 5) tra i due siti e 3 caselle attorno non c'è acqua (c'è posto per un anello).

| Livello | Mappa | Obiettivi | Ghiande | Scadenza | Par (3 fragoline) | Bot: ore medie (max), minuti veri a ×1 |
|---|---|---|---|---|---|---|
| 1 Il primo bus | 18×18 | 120 passeggeri | 3.000 | 15 giorni | 96 ore (4 g) | 34 (36), 0,7 min |
| 2 Il camion del latte | 20×20 | 200 latte al caseificio | 4.000 | 15 giorni | 144 ore (6 g) | 100 (129), 2,0 min |
| 3 La catena del formaggio | 24×24 | 150 latte al caseificio, 100 formaggi in città | 8.000 | 22 giorni | 168 ore (7 g) | 88 (99), 1,8 min |
| 4 Il primo treno | 28×28 isola | 400 grano al forno, 1 treno, 100 pani in città | 17.000 | 22 giorni | 264 ore (11 g) | 157 (158), 3,1 min |
| 5 Due treni e i semafori | 32×32 isola | 500 legna alla segheria, 2 treni, città +120 abitanti | 30.000 | 30 giorni | 384 ore (16 g) | 225 (233), 4,5 min |

(Prima, 0.32.1: scadenze 365/365/540/540/730 "giorni", par 90/150/170/260/380, bot 39/94/88/137/222 "giorni": stessi
secondi veri, perché il "giorno" di allora è l'ora di adesso.) Le sfide dal 6 hanno la scadenza del loro modello e il
par × k (livello 6: 22 giorni, 202 ore; livello 8: 30 giorni, 461 ore).

Stelle: 3 se vinto entro `par` ore dall'inizio, 2 entro 1,5 × par, 1 altrimenti (una in meno se restano meno di un
quarto delle ghiande iniziali). `parTime` (secondi veri per il bonus dell'app) = par × 0,6 + 90. Scadenza superata = sconfitta
("bloccato"). `progress` = media degli obiettivi (Libera: mezzi e stazioni). Generazione media < 10 ms (`npm run bench`).

## Risolvibilità (regola 3)
`tests/express.test.mjs` fa giocare un **bot** (`tests/_express-bot.mjs`) che vede solo quello che vede il giocatore
(terreno, acqua, case, industrie, strade e binari, stazioni, obiettivi, ghiande) e usa le stesse azioni della UI:
l'anteprima del percorso (`preview`), `act` (strada, fermata, stazione, binario, semaforo, senso unico, compra) e il
tempo che passa (`step`). Trova industrie e villaggi dagli obiettivi (merce → chi la produce o la accetta). Vince i
livelli 1–5 con 6 semi ciascuno e le sfide 6–8. Non fare niente perde ogni livello alla scadenza. Altri test:
determinismo e ripresa da JSON (anche a metà, con treni in viaggio), anteprima = costo vero, ponti e giri attorno alle
case, A* dei mezzi (via più corta, senso unico, inversione al fondo cieco), due e tre treni su un anello coi semafori
senza scontri e senza blocchi, treni frontali su binario unico mai scontrati, pagamento che cala con le ore di viaggio, valutazione
che sale e scende, città che crescono solo se servite, Libera, consigli di Hari, geometria dentro la casella; **tempo**: calendario
e orologio, scadenze di 2–4 settimane, viaggi su strada di poche ore (mediana 1–8, massimo 14), treni entro un giorno,
soste senza "pieno" entro un'ora; salvataggio v1 migrato con la mappa di allora; acqua collegata per i lati.
`tests/express-route.test.mjs` (mondi piatti fatti a mano, costi contati dalla tabella): ponte col trascinamento dritto
(strada e binario, costo, alternativa, dito sull'acqua), limite di 6, rive diverse, costo che cresce; galleria (costo,
alberi sopra, niente semafori, stazioni o strade sopra, dito dentro la collina, troppo lunga, uscita sbagliata, galleria
inventata rifiutata); treno e bus che passano in galleria e sul ponte e arrivano; demolizione intera (anche dalla riva),
vietata con un treno dentro; salvataggio con gallerie e salvataggi di prima; percorso (aggiungi, riordina, modi, togli,
minimo 2, doppioni, rete sbagliata, irraggiungibile col tratto giusto), cambio a metà viaggio col carico consegnato
alla fermata nuova, solo carica / solo scarica, fermata tolta mentre carica, determinismo.

## Salvataggio
`snapshot()` = lo stato `s` (JSON, `v: 2`): `{ mv, mode, level, seed, opts, h, h0, tk, money, m0, net, cut, towns, inds,
stations, veh, nid, nv, del, gd, fin, finY, goals, deadline, par, won, lost, wonH, moves, rs, speed }`; `h` = ore
intere dal 1° gennaio a mezzanotte, `tk` = passi nell'ora, `deadline` assoluta e `par` dall'inizio in ore.
Ordini dei mezzi: `{ st, full }` più `nl: 1` (solo scarica) o `nu: 1` (solo carica) quando servono; i salvataggi di prima
hanno solo `{ st, full }` e valgono così come sono (nessuna migrazione: test con un salvataggio v2 senza i campi nuovi).
**Salvataggi vecchi** (`v: 1`, 0.32.x): `migrate()` li apre rinominando `day → h` e `wonDay → wonH` (il "giorno" di
allora ha gli stessi 24 passi della nostra ora, quindi carichi, passaggi, scadenza e par restano numericamente
uguali), toglie `tod`, mette `h0 = 0` e **`mv = 1`**: la mappa si rigenera col generatore di allora (test con un
salvataggio vero della 0.32.1 in `tests/fixtures/express-v1.json` e la firma della sua acqua). **La mappa non
c'è**: si rigenera dal seme (`scenario(level, seed)` o `generate(opts, rng(seed))`); `net` contiene solo le caselle
cambiate `{ indice: [binari, strade, semaforo, senso unico] }` (un quinto valore `1` solo per le caselle dentro una
galleria: i salvataggi di prima, a quattro valori, si aprono uguali), `cut` gli alberi tolti, i villaggi le loro case (anche
quelle nuove). Le tabelle dense (`W`: altezze, acqua, maschere, stazioni, prenotazioni) sono in una proprietà non
enumerabile ricostruita da `world(s)`; `nv` (versione della rete) fa ripartire i percorsi nello stesso modo dopo una
ripresa. Un livello a metà pesa 10–40 KB. Il cielo non è più salvato: si ricava dall'orologio.

**Versione della mappa** (`mv`, `HH.expressMap.MV = 2`): dalla 2 l'acqua è collegata per i lati (`joinDiagonals`: in
ogni quadrato 2×2 con l'acqua solo sulla diagonale una delle altre due caselle diventa acqua, la più bassa), così i
fiumi che piegano di lato non si spezzano in rettangoli staccati; non usa numeri casuali in più. Disegno e regole
leggono la stessa tabella `water`, quindi una casella d'angolo che sembra acqua è acqua anche per strade, ponti e
fermate. Test: nessuno spigolo d'acqua isolato nei livelli 1–5 e in Libera 32/48/64, mv 1 invariato.

## Comandi
- **Telefono** (verticale o girato): barra degli strumenti in basso (girato: colonna a destra) — Binari (scelte:
  binario, semaforo, senso unico), Strade, Fermate (stazione dei treni, fermata di bus e camion), Acqua e Aria con il
  lucchetto (fase 2), Demolisci, Info. Un dito trascina per costruire con l'anteprima del costo (Annulla / Costruisci);
  due dita zoom e spostamento (nella vista libera anche rotazione). Il gesto di costruzione parte solo quando il dito si
  muove: se arriva un secondo dito è uno spostamento. Con Info un dito sposta la mappa (nella vista libera la gira) e
  un tocco apre la scheda di stazione, mezzo, villaggio o industria.
- Colonna di destra: modalità (bandierina), ruota di 90°, vista libera / isometrica (cubo), conti, zoom.
- Barra in alto: ghiande e data (tocco: conti), velocità ×1 → ×2 → ×4 → pausa.
- **PC**: rotella = zoom verso il puntatore, tasto destro o centrale = sposta (vista libera: gira), tasti 1–5 strumenti
  (Binari, Strade, Fermate, Demolisci, Info), 6 conti, R/Q ruota, F vista libera, spazio pausa, +/− zoom, frecce
  sposta, Esc chiude.
- Schede a foglio dal basso (girato: a destra), con l'intestazione che resta in cima mentre si scorre (prima, scorrendo
  fino a "Vendi", il titolo del mezzo finiva tagliato sotto il bordo del foglio): stazione (valutazione, merci in attesa con icona, merci accettate,
  mezzi, "Nuovo treno/bus o camion"), nuovo mezzo e percorso (mezzo, merce o vagoni, fermate toccate sulla mappa in
  ordine, aspetta il pieno, giro stimato in ore, totale, "Compra e parti"), mezzo (guadagno, carico, percorso coi modi
  e la fermata di adesso evidenziata, giro stimato, Modifica percorso, vendi), modifica del percorso, villaggio, industria, conti e obiettivi (obiettivi, conti dell'anno con grafico, mezzi, avversari in arrivo).
- Scelta della modalità: Campagna, Libera (sbloccata al livello 5 in fase 1: seme, grandezza 32/48/64, acqua),
  Mappe reali (lucchetto, fase 3). Appare alla prima partita e con la bandierina.

## Tutorial
Illustrato, 6 passi (`tu_express_1` … `tu_express_6`): mappa e merci, costruire, fermate e mezzi, guadagno e catene,
treni e semafori, comandi. In più il **tutorial progressivo**: Hari nel fumetto dice il passo successivo secondo quello
che hai già fatto (`coach(s)` nella logica, chiavi `ex_c_*`, testato).

## Grafica
- Camera **ortografica** all'angolo isometrico classico (35,26°, 45° + k·90°), rotazione a scatti animata (rispetta
  `prefers-reduced-motion`), zoom; vista libera in prospettiva con orbita e inclinazione.
- `MeshToonMaterial` con rampa a 4 bande e contorni a guscio rovesciato (come Fishing e Rally), colori solo dai token
  `--exp-*` letti con `getComputedStyle`. **La scena non segue il tema dell'app**: la sua tavolozza è dichiarata anche su
  `.ex-wrap` e lì vince sui ritocchi del tema scuro (che restano per card e tutorial); l'interfaccia sopra la scena
  invece segue il tema. Alto contrasto e colori per daltonici valgono anche dentro la scena.
- Terreno a blocchi da 32×32 caselle con altezze morbide (griglia a mezza casella) e colori a scacchi leggeri, sabbia
  sulle rive, bordo "a torta".
- **Acqua** (ShaderMaterial, una mesh): fasce toon turchese/azzurro (bassa vicino a riva, `--exp-water-2`; media
  `--exp-water`; al largo `--exp-water-3`), **schiuma bianca** lungo le rive (ogni casella sa quali lati e spigoli
  toccano terra: attributi `aE`/`aC`) con un secondo filo di schiuma che va e viene, **linee d'onda** lente a tratti.
  Di giorno le creste hanno qualche riflesso chiaro allungato; di notte prendono la luce della luna (`--exp-moon`).
  Mai puntini (sembravano stelle: l'acqua pareva cielo). Con `prefers-reduced-motion` l'acqua è ferma.
- **Alberi sferici** (icosaedri) e **cespugli tondi** più piccoli, a istanze per blocchi da 16×16 con sfera di ingombro
  (fuori vista non si disegnano; da lontano niente contorni); **case** con **tetti a punta**, porta, finestre e
  orecchie dell'animale (coniglio lunghe, gatto e volpe a punta, panda e orso tonde) a istanze; industrie fuse con
  `bake()` (stalla col silo e la mucca, caseificio con lo spicchio di formaggio, campo a righe con lo spaventapasseri,
  forno con la pagnotta, bosco di conifere coi tronchi, segheria con la sega e i giocattoli).
- Rete: una geometria coi colori nei vertici, ricostruita solo quando cambia (strade coi trattini, massicciata,
  traversine, rotaie, curve, scambi, paraurti, ponti con impalcato a bordo, pilastro largo per casella e ringhiere coi
  paletti, **imbocchi delle gallerie**: arco di pietra a conci (`--exp-stone`) con la chiave gialla e il buio dentro
  (`--exp-tunnel`), sul confine con la collina; binario e strada continuano sotto la collina, che li copre, e i mezzi
  in galleria non si disegnano (scala 0, stesse istanze); ogni triangolo segue la normale data, così le strade est-ovest
  non vengono più scure (prima con `DoubleSide` erano viste "da dietro"), frecce del senso unico, banchine con
  pensilina, fermate con pensilina e palina). Semafori a istanze ricolorati quando cambia una prenotazione.
- **Mezzi** a istanze (capsule tonde): faccine kawaii **sul lato della cabina** (texture disegnata una volta coi
  token), merce sopra il cassone con la sua forma (bidoni, spicchi, sacco, pagnotte, tronchi, giocattoli), fumo della
  vaporiera, beccheggio sulle salite, bus e camion tengono la destra.
- **Giorno e notte** (`express-sky.js`, puro e testato). Il cielo **è l'orologio**: `t = hourOf(h, tk)` (0 =
  mezzanotte, più la frazione di passo per un movimento fluido), quindi la notte sullo schermo è la notte dell'orologio:
  notte 21:00–4:30, alba rosa 4:30–6:30, giorno 6:30–18:30 (il più lungo), tramonto dorato 18:30–21:00. Un giro =
  un giorno di gioco: 28,8 s a ×1, 14,4 s a ×2, 7,2 s a ×4; in pausa o a partita finita il cielo si ferma con
  l'orologio. **Niente sfarfallio alle velocità alte**: la notte è meno profonda (`depth`: 1 a ×1, 0,7 a ×2, 0,4 a ×4;
  la UI ci scivola sopra in un paio di secondi), mentre finestre, lampioni e fari seguono la notte vera (`dark`).
  `light(t, sempreGiorno, depth)` dà pesi e moltiplicatori (`day`, `night`, `dark`, `gold`, `rose`, `amb`, `sun`,
  `dir`): curva continua anche a mezzanotte e con depth < 1, luce d'ambiente mai sotto il 62% del giorno e sole sempre
  alto sull'orizzonte, quindi di notte si legge tutto. I colori vengono dai token (`--exp-sky-dusk`, `--exp-sky-dawn`, `--exp-sky-night`,
  `--exp-sun-gold`, `--exp-moon`, `--exp-amb-night`, `--exp-window-lit`); ogni fotogramma si cambiano solo uniform e
  colori di luci e materiali (sfondo, luce emisferica, sole/luna, tinta dei materiali senza luce, finestre). Di sera si
  accendono le **finestre** delle case, i **lampioni** delle stazioni e delle fermate (palo + lanterna a istanze) e i
  **fari** dei mezzi (un'istanza per faro, disegnati solo quando sono accesi).
- **Indicatore** accanto alla data (sole, tramonto, luna, alba): toccandolo si passa a **"sempre giorno"** (luce di
  mezzogiorno fissa; scelta ricordata in `express:alwaysDay`). Chiavi `ex_always_day`, `ex_sky_day|sunset|night|dawn`.
- Sopra la barra degli strumenti una **pila** sola (`.ex-dock`, in colonna dal basso): fumetto di Hari, suggerimento
  dello strumento, scelte secondarie. Con testi lunghi (de, fi, ru) o scelte su due righe gli elementi si spingono in
  su, mai uno sopra l'altro; col telefono girato la pila sta in basso a sinistra, accanto alla colonna degli strumenti.
- Merci nell'interfaccia: icona con forma propria (persona, busta, bidone, spicchio, spiga, pagnotta, tronchi,
  giocattoli) + nome, quindi leggibili anche coi colori per daltonici (token Okabe-Ito in `[data-cvd]`) e in alto
  contrasto.

## Prestazioni
Pixel ratio ≤ 1,5 (cala fino a 0,75 se i fotogrammi sono lenti), niente ombre, 2 luci, niente oggetti creati per
fotogramma (matrici e vettori riusati), etichette DOM aggiornate solo con `transform`. Misure (Chromium headless con
SwiftShader, cioè GPU software, 402×874; `el._express.info()`):

| Scena | Draw call | Triangoli | CPU per fotogramma (media / max) |
|---|---|---|---|
| Livello 1, 1 bus | 23 | 24 k | 2,8 / — ms |
| Livello 4, 1 treno | 21–30 | 50–68 k | 2,7–3,0 ms |
| Livello 4 dopo 45 giorni del bot, tutta la mappa: giorno / notte (con lampioni e fari) | 40 / 41 (prima 37) | 52 k | 2,4 ms |
| Livello 4 con un ponte di 4 caselle, una galleria di 8, bus e treno (0.33, zoom 7) | 38–46 | 50–53 k | 1,9–2,3 / 6–11 ms |
| Libera 64×64, 80 mezzi a ×4, zoom normale | 61 | 307 k | 6,8 / 13,5 ms |
| Libera 64×64, 80 mezzi a ×4, tutta la mappa | 69 | 262 k | 8,2 / 22,6 ms |

Il CPU per fotogramma comprende la simulazione (≈ 1–3 µs per passo, `npm run bench`), l'aggiornamento delle istanze e
l'invio dei comandi; i fotogrammi al secondo in SwiftShader non dicono niente di un telefono vero (da provare: vedi TODO).

## Mappe reali (fase 3): punto d'ingresso
`HH.expressMap.fromShared(pack, opts)` è il punto d'ingresso unico: riceverà un pacchetto del modulo condiviso
`src/maps/<città>.js` (formato comune a Hari Taxi e Hari Express: costa, acque, strade, ferrovie, edifici, luoghi,
attribuzione ODbL una volta sola) e ne ricaverà la griglia di Express (~60 m per casella) nella stessa forma di
`generate()` (`{ w, h, ht, water, tree, roads, towns, inds }`). Lo stato userà `mode: 'real'` con `opts.map`, e
`baseMap()` in `express-logic.js` chiamerà `fromShared` invece di `generate`: il resto (salvataggio, simulazione, UI)
non cambia. Oggi lancia un errore chiaro ("phase 3"); la scelta "Mappe reali" nella schermata delle modalità ha il
lucchetto.

## Suoni e musica
Brano `express` (Sol maggiore, marimba e carillon, "ciuf-ciuf" con lo shuffle). Effetti nuovi in `src/core/audio.js`:
`whistle` (fischio del treno, a ogni arrivo di un treno, al più ogni 4 s), `cash` (cassa: consegna pagata, al più ogni
0,7 s), `horn` (clacson del camion: mezzo comprato); riusati `place`, `boing`, `mark`, `tap`, `blip`, `bad`.
