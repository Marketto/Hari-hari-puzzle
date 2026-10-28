# TODO

## In corso
- [x] Repo pubblico collegato: https://github.com/Marketto/Hari-hari-puzzle (autori commit anonimizzati con noreply GitHub)
- [x] GitHub Pages attivo: https://marketto.github.io/Hari-hari-puzzle/ (deploy automatico a ogni push su `main`)
- [ ] Prova di installazione su un telefono Android reale (trascinamento ✕ e animazione travaso al tatto)
- [ ] Hari Home su telefono: fluidità del canvas (~30 fps), dimensione dei tocchi nel menu radiale e nel catalogo

## Prossimo
- [ ] Altri giochi dalla lista proposte (Hari Push / Sokoban, Mochi Slide, Candy Code…)
- [ ] Font locali in `assets/fonts/` (woff2 sottoinsieme) per offline già al primo avvio
- [ ] Hedgedoku: pulsante suggerimento (usa `logicSolve` per indicare la prossima deduzione) e ✕ automatiche opzionali
- [ ] Boba Sort: "+1 bicchiere" una volta per livello
- [ ] Impostazioni: tema chiaro/scuro/sistema, vibrazione, azzera progressi
- [ ] Revisione madrelingua: mt, ga, cy, lb, eu, is (in particolare i nomi di attrezzi/guasti di Fix-It House)

## In revisione (prossima versione)
- [x] Nuovo gioco **Hari Taxi** (guida vista dall'alto, senza violenza): città a griglia generata da seme con isolati, parchi, semafori, strisce e marciapiedi; tre mestieri a rotazione (taxi coi passeggeri, scooter del cibo che si raffredda, furgone coi pacchi a più tappe) con tempo limite; traffico (auto, autobus, bici) e pedoni con IA; incidenti = −1 cuore con "bonk" e salto spaventato, muri morbidi; levetta a un pollice + frecce/WASD, freccia di percorso e minimappa, tema notte con lampioni e fari; brano `drive`, effetti `honk`/`boing`, tutorial, test con bot
- [ ] Traduzioni delle chiavi nuove di Hari Taxi (`r13`, `dr_*`, `tu_drive_1..3`) in 43 lingue (oggi fallback inglese)
- [ ] Hari Taxi su telefono: fluidità del canvas nei livelli grandi e comodità della levetta

## Fatto (v0.13.4)
- [x] Statistiche anonime attive su https://harihari.goatcounter.com (sempre con consenso opt-in)

## Fatto (v0.13.3)
- [x] Tempo di gioco e partite per ogni gioco salvati sul telefono e mostrati in Progressi (totale + per gioco)
- [x] Statistiche anonime facoltative con GoatCounter (`src/core/usage.js`): consenso opt-in chiesto una volta, revocabile in Progressi; solo eventi `open/<gioco>` e `minute/<gioco>`, senza cookie; coda offline. Spente finché `CODE` è vuoto (vedi `docs/privacy.md`)

## Fatto (v0.13.2)
- [x] Hari Home: al rientro Hari entra e cammina fino al centro della stanza; se non ha bisogni gironzola per casa
- [x] Hari Home: scene del quartiere più vivide (tolto il velo viola del tema scuro, notte in "moltiplica" più leggera, saturazione +15%)
- [x] Hari Home: lavorare senza postazione dice chiaramente cosa manca (forno/scrivania/bancone, evidenziato nel pannello Attività) e i "Lavoretti" (+40 ghiande / 3 h) permettono di mettere da parte i soldi

## Fatto (v0.13.1)
- [x] Schermo intero: barra in alto alta quanto il pulsante con logo di Hari, nome del gioco e livello; toccando il logo si apre il menu con le azioni della vista normale (tutti i giochi, annulla, ricomincia, nuovo puzzle, come si gioca, audio, esci); indicatori (tempo, mosse, fragoline, cuori) in una barra compatta

## Fatto (v0.13.0)
- [x] Hari Home: Hari fa da solo (libero arbitrio attivabile): va a letto la sera, mangia, si lava, si diverte, chiama gli amici; avvisa se il frigo è vuoto o manca dove lavarsi
- [x] Hari Home: comandi chiari: gli indicatori in alto sono azioni rapide (luna = dormi, pancia = mangia, goccia = lavati…), coda delle azioni come in The Sims, indicatore rosso lampeggiante e fumetto quando un bisogno è critico, menu su Hari sempre completo, suggerimento al primo avvio
- [x] Hari Home: scene animate nel quartiere (spesa col carrello, parco, palestra, caffè con nuovi amici, dottore, negozio di mobili, la propria attività: forno, bottega d'arte, piante); salvataggi v1 → v2

## Fatto (v0.12.4)
- [x] Boba Sort: il vicolo cieco non chiude più la partita: banner "Vicolo cieco" con Annulla/Ricomincia e si può continuare a versare; la finestra di fine partita solo a mosse finite (tolto lo "0" fuorviante); verificato che il risolutore non segnala falsi vicoli ciechi (oracolo BFS su partite casuali)
- [x] Schermo intero solo sul riquadro di gioco, con il pulsante per tornare alla vista classica dentro il riquadro; si esce da soli a vittoria, sconfitta, tutorial o ritorno alla home

## Fatto (v0.12.3)
- [x] Home: Condividi (solo icona su telefono) e versione sempre a fianco del titolo
- [x] Home: 3 modalità di visualizzazione dei giochi (lista, icone 2 per riga, carosello in prospettiva stile Cover Flow del Mac), scelta salvata

## Fatto (v0.12.2)
- [x] Pulsante "Condividi" in home sopra la versione (menu di condivisione del telefono, altrimenti copia il link con un messaggio di Hari)
- [x] Un solo pulsante audio a 3 stati: musica e suoni → solo suoni → muto (preferenza salvata)

## Fatto (v0.12.1)
- [x] Giochi più larghi: bordi laterali minimi su telefono (area di gioco a ~11 px dal bordo invece di ~38; tolto anche il margine predefinito di 8 px del body), larghezza unica `--game-w`
- [x] Pulsante schermo intero nell'header di ogni gioco (dove il browser lo supporta; chiavi `full`/`fullExit` in 43 lingue)

## Fatto (v0.12.0)
- [x] Nuovo gioco **Hari Home** (`life`, simulazione di vita isometrica stile Sims, senza livelli né fine): monolocale decadente con 8 guasti, costruisci (37 oggetti, 5 pavimenti, 5 carte da parati, 3 traslochi), 8 bisogni con umore/stress legati alla bellezza della casa, quartiere (spesa, dottore, parco, palestra, caffè, mobili, negozio), attività in 3 tipi e 4 livelli con aiutanti, malanni e check-up, 4 età fino a nonno, pensione e nuova generazione, 11 traguardi; brano `life`, tutorial, supporto `endless` in `app.js` (chip età/giorno/ghiande in header, card e Progressi)
- [x] Traduzioni delle 125 chiavi nuove (`r12`, `tu_life_1..4`, `lf_*`) in 43 lingue (EN/IT pronte)

## Fatto (v0.11.0)
- [x] Giochi in lazy load: all'avvio solo catalogo + illustrazioni e colori delle card (~160 KB invece di ~1 MB di giochi); ogni gioco si scarica la prima volta che lo si apre e poi resta offline; gli aggiornamenti riscaricano solo i giochi già scaricati; nuvoletta sulle card non ancora scaricate, messaggio di Hari se offline (`dlNeed`, 43 lingue); `npm run cards`

## Fatto (v0.10.1)
- [x] Hari Snack Rush più sfidante: animali più veloci e numerosi, ondate più fitte, porte cattive dal livello 2 (−2 dal 4, ÷2 dal 6) e più frequenti, animalone più goloso che chiama amici dal livello 4 e soffia di più; le porte contano (chi sceglie a caso perde spesso dal livello 5)

## Fatto (v0.10.0)
- [x] Nuovo gioco **Hari Snack Rush** (azione stile mob control, senza violenza): sentiero in pseudo-prospettiva su canvas, Hari lancia semi e frutta a ventaglio, animali affamati che tornano a casa felici, porte ×/+/−/÷, animalone goloso a rotazione (scoiattolo, orso polare, gufo, gattino) che soffia gusci/bolle/foglie/petali; brano `snack`, tutorial, test con bot
- [x] Traduzioni delle 11 chiavi nuove (`r11`, `sr_*`, `tu_snack_*`) in 43 lingue

## Fatto (v0.9.3)
- [x] Sushi Bar: 12 ingredienti (nuovi polpo, granchio, branzino, sesamo) e 14 ricette (tako, kani, suzuki, avocado maki, uramaki al sesamo, dragon roll); dal livello 1 salmone, tonno e gambero, entro il 4 tutti i pesci; le partite salvate prendono le ricette nuove

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
- 2026-10-28 v0.13.4 · `npm test` · evento di prova inviato a harihari.goatcounter.com
- 2026-10-28 v0.13.3 · `npm test` · tempo di gioco in Progressi; con codice simulato: consenso, eventi open/minute inviati, revoca
- 2026-10-28 v0.13.2 · `npm test` · Hari Home: rientro dal parco (cammina nella stanza), scena del parco in tema scuro, lavoretti senza forno
- 2026-10-28 v0.13.1 · `npm test` · schermo intero in Boba (scuro), Sushi e Hari Home: barra, menu, audio, ricomincia, esci, tutti i giochi; la barra indicatori torna al suo posto all'uscita
- 2026-10-28 v0.13.0 · `npm test` · Hari Home: autonomia (4 giorni da solo su 3 semi), azioni rapide, coda, scene del quartiere in chiaro/scuro; testi in it/de/ar
- 2026-10-28 v0.12.4 · `npm test` · Boba: vicolo cieco con versate possibili → banner, Annulla e Ricomincia; schermo intero del riquadro in 3 giochi (chiaro/scuro)
- 2026-10-27 v0.12.3 · `npm test` · lista/icone/carosello a 360 px (chiaro e scuro) e a 1100 px, carosello: scorrimento, card centrale, apertura del gioco
- 2026-10-27 v0.12.2 · `npm test` · ciclo audio a 3 stati e preferenze salvate, condivisione (copia link) nel browser, home chiara/scura a 360 px
- 2026-10-27 v0.12.1 · `npm test` · margini misurati a 360 px in tutti i 12 giochi, nessuno scroll orizzontale, schermo intero attivato/disattivato
- 2026-10-27 v0.12.0 · `npm test` · Hari Home: tutte le schermate in tema chiaro/scuro, testi in it/de/ar/ja senza chiavi mancanti né sbordamenti a 360 px, file unico
- 2026-10-27 v0.11.0 · `npm test` · lazy load nel browser: avvio senza file dei giochi, download all'apertura, gioco offline, gioco non scaricato offline, ripresa partita, tema scuro, file unico
- 2026-10-27 v0.10.1 · `npm test` · Snack Rush: bot attento/lento/impreciso e bot con porte a caso, livelli 1–15
- 2026-10-27 v0.10.0 · `npm test` · Hari Snack Rush: ondate, porte, animalone, vittoria, sconfitta; temi chiaro/scuro; testi in it/ja/ar
- 2026-10-27 v0.9.3 · `npm test` · Sushi Bar: galleria di ingredienti e piatti, bot cuoco su livelli 1–15
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
