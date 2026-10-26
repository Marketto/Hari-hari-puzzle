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
