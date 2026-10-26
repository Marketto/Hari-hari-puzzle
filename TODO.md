# TODO

## In corso
- [ ] Collegare il repo pubblico GitHub e attivare Pages (Settings → Pages → GitHub Actions)
- [ ] Prova di installazione su un telefono Android reale

## Prossimo
- [ ] Font locali in `assets/fonts/` (woff2 sottoinsieme) per offline già al primo avvio
- [ ] Hedgedoku: pulsante suggerimento + trascinamento per mettere tante ✕
- [ ] Boba Sort: "+1 bicchiere" e animazione del versamento lungo un arco
- [ ] Lantern Glow: mosse minime con Gauss su GF(2), stelle 1–3
- [ ] Schermata impostazioni: tema chiaro/scuro/sistema, vibrazione, azzera progressi
- [ ] Revisione madrelingua: mt, ga, cy, lb, eu, is
- [ ] Pixel Mochi (Nonogram) — vedi docs/games/proposals.md

## Fatto (v0.1.0)
- [x] Shell PWA (manifest, service worker, icone 192/512/maskable)
- [x] Mascotte Hari in SVG animato (respiro, battito ciglia, salto, sguardo che segue il dito)
- [x] Sfondo animato: bolle, petali di sakura, stelline; tema chiaro e notturno
- [x] Hedgedoku con soluzione unica garantita (5×5 → 8×8)
- [x] Boba Sort con risolvibilità verificata (3 → 9 gusti), simboli per daltonici
- [x] Lantern Glow (4×4 → 5×5)
- [x] 43 lingue + RTL arabo, rilevamento automatico
- [x] Livelli salvati, annulla/ricomincia/nuovo, suoni WebAudio, coriandoli
- [x] Struttura agentica: router, 5 agenti, 6 skill, tool, CI, deploy Pages

## Verifiche
- 2026-10-26 · `npm test` OK · screenshot 390×844 chiaro (it) e 1200×860 scuro (ja), gioco in arabo RTL OK
