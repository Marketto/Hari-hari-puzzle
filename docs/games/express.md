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
   costano 0. **Ponti** dritti fino a 3 caselle d'acqua tra due rive alla stessa altezza. **Passaggi a livello**:
   strada e binario si incrociano solo dritti e perpendicolari. Dove due linee si toccano nasce uno **scambio
   automatico** (il mezzo sceglie l'uscita col suo percorso).
3. **Stazioni e fermate**: stazione dei treni dritta da 1 a 5 caselle (in piano), fermata di bus e camion su una strada
   dritta o una casella libera. Caselle vicine sullo stesso asse si uniscono alla stessa stazione. **Area di
   raccolta**: 3 caselle attorno per i treni, 2 per bus e camion (si vede toccando la stazione).
4. **Mezzi**: bus (30 passeggeri), furgone della posta (20), camion (20 di una merce), locomotiva a vapore "Castagna"
   con fino a 6 vagoni (passeggeri 40, posta 30, latte 30, formaggio 25, grano 35, pane 25, legna 30, giocattoli 25);
   l'elettrica "Fragola" dall'anno 5. Al massimo 80 mezzi su telefono, 200 su PC.
5. **Percorso**: le fermate in ordine, ciascuna con "aspetta il pieno". A ogni fermata il mezzo scarica quello che la
   stazione accetta (non quello caricato lì), poi carica; riparte dopo mezzo giorno se non c'è altro da caricare.
6. **Merci e catene**: passeggeri e posta tra villaggi; fattoria → latte → caseificio → formaggio → città; campo →
   grano → forno → pane → città; bosco → legna → segheria → giocattoli → città. Le fabbriche trasformano 1:1.
   Un villaggio accetta passeggeri e posta con almeno 1 casa nell'area, formaggio, pane e giocattoli con almeno 2.
7. **Treni e semafori** (versione semplice ma robusta, vedi sotto). Binari a **senso unico** (frecce).
8. **Città**: ogni mese crescono se servite bene (passeggeri presi negli ultimi 30 giorni con valutazione ≥ 35%,
   merci e posta consegnate): `crescita = ⌊punti × (2 + 3% abitanti)⌋`, punti = 1 (servita) + min(3, merci/10) +
   min(1, posta e passeggeri/40). Le case nuove (una ogni 30 abitanti) nascono vicino alle strade e alle altre case.
9. **Ghiande finite**: a fine mese, se il saldo è sotto zero, Hari vende il mezzo che rende meno.

## Economia (media)
- **Pagamento** = quantità × distanza (Manhattan tra le stazioni) × prezzo × fattore tempo; fattore 1 fino a `d1`
  giorni di viaggio, poi cala fino a 0,3 in `d2` giorni.

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
  (binario) per casella d'acqua, fermata 220, stazione 360 per casella, semaforo 80, senso unico 30, demolizione 8.
- **Mezzi**: bus e posta 900 (esercizio 150/anno), camion 1.100 (180), Castagna 3.500 (700), Fragola 7.000 (1.100),
  vagone 400 (60). Vendita: metà del prezzo.
- **Manutenzione** mensile: 1 per casella di binario, 0,5 per casella di strada costruita, 3 per casella di stazione.
- **Valutazione** della stazione per merce (0–100%), ogni giorno verso un obiettivo di 17% + passaggi recenti (40% entro 7
  giorni … 0 oltre 60) + poca merce in attesa (25% sotto 40 … −10% oltre 300) + velocità del mezzo (fino a 15%), ±2%
  al giorno. La produzione arriva alla stazione moltiplicata per la valutazione; la merce che aspetta troppo se ne va
  (3% × (1 − valutazione) al giorno). Una merce compare in una stazione solo dopo il primo passaggio di un mezzo che la
  porta.
- **Produzione**: fattoria 80 latte al mese, campo 90 grano, bosco 80 legna; villaggi: passeggeri = abitanti / 40 al
  giorno, posta = abitanti / 120, divisi tra le stazioni in proporzione alle case coperte.
- Niente prestiti né inflazione.

## Tempo
Passo fisso: 1 giorno = 24 passi; a ×1 la UI fa 20 passi al secondo (1,2 s al giorno), poi ×2, ×4 e pausa. Anni di
365 giorni coi mesi veri (data scritta con `Intl.DateTimeFormat` nella lingua dell'app). Tutto deterministico: lo stato
contiene anche il generatore casuale (`rs`) usato per le case nuove.

## Treni e semafori
- Ogni treno **prenota** le caselle prima di entrarci (`W.resv`); una casella prenotata da un treno non può esserlo da un
  altro, quindi due treni non si toccano mai (test: nessuna casella sotto due treni a ogni passo).
- Quando serve la casella successiva il treno prenota, tutto o niente, il tratto del suo percorso da lì fino al prossimo
  **semaforo** (escluso) o fino in fondo alla banchina di arrivo; se una casella è di un altro treno aspetta (rosso).
  Le caselle si liberano quando l'ultimo vagone le lascia. Il semaforo è rosso se il tratto dopo è prenotato.
- **Senza semafori** una linea è un tratto unico: un solo treno per volta (due treni su un anello senza semafori si
  aspettano a vicenda: fermi, mai scontrati; Hari lo dice). Coi semafori più treni si seguono.
- Hari dice "un treno è bloccato" solo se un treno in viaggio è fermo da più di 8 giorni davanti a un tratto prenotato
  da **un altro treno** (contatore `v.bk`, `S.blocked(v)`); l'attesa del pieno e l'inversione al capolinea non contano.
- Rete di salvataggio: un treno fermo al rosso da 20 giorni prova a girarsi se dietro c'è una strada per la meta.
- I treni si girano solo alle stazioni di testa (binario cieco dopo la banchina) o con la rete di salvataggio; bus e
  camion fanno inversione ai fondi ciechi e alle fermate, e non si scontrano (mondo gentile).
- Livello 5 (e la soluzione del bot): anello con una freccia di senso unico per via e un semaforo ogni 4 caselle.

## Livelli
`config(level)`: livelli 1–5 dai modelli di `express-map.js` (`LEVELS`), dal 6 sfide che riusano i modelli 3–5 con
obiettivi × (1 + 0,2 · ⌈(livello − 5) / 3⌉). I siti sono piazzati col seme e verificati raggiungibili (BFS con dislivello
≤ 1 e ponti ≤ 3); per le ferrovie (4, 5) tra i due siti e 3 caselle attorno non c'è acqua (c'è posto per un anello).

| Livello | Mappa | Obiettivi | Ghiande | Scadenza | Par (3 fragoline) | Bot: giorni medi (max) |
|---|---|---|---|---|---|---|
| 1 Il primo bus | 18×18 | 120 passeggeri | 3.000 | 365 | 90 | 39 (54) |
| 2 Il camion del latte | 20×20 | 200 latte al caseificio | 4.000 | 365 | 150 | 94 (105) |
| 3 La catena del formaggio | 24×24 | 150 latte al caseificio, 100 formaggi in città | 8.000 | 540 | 170 | 88 (93) |
| 4 Il primo treno | 28×28 isola | 400 grano al forno, 1 treno, 100 pani in città | 17.000 | 540 | 260 | 137 (157) |
| 5 Due treni e i semafori | 32×32 isola | 500 legna alla segheria, 2 treni, città +120 abitanti | 30.000 | 730 | 380 | 222 (223) |

Stelle: 3 se vinto entro `par` giorni, 2 entro 1,5 × par, 1 altrimenti (una in meno se restano meno di un quarto delle
ghiande iniziali). `parTime` (secondi veri per il bonus dell'app) = par × 0,6 + 90. Scadenza superata = sconfitta
("bloccato"). `progress` = media degli obiettivi (Libera: mezzi e stazioni). Generazione media < 10 ms (`npm run bench`).

## Risolvibilità (regola 3)
`tests/express.test.mjs` fa giocare un **bot** (`tests/_express-bot.mjs`) che vede solo quello che vede il giocatore
(terreno, acqua, case, industrie, strade e binari, stazioni, obiettivi, ghiande) e usa le stesse azioni della UI:
l'anteprima del percorso (`preview`), `act` (strada, fermata, stazione, binario, semaforo, senso unico, compra) e il
tempo che passa (`step`). Trova industrie e villaggi dagli obiettivi (merce → chi la produce o la accetta). Vince i
livelli 1–5 con 6 semi ciascuno e le sfide 6–8. Non fare niente perde ogni livello alla scadenza. Altri test:
determinismo e ripresa da JSON (anche a metà, con treni in viaggio), anteprima = costo vero, ponti e giri attorno alle
case, A* dei mezzi (via più corta, senso unico, inversione al fondo cieco), due e tre treni su un anello coi semafori
senza scontri e senza blocchi, treni frontali su binario unico mai scontrati, pagamento che cala coi giorni, valutazione
che sale e scende, città che crescono solo se servite, Libera, consigli di Hari, geometria dentro la casella.

## Salvataggio
`snapshot()` = lo stato `s` (JSON, `v: 1`): `{ mode, level, seed, opts, day, tk, money, m0, net, cut, towns, inds,
stations, veh, nid, nv, del, gd, fin, finY, goals, deadline, par, won, lost, wonDay, moves, rs, speed }`. **La mappa non
c'è**: si rigenera dal seme (`scenario(level, seed)` o `generate(opts, rng(seed))`); `net` contiene solo le caselle
cambiate `{ indice: [binari, strade, semaforo, senso unico] }`, `cut` gli alberi tolti, i villaggi le loro case (anche
quelle nuove). Le tabelle dense (`W`: altezze, acqua, maschere, stazioni, prenotazioni) sono in una proprietà non
enumerabile ricostruita da `world(s)`; `nv` (versione della rete) fa ripartire i percorsi nello stesso modo dopo una
ripresa. Un livello a metà pesa 10–40 KB. In più `tod` (ora del giorno della scena, 3 decimali): solo grafica, la
simulazione non la legge mai (testato: stessa partita con `tod` diversi = stesso stato).

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
- Schede a foglio dal basso (girato: a destra): stazione (valutazione, merci in attesa con icona, merci accettate,
  mezzi, "Nuovo treno/bus o camion"), nuovo mezzo e percorso (mezzo, merce o vagoni, fermate toccate sulla mappa in
  ordine, aspetta il pieno, giro stimato in giorni, totale, "Compra e parti"), mezzo (guadagno, carico, percorso,
  vendi), villaggio, industria, conti e obiettivi (obiettivi, conti dell'anno con grafico, mezzi, avversari in arrivo).
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
  traversine, rotaie, curve, scambi, paraurti, ponti con pilastri e ringhiere, frecce del senso unico, banchine con
  pensilina, fermate con pensilina e palina). Semafori a istanze ricolorati quando cambia una prenotazione.
- **Mezzi** a istanze (capsule tonde): faccine kawaii **sul lato della cabina** (texture disegnata una volta coi
  token), merce sopra il cassone con la sua forma (bidoni, spicchi, sacco, pagnotte, tronchi, giocattoli), fumo della
  vaporiera, beccheggio sulle salite, bus e camion tengono la destra.
- **Giorno e notte** (`express-sky.js`, puro e testato). Ora del giorno `t ∈ [0,1)`: giorno 0–0,58 (il più lungo),
  tramonto dorato 0,58–0,70, notte 0,70–0,90 (breve, luce azzurro-viola soffice), alba rosa 0,90–1. Un giorno dura
  **180 s reali a ×1**, 90 s a ×2 e **mai meno di 60 s** (a ×4 al massimo un giro al minuto, niente sfarfallio); in pausa
  o a partita finita il cielo si ferma. Una partita nuova parte di mattina (`START` = 0,06); il salvataggio porta `tod`.
  `light(t)` dà pesi e moltiplicatori (`day`, `night`, `gold`, `rose`, `amb`, `sun`, `dir`): curva continua (nessun
  salto fra un fotogramma e l'altro), luce d'ambiente mai sotto il 62% del giorno e sole sempre alto sull'orizzonte,
  quindi di notte si legge tutto. I colori vengono dai token (`--exp-sky-dusk`, `--exp-sky-dawn`, `--exp-sky-night`,
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
