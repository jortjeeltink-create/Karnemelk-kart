// De review-vraag na een potje (public/js/review.js): wanneer hij komt, hoe vaak, en dat elk spel hem gebruikt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../public/', import.meta.url);
const read = (f) => readFileSync(new URL(f, root), 'utf8');
const MIN = 60e3, HOUR = 60 * MIN, DAY = 24 * HOUR;

// review.js in een nep-browser: een eigen klok, opslag en timers (het venster zelf wordt hier niet getekend)
function load() {
  const store = new Map(), timers = [];
  const window = {};
  const ctx = vm.createContext({
    window,
    localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) },
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    document: {},
  });
  vm.runInContext(read('js/review.js'), ctx);
  const R = window.SpelkeetReview;
  let t = Date.UTC(2026, 10, 8, 20, 0);
  R.klok = () => t;
  return { R, store, timers, at: (ms) => { t += ms; }, now: () => t };
}

test('review-vraag: pas na een tijdje echt spelen, op een rustig moment', () => {
  const g = load();
  // een ronde Mexen die snel klaar is: nog niet vragen
  assert.equal(g.R.stand('mexen', 'lobby', 0), false);
  assert.equal(g.R.stand('mexen', 'gooien', 0), false);
  g.at(2 * MIN);
  assert.equal(g.R.stand('mexen', 'uitslag', 1), false, 'na 2 minuten nog niet');
  g.at(5 * MIN);
  assert.equal(g.R.stand('mexen', 'gooien', 0), false);
  g.at(30e3);
  assert.equal(g.R.stand('mexen', 'uitslag', 1), true, 'na de ronde, ruim 6 minuten na het begin');
  assert.equal(g.timers.length, 1);
  assert.ok(g.timers[0].ms >= 2000, 'eerst even de uitslag laten zien');
  // dezelfde uitslag nog een keer (opnieuw verbonden) of een volgende ronde: niet nog een keer
  assert.equal(g.R.stand('mexen', 'uitslag', 1), false);
  g.at(10 * MIN);
  assert.equal(g.R.stand('mexen', 'gooien', 0), false);
  assert.equal(g.R.stand('mexen', 'uitslag', 1), false, 'per bezoek hooguit één keer');
});

test('review-vraag: einde van het spel, terug naar de lobby of van tafel', () => {
  // een heel spel (Bussen) dat klaar is: al na 2 minuten
  let g = load();
  g.R.stand('bussen', 'vragen', 0);
  g.at(90e3);
  assert.equal(g.R.stand('bussen', 'klaar', 2), false);
  g = load();
  g.R.stand('bussen', 'vragen', 0);
  g.at(2 * MIN + 1);
  assert.equal(g.R.stand('bussen', 'klaar', 2), true);
  // van tafel gaan na een tijdje spelen
  g = load();
  g.R.stand('dealer', 'raden', 0);
  g.at(3 * MIN);
  assert.equal(g.R.stand('dealer', null, 0), false, 'na 3 minuten weggaan: niet vragen');
  g.R.stand('dealer', 'raden', 0);
  g.at(5 * MIN);
  assert.equal(g.R.stand('dealer', 'lobby', 0), true, 'de host gaat terug naar de lobby na 5 minuten');
  // onbekend spel: nooit
  g = load();
  g.R.stand('pokeren', 'spel', 0);
  g.at(20 * MIN);
  assert.equal(g.R.stand('pokeren', 'klaar', 2), false);
});

test('review-vraag: niet te vaak (één keer per dag, na "Nu niet" en na een review)', () => {
  const g = load();
  const play = (spel) => { g.R.stand(spel, 'spel', 0); g.at(10 * MIN); const r = g.R.stand(spel, 'klaar', 2); g.R.stand(spel, null, 0); return r; };
  // vandaag al gevraagd (opslag zegt 'laatst' is net)
  g.store.set('spelkeet-review', JSON.stringify({ laatst: g.now() - HOUR }));
  assert.equal(play('mexen'), false, 'vandaag al gevraagd');
  // net "Nu niet" gezegd: drie dagen niet
  const g2 = load();
  g2.store.set('spelkeet-review', JSON.stringify({ laatst: g2.now() - 2 * DAY, nee: g2.now() - 2 * DAY }));
  g2.R.stand('rotonde', 'kiezen', 0); g2.at(10 * MIN);
  assert.equal(g2.R.stand('rotonde', 'klaar', 2), false, 'twee dagen na "Nu niet"');
  const g3 = load();
  g3.store.set('spelkeet-review', JSON.stringify({ laatst: g3.now() - 4 * DAY, nee: g3.now() - 4 * DAY }));
  g3.R.stand('rotonde', 'kiezen', 0); g3.at(10 * MIN);
  assert.equal(g3.R.stand('rotonde', 'klaar', 2), true, 'vier dagen na "Nu niet" mag het weer');
  // dit spel al beoordeeld: een ander spel nog wel
  const g4 = load();
  g4.store.set('spelkeet-review', JSON.stringify({ gedaan: { mijnenveld: g4.now() - 5 * DAY } }));
  g4.R.stand('mijnenveld', 'gooien', 0); g4.at(10 * MIN);
  assert.equal(g4.R.stand('mijnenveld', 'klaar', 2), false, 'Mijnenveld al beoordeeld');
  const g5 = load();
  g5.store.set('spelkeet-review', JSON.stringify({ gedaan: { mijnenveld: g5.now() - 5 * DAY } }));
  g5.R.stand('borrelbord', 'gooien', 0); g5.at(10 * MIN);
  assert.equal(g5.R.stand('borrelbord', 'klaar', 2), true, 'het Borrelbord nog niet');
});

test('review-vraag: elk spel laadt het script en meldt zijn stand', () => {
  const PAGES = { bussen: 'bussen', boer: 'boer', mexen: 'mexen', dealer: 'dealer', paardenrace: 'paardenrace', rotonde: 'rotonde', mijnenveld: 'mijnenveld', zuipbord: 'borrelbord' };
  for (const [page, spel] of Object.entries(PAGES)) {
    const html = read(`${page}.html`);
    assert.ok(html.includes('<script src="/js/review.js" defer></script>'), `${page}: review.js`);
    assert.ok(html.includes(`SpelkeetReview.stand('${spel}', m.phase, `), `${page}: stand bij elke update`);
    assert.ok(html.includes(`SpelkeetReview.stand('${spel}', null, 0)`), `${page}: van tafel`);
  }
  assert.ok(read('index.html').includes('<script src="/js/review.js" defer></script>'), 'kart: review.js');
  const bom = read('bom.html');
  assert.ok(bom.includes('<script src="/js/review.js" defer></script>') && bom.includes("SpelkeetReview.stand('bom', "), 'Tikkende Bom: review.js en de stand');
  const main = read('js/main.js');
  assert.ok(main.includes("SpelkeetReview.stand('kart', 'race', 0)") && main.includes("SpelkeetReview.stand('kart', 'uitslag', 1)"), 'kart: race en uitslag');
  // het venster stuurt sterren, goed, fout en de bron naar de server
  const src = read('js/review.js');
  assert.match(src, /fetch\('\/api\/review'/);
  for (const k of ['sterren', 'spel', 'goed:', 'fout:', "bron: 'na-spel'"]) assert.ok(src.includes(k), k);
});
