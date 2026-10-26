# Hari Hari Puzzle — guida per agenti

PWA kawaii di puzzle logici, **100% offline**, installabile su Android, mascotte **Hari** (riccio).
Vanilla JS senza build obbligatoria: ogni file in `src/` è uno script classico che registra moduli su `window.HH`.

## Regole d'oro
1. **Offline first**: nessuna chiamata di rete a runtime. Nuovi file vanno aggiunti a `SHELL` in `sw.js` e allo script-list di `index.html`.
2. **Logica separata dalla UI**: `src/games/<id>-logic.js` è puro (niente DOM) e testabile da Node; `<id>-ui.js` disegna.
3. **Ogni livello deve essere risolvibile** (e a soluzione unica dove il genere lo prevede), con unit test in `tests/<gioco>.test.mjs` che usano un oracolo indipendente dal generatore.
4. **i18n completo**: ogni stringa visibile passa da `HH.i18n.t(key)`. Una chiave nuova va in tutte le 43 righe di `src/i18n/locales.js`.
5. **Token di design**: colori solo tramite variabili in `src/styles.css` (tema chiaro + scuro). Mai colori letterali nei componenti.
6. **Ogni gioco salva la partita**: `snapshot()` serializzabile + `create(el, ctx, saved)`; chiama `ctx.changed()` dopo ogni mossa; espone `progress(s)` (0..1) che guida musica e messaggi.
7. Prima di chiudere un task: `npm test` (unit test + i18n-check) e `npm run build`.

## Router — da richiesta a skill/agente

| Se la richiesta parla di… | Skill da caricare | Agente | Tool |
|---|---|---|---|
| nuovo gioco, variante, regole | `add-game` + `puzzle-generator` | `game-designer` | `npm test` |
| difficoltà, livelli, generatori, solver | `puzzle-generator` | `game-designer` | `npm test`, `npm run bench` |
| testi, traduzioni, nuova lingua, RTL | `i18n` | `i18n-translator` | `tools/i18n-check.mjs` |
| grafica, animazioni, mascotte, tema | `kawaii-ui` | — | `tools/gen-icons.mjs`, `tools/rasterize-icons.py` |
| musica, suoni, frasi di Hari | `audio-music` (+ `i18n` per le frasi) | — | `node --test tests/music.test.mjs` |
| APK, Play Store, PWA, icone, offline | `android-release` | `release-android` | `tools/build-inline.mjs` |
| bug, regressioni, verifica prima del merge | `qa-check` | `qa-tester` | tutti |
| richiesta ambigua o multi-area | — | `router` | — |

Il file di dettaglio di ogni skill è in `.claude/skills/<nome>/SKILL.md`; gli agenti in `.claude/agents/`.

## Mappa del codice
```
index.html                 shell + ordine degli script
sw.js                      service worker (cache offline)
manifest.webmanifest       PWA (installazione Android)
src/app.js                 schermate: home, gioco, vittoria, lingue
src/core/core.js           HH.store (localStorage) · HH.i18n
src/core/fx.js             sfondo animato · coriandoli · suoni WebAudio
src/core/mascot.js         SVG di Hari (grande e mini)
src/games/*-logic.js       logica pura dei giochi
src/games/*-ui.js          interfaccia dei giochi, si registra in HH.games
src/i18n/locales.js        43 lingue
tools/                     script di sviluppo (vedi docs/tools.md)
docs/                      documentazione strutturata
```

## Comandi
- `npm run dev` — server locale su http://localhost:5173
- `npm test` — selftest logica + controllo traduzioni
- `npm run build` — `dist/hari-hari-puzzle.html` (file unico) e `dist/artifact.html`
- `npm run icons` — rigenera le icone dalla mascotte

Stato e priorità: `TODO.md` (lavoro corrente) · `ROADMAP.md` (versioni).
