---
name: android-release
description: Rendere l'app installabile su Android e pubblicarla (PWA su GitHub Pages, APK/AAB con Bubblewrap TWA, Play Store).
---

# Release Android

Dettagli completi in `docs/android.md`.

## Livello 1 — PWA (subito)
Push su `main` → `.github/workflows/pages.yml` pubblica su `https://<utente>.github.io/<repo>/`.
Da Chrome Android: menu ⋮ → "Installa app" (o il pulsante Installa nell'app). Funziona offline dopo la prima apertura.

## Livello 2 — APK / AAB (TWA)
```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://<utente>.github.io/<repo>/manifest.webmanifest
bubblewrap build            # -> app-release-signed.apk + app-release-bundle.aab
```
Poi pubblica `assetlinks.json` in `.well-known/` (fingerprint SHA-256 della chiave) per togliere la barra URL.

## Checklist
- [ ] `npm test` OK · versione incrementata in `package.json`, `sw.js`, `twa-manifest.json`
- [ ] Icone 192/512/maskable presenti · Lighthouse PWA "installabile"
- [ ] Prova in modalità aereo dopo il primo avvio
