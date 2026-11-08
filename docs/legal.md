# Avviso legale, condizioni d'uso, privacy e licenze

## Cosa vede il giocatore
- **Al primo avvio** (e ogni volta che aumenta `HH.legal.VERSION` in `src/core/legal.js`, oggi `1`) compare la finestra
  "Prima di giocare" con Hari: introduzione (`lg_intro`: software libero senza garanzia, uso a proprio rischio, l'autore e
  gli autori delle librerie sono sollevati da ogni responsabilità), riquadro di sicurezza (`lg_safety`: pause, malessere,
  luci lampeggianti, bambini con un adulto, mai camminando o guidando), due caselle obbligatorie
  (`lg_chk_terms`, `lg_chk_privacy`) con i link ai testi completi e il link "Licenze". "Accetto e gioco" resta spento
  finché non sono spuntate entrambe.
- La finestra **non si chiude** con Esc, clic fuori o tasto indietro; l'app dietro è `inert`, il focus resta dentro
  (Tab gira in tondo). I testi completi si aprono **dentro la finestra** (sotto-vista con "Indietro" e le tre schede):
  le caselle restano come erano. Il pulsante con il globo apre la scelta della lingua sopra l'avviso.
- Blocca tutto: una partita ripresa all'avvio, o un gioco toccato, si apre solo **dopo** l'accettazione; la domanda sulle
  statistiche anonime (`askConsent` in `src/app.js`) parte solo dopo (1,5 s dopo l'accettazione, se si è in home).
- Accettazione salvata in `HH.store` come `legal = { v, at }` (versione e data). Nessun dato esce dal telefono.
- **Piè di pagina della home** e scheda **Progressi** (sotto il consenso alle statistiche): link "Privacy e condizioni"
  (`lg_link`) → pagina con le tre schede `lg_terms`, `lg_privacy`, `lg_licenses` e la riga `lg_accepted` con la data
  (formato della lingua, `Intl.DateTimeFormat`). Questa si chiude normalmente (✕, Esc, clic fuori).
- Tema chiaro e scuro (token `--link`, `--warn-bg`, `--warn-ink` in `src/styles.css`), RTL, 360 px in verticale e
  telefono girato (blocco `@media (orientation: landscape) and (max-height: 560px)`: due colonne, scorrimento interno).

## Dove stanno i testi
| File | Contenuto | Caricamento |
|---|---|---|
| `src/i18n/locales.js` | 14 chiavi brevi `lg_*` (43 lingue) | sempre |
| `src/i18n/legal/<lang>.js` | `HH.LEGAL[lang] = { terms, privacy, licenses }`, ognuno `{ title, sections: [{ h, p: [] }] }` | al bisogno (`HH.legal.load` → `HH.loadFile`) |
| `src/i18n/legal/licenses.js` | `HH.LEGAL_COMPONENTS` (elenco componenti) e `HH.LEGAL_TEXTS` (testi integrali in inglese) | aprendo la scheda Licenze |
| `docs/licenses/OFL-1.1.txt`, `docs/licenses/ODbL-1.0.txt`, `LICENSE`, `src/vendor/three.LICENSE` | testi ufficiali delle licenze | sorgente del generatore |

Tutti i file di `src/i18n/legal/` sono **generati** da `tools/legal-import.mjs`: non modificarli a mano.
- `en.js` e `licenses.js` sono nella `SHELL` di `sw.js` (sempre offline); le altre lingue si scaricano quando servono
  (all'avviso del primo avvio, a ogni cambio di lingua e aprendo la pagina) e il service worker le tiene in cache, anche
  dopo un aggiornamento. Offline e lingua mai scaricata → testo inglese con l'avviso `lg_offline`.
- Il file unico `dist/hari-hari-puzzle.html` (`tools/build-inline.mjs`) contiene tutti i testi legali di tutte le lingue.
- Nei testi lunghi `**…**` = grassetto; `{app}` è già sostituito dal generatore. Nelle chiavi brevi `{app}` e `{date}`
  si sostituiscono a runtime (`HH.legal.inline`, che fa anche l'escape HTML).

## Aggiornare i testi
1. Testi sorgente EN/IT in un `source.json` (`{ keys: { lg_*: { en, it } }, docs: { terms|privacy|licenses: { en, it } } }`),
   traduzioni in file `{ "<lang>": { keys, docs } }` (o `{ keys, docs }` con la lingua nel nome del file).
2. `node tools/legal-import.mjs source.json tr-*.json` → aggiorna `locales.js` e i file `src/i18n/legal/*.js`.
   Ogni traduzione deve avere la stessa struttura dell'inglese (sezioni e paragrafi) e i `**` in coppia, altrimenti la
   lingua viene saltata e lo script esce con errore. `--fallback-en` mette l'inglese provvisorio nelle chiavi mancanti.
3. Se il cambiamento è sostanziale, aumenta `HH.legal.VERSION`: l'avviso ricompare a tutti.
4. `npm test` (`tests/legal.test.mjs`: 43 lingue, struttura, `{app}`, grassetti, licenze aggiornate, accettazione).

## Componenti di terze parti
Elenco unico: `COMPONENTS` in `tools/legal-import.mjs` (poi `node tools/legal-import.mjs` rigenera `licenses.js`;
un test controlla che sia aggiornato).

| Componente | Autore | Licenza | Dove |
|---|---|---|---|
| Hari Hari Puzzle | © 2026 Marketto | MIT (`LICENSE`) | tutta l'app |
| three.js r160 | © 2010-2023 three.js authors | MIT (`src/vendor/three.LICENSE`) | Hari Rally e Hari Fishing (`src/vendor/three.min.js`) |
| Mochiy Pop One | FONTDASU (Copyright 2020 The Mochiypop Project Authors) | SIL OFL 1.1 | titoli, da Google Fonts |
| M PLUS Rounded 1c | Coji Morishita, M+ Fonts Project (Copyright 2016 The Rounded M+ Project Authors) | SIL OFL 1.1 | testo, da Google Fonts |
| Baloo Bhaijaan 2 | Ek Type (Copyright 2019 The Baloo 2 Project Authors) | SIL OFL 1.1 | arabo, da Google Fonts |
| Dati OpenStreetMap | © OpenStreetMap contributors | ODbL 1.0 | mappe reali di Hari Taxi ([osm-attribution.md](osm-attribution.md)) |
| QR Code | marchio registrato di DENSO WAVE INCORPORATED | avviso di marchio | codificatore/lettore QR del gioco in due: codice originale (MIT) |

Codice scritto per l'app (nessuna libreria esterna): Reed-Solomon e modem acustico (`src/net/sonic.js`), QR
(`src/net/qr.js`, base45 secondo RFC 9285), WebRTC del multigiocatore (`src/net/mp.js`).

**Servizi** (non inclusi nell'app, descritti nell'informativa privacy): GoatCounter (statistiche anonime facoltative,
[privacy.md](privacy.md)) e Google Fonts (i tre font sopra, scaricati al primo avvio online).

## Prove
- `node --test tests/legal.test.mjs`
- `tools/legal-e2e.mjs` (Playwright): primo avvio in it/ja/ar, verticale chiaro/scuro e orizzontale, pulsante
  disattivato/attivo, testi completi e ritorno con le caselle conservate, Esc/clic fuori/indietro, accettazione → domanda
  statistiche, ricarica, piè di pagina, Progressi, partita ripresa bloccata fino all'accettazione, cambio lingua dalla
  finestra, file unico offline. Gli altri e2e preimpostano `harihari:legal` per non fermarsi sull'avviso.
