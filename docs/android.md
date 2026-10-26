# Android

## 1. PWA installabile (nessun Play Store)
1. Repo pubblico su GitHub → Settings → Pages → Source: **GitHub Actions**.
2. Push su `main`: `.github/workflows/pages.yml` esegue i test e pubblica.
3. Apri `https://<utente>.github.io/<repo>/` con Chrome su Android → ⋮ → **Installa app** (oppure il pulsante "Installa" che compare nella barra in alto).
4. Dopo la prima apertura funziona in modalità aereo.

## Proposta d'installazione e aggiornamenti automatici (v0.6.2)
**Installazione** (`setupInstall` in `src/app.js`)
- Chrome Android: l'evento `beforeinstallprompt` viene trattenuto; dopo 2,5 s nella home compare la finestra di Hari
  "Installa Hari Hari" → *Installa app* apre il prompt nativo. Mai durante una partita.
- Altri browser Android (senza prompt): dopo 7 s compaiono le istruzioni "menu ⋮ → Installa app / Aggiungi a schermata Home".
- *Più tardi* (o prompt rifiutato) = non riproporre per 3 giorni (`harihari:install:snooze`). Il pulsante Installa resta in alto.
- App già installata (`display-mode: standalone`) o computer: nessuna proposta.

**Aggiornamenti** (`setupUpdates` + `sw.js`)
- Controllo: a ogni avvio, al ritorno in primo piano e ogni 30 minuti (`reg.update()`, `updateViaCache: 'none'`).
- Il service worker nuovo scarica tutta la shell ignorando la cache HTTP e resta in attesa; si attiva con il messaggio `{type:'skip'}`:
  subito se si è nella home, altrimenti quando l'app va in background, quando si torna alla home o con il pulsante *Aggiorna*.
- Prima della ricarica la partita viene salvata; all'avvio riparte da dove era e Hari dice "Aggiornata! I tuoi progressi sono al sicuro."
- **Salvataggi al sicuro**: stanno in `localStorage` (prefisso `harihari:`), che il service worker non tocca (cancella solo le sue cache
  vecchie). Livelli e punti non hanno versione. Le partite in corso hanno `SAVE_VERSION`: se cambia, aggiungere una migrazione in
  `HH.progress.MIGRATE[v]`; senza migrazione il salvataggio non viene caricato ma nemmeno cancellato. Se un salvataggio non si apre,
  se ne tiene copia in `save-bak:<id>` e si riparte dal livello raggiunto. `navigator.storage.persist()` evita la pulizia automatica.
- `tests/pwa.test.mjs` controlla: `VERSION` = `package.json`, shell offline completa, SW che non tocca i dati, migrazioni.

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
