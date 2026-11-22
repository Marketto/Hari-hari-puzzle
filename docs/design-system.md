# Design system

**Concetto**: una pasticceria kawaii in un giardino di sakura. Di giorno latte alla fragola e menta; di notte un giardino prugna con lanterne e stelle. Il cacao del riccio è l'inchiostro.

## Colori (token in `src/styles.css`)
| Token | Chiaro | Scuro | Uso |
|---|---|---|---|
| `--bg` | #fff3ec | #1f1830 | fondo pagina |
| `--ink` | #4b2e28 | #fbeee8 | testo |
| `--ink-2` | #8b6a60 | #cbb6c4 | testo secondario |
| `--accent` | #ff6f9c | #ff8fb3 | fragola: pulsanti principali |
| `--mint` | #5fcdb4 | #7fe0c9 | menta: successo, secondo "Hari" del logo |
| `--sun` | #ffc95e | #ffd27d | ombra adesiva del logo, coriandoli |
| `--card` | crema traslucida | prugna traslucida | card con blur |

Transizione fra le schermate: token `--tr-*` (foglie `--tr-leaf-1…4`, petali, bolle, aculei, frutta, nuvolette, `--tr-shine`), definiti nei due temi; `--tr-tint-a` è l'intensità della tinta del velo.

Tinte fisse (uguali nei due temi): regioni Hedgedoku `--r0…--r7`, gusti Boba `--f0…--f8`.

## Temi accessibili
- **Tema scuro**: un solo blocco `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])`.
- **Alto contrasto** (`prefers-contrast: more`, chiaro e scuro): inchiostro più scuro/chiaro, bordi `--line` pieni, pannelli
  opachi (`--card` = `--card-solid`), accento più scuro per il testo bianco, focus `--focus`/`--focus-w` (4 px) su tutto.
- **Daltonici** (`html[data-cvd]`, interruttore in Progressi, `HH.fx.cvd`, chiave `cvd` in `HH.store`): palette Okabe-Ito su
  accento, `--mint`, `--bad`, `--sun`, `--sky`, `--gold`, `--link`, zone `--r0…7`, gusti `--f0…8` (chiaro e scuro, anche
  insieme all'alto contrasto). Le fragoline restano rosse. I giochi non devono affidarsi al solo colore: simboli (Boba, Yarn,
  Ropes, Escape, Airlines), muri (Hedgedoku), forme (Takuzu); Hari Colors accende i simboli da sé con `data-cvd`.

## Tipografia
Font OFL inclusi nell'app in `assets/fonts/` (woff2 da @fontsource, rigenerati con `tools/fonts-import.mjs`), `font-display: swap`:
- Display: **Mochiy Pop One** (titoli, logo con contorno cacao e ombra gialla "sticker").
- Testo: **M PLUS Rounded 1c** 400/700/800 (latino, cirillico, greco, giapponese).
- Arabo: **Baloo Bhaijaan 2** 500/700/800. Cinese/coreano: font di sistema.

File: `fonts.css` (sempre caricato) e `fonts-ja.css` (~120 fette per peso con `unicode-range`, solo in giapponese: lo
aggiunge `HH.i18n.set` prima di `fonts.css`). Nella SHELL del service worker: M PLUS latin/latin-ext/cyrillic/greek,
Mochiy latin, Baloo arabic/latin (~372 KB); tutto il resto (fette giapponesi, cyrillic-ext, greek-ext, vietnamita, ebraico)
va in cache al primo uso e passa da una versione all'altra senza riscaricarlo. Il file unico (`npm run build`) incorpora
come data URI solo i font della SHELL: lì il giapponese usa i font di sistema.

## Mascotte Hari
`src/core/mascot.js` — SVG 200×200 generato da codice: aculei a stella (niente aculei sotto il mento), orecchie rosa, occhioni con gradiente radiale, due riflessi e scintilla, guance rosa, fiore che dondola.
Animazioni: `breathe` 3.4 s, `blink` 5.5 s, `.jump` vittoria, `.oops` errore; i riflessi seguono il dito/puntatore.

## Valutazione
Le stelle sono sostituite da **fragoline**: rosse con semini e foglie menta quando guadagnate, sagome spente altrimenti
(`STAR()` in `src/core/ui.js`, token `--berry`, `--berry-2`, `--berry-seed`). Nella vittoria spuntano una alla volta, con la centrale più grande.

## Movimento
Sfondo canvas: 5 bolle di colore che fluttuano, 10–46 petali, 8–40 stelline (densità in base allo schermo). In pausa quando la scheda è nascosta. `prefers-reduced-motion` → un solo fotogramma statico, nessuna animazione CSS.

Transizione home ↔ gioco (`src/core/transition.js`): nuvola di elementi kawaii, ~1 s, variante casuale fra 7 (mai la stessa due volte); con `prefers-reduced-motion` solo una dissolvenza breve. Dettagli in `docs/architecture.md`.
