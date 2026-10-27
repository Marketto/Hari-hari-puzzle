# Privacy e statistiche

## Cosa resta sul telefono (sempre)
- Salvataggi, progressi, impostazioni, lingua: `localStorage` del browser, prefisso `harihari:`.
- Tempo di gioco e numero di partite per ogni gioco (`harihari:use:<gioco>`), mostrati in **Progressi**.
- Niente di tutto questo viene inviato.

## Statistiche anonime (facoltative)
`src/core/usage.js` può inviare conteggi anonimi a [GoatCounter](https://www.goatcounter.com) (servizio senza cookie):
- si attiva solo se nel file è impostato `CODE` (il nome del sito GoatCounter, es. `harihari` per `https://harihari.goatcounter.com`);
- la prima volta, in home, Hari chiede il consenso (**opt-in**: senza un "sì" non parte nulla); si può cambiare idea in
  **Progressi → Invia statistiche anonime** (la coda viene svuotata);
- si inviano solo eventi `open/<gioco>` (partita aperta) e `minute/<gioco>` (un minuto di gioco visibile):
  niente nomi, identificativi, salvataggi o contenuti; richiesta senza cookie, senza credenziali e senza referrer;
- offline gli eventi restano in coda (massimo 300) e partono quando torna la rete.

Su GoatCounter: il numero di eventi `minute/<gioco>` = minuti di gioco totali; `open/<gioco>` = partite aperte.

## Configurazione attuale
Codice `harihari` → dati su https://harihari.goatcounter.com (si usa l'endpoint `/count` direttamente, senza caricare script esterni).

## Come attivarle
1. Crea un account e un sito su goatcounter.com (es. codice `harihari`).
2. Metti il codice in `CODE` dentro `src/core/usage.js`, incrementa la versione e pubblica.
