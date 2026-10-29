# TODO

## In corso
- [x] Repo pubblico collegato: https://github.com/Marketto/Hari-hari-puzzle (autori commit anonimizzati con noreply GitHub)
- [x] GitHub Pages attivo: https://marketto.github.io/Hari-hari-puzzle/ (deploy automatico a ogni push su `main`)
- [ ] Prova di installazione su un telefono Android reale (trascinamento ✕ e animazione travaso al tatto)
- [ ] Hari Home su telefono: fluidità del canvas (~30 fps), dimensione dei tocchi nel menu radiale e nel catalogo

## Prossimo
- [ ] Hari Taxi, mappe reali su telefono vero: fluidità del canvas nelle zone dense, leggibilità dei cartelli
- [ ] Rally a due su telefoni veri: tempo di costruzione della pista al via (il link aspetta fino a 60 s), comodità dei
  comandi sullo schermo diviso a 800 × 380, fluidità di due viste su un tablet medio
- [ ] Hari Snack Street su telefono vero: levetta e pulsanti col pollice, schermo diviso in due su tablet, fluidità del canvas
- [ ] Multigiocatore su telefoni veri: abbinamento col suono in una stanza vera (volume, distanza, rumore), QR con fotocamera, reti ospiti/hotspot, iOS
- [ ] Da provare su telefono vero: schermo intero tra più giochi, tasto indietro di Android a schermo intero
- [ ] Hari Rally 3 su telefono vero: comodità dei pedali col tocco multiplo, sensibilità del trascinamento, fluidità con 4 kart vicini
- [ ] Hari Sudoku su telefono vero: comodità del tastierino in una riga a 360 px e del layout a schermo intero col telefono girato
- [ ] Hari Escape su telefono vero: comodità dei tocchi su oggetti piccoli (quadri e indizi appesi) e leggibilità degli indizi in miniatura
- [ ] Hari Airlines su telefono: comodità del trascinamento dei bagagli e altezza della cabina a 6 file nella fase bagagli
- [ ] Hari Taxi su telefono: fluidità del canvas nei livelli grandi e comodità della levetta
- [ ] Hari Rally su telefono vero: fluidità (pixel ratio adattivo), taratura dei sensori in orizzontale
- [ ] Altri giochi dalla lista proposte (Hari Push / Sokoban, Mochi Slide, Candy Code…)
- [ ] Font locali in `assets/fonts/` (woff2 sottoinsieme) per offline già al primo avvio
- [ ] Hedgedoku: pulsante suggerimento (usa `logicSolve` per indicare la prossima deduzione) e ✕ automatiche opzionali
- [ ] Boba Sort: "+1 bicchiere" una volta per livello
- [ ] Impostazioni: tema chiaro/scuro/sistema, vibrazione, azzera progressi
- [ ] Revisione madrelingua: mt, ga, cy, lb, eu, is (in particolare i nomi di attrezzi/guasti di Fix-It House)

## Fatto (v0.23.0)
- [x] Hari Taxi, mappe reali da OpenStreetMap: **Ostia** (Lido, dal Porticciolo all'Idroscalo, 5,6 × 4,4 km) e **Desenzano del Garda** (centro, porto vecchio, castello, lungolago, Rivoltella, stazione, 6,2 × 3,3 km) in stile kawaii; selettore all'avvio e dal pulsante mappa, livelli/progressi/salvataggi per mappa (la città di Hari resta su `drive`), attribuzione ODbL in gioco, nel selettore, nella minimappa e in `docs/osm-attribution.md`; testi in 43 lingue

## Fatto (v0.22.1)
- [x] Hari Snack Street a schermo intero in orizzontale come Hari Rally (blocco dell'orientamento, velo "Gira il telefono" se resta in verticale)

## Fatto (v0.22.0)
- [x] **Hari Rally a due giocatori**: "Gioca insieme" (pulsante in alto prima del via e nel menu
  di pausa) con due modi. **Due telefoni** su `HH.mp`: l'host (Hari, fragola) simula tutta la gara con 2 umani e manda
  istantanee compatte (~400 B, < 1 KB; si manda solo il seme, mai la pista), l'ospite sceglie il kart (Micia sul nuovo
  kart-mela, o Coniglietta, Volpe, Panda), interpola gli altri e predice il proprio con correzione morbida; via, pausa,
  fine gara e classifica affidabili; link caduto → il kart dell'ospite passa all'IA, l'ospite torna alla sua gara.
  **Schermo diviso** (tablet o telefono in orizzontale, solo dispositivi capaci): due viste nello stesso canvas, comandi
  nella propria metà, P1 frecce + Invio, P2 WASD + spazio; pixel ratio ≤ 1, LOD e nebbia più vicini. 2 umani + 2
  avversari; si vince insieme se uno dei due arriva primo, fragoline per ciascuno; la partita a due non si salva (si
  riprende la gara in singolo). Logica generalizzata a N umani (`s.hu`), singolo identico bit per bit; test
  `tests/rally-mp.test.mjs` (stub con orologio virtuale + modulo vero), prova reale `tools/rally-e2e.mjs`
- [x] Testi del rally a due in 43 lingue (21 chiavi)

## Fatto (v0.21.0)
- [x] Nuovo gioco **Hari Snack Street** (`since: '0.21.0'`, regole `r20`): picchiaduro a scorrimento senza violenza con Hari e Kiki; 6 animali con comportamenti diversi, 5 ambientazioni con golosoni a schema (angurie su tutta la strada, pestone, carica, picchiata, risucchio), cassette, carrelli, presa col cesto, speciali; da soli, con Kiki CPU, in due sullo stesso dispositivo (tastiera o schermo diviso); brano `street`, tutorial in 4 schede, test con bot
- [x] **Modulo multigiocatore** `src/net/*` (`HH.mp`, vedi `docs/multiplayer.md`): due telefoni sulla stessa Wi-Fi/hotspot senza internet; abbinamento col suono (melodia di Hari, MFSK pentatonico, Reed-Solomon), QR di riserva (audio spento, microfono negato, volume basso, tentativi esauriti) e codice testuale; conferma con 4 frutti (SAS dalle impronte DTLS); sessione host-autoritativa con delta e interpolazione; usato da Hari Snack Street ("Gioca insieme")
- [x] Testi di Hari Snack Street (44 chiavi) e del multigiocatore (57 chiavi) in 43 lingue

## Fatto (v0.20.1)
- [x] **Schermo intero persistente**: lo schermo intero è del documento (`<html>`, classe `fs-on`) e non del riquadro: resta
  attivo tra vittoria, sconfitta, livello successivo, ricomincia, tutorial, home e cambio di gioco finché il giocatore non
  esce (pulsante, menu del logo, nuovo pulsante nella barra della home, Esc/indietro); finestre e dialoghi visibili sopra
  al gioco; preferenza in `sessionStorage` (rientro al primo tocco se il browser l'aveva tolto con l'app in background);
  il rally sblocca l'orizzontale quando si esce dal gioco
- [x] **Schermo intero che usa tutto lo spazio**: contratto `fill` (Hari Snack Rush con vista 2:3 virtuale, Hari Home con
  comandi in colonna col telefono girato), disposizione automatica "a lato" per i giochi a pila col telefono girato,
  pila "spread" senza fascia vuota tra HUD e gioco, niente più scorrimento in orizzontale (minimo 180 px), layout
  dedicati per Sushi Bar (orizzontale) e Memory (tavolo sdraiato); vedi `docs/architecture.md` → "Schermo intero"
- [x] **Hari Escape senza sfarfallio**: lo zoom degli enigmi non si ricrea più a ogni tocco (prima ~40–150 nodi sostituiti
  e animazione d'apertura ripartita a ogni mossa, ora 0–6 nodi e nessuna ripartenza); stanza, borsa e barra aggiornate in
  place con `src/games/dom-patch.js`; test `tests/dom-patch.test.mjs`
- [x] **Hari Airlines**: aereo di lato con ali e piano di coda a freccia all'indietro (card della home, atterraggio)

## Fatto (v0.20.0)
- [x] **Hari Rally 3**: visuale in terza persona predefinita (camera a molla, inclinazione in curva, campo visivo col turbo, scossoni) con Hari al volante, pulsante e tasto C per la visuale pilota (scelta salvata); kart a forma di frutto (fragola di Hari, pesca, mandarino, fetta d'anguria) con foglia che sventola, sospensioni, faretti e ombra, LOD da lontano; collisioni risolte nel piano del mondo con sotto-passi (prima in (s, d), che in curva deformava i rettangoli: fino a 24 cm di compenetrazione disegnata); fuori strada vero (erba, marciapiede, sabbia, neve alta), alberi, rocce e cumuli che fermano, guardrail a imbuto prima di ponti e gallerie, nuvoletta che riporta in pista; aderenza limitata con derapata, mini-spinta e sbandata; acceleratore e freno/retromarcia manuali (pedali, frecce, trascinamento, sensori, tastiera ↑↓←→ + spazio/E), acceleratore automatico come opzione (acceso solo al livello 1); avversari più forti dal livello 3 con rubber band moderato; salvataggi v2 → v3
- [x] Testi di Hari Rally 3 in 43 lingue (6 chiavi nuove, 6 riscritte)

## Fatto (v0.19.1)
- [x] **Hari Rally 2**: collisioni vere tra auto (rettangoli orientati, niente compenetrazioni né salti indietro) e con bordi/ostacoli allineati alla grafica; power-up kawaii in scatole-regalo (turbo carota, scudo-bolla, buccia di banana, pozza di miele, nuvoletta di fiori, calamita, salto a molla) e ghiande bonus; avversari con traiettoria ideale, frenata, sorpasso e scia; 12 livelli a rotazione tra bosco, città, mare e neve di giorno, al tramonto e di notte, con gallerie, ponti, chicane, curve paraboliche e molti più dettagli; salvataggi v1 → v2
- [x] Testi nuovi e aggiornati di Hari Rally in 43 lingue (13 chiavi)

## Fatto (v0.19.0)
- [x] Nuovo gioco **Hari Sudoku** (`since: '0.19.0'`): sudoku classico 9×9 coi numeri; 30 livelli curati da facile (soli single nascosti) a esperto (X-wing, swordfish, XY-wing), poi senza fine; soluzione unica verificata da oracolo indipendente; matita con note automatiche, gomma, annulla, evidenziazioni, contatori sui tasti, aiuto che spiega la tecnica, 3 cuori; Hari (riccio animato condiviso con Hedgedoku, `hog-kit.js`) reagisce a ogni mossa; brano `sudoku`; tutorial in 3 schede
- [x] Nuovo gioco **Hari Escape** (escape room kawaii, `since: '0.19.0'`): 1–3 stanze e 3–10 enigmi per livello generati da seme con un grafo di dipendenze (porta = radice, ogni enigma contiene il pezzo per il successivo), 18 tipi visivi e senza parole sbloccati coi livelli, nascondigli (tappeto, vaso, quadro, poltrona), oggetti da combinare (canna da pesca, torcia), stanze buie, temi casetta/castello/nave/laboratorio, aiuti a due livelli con la lampadina, uscita festosa di Hari; brano `escape`, effetto `unlock`, tutorial, test con bot esploratore indipendente
- [x] Testi di Hari Sudoku (45 chiavi) e Hari Escape (11 chiavi) in 43 lingue

## Fatto (v0.18.0)
- [x] Nuovo gioco **Hari Airlines** (Hari assistente di volo, capitano gufo, passeggeri animaletti): ogni livello è un volo a fasi — imbarco da contare (gruppi, nascosti, chi torna indietro, lista del capitano), bagagli nelle cappelliere a capienza (risolutore nei test), cinture con testardi, ribelli e sobbalzo buffo, cucina (ricetta del capitano + fornetti con zona verde), servizio col carrello e pazienza, rifiuti differenziati (1 → 3 sacchi); fasi sbloccate gradualmente con "Nuovo!", tratte mare/montagne/città/notte, tema scuro = volo notturno; niente sconfitta (errori leggeri e passeggeri tristi = meno fragoline); brano `flight`, effetto `chime`, tutorial, test con bot
- [x] Testi di Hari Airlines in 43 lingue (42 chiavi)


## Fatto (v0.17.0)
- [x] Nuovo gioco **Hari Rally**: rally 3D in prima persona nel bosco (three.js in locale, solo nei file del gioco), grafica cartoon con contorni, accelerazione automatica, sterzo coi sensori a schermo intero col telefono girato (taratura, permesso iOS) o col tocco/tastiera, freno, note del navigatore 1–6 dedotte dalla curvatura con bip nell'orecchio giusto, 3 avversari (coniglietta, volpe, panda), tappe primavera/autunno/neve/tramonto, arrivare tra i primi 3; testi in 43 lingue

## Fatto (v0.16.2)
- [x] Hari Snack Rush rifatto: porte con un vero dilemma (la porta buona è presidiata da pozzanghere/carretti, porte che si scambiano, porte regalo), una novità ogni 2–3 livelli con cartello "Nuovo!" (fieno, criceti veloci, ranocchie, carretti, ondate di mangioni, formazioni, power-up raffica/doppia/calamita/cestino-scudo), stagioni a rotazione; boss che lanciano merende giganti da rimandare indietro (raffiche "a muro" non evitabili), fasi più agitate al 50%/80% di pancia, due boss nuovi (panda, ippopotamo); il giocatore "pigro" perde spesso dal livello 2; testi in 43 lingue

## Fatto (v0.16.1)
- [x] Dopo un aggiornamento Hari dice anche quali giochi nuovi sono arrivati (anche se l'app era chiusa: confronto con l'ultima versione vista, campo `since` nel catalogo) e le loro card mostrano "Nuovo!" finché non li si apre; nessun avviso alla prima installazione

## Fatto (v0.16.0)
- [x] Nuovo gioco **Hari Spot** (trova le differenze): scene di città e di bosco generate da seme (4 stagioni, giorno/tramonto/notte, Hari sempre presente), da 3 a 10 differenze di 8 tipi sempre visibili (area, contrasto, copertura) e mai sovrapposte, hitbox comode, lente per gli aiuti, zoom col pizzico, scene affiancate in orizzontale; niente cuori, errori senza costo nei primi livelli; testi in 43 lingue

## Fatto (v0.15.0)
- [x] Nuovo gioco **Hari Memory**: 49 disegni del bosco (animali, semi, frutta secca, bacche, alberi, foglie, funghi), griglie da 3×4 a 6×6, dai livelli medi soggetti simili, coppie a tema (animale ↔ il suo cibo) e carte che scivolano dopo un errore; fragoline in base alle mosse (nessuna sconfitta); brano `memory`, tutorial, test con bot; testi in 43 lingue

## Fatto (v0.14.1)
- [x] Schermo intero: ogni gioco si adatta allo spazio (larghezza e altezza): si cerca la larghezza più grande che entra anche in altezza; sui tablet i giochi crescono oltre i 460 px senza stirarsi (tetto ~1,15 × altezza); telefono girato: barra compatta con gli indicatori in riga e, se un gioco "alto" non entra, scorrimento verticale invece di tagliarlo

## Fatto (v0.14.0)
- [x] Nuovo gioco **Hari Taxi** (guida vista dall'alto, senza violenza): città a griglia generata da seme con isolati, parchi, semafori, strisce e marciapiedi; tre mestieri a rotazione (taxi coi passeggeri, scooter del cibo che si raffredda, furgone coi pacchi a più tappe) con tempo limite; traffico (auto, autobus, bici) e pedoni con IA; incidenti = −1 cuore con "bonk" e salto spaventato, muri morbidi; levetta a un pollice + frecce/WASD, freccia di percorso e minimappa, tema notte con lampioni e fari; brano `drive`, effetti `honk`/`boing`, tutorial, test con bot
- [x] Traduzioni delle 12 chiavi di Hari Taxi in 43 lingue

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
- 2026-10-28 v0.18.0 · `CI=1 npm test` · Hari Airlines: tutte le fasi, vittoria, schermo intero, chiaro/scuro; testi it/de/ja
- 2026-10-28 v0.17.0 · `CI=1 npm test` · Hari Rally: bot tra i primi 3 nei livelli 1–10, note coerenti con la curvatura, sensori simulati, file unico
- 2026-10-28 v0.16.2 · `CI=1 npm test` · Snack Rush: bot attento 88/88 fino all'11, pigro perde dal 2; porte, novità, boss con merende da rimandare, power-up, chiaro/scuro
- 2026-10-28 v0.16.1 · `npm test` · avviso giochi nuovi: utente da versione vecchia (messaggio + etichette), seconda apertura (niente avviso), installazione nuova (niente avviso)
- 2026-10-28 v0.16.0 · `npm test` · Hari Spot: città e bosco, differenza trovata, errore, lente, vittoria, schermo intero; testi it/de/ja
- 2026-10-28 v0.15.0 · `npm test` · Hari Memory: partita completa, coppia, errore, scambio, vittoria, schermo intero; testi it/de/ja
- 2026-10-28 v0.14.1 · `npm test` · schermo intero misurato in tutti i 13 giochi a 360×760, 800×380 e 1024×768: niente tagli né scorrimento orizzontale
- 2026-10-28 v0.14.0 · `npm test` · Hari Taxi: tre mestieri, incidenti, scadenze, vittoria/sconfitta, chiaro/scuro, schermo intero; testi it/es/pl/ja senza chiavi mancanti né sbordamenti
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
