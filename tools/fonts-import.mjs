// Font dell'app dentro il repository (niente Google Fonts a runtime): importa i woff2 dai pacchetti npm @fontsource.
//
//   mkdir /tmp/f && cd /tmp/f && npm pack @fontsource/m-plus-rounded-1c @fontsource/mochiy-pop-one @fontsource/baloo-bhaijaan-2
//   for f in *.tgz; do mkdir "${f%.tgz}" && tar xzf "$f" -C "${f%.tgz}"; done
//   node tools/fonts-import.mjs /tmp/f
//
// Uscita:
//   assets/fonts/*.woff2        un file per famiglia, sottoinsieme (unicode-range) e peso
//   assets/fonts/fonts.css      le @font-face locali (font-display: swap), nell'ordine dei CSS di @fontsource
//   assets/fonts/fonts-ja.css   le @font-face delle fette giapponesi (solo in giapponese)
//   docs/licenses/OFL-<id>.txt  il file di licenza OFL di ogni font, con il suo copyright
// Il browser scarica solo i sottoinsiemi che servono ai caratteri della pagina. Quali stanno nella shell offline
// (SHELL di sw.js) e quali vanno in cache al primo uso: vedi "Tipografia" in docs/design-system.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// pacchetto @fontsource, prefisso dei file, pesi usati dall'app (gli stessi chiesti prima a Google Fonts)
export const FONTS = [
  { pkg: 'mochiy-pop-one', id: 'mochiy', family: 'Mochiy Pop One', weights: [400] },
  { pkg: 'm-plus-rounded-1c', id: 'mplus', family: 'M PLUS Rounded 1c', weights: [400, 700, 800] },
  { pkg: 'baloo-bhaijaan-2', id: 'baloo', family: 'Baloo Bhaijaan 2', weights: [500, 700, 800] },
];

function main(src) {
  const out = path.join(root, 'assets/fonts');
  fs.mkdirSync(out, { recursive: true });
  for (const f of fs.readdirSync(out)) if (/\.(woff2|css)$/.test(f)) fs.rmSync(path.join(out, f));
  const head = '/* GENERATO da tools/fonts-import.mjs (pacchetti @fontsource): non modificare a mano.\n'
    + ' * Font OFL 1.1 inclusi nell\'app (licenze in docs/licenses/). Il browser scarica solo i file dei caratteri usati. */\n';
  // fonts.css: latino, cirillico, greco, arabo… (sempre caricato). fonts-ja.css: le ~120 fette giapponesi per peso,
  // caricato solo in giapponese (HH.i18n.set) e messo PRIMA di fonts.css, come nell'ordine di @fontsource
  let css = head, ja = head;
  let n = 0, bytes = 0;
  for (const F of FONTS) {
    const dir = fs.readdirSync(src).map((d) => path.join(src, d, 'package')).find((d) => fs.existsSync(path.join(d, 'package.json')) && JSON.parse(fs.readFileSync(path.join(d, 'package.json'), 'utf8')).name === '@fontsource/' + F.pkg);
    if (!dir) throw new Error(`@fontsource/${F.pkg} non trovato in ${src}`);
    for (const w of F.weights) {
      const faces = fs.readFileSync(path.join(dir, `${w}.css`), 'utf8').match(/@font-face\s*{[^}]*}/g);
      for (const face of faces) {
        const file = face.match(/url\(\.\/files\/([^)]+\.woff2)\)/)[1];
        const sub = file.slice(F.pkg.length + 1).replace(new RegExp(`-${w}-normal\\.woff2$`), '');
        const name = `${F.id}-${sub}-${w}.woff2`;
        fs.copyFileSync(path.join(dir, 'files', file), path.join(out, name));
        bytes += fs.statSync(path.join(out, name)).size; n++;
        const range = (face.match(/unicode-range:\s*([^;]+);/) || [])[1];
        const rule = `@font-face{font-family:'${F.family}';font-style:normal;font-weight:${w};font-display:swap;src:url(${name}) format('woff2')${range ? `;unicode-range:${range.trim()}` : ''}}\n`;
        if (/^\d+$/.test(sub)) ja += rule; else css += rule;
      }
    }
    fs.copyFileSync(path.join(dir, 'LICENSE'), path.join(root, `docs/licenses/OFL-${F.id}.txt`));
  }
  fs.writeFileSync(path.join(out, 'fonts.css'), css);
  fs.writeFileSync(path.join(out, 'fonts-ja.css'), ja);
  console.log(`assets/fonts: ${n} file woff2, ${(bytes / 1024).toFixed(0)} KB; fonts.css ${(css.length / 1024).toFixed(1)} KB, fonts-ja.css ${(ja.length / 1024).toFixed(0)} KB`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) { console.error('uso: node tools/fonts-import.mjs <cartella con i pacchetti @fontsource estratti>'); process.exit(2); }
  main(path.resolve(process.argv[2]));
}
