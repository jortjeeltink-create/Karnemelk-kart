// Elk tafelspel heeft een eigen tafel: een eigen thema onderaan de stijl en een vorm waar de stoelen omheen staan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (f) => readFileSync(new URL(`../public/${f}`, import.meta.url), 'utf8');
const VORM = { bussen: 'recht', boer: 'recht', mexen: 'acht', dealer: 'ovaal', paardenrace: 'recht', rotonde: 'rond', mijnenveld: 'recht', toepen: 'recht' };

test('elk tafelspel heeft een eigen thema en een eigen tafelvorm', () => {
  const achtergrond = new Set();
  for (const [spel, vorm] of Object.entries(VORM)) {
    const html = read(`${spel}.html`);
    const m = html.match(/\/\* ==== THEMA: eigen tafel per spel \(begin\) ==== \*\/([\s\S]*?)\/\* ==== THEMA \(einde\) ==== \*\//);
    assert.ok(m, `${spel}: thema-blok`);
    const css = m[1];
    assert.ok(html.indexOf(m[0]) < html.indexOf('</style>'), `${spel}: het thema staat in de stijl`);
    assert.ok(html.includes(`const TABLE_SHAPE = '${vorm}';`), `${spel}: vorm ${vorm}`);
    assert.ok(html.includes("const bol = { recht: .36, acht: .62 }[TABLE_SHAPE] || 1;"), `${spel}: de stoelen volgen de vorm`);
    // leesbare tekst en een strakke actiebalk
    assert.match(css, /\.sub,\.fine,\.pline,\.waitline[^{]*\{font-family:var\(--read\)/, `${spel}: leesbare tekst`);
    assert.match(css, /\.dock:has\(\.cta:not\(:disabled\)\)/, `${spel}: de actiebalk licht op als je iets kunt doen`);
    // een eigen achtergrond, vilt en rand
    const bg = css.match(/\nbody\{background:([^}]+)\}/);
    assert.ok(bg, `${spel}: eigen achtergrond`);
    achtergrond.add(bg[1]);
    assert.match(css, /\n\.felt\{[^}]*background:/, `${spel}: eigen tafelblad`);
    assert.match(css, /\n\.rail(,\.felt)?\{/, `${spel}: eigen rand`);
    // de vorm in de stijl hoort bij de vorm in het script
    if (vorm === 'rond') assert.match(css, /\.rail\{inset:auto;left:50%;top:47\.5%;width:min\(88cqw,85cqh\);aspect-ratio:1/, `${spel}: een cirkel`);
    if (vorm === 'acht') assert.match(css, /clip-path:polygon\(/, `${spel}: een achthoek`);
  }
  assert.equal(achtergrond.size, Object.keys(VORM).length, 'geen twee spellen met dezelfde achtergrond');
});

test('Mijnenveld: de markering van rij en kolom raakt het labeltje op het beginscherm niet meer', () => {
  const html = read('mijnenveld.html');
  assert.ok(!/\n\.line\{/.test(html), 'geen losse .line');
  assert.match(html, /\n\.field \.line\{position:absolute/);
});

test('Bussen: de kaarten van wie aan de beurt is liggen alleen midden op tafel, met de vraag erboven', () => {
  const html = read('bussen.html');
  assert.ok(html.includes("...(i === bp ? { hole: null } : {}),"));
  assert.match(html, /<p class="qtag">\$\{B\.QUESTIONS\[round\]\.q\}<\/p><div class="board">/);
});
