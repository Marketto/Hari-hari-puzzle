---
name: qa-check
description: Checklist di verifica prima di commit/merge/release di Hari Hari Puzzle (unica fonte; l'agente qa-tester la segue).
---

# QA

## Automatico (esito OK / KO + dettaglio per punto)
1. `CI=1 npm test` (unit test + i18n-check) e `node --check sw.js`.
2. `npm run build` riesce (il file unico contiene tutti i giochi: nessun limite di dimensione).
3. Solo i file del **nucleo** in `index.html` e `SHELL` di `sw.js`; i file dei giochi solo in `src/games/catalog.js` (lazy load, lo verifica `tests/pwa.test.mjs`). Dopo aver toccato `art` o i colori di un gioco: `npm run cards`.
4. Nessuna chiamata di rete esterna a runtime (`src/`, `index.html`, `sw.js`) tranne GoatCounter in `src/core/usage.js` (solo con consenso). I font sono locali (`assets/fonts/`): niente Google Fonts.
5. Nessun colore letterale nuovo fuori dai blocchi di token.
6. Prima del push: alzate tutte e tre le versioni (`VERSION` in `sw.js`, `version` in `package.json`, `HH.VERSION` in `src/core/core.js`); nessuna email o dato personale nei file.

## Manuale (telefono reale o DevTools 390×844)
1. Home in chiaro e scuro, in `it`, `ja`, `ar` (RTL): niente testo tagliato, nessuno scroll orizzontale.
2. Ogni gioco: tocco, annulla, ricomincia, nuovo puzzle, vittoria → livello +1 salvato dopo ricarica.
3. Tasto indietro di Android dal gioco torna alla home.
4. Modalità aereo dopo il primo avvio: l'app si apre e i giochi già aperti funzionano.
5. `prefers-reduced-motion`: sfondo fermo, transizioni ridotte a una dissolvenza.
6. Suono on/off persiste.

Riporta l'esito in `TODO.md` sotto "Verifiche".
