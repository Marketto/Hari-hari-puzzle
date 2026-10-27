---
name: add-game
description: Aggiungere un nuovo gioco a Hari Hari Puzzle (logica, UI, registrazione, test, docs, offline). Usala per ogni nuovo gioco o modalità.
---

# Aggiungere un gioco

## Contratto
Ogni gioco si registra così (in `src/games/<id>-ui.js`):
```js
HH.games.push({
  id: 'pixel',            // slug, usato in storage e CSS (--tint-<id>)
  name: 'Pixel Mochi',    // nome brand, non tradotto
  rules: 'r4',            // chiave i18n delle regole
  art: () => '<svg …>',   // illustrazione 120×90 per la card (solo token CSS)
  plate: 'night',         // opzionale: piatto scuro per il tabellone
  rate: (s) => 1..3,      // stelle in base allo stato finale
  parTime: (s) => secondi,// tempo di riferimento per il bonus
  create(el, ctx, saved) {// monta il gioco; saved = snapshot salvato (o null)
    // ctx.level · ctx.changed({reset}) dopo ogni mossa · ctx.win() · ctx.sfx.* · ctx.react('oops'|'happy')
    return { fresh(), restart(), undo(), snapshot() };  // snapshot: oggetto JSON con moves
  },
});
```

## Passi
1. `src/games/<id>-logic.js`: funzioni pure `generate(size|level, rnd)`, `check/isSolved`, eventuale `solve`. Esporta su `HH.<id>`.
2. `src/games/<id>-ui.js`: rendering con `innerHTML` + delega eventi su `el.onclick`. Griglie con `dir="ltr"`.
3. Aggiungi la voce in `src/games/catalog.js` (`id`, `name`, `rules`, `files` in ordine: CSS, logic, eventuali file di supporto, ui per ultima). NON metterli in `index.html` né in `SHELL`: il gioco si scarica in lazy load quando lo si apre e il service worker lo mette in cache da solo. Poi `npm run cards` (rigenera `cards.js` e `tokens.css`; `art` deve essere una funzione pura che restituisce SVG).
4. CSS in `src/games/<id>.css` con prefisso a 2 lettere (`px-`), token in `:root` + tema scuro, tinta card `--tint-<id>` in **entrambi** i temi (finisce in `tokens.css`, caricato all'avvio).
5. Chiave regole `rN` in tutte le lingue (skill `i18n`).
6. Unit test in `tests/<id>.test.mjs` (oracolo indipendente); docs in `docs/games/<id>.md`; togli il gioco da `SOON` in `src/app.js` se presente.
7. `npm test && npm run build`, poi spunta in `TODO.md`.

## Curva di difficoltà
Definisci `sizeFor(level)` monotona e con almeno 4 gradini; livello 1 risolvibile in < 1 minuto da un bambino di 8 anni.
