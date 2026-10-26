# TODO

## In corso
- [x] Repo pubblico collegato: https://github.com/Marketto/Hari-hari-puzzle (autori commit anonimizzati con noreply GitHub)
- [x] GitHub Pages attivo: https://marketto.github.io/Hari-hari-puzzle/ (deploy automatico a ogni push su `main`)
- [ ] Prova di installazione su un telefono Android reale (trascinamento ✕ e animazione travaso al tatto)

## Prossimo
- [ ] Font locali in `assets/fonts/` (woff2 sottoinsieme) per offline già al primo avvio
- [ ] Hedgedoku: pulsante suggerimento (usa `logicSolve` per indicare la prossima deduzione) e ✕ automatiche opzionali
- [ ] Boba Sort: "+1 bicchiere" una volta per livello
- [ ] Lantern Glow: mosse minime con Gauss su GF(2) come par esatto
- [ ] Impostazioni: tema chiaro/scuro/sistema, vibrazione, azzera progressi
- [ ] Revisione madrelingua: mt, ga, cy, lb, eu, is
- [ ] Pixel Mochi (Nonogram) — vedi docs/games/proposals.md

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
- 2026-10-26 v0.4 · `npm test` 31/31 · stato dello screenshot dell'utente riconosciuto come 'bloccato' (test) · browser: vicolo cieco → "Sei bloccato", ultima mossa non risolutiva → "Hai finito le mosse"
- 2026-10-26 Pages · sito online 200, manifest e icone serviti, service worker attivo con cache `hh-v0.3.0`, nessun errore JS
- 2026-10-26 v0.3 · `npm test` 26/26 · livello dello screenshot dell'utente: unica soluzione [0,3,1,4,2], generatore corretto, problema era la verifica · browser: errore → cuore perso e ✕, 3 errori → finestra e riprova, audio attivo, cambio brano menu/gioco, travaso con liquido orizzontale
- 2026-10-26 v0.2 · `npm test` 17/17 · browser 390×844: ✕ si toglie al secondo tocco, trascinamento riga = 5 ✕, ricarica → partita ripresa (5 mosse, tempo conservato), travaso animato, vittoria 3★ 401 punti, progressi; desktop scuro (ja) OK
- 2026-10-26 v0.1 · screenshot chiaro/scuro/RTL OK
