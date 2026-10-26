// Test headless della logica dei giochi: `node tools/selftest.mjs`
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const f of ['hedgedoku-logic.js', 'boba-logic.js', 'lantern-logic.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(root, 'src/games', f), 'utf8'), { filename: f });
}
const { hedgedoku, boba, lantern } = globalThis.HH;
let fail = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✔' : '✘'} ${msg}`); if (!cond) fail++; };

for (const n of [5, 6, 7, 8]) {
  let uniq = 0, ms = 0;
  for (let k = 0; k < 10; k++) {
    const t = performance.now();
    const p = hedgedoku.generate(n);
    ms += performance.now() - t;
    if (p.unique) uniq++;
    const board = new Array(n * n).fill(0);
    p.solution.forEach((c, r) => { board[r * n + c] = 2; });
    if (!hedgedoku.check(n, p.regions, board).solved) fail++;
  }
  ok(uniq >= 8, `Hedgedoku ${n}x${n}: ${uniq}/10 unici, media ${(ms / 10).toFixed(0)} ms`);
}

for (const colors of [3, 5, 7, 9]) {
  const t = performance.now();
  const cups = boba.generate(colors);
  const sol = cups && boba.solve(cups);
  let s = cups;
  sol && sol.forEach(([a, b]) => { s = boba.pour(s, a, b).cups; });
  ok(!!sol && boba.isSolved(s), `Boba ${colors} gusti: risolvibile in ${sol?.length} mosse (${(performance.now() - t).toFixed(0)} ms)`);
}

for (const n of [4, 5]) {
  const g = lantern.generate(n, 6);
  ok(!lantern.isSolved(g) && g.length === n * n, `Lantern ${n}x${n} generato`);
}

const L = vm.runInThisContext(fs.readFileSync(path.join(root, 'src/i18n/locales.js'), 'utf8'));
ok(Object.keys(globalThis.HH.LOCALES).length >= 43, `Lingue: ${Object.keys(globalThis.HH.LOCALES).length}`);
process.exit(fail ? 1 : 0);
