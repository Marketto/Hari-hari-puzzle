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
Stelle da `rate(snapshot)`: Hedgedoku 3★ senza errori, 2★ con uno, 1★ con due; Boba 3★ col minimo esatto, 2★ entro metà del margine; Lantern ≤ tocchi di generazione = 3★, ≤ 2× = 2★.

## Ordine di caricamento
```
locales.js → rng.js → core.js (store, progress, i18n) → mascot.js → fx.js → <gioco>-logic.js → <gioco>-ui.js … → app.js (boot)
```

## Flusso
1. `app.js` → `boot()`: lingua da storage o da `navigator.languages`, `dir` per RTL, sfondo canvas, suono, service worker.
2. Home: card da `HH.games` + card "in arrivo" (`SOON`).
3. Tocco card → `openGame(id)`: crea `ctx`, chiama `game.create(boardEl, ctx)`, `history.pushState` per il tasto indietro di Android.
4. `ctx.win()` → livello +1 salvato, suono, coriandoli, salto di Hari, finestra "Avanti".

## Contratto del gioco
Vedi `.claude/skills/add-game/SKILL.md`. Logica pura in `*-logic.js` (testata da `tools/selftest.mjs`), UI in `*-ui.js`.

## Offline
- Shell e icone: precache in `sw.js` (`SHELL`). **Aggiorna `VERSION`** a ogni release.
- Font Google: cache runtime `hh-fonts`. Roadmap v0.3: font in `assets/fonts/` (woff2 sottoinsieme) per offline già al primo avvio.
- Nessuna API di rete nel codice di gioco.
