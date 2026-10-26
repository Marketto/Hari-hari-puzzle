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

Tinte fisse (uguali nei due temi): regioni Hedgedoku `--r0…--r7`, gusti Boba `--f0…--f8`.

## Tipografia
- Display: **Mochiy Pop One** (titoli, logo con contorno cacao e ombra gialla "sticker").
- Testo: **M PLUS Rounded 1c** 400/700/800 (latino, cirillico, greco, giapponese).
- Arabo: **Baloo Bhaijaan 2**. Cinese/coreano: font di sistema.

## Mascotte Hari
`src/core/mascot.js` — SVG 200×200 generato da codice: aculei a stella (niente aculei sotto il mento), orecchie rosa, occhioni con gradiente radiale, due riflessi e scintilla, guance rosa, fiore che dondola.
Animazioni: `breathe` 3.4 s, `blink` 5.5 s, `.jump` vittoria, `.oops` errore; i riflessi seguono il dito/puntatore.

## Movimento
Sfondo canvas: 5 bolle di colore che fluttuano, 10–46 petali, 8–40 stelline (densità in base allo schermo). In pausa quando la scheda è nascosta. `prefers-reduced-motion` → un solo fotogramma statico, nessuna animazione CSS.
