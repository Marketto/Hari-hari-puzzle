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
| Piatto | Ingredienti |
|---|---|
| Onigiri | riso, alga |
| Nigiri al salmone | riso, salmone |
| Kappa maki | alga, riso, cetriolo |
| Nigiri al tonno | riso, tonno |
| Tamago | riso, uovo, alga |
| Ebi | riso, gambero |
| Sake maki | alga, riso, salmone |
| California | alga, riso, avocado, cetriolo |
| Temaki | alga, riso, tonno, avocado |

Clienti: coniglietto, gatto, panda, rana, volpe, orsetto, pulcino, pinguino (mai due uguali al bancone).

## Difficoltà (`config(level)`)
| | Livello 1 | Livello 10 | Livello 15 |
|---|---|---|---|
| Clienti da servire | 5 | 14 | 14 |
| Posti al bancone | 2 | 3 | 3 |
| Ricette | 2 | 9 | 9 |
| Pazienza | 44 s | 24 s | 18 s |
| Velocità nastro | lenta | media | veloce |

Il nastro privilegia (70%) gli ingredienti che servono davvero ai clienti seduti.

## Fragoline
3 senza clienti persi, piatti sbagliati o tagliere buttato; 2 con al massimo un cliente perso e 2 sbavature; 1 oltre.

## Logica e test
`src/games/sushi-logic.js` è una macchina a stati pura (`newLevel`, `step(dt)`, `take`, `trash`, `serve`).
`tests/sushi.test.mjs` fa giocare un **bot cuoco** con 0,7 s di reazione per tocco: vince ogni livello 1–15 (5 partite per livello)
senza perdere clienti. Con 1,2 s per tocco vince ancora i livelli fino al 15 nelle prove di taratura.

## Musica
Brano `sushi`: koto e marimba a 118 bpm, festa di paese giapponese; gli strati entrano con i clienti serviti.
