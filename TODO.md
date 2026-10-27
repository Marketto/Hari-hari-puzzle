# TODO

## In corso
- [x] Repo pubblico collegato: https://github.com/Marketto/Hari-hari-puzzle (autori commit anonimizzati con noreply GitHub)
- [x] GitHub Pages attivo: https://marketto.github.io/Hari-hari-puzzle/ (deploy automatico a ogni push su `main`)
- [ ] Prova di installazione su un telefono Android reale (trascinamento ✕ e animazione travaso al tatto)

## Prossimo
- [ ] Altri giochi dalla lista proposte (Hari Push / Sokoban, Mochi Slide, Candy Code…)
- [ ] Font locali in `assets/fonts/` (woff2 sottoinsieme) per offline già al primo avvio
- [ ] Hedgedoku: pulsante suggerimento (usa `logicSolve` per indicare la prossima deduzione) e ✕ automatiche opzionali
- [ ] Boba Sort: "+1 bicchiere" una volta per livello
- [ ] Impostazioni: tema chiaro/scuro/sistema, vibrazione, azzera progressi
- [ ] Revisione madrelingua: mt, ga, cy, lb, eu, is (in particolare i nomi di attrezzi/guasti di Fix-It House)

## Fatto (v0.9.2)
- [x] Hari Knots stile Shanghai: si sposta solo una corda senza niente sopra (le altre hanno il lucchettino); la corda spostata si posa sopra quelle che incrocia; vola via solo quando non incrocia nessuna corda (niente sopra, niente sotto); limite di mosse come Boba Sort; minimi da 2 a ~10 mosse; niente più avvolgimenti

## Fatto (v0.9.1)
- [x] Hari Knots, regola nuova: il capo sollevato viaggia in aria sopra tutto; se passa sopra una corda che copriva la sua ci si avvolge (si srotola solo ripassandoci sopra); anteprima rossa durante il trascinamento, animazione di avvolgimento e srotolamento; livelli con trappole vere (la giocata ingenua non basta), minimo 2→5–6 mosse; tutorial e regole aggiornati in 43 lingue

## Fatto (v0.9.0)
- [x] Nuovo gioco **Hari Knots**: corde agganciate ai fori di lastre pastello; la corda spostata passa sopra a quelle che incrocia per la prima volta; corde scoperte e non attorcigliate volano via a catena; lastre libere cadono. Fisica Verlet, A* per il minimo, oracolo BFS nei test, brano `ropes`, tutorial, 11 stringhe × 43 lingue

## Fatto (v0.8.1)
- [x] Sushi Bar: piattini più distanziati (4 per giro, 25–40 px liberi a 360 px), nastro un po' più veloce e clienti più pazienti per compensare
- [x] Sushi Bar: più varietà subito (livello 1: onigiri, salmone, tonno, gambero), una ricetta nuova ogni 2 livelli; il disegno del nastro scorre alla velocità dei piattini

## Fatto (v0.8.0)
- [x] Nuovi giochi: **Pixel Mochi** (nonogram, 43 disegni), **Mochi Binary** (takuzu), **Yarn Link** (flow) con brani musicali propri
- [x] Hedgedoku: tocco = ✕, doppio tocco = riccio (una sola mossa), trascinamento; ricci animati che respirano, si guardano intorno e reagiscono
- [x] Tutorial della prima partita per tutti i 9 giochi (pulsante "?" per rivederlo; giochi a tempo in pausa)
- [x] Schermo sempre acceso durante la partita (Screen Wake Lock)
- [x] "In arrivo" si svuota da solo quando il gioco esiste
- [x] 94 nuove stringhe × 43 lingue

## Fatto (v0.7.1)
- [x] Aggiornamento robusto: il service worker nuovo si attiva subito se la pagina aperta è di una versione vecchia (o l'app è chiusa); controllo aggiornamenti anche all'avvio

## Fatto (v0.7.0)
- [x] Sushi Bar in stile "film anni '90" (proposta 2): fondale dipinto con filtro acquerello e grana della carta, personaggi cel, vista serale, vapore
- [x] Fix-It House in stile shoujo (proposta 1): palette prugna/lilla, retini, bolle, stelline, pizzo; cartellone "Episodio N" + etichetta "Ep. N"
- [x] Fix-It House: 5 ambienti a rotazione (casetta, cucina, cameretta, bagno, giardino con serra), ognuno col suo catalogo di guasti; 15 attrezzi nuovi; salvataggi vecchi validi
- [x] Nuovo gioco **Hari Parade** (Snake): sfilata di ricci, frutti, stella e orologio, ostacoli, 3 cuori, croce direzionale, parte al primo tocco; brano `parade`
- [x] Proposte grafiche pubblicate in `design/proposte-anime.html`
- [x] Messaggi di Hari più lenti (≥ 4,5 s, uno ogni 9 s al massimo); versione accanto al titolo (`HH.VERSION`, testata con package.json e sw.js)
- [x] 87 nuove stringhe × 43 lingue (183 chiavi totali)

## Fatto (v0.6.2)
- [x] Proposta d'installazione su Android: finestra di Hari (prompt nativo su Chrome, istruzioni dal menu sugli altri browser), "Più tardi" = 3 giorni, mai durante una partita
- [x] Aggiornamenti automatici: controllo all'avvio, al ritorno nell'app e ogni 30 min; si applicano nella home o in background, in partita con il pulsante "Aggiorna"; partita salvata e ripresa
- [x] Salvataggi a prova di aggiornamento: migrazioni `HH.progress.MIGRATE`, copia di riserva se un salvataggio non si apre, `storage.persist()`; icona apple-touch nella cache offline
- [x] `tests/pwa.test.mjs` (versione, shell offline, SW, migrazioni); 7 stringhe × 43 lingue

## Fatto (v0.6.1)
- [x] Sushi Bar in stile anime: locale con noren, lanterne, finestra tonda con sakura e targhette; clienti con kimono, occhioni a due riflessi, guanciotte e battito di ciglia; cibo con ombre cel e riflessi; nastro in acciaio con piattini colorati; Hari con hachimaki; tagliere di hinoki e secchio di legno
- [x] Fix-It House in stile anime: temporale (nuvole, pioggia, lampo) che si dirada a ogni riparazione, colline, staccionata, albero ombreggiato, casa con assi, zoccolo, porta a pannelli, orologio e mensola, cassetta della posta, Hari col caschetto che salta a ogni riparazione; attrezzi in una cassetta con maniglia

## Fatto (v0.6.0)
- [x] Nuovo gioco **Fix-It House**: 17 guasti con dipendenze di buon senso (scala → tetto/camino, crepa → vernice, valvola → tubo → pozzanghera, interruttore → fili → lampada…), attrezzo giusto, 3 cuori, frecce che rivelano le dipendenze
- [x] Guasti ben visibili (contorno tratteggiato + bollino "!"), brano `fixit`, 35 stringhe × 43 lingue, 28 test con oracolo indipendente (73 test totali)

## Fatto (v0.5.0)
- [x] Lantern Glow: minimo esatto con Gauss su GF(2) (test contro forza bruta), mosse contate, sconfitta a mosse finite
- [x] Regola condivisa `src/core/rules.js` (mosse extra e fragoline) usata da Boba e Lantern
- [x] Nuovo gioco **Sushi Bar**: nastro kaiten, 9 ricette, 8 clienti animali, pazienza, 3 cuori, Hari cuoco; bot di test vince i livelli 1–15
- [x] Brano musicale `sushi`; 3 nuove stringhe × 43 lingue; card "in arrivo" Sushi Binary → Mochi Binary (44 test)

## Fatto (v0.4.2)
- [x] Boba Sort: bicchieri senza la riga sulla bocca (contorno aperto, bordo con retro tenue)
- [x] Barra in alto: niente più sforamento su telefono (Installa solo icona, marchio nascosto quando serve spazio); verificato a 360 e 390 px

## Fatto (v0.4.1)
- [x] Valutazione a fragoline al posto delle stelle (HUD, card, vittoria, progressi)
- [x] Boba Sort: 3 fragoline col minimo, 2 entro il 70% delle mosse extra, 1 oltre (test)

## Fatto (v0.4.0)
- [x] Boba Sort: minimo esatto con A* (test contro BFS), mosse concesse = minimo +15% (+2…+6), contatore mosse rimaste
- [x] Boba Sort: sconfitta per mosse finite, nessuna versata possibile o vicolo cieco → finestra e Riprova
- [x] Boba Sort: suono di bicchiere sollevato/appoggiato al posto della campanella
- [x] 4 nuove stringhe × 43 lingue (31 test totali)

## Fatto (v0.3.0)
- [x] Hedgedoku: verifica immediata contro la soluzione, ricci sbagliati evidenziati con chi li blocca, 3 cuori, "cuori finiti" → ricomincia
- [x] Hedgedoku: riccio d'aiuto dal livello 6; stelle in base agli errori; nuovi unit test su `judge()` e aiuto (26 test totali)
- [x] Boba Sort: liquido che segue la gravità durante il travaso (canvas, livelli a volume costante, sciabordio)
- [x] Musica generativa: menu + un brano per gioco, strati dinamici legati al progresso, tempo che accelera vicino alla soluzione
- [x] Effetti sonori intonati, pulsanti musica/effetti separati
- [x] Hari parla: fumetti motivazionali (14 frasi × 43 lingue), espressione triste

## Fatto (v0.2.0)
- [x] Salvataggio automatico della partita (mossa, timer, background) e ripresa all'avvio
- [x] Punteggio, stelle 1–3, record, miglior tempo, vittorie; schermata Progressi; ghiande totali in alto
- [x] Hedgedoku: modalità Riccio/Segna, ✕ rimovibili, trascinamento, pressione lunga, aggiornamento incrementale
- [x] Hedgedoku: generatore v2 con filtro logico + 8 colori di zona ben distinti
- [x] Unit test `node --test` con oracolo a forza bruta (17 test)
- [x] Boba Sort: animazione di travaso (volo, inclinazione, getto, svuota/riempi, schizzi, coperchio)
- [x] Mascotte v2 (aculei a strati, occhioni anime, fragola, sakura, espressioni felice/oops, cuori al tocco)
- [x] Grafica v2: nuvole, luna di notte, dolcetti fluttuanti, colline, card smerlate, bottoni candy, lanterne con faccine, vittoria con raggi e stelle

## Fatto (v0.1.0)
- [x] Shell PWA, 3 giochi, 43 lingue + RTL, struttura agentica, CI e deploy Pages

## Verifiche
- 2026-10-27 v0.9.2 · `npm test` · Hari Knots: livelli 1/6/22 risolti, tocco su corda bloccata, sconfitta per mosse finite; testi in 43 lingue
- 2026-10-27 v0.9.1 · `npm test` · Hari Knots: mossa che avvolge trascinata nel browser → anteprima rossa e avvolgimento, livelli 1/8/22 risolti fino alla vittoria
- 2026-10-27 v0.9.0 · `npm test` 176/176 · 10 giochi × it/ja/ar × chiaro/scuro a 360 px: nessun errore, nessuna chiave non tradotta · Hari Knots risolto fino alla vittoria (livelli 1, 3, 8) a 360/390 px
- 2026-10-26 v0.8.1 · `npm test` · Sushi Bar: bot vince livelli 1–15 senza perdere clienti; a 360/390 px spazio tra piattini 24–40 px; livello 1 mostra riso, alga, salmone, tonno, gambero
- 2026-10-26 v0.8.0 · `npm test` 160/160 · 9 giochi × it/ja/ar/de × chiaro/scuro × 360/390 px: nessun errore, nessuno scorrimento, nessuna chiave non tradotta, tutorial presente in tutti · aggiornamento da v0.6.1 simulato: arriva da solo
- 2026-10-26 v0.7.0 · `npm test` 94/94 · 6 giochi × it/ja/ar × chiaro/scuro × 360/390 px: nessun errore, nessuno scorrimento, nessuna chiave non tradotta · Fix-It: livelli 2–5 e 7 risolti fino in fondo (cucina, cameretta, bagno, giardino) · Hari Parade: parte al primo tocco
- 2026-10-26 v0.6.2 · `npm test` 77/77 · server locale con 2 aggiornamenti simulati: in partita barra → Aggiorna → stessa partita (mosse e griglia), nella home aggiornamento automatico, cache vecchie rimosse, offline ok · Android simulato: prompt nativo (it chiaro, ar scuro), istruzioni senza prompt, "Più tardi" non ripropone, desktop nessuna proposta
- 2026-10-26 v0.6.1 · `npm test` 73/73 · Sushi Bar e Fix-It House a 360/390 px chiaro/scuro: nessuno scorrimento laterale, livello di Fix-It risolto fino all'arcobaleno, ordine servibile evidenziato
- 2026-10-26 v0.6 · `npm test` 73/73 · Fix-It House in app a 360/390 px chiaro/scuro: nessuno scorrimento laterale, ordine sbagliato → cuore perso + frecce verso i prerequisiti; etichette tradotte (it, ja, ar) · Sushi Bar: cliente servito, tagliere/nastro ok
- 2026-10-26 v0.4 · `npm test` 31/31 · stato dello screenshot dell'utente riconosciuto come 'bloccato' (test) · browser: vicolo cieco → "Sei bloccato", ultima mossa non risolutiva → "Hai finito le mosse"
- 2026-10-26 Pages · sito online 200, manifest e icone serviti, service worker attivo con cache `hh-v0.3.0`, nessun errore JS
- 2026-10-26 v0.3 · `npm test` 26/26 · livello dello screenshot dell'utente: unica soluzione [0,3,1,4,2], generatore corretto, problema era la verifica · browser: errore → cuore perso e ✕, 3 errori → finestra e riprova, audio attivo, cambio brano menu/gioco, travaso con liquido orizzontale
- 2026-10-26 v0.2 · `npm test` 17/17 · browser 390×844: ✕ si toglie al secondo tocco, trascinamento riga = 5 ✕, ricarica → partita ripresa (5 mosse, tempo conservato), travaso animato, vittoria 3★ 401 punti, progressi; desktop scuro (ja) OK
- 2026-10-26 v0.1 · screenshot chiaro/scuro/RTL OK
