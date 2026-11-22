# Privacy e statistiche

L'informativa mostrata ai giocatori (43 lingue, scheda "Informativa privacy" della pagina "Privacy e condizioni") e
l'avviso da accettare al primo avvio sono descritti in [legal.md](legal.md). Questa pagina è la versione tecnica.

## Avviso al primo avvio
Prima di tutto il resto (anche della domanda sulle statistiche) il giocatore spunta tre caselle: avvertenze di
sicurezza e uso sotto la propria responsabilità, condizioni d'uso con esclusione di responsabilità, lettura
dell'informativa. Si salva solo in locale: `harihari:legal = { v, at }` (versione del testo e data). Se la versione
aumenta (oggi `2`), l'avviso ricompare.

## Cosa resta sul telefono (sempre)
- Salvataggi, progressi, impostazioni, lingua: `localStorage` del browser, prefisso `harihari:`.
- Tempo di gioco e numero di partite per ogni gioco (`harihari:use:<gioco>`), mostrati in **Progressi**.
- Niente di tutto questo viene inviato.

## Gioco in due (rete locale)
Il multigiocatore ([multiplayer.md](multiplayer.md)) collega due telefoni **direttamente**, sulla stessa Wi-Fi o hotspot:
- **nessun dato esce dalla rete locale**: niente server di gioco, niente STUN/TURN, nessuna richiesta a internet;
- il **microfono** serve solo ad ascoltare la melodia dell'altro telefono durante l'abbinamento: il suono si analizza in
  memoria, non si registra né si invia, e il microfono si spegne appena i telefoni sono collegati (lo stesso per la
  **fotocamera** quando si inquadra il QR); il permesso si chiede solo in quel momento, con una spiegazione;
- la melodia, il QR e il codice testuale contengono solo l'impronta di un certificato temporaneo, gli indirizzi IP locali
  e le porte: valgono per quella sola partita;
- i messaggi di gioco viaggiano cifrati (DTLS) tra i due telefoni; i 4 frutti confermano che l'altro è proprio il telefono accanto.

## Font
I font (Mochiy Pop One, M PLUS Rounded 1c, Baloo Bhaijaan 2, SIL OFL 1.1) sono **file inclusi nell'app**: nessuna
richiesta a Google Fonts o ad altri servizi. Per questo l'informativa mostrata ai giocatori non ha più la sezione
"Font" (rimossa con la versione 2 dei testi legali); le licenze dei font restano nella scheda "Licenze".

## Statistiche anonime (facoltative)
`src/core/usage.js` può inviare conteggi anonimi a [GoatCounter](https://www.goatcounter.com) (servizio senza cookie):
- si attiva solo se nel file è impostato `CODE` (il nome del sito GoatCounter, es. `harihari` per `https://harihari.goatcounter.com`);
- la prima volta, in home e dopo l'avviso legale, Hari chiede il consenso (**opt-in**: senza un "sì" non parte nulla); si può cambiare idea in
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
