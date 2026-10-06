// Eén race in de browser: 3D-wereld, eigen kart (voorspeld), andere karts (live), camera en effecten.
import * as THREE from '../../vendor/three.module.min.js';
import { DT } from '../../shared/constants.js';
import { TRACK_BY_ID } from '../../shared/tracks.js';
import { buildTrack } from '../../shared/trackgeo.js';
import { decodeVisual, decodeEntity, decodeFull } from '../../shared/protocol.js';
import { driftLevel } from '../../shared/physics.js';
import { lerpAngle, wrapAngle, clamp } from '../../shared/util.js';
import { CHARACTER_BY_ID } from '../../shared/characters.js';
import { SHOP_BY_ID } from '../../shared/shop.js';
import { Predictor } from './predict.js';
import { buildWorld, plasMesh, klompMesh } from '../render/world.js';
import { KartView } from '../render/kart.js';
import { Effects } from '../render/effects.js';
import { Hud } from './hud.js';

const trackCache = new Map();
export function getTrack(id) {
  if (!trackCache.has(id)) trackCache.set(id, buildTrack(TRACK_BY_ID[id]));
  return trackCache.get(id);
}

const INTERP_MS = 110;
const LOCAL_TYPES = new Set(['boost', 'miniturbo', 'wall', 'obstacle', 'hazard', 'lap', 'finish', 'shield', 'spawn', 'hop']);
const DRIFT_COLORS = ['#d8d8d8', '#ffffff', '#ffd23f', '#ff5fd2'];
const BUMP_WORDS = ['BOTS!', 'BOEM!', 'BONK!', 'KLABAM!', 'PATS!'];
const HAZARD_WORDS = { koe: 'BOE!', tram: 'TING TING!', heftruck: 'PIEP!', botsauto: 'BOTS!', krab: 'KNIP!', egel: 'AU!', sneeuwbal: 'PLOF!', rolbos: 'RITSEL!', meteoriet: 'KABOEM!', ufo: 'BLIEP!' };

export class RaceClient {
  constructor(app, msg) {
    this.app = app;
    this.msg = msg;
    this.track = getTrack(msg.trackId);
    this.def = TRACK_BY_ID[msg.trackId];
    this.laps = msg.laps;
    this.practice = msg.practice;
    this.world = buildWorld(this.track, app.engine.qualityLevel);
    this.scene = this.world.scene;
    this.camera = new THREE.PerspectiveCamera(70, app.engine.w / app.engine.h, 0.1, 2600);
    this.effects = new Effects(this.scene);
    this.me = msg.you;
    this.startAt = msg.startAt;
    app.net.hint(msg.now);
    this.total = msg.entrants.length;
    this.karts = new Map();
    for (const e of msg.entrants) {
      const isMe = e.kid === this.me;
      const view = new KartView({ character: e.character, cosmetics: e.cosmetics, name: e.name, showName: app.settings.names && !isMe });
      this.scene.add(view.group);
      const g = this.track.gridSlot(e.kid);
      const ch = CHARACTER_BY_ID[e.character];
      const kleur = SHOP_BY_ID[e.cosmetics && e.cosmetics.kleur];
      this.karts.set(e.kid, {
        e, view, isMe, buf: [], color: kleur && kleur.look ? kleur.look.color : ch ? ch.kart : '#888',
        st: { x: g.x, z: g.z, h: g.h, speed: 0, steer: 0, drift: 0, driftLevel: 0 },
        v: { kid: e.kid, x: g.x, z: g.z, h: g.h, vx: 0, vz: 0, place: e.kid + 1, lap: 0, connected: true },
        lastH: g.h, finishedAt: 0,
      });
    }
    if (this.me != null) this.pred = new Predictor(this.track, this.me, this.me, this.laps);
    this.synced = false;
    this.acc = 0;
    this.simSteps = null;
    this.prev = null;
    this.corr = { x: 0, z: 0, h: 0 };
    this.sendBuf = [];
    this.sendSeq = null;
    this.sendT = 0;
    this.entities = new Map();
    this.shake = 0;
    this.lastSnapAt = performance.now();
    this.endAt = null;
    this.rocket = 'idle';
    this.prevDrift = false;
    this.countShown = null;
    this.finishShown = false;
    this.localBoxes = new Map();
    this.inactiveBoxes = [];
    this.time = 0;
    this.watch = null; // toeschouwer volgt deze kart
    this.cam = { yaw: this.track.pointAt(this.track.L - 20).h, x: 0, y: 0, z: 0, fov: 70, init: false };
    this.v3 = new THREE.Vector3();
    this.localEmit = (type, data) => this.handleEvent({ type, kid: data.kid ?? data.owner, ...data }, false);

    this.hud = new Hud(app, this);
    if (this.me != null) app.controls.mount(this.hud.touchLayer);
    else this.hud.spectate('Je kijkt mee. Bij de volgende race doe je mee!');
    app.sound.startEngine();
    app.sound.startMusic(this.world.th.music);
    this.hud.big(this.def.name, this.practice ? 'Oefenrace' : `${this.def.place} • ${this.laps} rondes`, 2200, 'title');
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  raceTime() {
    return (this.app.net.serverNow() - this.startAt) / 1000;
  }

  // ---------- netwerk ----------
  onSnapshot(m) {
    this.lastSnapAt = performance.now();
    this.endAt = m.end;
    for (const arr of m.k) {
      const v = decodeVisual(arr);
      const k = this.karts.get(v.kid);
      if (!k) continue;
      k.v = v;
      if (!k.isMe) {
        k.buf.push({ t: m.st, v });
        if (k.buf.length > 40) k.buf.shift();
      }
      if (v.finished && !k.finishedAt) {
        k.finishedAt = this.time;
        if (!k.isMe) this.hud.feed(`${k.e.name} is gefinisht als ${v.place}e!`);
      }
    }
    if (this.pred && m.me) {
      if (!this.synced) {
        Object.assign(this.pred.kart, decodeFull(m.me, {}));
        const loc = this.track.locate(this.pred.kart.x, this.pred.kart.z);
        this.pred.kart.i = loc.i; this.pred.kart.s = loc.s;
        this.pred.lastAck = this.pred.kart.ack;
        this.pred.seq = this.pred.kart.ack;
        this.synced = true;
      } else {
        const r = this.pred.reconcile(m.me);
        if (r) {
          if (r.err > 8) { this.corr.x = 0; this.corr.z = 0; this.corr.h = 0; this.prev = null; }
          else {
            this.corr.x += r.dx; this.corr.z += r.dz; this.corr.h = wrapAngle(this.corr.h + r.dh);
            if (this.prev) { this.prev.x -= r.dx; this.prev.z -= r.dz; this.prev.h -= r.dh; }
          }
        }
      }
    }
    // items op de baan
    const seen = new Set();
    for (const arr of m.e) {
      const e = decodeEntity(arr);
      seen.add(e.id);
      let ent = this.entities.get(e.id);
      if (!ent) {
        const mesh = e.kind === 'plas' ? plasMesh() : klompMesh();
        mesh.position.set(e.x, 0, e.z);
        this.scene.add(mesh);
        ent = { ...e, mesh, vx: 0, vz: 0, t: performance.now(), born: performance.now() };
        this.entities.set(e.id, ent);
      } else {
        const now = performance.now();
        const dtS = (now - ent.t) / 1000;
        if (dtS > 0.01) { ent.vx = (e.x - ent.x) / dtS; ent.vz = (e.z - ent.z) / dtS; }
        Object.assign(ent, { x: e.x, z: e.z, h: e.h, t: now });
      }
    }
    for (const [id, ent] of this.entities) {
      if (!seen.has(id)) { this.scene.remove(ent.mesh); this.entities.delete(id); }
    }
    this.inactiveBoxes = m.b;
    for (const ev of m.ev) this.handleEvent(ev, true);
  }

  // ---------- gebeurtenissen (botsingen, items, rondes) ----------
  distVol(x, z) {
    const d = Math.hypot(x - this.cam.tx, z - this.cam.tz);
    return clamp(1 - d / 90, 0, 1);
  }

  handleEvent(ev, server) {
    const mine = ev.kid === this.me && this.me != null;
    if (server && mine && LOCAL_TYPES.has(ev.type)) return;
    const S = this.app.sound;
    const kart = this.karts.get(ev.kid);
    const kx = ev.x ?? (kart ? kart.st.x : 0), kz = ev.z ?? (kart ? kart.st.z : 0);
    switch (ev.type) {
      case 'bump': {
        const involved = ev.a === this.me || ev.b === this.me;
        const vol = involved ? 1 : this.distVol(ev.x, ev.z);
        S.play('bump', vol);
        if (ev.shield) {
          this.effects.burst(ev.x, 1, ev.z, { n: 14, color: '#ffd34d', speed: 6 });
          this.effects.popup('GEBLOKT!', ev.x, 2.6, ev.z, '#ffd34d');
        } else {
          this.effects.burst(ev.x, 1.1, ev.z, { n: 18, colors: ['#ffe14d', '#ffffff', '#ff9a1f'], speed: 7, up: 3, size: [0.9, 0.2] });
          this.effects.popup(BUMP_WORDS[Math.floor(Math.random() * BUMP_WORDS.length)], ev.x, 2.6, ev.z);
        }
        if (involved) {
          this.shake = Math.min(1, 0.35 + ev.p * 0.03);
          this.app.controls.vibrate(45);
          const other = this.karts.get(ev.a === this.me ? ev.b : ev.a);
          if (other && ev.b === this.me) this.hud.feed(`${other.e.name} ramde je!`);
          else if (other) this.hud.feed(`Je ramde ${other.e.name}!`);
        }
        break;
      }
      case 'hit': {
        const vol = mine ? 1 : this.distVol(kx, kz);
        if (ev.res === 'schild') {
          S.play('block', vol);
          this.effects.burst(kx, 1, kz, { n: 16, color: '#ffd34d', speed: 6 });
          this.effects.popup('KAASSCHILD!', kx, 2.6, kz, '#ffd34d');
        } else {
          S.play(ev.kind === 'plas' ? 'splash' : 'bump', vol);
          S.play('spin', vol * 0.8);
          if (ev.kind === 'plas') this.effects.burst(kx, 0.6, kz, { n: 24, color: '#ffffff', speed: 5, up: 4, additive: false, size: [0.8, 0.3], g: 9 });
          else this.effects.burst(kx, 0.8, kz, { n: 14, color: '#f2c14e', speed: 6, up: 4, additive: false, size: [0.5, 0.2], g: 10 });
          this.effects.popup(ev.kind === 'plas' ? 'GLIBBER!' : 'KLONK!', kx, 2.6, kz, '#ffffff');
        }
        if (mine) {
          this.shake = 0.6;
          this.app.controls.vibrate([30, 40, 30]);
          const by = this.karts.get(ev.by);
          if (by && ev.by !== this.me) this.hud.feed(`${by.e.name} raakte je met een ${ev.kind === 'plas' ? 'karnemelkplas' : 'klomp'}!`);
        } else if (ev.by === this.me && kart) this.hud.feed(`Raak! ${kart.e.name} tolt rond.`);
        break;
      }
      case 'box': {
        const b = this.track.itemBoxes[ev.id];
        if (b) this.effects.burst(b.x, 1.4, b.z, { n: 14, colors: ['#ff5fa2', '#ffd23f', '#3dd6d0', '#7b6cff'], speed: 5, up: 2, additive: false, size: [0.5, 0.2] });
        if (mine) S.play('box');
        break;
      }
      case 'spawn':
        S.play('throw', mine ? 0.9 : this.distVol(kx, kz));
        break;
      case 'poof':
        for (let i = 0; i < 5; i++) this.effects.puff(ev.x, 0.6, ev.z, '#cccccc', 1.5);
        break;
      case 'boost':
        if (mine) {
          S.play(ev.src === 'start' ? 'rocket' : 'boost');
          if (ev.src === 'pad') this.app.controls.vibrate(15);
        } else S.play('boost', this.distVol(kx, kz) * 0.6);
        if (ev.src === 'start' && kart) this.effects.popup('RAKETSTART!', kx, 2.6, kz, '#ff9a1f');
        break;
      case 'miniturbo':
        if (mine) {
          S.play('mini');
          const col = DRIFT_COLORS[ev.level];
          this.effects.burst(kx, 0.5, kz, { n: 10 + ev.level * 4, color: col, speed: 4, up: 2 });
        }
        break;
      case 'hop':
        if (mine) S.play('hop');
        break;
      case 'wall':
        if (mine) { S.play('wall'); this.shake = Math.max(this.shake, 0.25); this.app.controls.vibrate(20); }
        else S.play('wall', this.distVol(kx, kz) * 0.5);
        this.effects.burst(ev.x, 0.6, ev.z, { n: 6, color: '#ffe9b0', speed: 3 });
        break;
      case 'obstacle':
        if (mine) { S.play('bump'); this.shake = 0.4; this.app.controls.vibrate(30); }
        this.effects.popup('BONK!', ev.x, 2.4, ev.z);
        this.effects.burst(ev.x, 1, ev.z, { n: 10, colors: ['#ffe14d', '#ffffff'], speed: 5 });
        break;
      case 'hazard':
        if (mine) { S.play('bump'); this.shake = 0.6; this.app.controls.vibrate(40); }
        this.effects.popup(HAZARD_WORDS[ev.kind] || 'BOEM!', kx, 3, kz, '#ffffff');
        this.effects.burst(kx, 1, kz, { n: 14, colors: ['#ffe14d', '#ffffff'], speed: 6 });
        break;
      case 'shield':
        if (mine) S.play('shield');
        break;
      case 'lap':
        if (mine) {
          const last = ev.lap === this.laps;
          S.play(last ? 'lastlap' : 'lap');
          this.hud.big(last ? 'LAATSTE RONDE!' : `RONDE ${ev.lap}/${this.laps}`, '', 1500, last ? 'hot' : '');
        }
        break;
      case 'finish':
        if (mine) this.onMyFinish();
        break;
      case 'firstFinish':
        if (!(this.pred && this.pred.kart.finished)) this.hud.feed(`De eerste is binnen! Nog ${ev.t} seconden.`);
        break;
      default:
        break;
    }
  }

  onMyFinish() {
    if (this.finishShown) return;
    this.finishShown = true;
    const place = this.pred.kart.place;
    this.app.sound.play('finish');
    setTimeout(() => this.app.sound.play('cheer', 0.7), 500);
    this.hud.big('FINISH!', place === 1 ? 'Je hebt gewonnen!' : `Je bent ${place}e geworden`, 4000, 'finish');
    this.app.controls.vibrate([60, 60, 120]);
    const k = this.karts.get(this.me);
    k.finishedAt = this.time;
  }

  // ---------- per beeld ----------
  update(dt) {
    this.time += dt;
    const app = this.app;
    const rt = this.raceTime();
    this.rt = rt;
    const inp = this.me != null ? app.controls.sample(dt) : null;

    this.countdown(rt, inp);

    // eigen kart vooruit rekenen: precies zoveel stappen als de racetijd aangeeft,
    // zodat ook een trage telefoon op volle snelheid rijdt
    if (this.pred && this.synced && rt >= 0) {
      const target = Math.floor(rt / DT);
      if (this.simSteps == null || target - this.simSteps > 30) this.simSteps = Math.max(0, target - 1); // na een hapering niet alles inhalen
      let steps = 0;
      const k = this.pred.kart;
      while (this.simSteps < target && steps < 15) {
        this.prev = { x: k.x, z: k.z, h: k.h };
        this.simSteps++;
        const r = this.pred.step(inp, this.simSteps * DT, this.localEmit);
        if (this.sendSeq == null) this.sendSeq = r.seq;
        this.sendBuf.push(r.packed);
        steps++;
      }
      this.acc = clamp(rt / DT - this.simSteps, 0, 1) * DT;
      this.sendT += dt;
      if (this.sendBuf.length >= 3 || (this.sendBuf.length && this.sendT > 0.06)) {
        app.net.send({ t: 'in', s: this.sendSeq, i: this.sendBuf });
        this.sendBuf = []; this.sendSeq = null; this.sendT = 0;
      }
      if (k.finished && !this.finishShown) this.onMyFinish();
    }

    // visuele correctie langzaam laten wegvloeien
    const f = Math.exp(-dt * 9);
    this.corr.x *= f; this.corr.z *= f; this.corr.h *= f;

    // ---- karts plaatsen ----
    const renderT = app.net.serverNow() - INTERP_MS;
    let myState = null;
    for (const k of this.karts.values()) {
      let st;
      if (k.isMe && this.pred) {
        const p = this.pred.kart;
        const a = this.prev ? clamp(this.acc / DT, 0, 1) : 1;
        const x = this.prev ? this.prev.x + (p.x - this.prev.x) * a : p.x;
        const z = this.prev ? this.prev.z + (p.z - this.prev.z) * a : p.z;
        const h = this.prev ? lerpAngle(this.prev.h, p.h, a) : p.h;
        st = {
          x: x + this.corr.x, z: z + this.corr.z, h: h + this.corr.h, speed: Math.hypot(p.vx, p.vz) * Math.sign(p.vx * Math.sin(p.h) + p.vz * Math.cos(p.h) || 1),
          steer: inp ? inp.steer : 0, drift: p.drift, driftLevel: driftLevel(p.driftT), boost: p.boostT > 0, shield: p.shieldT > 0,
          spin: p.spinT > 0, bump: p.bumpT > 0, hop: p.hopT > 0, finished: !!p.finished, offroad: p.surface === 'berm',
        };
        myState = st;
      } else {
        st = this.interpolate(k, renderT, dt);
      }
      st.pose = st.finished && k.finishedAt && this.time - k.finishedAt > 1.2;
      k.st = st;
      k.view.update(dt, st);
      this.kartFx(k, st, dt);
    }

    // itemdozen (lokaal meteen laten verdwijnen als je er doorheen rijdt)
    const now = performance.now();
    if (myState) {
      for (const b of this.track.itemBoxes) {
        if (Math.hypot(b.x - myState.x, b.z - myState.z) < 2.4 && !this.localBoxes.has(b.id) && !this.inactiveBoxes.includes(b.id)) this.localBoxes.set(b.id, now);
      }
    }
    for (const [id, t] of this.localBoxes) if (now - t > 700) this.localBoxes.delete(id);
    this.world.setBoxes([...this.inactiveBoxes, ...this.localBoxes.keys()]);
    this.world.update(Math.max(0, rt), dt);

    // items op de baan
    for (const ent of this.entities.values()) {
      if (ent.kind === 'klomp') {
        const age = Math.min(0.15, (now - ent.t) / 1000);
        ent.mesh.position.set(ent.x + ent.vx * age, 0.2, ent.z + ent.vz * age);
        ent.mesh.rotation.y = ent.h;
        ent.mesh.rotation.x += dt * 12;
      } else {
        const s = Math.min(1, (now - ent.born) / 250);
        ent.mesh.scale.setScalar(0.3 + s * 0.7);
      }
    }

    this.updateCamera(dt, myState);
    // naamlabels: niet vlak voor de camera, wel leesbaar op afstand
    const cp = this.camera.position;
    for (const k of this.karts.values()) {
      const tag = k.view.tag;
      if (!tag) continue;
      const d = Math.hypot(k.st.x - cp.x, k.st.z - cp.z);
      tag.visible = d > 7 && d < 110;
      const sc = Math.min(2.6, Math.max(1, d / 18));
      tag.scale.set(tag.userData.base.x * sc, tag.userData.base.y * sc, 1);
    }
    if (this.scene.userData.snow) this.scene.userData.snow.position.set(this.cam.tx, 0, this.cam.tz);
    if (this.scene.userData.stars) this.scene.userData.stars.position.set(this.camera.position.x, 0, this.camera.position.z);
    this.effects.setScale(app.engine.pxScale(this.camera));
    this.effects.update(dt);

    // geluid
    if (myState) app.sound.updateEngine(myState.speed, myState.boost, !!myState.drift, myState.offroad);
    else app.sound.updateEngine(0, false, false, false);

    this.updateHud(dt, rt);
  }

  interpolate(k, renderT, dt) {
    const buf = k.buf;
    let v;
    let x, z, h;
    if (!buf.length) {
      v = k.v; x = v.x; z = v.z; h = v.h;
    } else {
      let i = buf.length - 1;
      while (i > 0 && buf[i].t > renderT) i--;
      const a = buf[i], b = buf[i + 1];
      if (b && b.t > a.t) {
        const u = clamp((renderT - a.t) / (b.t - a.t), 0, 1);
        x = a.v.x + (b.v.x - a.v.x) * u;
        z = a.v.z + (b.v.z - a.v.z) * u;
        h = lerpAngle(a.v.h, b.v.h, u);
        v = u < 0.5 ? a.v : b.v;
      } else {
        // geen nieuwere status: kort doortrekken met de snelheid
        const ex = clamp((renderT - a.t) / 1000, 0, 0.25);
        x = a.v.x + a.v.vx * ex; z = a.v.z + a.v.vz * ex; h = a.v.h;
        v = a.v;
      }
    }
    const speed = Math.hypot(v.vx, v.vz);
    const dh = wrapAngle(k.lastH - h);
    k.lastH = h;
    const steer = clamp((dh / Math.max(dt, 0.001)) / 2, -1, 1);
    k.steerS = (k.steerS || 0) + (steer - (k.steerS || 0)) * Math.min(1, dt * 8);
    const loc = this.track.locate(x, z, k.hint ?? -1);
    k.hint = loc.i;
    return {
      x, z, h, speed, steer: k.steerS, drift: v.drift, driftLevel: v.driftLevel, boost: v.boost, shield: v.shield,
      spin: v.spin, bump: v.bump, hop: v.hop, finished: v.finished, offroad: Math.abs(loc.d) > this.track.halfW + 0.4,
    };
  }

  kartFx(k, st, dt) {
    const E = this.effects;
    const view = k.view;
    const v = this.v3;
    const near = Math.hypot(st.x - (this.cam.tx || 0), st.z - (this.cam.tz || 0)) < 120;
    // lichtspoor
    const trail = E.trailFor(k.e.kid, view.trail);
    if (trail) trail.update(dt, st.x, st.z, st.h, Math.abs(st.speed));
    if (!near) return;
    // driftvonken en remsporen
    if (st.drift) {
      const col = DRIFT_COLORS[st.driftLevel || 0];
      for (const wi of [2, 3]) {
        view.wheelWorld(v, wi);
        if (Math.random() < 0.7) E.spark(v.x, 0.25, v.z, col, 0, 0, st.driftLevel ? 0.5 : 0.3);
        E.skids.mark(`${k.e.kid}-${wi}`, v.x, v.z);
      }
    } else if (st.spin) {
      view.wheelWorld(v, 2);
      E.skids.mark(`${k.e.kid}-2`, v.x, v.z, 0.3);
    } else {
      E.skids.stop(`${k.e.kid}-2`);
      E.skids.stop(`${k.e.kid}-3`);
    }
    // boost-vlammen
    if (st.boost && Math.random() < 0.8) {
      view.exhaustWorld(v, Math.random() < 0.5 ? 0 : 1);
      E.spark(v.x, v.y, v.z, Math.random() < 0.5 ? '#ff9a1f' : '#ffe14d', -Math.sin(st.h) * 4, -Math.cos(st.h) * 4, 0.6);
    }
    // stof in de berm
    if (st.offroad && Math.abs(st.speed) > 6 && Math.random() < 0.5) {
      view.wheelWorld(v, 2 + Math.floor(Math.random() * 2));
      E.puff(v.x, 0.4, v.z, this.world.th.shoulder[0], 1.3, 0.6);
    }
    // uiterlijkspullen: wieleffecten en gouden glitters
    if (view.wheelParticles && Math.abs(st.speed) > 8 && Math.random() < 0.6) {
      view.wheelWorld(v, 2 + Math.floor(Math.random() * 2));
      const col = { vonk: '#ffd23f', sneeuw: '#ffffff', vuur: Math.random() < 0.5 ? '#ff6a00' : '#ffd23f' }[view.wheelParticles];
      E.spark(v.x, 0.3, v.z, col, 0, 0, view.wheelParticles === 'vuur' ? 0.6 : 0.35);
    }
    if (view.sparkle && Math.random() < 0.35) {
      E.spark(st.x - Math.sin(st.h) * 0.8 + (Math.random() - 0.5), 1.0 + Math.random() * 0.8, st.z - Math.cos(st.h) * 0.8 + (Math.random() - 0.5), '#ffe14d', 0, 0, 0.3);
    }
  }

  countdown(rt, inp) {
    const S = this.app.sound;
    let show = null;
    if (rt < -3) show = 'intro';
    else if (rt < -2) show = 3;
    else if (rt < -1) show = 2;
    else if (rt < 0) show = 1;
    else if (rt < 1) show = 0;
    if (show !== this.countShown) {
      this.countShown = show;
      if (typeof show === 'number' && show > 0) { this.hud.big(String(show), '', 900, 'count'); S.play('tick'); }
      if (show === 0) { this.hud.big('START!', '', 900, 'go'); S.play('go'); }
    }
    // raketstart: druk op DRIFT vlak voor START
    if (inp && this.rocket !== 'sent' && this.rocket !== 'early' && rt < 0.15) {
      const press = inp.drift && !this.prevDrift;
      if (press) {
        if (rt >= -0.45) this.rocket = 'armed';
        else if (rt > -3) this.rocket = 'early';
      }
    }
    if (inp) this.prevDrift = inp.drift;
    if (this.rocket === 'armed' && rt >= 0) {
      this.rocket = 'sent';
      this.app.net.send({ t: 'rocket' });
      if (this.pred) this.pred.kart.boostT = Math.max(this.pred.kart.boostT, 1.0);
      this.handleEvent({ type: 'boost', kid: this.me, src: 'start' }, false);
    }
    if (this.rocket === 'early' && rt >= 0 && rt < 0.05) this.hud.feed('Te vroeg voor een raketstart!');
  }

  pickWatch() {
    if (this.watch != null && this.karts.has(this.watch)) return this.karts.get(this.watch);
    let best = null;
    for (const k of this.karts.values()) if (!best || (k.v.place || 99) < (best.v.place || 99)) best = k;
    return best;
  }

  updateCamera(dt, myState) {
    const cam = this.camera;
    const c = this.cam;
    const portrait = cam.aspect < 1;
    const rt = this.rt;
    const target = myState || (this.pickWatch() || {}).st;
    if (!target) return;
    c.tx = target.x; c.tz = target.z;
    const finished = myState && myState.finished && this.karts.get(this.me).finishedAt && this.time - this.karts.get(this.me).finishedAt > 1.2;

    let dist = portrait ? 8.6 : 6.9;
    let height = portrait ? 3.7 : 2.75;
    let fov = (portrait ? 80 : 68) + (target.boost ? 9 : 0);
    let yawTarget = target.h;
    let look = portrait ? 6 : 4.5;
    if (finished) { yawTarget = target.h + Math.PI + Math.sin(this.time * 0.3) * 0.6; dist = 6.5; height = 2.2; look = 0; }

    if (rt < -3.2 && !finished) {
      // intro: rondvlucht boven de startopstelling
      const g = this.track.gridSlot(Math.min(4, this.total - 1));
      const a = this.time * 0.35 + 1;
      const r = 26;
      cam.position.set(g.x + Math.sin(a) * r, 10 + Math.sin(this.time * 0.5) * 2, g.z + Math.cos(a) * r);
      cam.lookAt(g.x, 1, g.z);
      c.fov += (64 - c.fov) * Math.min(1, dt * 3);
      c.yaw = target.h;
      c.init = false;
    } else {
      c.yaw = lerpAngle(c.yaw, yawTarget, 1 - Math.exp(-dt * (finished ? 2 : 6.5)));
      const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
      const px = target.x - fx * dist, pz = target.z - fz * dist, py = height;
      if (!c.init) { c.x = px; c.y = py; c.z = pz; c.init = true; }
      const k = 1 - Math.exp(-dt * 12);
      c.x += (px - c.x) * k; c.y += (py - c.y) * k; c.z += (pz - c.z) * k;
      let sx = 0, sy = 0;
      if (this.shake > 0) {
        this.shake = Math.max(0, this.shake - dt * 1.8);
        sx = (Math.random() - 0.5) * this.shake * 0.6;
        sy = (Math.random() - 0.5) * this.shake * 0.6;
      }
      cam.position.set(c.x + sx, c.y + sy, c.z);
      cam.lookAt(target.x + fx * look, 1.0, target.z + fz * look);
      c.fov += (fov - c.fov) * Math.min(1, dt * 4);
    }
    if (Math.abs(cam.fov - c.fov) > 0.05) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
  }

  updateHud(dt, rt) {
    const hud = this.hud;
    const me = this.me != null ? this.karts.get(this.me) : null;
    const p = this.pred ? this.pred.kart : null;
    // stand
    const standings = [...this.karts.values()]
      .sort((a, b) => (a.v.place || 99) - (b.v.place || 99))
      .map((k) => ({ kid: k.e.kid, place: k.v.place, name: k.e.name, color: k.color, me: k.isMe, fin: k.v.finished, con: k.v.connected !== false }));
    const dots = [...this.karts.values()].sort((a, b) => a.isMe - b.isMe).map((k) => ({ x: k.st.x, z: k.st.z, color: k.color, me: k.isMe }));
    let time = rt;
    if (p && p.finished) time = p.finishTime;
    hud.update(dt, {
      place: p ? p.place : me ? me.v.place : null,
      total: this.total,
      lap: p ? Math.max(1, p.lap) : 1,
      time: Math.max(0, time),
      ping: this.app.net.rtt || null,
      standings, dots,
    });
    if (p) hud.setItem(p.item, p.itemRoll, p.itemN, dt);
    if (p && p.wrongT > 1.2 && !p.finished) hud.warn('Verkeerde kant op! Draai om!');
    else if (performance.now() - this.lastSnapAt > 1500 && !this.app.offline) hud.warn('Verbinding hapert…');
    else if (this.endAt != null && !(p && p.finished)) {
      const left = Math.ceil(this.endAt - rt);
      hud.warn(left > 0 && left <= 30 ? `Nog ${left} s om te finishen!` : '');
    } else hud.warn('');
    if (this.me == null) {
      const w = this.pickWatch();
      if (w) hud.spectate(`Je kijkt mee met ${w.e.name}. Bij de volgende race doe je mee!`);
    }
  }

  destroy() {
    this.app.controls.unmount();
    this.app.sound.stopEngine();
    this.hud.destroy();
    for (const k of this.karts.values()) k.view.dispose();
    this.effects.dispose();
    this.world.dispose();
  }
}
