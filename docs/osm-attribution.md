# Dati OpenStreetMap (mappe reali di Hari Taxi)

Le mappe **Ostia** e **Desenzano del Garda** di Hari Taxi sono **dati derivati da OpenStreetMap**.

> © OpenStreetMap contributors — dati disponibili con licenza
> [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
> https://www.openstreetmap.org/copyright

Il database derivato (file `src/games/drive-map-ostia.js`, `src/games/drive-map-desenzano.js` e le anteprime in
`src/games/drive-maps.js`) è distribuito con la stessa licenza **ODbL 1.0**. Il resto del codice resta MIT.

| Mappa | Area usata (lon/lat min → max) | Scaricata il | Modifiche OSM fino al | Scala |
|---|---|---|---|---|
| Ostia | 12,255 41,715 → 12,322 41,755 | 2026-10-29 | 2026-10-28 | 1 casella = 9 m (619 × 492) |
| Desenzano del Garda | 10,50 45,455 → 10,58 45,485 | 2026-10-29 | 2026-10-28 | 1 casella = 9 m (694 × 369) |

**Fonte**: API ufficiale OpenStreetMap 0.6 (`https://api.openstreetmap.org/api/0.6/map?bbox=…`), 59 richieste in
sequenza a tasselli da 0,01° × 0,01° (32 per Ostia, area scaricata fino a lon 12,335; 27 per Desenzano, da lon 10,49),
User-Agent descrittivo, una pausa di circa 1 s tra le richieste, nessun tassello scaricato due volte.

**Trasformazioni** (`tools/osm-taxi.mjs`, riproducibile dai file in cache): proiezione locale in caselle da 9 m;
zone (mare e lago riempiti dalla linea di costa e dalle rive, spiagge, parchi, campi, piazze, parcheggi) rasterizzate;
strade carrabili come grafo semplificato (incroci vicini fusi, nodi intermedi tolti, Douglas-Peucker, solo la
componente connessa principale); semafori dai nodi `highway=traffic_signals` e agli incroci grandi; edifici
semplificati; pontili, moli, binari e mura dei castelli come linee/poligoni; luoghi notevoli (ristoranti, gelaterie,
bar, negozi, uffici postali e magazzini, posteggi taxi, stazioni, spiagge, pontili, castelli, porti, monumenti) con
il loro nome OSM. I nomi di vie e luoghi sono quelli di OSM e non vengono tradotti.

Nel gioco l'attribuzione "© OpenStreetMap contributors" è sempre visibile sulle mappe reali (angolo del palco),
nell'angolo della minimappa ("© OpenStreetMap") e nel selettore delle mappe.

Per rigenerare: vedi `docs/tools.md` (sezione "Mappe reali di Hari Taxi").
