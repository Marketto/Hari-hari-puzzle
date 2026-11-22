// node tools/privacy-check.mjs — il repo è pubblico: nessun dato personale o segreto nei file tracciati (regola R20).
// Cerca indirizzi email (tranne quelli «noreply» e d'esempio), chiavi e token noti, file .env. Esce con 1 se trova qualcosa.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString().split('\0').filter(Boolean);

// email ammesse: indirizzi «noreply» (autore dei commit, attribuzioni) e domini d'esempio
const OK_MAIL = /(^|[.@])(noreply|no-reply)[.@]|@(users\.noreply\.github\.com|example\.(com|org|net)|anthropic\.com)$/i;
const MAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const SECRETS = [
  ['chiave privata', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['token GitHub', /\bgh[pousr]_[A-Za-z0-9]{30,}\b/],
  ['chiave AWS', /\bAKIA[0-9A-Z]{16}\b/],
  ['chiave Google', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['token Slack', /\bxox[abpr]-[A-Za-z0-9-]{10,}\b/],
  ['chiave API (sk-)', /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{24,}\b/],
];
const BINARY = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|otf|mp3|ogg|wav|zip|gz|pdf)$/i;

const found = [];
for (const f of files) {
  if (/(^|\/)\.env(\.|$)/.test(f)) { found.push(`${f}: file .env nel repo`); continue; }
  if (BINARY.test(f)) continue;
  let txt;
  try { txt = fs.readFileSync(path.join(root, f), 'utf8'); } catch { continue; }
  if (txt.length > 4e6) continue;            // file generati enormi (mappe): niente testo libero da controllare
  txt.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(MAIL)) {
      const at = m[0];
      if (OK_MAIL.test(at)) continue;
      if (/\.(png|svg|js|css|webp|jpg)$/i.test(at)) continue;   // nomi di file con @2x ecc.
      found.push(`${f}:${i + 1}: indirizzo email «${at.replace(/^(.).*(@.*)$/, '$1…$2')}»`);
    }
    for (const [name, re] of SECRETS) if (re.test(line)) found.push(`${f}:${i + 1}: ${name}`);
  });
}

if (found.length) {
  console.log('✘ dati personali o segreti nel repo pubblico:');
  found.forEach((x) => console.log('  ' + x));
  process.exit(1);
}
console.log(`✔ privacy: ${files.length} file controllati, nessuna email personale né segreto`);
