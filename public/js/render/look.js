// Alles voor een mooiere, realistischere look: materialen met licht en reflecties,
// afgeronde vormen, een lucht met wolken, omgevingslicht en betere bomen.
// Alles blijft licht genoeg voor telefoons.
import * as THREE from '../../vendor/three.module.min.js';

let renderer = null;
export function setRenderer(r) { renderer = r; }
export function getRenderer() { return renderer; }

// Kwaliteit: 'hoog' = alles echt (reflecties overal), 'normaal' = snelle wereld met
// glimmende karts, 'laag' = alles zo licht mogelijk (oude of trage telefoons).
export const Q = { mode: 'normaal', low: false, high: false };
export function setQuality(mode) {
  Q.mode = mode === 'hoog' || mode === 'laag' ? mode : 'normaal';
  Q.low = Q.mode === 'laag';
  Q.high = Q.mode === 'hoog';
}
export function setLowQuality(v) { setQuality(v ? 'laag' : 'normaal'); }
function lite(p, shiny = 0) {
  const { roughness, metalness, normalMap, normalScale, envMapIntensity, ...rest } = p;
  if (shiny > 0) return new THREE.MeshPhongMaterial({ shininess: shiny, specular: '#555555', ...rest });
  return new THREE.MeshLambertMaterial(rest);
}

// ---------- materialen ----------
// std: mat oppervlak (gras, hout, stof). gloss: glimmend (lak, water, plastic). metal: metaal.
export function std(p = {}) {
  const { flatShading, shininess, specular, ...rest } = p;
  if (!Q.high) return lite(rest, (rest.roughness ?? 1) < 0.4 ? 40 : 0);
  return new THREE.MeshStandardMaterial({ roughness: 0.86, metalness: 0, ...rest });
}
export function gloss(p = {}) {
  const { flatShading, shininess = 60, specular, ...rest } = p;
  if (!Q.high) return lite(rest, shininess);
  return new THREE.MeshStandardMaterial({ roughness: Math.max(0.08, 0.62 - shininess / 260), metalness: 0, ...rest });
}
export function metal(p = {}) {
  if (Q.low) return lite(p, 90);
  return new THREE.MeshStandardMaterial({ roughness: 0.28, metalness: 0.9, ...p });
}
// echt materiaal (lak, water): bij lage kwaliteit een simpele glimmende variant
export function pbr(p = {}) {
  if (Q.low) return lite(p, (p.roughness ?? 1) < 0.3 ? 80 : (p.metalness || 0) > 0.5 ? 90 : 0);
  return new THREE.MeshStandardMaterial(p);
}

// ---------- vormen ----------
// Doos met afgeronde randen (zelfde maat en UV's als een gewone doos).
export function roundedBox(w, h, d, r, seg = 2) {
  r = Math.max(0.001, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
  const n = seg * 2 + 1;
  const g = new THREE.BoxGeometry(1, 1, 1, n, n, n);
  const pos = g.attributes.position, nor = g.attributes.normal;
  const size = [w, h, d];
  const inner = [w / 2 - r, h / 2 - r, d / 2 - r];
  const p = [0, 0, 0], c = [0, 0, 0];
  for (let i = 0; i < pos.count; i++) {
    p[0] = pos.getX(i); p[1] = pos.getY(i); p[2] = pos.getZ(i);
    for (let a = 0; a < 3; a++) {
      const j = Math.round((p[a] + 0.5) * n);
      const rr = r / size[a];
      let f;
      if (j <= seg) f = -0.5 + (j / seg) * rr;
      else f = 0.5 - ((n - j) / seg) * rr;
      p[a] = f * size[a];
      c[a] = Math.max(-inner[a], Math.min(inner[a], p[a]));
    }
    const dx = p[0] - c[0], dy = p[1] - c[1], dz = p[2] - c[2];
    const len = Math.hypot(dx, dy, dz);
    if (len > 1e-6) {
      pos.setXYZ(i, c[0] + (dx / len) * r, c[1] + (dy / len) * r, c[2] + (dz / len) * r);
      nor.setXYZ(i, dx / len, dy / len, dz / len);
    } else pos.setXYZ(i, p[0], p[1], p[2]);
  }
  g.userData.smooth = true;
  return g;
}

function sameBounds(a, b) {
  a.computeBoundingBox(); b.computeBoundingBox();
  return a.boundingBox.min.distanceTo(b.boundingBox.min) < 1e-4 && a.boundingBox.max.distanceTo(b.boundingBox.max) < 1e-4;
}

// Maakt een simpele vorm gladder: ronde randen aan dozen, meer segmenten aan bollen en cilinders.
// Alleen als de vorm na het maken niet verschoven is (anders laten we hem met rust).
const smoothCache = new WeakMap();
export function smoothGeometry(g, { maxR = 0.12 } = {}) {
  if (!g || g.userData.smooth) return g;
  if (smoothCache.has(g)) return smoothCache.get(g);
  const p = g.parameters;
  let out = g;
  if (p) {
    let ref = null, hi = null;
    switch (g.type) {
      case 'BoxGeometry': {
        const m = Math.min(p.width, p.height, p.depth);
        if (m > 0.025 && p.widthSegments === 1 && p.heightSegments === 1 && p.depthSegments === 1) {
          ref = new THREE.BoxGeometry(p.width, p.height, p.depth);
          hi = roundedBox(p.width, p.height, p.depth, Math.min(m * 0.2, maxR), 2);
        }
        break;
      }
      case 'SphereGeometry':
        if (p.widthSegments < 22) {
          ref = new THREE.SphereGeometry(p.radius, p.widthSegments, p.heightSegments, p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
          hi = new THREE.SphereGeometry(p.radius, Math.max(22, Math.round(p.widthSegments * 1.8)), Math.max(14, Math.round(p.heightSegments * 1.8)), p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
        }
        break;
      case 'CylinderGeometry':
        if (p.radialSegments >= 7 && p.radialSegments < 22) {
          ref = new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, p.radialSegments, p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength);
          hi = new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, 22, p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength);
        }
        break;
      case 'ConeGeometry':
        if (p.radialSegments >= 7 && p.radialSegments < 22) {
          ref = new THREE.ConeGeometry(p.radius, p.height, p.radialSegments, p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength);
          hi = new THREE.ConeGeometry(p.radius, p.height, 22, p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength);
        }
        break;
      case 'TorusGeometry':
        if (p.radialSegments < 12 || p.tubularSegments < 28) {
          ref = new THREE.TorusGeometry(p.radius, p.tube, p.radialSegments, p.tubularSegments, p.arc);
          hi = new THREE.TorusGeometry(p.radius, p.tube, Math.max(12, p.radialSegments), Math.max(28, p.tubularSegments * 2), p.arc);
        }
        break;
      default: break;
    }
    if (hi && ref && sameBounds(g, ref)) { out = hi; out.userData.smooth = true; }
    else if (hi) hi.dispose();
    if (ref) ref.dispose();
  }
  smoothCache.set(g, out);
  return out;
}

// Een heel object gladder maken en (optioneel) schaduw laten werpen.
export function polish(root, { round = true, cast = true, receive = false } = {}) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (round && !o.isInstancedMesh) o.geometry = smoothGeometry(o.geometry);
    const m = o.material;
    const see = m && !m.isMeshBasicMaterial && !(m.transparent && m.opacity < 0.6) && m.blending !== THREE.AdditiveBlending;
    if (cast && see) o.castShadow = true;
    if (receive && see) o.receiveShadow = true;
  });
  return root;
}

// ---------- ruis en texturen ----------
function hash2(x, y, s) {
  const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return h - Math.floor(h);
}
// Naadloze waarde-ruis (vier lagen) in een canvas.
let noiseTex = null;
export function noiseTexture() {
  if (noiseTex) return noiseTex;
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const g = c.getContext('2d');
  const img = g.createImageData(S, S);
  const layer = (x, y, cells, seed) => {
    const fx = (x / S) * cells, fy = (y / S) * cells;
    const ix = Math.floor(fx), iy = Math.floor(fy);
    let ux = fx - ix, uy = fy - iy;
    ux = ux * ux * (3 - 2 * ux); uy = uy * uy * (3 - 2 * uy);
    const v = (a, b) => hash2(((a % cells) + cells) % cells, ((b % cells) + cells) % cells, seed);
    const top = v(ix, iy) + (v(ix + 1, iy) - v(ix, iy)) * ux;
    const bot = v(ix, iy + 1) + (v(ix + 1, iy + 1) - v(ix, iy + 1)) * ux;
    return top + (bot - top) * uy;
  };
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      const r = layer(x, y, 4, 1) * 0.55 + layer(x, y, 8, 2) * 0.3 + layer(x, y, 16, 3) * 0.15;
      const gg = layer(x, y, 16, 4) * 0.5 + layer(x, y, 32, 5) * 0.3 + layer(x, y, 64, 6) * 0.2;
      const b = hash2(x, y, 9);
      img.data[i] = r * 255; img.data[i + 1] = gg * 255; img.data[i + 2] = b * 255; img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  noiseTex = new THREE.CanvasTexture(c);
  noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;
  noiseTex.colorSpace = THREE.NoColorSpace;
  return noiseTex;
}

// Normaalkaart voor fijne korrel (asfalt, beton, zand).
const grainCache = new Map();
export function grainNormalMap(strength = 1.6, seed = 1) {
  const key = strength + ':' + seed;
  if (grainCache.has(key)) return grainCache.get(key);
  const S = 256;
  const hgt = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    // korrels + een paar grotere steentjes
    let v = hash2(x, y, seed) * 0.6;
    v += hash2(Math.floor(x / 3), Math.floor(y / 3), seed + 1) * 0.4;
    hgt[y * S + x] = v;
  }
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const g = c.getContext('2d');
  const img = g.createImageData(S, S);
  const at = (x, y) => hgt[((y + S) % S) * S + ((x + S) % S)];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
    const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1);
    const i = (y * S + x) * 4;
    img.data[i] = (-dx / l * 0.5 + 0.5) * 255;
    img.data[i + 1] = (-dy / l * 0.5 + 0.5) * 255;
    img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  grainCache.set(key, t);
  return t;
}

// Grote kleurvlekken op de grond (in wereldcoördinaten), zodat je geen herhalend patroon ziet.
export function addVariation(mat, { scale = 0.012, strength = 0.28, detail = 0.12 } = {}) {
  const tex = noiseTexture();
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.varTex = { value: tex };
    sh.uniforms.varScale = { value: scale };
    sh.uniforms.varStr = { value: strength };
    sh.uniforms.varDetail = { value: detail };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vVarPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvVarPos = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vVarPos;\nuniform sampler2D varTex;\nuniform float varScale;\nuniform float varStr;\nuniform float varDetail;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float vBig = texture2D(varTex, vVarPos * varScale).r;
        float vSmall = texture2D(varTex, vVarPos * varScale * 6.1).g;
        diffuseColor.rgb *= (1.0 - varStr * 0.5 + varStr * vBig) * (1.0 - varDetail * 0.5 + varDetail * vSmall);`);
  };
  mat.customProgramCacheKey = () => 'var' + scale + strength + detail;
  return mat;
}

// Grassprietjes (voor graspollen langs de weg)
let tuftTex = null;
export function tuftTexture() {
  if (tuftTex) return tuftTex;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  for (let i = 0; i < 46; i++) {
    const x = 10 + Math.random() * 108;
    const hgt = 60 + Math.random() * 64;
    const lean = (Math.random() - 0.5) * 34;
    const shade = 150 + Math.random() * 90;
    g.strokeStyle = `rgb(${shade * 0.55},${shade},${shade * 0.4})`;
    g.lineWidth = 2 + Math.random() * 3;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x, 128);
    g.quadraticCurveTo(x + lean * 0.3, 128 - hgt * 0.6, x + lean, 128 - hgt);
    g.stroke();
  }
  tuftTex = new THREE.CanvasTexture(c);
  tuftTex.colorSpace = THREE.SRGBColorSpace;
  return tuftTex;
}

// ---------- geometrie samenvoegen ----------
// list: [{ geo, matrix?, color?(THREE.Color of functie(y) -> kleur) }] -> één geometrie met kleuren per hoekpunt
export function mergeParts(list) {
  let count = 0;
  const parts = list.map((pt) => {
    let g = pt.geo.index ? pt.geo.toNonIndexed() : pt.geo.clone();
    if (pt.matrix) g.applyMatrix4(pt.matrix);
    count += g.attributes.position.count;
    return { g, color: pt.color };
  });
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), col = new Float32Array(count * 3);
  let o = 0;
  const c = new THREE.Color();
  for (const { g, color } of parts) {
    const P = g.attributes.position, N = g.attributes.normal;
    for (let i = 0; i < P.count; i++) {
      pos[o * 3] = P.getX(i); pos[o * 3 + 1] = P.getY(i); pos[o * 3 + 2] = P.getZ(i);
      nor[o * 3] = N.getX(i); nor[o * 3 + 1] = N.getY(i); nor[o * 3 + 2] = N.getZ(i);
      if (typeof color === 'function') color(c, P.getX(i), P.getY(i), P.getZ(i));
      else c.set(color || '#ffffff');
      col[o * 3] = c.r; col[o * 3 + 1] = c.g; col[o * 3 + 2] = c.b;
      o++;
    }
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

const M4 = new THREE.Matrix4();
const at = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => {
  const m = new THREE.Matrix4();
  m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s, s, s));
  return m;
};

// Een bobbelige, gladde bol (bladerdak, struik, rots)
export function blob(r, { detail = 2, seed = 1, squash = 1, bump = 0.28 } = {}) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const pos = g.attributes.position, nor = g.attributes.normal;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const n = Math.sin(v.x * 3.1 + seed) * Math.sin(v.y * 2.7 + seed * 1.7) * Math.sin(v.z * 3.3 + seed * 0.6)
      + 0.5 * Math.sin(v.x * 6.3 + seed * 2.1) * Math.sin(v.z * 5.9 + seed);
    const rr = r * (1 + bump * n * 0.6);
    pos.setXYZ(i, v.x * rr, v.y * rr * squash, v.z * rr);
    nor.setXYZ(i, v.x, v.y / Math.max(0.3, squash), v.z);
  }
  // normalen opnieuw normaliseren na het platdrukken
  for (let i = 0; i < nor.count; i++) { v.fromBufferAttribute(nor, i).normalize(); nor.setXYZ(i, v.x, v.y, v.z); }
  return g;
}

// helderheid van onder (donker) naar boven (licht), als kleur per hoekpunt
const shade = (lo, hi, y0, y1, jitter = 0.08) => (c, x, y, z) => {
  const t = Math.max(0, Math.min(1, (y - y0) / (y1 - y0)));
  const v = lo + (hi - lo) * t + (Math.sin(x * 5.1 + z * 3.7) * 0.5) * jitter;
  c.setRGB(v, v, v);
};

// ---------- bomen en planten (voor InstancedMesh) ----------
// Elk geeft een lijst delen { geo, mat, tint? } terug, net als de oude prototypes.
const treeMats = {};
const tm = (key, make) => treeMats[key] || (treeMats[key] = make());

export function treeProto(kind) {
  switch (kind) {
    case 'oak': {
      const trunk = mergeParts([
        { geo: new THREE.CylinderGeometry(0.26, 0.42, 3.6, 9), matrix: at(0, 1.8, 0), color: shade(0.55, 0.9, 0, 3.6) },
        { geo: new THREE.CylinderGeometry(0.1, 0.18, 1.8, 6), matrix: at(0.55, 3.2, 0, 0, 0, -0.8), color: '#c8c8c8' },
        { geo: new THREE.CylinderGeometry(0.1, 0.18, 1.6, 6), matrix: at(-0.45, 3.3, 0.3, 0.4, 0, 0.7), color: '#c8c8c8' },
      ]);
      const crown = mergeParts([
        { geo: blob(2.2, { seed: 1, detail: 1 }), matrix: at(0, 4.9, 0), color: shade(0.55, 1.08, 2.8, 7.2) },
        { geo: blob(1.6, { seed: 2, detail: 1 }), matrix: at(1.5, 4.3, 0.4), color: shade(0.55, 1.05, 2.8, 7.2) },
        { geo: blob(1.5, { seed: 3, detail: 1 }), matrix: at(-1.3, 4.5, -0.6), color: shade(0.55, 1.05, 2.8, 7.2) },
        { geo: blob(1.4, { seed: 4, detail: 1 }), matrix: at(0.2, 5.6, -1.2), color: shade(0.6, 1.1, 2.8, 7.2) },
      ]);
      return [
        { geo: trunk, mat: tm('bark', () => std({ color: '#6e4a2c', vertexColors: true, roughness: 0.95 })) },
        { geo: crown, mat: tm('leaf', () => std({ color: '#ffffff', vertexColors: true, roughness: 0.92 })), tint: true },
      ];
    }
    case 'pine': case 'snowpine': {
      const tiers = [];
      const snow = kind === 'snowpine';
      for (let i = 0; i < 5; i++) {
        const r = 2.5 - i * 0.42, h = 2.4 - i * 0.18, y = 2.0 + i * 1.15;
        const cone = new THREE.ConeGeometry(r, h, 11, 2);
        const p = cone.attributes.position;
        for (let k = 0; k < p.count; k++) {
          const yy = p.getY(k);
          if (yy < -h / 2 + 0.01) { // onderrand: rafelig en een beetje hangend
            const a = Math.atan2(p.getZ(k), p.getX(k));
            const f = 1 + Math.sin(a * 5 + i) * 0.12;
            p.setXYZ(k, p.getX(k) * f, yy - 0.25 * Math.abs(Math.sin(a * 5 + i)), p.getZ(k) * f);
          }
        }
        cone.computeVertexNormals();
        tiers.push({ geo: cone, matrix: at(0, y, 0), color: snow ? ((c, x, yy, z) => { const t = (yy - y + h / 2) / h; const v = t > 0.55 ? 1.0 : 0.62 + t * 0.5; c.setRGB(v, v, v); }) : shade(0.5, 1.0, 0.8, 8.5, 0.06) });
      }
      const crown = mergeParts(tiers);
      const trunk = mergeParts([{ geo: new THREE.CylinderGeometry(0.22, 0.34, 2.4, 8), matrix: at(0, 1.2, 0), color: shade(0.6, 0.9, 0, 2.4) }]);
      return [
        { geo: trunk, mat: tm('bark', () => std({ color: '#6e4a2c', vertexColors: true, roughness: 0.95 })) },
        { geo: crown, mat: snow ? tm('snowneedle', () => std({ color: '#e9f3fb', vertexColors: true, roughness: 0.8 })) : tm('needle', () => std({ color: '#2f6b3c', vertexColors: true, roughness: 0.9 })) },
      ];
    }
    case 'palm': {
      // gebogen stam met ringen
      const parts = [];
      let x = 0, y = 0;
      for (let i = 0; i < 7; i++) {
        const seg = new THREE.CylinderGeometry(0.24 - i * 0.012, 0.3 - i * 0.012, 1.1, 9);
        const lean = 0.05 + i * 0.03;
        parts.push({ geo: seg, matrix: at(x, y + 0.55, 0, 0, 0, -lean), color: (c, px, py) => { const v = 0.72 + ((Math.floor(py * 3.2) % 2) ? 0.18 : 0); c.setRGB(v, v, v); } });
        x += Math.sin(lean) * 1.05; y += Math.cos(lean) * 1.05;
      }
      const trunk = mergeParts(parts);
      // bladeren: gebogen stroken rond de top
      const fronds = [];
      for (let i = 0; i < 9; i++) {
        const leaf = new THREE.PlaneGeometry(1.1, 4.6, 1, 8);
        const p = leaf.attributes.position;
        for (let k = 0; k < p.count; k++) {
          const v = (p.getY(k) + 2.3) / 4.6; // 0 aan de stam, 1 aan de punt
          const w = p.getX(k) * (1 - v * 0.8);
          p.setXYZ(k, w, v * 4.2, -1.9 * v * v + Math.abs(w) * 0.25);
        }
        leaf.rotateX(-Math.PI / 2 + 0.55);
        leaf.computeVertexNormals();
        fronds.push({ geo: leaf, matrix: at(x, y + 0.1, 0, 0, (i / 9) * Math.PI * 2 + 0.3, 0), color: (c, px, py) => { const v = 0.65 + Math.min(0.45, Math.max(0, (py - y) * 0.2 + 0.3)); c.setRGB(v, v, v); } });
      }
      const leaves = mergeParts(fronds);
      const nuts = mergeParts([0, 1, 2].map((i) => ({ geo: new THREE.SphereGeometry(0.22, 10, 8), matrix: at(x + Math.cos(i * 2.1) * 0.3, y - 0.25, Math.sin(i * 2.1) * 0.3), color: '#ffffff' })));
      return [
        { geo: trunk, mat: tm('palmbark', () => std({ color: '#a37a4c', vertexColors: true, roughness: 0.95 })) },
        { geo: leaves, mat: tm('palmleaf', () => std({ color: '#3f9a3a', vertexColors: true, side: THREE.DoubleSide, roughness: 0.75 })) },
        { geo: nuts, mat: tm('nut', () => std({ color: '#6b4320', vertexColors: true })) },
      ];
    }
    case 'bush': {
      const g = mergeParts([
        { geo: blob(1.1, { seed: 5, detail: 1 }), matrix: at(0, 0.7, 0), color: shade(0.55, 1.05, 0, 1.8) },
        { geo: blob(0.85, { seed: 6, detail: 1 }), matrix: at(0.8, 0.55, 0.3), color: shade(0.55, 1.05, 0, 1.8) },
        { geo: blob(0.8, { seed: 7, detail: 1 }), matrix: at(-0.7, 0.5, -0.3), color: shade(0.55, 1.05, 0, 1.8) },
      ]);
      return [{ geo: g, mat: tm('leaf', () => std({ color: '#ffffff', vertexColors: true, roughness: 0.92 })), tint: true }];
    }
    case 'willow': { // knotwilg
      const trunk = mergeParts([{ geo: new THREE.CylinderGeometry(0.45, 0.55, 2.4, 10), matrix: at(0, 1.2, 0), color: shade(0.5, 0.85, 0, 2.4, 0.15) }]);
      const crown = mergeParts([
        { geo: blob(1.6, { seed: 8, squash: 0.85, bump: 0.45, detail: 1 }), matrix: at(0, 3.5, 0), color: shade(0.6, 1.1, 2.2, 5) },
        { geo: blob(1.1, { seed: 9, bump: 0.4, detail: 1 }), matrix: at(0.6, 4.4, 0.2), color: shade(0.6, 1.1, 2.2, 5) },
      ]);
      return [
        { geo: trunk, mat: tm('willowbark', () => std({ color: '#7a6a55', vertexColors: true, roughness: 0.95 })) },
        { geo: crown, mat: tm('leaf', () => std({ color: '#ffffff', vertexColors: true, roughness: 0.92 })), tint: true },
      ];
    }
    case 'deadtree': { // verbrande boom (vulkaan)
      const g = mergeParts([
        { geo: new THREE.CylinderGeometry(0.16, 0.36, 4.2, 7), matrix: at(0, 2.1, 0), color: '#ffffff' },
        { geo: new THREE.CylinderGeometry(0.06, 0.13, 2.0, 5), matrix: at(0.6, 3.5, 0, 0, 0, -0.9), color: '#ffffff' },
        { geo: new THREE.CylinderGeometry(0.05, 0.12, 1.7, 5), matrix: at(-0.5, 3.0, 0.2, 0.3, 0, 0.8), color: '#ffffff' },
        { geo: new THREE.CylinderGeometry(0.04, 0.1, 1.3, 5), matrix: at(0.1, 4.4, -0.4, -0.7, 0, 0.1), color: '#ffffff' },
      ]);
      return [{ geo: g, mat: tm('char', () => std({ color: '#2a2320', vertexColors: true, roughness: 1 })) }];
    }
    case 'rockblob': {
      const g = mergeParts([
        { geo: blob(1, { seed: 11, detail: 1, squash: 0.6, bump: 0.5 }), matrix: at(0, 0.3, 0), color: shade(0.55, 1.0, -0.3, 0.9, 0.12) },
      ]);
      return [{ geo: g, mat: tm('rock', () => std({ color: '#ffffff', vertexColors: true, roughness: 0.9 })), tint: true }];
    }
    case 'tuft': {
      const g = mergeParts([
        { geo: new THREE.PlaneGeometry(1.3, 0.9), matrix: at(0, 0.45, 0, 0, 0.3, 0), color: '#ffffff' },
        { geo: new THREE.PlaneGeometry(1.3, 0.9), matrix: at(0, 0.45, 0, 0, 0.3 + Math.PI / 2, 0), color: '#ffffff' },
      ]);
      // uv's terugzetten (mergeParts laat ze weg)
      const uv = new Float32Array(g.attributes.position.count * 2);
      const quad = [0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1];
      for (let i = 0; i < uv.length; i++) uv[i] = quad[i % 12];
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      // normalen omhoog: dan zijn de sprietjes van alle kanten even licht
      const n = g.attributes.normal;
      for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
      return [{ geo: g, mat: tm('tuft', () => std({ map: tuftTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.95 })), tint: true, noShadow: true }];
    }
    default: return null;
  }
}

// ---------- lucht ----------
const SKY_VERT = `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;
const SKY_FRAG = `
varying vec3 vDir;
uniform vec3 top; uniform vec3 hor; uniform vec3 ground; uniform vec3 sunDir; uniform vec3 sunCol;
uniform float time; uniform float clouds; uniform float cloudCover; uniform vec3 cloudCol; uniform float sunSize;
uniform sampler2D noiseTex;
// wolkenruis uit een kant-en-klare textuur: veel sneller dan uitrekenen
float fbm(vec2 p) {
  return texture2D(noiseTex, p * 0.09).r * 0.72 + texture2D(noiseTex, p * 0.31 + 0.37).g * 0.28;
}
void main() {
  vec3 d = normalize(vDir);
  float h = max(d.y, 0.0);
  vec3 col = mix(hor, top, pow(h, 0.5));
  float sd = max(dot(d, sunDir), 0.0);
  col += sunCol * (pow(sd, 6.0) * 0.18 + pow(sd, 48.0) * 0.35);
  col += sunCol * smoothstep(1.0 - sunSize, 1.0 - sunSize * 0.6, sd) * 3.0;
  if (clouds > 0.5 && d.y > 0.0) {
    vec2 uv = d.xz / (d.y + 0.08) * 0.9 + vec2(time * 0.006, time * 0.002);
    float n = fbm(uv);
    float c = smoothstep(cloudCover, cloudCover + 0.2, n) * smoothstep(0.0, 0.12, d.y);
    float light = 0.78 + 0.3 * smoothstep(cloudCover + 0.05, cloudCover + 0.35, n) + pow(sd, 4.0) * 0.4;
    col = mix(col, cloudCol * light, c * 0.92);
  }
  col = mix(col, ground, smoothstep(0.0, -0.08, d.y));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function skyMaterial(th) {
  const sun = new THREE.Vector3(...(th.sunDir || [0.45, 0.62, 0.35])).normalize();
  return new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    uniforms: {
      top: { value: new THREE.Color(th.sky[0]) },
      hor: { value: new THREE.Color(th.sky[1]) },
      ground: { value: new THREE.Color(th.horizonGround || th.fog) },
      sunDir: { value: sun },
      sunCol: { value: new THREE.Color(th.sun[0]) },
      time: { value: 0 },
      clouds: { value: th.clouds === false || th.stars || Q.low ? 0 : 1 },
      cloudCover: { value: th.cloudCover ?? 0.52 },
      cloudCol: { value: new THREE.Color(th.cloudCol || '#ffffff') },
      sunSize: { value: th.stars ? 0.0 : 0.0016 },
      noiseTex: { value: noiseTexture() },
    },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
}

// Omgevingslicht (reflecties in lak, water en metaal) uit de lucht van het thema.
export function environmentFor(th) {
  if (!renderer || Q.low) return null;
  const scene = new THREE.Scene();
  const mat = skyMaterial({ ...th, clouds: false, horizonGround: th.ground ? th.ground[0] : th.fog });
  mat.uniforms.sunSize.value = 0.03; // grote zachte zon voor mooie glimlichtjes
  mat.toneMapped = false;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), mat);
  scene.add(sky);
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(scene, 0.02, 0.1, 200);
  pm.dispose();
  sky.geometry.dispose();
  mat.dispose();
  return rt;
}
