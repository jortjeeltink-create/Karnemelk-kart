// Compacte berichten tussen server en browser.
import { driftLevel } from './physics.js';
import { round } from './util.js';

// Volledige status van je eigen kart (nodig om voorspelling te corrigeren)
export const FULL_FIELDS = [
  'x', 'z', 'h', 'vx', 'vz', 'drift', 'driftT', 'hopT', 'boostT', 'bumpT', 'spinT', 'shieldT',
  'item', 'itemN', 'itemRoll', 'pd', 'pi', 'lap', 'cp', 'lapStart', 'bestLap', 'finished', 'finishTime',
  'wrongT', 'ack', 'place', 'maxMul', 'y', 'vy', 'air', 'airT', 'ramp',
];

export function encodeFull(k) {
  return FULL_FIELDS.map((f) => {
    const v = k[f] || 0;
    return Number.isInteger(v) ? v : round(v, 4);
  });
}

export function decodeFull(arr, target = {}) {
  for (let n = 0; n < FULL_FIELDS.length; n++) target[FULL_FIELDS[n]] = arr[n];
  return target;
}

export const F = {
  DRIFT_R: 1, DRIFT_L: 2, BOOST: 16, SHIELD: 32, SPIN: 64, BUMP: 128, HOP: 256, FINISHED: 512, CONNECTED: 1024,
};

// Wat iedereen van elke kart ziet
export function encodeVisual(k) {
  let flags = 0;
  if (k.drift > 0) flags |= F.DRIFT_R;
  if (k.drift < 0) flags |= F.DRIFT_L;
  flags |= driftLevel(k.driftT) << 2;
  if (k.boostT > 0) flags |= F.BOOST;
  if (k.shieldT > 0) flags |= F.SHIELD;
  if (k.spinT > 0) flags |= F.SPIN;
  if (k.bumpT > 0) flags |= F.BUMP;
  if (k.hopT > 0) flags |= F.HOP;
  if (k.finished) flags |= F.FINISHED;
  if (k.connected !== false) flags |= F.CONNECTED;
  return [k.kid, round(k.x, 2), round(k.z, 2), round(k.h, 3), round(k.vx, 1), round(k.vz, 1), flags, k.lap, k.place, k.item ? 1 : 0, round(k.y || 0, 2)];
}

export function decodeVisual(a) {
  const flags = a[6];
  return {
    kid: a[0], x: a[1], z: a[2], h: a[3], vx: a[4], vz: a[5], flags,
    drift: flags & F.DRIFT_R ? 1 : flags & F.DRIFT_L ? -1 : 0,
    driftLevel: (flags >> 2) & 3,
    boost: !!(flags & F.BOOST), shield: !!(flags & F.SHIELD), spin: !!(flags & F.SPIN),
    bump: !!(flags & F.BUMP), hop: !!(flags & F.HOP), finished: !!(flags & F.FINISHED), connected: !!(flags & F.CONNECTED),
    lap: a[7], place: a[8], hasItem: !!a[9], y: a[10] || 0,
  };
}

export function encodeEntity(e) {
  return [e.id, e.kind === 'plas' ? 1 : 2, round(e.x, 2), round(e.z, 2), round(e.h || 0, 2)];
}

export function decodeEntity(a) {
  return { id: a[0], kind: a[1] === 1 ? 'plas' : 'klomp', x: a[2], z: a[3], h: a[4] };
}

// Invoer: [stuur -100..100, knoppen-bits]
export function encodeInput(inp) {
  return [Math.round(inp.steer * 100), (inp.gas ? 1 : 0) | (inp.brake ? 2 : 0) | (inp.drift ? 4 : 0) | (inp.item ? 8 : 0)];
}

export function decodeInput(a) {
  return { steer: Math.max(-1, Math.min(1, (a[0] | 0) / 100)), gas: !!(a[1] & 1), brake: !!(a[1] & 2), drift: !!(a[1] & 4), item: !!(a[1] & 8) };
}
