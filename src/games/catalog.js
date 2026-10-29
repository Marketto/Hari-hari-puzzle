/* Catalogo dei giochi: l'unico file dei giochi caricato all'avvio (con cards.js, le illustrazioni delle card).
 * Ogni gioco è un modulo scaricato in lazy load solo quando lo si apre: HH.loadGame(id) inserisce in ordine
 * i suoi CSS e script classici (logic prima di ui); il gioco si registra come sempre con HH.games.push({...}).
 * Il service worker legge questo file (importScripts) per sapere quali file mettere in cache quando servono.
 * `since` = versione in cui il gioco è arrivato (per l'avviso "nuovi giochi" dopo un aggiornamento).
 * Ordine = ordine delle card in home. Nuovo gioco: aggiungi la voce qui e poi `npm run cards`.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const f = (...names) => names.map((n) => 'src/games/' + n);
  HH.catalog = [
    { id: 'hedgedoku', name: 'Hedgedoku', rules: 'r1', files: f('hedgedoku.css', 'hedgedoku-logic.js', 'hog-kit.js', 'hedgedoku-ui.js') },
    { id: 'boba', name: 'Boba Sort', rules: 'r2', files: f('boba-logic.js', 'boba-ui.js') },
    { id: 'lantern', name: 'Lantern Glow', rules: 'r3', plate: 'night', files: f('lantern-logic.js', 'lantern-ui.js') },
    { id: 'sushi', name: 'Sushi Bar', rules: 'r4', files: f('sushi.css', 'sushi-logic.js', 'sushi-ui.js') },
    { id: 'fixit', name: 'Fix-It House', rules: 'r5', files: f('fixit.css', 'fixit-scene-kitchen.css', 'fixit-scene-bedroom.css', 'fixit-scene-bathroom.css', 'fixit-scene-garden.css',
      'fixit-logic.js', 'fixit-kit.js', 'fixit-scene-house.js', 'fixit-scene-kitchen.js', 'fixit-scene-bedroom.js', 'fixit-scene-bathroom.js', 'fixit-scene-garden.js', 'fixit-ui.js') },
    { id: 'parade', name: 'Hari Parade', rules: 'r6', files: f('parade.css', 'parade-logic.js', 'parade-ui.js') },
    { id: 'binary', name: 'Mochi Binary', rules: 'r8', files: f('binary.css', 'binary-logic.js', 'binary-ui.js') },
    { id: 'pixel', name: 'Pixel Mochi', rules: 'r7', files: f('pixel.css', 'pixel-logic.js', 'pixel-ui.js') },
    { id: 'yarn', name: 'Yarn Link', rules: 'r9', files: f('yarn.css', 'yarn-logic.js', 'yarn-ui.js') },
    { id: 'ropes', name: 'Hari Knots', rules: 'r10c', files: f('ropes.css', 'ropes-logic.js', 'ropes-ui.js') },
    { id: 'snack', name: 'Hari Snack Rush', since: '0.10.0', rules: 'r11', files: f('snack.css', 'snack-logic.js', 'snack-ui.js') },
    // multigiocatore (contratto HH.mp, docs/multiplayer.md): i file condivisi di src/net prima della UI
    { id: 'street', name: 'Hari Snack Street', since: '0.21.0', rules: 'r20',
      rulesEn: 'Side-scrolling street adventure with Hari and Kiki the squirrel: hungry animals block the way and you "fight" by feeding them! Tap close up, toss from afar, jump, grab a dizzy one for a whole basket and charge a special. Every animal has its own trick, and at the end a big eater rolls melons. Play alone, with a CPU friend or with two players.',
      files: [...f('street.css', 'street-logic.js', 'street-art.js'), 'src/net/sonic.js', 'src/net/qr.js', 'src/net/mp.js', 'src/net/mp-ui.js', 'src/net/mp.css', ...f('street-ui.js')] },
    { id: 'drive', name: 'Hari Taxi', since: '0.14.0', rules: 'r13',
      rulesEn: 'Drive Hari around the city seen from above: pick up passengers with the taxi, deliver hot food by scooter and parcels by van before time runs out. Every bump into a car or an animal crossing the street costs a heart!',
      files: f('drive.css', 'drive-logic.js', 'drive-ui.js') },
    { id: 'spot', name: 'Hari Spot', since: '0.16.0', rules: 'r16',
      rulesEn: 'Two pictures of the city or the forest, almost the same: find every difference! Tap it on either picture to circle it. The magnifier shows where to look, but costs a strawberry; random taps cost a little time.',
      files: f('spot.css', 'spot-logic.js', 'spot-art.js', 'spot-ui.js') },
    { id: 'flight', name: 'Hari Airlines', since: '0.18.0', rules: 'r17',
      rulesEn: 'Hari is the flight attendant! Count the passengers at boarding, stow the bags in the overhead bins, make sure every seatbelt is fastened, cook for the captain and heat the meals, serve what everyone asks for and collect the rubbish before landing.',
      files: f('flight.css', 'flight-logic.js', 'flight-art.js', 'flight-ui.js') },
    { id: 'sudoku', name: 'Hari Sudoku', since: '0.19.0', rules: 'r19',
      rulesEn: 'Classic sudoku with numbers: fill the 9×9 grid so that every row, every column and every 3×3 box holds 1 to 9 exactly once. Use the pencil for notes, the bulb when you are stuck, and listen to Hari: he cheers you on at every move! A wrong number costs a heart.',
      // hedgedoku.css + hog-kit.js: il riccio animato e le sue espressioni sono gli stessi di Hedgedoku
      files: f('hedgedoku.css', 'sudoku.css', 'hog-kit.js', 'sudoku-logic.js', 'sudoku-ui.js') },
    { id: 'escape', name: 'Hari Escape', since: '0.19.0', rules: 'r18',
      rulesEn: 'Hari is locked in a cute house, castle, ship or lab: help him escape! Look around, find hidden objects, combine them and solve the puzzles with the clues in the rooms to open every door. The light bulb gives a hint, but costs strawberries.',
      files: f('escape.css', 'escape-logic.js', 'escape-art.js', 'dom-patch.js', 'escape-ui.js') },
    { id: 'life', name: 'Hari Home', since: '0.12.0', rules: 'r12', endless: true,
      rulesEn: 'Hari’s life sim: start in a shabby studio with a few acorns. Fix it up and furnish it, start a business, go shopping, see the doctor, play sports and invite friends. Keep Hari happy, healthy and rested as he grows up, all the way to grandpa!',
      files: f('life.css', 'life-data.js', 'life-logic.js', 'life-art.js', 'life-draw.js', 'life-ui.js') },
    // three.js (src/vendor, ~650 KB) è solo tra i file di questo gioco: si scarica e va in cache offline solo aprendo il rally
    { id: 'rally', name: 'Hari Rally', since: '0.17.0', rules: 'r14',
      rulesEn: 'Kart rally through forests, cities, seaside and snow, by day and by night, with Hari in his strawberry kart: accelerate, brake and steer (automatic speed is an option). Follow the pace notes (6 = fast bend, 1 = hairpin), brake before tight bends or you slide onto the grass, hold a drift for a mini boost, grab surprise gifts for silly power-ups and finish in the top 3 against Bunny, Fox and Panda.',
      files: [...f('rally.css'), 'src/vendor/three.min.js', ...f('rally-logic.js', 'rally-ui.js')] },
    { id: 'memory', name: 'Hari Memory', since: '0.15.0', rules: 'r15',
      rulesEn: 'Turn over two cards at a time and find the pairs: forest animals, nuts, berries, trees and leaves. Remember where each picture hides: fewer moves, more strawberries!',
      files: f('memory.css', 'memory-logic.js', 'memory-art.js', 'memory-ui.js') },
  ];

  /* ---------- caricamento in lazy load ---------- */
  const loading = {};
  HH.gameMeta = (id) => HH.catalog.find((c) => c.id === id);
  HH.gameLoaded = (id) => (HH.games || []).find((g) => g.id === id);
  function addFile(src) {
    return new Promise((resolve, reject) => {
      const d = G.document;
      const el = src.endsWith('.css') ? Object.assign(d.createElement('link'), { rel: 'stylesheet', href: src }) : Object.assign(d.createElement('script'), { src, async: false });
      el.onload = () => resolve();
      el.onerror = () => { el.remove(); reject(new Error('load ' + src)); };
      (src.endsWith('.css') ? d.head : d.body).appendChild(el);
    });
  }
  // scarica (o prende dalla cache offline) i file del gioco nell'ordine del catalogo → Promise con la voce di HH.games
  HH.loadGame = function (id) {
    const ready = HH.gameLoaded(id);
    if (ready) return Promise.resolve(ready);
    if (loading[id]) return loading[id];
    const meta = HH.gameMeta(id);
    if (!meta) return Promise.reject(new Error('unknown game ' + id));
    const css = meta.files.filter((x) => x.endsWith('.css')), js = meta.files.filter((x) => !x.endsWith('.css'));
    loading[id] = Promise.all(css.map(addFile))
      .then(() => js.reduce((p, f) => p.then(() => addFile(f)), Promise.resolve()))
      .then(() => { const g = HH.gameLoaded(id); if (!g) throw new Error('game not registered ' + id); return g; })
      .finally(() => { delete loading[id]; });
    return loading[id];
  };
  // il gioco è già disponibile offline? (file nella cache del service worker o già caricato)
  HH.gameOffline = function (id) {
    if (HH.gameLoaded(id)) return Promise.resolve(true);
    const meta = HH.gameMeta(id);
    if (!meta || !G.caches) return Promise.resolve(false);
    return Promise.all(meta.files.map((f) => G.caches.match(f, { ignoreSearch: true }))).then((r) => r.every(Boolean)).catch(() => false);
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
