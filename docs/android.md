# Android

## 1. PWA installabile (nessun Play Store)
1. Repo pubblico su GitHub → Settings → Pages → Source: **GitHub Actions**.
2. Push su `main`: `.github/workflows/pages.yml` esegue i test e pubblica.
3. Apri `https://<utente>.github.io/<repo>/` con Chrome su Android → ⋮ → **Installa app** (oppure il pulsante "Installa" che compare nella barra in alto).
4. Dopo la prima apertura funziona in modalità aereo.

## 2. APK / AAB con Trusted Web Activity (Bubblewrap)
Requisiti: Node 18+, JDK 17, Android SDK (Bubblewrap li scarica se mancano).
```bash
npm i -g @bubblewrap/cli
mkdir android && cd android
bubblewrap init --manifest https://<utente>.github.io/<repo>/manifest.webmanifest
#   package id suggerito: io.github.<utente>.harihari
bubblewrap build
#   -> app-release-signed.apk  (installabile direttamente)
#   -> app-release-bundle.aab  (per Play Console)
```
Per nascondere la barra dell'URL: `bubblewrap fingerprint` e pubblica il file `.well-known/assetlinks.json` nel repo (la Action lo copia nel sito).

Nota: GitHub Pages di progetto vive in una sottocartella; per i Digital Asset Links serve la radice del dominio. Soluzioni: repo `<utente>.github.io`, oppure dominio personalizzato.

## 3. Alternativa nativa: Capacitor (v1.0)
Impacchetta i file locali dentro l'APK (offline anche al primo avvio, nessun dominio richiesto):
```bash
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Hari Hari Puzzle" io.github.utente.harihari --web-dir=_site
npx cap add android && npx cap copy && npx cap open android
```

## Play Store
Classificazione PEGI 3, nessun dato raccolto (scheda "Sicurezza dei dati": nessuna raccolta), screenshot 1080×1920 di home e dei tre giochi.
