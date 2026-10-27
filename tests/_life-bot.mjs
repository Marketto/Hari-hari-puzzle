// Bot per i test di Hari Home (usano solo l'API pubblica di HH.life, come farebbe un giocatore).
import assert from 'node:assert/strict';
import { load } from './_load.mjs';

const HH = load('src/games/life-data.js', 'src/games/life-logic.js');
export const L = HH.life, D = HH.lifeData;
const HOUR = 60, DAY = 1440;

/* ---------- invarianti controllate a ogni ora ---------- */
export function invariants(s) {
  for (const k of L.NEEDS) {
    const v = s.needs[k];
    assert.ok(Number.isFinite(v) && v >= 0 && v <= 1, `bisogno ${k} = ${v}`);
  }
  assert.ok(Number.isInteger(s.money) && s.money >= 0, `soldi ${s.money}`);
  assert.ok(Number.isFinite(s.debt) && s.debt >= 0, `debito ${s.debt}`);
  assert.ok(Number.isFinite(s.t));
}

/* ---------- bot giudizioso: ogni mezz'ora di gioco, se Hari è libero, sceglie cosa fare ---------- */
const tryStart = (s, id, opt) => L.start(s, id, opt).ok;
function freeTile(s, id, r = 0) {
  const { c, r: rows } = L.dims(s);
  for (let y = 0; y < rows; y++) for (let x = 0; x < c; x++) if (!L.canPlace(s, id, x, y, r)) return { x, y, r };
  for (let y = 0; y < rows; y++) for (let x = 0; x < c; x++) if (!L.canPlace(s, id, x, y, 1 - r)) return { x, y, r: 1 - r };
  return null;
}
export function buyItem(s, id, reserve = 80) {
  const I = D.ITEMS[id];
  if (s.money < I.p + reserve) return false;
  if (I.wall) {
    for (const side of ['L', 'R']) for (let i = 0; i < 12; i++) if (!L.canWall(s, id, side, i)) return L.buyWall(s, id, side, i).ok;
    return false;
  }
  const p = freeTile(s, id);
  return !!p && L.buy(s, id, p.x, p.y, p.r).ok;
}
export const owns = (s, k, t = 0) => s.home.items.concat(s.home.walls).some((it) => D.ITEMS[it.id].k === k && D.ITEMS[it.id].t >= t);
function replace(s, k, id, reserve) {
  const old = s.home.items.filter((it) => D.ITEMS[it.id].k === k);
  if (s.money < D.ITEMS[id].p + reserve) return false;
  old.forEach((it) => L.sell(s, it.u));
  if (buyItem(s, id, 0)) return true;
  return false;
}

export function wiseBot(s, mem) {
  const n = s.needs, ck = L.clock(s), h = ck.hour, stock = L.stock(s);
  // la vita da adulti: bollette, casa, attività
  if (!s.biz) L.chooseBiz(s, 'craft');
  if (!owns(s, 'desk')) buyItem(s, 'desk1', 0);
  // ripara la casa appena può
  if (!s.act) for (const d of s.home.dmg) {
    const o = L.options(s, { dmg: d })[0];
    if (o && o.ok && s.money >= o.cost + 60) return tryStart(s, 'repair', { dmg: d });
  }
  if (!owns(s, 'stove')) buyItem(s, 'stove1', 60);
  if (!owns(s, 'bed', 1) && s.money > 260) replace(s, 'bed', 'bed1', 100);
  if (!owns(s, 'mat')) buyItem(s, 'mat', 80);
  if (!owns(s, 'sofa')) buyItem(s, 'sofa1', 150);
  if (s.home.floor === 'worn' && s.money > 300) L.setStyle(s, 'floor', 'wood');
  if (s.home.wall === 'peel' && s.money > 300) L.setStyle(s, 'wall', 'paint');
  if (!owns(s, 'plant')) buyItem(s, 'plant1', 100);
  if (!owns(s, 'poster')) buyItem(s, 'poster', 100);
  if (!owns(s, 'lamp')) buyItem(s, 'lamp1', 120);
  if (s.biz && s.biz.level < 4 && s.money > D.BIZ.up[s.biz.level + 1] + 300) L.upgradeBiz(s);
  if (s.biz && s.biz.level >= 2 && s.biz.helpers < D.BIZ.help[s.biz.level] && s.money > 400) L.hire(s);
  if (s.act) return false;
  if (s.sick || n.health < 0.5) { if (tryStart(s, 'doctor')) return true; }
  if (L.age(s) >= 50 && (s.checkup == null || s.t - s.checkup > DAY * 9) && tryStart(s, 'doctor')) return true;
  if (h >= 22 || h < 6 || n.energy < 0.22) return tryStart(s, 'sleep');
  if (n.food < 0.5) {
    if (stock) return tryStart(s, owns(s, 'stove') ? 'cook' : 'eat');
    const cap = L.fridgeCap(s) - stock, q = s.money > 400 ? 1 : 0, k = Math.min(cap, 6);
    if (k > 0 && tryStart(s, 'shop', { buy: q ? [0, k, 0] : [k, 0, 0] })) return true;
  }
  if (n.hygiene < 0.4) return tryStart(s, 'shower');
  if (n.stress > 0.65) return tryStart(s, owns(s, 'mat') ? 'workout' : 'jog');
  if (n.social < 0.4) return s.friends.length ? tryStart(s, 'invite') || tryStart(s, 'call') : tryStart(s, 'cafe');
  if (n.fun < 0.35) return tryStart(s, 'watch');
  if (h >= 7 && h < 19 && !s.retired && n.energy > 0.35 && (mem.today = mem.day === ck.day ? mem.today : 0) < 3) {
    if (s.biz.level >= 2 ? tryStart(s, 'office') : tryStart(s, 'work')) { mem.shifts++; mem.day = ck.day; mem.today++; return true; }
  }
  if (n.stress > 0.4) return tryStart(s, owns(s, 'mat') ? 'workout' : 'jog');
  if (owns(s, 'sofa')) return tryStart(s, 'relax');
  return tryStart(s, 'watch');
}
export function run(s, days, bot, mem = { shifts: 0 }, each) {
  const end = s.t + days * DAY;
  const mood = [];
  while (s.t < end) {
    bot(s, mem);
    L.tick(s, 30);
    if (Math.round(s.t) % HOUR === 0) { invariants(s); mood.push(s.needs.mood); if (each) each(s); }
  }
  return { mood: mood.reduce((a, b) => a + b, 0) / mood.length, mem };
}

