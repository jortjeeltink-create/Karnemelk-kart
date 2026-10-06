// Computergestuurde coureurs (oefenmodus en aanvullen in een room) en de
// automatische piloot nadat je gefinisht bent.
import { DT, PHYS } from './constants.js';
import { clamp } from './util.js';
import { ITEM } from './items.js';

export const BOT_LEVELS = {
  makkelijk: { name: 'Makkelijk', speed: [0.8, 0.86], items: 0.4 },
  normaal: { name: 'Normaal', speed: [0.88, 0.94], items: 0.75 },
  moeilijk: { name: 'Moeilijk', speed: [0.95, 0.99], items: 1 },
};

const wrapDs = (ds, L) => (ds < -L / 2 ? ds + L : ds > L / 2 ? ds - L : ds);

export function initBot(k, level, rand) {
  const lv = BOT_LEVELS[level] || BOT_LEVELS.normaal;
  k.maxMul = lv.speed[0] + (lv.speed[1] - lv.speed[0]) * rand();
  k.baseMul = k.maxMul;
  k.bot = {
    lane: (rand() - 0.5) * 6,
    laneGoal: 0,
    nextLane: 1 + rand() * 3,
    stuckT: 0,
    revT: 0,
    holdT: 0,
    itemSkill: lv.items,
    phase: rand() * 10,
    rand,
  };
  k.bot.laneGoal = k.bot.lane;
}

// ctx = { karts, entities, time }
export function botInput(k, track, ctx, autopilot = false) {
  const b = k.bot || (k.bot = { lane: 0, laneGoal: 0, nextLane: 2, stuckT: 0, revT: 0, holdT: 0, itemSkill: 0, phase: 0, rand: Math.random });
  const L = track.L;
  const fx = Math.sin(k.h), fz = Math.cos(k.h);
  const rx = -fz, rz = fx;
  const vf = k.vx * fx + k.vz * fz;
  const speed = Math.hypot(k.vx, k.vz);

  // af en toe van rijstrook wisselen voor wat variatie
  if (!autopilot) {
    b.nextLane -= DT;
    if (b.nextLane <= 0) {
      b.nextLane = 2 + b.rand() * 4;
      b.laneGoal = (b.rand() - 0.5) * (track.halfW * 1.1);
    }
  }
  let lane = autopilot ? 0 : b.laneGoal;

  // richting itemdozen als je niks hebt
  if (!autopilot && !k.item && track.itemBoxes.length) {
    for (const box of track.itemBoxes) {
      const ds = wrapDs(box.s - k.s, L);
      if (ds > 5 && ds < 35) { lane = box.d; break; }
    }
  }

  // obstakels ontwijken (vast, bewegend en plassen)
  const avoid = (os, od, r) => {
    const ds = wrapDs(os - k.s, L);
    if (ds > 0 && ds < 32 && Math.abs(od - lane) < r + 2.6) {
      const left = od - r - 3.2, right = od + r + 3.2;
      lane = Math.abs(left - k.d) < Math.abs(right - k.d) && left > -track.halfW + 1.5 ? left : right < track.halfW - 1.5 ? right : left;
    }
  };
  for (const o of track.obstacles) avoid(o.s, o.d, o.r);
  if (ctx && ctx.entities) {
    for (const e of ctx.entities) if (e.kind === 'plas') avoid(e.s ?? -1e9, e.d ?? 0, 2.2);
  }
  for (const hz of track.hazards) {
    const p = track.hazardPos(hz, (ctx && ctx.time) || 0);
    avoid(hz.s, p.d, hz.r + 1);
  }
  lane = track.clampLateral(lane);
  b.lane += (lane - b.lane) * Math.min(1, DT * 3.5);

  const look = 7 + Math.max(0, vf) * 0.5;
  const tgt = track.pointAt(k.s + look, b.lane);
  const dx = tgt.x - k.x, dz = tgt.z - k.z;
  const lx = dx * rx + dz * rz;
  const lz = dx * fx + dz * fz;
  let steer = clamp(Math.atan2(lx, lz) * 2.4, -1, 1);

  // gas terug voor scherpe bochten
  const turn = Math.abs(track.turnAhead(k.s + 5, 22 + Math.max(0, vf) * 0.7));
  const maxS = PHYS.maxSpeed * (k.maxMul || 1);
  let desired = maxS * (turn > 1.3 ? 0.66 : turn > 0.9 ? 0.78 : turn > 0.6 ? 0.9 : 1);
  if (autopilot) desired = Math.min(desired, PHYS.maxSpeed * 0.62);
  let gas = vf < desired;
  let brake = vf > desired + 5;

  // vast? even achteruit
  if (speed < 1.5 && ((ctx && ctx.time) || 0) > 2 && k.spinT <= 0) b.stuckT += DT;
  else b.stuckT = Math.max(0, b.stuckT - DT);
  if (b.stuckT > 1.3) { b.revT = 1.1; b.stuckT = 0; }
  if (b.revT > 0) {
    b.revT -= DT;
    return { steer: -steer, gas: false, brake: true, drift: false, item: false };
  }
  // verkeerde kant op: hard bijsturen
  if (k.wrongT > 1) steer = steer >= 0 ? 1 : -1;

  let item = false;
  if (!autopilot && k.item && k.itemRoll <= 0 && b.itemSkill > 0) {
    b.holdT += DT;
    const karts = (ctx && ctx.karts) || [];
    let wants = false;
    if (k.item === ITEM.TURBO || k.item === ITEM.TURBO3) {
      wants = Math.abs(track.turnAhead(k.s, 45)) < 0.35 && b.holdT > 0.6;
    } else if (k.item === ITEM.SCHILD) {
      wants = b.holdT > 3 || karts.some((o) => o !== k && Math.hypot(o.x - k.x, o.z - k.z) < 9);
    } else if (k.item === ITEM.PLAS) {
      wants = b.holdT > 9 || karts.some((o) => {
        if (o === k) return false;
        const ox = o.x - k.x, oz = o.z - k.z;
        return ox * fx + oz * fz < -2 && Math.hypot(ox, oz) < 18;
      });
    } else if (k.item === ITEM.KLOMP) {
      wants = b.holdT > 10 || karts.some((o) => {
        if (o === k) return false;
        const ox = o.x - k.x, oz = o.z - k.z;
        const ahead = ox * fx + oz * fz;
        const side = Math.abs(ox * rx + oz * rz);
        return ahead > 4 && ahead < 40 && side < 2.5;
      });
    }
    if (wants && b.rand() < b.itemSkill) item = !k.pi;
    if (item) b.holdT = 0;
  }
  return { steer, gas, brake, drift: false, item };
}

// Na de finish rijdt je kart rustig verder.
export function autopilotInput(k, track) {
  return botInput(k, track, null, true);
}
