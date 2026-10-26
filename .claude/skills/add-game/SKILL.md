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
  create(el, ctx) {       // monta il gioco dentro el
    // ctx.level (getter) · ctx.moves(n) · ctx.win() · ctx.sfx.{tap,pick,pour,bad,win} · ctx.react('oops'|'win')
    return { fresh(), restart(), undo() };
  },
});
```

## Passi
1. `src/games/<id>-logic.js`: funzioni pure `generate(size|level, rnd)`, `check/isSolved`, eventuale `solve`. Esporta su `HH.<id>`.
2. `src/games/<id>-ui.js`: rendering con `innerHTML` + delega eventi su `el.onclick`. Griglie con `dir="ltr"`.
3. Registra entrambi i file in `index.html` (logic prima di ui, prima di `app.js`) e in `SHELL` di `sw.js`.
4. CSS in `src/styles.css` con prefisso a 2 lettere (`px-`), tinta card `--tint-<id>` in **entrambi** i temi.
5. Chiave regole `rN` in tutte le lingue (skill `i18n`).
6. Test in `tools/selftest.mjs`; docs in `docs/games/<id>.md`; togli il gioco da `SOON` in `src/app.js` se presente.
7. `npm test && npm run build`, poi spunta in `TODO.md`.

## Curva di difficoltà
Definisci `sizeFor(level)` monotona e con almeno 4 gradini; livello 1 risolvibile in < 1 minuto da un bambino di 8 anni.
