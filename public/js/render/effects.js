// Deeltjes, lichtsporen, remsporen en tekstwolkjes.
import * as THREE from '../../vendor/three.module.min.js';
import { glowTexture, textCanvas } from './textures.js';

const VERT = `
attribute float size;
attribute vec4 pcolor;
uniform float uScale;
varying vec4 vColor;
void main() {
  vColor = pcolor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * uScale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
uniform sampler2D map;
varying vec4 vColor;
void main() {
  vec4 t = texture2D(map, gl_PointCoord);
  float a = vColor.a * t.a;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor.rgb, a);
}`;

class ParticleSystem {
  constructor(max, additive) {
    this.max = max;
    this.n = 0;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.size = new Float32Array(max);
    this.p = []; // data per deeltje
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('pcolor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: glowTexture() }, uScale: { value: 400 } },
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }

  add(o) {
    if (this.p.length >= this.max) this.p.shift();
    this.p.push(o);
  }

  update(dt) {
    const keep = [];
    for (const q of this.p) {
      q.life -= dt;
      if (q.life <= 0) continue;
      q.vy -= (q.g || 0) * dt;
      const drag = Math.exp(-(q.drag || 0) * dt);
      q.vx *= drag; q.vy *= drag; q.vz *= drag;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      if (q.y < 0.05 && q.floor !== false) { q.y = 0.05; q.vy = Math.abs(q.vy) * 0.3; }
      keep.push(q);
    }
    this.p = keep;
    const n = Math.min(this.p.length, this.max);
    for (let i = 0; i < n; i++) {
      const q = this.p[i];
      const t = 1 - q.life / q.max;
      this.pos[i * 3] = q.x; this.pos[i * 3 + 1] = q.y; this.pos[i * 3 + 2] = q.z;
      this.col[i * 4] = q.r; this.col[i * 4 + 1] = q.gc; this.col[i * 4 + 2] = q.b;
      this.col[i * 4 + 3] = (q.a ?? 1) * (t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85);
      this.size[i] = q.s0 + (q.s1 - q.s0) * t;
    }
    this.geo.setDrawRange(0, n);
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.pcolor.needsUpdate = true;
    this.geo.attributes.size.needsUpdate = true;
  }
}

const C = new THREE.Color();
function rgb(hex) { C.set(hex); return [C.r, C.g, C.b]; }

// ---------- lichtspoor ----------
class Trail {
  constructor(look) {
    this.look = look;
    this.n = 36;
    this.pts = [];
    this.timer = 0;
    const g = new THREE.BufferGeometry();
    this.posA = new Float32Array(this.n * 2 * 3);
    this.colA = new Float32Array(this.n * 2 * 4);
    g.setAttribute('position', new THREE.BufferAttribute(this.posA, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.colA, 4).setUsage(THREE.DynamicDrawUsage));
    const idx = [];
    for (let i = 0; i < this.n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    this.geo = g;
    this.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
    this.mesh.frustumCulled = false;
    this.cols = look.colors.map(rgb);
  }

  update(dt, x, z, h, speed) {
    this.timer += dt;
    if (this.timer > 0.025) {
      this.timer = 0;
      const back = 1.5;
      this.pts.unshift({ x: x - Math.sin(h) * back, z: z - Math.cos(h) * back, h, age: 0 });
      if (this.pts.length > this.n) this.pts.pop();
    }
    for (const p of this.pts) p.age += dt;
    const m = this.pts.length;
    const show = speed > 3;
    for (let i = 0; i < this.n; i++) {
      const p = this.pts[Math.min(i, m - 1)];
      if (!p) break;
      const rx = -Math.cos(p.h), rz = Math.sin(p.h);
      const w = 0.32 * (1 - i / this.n) + 0.05;
      let off = 0;
      if (this.look.zigzag) off = (i % 2 ? 0.35 : -0.35) * Math.min(1, i / 3);
      const y = 0.45;
      const o = i * 6;
      this.posA[o] = p.x + rx * (off - w); this.posA[o + 1] = y; this.posA[o + 2] = p.z + rz * (off - w);
      this.posA[o + 3] = p.x + rx * (off + w); this.posA[o + 4] = y + 0.05; this.posA[o + 5] = p.z + rz * (off + w);
      const c = this.cols[Math.floor((i / this.n) * this.cols.length * 1.999) % this.cols.length];
      const a = show ? (1 - i / this.n) * 0.85 * Math.max(0, 1 - p.age * 1.2) : 0;
      for (let k = 0; k < 2; k++) {
        const ci = (i * 2 + k) * 4;
        this.colA[ci] = c[0]; this.colA[ci + 1] = c[1]; this.colA[ci + 2] = c[2]; this.colA[ci + 3] = a;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }

  dispose() { this.geo.dispose(); this.mesh.material.dispose(); }
}

// ---------- remsporen ----------
class Skids {
  constructor(max = 500) {
    this.max = max;
    this.i = 0;
    this.pos = new Float32Array(max * 4 * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    const idx = [];
    for (let q = 0; q < max; q++) { const a = q * 4; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    this.geo = g;
    this.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#1a1a1a', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
    this.mesh.frustumCulled = false;
    this.last = new Map();
  }

  mark(key, x, z, w = 0.22) {
    const prev = this.last.get(key);
    this.last.set(key, { x, z, t: performance.now() });
    if (!prev || performance.now() - prev.t > 120) return;
    const dx = x - prev.x, dz = z - prev.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.05 || len > 3) return;
    const nx = -dz / len * w, nz = dx / len * w;
    const o = (this.i % this.max) * 12;
    const y = 0.075;
    this.pos.set([prev.x + nx, y, prev.z + nz, prev.x - nx, y, prev.z - nz, x + nx, y, z + nz, x - nx, y, z - nz], o);
    this.i++;
    this.geo.attributes.position.needsUpdate = true;
  }

  stop(key) { this.last.delete(key); }
}

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.add = new ParticleSystem(1600, true);
    this.norm = new ParticleSystem(900, false);
    scene.add(this.add.points, this.norm.points);
    this.trails = new Map();
    this.skids = new Skids();
    scene.add(this.skids.mesh);
    this.popups = [];
    this.textCache = new Map();
  }

  setScale(px) {
    this.add.mat.uniforms.uScale.value = px;
    this.norm.mat.uniforms.uScale.value = px;
  }

  burst(x, y, z, { n = 10, color = '#ffffff', colors = null, speed = 4, up = 2, life = 0.6, size = [0.6, 0.1], g = 6, drag = 1.5, additive = true, a = 1 } = {}) {
    const sys = additive ? this.add : this.norm;
    for (let i = 0; i < n; i++) {
      const [r, gc, b] = rgb(colors ? colors[i % colors.length] : color);
      const ang = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random() * 0.6);
      sys.add({
        x, y, z, vx: Math.cos(ang) * sp, vy: up * (0.5 + Math.random()), vz: Math.sin(ang) * sp,
        life: life * (0.6 + Math.random() * 0.6), max: life * 1.2, s0: size[0], s1: size[1], r, gc, b, g, drag, a,
      });
    }
  }

  puff(x, y, z, color, size = 1.2, life = 0.7, vx = 0, vz = 0) {
    const [r, gc, b] = rgb(color);
    this.norm.add({ x, y, z, vx: vx + (Math.random() - 0.5), vy: 1 + Math.random(), vz: vz + (Math.random() - 0.5), life, max: life, s0: size * 0.5, s1: size, r, gc, b, g: -0.5, drag: 2, a: 0.55 });
  }

  spark(x, y, z, color, vx = 0, vz = 0, size = 0.35) {
    const [r, gc, b] = rgb(color);
    this.add.add({ x, y, z, vx: vx + (Math.random() - 0.5) * 3, vy: 1.5 + Math.random() * 2, vz: vz + (Math.random() - 0.5) * 3, life: 0.35, max: 0.35, s0: size, s1: 0.05, r, gc, b, g: 9, drag: 1 });
  }

  // tekstwolkje zoals "BOTS!"
  popup(text, x, y, z, color = '#ffe14d') {
    const key = text + color;
    if (!this.textCache.has(key)) {
      const c = textCanvas(text, { size: 64, color, stroke: '#2b1a4a', pad: 16 });
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      this.textCache.set(key, { t, aspect: c.width / c.height });
    }
    const { t, aspect } = this.textCache.get(key);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false, fog: false }));
    s.renderOrder = 20;
    s.position.set(x, y, z);
    s.userData = { age: 0, aspect };
    this.scene.add(s);
    this.popups.push(s);
    if (this.popups.length > 12) this.removePopup(this.popups[0]);
  }

  removePopup(s) {
    this.scene.remove(s);
    s.material.dispose();
    this.popups = this.popups.filter((p) => p !== s);
  }

  trailFor(kid, look) {
    let tr = this.trails.get(kid);
    if (look && (!tr || tr.look !== look)) {
      if (tr) { this.scene.remove(tr.mesh); tr.dispose(); }
      tr = new Trail(look);
      this.trails.set(kid, tr);
      this.scene.add(tr.mesh);
    } else if (!look && tr) {
      this.scene.remove(tr.mesh); tr.dispose();
      this.trails.delete(kid);
      tr = null;
    }
    return tr;
  }

  update(dt) {
    this.add.update(dt);
    this.norm.update(dt);
    for (const s of [...this.popups]) {
      const u = s.userData;
      u.age += dt;
      const k = Math.min(1, u.age / 0.15);
      const sc = (1.2 + (1 - k) * 1.5) * 1.3;
      s.scale.set(sc * u.aspect * 0.55, sc * 0.55, 1);
      s.position.y += dt * 1.5;
      s.material.opacity = u.age < 0.6 ? 1 : Math.max(0, 1 - (u.age - 0.6) / 0.4);
      if (u.age > 1.0) this.removePopup(s);
    }
  }

  dispose() {
    for (const tr of this.trails.values()) tr.dispose();
    for (const p of [...this.popups]) this.removePopup(p);
    for (const { t } of this.textCache.values()) t.dispose();
  }
}
