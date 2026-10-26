/* Fix-It House — scenario "bedroom" (in costruzione: verrà sostituito dal disegno completo). */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const house = HH.fixitScenes.house;
  const ids = HH.fixit.SCENES.bedroom.map((p) => p.id);
  const spots = {};
  ids.forEach((id, i) => { spots[id] = [20 + (i % 4) * 92, 70 + Math.floor(i / 4) * 80, 80, 66]; });
  HH.fixitScenes.bedroom = {
    id: 'bedroom', name: ['fis_bedroom', 'bedroom'], probs: Object.fromEntries(ids.map((id) => [id, ['fip_bedroom_' + id, id]])),
    spots, layers: [], draw: {}, flags: () => ({}), base: house.base, front: () => '', back: () => '',
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
