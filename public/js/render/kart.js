// Kart + coureur + uiterlijkspullen, opgebouwd uit simpele vormen.
import * as THREE from '../../vendor/three.module.min.js';
import { CHARACTER_BY_ID, DEFAULT_CHARACTER } from '../../shared/characters.js';
import { SHOP_BY_ID, DEFAULT_EQUIP } from '../../shared/shop.js';
import { patternTexture, textSprite, shadowTexture } from './textures.js';

const geo = {};
function G(key, fn) { return geo[key] || (geo[key] = fn()); }
const matCache = new Map();
export function lambert(color, extra = {}) {
  const key = color + JSON.stringify(extra);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra }));
  return matCache.get(key);
}

function mesh(g, m, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  return o;
}

// ---------- hoeden / hoofden per coureur ----------
function buildHead(ch) {
  const head = new THREE.Group();
  const skin = lambert(ch.skin);
  const eyeW = lambert('#ffffff');
  const eyeB = lambert('#1b1b24');
  let faceZ = 0.33, eyeY = 0.06;
  const addEyes = (z = faceZ, y = eyeY, spread = 0.13) => {
    for (const sx of [-1, 1]) {
      head.add(mesh(G('eye', () => new THREE.SphereGeometry(0.095, 10, 8)), eyeW, sx * spread, y, z - 0.03));
      head.add(mesh(G('pupil', () => new THREE.SphereGeometry(0.05, 8, 6)), eyeB, sx * spread, y, z + 0.04));
    }
  };
  switch (ch.head) {
    case 'pak': { // melkpak
      head.add(mesh(G('pakBox', () => new THREE.BoxGeometry(0.66, 0.7, 0.62)), lambert('#ffffff')));
      head.add(mesh(G('pakBand', () => new THREE.BoxGeometry(0.68, 0.16, 0.64)), lambert('#2f7de1'), 0, -0.18, 0));
      const roof = mesh(G('pakRoof', () => new THREE.CylinderGeometry(0.4, 0.4, 0.62, 3)), lambert('#f1f1f1'), 0, 0.46, 0);
      roof.rotation.z = Math.PI / 2; roof.rotation.x = -Math.PI / 2;
      roof.scale.set(1, 1, 0.5);
      head.add(roof);
      head.add(mesh(G('snor', () => new THREE.BoxGeometry(0.3, 0.06, 0.06)), lambert('#5a3a22'), 0, -0.07, 0.33));
      addEyes(0.33, 0.1);
      break;
    }
    case 'ruit': { // drop
      const d = mesh(G('drop', () => new THREE.OctahedronGeometry(0.45, 0)), lambert('#1d1d22', { emissive: '#111' }));
      d.scale.set(1, 1.1, 0.85);
      head.add(d);
      head.add(mesh(G('strik', () => new THREE.ConeGeometry(0.12, 0.25, 4)), lambert(ch.accent), 0.22, 0.38, 0));
      addEyes(0.3, 0.08);
      break;
    }
    case 'bal': {
      head.add(mesh(G('balHead', () => new THREE.IcosahedronGeometry(0.42, 1)), lambert('#9b5523')));
      head.add(mesh(G('mosterd', () => new THREE.SphereGeometry(0.12, 8, 6)), lambert('#ffd23f'), 0.05, 0.4, 0));
      addEyes(0.36, 0.06);
      break;
    }
    default: {
      head.add(mesh(G('head', () => new THREE.SphereGeometry(0.38, 14, 12)), skin));
      addEyes();
      head.add(mesh(G('mond', () => new THREE.BoxGeometry(0.16, 0.035, 0.04)), lambert('#7a2b2b'), 0, -0.13, 0.35));
    }
  }
  // hoeden
  const acc = lambert(ch.accent);
  switch (ch.head) {
    case 'strohoed': {
      head.add(mesh(G('brim', () => new THREE.CylinderGeometry(0.62, 0.62, 0.05, 16)), lambert('#e9c46a'), 0, 0.3, 0));
      head.add(mesh(G('crown', () => new THREE.CylinderGeometry(0.28, 0.34, 0.25, 12)), lambert('#e9c46a'), 0, 0.43, 0));
      head.add(mesh(G('lint', () => new THREE.CylinderGeometry(0.345, 0.345, 0.07, 12)), lambert('#d93a3a'), 0, 0.35, 0));
      break;
    }
    case 'friet': {
      head.add(mesh(G('frietzak', () => new THREE.CylinderGeometry(0.32, 0.2, 0.32, 10)), lambert('#e8423f'), 0, 0.44, 0));
      for (let i = 0; i < 7; i++) {
        const s = mesh(G('frietje', () => new THREE.BoxGeometry(0.06, 0.34, 0.06)), lambert('#ffd23f'), Math.cos(i * 0.9) * 0.15, 0.62, Math.sin(i * 0.9) * 0.15);
        s.rotation.z = Math.cos(i * 2.1) * 0.25; s.rotation.x = Math.sin(i * 1.7) * 0.25;
        head.add(s);
      }
      break;
    }
    case 'snavel': {
      const b = mesh(G('snavel', () => new THREE.ConeGeometry(0.11, 0.6, 8)), lambert('#ff8c1a'), 0, -0.05, 0.6);
      b.rotation.x = Math.PI / 2 + 0.2;
      head.add(b);
      head.add(mesh(G('kuif', () => new THREE.ConeGeometry(0.08, 0.25, 6)), lambert('#1b1b24'), 0, 0.42, -0.1));
      break;
    }
    case 'wafel': {
      head.add(mesh(G('wafel', () => new THREE.CylinderGeometry(0.42, 0.42, 0.12, 18)), new THREE.MeshLambertMaterial({ map: patternTexture('wafel') }), 0, 0.38, 0));
      break;
    }
    case 'molen': {
      head.add(mesh(G('molenRomp', () => new THREE.CylinderGeometry(0.12, 0.2, 0.42, 8)), lambert('#7b5a3a'), 0, 0.52, 0));
      head.add(mesh(G('molenKap', () => new THREE.ConeGeometry(0.16, 0.18, 8)), lambert('#3e8e41'), 0, 0.8, 0));
      const blades = new THREE.Group();
      blades.position.set(0, 0.62, 0.17);
      for (let i = 0; i < 4; i++) {
        const bl = mesh(G('blad', () => new THREE.BoxGeometry(0.08, 0.42, 0.02)), lambert('#ffffff'), 0, 0.21, 0);
        const piv = new THREE.Group();
        piv.rotation.z = (i * Math.PI) / 2;
        piv.add(bl);
        blades.add(piv);
      }
      blades.userData.spin = true;
      head.add(blades);
      head.userData.blades = blades;
      break;
    }
    case 'tulp': {
      head.add(mesh(G('steel', () => new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6)), lambert('#3fa34d'), 0, 0.48, 0));
      for (let i = 0; i < 3; i++) {
        const p = mesh(G('petal', () => new THREE.SphereGeometry(0.14, 8, 8)), lambert('#ff4f9a'), Math.cos(i * 2.1) * 0.08, 0.7, Math.sin(i * 2.1) * 0.08);
        p.scale.set(0.8, 1.6, 0.8);
        p.rotation.z = Math.cos(i * 2.1) * 0.3;
        head.add(p);
      }
      break;
    }
    case 'kaas': {
      const k = mesh(G('kaas', () => new THREE.CylinderGeometry(0.42, 0.42, 0.3, 3)), new THREE.MeshLambertMaterial({ map: patternTexture('kaasgaten'), flatShading: true }), 0, 0.46, 0);
      k.rotation.y = Math.PI;
      head.add(k);
      break;
    }
    case 'pak': case 'ruit': case 'bal':
      break;
    default:
      head.add(mesh(G('pet', () => new THREE.SphereGeometry(0.4, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2)), acc, 0, 0.12, 0));
  }
  return head;
}

// ---------- de kart ----------
export class KartView {
  constructor({ character = DEFAULT_CHARACTER, cosmetics = DEFAULT_EQUIP, name = '', showName = false, nameColor = '#ffffff' } = {}) {
    this.group = new THREE.Group();
    this.body = new THREE.Group();
    this.group.add(this.body);
    this.t = Math.random() * 10;
    this.wheelSpin = 0;
    this.spinAngle = 0;
    this.flip = 0;
    this.poseT = 0;
    this.character = null;
    this.cos = { ...DEFAULT_EQUIP };

    // schaduw
    const sh = new THREE.Mesh(G('shadow', () => new THREE.PlaneGeometry(2.6, 3.2)), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.04;
    sh.renderOrder = 1;
    this.group.add(sh);

    this.paint = new THREE.MeshPhongMaterial({ color: '#3a8ef6', flatShading: true, shininess: 40 });
    const dark = lambert('#2b2d36');
    const metal = new THREE.MeshPhongMaterial({ color: '#c5ccd6', shininess: 90, flatShading: true });
    const b = this.body;
    b.add(mesh(G('chassis', () => new THREE.BoxGeometry(1.36, 0.3, 2.1)), this.paint, 0, 0.42, 0));
    const nose = mesh(G('nose', () => new THREE.CylinderGeometry(0.3, 0.68, 0.7, 4, 1)), this.paint, 0, 0.42, 1.25);
    nose.rotation.x = Math.PI / 2; nose.rotation.y = Math.PI / 4; nose.scale.set(1.15, 1, 0.42);
    b.add(nose);
    b.add(mesh(G('bumper', () => new THREE.BoxGeometry(1.5, 0.16, 0.18)), dark, 0, 0.3, 1.55));
    for (const sx of [-1, 1]) {
      b.add(mesh(G('pod', () => new THREE.BoxGeometry(0.28, 0.26, 1.2)), dark, sx * 0.8, 0.36, 0.05));
    }
    b.add(mesh(G('seat', () => new THREE.BoxGeometry(0.7, 0.55, 0.22)), dark, 0, 0.78, -0.55));
    b.add(mesh(G('engine', () => new THREE.BoxGeometry(0.9, 0.36, 0.5)), metal, 0, 0.62, -0.9));
    this.exhausts = [];
    for (const sx of [-0.28, 0.28]) {
      const p = mesh(G('pipe', () => new THREE.CylinderGeometry(0.09, 0.11, 0.42, 8)), metal, sx, 0.62, -1.25);
      p.rotation.x = Math.PI / 2 - 0.3;
      b.add(p);
      const flame = mesh(G('flame', () => new THREE.ConeGeometry(0.13, 0.7, 8)), new THREE.MeshBasicMaterial({ color: '#ff9a1f', transparent: true, opacity: 0.85 }), sx, 0.7, -1.62);
      flame.rotation.x = -Math.PI / 2 - 0.3;
      flame.visible = false;
      b.add(flame);
      this.exhausts.push(flame);
    }
    // spoiler
    b.add(mesh(G('spoiler', () => new THREE.BoxGeometry(1.4, 0.06, 0.34)), this.paint, 0, 1.05, -1.12));
    for (const sx of [-0.45, 0.45]) b.add(mesh(G('strut', () => new THREE.BoxGeometry(0.05, 0.36, 0.05)), dark, sx, 0.86, -1.1));
    // stuur
    const wheelS = mesh(G('stuur', () => new THREE.TorusGeometry(0.18, 0.035, 6, 14)), dark, 0, 0.88, 0.32);
    wheelS.rotation.x = -0.9;
    b.add(wheelS);
    this.steeringWheel = wheelS;

    // wielen
    this.rimMat = new THREE.MeshPhongMaterial({ color: '#d0d4da', flatShading: true });
    this.wheels = [];
    const tyre = lambert('#1d1f24');
    const wpos = [[-0.82, 0.32, 0.82], [0.82, 0.32, 0.82], [-0.82, 0.34, -0.78], [0.82, 0.34, -0.78]];
    wpos.forEach(([x, y, z], i) => {
      const steerG = new THREE.Group();
      steerG.position.set(x, y, z);
      const spinG = new THREE.Group();
      const big = i >= 2 ? 1.1 : 1;
      const t = mesh(G('tyre', () => new THREE.CylinderGeometry(0.32, 0.32, 0.3, 14)), tyre);
      t.rotation.z = Math.PI / 2;
      t.scale.set(big, 1, big);
      spinG.add(t);
      const rim = mesh(G('rim', () => new THREE.CylinderGeometry(0.17, 0.17, 0.32, 6)), this.rimMat);
      rim.rotation.z = Math.PI / 2;
      spinG.add(rim);
      steerG.add(spinG);
      b.add(steerG);
      this.wheels.push({ steerG, spinG, front: i < 2, x, y, z });
    });

    // coureur
    this.driver = new THREE.Group();
    this.driver.position.set(0, 0, -0.25);
    b.add(this.driver);

    // cape
    const capeGeo = new THREE.PlaneGeometry(0.92, 1.05, 6, 8);
    capeGeo.translate(0, -0.525, 0);
    this.capeBase = Float32Array.from(capeGeo.attributes.position.array);
    this.capeMat = new THREE.MeshLambertMaterial({ color: '#d62828', side: THREE.DoubleSide });
    this.cape = new THREE.Mesh(capeGeo, this.capeMat);
    this.cape.position.set(0, 1.18, -0.2);
    this.cape.visible = false;
    this.driver.add(this.cape);

    // schild
    this.shield = new THREE.Mesh(G('shield', () => new THREE.IcosahedronGeometry(1.9, 2)), new THREE.MeshBasicMaterial({ map: patternTexture('kaasgaten'), transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
    this.shield.position.y = 0.8;
    this.shield.visible = false;
    this.group.add(this.shield);

    // glas karnemelk voor de proost-pose
    this.glass = mesh(G('glas', () => new THREE.CylinderGeometry(0.09, 0.07, 0.24, 10)), lambert('#ffffff', { emissive: '#666' }));
    this.glass.visible = false;

    this.setCharacter(character);
    this.setCosmetics(cosmetics);
    if (name && showName) this.setName(name, nameColor);
  }

  setName(name, color = '#ffffff') {
    if (this.tag) { this.group.remove(this.tag); this.tag.material.map.dispose(); this.tag.material.dispose(); }
    this.tag = textSprite(name, { size: 36, color, scale: 0.016, bg: 'rgba(20,20,40,0.55)', stroke: null, pad: 10 });
    this.tag.position.set(0, 2.7, 0);
    this.tag.userData.base = this.tag.scale.clone();
    this.group.add(this.tag);
  }

  setCharacter(id) {
    const ch = CHARACTER_BY_ID[id] || CHARACTER_BY_ID[DEFAULT_CHARACTER];
    if (this.character === ch) return;
    this.character = ch;
    const d = this.driver;
    for (const part of [this.torso, this.head, this.armL, this.armR]) if (part) d.remove(part);
    this.torso = mesh(G('torso', () => new THREE.CylinderGeometry(0.3, 0.36, 0.62, 10)), lambert(ch.body), 0, 0.98, 0);
    d.add(this.torso);
    this.head = buildHead(ch);
    this.head.position.set(0, 1.62, 0.02);
    d.add(this.head);
    const armMat = lambert(ch.body);
    const handMat = lambert(ch.head === 'ruit' ? '#1d1d22' : ch.skin);
    const mkArm = (sx) => {
      const piv = new THREE.Group();
      piv.position.set(sx * 0.34, 1.18, 0.02);
      const arm = mesh(G('arm', () => new THREE.CylinderGeometry(0.075, 0.075, 0.55, 6)), armMat, 0, -0.27, 0);
      piv.add(arm);
      piv.add(mesh(G('hand', () => new THREE.SphereGeometry(0.1, 8, 6)), handMat, 0, -0.56, 0));
      piv.rotation.x = -1.05;
      piv.rotation.z = sx * 0.15;
      return piv;
    };
    this.armL = mkArm(-1);
    this.armR = mkArm(1);
    d.add(this.armL, this.armR);
    this.applyPaint();
  }

  setCosmetics(cos) {
    this.cos = { ...DEFAULT_EQUIP, ...(cos || {}) };
    // cape
    const cape = SHOP_BY_ID[this.cos.cape];
    const cl = cape && cape.look;
    this.cape.visible = !!cl;
    if (cl) {
      this.capeMat.dispose();
      if (cl.pattern) {
        const m = cl.pattern === 'goud'
          ? new THREE.MeshPhongMaterial({ map: patternTexture('goud'), side: THREE.DoubleSide, shininess: 100, specular: '#fff6c0', emissive: '#4a3400' })
          : new THREE.MeshLambertMaterial({ map: patternTexture(cl.pattern, cl.colors && cl.colors[0]), side: THREE.DoubleSide });
        this.capeMat = m;
      } else {
        this.capeMat = new THREE.MeshLambertMaterial({ color: cl.colors[0], side: THREE.DoubleSide });
      }
      this.cape.material = this.capeMat;
    }
    this.sparkle = !!(cl && cl.sparkle);
    // banden
    const bd = SHOP_BY_ID[this.cos.banden];
    const bl = bd && bd.look;
    this.rimMat.color.set(bl ? bl.rim : '#d0d4da');
    this.rimMat.emissive.set(bl && bl.glow ? bl.glow : '#000000');
    this.wheelParticles = bl ? bl.particles || null : null;
    // spoor
    const sp = SHOP_BY_ID[this.cos.spoor];
    this.trail = sp && sp.look ? sp.look : null;
    // pose
    const ps = SHOP_BY_ID[this.cos.pose];
    this.pose = ps && ps.look ? ps.look.pose : 'duim';
    this.applyPaint();
  }

  applyPaint() {
    if (!this.character) return;
    const k = SHOP_BY_ID[this.cos.kleur];
    const look = k && k.look;
    const p = this.paint;
    p.map = null;
    p.emissive.set('#000000');
    p.shininess = 40;
    p.specular.set('#222222');
    if (!look) p.color.set(this.character.kart);
    else {
      p.color.set(look.color);
      if (look.pattern === 'koe') p.map = patternTexture('koe');
      if (look.metal) { p.shininess = 160; p.specular.set('#ffffff'); }
      if (look.glow) p.emissive.set(look.glow).multiplyScalar(0.35);
    }
    this.glow = look && look.glow ? look.glow : null;
    p.needsUpdate = true;
  }

  // st: { x, z, h, speed, steer, drift, driftLevel, boost, shield, spin, bump, hop, finished, pose }
  update(dt, st) {
    this.t += dt;
    const g = this.group;
    g.position.set(st.x, 0, st.z);
    g.rotation.y = st.h;
    const b = this.body;

    // wielen
    this.wheelSpin += (st.speed || 0) * dt / 0.33;
    const steerVis = st.drift ? st.drift * 0.25 : (st.steer || 0) * 0.42;
    for (const w of this.wheels) {
      w.spinG.rotation.x = this.wheelSpin;
      if (w.front) w.steerG.rotation.y = -steerVis;
    }
    this.steeringWheel.rotation.z = steerVis * 1.6;

    // drift: kart staat schuiner dan de rijrichting
    const driftYaw = st.drift ? -st.drift * 0.38 : 0;
    this.driftYaw = (this.driftYaw || 0) + (driftYaw - (this.driftYaw || 0)) * Math.min(1, dt * 10);
    // tollen na een plas/klomp
    if (st.spin) this.spinAngle += dt * 14;
    else if (this.spinAngle) {
      const tgt = Math.round(this.spinAngle / (Math.PI * 2)) * Math.PI * 2;
      this.spinAngle += (tgt - this.spinAngle) * Math.min(1, dt * 8);
      if (Math.abs(tgt - this.spinAngle) < 0.01) this.spinAngle = 0;
    }
    b.rotation.y = this.driftYaw + this.spinAngle;
    // botsing: wiebelen
    const wob = st.bump ? Math.sin(this.t * 38) * 0.14 : 0;
    b.rotation.z = wob + (st.drift ? st.drift * 0.08 : -(st.steer || 0) * 0.04);
    // hupje
    const hop = st.hop ? Math.sin(Math.min(1, (this.hopT = (this.hopT || 0) + dt) / 0.3) * Math.PI) * 0.45 : 0;
    if (!st.hop) this.hopT = 0;
    b.position.y = hop + (st.boost ? Math.sin(this.t * 50) * 0.02 : 0);

    // vlammen bij boost
    for (const f of this.exhausts) {
      f.visible = !!st.boost;
      if (st.boost) { const s = 0.8 + Math.random() * 0.6; f.scale.set(1, s, 1); }
    }
    // schild
    this.shield.visible = !!st.shield;
    if (st.shield) {
      this.shield.rotation.y += dt * 1.5;
      this.shield.material.opacity = 0.28 + Math.sin(this.t * 6) * 0.08;
    }
    // lavagloed pulseert
    if (this.glow) this.paint.emissive.set(this.glow).multiplyScalar(0.25 + Math.sin(this.t * 4) * 0.15);
    // molenwieken op het hoofd
    if (this.head.userData.blades) this.head.userData.blades.rotation.z += dt * (3 + (st.speed || 0) * 0.3);

    this.animateCape(dt, st.speed || 0);
    this.animatePose(dt, st.pose ? this.pose : null);
  }

  animateCape(dt, speed) {
    if (!this.cape.visible) return;
    const pos = this.cape.geometry.attributes.position;
    const a = pos.array, base = this.capeBase;
    const lift = 0.25 + Math.min(1, speed / 26) * 1.0;
    const H = 1.05;
    for (let i = 0; i < a.length; i += 3) {
      const x = base[i], y = base[i + 1];
      const along = -y / H; // 0 boven, 1 onder
      const wave = Math.sin(this.t * (6 + speed * 0.3) - along * 5 + x * 3) * 0.12 * along * (0.4 + Math.min(1, speed / 20));
      const ang = lift * along;
      a[i] = x * (1 + along * 0.15);
      a[i + 1] = -Math.cos(ang) * (-y) * 0.98;
      a[i + 2] = -Math.sin(ang) * (-y) + wave;
    }
    pos.needsUpdate = true;
    this.cape.geometry.computeVertexNormals();
  }

  animatePose(dt, pose) {
    const L = this.armL, R = this.armR;
    const rest = () => {
      L.rotation.set(-1.05, 0, -0.15); R.rotation.set(-1.05, 0, 0.15);
      this.driver.position.y = 0; this.driver.rotation.y = 0;
      this.body.rotation.x = 0;
      this.glass.visible = false;
    };
    if (!pose) { this.poseT = 0; rest(); return; }
    this.poseT += dt;
    const t = this.poseT;
    rest();
    switch (pose) {
      case 'duim':
        R.rotation.set(-2.9, 0, 0.3);
        break;
      case 'zwaai':
        R.rotation.set(-2.7, 0, 0.3 + Math.sin(t * 8) * 0.5);
        L.rotation.set(-1.05, 0, -0.15);
        break;
      case 'dans':
        this.driver.position.y = Math.abs(Math.sin(t * 7)) * 0.25;
        this.driver.rotation.y = Math.sin(t * 3.5) * 0.5;
        L.rotation.set(-2.6, 0, -0.5 + Math.sin(t * 7) * 0.3);
        R.rotation.set(-2.6, 0, 0.5 - Math.sin(t * 7) * 0.3);
        break;
      case 'proost': {
        const drink = (Math.sin(t * 2.5) + 1) / 2;
        R.rotation.set(-2.2 - drink * 0.9, 0, 0.2);
        if (this.glass.parent !== R) R.add(this.glass);
        this.glass.position.set(0, -0.62, 0.06);
        this.glass.visible = true;
        L.rotation.set(-2.9, 0, -0.4);
        break;
      }
      case 'salto': {
        const cycle = (t % 2.2) / 1.0;
        if (cycle < 1) {
          this.body.position.y = Math.sin(cycle * Math.PI) * 1.6;
          this.body.rotation.x = -cycle * Math.PI * 2;
        }
        L.rotation.set(-2.9, 0, -0.4); R.rotation.set(-2.9, 0, 0.4);
        break;
      }
      default:
        R.rotation.set(-2.9, 0, 0.3);
    }
  }

  // wereldposities voor effecten
  exhaustWorld(out, idx = 0) {
    this.exhausts[idx].getWorldPosition(out);
    return out;
  }

  wheelWorld(out, idx) {
    this.wheels[idx].steerG.getWorldPosition(out);
    return out;
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.material && o.material !== this.paint && !matCache.has(o.material)) { /* gedeeld materiaal laten staan */ }
    });
    this.paint.dispose();
    this.capeMat.dispose();
    this.cape.geometry.dispose();
    if (this.tag) { this.tag.material.map.dispose(); this.tag.material.dispose(); }
  }
}
