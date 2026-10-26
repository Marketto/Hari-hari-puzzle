---
name: qa-check
description: Checklist di verifica prima di commit/merge/release di Hari Hari Puzzle.
---

# QA

Automatico: `npm test` (logica + traduzioni) e `npm run build`.

Manuale (telefono reale o DevTools 390×844):
1. Home in chiaro e scuro, in `it`, `ja`, `ar` (RTL): niente testo tagliato, nessuno scroll orizzontale.
2. Ogni gioco: tocco, annulla, ricomincia, nuovo puzzle, vittoria → livello +1 salvato dopo ricarica.
3. Tasto indietro di Android dal gioco torna alla home.
4. Modalità aereo dopo il primo avvio: l'app si apre e funziona.
5. `prefers-reduced-motion`: sfondo fermo, nessuna animazione.
6. Suono on/off persiste.

Riporta l'esito in `TODO.md` sotto "Verifiche".
