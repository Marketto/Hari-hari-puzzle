---
name: puzzle-generator
description: Tecniche per generare livelli risolvibili e a soluzione unica (backtracking, riparazione, generazione inversa) e misurarne la difficoltà.
---

# Generatori di puzzle

## Tre strategie (in ordine di preferenza)
1. **Inversa dallo stato risolto** — parti dalla soluzione e applica mosse inverse legali. Risolvibilità garantita. Usata da Lantern Glow (tocchi casuali da tutto acceso).
2. **Casuale + solver** — genera, poi verifica con un solver con limite di nodi; scarta se fallisce. Usata da Boba Sort (DFS con memo, `nodeLimit` 40k).
3. **Soluzione-prima + riparazione dell'unicità** — fissa una soluzione, costruisci i vincoli intorno, poi finché il solver trova una seconda soluzione modifica un vincolo che la rompe. Usata da Hedgedoku (`repair()` sposta una cella della soluzione alternativa in una regione vicina mantenendo la connessione).

## Requisiti
- Accetta `rnd` come parametro (default `Math.random`) per test riproducibili.
- Tempo medio < 10 ms in Node per la taglia massima; fallback sempre valido.
- Mai stato iniziale già risolto.

## Difficoltà
Misura con il solver: numero di nodi visitati o di deduzioni forzate. Salva in `docs/games/<id>.md` la tabella livello → taglia → nodi medi.
