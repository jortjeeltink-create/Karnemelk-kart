// Ontwikkelhulpmiddel: tekent alle banen als SVG (met t-markeringen) en controleert ze.
// Gebruik: node tools/preview-tracks.mjs [uitvoermap]
import { writeFileSync, mkdirSync } from 'node:fs';
import { TRACKS } from '../public/shared/tracks.js';
import { buildTrack, validateTrack } from '../public/shared/trackgeo.js';

const outDir = process.argv[2] || 'track-previews';
mkdirSync(outDir, { recursive: true });

for (const def of TRACKS) {
  const tr = buildTrack(def);
  const v = validateTrack(tr);
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < tr.N; i++) {
    minX = Math.min(minX, tr.px[i]); maxX = Math.max(maxX, tr.px[i]);
    minZ = Math.min(minZ, tr.pz[i]); maxZ = Math.max(maxZ, tr.pz[i]);
  }
  const pad = 30;
  const W = maxX - minX + pad * 2, H = maxZ - minZ + pad * 2;
  const X = (x) => (x - minX + pad).toFixed(1);
  const Z = (z) => (z - minZ + pad).toFixed(1);
  const edge = (d) => {
    let s = '';
    for (let i = 0; i <= tr.N; i += 2) {
      const k = i % tr.N;
      s += `${i ? 'L' : 'M'}${X(tr.px[k] + tr.nx[k] * d)},${Z(tr.pz[k] + tr.nz[k] * d)}`;
    }
    return s;
  };
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 3}" height="${H * 3}" viewBox="0 0 ${W} ${H}">`;
  svg += `<rect width="100%" height="100%" fill="#dfe8d0"/>`;
  svg += `<path d="${edge(tr.wallD)}" fill="none" stroke="#a33" stroke-width="0.6"/>`;
  svg += `<path d="${edge(-tr.wallD)}" fill="none" stroke="#a33" stroke-width="0.6"/>`;
  svg += `<path d="${edge(0)}" fill="none" stroke="#666" stroke-width="${tr.halfW * 2}" stroke-opacity="0.55"/>`;
  for (let t = 0; t < 1; t += 0.05) {
    const p = tr.pointAt(t * tr.L, 0);
    svg += `<circle cx="${X(p.x)}" cy="${Z(p.z)}" r="1.5" fill="#00f"/><text x="${X(p.x + 4)}" y="${Z(p.z)}" font-size="7" fill="#003">${t.toFixed(2)}</text>`;
  }
  const s0 = tr.pointAt(0, -tr.halfW), s1 = tr.pointAt(0, tr.halfW);
  svg += `<line x1="${X(s0.x)}" y1="${Z(s0.z)}" x2="${X(s1.x)}" y2="${Z(s1.z)}" stroke="#fff" stroke-width="2"/>`;
  // richting: pijltje
  const a = tr.pointAt(10, 0), b = tr.pointAt(25, 0);
  svg += `<line x1="${X(a.x)}" y1="${Z(a.z)}" x2="${X(b.x)}" y2="${Z(b.z)}" stroke="#0a0" stroke-width="2.5"/>`;
  for (const o of tr.obstacles) svg += `<circle cx="${X(o.x)}" cy="${Z(o.z)}" r="${o.r}" fill="#840"/>`;
  for (const bx of tr.itemBoxes) svg += `<rect x="${+X(bx.x) - 1}" y="${+Z(bx.z) - 1}" width="2" height="2" fill="#f0f"/>`;
  for (const bp of tr.boostPads) svg += `<circle cx="${X(bp.x)}" cy="${Z(bp.z)}" r="2.5" fill="#f80"/>`;
  for (const hz of tr.hazards) {
    const p0 = tr.pointAt(hz.s, -hz.amp), p1 = tr.pointAt(hz.s, hz.amp);
    svg += `<line x1="${X(p0.x)}" y1="${Z(p0.z)}" x2="${X(p1.x)}" y2="${Z(p1.z)}" stroke="#c0c" stroke-width="2"/>`;
  }
  for (const zn of tr.zones) {
    for (let s = zn.s0; s < zn.s1; s += 3) {
      const p = tr.pointAt(s, (Math.max(zn.d0, -tr.wallD) + Math.min(zn.d1, tr.wallD)) / 2);
      svg += `<circle cx="${X(p.x)}" cy="${Z(p.z)}" r="2" fill="${zn.type === 'ijs' ? '#6cf' : '#753'}" fill-opacity="0.6"/>`;
    }
  }
  const tight = [];
  for (let i = 0; i < tr.N; i++) {
    const r = 1 / Math.max(1e-6, Math.abs(tr.curv[i]));
    if (r < tr.wallD) { svg += `<circle cx="${X(tr.px[i])}" cy="${Z(tr.pz[i])}" r="2" fill="red"/>`; tight.push((i / tr.N).toFixed(3) + ':' + r.toFixed(1)); }
  }
  if (tight.length) console.log('   krap (r<wallD):', tight.filter((_, k) => k % 4 === 0).join(' '));
  svg += `<text x="4" y="10" font-size="9">${def.name} — ${tr.L.toFixed(0)} m — minR ${v.minRadius.toFixed(1)} — minSep ${v.minSeparation.toFixed(1)} ${v.ok ? 'OK' : 'PROBLEEM'}</text>`;
  svg += '</svg>';
  writeFileSync(`${outDir}/${def.id}.svg`, svg);
  console.log(def.id.padEnd(16), tr.L.toFixed(0).padStart(5) + 'm', v.ok ? 'OK' : 'PROBLEEM: ' + v.problems.join('; '));
}
