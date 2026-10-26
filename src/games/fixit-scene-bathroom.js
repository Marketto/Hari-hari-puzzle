/* Fix-It House — scenario "bathroom" (in costruzione: verrà sostituito dal disegno completo). */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const house = HH.fixitScenes.house;
  const ids = HH.fixit.SCENES.bathroom.map((p) => p.id);
  const spots = {};
  ids.forEach((id, i) => { spots[id] = [20 + (i % 4) * 92, 70 + Math.floor(i / 4) * 80, 80, 66]; });
  HH.fixitScenes.bathroom = {
    id: 'bathroom', name: ['fis_bathroom', 'bathroom'], probs: Object.fromEntries(ids.map((id) => [id, ['fip_bathroom_' + id, id]])),
    spots, layers: [], draw: {}, flags: () => ({}), base: house.base, front: () => '', back: () => '',
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
