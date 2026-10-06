// Bouwt een offline-demo in één HTML-bestand (oefenmodus tegen bots + winkel, geen server nodig).
// Gebruik: npm install && npm run build:demo   ->  dist/karnemelk-kart-offline.html
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = await build({
  entryPoints: [join(ROOT, 'public/js/demo.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  target: ['es2020', 'safari15'],
  write: false,
  legalComments: 'eof',
});
const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync(join(ROOT, 'public/css/style.css'), 'utf8');
const body = `
<canvas id="scene" aria-hidden="true"></canvas>
<div id="hud"></div>
<main id="ui"></main>
<div id="toasts" aria-live="polite"></div>
<div id="modal"></div>
<div id="conn" role="status">Verbinding kwijt…</div>`;
const extraCss = '';
const fragment = `<title>Karnemelk Kart</title>
<style>${css}${extraCss}</style>
${body}
<script>${js}</script>
`;
const full = `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>Karnemelk Kart</title>
<style>${css}${extraCss}</style>
</head>
<body>
${body}
<script>${js}</script>
</body>
</html>
`;
mkdirSync(join(ROOT, 'dist'), { recursive: true });
writeFileSync(join(ROOT, 'dist/karnemelk-kart-offline.html'), full);
writeFileSync(join(ROOT, 'dist/demo-fragment.html'), fragment);
console.log(`dist/karnemelk-kart-offline.html  ${(full.length / 1024).toFixed(0)} kB`);
