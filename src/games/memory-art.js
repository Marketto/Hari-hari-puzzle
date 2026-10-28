/* Hari Memory — disegni delle carte (SVG puri, viewBox 100×100, colori solo da token --mm-*).
 * HH.memoryArt.face(id) → <svg> del soggetto · HH.memoryArt.back() → retro della carta · HH.memoryArt.IDS
 * Forme grandi e contorni spessi: devono riconoscersi anche su carte da ~50 px (griglia 6×6 su 360 px).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const O = 'stroke="var(--mm-ink)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
  const o = (w) => `stroke="var(--mm-ink)" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const F = (c) => `fill="var(--mm-${c})"`;
  // occhioni kawaii con due riflessi
  const eye = (x, y, r = 4.6) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.18}" fill="var(--mm-eye)"/><circle cx="${x + r * .35}" cy="${y - r * .45}" r="${r * .4}" fill="var(--mm-hi)"/><circle cx="${x - r * .3}" cy="${y + r * .45}" r="${r * .18}" fill="var(--mm-hi)"/>`;
  const eyes = (x1, x2, y, r) => eye(x1, y, r) + eye(x2, y, r);
  const blush = (x1, x2, y, rx = 5.5) => `<ellipse cx="${x1}" cy="${y}" rx="${rx}" ry="${rx * .6}" fill="var(--mm-blush)"/><ellipse cx="${x2}" cy="${y}" rx="${rx}" ry="${rx * .6}" fill="var(--mm-blush)"/>`;
  const smile = (x, y, w = 4) => `<path d="M${x - w} ${y}Q${x - w / 2} ${y + w * .8} ${x} ${y}Q${x + w / 2} ${y + w * .8} ${x + w} ${y}" fill="none" ${o(2.2)}/>`;
  const grin = (x, y, w = 4) => `<path d="M${x - w} ${y}Q${x} ${y + w * 1.1} ${x + w} ${y}" fill="none" ${o(2.2)}/>`;
  // faccina piccola per frutti e funghi
  const tiny = (x, y, s = 1) => eyes(x - 6 * s, x + 6 * s, y, 2.8 * s) + blush(x - 10 * s, x + 10 * s, y + 5 * s, 3.4 * s) + grin(x, y + 4 * s, 2.6 * s);
  // stella di punte (riccio, castagna)
  function spikes(cx, cy, r1, r2, n, a0, a1) {
    const p = [];
    for (let i = 0; i <= n * 2; i++) {
      const a = (a0 + ((a1 - a0) * i) / (n * 2)) * Math.PI / 180, r = i % 2 ? r1 : r2;
      p.push(`${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`);
    }
    return 'M' + p.join('L');
  }
  const leafP = (x, y, l, w, rot) => `<path d="M0 0Q${w} ${-l * .45} 0 ${-l}Q${-w} ${-l * .45} 0 0Z" transform="translate(${x} ${y}) rotate(${rot})" ${F('green')} ${o(2.4)}/>`;

  const D = {
    /* ---------- animali ---------- */
    hari: () => `<path d="${spikes(50, 58, 44, 31, 11, 168, 372)}Z" ${F('brown-2')} ${O}/>
      <path d="M14 66Q14 30 50 28Q86 30 86 66Q86 90 50 90Q14 90 14 66Z" ${F('brown')} ${O}/>
      <path d="M24 70Q24 46 50 46Q76 46 76 70Q76 88 50 88Q24 88 24 70Z" ${F('cream')} ${O}/>
      ${eyes(40, 60, 64, 4.4)}${blush(32, 68, 74)}<ellipse cx="50" cy="73" rx="4" ry="3" ${F('nose')}/>${smile(50, 78, 3.4)}`,
    squirrel: () => `<path d="M60 92C92 92 98 62 88 40C80 22 60 18 56 32C66 30 76 40 72 56C68 70 54 74 56 92Z" ${F('orange')} ${O}/>
      <path d="M70 40Q80 46 78 60" fill="none" stroke="var(--mm-orange-2)" stroke-width="3" stroke-linecap="round"/>
      <path d="M22 92Q16 66 36 60Q56 62 54 92Z" ${F('orange-2')} ${O}/><path d="M28 92Q28 74 38 72Q48 74 46 92Z" ${F('cream')}/>
      <path d="M20 30L24 10L34 24Z" ${F('orange-2')} ${O}/><path d="M50 24L58 8L60 30Z" ${F('orange-2')} ${O}/>
      <circle cx="40" cy="42" r="21" ${F('orange-2')} ${O}/><ellipse cx="40" cy="50" rx="12" ry="9" ${F('cream')}/>
      ${eyes(32, 48, 40, 3.8)}${blush(26, 54, 49, 4)}<circle cx="40" cy="47" r="2.4" ${F('nose')}/>${smile(40, 51, 2.8)}`,
    fox: () => `<path d="M14 12L36 30L28 44Z" ${F('orange')} ${O}/><path d="M86 12L64 30L72 44Z" ${F('orange')} ${O}/>
      <path d="M18 20L30 32L26 38Z" ${F('black')}/><path d="M82 20L70 32L74 38Z" ${F('black')}/>
      <path d="M12 46Q14 26 50 26Q86 26 88 46Q86 62 64 76L50 90L36 76Q14 62 12 46Z" ${F('orange')} ${O}/>
      <path d="M12 46Q28 50 40 64L50 90L36 76Q14 62 12 46ZM88 46Q72 50 60 64L50 90L64 76Q86 62 88 46Z" ${F('white')} ${o(2.4)}/>
      ${eyes(37, 63, 50, 4.2)}${blush(26, 74, 60, 4.4)}<path d="M45 80Q50 76 55 80L50 87Z" ${F('black')} ${o(2)}/>`,
    owl: () => `<path d="M24 26L22 10L38 20Z" ${F('brown-2')} ${O}/><path d="M76 26L78 10L62 20Z" ${F('brown-2')} ${O}/>
      <path d="M18 56Q18 16 50 16Q82 16 82 56Q82 92 50 92Q18 92 18 56Z" ${F('brown')} ${O}/>
      <path d="M18 56Q10 72 26 84M82 56Q90 72 74 84" fill="none" ${O}/>
      <path d="M34 66Q50 60 66 66Q66 88 50 88Q34 88 34 66Z" ${F('tan')}/>
      <path d="M40 72l4 3 4-3M52 72l4 3 4-3M46 80l4 3 4-3" fill="none" stroke="var(--mm-brown-2)" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="36" cy="44" r="13" ${F('cream')} ${O}/><circle cx="64" cy="44" r="13" ${F('cream')} ${O}/>
      ${eyes(36, 64, 44, 6)}<path d="M45 54L55 54L50 63Z" ${F('orange')} ${o(2.2)}/>
      <path d="M38 92v-5M44 92v-5M56 92v-5M62 92v-5" ${o(3)} stroke="var(--mm-orange-2)"/>`,
    rabbit: () => `<path d="M30 46Q20 8 32 6Q44 6 44 44Z" ${F('white')} ${O}/><path d="M33 40Q27 16 33 13Q38 14 39 40Z" ${F('pink')}/>
      <path d="M70 46Q80 8 68 6Q56 6 56 44Z" ${F('white')} ${O}/><path d="M67 40Q73 16 67 13Q62 14 61 40Z" ${F('pink')}/>
      <ellipse cx="50" cy="64" rx="32" ry="27" ${F('white')} ${O}/>
      ${eyes(38, 62, 60, 4.4)}${blush(28, 72, 70)}<path d="M46 67Q50 65 54 67L50 71Z" ${F('pink')} ${o(1.8)}/>
      <path d="M50 71V75M50 75Q46 79 43 76M50 75Q54 79 57 76" fill="none" ${o(2)}/><rect x="47" y="77" width="6" height="5" rx="1" ${F('hi')} ${o(1.6)}/>`,
    deer: () => `<path d="M34 30Q30 18 22 10M30 20L18 18M26 14L28 6M66 30Q70 18 78 10M70 20L82 18M74 14L72 6" fill="none" stroke="var(--mm-brown-2)" stroke-width="5" stroke-linecap="round"/>
      <path d="M30 38Q8 30 6 42Q14 52 32 48Z" ${F('tan')} ${O}/><path d="M70 38Q92 30 94 42Q86 52 68 48Z" ${F('tan')} ${O}/>
      <path d="M26 46Q26 26 50 26Q74 26 74 46Q74 66 62 80Q56 90 50 90Q44 90 38 80Q26 66 26 46Z" ${F('tan')} ${O}/>
      <path d="M38 72Q50 64 62 72Q60 88 50 88Q40 88 38 72Z" ${F('cream')}/>
      <circle cx="44" cy="34" r="2" ${F('cream')}/><circle cx="56" cy="34" r="2" ${F('cream')}/><circle cx="50" cy="31" r="2" ${F('cream')}/>
      ${eyes(40, 60, 52, 4.4)}${blush(32, 68, 62, 4.4)}<ellipse cx="50" cy="76" rx="5" ry="3.6" ${F('nose')}/>`,
    badger: () => `<circle cx="22" cy="34" r="9" ${F('black')} ${O}/><circle cx="78" cy="34" r="9" ${F('black')} ${O}/>
      <path d="M12 56Q12 24 50 24Q88 24 88 56Q88 88 50 88Q12 88 12 56Z" ${F('grey')} ${O}/>
      <path d="M50 24Q42 24 40 40Q40 70 50 88Q60 70 60 40Q58 24 50 24Z" ${F('white')}/>
      <path d="M38 26Q30 40 30 54Q34 66 42 70Q44 50 46 30Z" ${F('black')}/><path d="M62 26Q70 40 70 54Q66 66 58 70Q56 50 54 30Z" ${F('black')}/>
      ${eye(39, 54, 3.8)}${eye(61, 54, 3.8)}<ellipse cx="50" cy="76" rx="5.5" ry="4" ${F('black')}/>${blush(24, 76, 66, 4.6)}`,
    raccoon: () => `<path d="M76 92Q96 84 92 62" fill="none" stroke="var(--mm-grey-2)" stroke-width="12" stroke-linecap="round"/>
      <path d="M86 84l7 4M90 72l8 1" stroke="var(--mm-black)" stroke-width="5" stroke-linecap="round"/>
      <path d="M18 34L22 10L40 24Z" ${F('grey-2')} ${O}/><path d="M82 34L78 10L60 24Z" ${F('grey-2')} ${O}/>
      <path d="M10 54Q14 22 50 22Q86 22 90 54Q80 84 50 86Q20 84 10 54Z" ${F('grey')} ${O}/>
      <path d="M14 52Q24 38 42 46Q50 50 58 46Q76 38 86 52Q78 64 60 58Q50 54 40 58Q22 64 14 52Z" ${F('black')}/>
      <path d="M34 66Q50 58 66 66Q62 84 50 84Q38 84 34 66Z" ${F('white')}/>
      ${eye(34, 52, 4)}${eye(66, 52, 4)}<ellipse cx="50" cy="68" rx="5" ry="3.6" ${F('black')}/>${smile(50, 74, 3)}`,
    frog: () => `<circle cx="30" cy="34" r="14" ${F('green')} ${O}/><circle cx="70" cy="34" r="14" ${F('green')} ${O}/>
      <path d="M8 66Q8 38 50 38Q92 38 92 66Q92 88 50 88Q8 88 8 66Z" ${F('green')} ${O}/>
      ${eyes(30, 70, 34, 6)}<path d="M26 64Q50 84 74 64" fill="none" ${o(3)}/>${blush(18, 82, 66, 6)}
      <ellipse cx="50" cy="80" rx="14" ry="5" fill="var(--mm-green-hi)"/>`,
    snail: () => `<path d="M6 86Q8 72 26 72L78 74Q86 74 92 64L94 30M84 66L80 34" fill="none" ${O}/>
      <circle cx="94" cy="28" r="4" ${F('ink')}/><circle cx="80" cy="32" r="4" ${F('ink')}/>
      <path d="M6 86Q6 74 30 74L80 74Q94 74 94 58Q94 48 86 48Q76 50 76 62L70 86Z" ${F('yellow')} ${O}/>
      <circle cx="44" cy="52" r="30" ${F('orange')} ${O}/>
      <path d="M44 52m-4 0a4 4 0 1 1 8 0a9 9 0 1 1 -17 2a15 15 0 1 1 29 -6a21 21 0 1 1 -40 8" fill="none" stroke="var(--mm-orange-2)" stroke-width="4" stroke-linecap="round"/>
      ${eye(84, 60, 3)}<path d="M86 68Q89 70 91 67" fill="none" ${o(2)}/>`,
    ladybug: () => `<path d="M40 22L32 8M60 22L68 8" ${o(3)} fill="none"/><circle cx="32" cy="8" r="3.4" ${F('black')}/><circle cx="68" cy="8" r="3.4" ${F('black')}/>
      <circle cx="50" cy="56" r="38" ${F('red')} ${O}/>
      <path d="M22 30Q50 4 78 30Q66 40 50 40Q34 40 22 30Z" ${F('black')} ${O}/>
      ${eyes(41, 59, 28, 3.6)}<path d="M50 40V93" ${o(3)}/>
      <circle cx="30" cy="54" r="7" ${F('black')}/><circle cx="70" cy="54" r="7" ${F('black')}/><circle cx="34" cy="76" r="6" ${F('black')}/><circle cx="66" cy="76" r="6" ${F('black')}/>`,
    bear: () => `<circle cx="22" cy="28" r="13" ${F('brown')} ${O}/><circle cx="78" cy="28" r="13" ${F('brown')} ${O}/>
      <circle cx="22" cy="28" r="6" ${F('tan')}/><circle cx="78" cy="28" r="6" ${F('tan')}/>
      <ellipse cx="50" cy="58" rx="38" ry="34" ${F('brown')} ${O}/>
      <ellipse cx="50" cy="70" rx="16" ry="12" ${F('tan')} ${O}/>
      ${eyes(34, 66, 52, 4.6)}${blush(24, 76, 64)}<ellipse cx="50" cy="65" rx="5.6" ry="4" ${F('nose')}/><path d="M50 69V73" ${o(2)}/>${smile(50, 73, 4)}`,
    bee: () => `<ellipse cx="34" cy="30" rx="16" ry="12" transform="rotate(-25 34 30)" ${F('sky')} ${o(2.6)}/><ellipse cx="62" cy="26" rx="16" ry="12" transform="rotate(20 62 26)" ${F('sky')} ${o(2.6)}/>
      <path d="M90 60L98 62L90 66Z" ${F('ink')}/>
      <ellipse cx="54" cy="60" rx="38" ry="28" ${F('yellow')} ${O}/>
      <path d="M50 33Q42 60 50 87M66 35Q58 60 66 85M80 42Q74 60 80 78" fill="none" stroke="var(--mm-black)" stroke-width="8"/>
      <ellipse cx="54" cy="60" rx="38" ry="28" fill="none" ${O}/>
      <path d="M22 40Q14 26 18 18M30 36Q30 22 36 16" fill="none" ${o(2.4)}/><circle cx="18" cy="17" r="3" ${F('ink')}/><circle cx="36" cy="15" r="3" ${F('ink')}/>
      ${eyes(25, 40, 58, 3.8)}${blush(20, 44, 67, 3.6)}${smile(32, 68, 3)}`,
    mouse: () => `<path d="M80 80Q98 74 92 56Q88 46 96 40" fill="none" stroke="var(--mm-pink-2)" stroke-width="4" stroke-linecap="round"/>
      <circle cx="24" cy="34" r="19" ${F('grey')} ${O}/><circle cx="76" cy="34" r="19" ${F('grey')} ${O}/>
      <circle cx="24" cy="34" r="11" ${F('pink')}/><circle cx="76" cy="34" r="11" ${F('pink')}/>
      <path d="M22 62Q22 40 50 40Q78 40 78 62Q74 82 50 90Q26 82 22 62Z" ${F('grey')} ${O}/>
      ${eyes(40, 60, 60, 4.2)}${blush(30, 70, 70, 4.4)}<circle cx="50" cy="76" r="3.4" ${F('pink-2')} ${o(1.8)}/>
      <path d="M44 76L28 72M44 79L28 82M56 76L72 72M56 79L72 82" ${o(1.6)} opacity=".8"/>`,
    bird: () => `<path d="M14 58L2 50L4 66Z" ${F('brown-2')} ${O}/>
      <path d="M12 60Q12 26 50 24Q80 24 82 52Q82 82 50 84Q18 84 12 60Z" ${F('brown')} ${O}/>
      <path d="M40 56Q44 40 64 40Q82 44 82 60Q78 82 54 82Q40 78 40 56Z" ${F('orange')}/>
      <path d="M18 56Q30 46 42 58Q34 72 18 66Z" ${F('brown-2')} ${o(2.4)}/>
      <path d="M80 40L94 44L80 50Z" ${F('yellow')} ${o(2.4)}/>${eye(68, 38, 4.4)}<ellipse cx="72" cy="48" rx="4" ry="2.6" fill="var(--mm-blush)"/>
      <path d="M44 84L42 94M56 84L58 94M38 94H46M54 94H62" fill="none" stroke="var(--mm-orange-2)" stroke-width="3" stroke-linecap="round"/>`,
    beaver: () => `<ellipse cx="80" cy="74" rx="14" ry="22" transform="rotate(30 80 74)" ${F('brown-2')} ${O}/>
      <path d="M72 62l14 18M80 58l10 12M70 72l10 12" stroke="var(--mm-ink)" stroke-width="1.6" opacity=".5"/>
      <circle cx="24" cy="30" r="9" ${F('brown')} ${O}/><circle cx="70" cy="30" r="9" ${F('brown')} ${O}/>
      <path d="M14 56Q14 26 47 26Q80 26 80 56Q80 86 47 88Q14 86 14 56Z" ${F('brown')} ${O}/>
      <ellipse cx="47" cy="68" rx="16" ry="11" ${F('tan')}/>
      ${eyes(35, 59, 50, 4.2)}${blush(25, 69, 60, 4.4)}<ellipse cx="47" cy="62" rx="5.4" ry="3.6" ${F('nose')}/>
      <path d="M40 72H54V84Q47 86 40 84Z" ${F('hi')} ${o(2.2)}/><path d="M47 72V85" ${o(1.8)}/>`,
    caterpillar: () => `${[[16, 72], [30, 66], [44, 70], [58, 64]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="13" ${F(i % 2 ? 'green' : 'green-2')} ${O}/><path d="M${x - 3} ${y + 12}v6M${x + 3} ${y + 12}v6" ${o(2.4)}/>`).join('')}
      <path d="M70 34Q66 18 58 14M82 34Q88 18 96 16" fill="none" ${o(2.4)}/><circle cx="58" cy="14" r="3.4" ${F('red')} ${o(1.6)}/><circle cx="96" cy="16" r="3.4" ${F('red')} ${o(1.6)}/>
      <circle cx="76" cy="50" r="20" ${F('green')} ${O}/>${eyes(69, 83, 47, 3.8)}${blush(64, 89, 56, 3.6)}${smile(76, 57, 3.4)}`,
    boar: () => `<path d="M24 24L18 6L38 18Z" ${F('brown-2')} ${O}/><path d="M76 24L82 6L62 18Z" ${F('brown-2')} ${O}/>
      <path d="M40 18l4-10 4 9 4-9 4 10" fill="none" stroke="var(--mm-brown-2)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M12 54Q12 18 50 18Q88 18 88 54Q88 84 50 86Q12 84 12 54Z" ${F('brown-2')} ${O}/>
      ${eyes(34, 66, 46, 4.2)}${blush(24, 76, 56, 4.4)}
      <ellipse cx="50" cy="68" rx="19" ry="13" ${F('pink')} ${O}/><ellipse cx="43" cy="68" rx="3.4" ry="4.6" ${F('nose')}/><ellipse cx="57" cy="68" rx="3.4" ry="4.6" ${F('nose')}/>
      <path d="M30 74Q24 70 24 60Q30 64 34 70ZM70 74Q76 70 76 60Q70 64 66 70Z" ${F('hi')} ${o(2)}/>`,

    /* ---------- semi ---------- */
    sunseed: () => `<g transform="rotate(-24 50 50)"><path d="M50 8Q76 34 72 66Q66 92 50 92Q34 92 28 66Q24 34 50 8Z" ${F('black')} ${O}/>
      <path d="M42 24Q36 50 40 86M58 24Q64 50 60 86M50 14V90" fill="none" stroke="var(--mm-grey)" stroke-width="4" stroke-linecap="round"/></g>`,
    pumpseed: () => `<g transform="rotate(20 50 50)"><path d="M50 8Q80 26 80 58Q78 90 50 92Q22 90 20 58Q20 26 50 8Z" ${F('pumpkin')} ${O}/>
      <path d="M50 18Q70 32 70 58Q68 82 50 84Q32 82 30 58Q30 32 50 18Z" fill="var(--mm-pumpkin-2)"/></g>`,

    /* ---------- frutta secca ---------- */
    acorn: () => `<path d="M24 46Q24 92 50 92Q76 92 76 46Z" ${F('tan')} ${O}/>
      <path d="M14 46Q14 20 50 20Q86 20 86 46Q86 54 50 54Q14 54 14 46Z" ${F('brown-2')} ${O}/>
      <path d="M24 32L44 50M38 24L62 50M56 22L78 44M30 50L56 24M46 52L72 26M66 52L82 36" stroke="var(--mm-brown)" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M50 20Q50 10 58 6" fill="none" stroke="var(--mm-brown-2)" stroke-width="5" stroke-linecap="round"/>${tiny(50, 68, 1.1)}`,
    hazelnut: () => `<circle cx="50" cy="60" r="32" ${F('brown')} ${O}/><path d="M28 40Q50 30 72 40Q66 50 50 50Q34 50 28 40Z" ${F('tan')}/>
      <path d="M50 36Q26 34 16 16Q36 10 48 26Q50 6 62 4Q70 18 56 30Q74 18 88 24Q80 40 54 38Z" ${F('green')} ${O}/>${tiny(50, 68, 1.1)}`,
    walnut: () => `<path d="M50 8Q86 10 88 50Q86 90 50 92Q14 90 12 50Q14 10 50 8Z" ${F('wood')} ${O}/>
      <path d="M50 8V92" ${O}/>
      <path d="M24 30Q36 34 32 46Q24 54 30 66Q38 72 30 80M76 30Q64 34 68 46Q76 54 70 66Q62 72 70 80M42 20Q36 28 42 36M58 20Q64 28 58 36M42 56Q36 62 42 70M58 56Q64 62 58 70" fill="none" stroke="var(--mm-wood-2)" stroke-width="3" stroke-linecap="round"/>`,
    chestnut: () => `<path d="M50 10Q84 30 82 60Q80 76 50 76Q20 76 18 60Q16 30 50 10Z" ${F('chestnut')} ${O}/>
      <ellipse cx="36" cy="34" rx="6" ry="11" transform="rotate(30 36 34)" fill="var(--mm-hi)" opacity=".4"/>
      <path d="M50 10L50 4" stroke="var(--mm-tan)" stroke-width="5" stroke-linecap="round"/>${tiny(50, 50, 1)}
      <path d="${spikes(50, 62, 42, 32, 9, 0, 180)}Z" ${F('green')} ${o(2.4)}/>
      <path d="M10 62Q50 72 90 62Q86 90 50 92Q14 90 10 62Z" ${F('green')} ${O}/>
      <path d="M24 74l4 6M40 78l2 7M60 78l-2 7M76 74l-4 6" stroke="var(--mm-green-2)" stroke-width="2.6" stroke-linecap="round"/>`,
    pinecone: () => `<path d="M50 14V4" stroke="var(--mm-brown-2)" stroke-width="5" stroke-linecap="round"/>
      <path d="M50 12Q78 26 78 56Q76 90 50 94Q24 90 22 56Q22 26 50 12Z" ${F('brown-2')} ${O}/>
      ${[[80, [40, 60]], [66, [30, 50, 70]], [52, [28, 50, 72]], [38, [38, 62]], [26, [50]]].map(([y, xs]) => xs.map((x) => `<path d="M${x - 10} ${y - 6}Q${x} ${y + 12} ${x + 10} ${y - 6}Q${x} ${y - 2} ${x - 10} ${y - 6}Z" ${F('wood')} ${o(2.2)}/>`).join('')).join('')}`,

    /* ---------- bacche ---------- */
    blueberry: () => `${leafP(70, 30, 30, 12, 50)}
      ${[[34, 40, 18], [66, 58, 18], [36, 72, 18]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" ${F('blue')} ${O}/><path d="M${x - 5} ${y - 7}l5 4 5-4M${x} ${y - 9}v5" fill="none" stroke="var(--mm-blue-2)" stroke-width="2.6" stroke-linecap="round"/><ellipse cx="${x - 7}" cy="${y + 4}" rx="3" ry="5" transform="rotate(30 ${x - 7} ${y + 4})" fill="var(--mm-hi)" opacity=".45"/>`).join('')}`,
    blackberry: () => `<path d="M50 20L36 8M50 20L64 8M50 20L50 6M50 20L30 18M50 20L70 18" stroke="var(--mm-green-2)" stroke-width="5" stroke-linecap="round"/>
      <path d="M50 20Q82 22 80 54Q76 90 50 92Q24 90 20 54Q18 22 50 20Z" ${F('purple-2')} ${O}/>
      ${[[38, 34], [52, 32], [64, 38], [30, 48], [44, 46], [58, 48], [70, 52], [34, 62], [48, 60], [62, 64], [40, 76], [54, 76]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" ${F('purple')} stroke="var(--mm-purple-2)" stroke-width="2"/><circle cx="${x - 2}" cy="${y - 2.5}" r="1.8" fill="var(--mm-hi)" opacity=".6"/>`).join('')}`,
    strawberry: () => `<path d="M50 22Q86 18 82 46Q78 74 50 92Q22 74 18 46Q14 18 50 22Z" ${F('red')} ${O}/>
      <path d="M50 26L34 12L42 28L24 26L40 34L50 26L58 34L76 26L60 28L68 12Z" ${F('green')} ${o(2.4)}/><path d="M50 26V8" stroke="var(--mm-green-2)" stroke-width="4" stroke-linecap="round"/>
      ${[[32, 46], [68, 46], [40, 74], [60, 74], [26, 58], [74, 58]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2" ry="3" ${F('yellow')}/>`).join('')}${tiny(50, 54, 1.1)}`,
    currant: () => `<path d="M30 8Q40 30 34 44Q46 60 60 64Q70 76 72 90" fill="none" stroke="var(--mm-green-2)" stroke-width="3.5" stroke-linecap="round"/>
      ${leafP(30, 12, 26, 12, 70)}
      ${[[38, 34], [26, 50], [44, 54], [58, 50], [36, 70], [56, 72], [72, 66], [70, 86]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" ${F('red')} ${o(2.4)}/><circle cx="${x - 3}" cy="${y - 3.5}" r="2.6" fill="var(--mm-hi)" opacity=".6"/><circle cx="${x + 1}" cy="${y + 2}" r="1.2" fill="var(--mm-red-2)"/>`).join('')}`,

    /* ---------- alberi e cespugli ---------- */
    oak: () => `<path d="M42 92L44 62Q36 56 30 58M56 92L54 62Q62 56 70 56" ${F('wood-2')} ${O}/><path d="M40 94L44 60H56L60 94Z" ${F('wood-2')} ${O}/>
      <path d="M20 54Q6 50 10 36Q8 20 26 20Q30 6 48 8Q62 2 72 14Q92 14 90 32Q98 46 84 56Q76 68 62 60Q50 70 38 62Q26 68 20 54Z" ${F('green')} ${O}/>
      <path d="M30 34Q38 30 44 36M58 28Q66 24 72 30M48 48Q56 44 62 50" fill="none" stroke="var(--mm-green-2)" stroke-width="2.6" stroke-linecap="round"/>
      ${[[30, 46], [70, 44], [52, 24]].map(([x, y]) => `<ellipse cx="${x}" cy="${y + 3}" rx="3.4" ry="4.2" ${F('tan')} ${o(1.6)}/><path d="M${x - 4.5} ${y}Q${x} ${y - 4} ${x + 4.5} ${y}Z" ${F('brown-2')} ${o(1.6)}/>`).join('')}`,
    fir: () => `<rect x="44" y="78" width="12" height="16" rx="2" ${F('wood-2')} ${O}/>
      <path d="M50 4L70 34H60L78 56H64L86 80H14L36 56H22L40 34H30Z" ${F('green-3')} ${O}/>
      <path d="M40 34Q50 38 60 34M36 56Q50 60 64 56" fill="none" stroke="var(--mm-green-2)" stroke-width="2.6" stroke-linecap="round"/>`,
    birch: () => `<path d="M42 94Q46 60 44 30L56 30Q54 60 58 94Z" ${F('white')} ${O}/>
      <path d="M44 44h6M50 56h6M45 70h7M49 82h7M46 36h4" stroke="var(--mm-black)" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M50 40L34 28M52 50L68 40" stroke="var(--mm-white)" stroke-width="5" stroke-linecap="round"/><path d="M50 40L34 28M52 50L68 40" stroke="var(--mm-ink)" stroke-width="1.4" stroke-linecap="round" opacity=".6"/>
      ${[[32, 22, 12], [52, 14, 13], [70, 26, 12], [40, 34, 10], [62, 38, 10]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * .8}" ${F('lime')} ${o(2.4)}/>`).join('')}`,
    bush: () => `<path d="M8 86Q2 70 16 64Q12 46 30 46Q36 30 52 36Q66 28 74 42Q92 42 88 60Q100 70 90 86Z" ${F('green')} ${O}/>
      <path d="M22 66Q30 60 38 66M54 52Q62 48 70 54M50 72Q58 66 66 72M76 72Q82 68 86 74" fill="none" stroke="var(--mm-green-2)" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M6 88H94" ${O}/><path d="M20 88l-4 6M50 88v6M80 88l4 6" ${o(2.4)}/>`,

    /* ---------- foglie ---------- */
    maple: () => `<path d="M50 92V60" stroke="var(--mm-maple-2)" stroke-width="4" stroke-linecap="round"/>
      <path d="M50 66L30 74L34 62L12 52L22 46L14 30L32 34L34 22L46 32L50 6L54 32L66 22L68 34L86 30L78 46L88 52L66 62L70 74Z" ${F('maple')} ${O}/>
      <path d="M50 64V20M50 60L24 44M50 60L76 44M50 62L30 66M50 62L70 66" fill="none" stroke="var(--mm-maple-2)" stroke-width="2.2" stroke-linecap="round"/>`,
    oakleaf: () => `<g transform="rotate(-30 50 50)"><path d="M50 96V84" stroke="var(--mm-green-2)" stroke-width="4" stroke-linecap="round"/>
      <path d="M50 84Q38 84 40 76Q28 78 30 68Q20 66 26 56Q16 52 26 44Q18 36 30 32Q26 22 38 22Q38 10 50 6Q62 10 62 22Q74 22 70 32Q82 36 74 44Q84 52 74 56Q80 66 70 68Q72 78 60 76Q62 84 50 84Z" ${F('oakleaf')} ${O}/>
      <path d="M50 82V14M50 70L36 62M50 70L64 62M50 52L32 42M50 52L68 42M50 34L40 28M50 34L60 28" fill="none" stroke="var(--mm-green-2)" stroke-width="2.2" stroke-linecap="round"/></g>`,
    ginkgo: () => `<path d="M50 94Q52 76 50 60" fill="none" stroke="var(--mm-gold)" stroke-width="5" stroke-linecap="round"/>
      <path d="M50 62L10 26Q20 10 40 8Q46 20 50 24Q54 20 60 8Q80 10 90 26Z" ${F('ginkgo')} ${O}/>
      <path d="M50 60L22 22M50 60L36 14M50 60L64 14M50 60L78 22" fill="none" stroke="var(--mm-gold)" stroke-width="2" stroke-linecap="round"/>`,
    fern: () => `<path d="M28 96Q46 70 52 46Q58 22 74 14Q86 12 84 24Q80 30 73 26" fill="none" stroke="var(--mm-green-2)" stroke-width="5" stroke-linecap="round"/>
      ${[[34, 86, 22], [40, 74, 23], [45, 62, 22], [49, 50, 20], [54, 39, 16], [60, 30, 12]].map(([x, y, l]) => leafP(x, y, l, 7, -62) + leafP(x, y, l, 7, 72)).join('')}`,

    /* ---------- funghi ---------- */
    amanita: () => `<path d="M38 56Q34 80 30 90Q50 96 70 90Q66 80 62 56Z" ${F('white')} ${O}/>
      <path d="M36 68Q50 74 64 68L66 74Q50 80 34 74Z" ${F('white')} ${o(2.4)}/>
      <path d="M6 58Q8 12 50 10Q92 12 94 58Q50 66 6 58Z" ${F('red')} ${O}/>
      <circle cx="28" cy="34" r="6" ${F('white')}/><circle cx="52" cy="24" r="7" ${F('white')}/><circle cx="74" cy="36" r="6" ${F('white')}/><circle cx="44" cy="46" r="4.5" ${F('white')}/><circle cx="18" cy="50" r="3.6" ${F('white')}/><circle cx="84" cy="52" r="3.6" ${F('white')}/>
      ${tiny(50, 82, .9)}`,
    porcini: () => `<path d="M30 54Q16 80 30 92Q50 98 70 92Q84 80 70 54Z" ${F('cream')} ${O}/>
      <path d="M8 54Q8 14 50 12Q92 14 92 54Q92 62 50 62Q8 62 8 54Z" ${F('wood-2')} ${O}/>
      <ellipse cx="34" cy="28" rx="10" ry="5" transform="rotate(-20 34 28)" fill="var(--mm-hi)" opacity=".3"/>${tiny(50, 76, 1)}`,

    /* ---------- cibi e case (coppie a tema) ---------- */
    apple: () => `<path d="M50 28Q66 16 82 30Q94 48 84 70Q72 94 50 86Q28 94 16 70Q6 48 18 30Q34 16 50 28Z" ${F('red')} ${O}/>
      <path d="M50 28Q48 14 54 6" fill="none" stroke="var(--mm-wood-2)" stroke-width="5" stroke-linecap="round"/>${leafP(56, 16, 24, 9, 60)}
      <ellipse cx="30" cy="42" rx="5" ry="9" transform="rotate(30 30 42)" fill="var(--mm-hi)" opacity=".45"/>${tiny(50, 58, 1.1)}`,
    carrot: () => `<path d="M50 30L34 14M50 30L50 6M50 30L66 12M50 30L40 4M50 30L62 4" stroke="var(--mm-green-2)" stroke-width="6" stroke-linecap="round"/>
      <path d="M30 30Q50 22 70 30Q66 60 52 94Q48 96 46 92Q34 60 30 30Z" ${F('orange')} ${O}/>
      <path d="M36 44h8M56 52h8M40 64h6M54 72h6" stroke="var(--mm-orange-2)" stroke-width="3" stroke-linecap="round"/>`,
    flower: () => `<path d="M50 94V60" stroke="var(--mm-green-2)" stroke-width="5" stroke-linecap="round"/>${leafP(50, 84, 22, 9, 55)}
      ${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="50" cy="22" rx="13" ry="17" transform="rotate(${a} 50 42)" ${F('pink')} ${O}/>`).join('')}
      <circle cx="50" cy="42" r="13" ${F('yellow')} ${O}/>${eyes(45, 55, 41, 2.6)}${grin(50, 46, 2.6)}`,
    honey: () => `<path d="M18 40Q14 92 50 92Q86 92 82 40Z" ${F('gold')} ${O}/>
      <path d="M22 34H78Q84 34 84 40Q84 46 78 46H22Q16 46 16 40Q16 34 22 34Z" ${F('wood')} ${O}/>
      <path d="M28 46V58Q28 64 33 64Q38 64 38 58V46M56 46V54Q56 60 61 60Q66 60 66 54V46" ${F('yellow')} ${o(2.4)}/>
      <path d="M50 34V8" stroke="var(--mm-wood-2)" stroke-width="5" stroke-linecap="round"/><path d="M42 16H58M42 24H58" stroke="var(--mm-wood-2)" stroke-width="4" stroke-linecap="round"/>
      ${tiny(50, 74, 1)}`,
    grapes: () => `<path d="M50 20Q50 10 58 4" fill="none" stroke="var(--mm-wood-2)" stroke-width="4" stroke-linecap="round"/>${leafP(52, 18, 26, 13, 70)}
      ${[[34, 30], [50, 28], [66, 30], [26, 46], [42, 44], [58, 44], [74, 46], [34, 60], [50, 60], [66, 60], [42, 76], [58, 76], [50, 90]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" ${F('purple')} ${o(2.4)}/><circle cx="${x - 3}" cy="${y - 3}" r="2.2" fill="var(--mm-hi)" opacity=".55"/>`).join('')}`,
    lilypad: () => `<ellipse cx="50" cy="70" rx="46" ry="20" fill="var(--mm-water)"/>
      <path d="M50 66L84 54Q92 70 76 80Q50 92 24 80Q8 70 16 56Q30 46 50 48Z" ${F('green')} ${O}/>
      <path d="M50 66L28 60M50 66L36 80M50 66L66 80M50 66L76 66" fill="none" stroke="var(--mm-green-2)" stroke-width="2" stroke-linecap="round"/>
      ${[-40, -15, 15, 40].map((a) => `<path d="M50 44Q40 30 50 14Q60 30 50 44Z" transform="rotate(${a} 50 44)" ${F('pink')} ${o(2.2)}/>`).join('')}
      <path d="M50 46Q42 34 50 22Q58 34 50 46Z" ${F('pink-2')} ${o(2.2)}/>`,
    nest: () => `<ellipse cx="38" cy="46" rx="12" ry="15" ${F('egg')} ${O}/><ellipse cx="62" cy="46" rx="12" ry="15" ${F('egg')} ${O}/><ellipse cx="50" cy="40" rx="12" ry="15" ${F('egg')} ${O}/>
      <circle cx="46" cy="36" r="2" fill="var(--mm-blue-2)"/><circle cx="66" cy="44" r="2" fill="var(--mm-blue-2)"/>
      <path d="M6 52Q8 90 50 90Q92 90 94 52Q50 62 6 52Z" ${F('wood')} ${O}/>
      <path d="M10 60Q50 74 90 60M14 70Q50 84 86 70M20 80Q50 90 80 80M20 56L34 84M44 60L52 88M70 58L62 86M86 58L76 80" fill="none" stroke="var(--mm-wood-2)" stroke-width="2.4" stroke-linecap="round"/>`,
    moon: () => `<path d="M58 8Q90 22 90 52Q88 88 54 92Q26 92 14 70Q44 78 56 56Q68 32 58 8Z" ${F('moon')} ${O}/>
      ${eye(66, 50, 3.4)}${eye(80, 46, 3.4)}<ellipse cx="80" cy="58" rx="4" ry="2.5" fill="var(--mm-blush)"/>${grin(72, 60, 3)}
      <path d="M22 16l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" ${F('yellow')} ${o(2)}/><path d="M36 44l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" ${F('yellow')} ${o(1.6)}/>`,
    clover: () => `<path d="M50 52Q52 76 40 94" fill="none" stroke="var(--mm-green-2)" stroke-width="5" stroke-linecap="round"/>
      ${[0, 120, 240].map((a) => `<path d="M50 50Q36 40 30 30Q26 16 38 14Q48 14 50 26Q52 14 62 14Q74 16 70 30Q64 40 50 50Z" transform="rotate(${a} 50 50)" ${F('green')} ${O}/>`).join('')}
      <circle cx="50" cy="50" r="4" ${F('green-2')}/>`,
    log: () => `<path d="M14 34H74V82H14Q4 82 4 58Q4 34 14 34Z" ${F('wood')} ${O}/>
      <path d="M12 46h30M20 58h40M12 70h26" stroke="var(--mm-wood-2)" stroke-width="2.6" stroke-linecap="round"/>
      <ellipse cx="74" cy="58" rx="20" ry="24" ${F('tan')} ${O}/>
      <ellipse cx="74" cy="58" rx="12" ry="15" fill="none" stroke="var(--mm-wood)" stroke-width="2.6"/><ellipse cx="74" cy="58" rx="5" ry="6" fill="none" stroke="var(--mm-wood)" stroke-width="2.6"/>
      <path d="M36 34Q34 22 26 18M36 34Q40 20 48 18" fill="none" stroke="var(--mm-green-2)" stroke-width="3" stroke-linecap="round"/>${leafP(26, 18, 12, 5, -60)}${leafP(48, 18, 12, 5, 60)}`,
  };

  const CACHE = {};
  function face(id) {
    if (CACHE[id]) return CACHE[id];
    const f = D[id];
    return (CACHE[id] = `<svg class="mm-pic mm-s-${id}" viewBox="0 0 100 100" aria-hidden="true">${f ? f() : ''}</svg>`);
  }
  // retro: ghiande e foglie su verde bosco, Hari che sbircia al centro
  let BACK = '';
  function back() {
    if (BACK) return BACK;
    const acorn = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})" opacity=".55"><path d="M-5 0Q-5 9 0 9Q5 9 5 0Z" fill="var(--mm-back-hi)"/><path d="M-7 0Q-7 -5 0 -5Q7 -5 7 0Z" fill="var(--mm-back-dk)"/></g>`;
    const leaf = (x, y, r) => `<path d="M0 0Q6 -6 0 -14Q-6 -6 0 0Z" transform="translate(${x} ${y}) rotate(${r})" fill="var(--mm-back-hi)" opacity=".45"/>`;
    BACK = `<svg class="mm-backpic" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      ${acorn(14, 14, -20)}${leaf(86, 20, 40)}${acorn(84, 86, 25)}${leaf(16, 88, -30)}${leaf(50, 10, 90)}${leaf(50, 96, -90)}${acorn(10, 52, 10)}${acorn(90, 52, -15)}
      <circle cx="50" cy="52" r="27" fill="var(--mm-back-dk)" opacity=".35"/>
      <path d="${spikes(50, 58, 30, 21, 9, 175, 365)}Z" ${F('brown-2')} ${o(2.4)}/>
      <path d="M26 62Q26 38 50 38Q74 38 74 62Q74 78 50 78Q26 78 26 62Z" ${F('cream')} ${o(2.4)}/>
      ${eyes(42, 58, 58, 3.4)}${blush(35, 65, 66, 3.6)}<ellipse cx="50" cy="65" rx="3" ry="2.2" ${F('nose')}/>
    </svg>`;
    return BACK;
  }

  HH.memoryArt = { face, back, IDS: Object.keys(D) };
})(typeof globalThis !== 'undefined' ? globalThis : window);
