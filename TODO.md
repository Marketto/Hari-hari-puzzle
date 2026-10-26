# TODO

## In corso
- [ ] Collegare il repo pubblico GitHub e attivare Pages (Settings → Pages → GitHub Actions)
- [ ] Prova di installazione su un telefono Android reale (trascinamento ✕ e animazione travaso al tatto)

## Prossimo
- [ ] Font locali in `assets/fonts/` (woff2 sottoinsieme) per offline già al primo avvio
- [ ] Hedgedoku: pulsante suggerimento (usa `logicSolve` per indicare la prossima deduzione) e ✕ automatiche opzionali
- [ ] Boba Sort: "+1 bicchiere" una volta per livello
- [ ] Lantern Glow: mosse minime con Gauss su GF(2) come par esatto
- [ ] Impostazioni: tema chiaro/scuro/sistema, vibrazione, azzera progressi
- [ ] Revisione madrelingua: mt, ga, cy, lb, eu, is
- [ ] Pixel Mochi (Nonogram) — vedi docs/games/proposals.md

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
- 2026-10-26 v0.2 · `npm test` 17/17 · browser 390×844: ✕ si toglie al secondo tocco, trascinamento riga = 5 ✕, ricarica → partita ripresa (5 mosse, tempo conservato), travaso animato, vittoria 3★ 401 punti, progressi; desktop scuro (ja) OK
- 2026-10-26 v0.1 · screenshot chiaro/scuro/RTL OK
