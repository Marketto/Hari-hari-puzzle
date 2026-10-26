<p align="center"><img src="assets/icons/icon-512.png" width="160" alt="Hari"></p>

# Hari Hari Puzzle ✿

Puzzle di logica kawaii con **Hari**, un riccio dagli occhioni dolci. Tutto **offline**, installabile su **Android**, in **43 lingue**.

| Gioco | Genere |
|---|---|
| **Hedgedoku** | un riccio per riga, colonna e zona, senza toccarsi (stile Queens / Meowdoku) |
| **Boba Sort** | travasa i gusti di bubble tea finché ogni bicchiere ne ha uno solo |
| **Lantern Glow** | accendi tutte le lanterne (Lights Out) con mosse contate |
| **Sushi Bar** | prendi gli ingredienti dal nastro e prepara gli ordini dei clienti prima che perdano la pazienza |
| **Fix-It House** | ripara i danni del temporale nell'ordine giusto e con l'attrezzo giusto |
| In arrivo | Pixel Mochi (Nonogram) · Mochi Binary (Takuzu) · Yarn Link (Flow) |

## Provalo
- **Online / Android**: https://marketto.github.io/Hari-hari-puzzle/ → da Chrome su Android: ⋮ → *Installa app*
- Apri `index.html` nel browser, oppure `npm run dev` → http://localhost:5173
- File unico: `npm run build` → `dist/hari-hari-puzzle.html`
- Android: pubblica su GitHub Pages e da Chrome scegli **Installa app** (vedi [docs/android.md](docs/android.md))

## Sviluppo
```bash
npm test        # logica dei giochi + traduzioni
npm run build   # versione in un solo file
npm run icons   # icone dalla mascotte
```
Nessuna dipendenza. Documentazione in [docs/](docs/README.md), lavoro corrente in [TODO.md](TODO.md), piano in [ROADMAP.md](ROADMAP.md).
Il progetto è pronto per lavorare con agenti: [CLAUDE.md](CLAUDE.md) contiene il router verso agenti e skill in `.claude/`.

## Licenza
MIT
