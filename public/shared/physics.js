// Kartfysica. Draait identiek op de server (de baas) en in de browser (voorspelling),
// zodat je eigen kart direct reageert en toch iedereen hetzelfde ziet.
//
// Conventie: kijkrichting = (sin h, cos h) in het x/z-vlak. Sturen naar rechts
// (steer > 0) verkleint h. Rechts van de kart = (-cos h, sin h).
import { DT, PHYS, DRIFT_LEVELS, DRIFT_BOOST, KART_RADIUS, LAPS, JUMP, SECRET_BOOST } from './constants.js';
import { clamp } from './util.js';
import { ITEM } from './items.js';

export const NO_INPUT = Object.freeze({ steer: 0, gas: false, brake: false, drift: false, item: false, boost: false });

export function createKart(kid, track, slot) {
  const g = track.gridSlot(slot);
  const loc = track.locate(g.x, g.z);
  return {
    kid, x: g.x, z: g.z, h: g.h, vx: 0, vz: 0, y: 0, vy: 0, air: 0, airT: 0, ramp: 0,
    i: loc.i, s: loc.s, d: loc.d, lap: 0, cp: 0,
    drift: 0, driftT: 0, hopT: 0,
    boostT: 0, bumpT: 0, spinT: 0, shieldT: 0,
    item: 0, itemN: 0, itemRoll: 0,
    pd: 0, pi: 0, wrongT: 0,
    finished: 0, finishTime: 0, lapStart: 0, bestLap: 0,
    place: slot + 1, ack: 0, maxMul: 1,
    sec: 0, secT: 0, // geheime boostknop: mag het (1/0) en hoe lang nog wachten
  };
}

export function driftLevel(t) {
  return t >= DRIFT_LEVELS[2] ? 3 : t >= DRIFT_LEVELS[1] ? 2 : t >= DRIFT_LEVELS[0] ? 1 : 0;
}

export function raceDistance(k, track) {
  return k.lap === 0 ? k.s - track.L : (k.lap - 1) * track.L + k.s;
}

function emit(env, type, data) {
  if (env && env.emit) env.emit(type, data);
}

function useItem(k, inp, env) {
  const fx = Math.sin(k.h), fz = Math.cos(k.h);
  switch (k.item) {
    case ITEM.TURBO:
      k.boostT = Math.max(k.boostT, 1.5);
      k.item = 0; k.itemN = 0;
      emit(env, 'boost', { kid: k.kid, src: 'item' });
      break;
    case ITEM.TURBO3:
      k.boostT = Math.max(k.boostT, 1.5);
      k.itemN -= 1;
      if (k.itemN <= 0) { k.item = 0; k.itemN = 0; }
      emit(env, 'boost', { kid: k.kid, src: 'item' });
      break;
    case ITEM.SCHILD:
      k.shieldT = 8;
      k.item = 0; k.itemN = 0;
      emit(env, 'shield', { kid: k.kid });
      break;
    case ITEM.PLAS:
      emit(env, 'spawn', { kind: 'plas', owner: k.kid, x: k.x - fx * 3.4, z: k.z - fz * 3.4, h: k.h });
      k.item = 0; k.itemN = 0;
      break;
    case ITEM.KLOMP: {
      const back = !!inp.brake;
      const dir = back ? -1 : 1;
      const vf = k.vx * fx + k.vz * fz;
      const speed = back ? 30 : Math.max(0, vf) + 34;
      emit(env, 'spawn', { kind: 'klomp', owner: k.kid, x: k.x + fx * 2.6 * dir, z: k.z + fz * 2.6 * dir, h: back ? k.h + Math.PI : k.h, speed });
      k.item = 0; k.itemN = 0;
      break;
    }
    default:
      break;
  }
}

// Eén fysicastap van 1/60 seconde. env = { time, emit(type, data), autopilot(k) }
export function stepKart(k, inp, track, env) {
  const dt = DT;
  const P = PHYS;
  if (k.finished && env && env.autopilot) inp = env.autopilot(k);
  inp = inp || NO_INPUT;

  // timers
  if (k.boostT > 0) k.boostT = Math.max(0, k.boostT - dt);
  if (k.bumpT > 0) k.bumpT = Math.max(0, k.bumpT - dt);
  if (k.spinT > 0) k.spinT = Math.max(0, k.spinT - dt);
  if (k.shieldT > 0) k.shieldT = Math.max(0, k.shieldT - dt);
  if (k.hopT > 0) k.hopT = Math.max(0, k.hopT - dt);
  if (k.itemRoll > 0) k.itemRoll = Math.max(0, k.itemRoll - dt);
  if (k.secT > 0) k.secT = Math.max(0, k.secT - dt);

  let steer = clamp(+inp.steer || 0, -1, 1);
  let gas = !!inp.gas;
  let brake = !!inp.brake;
  const drift = !!inp.drift;
  const useItemBtn = !!inp.item;
  const driftEdge = drift && !k.pd;
  const itemEdge = useItemBtn && !k.pi;
  k.pd = drift ? 1 : 0;
  k.pi = useItemBtn ? 1 : 0;

  // geheime boostknop: ziet er voor anderen uit als een gewoon boostvak
  if (inp.boost && k.sec && !(k.secT > 0) && !k.finished) {
    k.secT = SECRET_BOOST.cooldown;
    if (k.boostT < 0.9) emit(env, 'boost', { kid: k.kid, src: 'pad' });
    k.boostT = Math.max(k.boostT, SECRET_BOOST.time);
  }

  const spinning = k.spinT > 0;
  if (spinning) { steer = 0; gas = false; brake = false; }

  if (itemEdge && k.item && k.itemRoll <= 0 && !spinning) useItem(k, inp, env);

  // ondergrond
  const loc = track.locate(k.x, k.z, k.i);
  const inAir = k.air > 0;
  const offroad = !inAir && Math.abs(loc.d) > track.halfW + 0.4;
  const zone = !inAir && track.zones.length ? track.zoneAt(loc.s, loc.d) : null;
  let maxSpd = P.maxSpeed * (k.maxMul || 1);
  let grip = P.grip;
  if (offroad) maxSpd *= k.boostT > 0 ? 0.9 : P.offroadFactor;
  if (zone === 'modder') maxSpd *= k.boostT > 0 ? 0.9 : P.mudFactor;
  if (zone === 'water' || zone === 'lava') maxSpd *= k.boostT > 0 ? 0.75 : P.waterFactor;
  if (zone === 'lava' && k.shieldT <= 0) k.bumpT = Math.max(k.bumpT, 0.15); // au, heet!
  if (zone === 'ijs') grip = P.iceGrip;
  if (k.boostT > 0) maxSpd *= P.boostFactor;
  if (k.bumpT > 0) maxSpd *= P.bumpFactor;
  k.surface = inAir ? 'lucht' : zone || (offroad ? 'berm' : 'weg');

  // sturen en driften
  const fx0 = Math.sin(k.h), fz0 = Math.cos(k.h);
  let vf = k.vx * fx0 + k.vz * fz0;
  const speedAbs = Math.abs(vf);
  let yaw = 0;

  if (driftEdge && k.hopT <= 0 && !spinning && !inAir) {
    k.hopT = 0.3;
    emit(env, 'hop', { kid: k.kid });
  }
  // drift start tijdens het hupje zodra je stuurt
  if (!k.drift && drift && k.hopT > 0 && Math.abs(steer) > 0.3 && vf > 9 && !spinning) {
    k.drift = steer > 0 ? 1 : -1;
    k.driftT = 0;
  }
  if (k.drift) {
    if (!drift || vf < 7 || spinning || k.bumpT > 0.35) {
      const lvl = driftLevel(k.driftT);
      if (!drift && lvl > 0 && !spinning) {
        k.boostT = Math.max(k.boostT, DRIFT_BOOST[lvl]);
        emit(env, 'miniturbo', { kid: k.kid, level: lvl });
      }
      k.drift = 0;
      k.driftT = 0;
    } else {
      const sd = steer * k.drift; // in de bocht mee (+) of tegen (-)
      k.driftT += dt * (sd > 0.25 ? 1.25 : sd < -0.25 ? 0.7 : 1.0);
      yaw = k.drift * P.turnRate * (0.62 + 0.42 * (sd + 1) * 0.5);
      vf *= 1 - 0.05 * dt;
    }
  }
  if (!k.drift) {
    const sf = clamp(speedAbs / 7, 0, 1);
    const hi = 1 - 0.36 * clamp(speedAbs / P.maxSpeed, 0, 1);
    yaw = steer * P.turnRate * sf * hi * (vf < -0.5 ? -1 : 1);
  }
  if (inAir) yaw *= JUMP.airSteer;
  k.h -= yaw * dt;
  if (k.h > Math.PI) k.h -= Math.PI * 2;
  else if (k.h < -Math.PI) k.h += Math.PI * 2;

  // snelheid vooruit / zijwaarts
  const fx = Math.sin(k.h), fz = Math.cos(k.h);
  const rx = -fz, rz = fx;
  vf = k.vx * fx + k.vz * fz;
  let vr = k.vx * rx + k.vz * rz;
  if (inAir) {
    // vliegen: snelheid blijft, alleen turbo duwt nog
    if (k.boostT > 0 && vf < maxSpd) vf = Math.min(maxSpd, vf + P.boostAccel * 0.5 * dt);
    vr *= Math.exp(-1.5 * dt);
  } else if (spinning) {
    const damp = Math.exp(-2.4 * dt);
    vf *= damp; vr *= damp;
  } else {
    if (gas && vf < maxSpd) {
      vf = Math.min(maxSpd, vf + P.accel * (1 - 0.55 * Math.max(0, vf) / maxSpd) * dt);
    } else if (vf > maxSpd) {
      vf -= Math.min(vf - maxSpd, ((vf - maxSpd) * 2.2 + 3) * dt);
    }
    if (k.boostT > 0 && vf < maxSpd) vf = Math.min(maxSpd, vf + P.boostAccel * dt);
    if (brake) {
      if (vf > 0.3) vf -= P.brake * dt;
      else vf = Math.max(-P.maxReverse, vf - P.reverseAccel * dt);
    }
    if (!gas && !brake && k.boostT <= 0) vf -= Math.sign(vf) * Math.min(Math.abs(vf), P.coast * dt);
    const g = k.drift ? P.driftGrip * (grip / P.grip) : grip;
    vr *= Math.exp(-g * dt);
    if (k.drift) vr -= k.drift * 2.2 * dt * clamp(vf / P.maxSpeed, 0, 1);
  }
  k.vx = fx * vf + rx * vr;
  k.vz = fz * vf + rz * vr;
  k.x += k.vx * dt;
  k.z += k.vz * dt;

  // hoogte: vliegen en landen
  if (k.air) {
    k.vy -= JUMP.gravity * dt;
    k.y += k.vy * dt;
    k.airT += dt;
    if (k.y <= 0) {
      const impact = -k.vy;
      k.y = 0; k.vy = 0; k.air = 0;
      if (k.airT >= JUMP.minAir && k.spinT <= 0) {
        k.boostT = Math.max(k.boostT, JUMP.landBoost);
        emit(env, 'boost', { kid: k.kid, src: 'land' });
      }
      emit(env, 'land', { kid: k.kid, p: Math.round(impact * 10) / 10, x: k.x, z: k.z });
      k.airT = 0;
    }
  }

  // muren
  let l2 = track.locate(k.x, k.z, loc.i);
  if (Math.abs(l2.d) > track.limit) {
    const sg = l2.d > 0 ? 1 : -1;
    const nx = track.nx[l2.i] * sg, nz = track.nz[l2.i] * sg;
    const pen = Math.abs(l2.d) - track.limit;
    k.x -= nx * pen; k.z -= nz * pen;
    const vn = k.vx * nx + k.vz * nz;
    if (vn > 0) {
      k.vx -= nx * vn * (1 + P.wallBounce);
      k.vz -= nz * vn * (1 + P.wallBounce);
      const scrub = clamp(1 - vn * 0.022, 0.62, 0.98);
      k.vx *= scrub; k.vz *= scrub;
      if (vn > 6) {
        k.bumpT = Math.max(k.bumpT, 0.22);
        emit(env, 'wall', { kid: k.kid, x: k.x + nx * 1.2, z: k.z + nz * 1.2, p: vn });
      }
    }
    l2 = track.locate(k.x, k.z, l2.i);
  }

  // vaste obstakels
  for (const o of track.obstacles) {
    if (k.y > 1.2) break; // eroverheen gesprongen
    const dx = k.x - o.x, dz = k.z - o.z;
    const rr = o.r + KART_RADIUS;
    const d2 = dx * dx + dz * dz;
    if (d2 < rr * rr) {
      const d = Math.sqrt(d2) || 0.01;
      const nx = dx / d, nz = dz / d;
      k.x = o.x + nx * rr; k.z = o.z + nz * rr;
      const vn = k.vx * nx + k.vz * nz;
      if (vn < 0) {
        k.vx -= nx * vn * 1.45; k.vz -= nz * vn * 1.45;
        k.vx *= 0.72; k.vz *= 0.72;
        if (-vn > 4 && k.shieldT <= 0) {
          k.bumpT = Math.max(k.bumpT, 0.5);
          emit(env, 'obstacle', { kid: k.kid, x: o.x + nx * o.r, z: o.z + nz * o.r, p: -vn });
        }
      }
    }
  }

  // bewegende obstakels (koe, tram, ...): positie hangt alleen af van de racetijd
  if (track.hazards.length && env && k.y < 1.6) {
    for (const hz of track.hazards) {
      const p = track.hazardPos(hz, env.time || 0);
      const dx = k.x - p.x, dz = k.z - p.z;
      const rr = hz.r + KART_RADIUS;
      const d2 = dx * dx + dz * dz;
      if (d2 < rr * rr) {
        const d = Math.sqrt(d2) || 0.01;
        const nx = dx / d, nz = dz / d;
        k.x = p.x + nx * rr; k.z = p.z + nz * rr;
        const vn = k.vx * nx + k.vz * nz;
        if (vn < 6) { k.vx += nx * (6 - vn); k.vz += nz * (6 - vn); }
        k.vx *= 0.8; k.vz *= 0.8;
        if (k.shieldT <= 0 && k.bumpT < 0.3) {
          k.bumpT = 0.8;
          emit(env, 'hazard', { kid: k.kid, x: p.x, z: p.z, kind: hz.kind });
        }
      }
    }
  }

  // schansen: omhoog over de schans, en eraf = vliegen
  if (!k.air && track.ramps.length) {
    let on = null, ds = 0;
    for (const r of track.ramps) {
      let x = l2.s - r.s;
      if (x < -track.L / 2) x += track.L;
      else if (x > track.L / 2) x -= track.L;
      if (x >= 0 && x <= r.len && Math.abs(l2.d - r.d) <= r.halfW) { on = r; ds = x; break; }
    }
    if (on) {
      k.y = on.H * (ds / on.len);
      k.ramp = on.id + 1;
    } else if (k.ramp) {
      const r = track.ramps[k.ramp - 1];
      k.ramp = 0;
      const vfNow = k.vx * Math.sin(k.h) + k.vz * Math.cos(k.h);
      k.air = 1; k.airT = 0;
      k.vy = vfNow > JUMP.minSpeed && k.spinT <= 0 ? JUMP.launch * r.power * clamp(vfNow / P.maxSpeed, 0.55, 1.25) : 0;
      if (k.vy > 0) {
        if (k.drift) { k.drift = 0; k.driftT = 0; }
        emit(env, 'jump', { kid: k.kid, x: k.x, z: k.z });
      }
    } else if (k.y) k.y = 0;
  }

  // turbostroken
  for (const pad of track.boostPads) {
    if (k.air) break;
    let ds = l2.s - pad.s;
    if (ds < -track.L / 2) ds += track.L;
    if (ds >= 0 && ds <= pad.len && Math.abs(l2.d - pad.d) <= pad.halfW) {
      if (k.boostT < 0.9) emit(env, 'boost', { kid: k.kid, src: 'pad' });
      k.boostT = Math.max(k.boostT, 1.1);
    }
  }

  // voortgang, rondes en finish
  const prevS = k.s;
  k.s = l2.s; k.d = l2.d; k.i = l2.i;
  const L = track.L;

  // boostringen: vlieg (of rij) er dwars doorheen
  for (const rg of track.rings) {
    let a = prevS - rg.s, b = k.s - rg.s;
    if (a > L / 2) a -= L; else if (a < -L / 2) a += L;
    if (b > L / 2) b -= L; else if (b < -L / 2) b += L;
    if (a < 0 && b >= 0 && Math.abs(k.d - rg.d) < rg.r && Math.abs(k.y + 0.7 - rg.y) < rg.r) {
      k.boostT = Math.max(k.boostT, JUMP.ringBoost);
      emit(env, 'ring', { kid: k.kid, id: rg.id });
    }
  }
  if (!k.finished) {
    for (let c = 1; c <= 3; c++) {
      const cs = (L * c) / 4;
      if (prevS < cs && k.s >= cs && k.s - prevS < L / 2) k.cp |= 1 << (c - 1);
    }
    if (prevS > L * 0.75 && k.s < L * 0.25) {
      if (k.lap === 0 || k.cp === 7) {
        const t = env ? env.time || 0 : 0;
        if (k.lap > 0) {
          const lapTime = t - k.lapStart;
          if (!k.bestLap || lapTime < k.bestLap) k.bestLap = lapTime;
          k.lapStart = t;
        }
        k.lap += 1;
        k.cp = 0;
        if (k.lap > ((env && env.laps) || LAPS)) {
          k.finished = 1;
          k.finishTime = t;
          k.drift = 0; k.driftT = 0;
          emit(env, 'finish', { kid: k.kid, time: t });
        } else if (k.lap > 1) {
          emit(env, 'lap', { kid: k.kid, lap: k.lap });
        }
      }
    } else if (prevS < L * 0.25 && k.s > L * 0.75) {
      if (k.lap > 0 && k.cp === 0) { k.lap -= 1; k.cp = 7; }
    }
  }

  // verkeerde richting?
  const along = k.vx * track.tx[l2.i] + k.vz * track.tz[l2.i];
  const facing = Math.sin(k.h) * track.tx[l2.i] + Math.cos(k.h) * track.tz[l2.i];
  if ((along < -2 || (facing < -0.3 && Math.abs(along) < 3)) && !spinning) k.wrongT = Math.min(5, k.wrongT + dt);
  else k.wrongT = Math.max(0, k.wrongT - dt * 2);
}

// Raakt een kart door een plas of klomp: tollen (of het schild vangt het op)
export function hitKart(k) {
  if (k.shieldT > 0) {
    k.shieldT = 0;
    return 'schild';
  }
  k.spinT = 1.15;
  k.drift = 0; k.driftT = 0;
  k.boostT = 0;
  return 'tol';
}
