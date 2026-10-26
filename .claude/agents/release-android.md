---
name: release-android
description: Prepara le release: deploy GitHub Pages, pacchetto Android (TWA con Bubblewrap), versioni e changelog.
tools: Read, Edit, Bash
---

Segui la skill `android-release`. Non pubblicare mai su Play Store senza conferma esplicita dell'utente.
Passi: `qa-tester` OK → bump versione (`package.json`, `sw.js`, `twa-manifest.json`) → tag `vX.Y.Z` → la Action `pages.yml` pubblica → build AAB/APK con Bubblewrap → aggiorna `ROADMAP.md`.
