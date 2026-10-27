# Sushi Bar

Gioco di cucina "a ordini": gli ingredienti arrivano su un nastro trasportatore (kaiten), i clienti chiedono un piatto
e Hari cuoco lo prepara sul tagliere.

## Regole
- Tocca un ingrediente sul nastro per metterlo sul tagliere (massimo 4). L'ordine degli ingredienti non conta.
- Il fumetto di ogni cliente mostra il piatto e i suoi ingredienti; quando il tagliere corrisponde, il fumetto si illumina.
- Tocca il cliente per servirlo. Piatto sbagliato: il cliente perde un po' di pazienza.
- Cestino: svuota il tagliere. Annulla: toglie l'ultimo ingrediente.
- Se la barra della pazienza finisce, il cliente se ne va arrabbiato: **perdi un cuore** (3 cuori). A cuori finiti si ricomincia.
- Gli ingredienti che nessuno prende tornano in cucina a destra: la scelta sul nastro si rinnova sempre.
- Vinci servendo tutti i clienti del livello.

## Ricette (in ordine di sblocco)
| Piatto | Ingredienti | Livello |
|---|---|---|
| Onigiri | riso, alga | 1 |
| Nigiri al salmone (sake) | riso, salmone | 1 |
| Nigiri al tonno (maguro) | riso, tonno | 1 |
| Nigiri al gambero (ebi) | riso, gambero | 1 |
| Nigiri al polpo (tako) | riso, polpo | 2 |
| Nigiri al granchio (kani) | riso, granchio | 3 |
| Nigiri al branzino (suzuki) | riso, branzino | 4 |
| Avocado maki | alga, riso, avocado | 6 |
| Tamago | riso, uovo, alga | 8 |
| Kappa maki | alga, riso, cetriolo | 10 |
| Uramaki al sesamo | alga, riso, salmone, sesamo | 12 |
| California | alga, riso, granchio, avocado | 14 |
| Temaki | alga, riso, tonno, avocado | 16 |
| Dragon roll | alga, riso, gambero, sesamo | 18 |

12 ingredienti: riso, alga nori, salmone, tonno, gambero, polpo, granchio, branzino, cetriolo, uovo, avocado, sesamo.
Le partite salvate con una versione precedente ricevono le ricette aggiornate al loro livello.

Clienti: coniglietto, gatto, panda, rana, volpe, orsetto, pulcino, pinguino (mai due uguali al bancone).

## Difficoltà (`config(level)`)
| | Livello 1 | Livello 10 | Livello 15 |
|---|---|---|---|
| Clienti da servire | 5 | 14 | 14 |
| Posti al bancone | 2 | 3 | 3 |
| Ricette | 4 | 10 | 12 |
| Pazienza | 52 s | 32 s | 26 s |
| Velocità nastro | lenta | media | veloce |

Il nastro privilegia (90%) gli ingredienti che servono davvero ai clienti seduti.

## Fragoline
3 senza clienti persi, piatti sbagliati o tagliere buttato; 2 con al massimo un cliente perso e 2 sbavature; 1 oltre.

## Logica e test
`src/games/sushi-logic.js` è una macchina a stati pura (`newLevel`, `step(dt)`, `take`, `trash`, `serve`).
`tests/sushi.test.mjs` fa giocare un **bot cuoco** con 0,7 s di reazione per tocco: vince ogni livello 1–15 (5 partite per livello)
senza perdere clienti. Con 1,2 s per tocco vince ancora i livelli fino al 15 nelle prove di taratura.

## Musica
Brano `sushi`: koto e marimba a 118 bpm, festa di paese giapponese; gli strati entrano con i clienti serviti.

## Grafica (v0.6.1)
Locale giapponese disegnato in SVG (`BACKDROP`, `NOREN` in `sushi-ui.js`): tende noren che ondeggiano, lanterne con alone, finestra tonda
con ramo di sakura, targhette del menu. Clienti 64×80 con spalle in kimono, ombra "cel" piatta sulla testa, occhioni con due riflessi che
sbattono, guanciotte con trattini; da arrabbiati compaiono sopracciglia, broncio e goccia di sudore. Cibo con ombra piatta e riflessi
bianchi; piattini del nastro con bordo colorato (rosa, azzurro, oro). Tutti i colori sono token `--su-*` (tema chiaro e scuro).

## Stile "film d'animazione anni '90" (v0.7)
Scelto tra le proposte in `design/proposte-anime.html` (n. 2). Due strati come nei veri rodovetri:
- **Fondale dipinto** (`BACKDROP`): niente contorni, bordi irregolari da acquerello col filtro SVG `suPaint` (turbolenza + spostamento),
  applicato solo agli elementi fermi; finestra tonda con vista serale (tetti, finestre accese, luna), pozze di luce delle lanterne.
  Sopra tutto il locale un velo statico di grana della carta (`.su-grain`) e una luce calda (`.su-shop::after`).
- **Personaggi cel**: contorni sottili (`o()` × 0,72), una sola ombra netta sulla testa, occhi piccoli con un riflesso, sopracciglia sottili.
- Vapore che sale dal tagliere, fumetti color carta. Tema scuro = sera con le lanterne più calde.

## Nastro e varietà (v0.8.1)
- 4 posti per giro (`BELT_SLOTS`): su un telefono da 360 px restano 25–40 px tra un piattino e l'altro, comodi per un dito adulto.
- Per non far mancare ingredienti il nastro è più veloce (`0,14 + 0,0075·L` giri/s), il 90% dei piattini porta un ingrediente che serve
  e i clienti sono più pazienti (`max(26, 54 − 2,2·L)` s).
- Ricette: 4 al livello 1 (onigiri, sake, maguro, ebi: tutte da 2 ingredienti), poi una nuova ogni 2 livelli.
- Verificato dal bot dei test: vince i livelli 1–15 senza perdere clienti.
