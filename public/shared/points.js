// MP-puntenverdeling na een race.
//
// - Uitrijden:            20 MP (niet uitgereden: 5 MP voor de moeite)
// - Plaatsbonus:          (N - plek) / (N - 1) x (40 + 6 x veldgrootte)
//                          veldgrootte = mensen + de helft van het aantal bots
//                          -> winnaar van een volle race met 10 vrienden: 100 bonus
// - Snelste ronde:        +10 MP (alleen voor een mens)
// - Oefenmodus:           alles x 0,5 (afgerond)
//
// Voorbeelden (10 mensen): 1e 120, 2e 109, 3e 98 ... 10e 20 MP.
export const POINTS_RULES = {
  finish: 20,
  dnf: 5,
  fastestLap: 10,
  practiceFactor: 0.5,
};

export function placeBonus(place, total, field) {
  if (total <= 1) return 10; // alleen tegen de klok
  const scale = 40 + 6 * field;
  return Math.round(((total - place) / (total - 1)) * scale);
}

// rows: [{ id, isBot, place, finished, bestLap }]
export function computePoints(rows, { practice = false } = {}) {
  const total = rows.length;
  const humans = rows.filter((r) => !r.isBot).length;
  const bots = total - humans;
  const field = humans + bots / 2;
  let fastest = null;
  for (const r of rows) {
    if (r.isBot || !r.finished || !r.bestLap) continue;
    if (!fastest || r.bestLap < fastest.bestLap) fastest = r;
  }
  const out = {};
  for (const r of rows) {
    if (r.isBot) continue;
    const parts = [];
    if (r.finished) {
      parts.push({ label: 'Uitgereden', mp: POINTS_RULES.finish });
      const pb = placeBonus(r.place, total, field);
      if (pb > 0) parts.push({ label: `${r.place}e plaats`, mp: pb });
    } else {
      parts.push({ label: 'Niet uitgereden', mp: POINTS_RULES.dnf });
    }
    if (fastest && fastest.id === r.id && humans + bots > 1) parts.push({ label: 'Snelste ronde', mp: POINTS_RULES.fastestLap });
    let sum = parts.reduce((a, p) => a + p.mp, 0);
    if (practice) {
      const half = Math.round(sum * POINTS_RULES.practiceFactor);
      parts.push({ label: 'Oefenmodus (x0,5)', mp: half - sum });
      sum = half;
    }
    out[r.id] = { mp: sum, parts };
  }
  return out;
}
