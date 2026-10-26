---
name: kawaii-ui
description: Linee guida visive di Hari Hari Puzzle (palette, font, mascotte, animazioni, temi chiaro/scuro). Usala per qualsiasi modifica grafica.
---

# Stile kawaii

Vedi `docs/design-system.md` per i token completi.

- **Mondo**: pasticceria giapponese — latte alla fragola, menta, crema, cacao (il riccio), lanterne di carta. Di notte: "giardino notturno" prugna con stelle.
- **Font**: `Mochiy Pop One` solo per titoli e numeri grandi; `M PLUS Rounded 1c` per il testo; `Baloo Bhaijaan 2` per l'arabo.
- **Forme**: raggi 18–28 px, bordi 2 px `--line`, ombra morbida `--shadow`. Pulsanti principali a pillola `--accent` con "spessore" sotto.
- **Mascotte**: un solo disegno (`src/core/mascot.js`). Stati: `breathe` (idle), `blink`, `.jump` (vittoria), `.oops` (errore). Occhioni con 2 riflessi + scintilla; i riflessi seguono il puntatore.
- **Movimento**: sfondo canvas (bolle di colore, petali, stelline) a bassa intensità; un'animazione forte solo alla vittoria (coriandoli + salto). Rispetta sempre `prefers-reduced-motion`.
- **Accessibilità**: i gusti di Boba Sort hanno anche un simbolo; contrasto AA per il testo; focus visibile.
- **Icone app**: modifica la mascotte, poi `npm run icons` (SVG) e `python3 tools/rasterize-icons.py` (PNG).
