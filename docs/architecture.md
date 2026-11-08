# Architettura

## Scelte
- **Vanilla JS, zero dipendenze, nessun bundler obbligatorio.** Ogni file è uno script classico che aggiunge un modulo a `window.HH`. Si apre anche da `file://` e si può fondere in un unico HTML (`npm run build`).
- **PWA**: `manifest.webmanifest` + `sw.js` (cache-first della shell, font in cache al primo avvio). Installabile su Android da Chrome; impacchettabile come APK con TWA.
- **Stato locale**: `localStorage` con prefisso `harihari:`, sempre in `try/catch`:
  `lang`, `muted`, `hd:mode`, `screen` (gioco aperto), `prog:<id>` (livello, vittorie, record, punti totali, stelle, miglior tempo), `save:<id>` (partita in sospeso, versione 2).

## Salvataggio e ripresa
- Ogni gioco espone `snapshot()` (stato serializzabile, con cronologia per "Annulla" limitata a 80 passi) e accetta lo stato salvato in `create(el, ctx, saved)`.
- L'app salva a ogni mossa (`ctx.changed()`), ogni 5 s di timer, e quando la pagina va in background (`visibilitychange`, `pagehide`).
- All'avvio, se `screen` indica un gioco con partita salvata, si riapre direttamente quella partita (tempo e mosse inclusi). In home compare il banner "Partita in sospeso" e le card mostrano "Continua".
- Alla vittoria il salvataggio viene cancellato e il livello avanza.

## Punteggio
`100 + 25 × livello + 60 × stelle + bonus tempo` dove bonus = 2 × secondi risparmiati rispetto a `parTime`.
Fragoline (1–3, al posto delle stelle) da `rate(snapshot)`: Hedgedoku 3 senza errori, 2 con uno, 1 con due; Boba 3 col minimo esatto, 2 entro il 70% delle mosse in più, 1 oltre; Lantern ≤ tocchi di generazione = 3★, ≤ 2× = 2★.

## Ordine di caricamento
```
locales.js → rng.js → core.js (store, progress, i18n) → mascot.js → audio.js → fx.js → transition.js → <gioco>-logic.js → <gioco>-ui.js … → app.js (boot)
```

## Flusso
1. `app.js` → `boot()`: lingua da storage o da `navigator.languages`, `dir` per RTL, sfondo canvas, suono, service worker.
2. Home: card da `HH.games` + card "in arrivo" (`SOON`).
3. Tocco card → `openGame(id)`: schermo intero (`autoFull()`, sincrono dentro il tocco), poi transizione
   (`HH.transition.run`); a schermo coperto scarica il gioco se serve (`HH.loadGame`) e `showGame` crea `ctx`, chiama
   `game.create(boardEl, ctx)`, `history.pushState` per il tasto indietro di Android.
4. `ctx.win()` → livello +1 salvato, suono, coriandoli, salto di Hari, finestra "Avanti".

## Contratto del gioco
Vedi `.claude/skills/add-game/SKILL.md`. Logica pura in `*-logic.js` (testata da `tools/selftest.mjs`), UI in `*-ui.js`.

**Giochi senza fine** (`endless: true` nella voce del catalogo e in `HH.games`, es. Hari Home): niente livello,
fragoline, cuori, tempo e mosse. L'app chiede al gioco `meta(state)` → `[{ i: icona, v: testo }]` (icone di `ICON` in
`app.js`: `cake`, `sun`, `acorn`…), lo salva insieme alla partita (`save.meta`) e lo mostra nei chip dell'header, nella
card in home, in "Riprendi" e nei Progressi (la home non ha il codice del gioco, quindi legge `save.meta`). Nell'header
restano solo "Ricomincia" (il gioco chiede conferma) e "?"; niente messaggi "a metà!/quasi fatto!" (`progress` guida
solo la musica). La voce del catalogo può avere `rulesEn` come testo di riserva finché la chiave regole non è tradotta.

**File condivisi fra giochi**: una voce del catalogo può elencare file di un altro gioco (Hari Sudoku carica `hedgedoku.css`
e `hog-kit.js`, il riccio animato di Hedgedoku). `build-inline.mjs` li include una volta sola e `gen-cards.mjs` copia i token
di un CSS condiviso solo per il primo gioco che lo usa. **`coach: true`**: il gioco ha un suo Hari che parla sulla griglia
(vedi `docs/audio.md`).

## Transizione fra home e giochi (`src/core/transition.js`)
- **Quando**: entrando in un gioco dalla home (`openGame`) e tornando alla home (`goHome`: pulsante, tasto indietro /
  `popstate`, "Home" nelle finestre di vittoria e sconfitta). **Non** alla ripresa della partita all'avvio
  (`S.noTrans`), al cambio di lingua o di mappa (il gioco è già aperto), a "Prossimo livello", agli aggiornamenti.
  Con l'avviso legale da accettare si apre prima quello; la transizione parte dopo l'accettazione.
- **Come**: `HH.transition.run(swap)` copre lo schermo (~480 ms), esegue `swap` (anche async: download del gioco)
  sotto la copertura, aspetta un fotogramma e scopre (~560 ms): ~1,05 s in tutto. Se `swap` dura più di 250 ms compare
  un piccolo Hari che rimbalza; si scopre solo a schermata pronta (al massimo dopo 15 s). Tocchi bloccati dal velo
  (z-index 90, sopra a schermo intero e dialoghi); il focus va su "indietro" nel gioco o sulla card del gioco in home,
  solo se si era perso.
- **Varianti** (una a caso, mai la stessa due volte di fila): foglie autunnali, petali, bolle di sapone, stelline e
  cuoricini, aculei e ghiande di Hari, frutta, nuvolette. ~24–48 SVG su una griglia mossa (posizioni in vw/vh, quindi
  reggono la rotazione del telefono; in RTL i movimenti si specchiano) + un velo `--bg` che garantisce la copertura
  piena. Solo transform/opacity (Web Animations API). Colori: token `--tr-*` (tema chiaro e scuro).
- **Movimento ridotto**: solo il velo, dissolvenza di ~360 ms.
- **Concorrenza**: un secondo tocco durante la transizione si ignora; un `goHome` doppio è ignorato (`S.leaving`);
  chiamate a `run` durante la copertura usano la stessa copertura, durante la scoperta partono subito dopo.
  Aggiornamenti in attesa (`updateReady`, `heal`) aspettano la fine della transizione.
- **Segnali** per test ed e2e: `<html data-trans="cover|hold|reveal">` e l'evento `hh:trans` (`detail.phase`:
  `start`, `swap`, `end`). Il gioco è già disegnato sotto il velo durante la scoperta: i click di Playwright aspettano
  da soli che il velo sparisca.
- **Suono**: `HH.audio.sfx.rustle`, un fruscio breve (rispetta silenzio e volume degli effetti).
- Test: `tests/transition.test.mjs` (varianti, particelle deterministiche col seme e copertura, durata, token).

## Schermo intero
- **Bersaglio**: `document.documentElement` (non il riquadro di gioco). Così lo schermo intero sopravvive al cambio di
  gioco (il riquadro `#gPlate` viene ricreato a ogni apertura e, se fosse lui l'elemento a schermo intero, il browser ne
  uscirebbe, per esempio cambiando mappa in Hari Taxi o lingua) e le finestre di vittoria, sconfitta, tutorial e i dialoghi, che stanno nel `<body>` con `z-index` più alto,
  restano visibili sopra al gioco. A schermo intero `<html>` ha la classe `fs-on`: `.fs-on .plate` copre la pagina con
  `position: fixed` (geometria con `!important`, come il foglio del browser per `:fullscreen`). Le regole di schermo
  intero dei giochi si scrivono `.fs-on .plate …` (stessa specificità del vecchio `.plate:fullscreen`).
- **Unica modalità**: i giochi si giocano SOLO a schermo intero; non c'è più una vista normale del gioco né un pulsante
  per entrare o uscire (`#gFull` e `#homeFsExit` tolti). La classe `html.fs-on` è legata al gioco aperto (`showGame` la
  mette, `leaveGame` la toglie), non allo stato del browser: così uscite e rientri non fanno mai vedere la vista normale.
- **Home in vista normale**: tornando alla home (barra del gioco, menu del logo, tasto home `#gFsExit` nella barra, vittoria →
  home, indietro) `leaveGame` esce dallo schermo intero a schermo coperto dalla transizione. Motivo: la home scorre, ha
  dialoghi (lingue, statistiche, installazione, avviso legale) e non guadagna nulla dallo schermo intero; ogni gioco ci
  rientra comunque dal tocco sulla card.
- **Avvio**: `autoFull` all'inizio di `openGame`, dentro il tocco sulla card e prima dello scaricamento e della
  transizione (che farebbero scadere il gesto). Senza tocco (partita ripresa all'avvio, link diretto, ricarica dopo un
  aggiornamento) il browser non lo permette: il gioco si apre nella disposizione a tutto schermo coperto dal **velo**
  (`#fsVeil`: Hari e un grande pulsante con l'icona dello schermo intero, `aria-label` = `full`, testo `pa_tap`); il primo
  tocco rientra (`requestFullscreen` dentro quel tocco) e il gioco parte. Con `navigator.userActivation` non attivo non si
  chiama nemmeno `requestFullscreen` (niente errori in console).
- **Pseudo-schermo intero**: dove l'API non c'è (`canFull()` falso: iPhone in Safari o Chrome, iframe) o il browser
  rifiuta la richiesta fatta dentro un tocco (permessi, criteri dell'iframe: `fsDenied` per il resto della sessione), la
  stessa disposizione `.fs-on .plate` occupa tutta la finestra. Niente velo e niente pulsante.
- **Uscita fatta dal browser mentre si gioca** (`fullscreenchange` senza schermo intero, `fsLost`):
  - *indietro* (tasto o gesto indietro di Android, Esc su PC) → subito alla home con la transizione (`fsBack`: `goHome`
    e, se il gioco aveva una voce nella history, un solo `history.back()` con `S.pushed` già a `false`, così il
    `popstate` che segue non rifà nulla; se il browser manda anche il suo `popstate`, `S.leaving` blocca il secondo
    `goHome`). La disposizione `fs-on` resta finché la transizione non copre lo schermo: niente passaggio dalla vista normale.
  - *cambio d'app, blocco schermo, notifica a tutto schermo* → la pagina diventa nascosta: il gioco resta, in pausa sotto
    il velo; il primo tocco rientra a schermo intero e riprende la partita da dov'era (stesso stato, nessuna ricarica).
    Se il rientro viene rifiutato, il gioco riparte lo stesso in pseudo-schermo intero.
  - Come si distinguono (l'ordine di `visibilitychange` e `fullscreenchange` cambia tra i browser): è un cambio d'app se
    al momento dell'uscita la pagina è nascosta, se si nasconde entro `FS_WAIT` (350 ms) dopo l'uscita, oppure se l'uscita
    arriva entro `FS_BACK_GRACE` (1 s) dal ritorno in primo piano dopo essere stata nascosta durante lo schermo intero
    (alcuni Android notificano l'uscita solo al ritorno). Altrimenti, finiti i 350 ms, è un indietro.
  - Il velo mette in pausa il gioco (`inst.pause()`, ripreso con `inst.resume()` al tocco) solo se non è in rete
    (`inst.online()`: Rally e Street in rete gestiscono da soli la pagina nascosta e la connessione non deve cadere) e
    se non è aperta una finestra (tutorial, vittoria, sconfitta). Il cronometro dell'app non avanza col velo.
  - Rally e Street bloccano l'orizzontale, Hari Fishing il verticale (solo al tocco): al rientro dal velo
    `fullscreenchange` riapplica il blocco (Rally e Fishing `onFull`, Street `onFull` con `lockedFs`). Hari Colors si
    ferma da solo con la pagina nascosta (voce compresa) e riparte dal tocco sulla sua copertina, che sblocca la voce.
- e2e: `tools/fullscreen-e2e.mjs` (Chromium: apertura, indietro una volta sola, cambio d'app nei due ordini, ripresa
  all'avvio, blocco dell'orientamento, richiesta rifiutata, RTL; `document.hidden` e `visibilitychange` emulati).
- **Adattamento** (`fitFs` in `app.js`, rilanciato a ogni apertura, nuovo livello, ricomincia e `resize`):
  - **fill** (contratto opzionale, `fill: true` nella voce di `HH.games`): il contenitore del gioco (primo figlio di
    `#board`) riempie tutto lo spazio sotto la barra (`.plate.fs-fill`), e il CSS del gioco dice quale pezzo cresce
    (`flex: 1; aspect-ratio: auto`). La scena si adatta alla misura reale con un `ResizeObserver` sul palco (o
    all'evento `resize`, che `fitFs` lancia sempre alla fine). Se più spazio cambierebbe il gioco, si scala la **vista**,
    non il gioco: Hari Snack Rush disegna una vista 2:3 "virtuale" appoggiata in basso (in verticale cresce il cielo, in
    orizzontale crescono i prati ai lati; strada, sagome e sensibilità del trascinamento restano identiche); Hari Home
    inquadra la casa con `R.view(s, W, H)` e col telefono girato mette i comandi in una colonna a sinistra.
    Usano fill: `snack`, `life`; `drive` e `rally` riempiono già da soli con regole proprie.
  - **side** (riquadro largo, automatico): se il gioco è una pila verticale (barra, griglia, piede), il pezzo più grande
    va al centro alto quanto il riquadro e gli altri nelle colonne ai lati (quelli prima a sinistra, quelli dopo a
    destra). Si tiene solo se il pezzo principale viene più grande che in pila e nessun pezzo laterale sborda o si
    rimpicciolisce (area "disegnata" ≥ 40% di quella in pila: un nastro che scala con la larghezza non va di lato).
  - **spread** (pila normale, tipicamente in verticale): larghezza massima che entra, i pezzi prima del principale
    attaccati alla barra in alto (niente fascia vuota tra HUD e gioco), il principale e i successivi centrati nel resto.
  - Un `MutationObserver` sui figli diretti di `#board` e del contenitore rimette le classi se il gioco ridisegna il
    proprio contenitore a ogni mossa (il callback gira prima del disegno: niente salti).
  - Layout specifici: Hari Sushi Bar col telefono girato (locale e nastro a sinistra, cucina e piatti a destra), Hari
    Memory col tavolo "sdraiato" (righe e colonne scambiate solo a video) quando lo schermo è largo.

## Offline
- Shell e icone: precache in `sw.js` (`SHELL`). **Aggiorna `VERSION`** a ogni release.
- **Giochi in lazy load**: all'avvio si caricano solo `src/games/catalog.js` (elenco dei giochi e dei loro file),
  `cards.js` e `tokens.css` (generati da `npm run cards`: illustrazioni, colori e stili delle card). Aprendo un gioco,
  `HH.loadGame(id)` inserisce i suoi CSS e script nell'ordine del catalogo. Il service worker (che legge il catalogo con
  `importScripts`) mette in cache i file del gioco la prima volta che arrivano: da lì in poi il gioco funziona offline.
  A ogni aggiornamento i giochi già scaricati vengono riscaricati nella cache nuova (se manca la rete si tiene la copia
  vecchia). Le card dei giochi non ancora scaricati hanno una nuvoletta; offline, aprirli mostra un messaggio di Hari.
  La versione in un file (`npm run build`) contiene tutti i giochi.
- Font Google: cache runtime `hh-fonts`. Roadmap v0.3: font in `assets/fonts/` (woff2 sottoinsieme) per offline già al primo avvio.
- Nessuna API di rete nel codice di gioco.
