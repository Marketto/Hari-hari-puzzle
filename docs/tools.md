# Tool e struttura agentica

## Script (`tools/`)
| Script | Cosa fa |
|---|---|
| `../tests/*.test.mjs` | Unit test (`node --test`): livelli Hedgedoku validati da solver indipendente, Boba, Lantern, i18n. Lanciati da `npm test` |
| `selftest.mjs` | Benchmark rapido dei generatori (`npm run bench`) |
| `i18n-check.mjs` | Ogni lingua ha tutte le chiavi, nessun vuoto, lingue obbligatorie presenti |
| `build-inline.mjs` | Fonde CSS e JS in `dist/hari-hari-puzzle.html` (file unico) e `dist/artifact.html` |
| `gen-icons.mjs` | Icone SVG (standard, maskable, mascotte) dal disegno di Hari |
| `rasterize-icons.py` | PNG 180/192/512 + maskable (richiede `pip install cairosvg`) |
| `serve.mjs` | Server statico locale senza dipendenze |
| `mp-demo.html` | Demo del multigiocatore (due ricci e una fragola): `http://localhost:5173/tools/mp-demo.html` |
| `mp-e2e.mjs` | Prova reale del multigiocatore con Playwright: due Chromium, microfono e fotocamera finti, percorsi suono/QR/codice, screenshot (`--shots DIR`) |
| `street-e2e.mjs` | Prova reale di Hari Snack Street a due (modulo HH.mp vero, abbinamento col suono): viste coerenti, input dell'ospite, vittoria su entrambi, caduta del link → Kiki CPU (`--port`, `--shots DIR`) |
| `rally-e2e.mjs` | Prova reale di Hari Rally a due (modulo HH.mp vero, abbinamento col suono): scelta del kart, input dell'ospite, viste coerenti, pausa/ripresa, stessa classifica, vittoria o rivincita, uscita dell'ospite → il suo kart all'IA, secondo abbinamento e link che cade davvero (pagina dell'ospite chiusa a metà gara) → kart all'IA sull'host (`--port`, `--shots DIR`, `--w`, `--h`) |

## Struttura agentica (Claude Code)
```
CLAUDE.md / AGENTS.md        regole d'oro + tabella ROUTER (richiesta → skill → agente → tool)
.claude/agents/
  router.md                  scompone richieste multi-area e delega
  game-designer.md           nuovi giochi, generatori, solver
  i18n-translator.md         43 lingue
  qa-tester.md               verifica finale, chiude ogni flusso
  release-android.md         Pages, Bubblewrap, versioni
.claude/skills/
  add-game/                  contratto e passi per aggiungere un gioco
  puzzle-generator/          strategie di generazione e unicità
  i18n/                      chiavi, lingue, RTL
  kawaii-ui/                 stile visivo e mascotte
  android-release/           PWA → APK/AAB
  qa-check/                  checklist manuale e automatica
  audio-music/               brani generativi, effetti, frasi di Hari
TODO.md                      lavoro corrente (In corso / Prossimo / Fatto / Verifiche)
ROADMAP.md                   versioni pianificate
```

Flusso tipico: richiesta → `router` produce piano → agenti specialisti eseguono con le skill → `qa-tester` verifica → aggiornamento di `TODO.md`.

## Hook consigliato (opzionale)
In `.claude/settings.json` puoi far girare il controllo traduzioni a ogni modifica di `locales.js`:
```json
{
  "permissions": { "allow": ["Bash(npm test)", "Bash(npm run build)", "Bash(node tools/*)"] },
  "hooks": { "PostToolUse": [{ "matcher": "Edit|Write", "hooks": [{ "type": "command", "command": "node tools/i18n-check.mjs" }] }] }
}
```

## gen-cards.mjs (`npm run cards`)
Genera `src/games/cards.js` (illustrazioni SVG delle card, estratte da `art()` di ogni gioco) e `src/games/tokens.css` (token di colore dei giochi in tema chiaro/scuro + regole CSS usate dalle illustrazioni). Va rilanciato dopo aver cambiato `art`, colori o nome di un gioco; un test controlla che i file siano aggiornati.

## Mappe reali di Hari Taxi (OpenStreetMap)
Solo per lo sviluppo: il gioco non scarica mai nulla, i dati derivati sono file statici caricati in lazy load.
| Script | Cosa fa |
|---|---|
| `osm-taxi-maps.mjs` | Configurazione delle mappe: area scaricata (`bbox`) e usata (`crop`), metri per casella, semi del mare/lago, luoghi notevoli attesi, ordine dei punti di partenza dei livelli |
| `osm-taxi-fetch.mjs` | `node tools/osm-taxi-fetch.mjs --cache DIR [id…]`: scarica dall'API OSM 0.6 a tasselli da 0,01° (divisi in 4 se l'API risponde 400), in sequenza con pausa di ~1 s, User-Agent descrittivo, mai due volte lo stesso tassello. Dietro un proxy: `NODE_USE_ENV_PROXY=1` |
| `osm-xml.mjs` | Lettore minimo dell'XML OSM (nodi, vie, relazioni), fonde i tasselli per id |
| `osm-taxi.mjs` | `node tools/osm-taxi.mjs --cache DIR [id…] [--png DIR]`: dall'XML in cache a `src/games/drive-map-<id>.js` (zone a corse, grafo stradale, edifici, pontili/binari/castelli, luoghi, nomi; varint + base64) e `src/games/drive-maps.js` (elenco e anteprime). `--png` salva il raster per un controllo a occhio. Stampa dimensioni e statistiche |
| `drive-maps-e2e.mjs` | Prova reale con Playwright: selettore, Ostia (lungomare, Pontile, spiaggia), Desenzano (porto, lago, castello), minimappa, un livello vinto dal bot su ogni mappa, tema scuro, schermo intero orizzontale, nessun errore in console (`--port`, `--shots DIR`) |

Attribuzione e licenza dei dati: `docs/osm-attribution.md`. Dopo aver rigenerato: `npm test` (dimensioni, connessione,
raggiungibilità, bot) e `npm run build`.
