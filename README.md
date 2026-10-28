<p align="center"><img src="assets/icons/icon-512.png" width="160" alt="Hari"></p>

# Hari Hari Puzzle ✿

Puzzle di logica kawaii con **Hari**, un riccio dagli occhioni dolci. Tutto **offline**, installabile su **Android**, in **43 lingue**.

| Gioco | Genere |
|---|---|
| **Hedgedoku** | un riccio per riga, colonna e zona, senza toccarsi (stile Queens / Meowdoku) |
| **Boba Sort** | travasa i gusti di bubble tea finché ogni bicchiere ne ha uno solo |
| **Lantern Glow** | accendi tutte le lanterne (Lights Out) con mosse contate |
| **Sushi Bar** | prendi gli ingredienti dal nastro e prepara gli ordini dei clienti prima che perdano la pazienza |
| **Fix-It House** | ripara i danni del temporale nell'ordine giusto e con l'attrezzo giusto, un episodio per ambiente (casetta, cucina, cameretta, bagno, giardino) |
| **Hari Parade** | guida la sfilata di ricci: ogni frutto allunga la fila, non urtare niente (stile Snake) |
| **Pixel Mochi** | nonogram: risolvi gli indizi e appare un disegno kawaii (43 disegni) |
| **Mochi Binary** | takuzu: mochi alla fragola e al matcha, mai tre uguali in fila |
| **Hari Knots** | sposta i nodini delle corde nei fori liberi: le corde libere volano via, libera tutte le lastre |
| **Yarn Link** | collega i gomitoli dello stesso colore riempiendo tutta la griglia (stile Flow) |
| **Hari Snack Rush** | corri lungo il sentiero e lancia semi e frutta agli animaletti affamati; scegli le porte giuste e riempi la pancia dell'animalone goloso (azione stile mob control, senza violenza) |
| **Hari Taxi** | guida per la città vista dall'alto: porta i passeggeri col taxi, il cibo caldo con lo scooter e i pacchi col furgone prima che scada il tempo, schivando auto, autobus, bici e pedoni (senza violenza) |
| **Hari Rally** | rally 3D in prima persona nel bosco: Hari accelera da solo, tu sterzi (inclinando il telefono a schermo intero, o col tocco) e freni seguendo le note del navigatore; arriva tra i primi 3 contro coniglietta, volpe e panda (senza violenza) |
| **Hari Memory** | memory con gli animali e i tesori del bosco (semi, frutta secca, bacche, alberi, foglie, funghi): dai livelli alti soggetti simili, coppie a tema (animale ↔ il suo cibo) e carte che scivolano; niente sconfitta, fragoline in base alle mosse |
| **Hari Spot** | trova le differenze fra due illustrazioni di città o di bosco generate da seme (stagioni, giorno/tramonto/notte): da 3 a 10 differenze sempre visibili e mai sovrapposte, lente per gli aiuti, zoom col pizzico |
| **Hari Airlines** | Hari assistente di volo: conta i passeggeri all'imbarco, sistema i bagagli nelle cappelliere, fa allacciare le cinture (anche ai testardi), cucina per il capitano e scalda i vassoi, serve le richieste e raccoglie i rifiuti col sacco giusto; fasi che si sbloccano livello dopo livello, niente sconfitta |
| **Hari Sudoku** | il sudoku classico 9×9 coi numeri, da facile (solo single) a esperto (X-wing, swordfish, XY-wing); matita con note automatiche, aiuto che spiega la tecnica, 3 cuori; Hari accanto alla griglia fa il tifo, indica una casella facile quando sei fermo, festeggia righe e numeri completati e si spaventa all'ultimo cuore |
| **Hari Home** | simulazione di vita isometrica senza livelli: ristruttura il monolocale decadente di Hari, arredalo, avvia un'attività, fai la spesa, vai dal dottore, fai sport e invita gli amici; Hari cresce fino a diventare nonno |

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
