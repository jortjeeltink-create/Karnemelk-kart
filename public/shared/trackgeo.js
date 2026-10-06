// Bouwt uit een baandefinitie (controlepunten) een bruikbare baan:
// een gladde middenlijn met vaste tussenafstand, breedte, en hulpfuncties
// om te bepalen waar een kart zich op de baan bevindt.
import { KART_RADIUS } from './constants.js';
import { clamp } from './util.js';

const SPACING = 1.0; // meter tussen twee punten op de middenlijn

function catmullRomClosed(points, perSeg = 40) {
  const n = points.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    // centripetale Catmull-Rom (geen lussen of punten in bochten)
    const t0 = 0;
    const t1 = t0 + Math.pow(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), 0.5) || 1e-4;
    const t2 = t1 + Math.pow(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), 0.5) || 1e-4;
    const t3 = t2 + Math.pow(Math.hypot(p3[0] - p2[0], p3[1] - p2[1]), 0.5) || 1e-4;
    for (let j = 0; j < perSeg; j++) {
      const t = t1 + ((t2 - t1) * j) / perSeg;
      const pt = [0, 0];
      for (let k = 0; k < 2; k++) {
        const A1 = ((t1 - t) / (t1 - t0)) * p0[k] + ((t - t0) / (t1 - t0)) * p1[k];
        const A2 = ((t2 - t) / (t2 - t1)) * p1[k] + ((t - t1) / (t2 - t1)) * p2[k];
        const A3 = ((t3 - t) / (t3 - t2)) * p2[k] + ((t - t2) / (t3 - t2)) * p3[k];
        const B1 = ((t2 - t) / (t2 - t0)) * A1 + ((t - t0) / (t2 - t0)) * A2;
        const B2 = ((t3 - t) / (t3 - t1)) * A2 + ((t - t1) / (t3 - t1)) * A3;
        pt[k] = ((t2 - t) / (t2 - t1)) * B1 + ((t - t1) / (t2 - t1)) * B2;
      }
      out.push(pt);
    }
  }
  return out;
}

export function buildTrack(def) {
  const dense = catmullRomClosed(def.points.map((p) => [p[0] * (def.scale || 1), p[1] * (def.scale || 1)]));
  // cumulatieve lengte van de dichte lijn
  const dl = [0];
  for (let i = 1; i <= dense.length; i++) {
    const a = dense[i - 1];
    const b = dense[i % dense.length];
    dl.push(dl[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = dl[dense.length];
  const N = Math.round(total / SPACING);
  const step = total / N;
  const px = new Float64Array(N), pz = new Float64Array(N);
  let j = 0;
  for (let i = 0; i < N; i++) {
    const target = i * step;
    while (dl[j + 1] < target) j++;
    const a = dense[j], b = dense[(j + 1) % dense.length];
    const f = (target - dl[j]) / (dl[j + 1] - dl[j] || 1);
    px[i] = a[0] + (b[0] - a[0]) * f;
    pz[i] = a[1] + (b[1] - a[1]) * f;
  }
  const tx = new Float64Array(N), tz = new Float64Array(N);
  const nx = new Float64Array(N), nz = new Float64Array(N);
  const heading = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const a = (i - 2 + N) % N, b = (i + 2) % N;
    let dx = px[b] - px[a], dz = pz[b] - pz[a];
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    tx[i] = dx; tz[i] = dz;
    // rechts van de rijrichting (zie physics.js voor de conventie)
    nx[i] = -dz; nz[i] = dx;
    heading[i] = Math.atan2(dx, dz);
  }
  // kromming (1/straal) per punt, voor bots en controles
  const curv = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const a = (i - 3 + N) % N, b = (i + 3) % N;
    let d = heading[b] - heading[a];
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    curv[i] = d / (6 * step);
  }

  const halfW = (def.width || 16) / 2;
  const shoulder = def.shoulder ?? 6;
  const wallD = halfW + shoulder;

  // ruimtelijk raster zodat we snel het dichtstbijzijnde baanpunt vinden
  const CELL = 16;
  const grid = new Map();
  const cellKey = (cx, cz) => cx * 73856093 ^ cz * 19349663;
  for (let i = 0; i < N; i++) {
    const cx = Math.floor(px[i] / CELL), cz = Math.floor(pz[i] / CELL);
    const k = cellKey(cx, cz);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(i);
  }

  const track = {
    def, id: def.id, N, L: total, step, px, pz, tx, tz, nx, nz, heading, curv,
    halfW, shoulder, wallD,
    limit: wallD - KART_RADIUS,
  };

  // Zoek het dichtstbijzijnde punt; met hint (vorige index) lokaal en snel.
  track.locate = function (x, z, hint = -1) {
    let best = -1, bestD = Infinity;
    if (hint >= 0) {
      for (let o = -25; o <= 25; o++) {
        const i = (hint + o + N) % N;
        const dx = x - px[i], dz = z - pz[i];
        const d2 = dx * dx + dz * dz;
        if (d2 < bestD) { bestD = d2; best = i; }
      }
      if (bestD > (wallD + 6) ** 2) best = -1;
    }
    if (best < 0) {
      bestD = Infinity;
      const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
      for (let r = 0; r <= 6 && best < 0; r++) {
        for (let gx = cx - r; gx <= cx + r; gx++) {
          for (let gz = cz - r; gz <= cz + r; gz++) {
            if (Math.max(Math.abs(gx - cx), Math.abs(gz - cz)) !== r) continue;
            const list = grid.get(cellKey(gx, gz));
            if (!list) continue;
            for (const i of list) {
              const dx = x - px[i], dz = z - pz[i];
              const d2 = dx * dx + dz * dz;
              if (d2 < bestD) { bestD = d2; best = i; }
            }
          }
        }
        if (best >= 0 && r < 6) {
          // één ring extra om zeker te zijn van de echte dichtstbijzijnde
          const r2 = r + 1;
          for (let gx = cx - r2; gx <= cx + r2; gx++) {
            for (let gz = cz - r2; gz <= cz + r2; gz++) {
              if (Math.max(Math.abs(gx - cx), Math.abs(gz - cz)) !== r2) continue;
              const list = grid.get(cellKey(gx, gz));
              if (!list) continue;
              for (const i of list) {
                const dx = x - px[i], dz = z - pz[i];
                const d2 = dx * dx + dz * dz;
                if (d2 < bestD) { bestD = d2; best = i; }
              }
            }
          }
        }
      }
      if (best < 0) {
        for (let i = 0; i < N; i++) {
          const dx = x - px[i], dz = z - pz[i];
          const d2 = dx * dx + dz * dz;
          if (d2 < bestD) { bestD = d2; best = i; }
        }
      }
    }
    const i = best;
    const dx = x - px[i], dz = z - pz[i];
    const along = dx * tx[i] + dz * tz[i];
    const d = dx * nx[i] + dz * nz[i];
    let s = i * step + along;
    if (s < 0) s += total;
    if (s >= total) s -= total;
    return { i, s, d };
  };

  // Wereldpositie op afstand s langs de baan en d opzij (rechts positief)
  track.pointAt = function (s, d = 0) {
    s = ((s % total) + total) % total;
    const f = s / step;
    const i = Math.floor(f) % N;
    const k = (i + 1) % N;
    const u = f - Math.floor(f);
    const cx = px[i] + (px[k] - px[i]) * u;
    const cz = pz[i] + (pz[k] - pz[i]) * u;
    const ux = nx[i] + (nx[k] - nx[i]) * u;
    const uz = nz[i] + (nz[k] - nz[i]) * u;
    const ul = Math.hypot(ux, uz) || 1;
    let hd = heading[k] - heading[i];
    while (hd > Math.PI) hd -= Math.PI * 2;
    while (hd < -Math.PI) hd += Math.PI * 2;
    return { x: cx + (ux / ul) * d, z: cz + (uz / ul) * d, h: heading[i] + hd * u, i };
  };

  track.indexAt = (s) => Math.floor((((s % total) + total) % total) / step) % N;

  // ---- objecten op de baan ----
  track.obstacles = (def.obstacles || []).map((o, idx) => {
    const p = track.pointAt(o.t * total, o.d);
    return { id: idx, kind: o.kind, r: o.r || 1.4, x: p.x, z: p.z, h: p.h, s: o.t * total, d: o.d };
  });

  track.boostPads = (def.boostPads || []).map((b) => {
    const s = b.t * total;
    const p = track.pointAt(s + 3, b.d || 0);
    return { s, d: b.d || 0, len: 7, halfW: b.w || 3, x: p.x, z: p.z, h: p.h };
  });

  track.itemBoxes = [];
  for (const row of def.itemRows || []) {
    const s = (typeof row === 'number' ? row : row.t) * total;
    const count = 4;
    const spread = Math.min(halfW - 2, 6);
    for (let c = 0; c < count; c++) {
      const d = -spread + (2 * spread * c) / (count - 1);
      const p = track.pointAt(s, d);
      track.itemBoxes.push({ id: track.itemBoxes.length, x: p.x, z: p.z, s, d });
    }
  }

  track.zones = (def.zones || []).map((zn) => ({
    type: zn.type, s0: zn.t0 * total, s1: zn.t1 * total, d0: zn.d0 ?? -wallD, d1: zn.d1 ?? wallD,
  }));

  track.hazards = (def.hazards || []).map((hz, idx) => {
    const s = hz.t * total;
    return { id: idx, kind: hz.kind, s, r: hz.r || 2.2, amp: hz.amp ?? halfW + 2, period: hz.period || 6, phase: hz.phase || 0 };
  });

  // positie van een bewegend obstakel op racetijd t (deterministisch!)
  track.hazardPos = function (hz, time) {
    const w = (Math.PI * 2) / hz.period;
    const d = hz.amp * Math.sin(time * w + hz.phase);
    const p = track.pointAt(hz.s, d);
    const dir = Math.cos(time * w + hz.phase) >= 0 ? 1 : -1;
    return { x: p.x, z: p.z, h: p.h + (dir > 0 ? Math.PI / 2 : -Math.PI / 2), d };
  };

  track.zoneAt = function (s, d) {
    for (const zn of track.zones) {
      const inS = zn.s0 <= zn.s1 ? s >= zn.s0 && s <= zn.s1 : s >= zn.s0 || s <= zn.s1;
      if (inS && d >= zn.d0 && d <= zn.d1) return zn.type;
    }
    return null;
  };

  // startopstelling: twee aan twee achter de startlijn
  track.gridSlot = function (slot) {
    const row = Math.floor(slot / 2);
    const lane = slot % 2 === 0 ? -1 : 1;
    const s = total - 7 - row * 6.5 - (lane > 0 ? 2.5 : 0);
    const d = lane * Math.min(3.6, halfW - 2.2);
    const p = track.pointAt(s, d);
    return { x: p.x, z: p.z, h: p.h, s };
  };

  // hoeveel de baan in de komende afstand draait (voor bots)
  track.turnAhead = function (s, dist) {
    const i0 = track.indexAt(s), i1 = track.indexAt(s + dist);
    let d = heading[i1] - heading[i0];
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  };

  track.clampLateral = (d) => clamp(d, -halfW + 1.5, halfW - 1.5);
  return track;
}

// Controle voor tests: botst de baan met zichzelf of zijn bochten te krap?
export function validateTrack(track) {
  const problems = [];
  const { N, px, pz, curv, wallD, step } = track;
  let minR = Infinity;
  for (let i = 0; i < N; i++) {
    const r = 1 / Math.max(1e-6, Math.abs(curv[i]));
    if (r < minR) minR = r;
  }
  if (minR < Math.max(track.halfW + 3, track.wallD * 0.9)) problems.push(`te krappe bocht: straal ${minR.toFixed(1)}m`);
  // twee stukken baan die niet aan elkaar grenzen moeten ver genoeg uit elkaar liggen
  let minSep = Infinity;
  const skip = Math.ceil((wallD * 3.2) / step);
  for (let i = 0; i < N; i += 2) {
    for (let j = i + skip; j < N; j += 2) {
      if (N - (j - i) < skip) continue;
      const d = Math.hypot(px[i] - px[j], pz[i] - pz[j]);
      if (d < minSep) minSep = d;
    }
  }
  if (minSep < wallD * 2 + 4) problems.push(`baandelen te dicht bij elkaar: ${minSep.toFixed(1)}m`);
  return { ok: problems.length === 0, problems, minRadius: minR, minSeparation: minSep, length: track.L };
}
