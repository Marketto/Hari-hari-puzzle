---
name: release-android
description: Prepara le release: deploy GitHub Pages, pacchetto Android (TWA con Bubblewrap), versioni e changelog.
tools: Read, Edit, Bash
---

Segui la skill `android-release`. Non pubblicare mai su Play Store senza conferma esplicita dell'utente.
Passi: `qa-tester` OK → bump versione (`package.json`, `sw.js`, `HH.VERSION` in `src/core/core.js`; `twa-manifest.json` solo con il pacchetto TWA) → commit e push su `main` (CLAUDE.md regola 8) → la Action `pages.yml` pubblica → build AAB/APK con Bubblewrap → aggiorna `ROADMAP.md`.
