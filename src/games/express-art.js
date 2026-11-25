/* Hari Express — testi di riserva (inglese), icone SVG (strumenti, merci con forma propria, mezzi, industrie),
 * illustrazione della card, tutorial illustrato. Solo token CSS (--exp-* e del nucleo). Si carica prima di express-ui.js.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const label = (k, en) => { const v = HH.i18n && HH.i18n.t ? HH.i18n.t(k) : k; return v && v !== k ? v : en; };
  const EN = {
    ex_board: 'Hari Express: build roads and tracks, carry goods between villages',
    ex_t_rail: 'Tracks', ex_t_road: 'Roads', ex_t_stop: 'Stops', ex_t_water: 'Water', ex_t_air: 'Air', ex_t_demolish: 'Demolish', ex_t_info: 'Info',
    ex_s_track: 'Track', ex_s_signal: 'Signal', ex_s_oneway: 'One-way', ex_s_station: 'Train station', ex_s_busstop: 'Bus and truck stop',
    ex_h_rail: 'Drag from a station to where you want to go', ex_h_road: 'Drag between villages, farms and factories',
    ex_h_station: 'Tap or drag along a straight line (up to 5 tiles)', ex_h_stop: 'Tap a straight road or an empty tile',
    ex_h_signal: 'Tap a straight track to add or remove a signal', ex_h_oneway: 'Tap a straight track: one way, the other way, off',
    ex_h_demolish: 'Tap or drag over what you want to remove', ex_h_info: 'Tap a station, a vehicle, a village or a factory',
    ex_h_locked: 'Ships and airships arrive in the next update!', ex_h_pick: 'Tap the stations on the map in order, then Done',
    ex_preview: 'Preview', ex_tiles: '{n} tiles', ex_upkeep: 'Upkeep {n} a year', ex_build: 'Build', ex_done: 'Done',
    ex_err_money: 'Not enough acorns', ex_err_noroute: 'No way through here', ex_err_blocked: 'You can’t build here', ex_err_busy: 'A vehicle is in the way',
    ex_err_axis: 'Stations go on straight track', ex_err_slope: 'Stations need flat ground', ex_err_town: 'Village roads can’t be removed',
    ex_err_orders: 'Pick at least two stops', ex_err_line: 'Drag in a straight line', ex_err_empty: 'Nothing to remove here', ex_err_size: 'Up to 5 tiles',
    ex_speed: 'Speed: tap to change', ex_goal: 'Goal', ex_left: '{d} days left', ex_rotate: 'Rotate the view', ex_view: 'Free view or isometric view',
    ex_accounts: 'Accounts and goals', ex_zoomin: 'Zoom in', ex_zoomout: 'Zoom out', ex_year: 'year {n}', ex_modes: 'Modes',
    ex_g_del_to: 'Bring {n} {cargo} to {place}', ex_g_del: 'Carry {n} {cargo}', ex_g_train: 'Trains running: {n}', ex_g_pop: '{town}: {n} inhabitants',
    ex_k_pax: 'passengers', ex_k_mail: 'mail', ex_k_milk: 'milk', ex_k_cheese: 'cheese', ex_k_grain: 'grain', ex_k_bread: 'bread', ex_k_wood: 'wood', ex_k_toys: 'toys',
    ex_i_farm: 'Farm', ex_i_dairy: 'Dairy', ex_i_field: 'Wheat field', ex_i_bakery: 'Bakery', ex_i_forest: 'Forest', ex_i_sawmill: 'Toy sawmill',
    ex_v_bus: 'Bus', ex_v_mail: 'Mail van', ex_v_truck: 'Truck', ex_v_steam: 'Steam', ex_v_electric: 'Electric', ex_v_from: 'From year {n}',
    ex_v_speed: '{n} tiles a day', ex_v_cap: '{n} {cargo}',
    ex_rail_station: 'Train station', ex_road_stop: 'Bus and truck stop', ex_rating: 'Rating', ex_waiting: 'Waiting', ex_nothing: 'Nothing waiting yet: a vehicle must stop here first',
    ex_accepts: 'Accepts', ex_passing: 'Vehicles stopping here', ex_lastv: 'Last vehicle {d} days ago', ex_novisit: 'No vehicle has stopped here yet',
    ex_profit: 'Profit this year', ex_lastyear: 'Last year', ex_sell: 'Sell', ex_route: 'Route', ex_load: 'On board',
    ex_st_go: 'Going to {st}', ex_st_load: 'Loading at {st}', ex_st_lost: 'Can’t find the way', ex_st_wait: 'Waiting for a free track',
    ex_newtrain: 'New train', ex_newroad: 'New bus or truck', ex_wagons: 'Wagons', ex_tapst: 'Tap the stations on the map in order', ex_addstop: 'Add a stop',
    ex_full: 'Wait until full', ex_trip: 'Round trip: about {d} days.', ex_total: 'Total', ex_buy: 'Buy and go', ex_cargo: 'Cargo', ex_remove: 'Remove',
    ex_inhab: '{n} inhabitants', ex_houses: '{n} houses', ex_growing: 'Growing: +{n} last month', ex_notgrow: 'Not growing yet: bring passengers and goods',
    ex_village: 'Village', ex_makes: 'Produces', ex_month: '{n} last month', ex_needs: 'Needs',
    ex_goals: 'Goals', ex_stars3: '3 strawberries if you finish within {d} days', ex_yearacc: 'This year’s accounts', ex_income: 'Deliveries', ex_running: 'Vehicle running costs',
    ex_mnt: 'Track and road upkeep', ex_building: 'Construction', ex_bought: 'Vehicles bought', ex_vlist: 'Your vehicles', ex_rivals: 'Rivals', ex_rivals_soon: 'Other transport companies arrive in the next update',
    ex_where: 'Where are we going today?', ex_where2: 'Connect the villages and make the towns grow.', ex_campaign: 'Campaign', ex_lvl: 'Level {n} · {title}',
    ex_freeplay: 'Free play', ex_free_desc: 'An endless map, no goals. Unlocks at level {n}.', ex_real: 'Real maps', ex_real_desc: 'From OpenStreetMap, the same as Hari Taxi.',
    ex_seed: 'Seed', ex_size: 'Size', ex_sz_s: 'Small', ex_sz_m: 'Medium', ex_sz_l: 'Large', ex_water: 'Water', ex_w0: 'None', ex_w1: 'A little', ex_w2: 'Lots', ex_create: 'Create the map',
    ex_l1: 'The first bus', ex_l2: 'The milk truck', ex_l3: 'The cheese chain', ex_l4: 'The first train', ex_l5: 'Two trains and signals', ex_lx: 'Challenge {n}',
    ex_c_road: 'Tap Roads and drag from one village to the other.', ex_c_stop: 'Now a stop in each village: tap Stops, then a straight road.',
    ex_c_bus: 'Tap a stop and buy a bus, then tap the other stop.', ex_c_run: 'On its way! Speed up time with ×2 or ×4.',
    ex_c_stop2: 'A stop next to the farm and one next to the dairy, then a road between them.', ex_c_truck: 'Tap the farm’s stop and buy a milk truck.',
    ex_c_full: 'Tip: “Wait until full” makes trucks leave fully loaded.', ex_c_chain: 'The dairy turns milk into cheese: bring it to town with another truck!',
    ex_c_bread: 'The bakery turns grain into bread: bring it to town with a truck!',
    ex_c_rail: 'Tap Tracks and drag from the field to the bakery.', ex_c_rail2: 'A station at each end: Stops, then Train station on the track.',
    ex_c_train: 'Tap a station and buy a train with grain wagons.', ex_c_loop: 'Build a loop: one track to the sawmill and another one back.',
    ex_c_oneway: 'Add one-way arrows so that every train goes round the same way.', ex_c_signal: 'Put signals along the loop: each stretch holds one train.',
    ex_c_train2: 'Now a second train: two trains carry twice the wood!', ex_c_grow: 'Bring toys to town by truck: well-served towns grow.',
    ex_c_free: 'Build freely: connect villages and industries and grow!', ex_c_stuck: 'A train is stuck: add signals, or one-way arrows on a loop.',
    ex_c_money: 'Out of acorns! Wait for the next deliveries.',
    ex_e_sold: 'Out of acorns: Hari sold {v}.', ex_e_grow: '{town} is growing!', ex_e_first: 'First delivery! +{n}', ex_e_late: 'Time is up!', ex_e_goal: 'Goal reached!',
    ex_paused: 'Paused: tap the speed to go on',
    ex_left_t: '{t} left', ex_stars3_t: '3 strawberries if you finish within {t}', ex_lastv_t: 'Last vehicle {t} ago', ex_trip_t: 'Round trip: about {t}.',
    ex_v_speed_h: '{n} tiles an hour', ex_v_from_d: 'From {date}', ex_growing_d: 'Growing: +{n} yesterday', ex_perday: '{n} a day', ex_upkeep_d: 'Upkeep {n} a day',
    ex_always_day: 'Always day', ex_sky_day: 'Day', ex_sky_sunset: 'Sunset', ex_sky_night: 'Night', ex_sky_dawn: 'Dawn',
    ex_editroute: 'Edit route', ex_apply: 'Apply', ex_o_at: 'At this stop', ex_o_both: 'Load and unload', ex_o_unload: 'Unload only', ex_o_load: 'Load only',
    ex_up: 'Move up', ex_down: 'Move down', ex_err_unreach: 'This vehicle can’t get from {a} to {b}', ex_err_dup: 'The same stop twice in a row',
    ex_bridge: 'Bridge', ex_tunnel: 'Tunnel', ex_go_around: 'Other way', ex_err_long_b: 'Bridge too long: at most {n} tiles of water',
    ex_err_long_t: 'Tunnel too long: at most {n} tiles', ex_err_bank: 'The two banks aren’t at the same height', ex_err_portal: 'A tunnel must come out at the same height it goes in',
    ex_err_tunnel: 'No signals inside a tunnel', ex_c_tunnel: 'A hill in the way? Drag straight across it: Hari suggests a tunnel. Across water, a bridge!',
    ex_expand: 'Expand station', ex_st_grow: 'Expand {st} · {n}', ex_h_expand: 'Tap the green tiles: new platform or longer station · {n} per tile',
    ex_plat: 'Station platform · {n}', ex_err_stmax: 'At most {a} platforms and {b} tiles long', ex_err_far: 'This tile doesn’t touch the station',
    ex_expand_none: 'No room: clear the tiles next to the station', ex_st_size: '{p} platforms × {n} tiles',
    // già tradotte (comuni e altri giochi)
    ry_nogl: 'This game needs 3D graphics (WebGL).', soon: 'Coming soon', play: 'Play', er_close: 'Close', lf_cancel: 'Cancel', level: 'Level', pa_pause: 'Pause', resume: 'Continue',
  };
  const L = (k, o) => { let v = label(k, EN[k] || k); if (o) for (const p in o) v = v.split('{' + p + '}').join(o[p]); return v; };

  /* ---------- icone ---------- */
  const o = (w = 1.6) => `stroke="var(--exp-ink)" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const ln = (d, w = 2) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const svg = (inner, vb = '0 0 24 24') => `<svg viewBox="${vb}" aria-hidden="true">${inner}</svg>`;
  const IC = {
    rail: svg(ln('M7 3 L5 21 M17 3 L19 21 M6.5 7 H17.5 M6 12 H18 M5.5 17 H18.5')),
    road: svg(ln('M8 3 L5 21 M16 3 L19 21 M12 4 V7 M12 10.5 V13.5 M12 17 V20')),
    stop: svg(ln('M6 21 V5 M6 5 H15 L13 8 L15 11 H6 M14 21 V15 H20 V21 M17 15 V13')),
    water: svg(ln('M3 14 H21 L18 19 H6 Z M8 14 V9 H15 V14 M3 22 Q7 20 12 22 T21 22')),
    air: svg('<ellipse cx="13" cy="9" rx="8" ry="4.5" fill="none" stroke="currentColor" stroke-width="2"/>' + ln('M5 9 L2 6 V12 Z M10 16 H16 M11 13.5 V16 M15 13.5 V16')),
    demolish: svg(ln('M4 20 L10 14 M8 10 L14 16 L20 10 L14 4 Z')),
    info: svg('<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>' + ln('M12 11 V17 M12 7.5 V8')),
    lock: svg(`<rect x="5" y="11" width="14" height="10" rx="3" fill="var(--exp-lock)"/>` + ln('M8 11 V8 A4 4 0 0 1 16 8 V11', 2.4)),
    rotate: svg(ln('M20 12 a8 8 0 1 1 -3 -6.2 M20 4 V9 H15', 2.2)),
    view: svg(ln('M12 3 L20 7.5 V16.5 L12 21 L4 16.5 V7.5 Z M12 12 L20 7.5 M12 12 L4 7.5 M12 12 V21', 2)),
    chart: svg(ln('M5 20 V12 M10 20 V6 M15 20 V14 M20 20 V9', 2.2)),
    plus: svg(ln('M12 5 V19 M5 12 H19', 2.4)), minus: svg(ln('M5 12 H19', 2.4)),
    signal: svg(`<rect x="8" y="2" width="8" height="13" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="6" r="1.8" fill="currentColor"/><circle cx="12" cy="11" r="1.8" fill="currentColor"/>` + ln('M12 15 V22 M8 22 H16')),
    // ora del giorno della scena (indicatore accanto alla data)
    sky_day: svg('<circle cx="12" cy="12" r="4.6" fill="var(--sun)" stroke="currentColor" stroke-width="1.8"/>' + ln('M12 2.5 V4.5 M12 19.5 V21.5 M2.5 12 H4.5 M19.5 12 H21.5 M5.3 5.3 L6.7 6.7 M17.3 17.3 L18.7 18.7 M5.3 18.7 L6.7 17.3 M17.3 6.7 L18.7 5.3', 1.8)),
    sky_sunset: svg('<path d="M6.5 16 A5.5 5.5 0 0 1 17.5 16 Z" fill="var(--sun)" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' + ln('M3 16 H21 M6 20 H18 M12 4 V8 M9.5 6 L12 8.5 L14.5 6', 1.8)),
    sky_dawn: svg('<path d="M6.5 16 A5.5 5.5 0 0 1 17.5 16 Z" fill="var(--sun)" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' + ln('M3 16 H21 M6 20 H18 M12 8.5 V4.5 M9.5 7 L12 4.5 L14.5 7', 1.8)),
    sky_night: svg('<path d="M15.5 3.5 A8.5 8.5 0 1 0 20.5 15 A7 7 0 0 1 15.5 3.5 Z" fill="var(--exp-moon)" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' + ln('M18 5 V7 M17 6 H19', 1.4)),
    oneway: svg(ln('M3 12 H19 M14 6 L20 12 L14 18', 2.4)),
    station: svg(ln('M3 20 H21 M5 20 V11 M19 20 V11 M3 11 L12 4 L21 11 Z M9 20 V15 H15 V20')),
    check: svg(ln('M5 12 L10 17 L19 7', 2.6)), close: svg(ln('M6 6 L18 18 M18 6 L6 18', 2.4)),
    up: svg(ln('M12 19 V5 M6 11 L12 5 L18 11', 2.4)), down: svg(ln('M12 5 V19 M6 13 L12 19 L18 13', 2.4)),
    edit: svg(ln('M4 20 L5 15 L16 4 L20 8 L9 19 Z M14 6 L18 10', 2.2)), swap: svg(ln('M4 8 H18 M14 4 L18 8 L14 12 M20 16 H6 M10 12 L6 16 L10 20', 2.2)),
    dice: svg(`<rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="9" r="1.5" fill="currentColor"/><circle cx="15" cy="15" r="1.5" fill="currentColor"/><circle cx="15" cy="9" r="1.5" fill="currentColor"/><circle cx="9" cy="15" r="1.5" fill="currentColor"/>`),
    play: svg('<path d="M8 5 L19 12 L8 19 Z" fill="currentColor"/>'), pause: svg('<rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor"/>'),
    acorn: `<svg viewBox="0 0 18 20" aria-hidden="true"><path d="M2 8 Q9 1 16 8 Z" fill="var(--acorn-cap)"/><ellipse cx="9" cy="12" rx="6" ry="7" fill="var(--acorn)"/></svg>`,
    flag: svg(ln('M6 21 V4 M6 4 H18 L15 8 L18 12 H6')),
    house: svg(ln('M4 11 L12 4 L20 11 V20 H4 Z M10 20 V15 H14 V20')),
  };
  const acorn = IC.acorn;

  /* ---------- merci: icona con forma propria (non solo colore) ---------- */
  const CI = {
    pax: `<circle cx="12" cy="8" r="4" fill="var(--exp-c-pax)" ${o()}/><path d="M5 21 Q5 13 12 13 Q19 13 19 21 Z" fill="var(--exp-c-pax)" ${o()}/>`,
    mail: `<rect x="3" y="6" width="18" height="13" rx="2" fill="var(--exp-c-mail)" ${o()}/><path d="M3 7 L12 14 L21 7" fill="none" ${o()}/>`,
    milk: `<path d="M8 3 H16 V6 L18 9 V21 H6 V9 L8 6 Z" fill="var(--exp-c-milk)" ${o()}/><path d="M6 13 H18" ${o()}/><circle cx="12" cy="17" r="1.6" fill="var(--exp-ink)"/>`,
    cheese: `<path d="M3 17 L21 8 V18 Q21 20 19 20 H5 Q3 20 3 18 Z" fill="var(--exp-c-cheese)" ${o()}/><circle cx="10" cy="16" r="1.5" fill="var(--exp-ink)" opacity=".5"/><circle cx="16" cy="14" r="1.2" fill="var(--exp-ink)" opacity=".5"/>`,
    grain: `<path d="M12 21 V8" ${o()}/><ellipse cx="9" cy="10" rx="2" ry="3.4" transform="rotate(-25 9 10)" fill="var(--exp-c-grain)" ${o(1.3)}/><ellipse cx="15" cy="10" rx="2" ry="3.4" transform="rotate(25 15 10)" fill="var(--exp-c-grain)" ${o(1.3)}/><ellipse cx="9" cy="15" rx="2" ry="3.4" transform="rotate(-25 9 15)" fill="var(--exp-c-grain)" ${o(1.3)}/><ellipse cx="15" cy="15" rx="2" ry="3.4" transform="rotate(25 15 15)" fill="var(--exp-c-grain)" ${o(1.3)}/><ellipse cx="12" cy="5" rx="2" ry="3" fill="var(--exp-c-grain)" ${o(1.3)}/>`,
    bread: `<path d="M3 15 Q3 7 12 7 Q21 7 21 15 Q21 19 17 19 H7 Q3 19 3 15 Z" fill="var(--exp-c-bread)" ${o()}/><path d="M8 10 L10 13 M12 9.5 L14 12.5 M16 10 L17.5 12.5" ${o(1.3)}/>`,
    wood: `<rect x="3" y="12" width="15" height="7" rx="3.5" fill="var(--exp-c-wood)" ${o()}/><ellipse cx="18" cy="15.5" rx="3" ry="3.5" fill="var(--exp-c-wood)" ${o()}/><rect x="5" y="5" width="13" height="7" rx="3.5" fill="var(--exp-c-wood)" ${o()}/><ellipse cx="18" cy="8.5" rx="3" ry="3.5" fill="var(--exp-c-wood)" ${o()}/>`,
    toys: `<rect x="3" y="11" width="9" height="9" rx="2" fill="var(--exp-c-toys)" ${o()}/><path d="M13 20 L17.5 11 L22 20 Z" fill="var(--exp-toy-3)" ${o()}/><circle cx="12" cy="6" r="4" fill="var(--exp-toy-1)" ${o()}/>`,
  };
  const cargoIc = (c) => svg(CI[c] || '');

  /* ---------- mezzi (di lato, faccina sulla cabina) ---------- */
  const face = (x, y, k = 1) => `<circle cx="${x - 2.2 * k}" cy="${y}" r="${1.1 * k}" fill="var(--exp-eye)"/><circle cx="${x + 2.2 * k}" cy="${y}" r="${1.1 * k}" fill="var(--exp-eye)"/><ellipse cx="${x - 3.6 * k}" cy="${y + 2 * k}" rx="${1.2 * k}" ry="${0.7 * k}" fill="var(--exp-blush)"/><ellipse cx="${x + 3.6 * k}" cy="${y + 2 * k}" rx="${1.2 * k}" ry="${0.7 * k}" fill="var(--exp-blush)"/><path d="M${x - 1} ${y + 1.6 * k} Q${x} ${y + 2.6 * k} ${x + 1} ${y + 1.6 * k}" fill="none" stroke="var(--exp-eye)" stroke-width=".8"/>`;
  const VI = {
    bus: `<rect x="3" y="8" width="34" height="16" rx="7" fill="var(--exp-bus)" ${o()}/><rect x="13" y="11" width="6" height="5" rx="2" fill="var(--exp-glass)" ${o(1)}/><rect x="21" y="11" width="6" height="5" rx="2" fill="var(--exp-glass)" ${o(1)}/><rect x="29" y="11" width="5" height="5" rx="2" fill="var(--exp-glass)" ${o(1)}/>${face(8, 15)}<circle cx="10" cy="25" r="3" fill="var(--exp-base)" ${o(1)}/><circle cx="30" cy="25" r="3" fill="var(--exp-base)" ${o(1)}/>`,
    mail: `<rect x="3" y="9" width="30" height="15" rx="6" fill="var(--exp-mail)" ${o()}/><rect x="16" y="12" width="12" height="8" rx="1.5" fill="var(--exp-face)" ${o(1)}/><path d="M16 12.5 L22 17 L28 12.5" fill="none" ${o(1)}/>${face(9, 15)}<circle cx="10" cy="25" r="3" fill="var(--exp-base)" ${o(1)}/><circle cx="27" cy="25" r="3" fill="var(--exp-base)" ${o(1)}/>`,
    truck: `<rect x="3" y="9" width="12" height="15" rx="5" fill="var(--exp-truck)" ${o()}/>${face(9, 15)}<rect x="16" y="14" width="21" height="9" rx="2" fill="var(--exp-wagon)" ${o()}/><circle cx="9" cy="25" r="3" fill="var(--exp-base)" ${o(1)}/><circle cx="31" cy="25" r="3" fill="var(--exp-base)" ${o(1)}/>`,
    castagna: `<rect x="3" y="11" width="22" height="12" rx="5" fill="var(--exp-loco)" ${o()}/><rect x="23" y="6" width="13" height="17" rx="4" fill="var(--exp-loco)" ${o()}/><rect x="8" y="4" width="5" height="8" rx="1.5" fill="var(--exp-loco-2)" ${o(1)}/><circle cx="10.5" cy="2.5" r="2" fill="var(--exp-steam)" ${o(1)}/>${face(29.5, 13)}<circle cx="9" cy="25" r="3" fill="var(--exp-base)" ${o(1)}/><circle cx="19" cy="25" r="3" fill="var(--exp-base)" ${o(1)}/><circle cx="30" cy="25" r="3" fill="var(--exp-base)" ${o(1)}/>`,
    fragola: `<rect x="3" y="9" width="33" height="14" rx="7" fill="var(--exp-toy-1)" ${o()}/><path d="M10 9 L13 4 H26 L29 9" fill="none" ${o()}/><circle cx="16" cy="14" r="1" fill="var(--exp-face)"/><circle cx="21" cy="17" r="1" fill="var(--exp-face)"/>${face(30, 15)}<circle cx="10" cy="25" r="3" fill="var(--exp-base)" ${o(1)}/><circle cx="29" cy="25" r="3" fill="var(--exp-base)" ${o(1)}/>`,
  };
  const vehIc = (t) => `<svg viewBox="0 0 40 30" aria-hidden="true">${VI[t] || VI.truck}</svg>`;

  /* ---------- industrie e villaggi ---------- */
  const II = {
    farm: `<path d="M3 21 V11 L10 5 L17 11 V21 Z" fill="var(--exp-barn)" ${o()}/><path d="M7 21 V15 H13 V21" fill="var(--exp-barn-2)" ${o()}/><rect x="17" y="8" width="5" height="13" rx="2.5" fill="var(--exp-silo)" ${o()}/>`,
    dairy: `<rect x="3" y="10" width="15" height="11" rx="2" fill="var(--exp-dairy)" ${o()}/><path d="M9 9 L20 4 V9 Z" fill="var(--exp-cheese)" ${o()}/><rect x="18" y="13" width="4" height="8" rx="2" fill="var(--exp-milk, var(--exp-c-milk))" ${o()}/>`,
    field: `<path d="M2 20 L6 9 H18 L22 20 Z" fill="var(--exp-field)" ${o()}/><path d="M8 11 L6 19 M12 11 V19 M16 11 L18 19" ${o(1.2)}/>`,
    bakery: `<rect x="3" y="10" width="16" height="11" rx="2" fill="var(--exp-bakery)" ${o()}/><path d="M4 9 Q4 4 11 4 Q18 4 18 9 Z" fill="var(--exp-bread)" ${o()}/><rect x="17" y="3" width="3" height="7" fill="var(--exp-loco-2)" ${o(1)}/>`,
    forest: `<path d="M8 3 L13 12 H3 Z M8 8 L14 17 H2 Z" fill="var(--exp-conifer)" ${o()}/><path d="M17 6 L21 13 H13 Z M17 10 L22 18 H12 Z" fill="var(--exp-conifer)" ${o()}/><path d="M8 17 V21 M17 18 V21" ${o()}/>`,
    sawmill: `<rect x="3" y="10" width="13" height="11" rx="2" fill="var(--exp-log)" ${o()}/><path d="M2 10 L9.5 4 L17 10 Z" fill="var(--exp-toy-1)" ${o()}/><circle cx="19" cy="15" r="4" fill="var(--exp-saw)" ${o()}/><rect x="6" y="14" width="5" height="5" rx="1" fill="var(--exp-toy-2)" ${o(1)}/>`,
    town: `<path d="M3 21 V12 H11 V21 Z" fill="var(--exp-house-bunny)" ${o()}/><path d="M2 12 L7 5 L12 12 Z" fill="var(--exp-roof-bunny)" ${o()}/><path d="M12 21 V14 H21 V21 Z" fill="var(--exp-house-cat)" ${o()}/><path d="M11 14 L16.5 7 L22 14 Z" fill="var(--exp-roof-cat)" ${o()}/>`,
    station: `<path d="M3 21 H21" ${o()}/><rect x="4" y="12" width="16" height="9" fill="var(--exp-platform)" ${o()}/><path d="M2 12 L12 5 L22 12 Z" fill="var(--exp-canopy)" ${o()}/>`,
    stop: `<path d="M7 21 V5" ${o()}/><rect x="3" y="3" width="9" height="7" rx="2" fill="var(--exp-sign)" ${o()}/><rect x="12" y="12" width="9" height="9" rx="2" fill="var(--exp-stop)" ${o()}/>`,
  };
  const indIc = (t) => svg(II[t] || '');

  /* ---------- card della home (120×90): pezzo di campagna isometrica ---------- */
  function art() {
    const tile = (x, y, f) => `<path d="M${x} ${y} l14 7 l-14 7 l-14 -7 Z" fill="${f}" stroke="var(--exp-ink)" stroke-width=".5" stroke-opacity=".25"/>`;
    let g = '';
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
      const x = 60 + (c - r) * 14, y = 18 + (c + r) * 7;
      const water = (c === 5 && r < 3) || (c === 4 && r === 0);
      g += tile(x, y, water ? 'var(--exp-water)' : (c + r) % 2 ? 'var(--exp-grass)' : 'var(--exp-grass-2)');
    }
    const rail = `<path d="M18 52 L74 80" stroke="var(--exp-ballast)" stroke-width="7" stroke-linecap="round"/><path d="M18 50 L74 78 M18 54 L74 82" stroke="var(--exp-rail)" stroke-width="1.2"/>`;
    const house = (x, y, w, r) => `<path d="M${x - 7} ${y} v-8 l7 -3.5 l7 3.5 v8 l-7 3.5 Z" fill="var(--exp-house-${w})" ${o(1)}/><path d="M${x - 8} ${y - 8} L${x} ${y - 20} L${x + 8} ${y - 8} L${x} ${y - 4} Z" fill="var(--exp-roof-${w})" ${o(1)}/><path d="M${x - 3} ${y - 15} l-1.5 -5 l3 2.5 Z M${x + 3} ${y - 15} l1.5 -5 l-3 2.5 Z" fill="var(--exp-roof-${w})" ${o(.8)}/>`;
    const tree = (x, y, r, c) => `<path d="M${x} ${y} v-${r}" stroke="var(--exp-trunk)" stroke-width="2"/><circle cx="${x}" cy="${y - r - 3}" r="${r}" fill="var(${c})" ${o(1)}/><circle cx="${x - r * 0.35}" cy="${y - r - 4.5}" r="${r * 0.3}" fill="var(--exp-foam)" opacity=".35"/>`;
    const train = `<g transform="rotate(26.5 46 66)"><rect x="24" y="58" width="16" height="9" rx="4" fill="var(--exp-wagon)" ${o(1)}/><rect x="42" y="56" width="22" height="11" rx="5" fill="var(--exp-loco)" ${o(1)}/><rect x="46" y="50" width="4" height="7" rx="1" fill="var(--exp-loco-2)" ${o(.8)}/>${face(57, 61, 0.8)}<circle cx="28" cy="56" r="3" fill="var(--exp-c-wood)" ${o(.8)}/><circle cx="35" cy="56" r="3" fill="var(--exp-c-wood)" ${o(.8)}/></g><circle cx="44" cy="42" r="4" fill="var(--exp-steam)" opacity=".9"/><circle cx="40" cy="36" r="3" fill="var(--exp-steam)" opacity=".7"/>`;
    return `<svg viewBox="0 0 120 90" aria-hidden="true">${g}${rail}${tree(26, 40, 6, '--exp-tree')}${tree(94, 56, 5, '--exp-tree-3')}${tree(84, 72, 4, '--exp-bush')}${house(74, 40, 'bunny')}${house(96, 44, 'cat')}${train}</svg>`;
  }

  /* ---------- tutorial illustrato ---------- */
  const scene = (inner) => `<svg viewBox="0 0 120 90" aria-hidden="true"><rect width="120" height="90" rx="12" fill="var(--exp-grass)"/>${inner}</svg>`;
  const at = (x, y, s, ic) => `<g transform="translate(${x} ${y}) scale(${s})">${ic}</g>`;
  const inner = (s) => s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const finger = (x, y) => `<g transform="translate(${x} ${y})"><path d="M0 0 v-10 a2.5 2.5 0 0 1 5 0 v7 l5 1.5 q3 1 2.4 4 l-1.5 7 h-11 l-4 -6 q-1 -2 1 -3 Z" fill="var(--card-solid)" ${o(1.2)}/></g>`;
  const TUT = [
    { key: 'tu_express_1', en: 'Welcome to Hari Express! Villages of animals want passengers and mail; farms, fields and forests make goods. Every good has its own icon and shape. Carry them where they are needed and earn acorns.',
      art: scene(`${at(8, 10, 1.6, inner(indIc('town')))}${at(80, 10, 1.4, inner(indIc('farm')))}${at(44, 52, 1.4, inner(indIc('dairy')))}${['pax', 'milk', 'cheese', 'wood'].map((c, i) => at(6 + i * 28, 66, 0.9, inner(cargoIc(c)))).join('')}`) },
    { key: 'tu_express_2', en: 'To build, pick Roads or Tracks and drag your finger: Hari suggests the way and shows the cost before you confirm. Short bridges cross rivers; hills cost a bit more.',
      art: scene(`<path d="M14 70 Q40 70 60 45 T104 20" fill="none" stroke="var(--exp-road)" stroke-width="10" stroke-linecap="round"/><path d="M14 70 Q40 70 60 45 T104 20" fill="none" stroke="var(--exp-road-2)" stroke-width="1.5" stroke-dasharray="4 4"/>${finger(98, 26)}<rect x="10" y="8" width="52" height="20" rx="8" fill="var(--card-solid)" ${o(1)}/>${at(14, 11, 0.8, inner(acorn))}<text x="28" y="22" font-size="10" font-weight="800" fill="var(--exp-ink)">1.260</text>`) },
    { key: 'tu_express_3', en: 'Put a stop or a station next to villages and industries: the coloured area shows what it collects. Tap a stop, buy a bus, a truck or a train, then tap the stops in order. The vehicle goes round by itself.',
      art: scene(`${at(10, 40, 1.5, inner(indIc('stop')))}${at(84, 40, 1.5, inner(indIc('stop')))}<path d="M30 74 H90" stroke="var(--exp-road)" stroke-width="8"/>${at(44, 56, 0.9, VI.truck)}<circle cx="18" cy="30" r="8" fill="var(--accent)"/><text x="18" y="34" text-anchor="middle" font-size="11" font-weight="800" fill="var(--accent-ink)">1</text><circle cx="96" cy="30" r="8" fill="var(--accent)"/><text x="96" y="34" text-anchor="middle" font-size="11" font-weight="800" fill="var(--accent-ink)">2</text>`) },
    { key: 'tu_express_4', en: 'Every delivery pays: farther and faster pays more, slow trips pay less. Stations served often get a better rating and more goods. Factories turn milk into cheese, grain into bread and wood into toys: bring them to town and it grows!',
      art: scene(`${at(6, 20, 1.3, inner(cargoIc('milk')))}<path d="M40 36 H52" ${o(2)}/>${at(54, 18, 1.4, inner(indIc('dairy')))}<path d="M90 36 H100" ${o(2)}/>${at(96, 20, 1.0, inner(cargoIc('cheese')))}${at(40, 58, 1.4, inner(indIc('town')))}<text x="84" y="80" font-size="14" font-weight="800" fill="var(--exp-pay)">+</text>`) },
    { key: 'tu_express_5', en: 'Trains carry a lot. A train reserves the track up to the next signal: build a loop with one-way arrows and put signals along it, and many trains can follow each other without ever bumping.',
      art: scene(`<rect x="16" y="18" width="88" height="54" rx="22" fill="none" stroke="var(--exp-ballast)" stroke-width="8"/><rect x="16" y="18" width="88" height="54" rx="22" fill="none" stroke="var(--exp-rail)" stroke-width="1.4"/>${at(38, 4, 0.9, VI.castagna)}${at(50, 58, 0.9, VI.castagna)}<g color="var(--exp-ink)">${at(100, 36, 0.8, inner(IC.signal))}${at(4, 36, 0.8, inner(IC.signal))}</g><path d="M54 45 H70 M64 40 L70 45 L64 50" fill="none" stroke="var(--exp-arrow)" stroke-width="3" stroke-linecap="round"/>`) },
    { key: 'tu_express_6', en: 'Two fingers zoom and move the map; the round arrow turns it by 90°, the cube switches to the free view. On a computer: mouse wheel, keys 1–6 for the tools, R to rotate, Space to pause.',
      art: scene(`${finger(40, 52)}${finger(70, 40)}<path d="M30 30 L22 22 M80 62 L88 70" ${o(2)}/><g color="var(--exp-ink)">${at(92, 10, 1, inner(IC.rotate))}${at(92, 40, 1, inner(IC.view))}</g>`) },
  ];
  const RULES_EN = 'Build roads and railways between the villages of the animals and the farms, fields and forests. Buy buses, trucks and trains, choose their stops and carry passengers, milk, cheese, grain, bread, wood and toys: every delivery pays in acorns, more for long and quick trips. Serve the towns well and they grow. Reach the goal of each level, or build freely on your own map.';

  HH.expressArt = { L, EN, IC, CI, cargoIc, VI, vehIc, II, indIc, acorn, art, TUT, RULES_EN };
})(typeof globalThis !== 'undefined' ? globalThis : window);
