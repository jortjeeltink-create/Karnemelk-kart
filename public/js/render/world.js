// Bouwt de 3D-wereld van een baan: weg, bermen, muren, obstakels, itemdozen en decor.
import * as THREE from '../../vendor/three.module.min.js';
import { rng, hashString } from '../../shared/util.js';
import { roadTexture, groundTexture, stripeTexture, checkerTexture, arrowTexture, questionTexture, patternTexture, facadeTexture, containerTexture, textCanvas, glowTexture } from './textures.js';
import { lambert } from './kart.js';
import { std, gloss, metal, pbr, Q, polish, treeProto, skyMaterial, environmentFor, addVariation, grainNormalMap, noiseTexture, smoothGeometry } from './look.js';
import { addRoadside } from './roadside.js';

export const THEMES = {
  kust: {
    sky: ['#3aa5ff', '#d4f1ff'], fog: '#cbeaff', fogFar: 560, road: 'asfalt',
    ground: ['#ecd49b', ['#e0c486', '#f5e3b2', '#d4b677']], shoulder: ['#f3dfaa', ['#e7cf92', '#fbeccc']],
    curb: ['#ff4b4b', '#ffffff'], wall: { style: 'blokken', c1: '#ffffff', c2: '#2f7de1', h: 0.9 },
    hemi: ['#ffffff', '#e8c88a', 1.1], sun: ['#fff1d6', 1.7], water: 'zee', music: 0, grass: '#c2b56a',
  },
  pretpark: {
    sky: ['#5b3cff', '#ffb8dd'], fog: '#f0b7e6', fogFar: 480, road: 'snoep',
    ground: ['#79cf63', ['#6cc257', '#8ade73', '#65b852']], shoulder: ['#ffe6f2', ['#ffd0e6', '#fff3f9']],
    curb: ['#ffd23f', '#ff4fa0'], wall: { style: 'blokken', c1: '#ffd23f', c2: '#3dd6d0', h: 0.9 },
    hemi: ['#ffe0f4', '#7a6cff', 1.15], sun: ['#ffe9f3', 1.4], music: 1, grass: '#6cc257', hills: '#5aa85a', cloudCol: '#fff0f8',
  },
  stad: {
    sky: ['#ff7a59', '#ffd9a8'], fog: '#ffc79f', fogFar: 470, road: 'klinkers',
    ground: ['#858c80', ['#7c8378', '#8f968a', '#777e72']], shoulder: ['#b9b6ae', ['#a9a69e', '#c7c4bc']],
    curb: ['#eeeeee', '#555555'], wall: { style: 'baksteen', c1: '#9c4a32', c2: '#7d3a28', h: 1.0 },
    hemi: ['#ffe7cf', '#6a6f8a', 1.05], sun: ['#ffc58a', 1.5], water: 'gracht', music: 2,
  },
  bos: {
    sky: ['#58a9e4', '#dbf0cf'], fog: '#bcdcae', fogFar: 360, road: 'aarde',
    ground: ['#3f8a37', ['#377d30', '#4a9a40', '#33722c']], shoulder: ['#5e9a3e', ['#558f37', '#6aa748']],
    curb: ['#8b5a2b', '#c49a6c'], wall: { style: 'hek', c1: '#7a5230', c2: '#5e3d22', h: 1.0 },
    hemi: ['#f4ffe8', '#2f5a24', 1.1], sun: ['#fff6d8', 1.5], music: 3, grass: '#4f9a3e', hills: '#2f6a35',
  },
  haven: {
    sky: ['#6f93c2', '#e1e9f1'], fog: '#d4dee8', fogFar: 520, road: 'beton',
    ground: ['#9aa1a8', ['#8f969d', '#a6adb4', '#868d94']], shoulder: ['#b7bdc4', ['#aab0b7', '#c4cad0']],
    curb: ['#ffd23f', '#222222'], wall: { style: 'blokken', c1: '#ffd23f', c2: '#222222', h: 1.0 },
    hemi: ['#f0f5ff', '#5b6b7d', 1.1], sun: ['#fff8ec', 1.5], water: 'haven', music: 4, exposure: 0.84,
  },
  sneeuw: {
    sky: ['#7dbdff', '#f3f9ff'], fog: '#e8f2ff', fogFar: 440, road: 'sneeuw',
    ground: ['#f2f7fc', ['#e6eef6', '#ffffff', '#dbe6f1']], shoulder: ['#ffffff', ['#eef4fa', '#e3ecf5']],
    curb: ['#e63946', '#ffffff'], wall: { style: 'sneeuwwal', c1: '#ffffff', c2: '#dfe9f3', h: 1.2 },
    hemi: ['#ffffff', '#9fb6cc', 1.05], sun: ['#ffffff', 1.3], snow: true, music: 5, cloudCover: 0.48, exposure: 0.78,
  },
  woestijn: {
    sky: ['#ff9e57', '#ffe9c4'], fog: '#f6d6a2', fogFar: 520, road: 'asfalt',
    ground: ['#e9b56a', ['#dca55c', '#f2c47f', '#d39a4f']], shoulder: ['#dba05a', ['#cf934d', '#e7b06c']],
    curb: ['#ffffff', '#ff7b00'], wall: { style: 'rots', c1: '#c76b3a', c2: '#a8552b', h: 1.4 },
    hemi: ['#fff1d8', '#b06a35', 1.1], sun: ['#fff0c8', 1.8], music: 6, grass: '#b89a5a', cloudCover: 0.62,
  },
  boerderij: {
    sky: ['#4aa3ff', '#e2f2ff'], fog: '#d8ecff', fogFar: 500, road: 'zand',
    ground: ['#67bb46', ['#5daf3e', '#74c752', '#56a438']], shoulder: ['#8dd062', ['#81c457', '#9adb6e']],
    curb: ['#ffffff', '#d93a3a'], wall: { style: 'hek', c1: '#ffffff', c2: '#dddddd', h: 1.0 },
    hemi: ['#ffffff', '#5e8f3a', 1.1], sun: ['#fff6e0', 1.6], music: 7, grass: '#6cbd4c', hills: '#4f9645',
  },
  polder: {
    sky: ['#3d8fe0', '#dcecf8'], fog: '#cfe2f1', fogFar: 540, road: 'asfalt',
    ground: ['#5aa83c', ['#509c35', '#66b546', '#4a9230', '#71bd50']], shoulder: ['#74bf4d', ['#69b444', '#80ca58']],
    curb: ['#ffffff', '#2f7de1'], wall: { style: 'hek', c1: '#ffffff', c2: '#d6d6d6', h: 1.0 },
    hemi: ['#ffffff', '#5e8f3a', 1.1], sun: ['#fff6e0', 1.65], music: 7, cloudCover: 0.44, grass: '#7cc04f', hills: '#4f8f45',
  },
  nacht: {
    sky: ['#03041a', '#1d1d4a'], fog: '#15163a', fogFar: 480, road: 'asfalt',
    ground: ['#262833', ['#22242e', '#2c2e39', '#1f2129']], shoulder: ['#33364a', ['#2e3144', '#3a3d52']],
    curb: ['#ff3fa4', '#3ff6ff'], wall: { style: 'glow', c1: '#ff3fa4', c2: '#3ff6ff', h: 0.9 },
    hemi: ['#9a9cff', '#2a2440', 1.5], sun: ['#aebfff', 1.0], music: 2, night: true, clouds: false, sunDir: [-0.45, 0.6, 0.35], exposure: 1.1,
  },
  vulkaan: {
    sky: ['#3b1712', '#ff9a5c'], fog: '#b0603e', fogFar: 440, road: 'beton',
    ground: ['#2f2826', ['#29221f', '#3a312d', '#231d1a', '#43372f']], shoulder: ['#3f3430', ['#372d29', '#4a3d37']],
    curb: ['#ff5a1f', '#2a2a2a'], wall: { style: 'rots', c1: '#3a302c', c2: '#241d1b', h: 1.3 },
    hemi: ['#ffcfa8', '#5a2a1a', 1.05], sun: ['#ffb889', 1.55], music: 6, cloudCol: '#6b5551', cloudCover: 0.4, sunDir: [-0.5, 0.4, -0.45], hills: '#2a211e',
  },
  melkweg: {
    sky: ['#03031a', '#2a1660'], fog: '#150c38', fogFar: 650, road: 'melk',
    ground: null, shoulder: ['#3b2b86', ['#4b37a8', '#2f2270']],
    curb: ['#7cf8ff', '#ff7cf2'], wall: { style: 'glow', c1: '#7cf8ff', c2: '#ff7cf2', h: 0.8 },
    hemi: ['#b9b3ff', '#2a1660', 1.25], sun: ['#ffffff', 1.0], stars: true, music: 8,
  },
};

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const tmpE = new THREE.Euler();
const tmpC = new THREE.Color();

// ---------- geometriehulpjes ----------
function ribbon(track, d0, d1, y, vScale, { yOuter = null } = {}) {
  const N = track.N;
  const pos = new Float32Array((N + 1) * 2 * 3);
  const uv = new Float32Array((N + 1) * 2 * 2);
  const idx = [];
  for (let k = 0; k <= N; k++) {
    const i = k % N;
    const cx = track.px[i], cz = track.pz[i], nx = track.nx[i], nz = track.nz[i];
    const o = k * 6;
    pos[o] = cx + nx * d0; pos[o + 1] = y; pos[o + 2] = cz + nz * d0;
    pos[o + 3] = cx + nx * d1; pos[o + 4] = yOuter == null ? y : yOuter; pos[o + 5] = cz + nz * d1;
    const v = (k * track.step) / vScale;
    uv[k * 4] = 0; uv[k * 4 + 1] = v; uv[k * 4 + 2] = 1; uv[k * 4 + 3] = v;
    if (k < N) {
      const a = k * 2, b = a + 1, c = a + 2, d = a + 3;
      if (d1 > d0) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function wallGeometry(track, d, h, lean = 0) {
  const N = track.N;
  const pos = new Float32Array((N + 1) * 2 * 3);
  const uv = new Float32Array((N + 1) * 2 * 2);
  const idx = [];
  const out = Math.sign(d);
  for (let k = 0; k <= N; k++) {
    const i = k % N;
    const cx = track.px[i], cz = track.pz[i], nx = track.nx[i], nz = track.nz[i];
    const o = k * 6;
    pos[o] = cx + nx * d; pos[o + 1] = 0; pos[o + 2] = cz + nz * d;
    pos[o + 3] = cx + nx * (d + out * lean); pos[o + 4] = h; pos[o + 5] = cz + nz * (d + out * lean);
    const v = (k * track.step) / 4;
    uv[k * 4] = v; uv[k * 4 + 1] = 0; uv[k * 4 + 2] = v; uv[k * 4 + 3] = 1;
    if (k < N) {
      const a = k * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function wallTexture(style, c1, c2) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 32;
  const g = c.getContext('2d');
  if (style === 'baksteen') {
    g.fillStyle = '#d8cfc4'; g.fillRect(0, 0, 128, 32);
    for (let y = 0; y < 32; y += 8) for (let x = (y / 8) % 2 ? -8 : 0; x < 128; x += 16) {
      g.fillStyle = (x + y) % 3 ? c1 : c2; g.fillRect(x + 1, y + 1, 14, 6);
    }
  } else if (style === 'hek') {
    g.clearRect(0, 0, 128, 32);
    g.fillStyle = c1;
    g.fillRect(0, 6, 128, 5); g.fillRect(0, 20, 128, 5);
    for (let x = 4; x < 128; x += 32) { g.fillStyle = c2; g.fillRect(x, 0, 7, 32); }
  } else if (style === 'sneeuwwal' || style === 'rots') {
    g.fillStyle = c1; g.fillRect(0, 0, 128, 32);
    const r = rng(4);
    for (let i = 0; i < 300; i++) { g.fillStyle = r() < 0.5 ? c2 : 'rgba(255,255,255,0.25)'; g.fillRect(r() * 128, r() * 32, 3 + r() * 6, 2 + r() * 4); }
  } else if (style === 'glow') {
    const grd = g.createLinearGradient(0, 32, 0, 0);
    grd.addColorStop(0, c1); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 32);
    g.fillStyle = c2; g.fillRect(0, 28, 128, 4);
  } else {
    for (let x = 0; x < 128; x += 32) { g.fillStyle = (x / 32) % 2 ? c2 : c1; g.fillRect(x, 0, 32, 32); }
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(0, 28, 128, 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function prism(r, len) { // driehoekig dak, nok langs x
  const g = new THREE.CylinderGeometry(r, r, len, 3);
  g.rotateZ(Math.PI / 2);
  g.rotateX(-Math.PI / 2);
  return g;
}

// prototype = lijst van delen { geo, mat, tint? }; instances = [{x,y,z,ry,s,sx,sy,sz,color}]
function instanced(parent, proto, instances) {
  if (!instances.length) return;
  for (const part of proto) {
    const im = new THREE.InstancedMesh(part.geo, part.mat, instances.length);
    instances.forEach((it, n) => {
      tmpP.set(it.x, it.y || 0, it.z);
      tmpE.set(it.rx || 0, it.ry || 0, it.rz || 0);
      tmpQ.setFromEuler(tmpE);
      const s = it.s || 1;
      tmpS.set(s * (it.sx || 1), s * (it.sy || 1), s * (it.sz || 1));
      tmpM.compose(tmpP, tmpQ, tmpS);
      im.setMatrixAt(n, tmpM);
      if (part.tint) im.setColorAt(n, tmpC.set(it.color || '#ffffff'));
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.frustumCulled = false;
    if (part.noShadow) im.userData.noShadow = true;
    parent.add(im);
  }
}

const P = {}; // prototypes, lui aangemaakt
function proto(name) {
  if (P[name]) return P[name];
  const tp = treeProto(name === 'rock' ? 'rockblob' : name);
  if (tp) { P[name] = tp; return tp; }
  const L = lambert;
  let p;
  switch (name) {
    case 'palm': {
      const trunk = new THREE.CylinderGeometry(0.22, 0.38, 7, 6); trunk.translate(0, 3.5, 0);
      const leaves = new THREE.ConeGeometry(2.8, 1.3, 7); leaves.translate(0, 7.3, 0);
      const nuts = new THREE.IcosahedronGeometry(0.45, 0); nuts.translate(0, 6.6, 0.3);
      p = [{ geo: trunk, mat: L('#9b6b3d') }, { geo: leaves, mat: L('#2fae4f') }, { geo: nuts, mat: L('#6b4320') }];
      break;
    }
    case 'pine': case 'snowpine': {
      const trunk = new THREE.CylinderGeometry(0.25, 0.35, 2, 6); trunk.translate(0, 1, 0);
      const c1 = new THREE.ConeGeometry(2.4, 3.2, 7); c1.translate(0, 3.2, 0);
      const c2 = new THREE.ConeGeometry(1.9, 2.8, 7); c2.translate(0, 4.8, 0);
      const c3 = new THREE.ConeGeometry(1.3, 2.4, 7); c3.translate(0, 6.3, 0);
      const green = L('#2d6b3a');
      p = [{ geo: trunk, mat: L('#6b4a2e') }, { geo: c1, mat: green }, { geo: c2, mat: green }, { geo: c3, mat: name === 'snowpine' ? L('#ffffff') : green }];
      if (name === 'snowpine') { p[1].mat = L('#3d7a55'); p[2].mat = L('#e9f3fb'); }
      break;
    }
    case 'oak': {
      const trunk = new THREE.CylinderGeometry(0.3, 0.45, 3, 6); trunk.translate(0, 1.5, 0);
      const crown = new THREE.IcosahedronGeometry(2.4, 0); crown.translate(0, 4.3, 0);
      p = [{ geo: trunk, mat: L('#7a5230') }, { geo: crown, mat: L('#ffffff'), tint: true }];
      break;
    }
    case 'bush': { const g = new THREE.IcosahedronGeometry(1.2, 0); g.translate(0, 0.7, 0); p = [{ geo: g, mat: L('#ffffff'), tint: true }]; break; }
    case 'rock': { const g = new THREE.DodecahedronGeometry(1.4, 0); g.translate(0, 0.6, 0); p = [{ geo: g, mat: L('#ffffff'), tint: true }]; break; }
    case 'mushroom': {
      const stem = new THREE.CylinderGeometry(0.5, 0.7, 3, 8); stem.translate(0, 1.5, 0);
      const cap = new THREE.SphereGeometry(2.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2); cap.scale(1, 0.7, 1); cap.translate(0, 2.9, 0);
      p = [{ geo: stem, mat: L('#f6f1e4') }, { geo: cap, mat: std({ map: patternTexture('stippen', '#e0312b') }) }];
      break;
    }
    case 'house': {
      const box = new THREE.BoxGeometry(6, 10, 6); box.translate(0, 5, 0);
      const roof = prism(3.6, 6.4); roof.scale(1, 1, 0.75); roof.translate(0, 11.2, 0);
      const mats = ['#a3523a', '#5a3b2e', '#c9a77c', '#3f5560', '#7b2d26'].map((c, i) => std({ map: facadeTexture(c, i + 1) }));
      p = [{ geo: box, mat: mats[0], tint: true }, { geo: roof, mat: L('#3a3a42') }];
      p.facades = mats;
      break;
    }
    case 'hut': {
      const box = new THREE.BoxGeometry(3, 2.6, 3); box.translate(0, 1.3, 0);
      const roof = prism(1.9, 3.4); roof.scale(1, 1, 0.6); roof.translate(0, 3.1, 0);
      p = [{ geo: box, mat: std({ map: stripeTexture('#ffffff', '#ffffff', 2, true) }), tint: true }, { geo: roof, mat: L('#f4f0e8') }];
      break;
    }
    case 'parasol': {
      const pole = new THREE.CylinderGeometry(0.06, 0.06, 2.6, 5); pole.translate(0, 1.3, 0);
      const top = new THREE.ConeGeometry(1.6, 0.7, 8); top.translate(0, 2.7, 0);
      p = [{ geo: pole, mat: L('#eeeeee') }, { geo: top, mat: L('#ffffff'), tint: true }];
      break;
    }
    case 'container': {
      const box = new THREE.BoxGeometry(2.6, 2.6, 12); box.translate(0, 1.3, 0);
      p = [{ geo: box, mat: std({ map: containerTexture('#ffffff') }), tint: true }];
      break;
    }
    case 'snowman': {
      const a = new THREE.SphereGeometry(0.9, 10, 8); a.translate(0, 0.8, 0);
      const b = new THREE.SphereGeometry(0.65, 10, 8); b.translate(0, 2.0, 0);
      const c = new THREE.SphereGeometry(0.45, 10, 8); c.translate(0, 2.9, 0);
      const nose = new THREE.ConeGeometry(0.09, 0.45, 6); nose.rotateX(Math.PI / 2); nose.translate(0, 2.9, 0.6);
      const hat = new THREE.CylinderGeometry(0.32, 0.32, 0.45, 8); hat.translate(0, 3.45, 0);
      const w = L('#ffffff');
      p = [{ geo: a, mat: w }, { geo: b, mat: w }, { geo: c, mat: w }, { geo: nose, mat: L('#ff8c1a') }, { geo: hat, mat: L('#222222') }];
      break;
    }
    case 'mountain': {
      const m = new THREE.ConeGeometry(1, 1, 7); m.translate(0, 0.5, 0);
      const cap = new THREE.ConeGeometry(0.42, 0.42, 7); cap.translate(0, 0.79, 0);
      p = [{ geo: m, mat: L('#8a97a8') }, { geo: cap, mat: L('#ffffff') }];
      break;
    }
    case 'cactus': {
      const col = new THREE.CylinderGeometry(0.45, 0.5, 5, 7); col.translate(0, 2.5, 0);
      const arm1 = new THREE.CylinderGeometry(0.3, 0.3, 1.8, 6); arm1.translate(1.0, 2.8, 0);
      const arm1b = new THREE.CylinderGeometry(0.3, 0.3, 1.0, 6); arm1b.rotateZ(Math.PI / 2); arm1b.translate(0.6, 2.0, 0);
      const arm2 = new THREE.CylinderGeometry(0.3, 0.3, 1.4, 6); arm2.translate(-0.95, 3.4, 0);
      const arm2b = new THREE.CylinderGeometry(0.3, 0.3, 0.9, 6); arm2b.rotateZ(Math.PI / 2); arm2b.translate(-0.55, 2.8, 0);
      const green = L('#3f9a4a');
      p = [col, arm1, arm1b, arm2, arm2b].map((geo) => ({ geo, mat: green }));
      break;
    }
    case 'mesa': {
      const g = new THREE.CylinderGeometry(1, 1.25, 1, 7); g.translate(0, 0.5, 0);
      const band = new THREE.CylinderGeometry(1.08, 1.13, 0.12, 7); band.translate(0, 0.45, 0);
      p = [{ geo: g, mat: L('#c8653a') }, { geo: band, mat: L('#e8a15c') }];
      break;
    }
    case 'dune': { const g = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); p = [{ geo: g, mat: L('#ffffff'), tint: true }]; break; }
    case 'barn': {
      const box = new THREE.BoxGeometry(10, 6, 14); box.translate(0, 3, 0);
      const roof = prism(6.2, 15); roof.rotateY(Math.PI / 2); roof.scale(1, 0.75, 1); roof.translate(0, 7.2, 0);
      const door = new THREE.BoxGeometry(4, 4, 0.2); door.translate(0, 2, 7.05);
      p = [{ geo: box, mat: L('#c8352c') }, { geo: roof, mat: L('#4a4a52') }, { geo: door, mat: L('#ffffff') }];
      break;
    }
    case 'cow': {
      const body = new THREE.BoxGeometry(1.1, 1.0, 2.0); body.translate(0, 1.2, 0);
      const head = new THREE.BoxGeometry(0.7, 0.7, 0.8); head.translate(0, 1.5, 1.25);
      const snout = new THREE.BoxGeometry(0.6, 0.35, 0.3); snout.translate(0, 1.35, 1.7);
      const legs = new THREE.BoxGeometry(0.9, 0.7, 1.6); legs.translate(0, 0.35, 0);
      p = [{ geo: body, mat: std({ map: patternTexture('koe') }) }, { geo: head, mat: L('#ffffff') }, { geo: snout, mat: L('#f2a7b3') }, { geo: legs, mat: L('#2a2a2a') }];
      break;
    }
    case 'haybale': { const g = new THREE.CylinderGeometry(0.9, 0.9, 1.6, 10); g.rotateZ(Math.PI / 2); g.translate(0, 0.9, 0); p = [{ geo: g, mat: L('#e9c46a') }]; break; }
    case 'tent': {
      const base = new THREE.CylinderGeometry(2.6, 2.6, 2.4, 10); base.translate(0, 1.2, 0);
      const top = new THREE.ConeGeometry(3.0, 2.6, 10); top.translate(0, 3.7, 0);
      const flag = new THREE.ConeGeometry(0.25, 0.8, 4); flag.translate(0, 5.3, 0);
      p = [{ geo: base, mat: std({ map: stripeTexture('#ffffff', '#e8423f', 8, true) }) },
        { geo: top, mat: std({ map: stripeTexture('#ffffff', '#ffffff', 2, true) }), tint: true }, { geo: flag, mat: L('#ffd23f') }];
      break;
    }
    case 'balloon': { const g = new THREE.SphereGeometry(0.7, 10, 8); g.scale(1, 1.2, 1); p = [{ geo: g, mat: L('#ffffff', { emissive: '#222' }), tint: true }]; break; }
    case 'lamp': {
      const pole = new THREE.CylinderGeometry(0.08, 0.1, 4.5, 6); pole.translate(0, 2.25, 0);
      const bulb = new THREE.SphereGeometry(0.32, 8, 6); bulb.translate(0, 4.6, 0);
      p = [{ geo: pole, mat: L('#2b2d36') }, { geo: bulb, mat: new THREE.MeshBasicMaterial({ color: '#fff3b0' }) }];
      break;
    }
    case 'chalet': {
      const box = new THREE.BoxGeometry(7, 4.5, 6); box.translate(0, 2.25, 0);
      const roof = prism(4.6, 7.8); roof.rotateY(Math.PI / 2); roof.scale(1, 0.7, 1); roof.translate(0, 5.6, 0);
      p = [{ geo: box, mat: L('#8a5a35') }, { geo: roof, mat: L('#ffffff') }];
      break;
    }
    case 'tulips': { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); g.translate(0, 0.06, 0); p = [{ geo: g, mat: std({ map: stripeTexture('#ffffff', '#3e8e41', 8, false) }), tint: true }]; break; }
    case 'planet': { const g = new THREE.IcosahedronGeometry(1, 2); p = [{ geo: g, mat: std({ color: '#ffffff', emissive: '#222244' }), tint: true }]; break; }
    case 'bottle': {
      const b = new THREE.CylinderGeometry(0.8, 0.8, 2.4, 10); b.translate(0, 1.2, 0);
      const neck = new THREE.CylinderGeometry(0.4, 0.8, 0.8, 10); neck.translate(0, 2.8, 0);
      const cap = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10); cap.translate(0, 3.35, 0);
      p = [{ geo: b, mat: L('#ffffff', { emissive: '#333' }) }, { geo: neck, mat: L('#f4f4f4') }, { geo: cap, mat: L('#2f7de1') }];
      break;
    }
    case 'log': { const g = new THREE.CylinderGeometry(0.5, 0.5, 4, 8); g.rotateZ(Math.PI / 2); g.translate(0, 0.5, 0); p = [{ geo: g, mat: L('#7a5230') }]; break; }
    case 'tank': {
      const g = new THREE.CylinderGeometry(5, 5, 7, 16); g.translate(0, 3.5, 0);
      const top = new THREE.CylinderGeometry(4.6, 5, 0.6, 16); top.translate(0, 7.3, 0);
      p = [{ geo: g, mat: L('#e8e8ec') }, { geo: top, mat: L('#c5c9d0') }];
      break;
    }
    default: throw new Error('onbekend prototype ' + name);
  }
  P[name] = p;
  return p;
}

// ---------- objecten op de baan ----------
export function obstacleMesh(kind) {
  const g = new THREE.Group();
  const L = lambert;
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  switch (kind) {
    case 'zandkasteel':
      add(new THREE.CylinderGeometry(1.5, 1.7, 1.2, 8), L('#e3c27f'), 0, 0.6);
      for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(0.4, 0.45, 1.4, 6), L('#d9b46e'), Math.cos(i * 1.57) * 1.1, 1.3, Math.sin(i * 1.57) * 1.1);
      add(new THREE.ConeGeometry(0.6, 1.0, 6), L('#d9b46e'), 0, 1.7);
      add(new THREE.ConeGeometry(0.12, 0.5, 3), L('#ff4b4b'), 0, 2.4);
      break;
    case 'strandstoel':
      add(new THREE.BoxGeometry(1.6, 0.25, 2.4), std({ map: stripeTexture('#ffffff', '#2f7de1', 6, true) }), 0, 0.6);
      { const back = add(new THREE.BoxGeometry(1.6, 1.6, 0.2), std({ map: stripeTexture('#ffffff', '#2f7de1', 6, true) }), 0, 1.3, -1.0); back.rotation.x = -0.4; }
      add(new THREE.BoxGeometry(1.7, 0.6, 2.0), L('#c9a77c'), 0, 0.3);
      break;
    case 'popcornkar':
      add(new THREE.BoxGeometry(2.2, 1.4, 1.6), L('#e8423f'), 0, 0.9);
      add(new THREE.BoxGeometry(2.0, 0.8, 1.4), L('#ffffff', { transparent: true, opacity: 0.6 }), 0, 2.0);
      for (let i = 0; i < 6; i++) add(new THREE.IcosahedronGeometry(0.2, 0), L('#fff3c4'), (i % 3 - 1) * 0.5, 1.75, (i < 3 ? -1 : 1) * 0.3);
      add(new THREE.ConeGeometry(1.6, 0.7, 4), std({ map: stripeTexture('#ffffff', '#e8423f', 6, true) }), 0, 2.75).rotation.y = Math.PI / 4;
      break;
    case 'ballonkraam':
      add(new THREE.CylinderGeometry(0.9, 1.1, 1.2, 8), L('#3dd6d0'), 0, 0.6);
      ['#ff4fa0', '#ffd23f', '#7b6cff', '#3fbf6a', '#ff7a00'].forEach((c, i) => add(new THREE.SphereGeometry(0.45, 8, 8), L(c), Math.cos(i * 1.25) * 0.6, 2.4 + (i % 2) * 0.5, Math.sin(i * 1.25) * 0.6));
      add(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 4), L('#ffffff'), 0, 1.8);
      break;
    case 'paaltje':
      add(new THREE.CylinderGeometry(0.22, 0.28, 1.1, 8), L('#6d1f1a'), 0, 0.55);
      add(new THREE.SphereGeometry(0.24, 8, 6), L('#6d1f1a'), 0, 1.12);
      for (const y of [0.55, 0.75]) add(new THREE.CylinderGeometry(0.285, 0.285, 0.06, 8), L('#ffffff'), 0, y);
      break;
    case 'bloembak':
      add(new THREE.BoxGeometry(2.4, 0.8, 1.4), L('#5a3b2e'), 0, 0.4);
      ['#ff4f9a', '#ffd23f', '#e8423f', '#ffffff', '#7b6cff', '#ff7a00'].forEach((c, i) => add(new THREE.SphereGeometry(0.25, 6, 6), L(c), -0.9 + i * 0.36, 0.95, (i % 2 ? 0.3 : -0.3)));
      break;
    case 'boomstronk':
      add(new THREE.CylinderGeometry(1.1, 1.3, 1.1, 10), L('#6b4a2e'), 0, 0.55);
      add(new THREE.CylinderGeometry(1.0, 1.0, 0.05, 10), L('#d9b98a'), 0, 1.12);
      break;
    case 'paddenstoel':
      add(new THREE.CylinderGeometry(0.6, 0.8, 2.4, 8), L('#f6f1e4'), 0, 1.2);
      { const cap = add(new THREE.SphereGeometry(2.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), std({ map: patternTexture('stippen', '#e0312b') }), 0, 2.2); cap.scale.y = 0.7; }
      break;
    case 'vat': {
      const m = add(new THREE.CylinderGeometry(0.9, 0.9, 1.8, 12), L('#ff7a00'), 0, 0.9);
      for (const y of [0.4, 1.4]) add(new THREE.CylinderGeometry(0.93, 0.93, 0.12, 12), L('#333333'), 0, y);
      m.userData.color = true;
      break;
    }
    case 'krat':
      add(new THREE.BoxGeometry(2.0, 2.0, 2.0), std({ map: stripeTexture('#c99b5f', '#a87b45', 6, false) }), 0, 1.0);
      break;
    case 'sneeuwpop': {
      for (const [r, y] of [[1.0, 0.9], [0.72, 2.2], [0.5, 3.2]]) add(new THREE.SphereGeometry(r, 12, 10), L('#ffffff'), 0, y);
      add(new THREE.ConeGeometry(0.1, 0.5, 6), L('#ff8c1a'), 0, 3.2, 0.65).rotation.x = Math.PI / 2;
      add(new THREE.CylinderGeometry(0.75, 0.75, 0.15, 10), L('#e63946'), 0, 2.75);
      break;
    }
    case 'cactus': {
      const pr = proto('cactus');
      for (const part of pr) g.add(new THREE.Mesh(part.geo, part.mat));
      g.scale.setScalar(0.7);
      break;
    }
    case 'hooibaal':
      add(new THREE.CylinderGeometry(1.3, 1.3, 1.6, 12), L('#e9c46a'), 0, 0.8);
      add(new THREE.CylinderGeometry(1.32, 1.32, 0.1, 12), L('#d7a83a'), 0, 1.0);
      break;
    case 'melkfles': {
      const pr = proto('bottle');
      for (const part of pr) g.add(new THREE.Mesh(part.geo, part.mat));
      g.userData.float = true;
      break;
    }
    case 'kaaswiel': {
      add(new THREE.CylinderGeometry(1.4, 1.4, 1.0, 24), std({ map: patternTexture('kaasgaten'), roughness: 0.55 }), 0, 0.5);
      add(new THREE.CylinderGeometry(1.43, 1.43, 0.16, 24), L('#e8a317', { roughness: 0.35 }), 0, 0.5);
      add(new THREE.BoxGeometry(0.9, 0.05, 0.4), L('#e63946'), 0, 1.03, 0);
      break;
    }
    case 'pion':
      add(new THREE.ConeGeometry(0.55, 1.4, 16), L('#ff6a00', { emissive: '#331100', roughness: 0.4 }), 0, 0.75);
      add(new THREE.CylinderGeometry(0.33, 0.41, 0.2, 16), L('#ffffff', { emissive: '#444444' }), 0, 0.82);
      add(new THREE.BoxGeometry(1.1, 0.1, 1.1), L('#222222'), 0, 0.05);
      break;
    case 'basalt': {
      const m = add(new THREE.DodecahedronGeometry(1.5, 1), L('#2e2624', { roughness: 0.95 }), 0, 1.0);
      m.scale.set(1, 0.85, 1.1);
      add(new THREE.DodecahedronGeometry(0.6, 0), L('#ff5a1f', { emissive: '#ff4000', emissiveIntensity: 0.9 }), 0.7, 0.4, 0.8);
      break;
    }
    default:
      add(new THREE.BoxGeometry(2, 2, 2), L('#ff00ff'), 0, 1);
  }
  return g;
}

export function hazardMesh(kind) {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  g.add(inner);
  const L = lambert;
  const add = (geo, mat, x = 0, y = 0, z = 0, parent = inner) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  switch (kind) {
    case 'krab':
      add(new THREE.SphereGeometry(1.2, 12, 8), L('#e8423f'), 0, 0.6).scale.set(1.3, 0.55, 1);
      for (const sx of [-1, 1]) {
        add(new THREE.SphereGeometry(0.45, 8, 6), L('#ff6b5b'), sx * 1.6, 0.8, 0.6);
        add(new THREE.SphereGeometry(0.15, 6, 6), L('#ffffff'), sx * 0.35, 1.25, 0.7);
      }
      break;
    case 'botsauto':
      add(new THREE.CylinderGeometry(1.5, 1.6, 0.8, 16), L('#3dd6d0'), 0, 0.5);
      add(new THREE.TorusGeometry(1.55, 0.18, 6, 18), L('#222222'), 0, 0.4).rotation.x = Math.PI / 2;
      add(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 4), L('#cccccc'), 0, 1.9, -0.8);
      add(new THREE.SphereGeometry(0.4, 10, 8), L('#ffd23f'), 0, 1.2, 0);
      break;
    case 'tram':
      add(new THREE.BoxGeometry(2.4, 2.8, 5.0), L('#ffcc00'), 0, 1.6);
      add(new THREE.BoxGeometry(2.45, 0.8, 4.4), L('#2b3a4a'), 0, 2.2);
      add(new THREE.BoxGeometry(2.0, 0.3, 4.6), L('#ffffff'), 0, 3.1);
      add(new THREE.BoxGeometry(0.1, 1.4, 0.1), L('#333333'), 0, 3.9);
      break;
    case 'egel':
      add(new THREE.SphereGeometry(1.0, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), L('#6b4a2e'), 0, 0.1).scale.set(1, 0.9, 1.3);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const s = add(new THREE.ConeGeometry(0.12, 0.6, 4), L('#3d2a1a'), Math.cos(a) * 0.6, 0.7, Math.sin(a) * 0.75);
        s.rotation.z = -Math.cos(a) * 0.8; s.rotation.x = Math.sin(a) * 0.8;
      }
      add(new THREE.SphereGeometry(0.35, 8, 6), L('#d9b98a'), 0, 0.35, 1.2);
      add(new THREE.SphereGeometry(0.1, 6, 6), L('#111111'), 0, 0.45, 1.55);
      break;
    case 'heftruck':
      add(new THREE.BoxGeometry(2.0, 1.4, 2.6), L('#ffb703'), 0, 1.0);
      add(new THREE.BoxGeometry(1.8, 1.2, 0.1), L('#2b3a4a', { transparent: true, opacity: 0.6 }), 0, 2.3, 0.4);
      add(new THREE.BoxGeometry(0.15, 3.2, 0.15), L('#333333'), -0.7, 1.6, 1.4);
      add(new THREE.BoxGeometry(0.15, 3.2, 0.15), L('#333333'), 0.7, 1.6, 1.4);
      add(new THREE.BoxGeometry(1.6, 0.12, 1.6), L('#555555'), 0, 0.5, 2.2);
      add(new THREE.BoxGeometry(1.6, 1.2, 1.4), L('#c99b5f'), 0, 1.2, 2.2);
      break;
    case 'sneeuwbal':
      add(new THREE.IcosahedronGeometry(2.0, 1), L('#ffffff'), 0, 2.0);
      break;
    case 'rolbos':
      add(new THREE.IcosahedronGeometry(1.6, 1), std({ color: '#a8743f', wireframe: true }), 0, 1.6);
      add(new THREE.IcosahedronGeometry(1.1, 0), std({ color: '#8a5a2b', wireframe: true }), 0, 1.6);
      break;
    case 'koe': {
      const pr = proto('cow');
      for (const part of pr) inner.add(new THREE.Mesh(part.geo, part.mat));
      inner.scale.setScalar(1.3);
      break;
    }
    case 'meteoriet':
      add(new THREE.DodecahedronGeometry(1.8, 0), L('#4a3b3b', { emissive: '#ff4d00', emissiveIntensity: 0.35 }), 0, 2.0);
      break;
    case 'ufo':
      add(new THREE.CylinderGeometry(0.6, 2.2, 0.6, 18), L('#c5ccd6'), 0, 2.4);
      add(new THREE.SphereGeometry(0.9, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), L('#7cf8ff', { transparent: true, opacity: 0.7 }), 0, 2.7);
      for (let i = 0; i < 6; i++) add(new THREE.SphereGeometry(0.15, 6, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? '#ff7cf2' : '#ffe14d' }), Math.cos(i) * 1.8, 2.3, Math.sin(i) * 1.8);
      break;
    case 'trekker': { // groene trekker die gewoon dwars over de weg rijdt
      add(new THREE.BoxGeometry(1.6, 1.0, 2.2), L('#2f9e44', { roughness: 0.35 }), 0, 1.3, 0.5);
      add(new THREE.BoxGeometry(1.5, 1.4, 1.3), L('#2f9e44', { roughness: 0.35 }), 0, 1.8, -0.9);
      add(new THREE.BoxGeometry(1.38, 0.9, 1.18), L('#bfe9ff', { transparent: true, opacity: 0.55, roughness: 0.05 }), 0, 2.25, -0.9);
      add(new THREE.BoxGeometry(1.7, 0.12, 1.5), L('#ffffff'), 0, 2.75, -0.9);
      for (const sx of [-1, 1]) {
        const big = add(new THREE.CylinderGeometry(1.0, 1.0, 0.55, 22), L('#1d1f24', { roughness: 0.9 }), sx * 1.05, 1.0, -0.9); big.rotation.z = Math.PI / 2;
        const sm = add(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 18), L('#1d1f24', { roughness: 0.9 }), sx * 0.95, 0.55, 1.2); sm.rotation.z = Math.PI / 2;
        const hub = add(new THREE.CylinderGeometry(0.5, 0.5, 0.57, 18), L('#ffd23f'), sx * 1.06, 1.0, -0.9); hub.rotation.z = Math.PI / 2;
      }
      add(new THREE.CylinderGeometry(0.08, 0.1, 1.0, 10), L('#333333'), 0.5, 2.3, 1.2);
      break;
    }
    case 'taxi': {
      add(new THREE.BoxGeometry(2.0, 0.8, 4.2), L('#ffcf00', { roughness: 0.25, metalness: 0.1 }), 0, 0.85);
      add(new THREE.BoxGeometry(1.8, 0.75, 2.2), L('#ffcf00', { roughness: 0.25, metalness: 0.1 }), 0, 1.6, -0.2);
      add(new THREE.BoxGeometry(1.84, 0.55, 2.0), L('#1a2333', { roughness: 0.05 }), 0, 1.62, -0.2);
      add(new THREE.BoxGeometry(0.8, 0.3, 0.4), new THREE.MeshBasicMaterial({ color: '#ffffff' }), 0, 2.15, -0.2);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = add(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16), L('#1d1f24', { roughness: 0.9 }), sx * 1.0, 0.42, sz * 1.35); w.rotation.z = Math.PI / 2; }
      for (const sx of [-1, 1]) add(new THREE.SphereGeometry(0.15, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff6c0' }), sx * 0.7, 0.9, 2.12);
      for (const sx of [-1, 1]) add(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: '#ff2a2a' }), sx * 0.75, 0.9, -2.12);
      break;
    }
    case 'lavabal':
      add(new THREE.DodecahedronGeometry(1.9, 1), L('#3a2a24', { emissive: '#ff4a00', emissiveIntensity: 0.7, roughness: 0.9 }), 0, 1.9);
      break;
    default:
      add(new THREE.SphereGeometry(1.5, 10, 8), L('#ff00ff'), 0, 1.5);
  }
  g.userData.kind = kind;
  g.userData.inner = inner;
  return g;
}

export function itemBoxMesh() {
  const g = new THREE.Group();
  const mat = std({ map: questionTexture(), transparent: true, opacity: 0.92, emissive: '#333333' });
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), mat);
  g.add(box);
  const roof = new THREE.Mesh(prism(0.8, 1.42), lambert('#ffffff'));
  roof.scale.set(1, 1, 0.55);
  roof.position.y = 0.92;
  g.add(roof);
  return g;
}

export function plasMesh() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CircleGeometry(2.1, 18), gloss({ color: '#fbfbf6', shininess: 120, specular: '#ffffff', transparent: true, opacity: 0.9 }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.06;
  g.add(m);
  for (let i = 0; i < 4; i++) {
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.5, 10), m.material);
    d.rotation.x = -Math.PI / 2;
    d.position.set(Math.cos(i * 1.7) * 2.2, 0.065, Math.sin(i * 1.7) * 2.0);
    g.add(d);
  }
  return g;
}

export function klompMesh() {
  const g = new THREE.Group();
  const wood = lambert('#f2c14e');
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 1.3), wood);
  b.position.y = 0.45;
  g.add(b);
  const toe = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), wood);
  toe.scale.set(0.85, 0.7, 1.2);
  toe.position.set(0, 0.42, 0.7);
  g.add(toe);
  const hole = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 0.6), lambert('#6b4a2e'));
  hole.position.set(0, 0.73, -0.2);
  g.add(hole);
  return g;
}

// ---------- de wereld ----------
export function buildWorld(track, quality = 'normaal') {
  const def = track.def;
  const th = { ...(THEMES[def.theme] || THEMES.kust), ...(def.look || {}) };
  const scene = new THREE.Scene();
  const shadowSize = quality === 'laag' ? 0 : quality === 'hoog' ? 2048 : 1024;
  const rand = rng(hashString(def.id));
  const dens = quality === 'laag' ? 0.5 : quality === 'hoog' ? 1.4 : 1;
  const animated = [];

  scene.fog = new THREE.Fog(th.fog, 70, th.fogFar);
  scene.background = new THREE.Color(th.sky[1]);

  // lucht met zon en wolken
  const skyMat = skyMaterial(th);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), skyMat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);
  animated.push((t) => { skyMat.uniforms.time.value = t; });

  // omgevingslicht: reflecties in lak, water en metaal
  const envRT = environmentFor(th);
  if (envRT) { scene.environment = envRT.texture; scene.environmentIntensity = th.night ? 0.55 : 0.9; }

  // licht en schaduw (zonder omgevingslicht wat meer gewoon licht)
  scene.add(new THREE.HemisphereLight(th.hemi[0], th.hemi[1], th.hemi[2] * (envRT ? 0.5 : 1.05)));
  const sunDir = new THREE.Vector3(...(th.sunDir || [0.45, 0.62, 0.35])).normalize();
  const sun = new THREE.DirectionalLight(th.sun[0], th.sun[1] * 1.45);
  sun.position.copy(sunDir).multiplyScalar(150);
  if (shadowSize) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    const S = quality === 'hoog' ? 52 : 40;
    Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 20, far: 360 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.05;
  }
  scene.add(sun);
  scene.add(sun.target);

  // afmetingen
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < track.N; i++) {
    minX = Math.min(minX, track.px[i]); maxX = Math.max(maxX, track.px[i]);
    minZ = Math.min(minZ, track.pz[i]); maxZ = Math.max(maxZ, track.pz[i]);
  }
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const bb = { minX, maxX, minZ, maxZ, cx, cz };

  // ondergrond en water
  if (th.ground) {
    let gw = maxX - minX + 700, gd = maxZ - minZ + 700;
    let gx = cx, gz = cz;
    if (th.water === 'haven' || th.water === 'gracht') { gw = maxX - minX + 90; gd = maxZ - minZ + 90; }
    if (th.water === 'zee') { gw = maxX - minX + 380; gx = cx - 145; }
    const gt = groundTexture(th.ground[0], th.ground[1]).clone();
    gt.needsUpdate = true;
    gt.repeat.set(gw / 10, gd / 10);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(gw, gd), addVariation(std({ map: gt, roughness: 0.96 }), { scale: 0.006, strength: 0.34, detail: 0.14 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(gx, -0.02, gz);
    ground.receiveShadow = true;
    scene.add(ground);
    if (th.water) {
      const wmat = pbr({ color: th.water === 'gracht' ? '#2f5f6a' : '#1f78c0', roughness: 0.07, metalness: 0, transparent: true, opacity: 0.93 });
      const wgeo = new THREE.PlaneGeometry(2400, 2400, 48, 48);
      const water = new THREE.Mesh(wgeo, wmat);
      water.rotation.x = -Math.PI / 2;
      water.position.set(cx, -0.9, cz);
      scene.add(water);
      const base = Float32Array.from(wgeo.attributes.position.array);
      animated.push((t) => {
        const a = wgeo.attributes.position.array;
        for (let i = 0; i < a.length; i += 3) a[i + 2] = Math.sin(base[i] * 0.05 + t * 1.2) * 0.25 + Math.cos(base[i + 1] * 0.04 + t) * 0.25 + Math.sin(base[i] * 0.13 - base[i + 1] * 0.11 + t * 2) * 0.08;
        wgeo.attributes.position.needsUpdate = true;
        wgeo.computeVertexNormals();
      });
      // kademuur
      if (th.water !== 'zee') {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(gw, 1.2, gd), lambert(th.water === 'gracht' ? '#6e4b3a' : '#7c838a'));
        edge.position.set(gx, -0.62, gz);
        scene.add(edge);
      }
    }
  }

  // weg, bermen, stoeprand, muren
  const roadT = roadTexture(th.road);
  const roadN = grainNormalMap(1.8, 3).clone();
  roadN.needsUpdate = true;
  roadN.repeat.set((track.halfW * 2) / 2.5, 12 / 2.5);
  const wet = th.night ? 0.42 : th.road === 'sneeuw' ? 0.55 : 0.88;
  const roadMat = addVariation(std({ map: roadT, normalMap: quality === 'laag' ? null : roadN, normalScale: new THREE.Vector2(0.55, 0.55), roughness: wet, emissive: th.stars ? '#3a3266' : '#000000' }), { scale: 0.018, strength: 0.16, detail: 0.06 });
  const road = new THREE.Mesh(ribbon(track, -track.halfW, track.halfW, 0.03, 12), roadMat);
  road.receiveShadow = true;
  scene.add(road);
  const sT = groundTexture(th.shoulder[0], th.shoulder[1], 7);
  for (const sgn of [-1, 1]) {
    const sh = new THREE.Mesh(ribbon(track, sgn * track.halfW, sgn * track.wallD, 0.015, 6), addVariation(std({ map: sT, roughness: 0.95, emissive: th.stars ? '#1c1450' : '#000000' }), { scale: 0.01, strength: 0.25, detail: 0.1 }));
    sh.receiveShadow = true;
    scene.add(sh);
    const curb = new THREE.Mesh(ribbon(track, sgn * (track.halfW - 0.05), sgn * (track.halfW + 0.75), 0.05, 2.5, { yOuter: 0.12 }),
      th.stars ? new THREE.MeshBasicMaterial({ map: stripeTexture(th.curb[0], th.curb[1], 2) }) : std({ map: stripeTexture(th.curb[0], th.curb[1], 2) }));
    curb.receiveShadow = true;
    scene.add(curb);
    const w = th.wall;
    const wt = wallTexture(w.style, w.c1, w.c2);
    const wallMat = w.style === 'glow'
      ? new THREE.MeshBasicMaterial({ map: wt, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
      : std({ map: wt, side: THREE.DoubleSide, transparent: w.style === 'hek', alphaTest: w.style === 'hek' ? 0.5 : 0 });
    const wall = new THREE.Mesh(wallGeometry(track, sgn * track.wallD, w.h, w.style === 'sneeuwwal' ? 0.8 : 0), wallMat);
    if (w.style !== 'glow') { wall.castShadow = !!shadowSize; wall.receiveShadow = true; }
    scene.add(wall);
  }

  // startlijn + poort
  {
    const p = track.pointAt(0, 0);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(track.halfW * 2, 2.2), std({ map: (() => { const t = checkerTexture().clone(); t.needsUpdate = true; t.repeat.set(track.halfW, 1); return t; })() }));
    line.rotation.x = -Math.PI / 2;
    line.rotation.z = p.h;
    line.position.set(p.x, 0.06, p.z);
    scene.add(line);
    const gate = new THREE.Group();
    const poleMat = lambert('#ffffff');
    for (const sgn of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 7.5, 8), poleMat);
      pole.position.set(sgn * (track.halfW + 1.4), 3.75, 0);
      gate.add(pole);
    }
    const bc = textCanvas('KARNEMELK KART', { size: 64, color: '#ffffff', stroke: '#2f7de1', bg: '#ff7a00', pad: 30 });
    const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace;
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(track.halfW * 2 + 3.6, 2.2), new THREE.MeshBasicMaterial({ map: bt, side: THREE.DoubleSide }));
    banner.position.y = 6.6;
    banner.rotation.y = Math.PI; // leesbaar voor wie aan komt rijden
    gate.add(banner);
    gate.position.set(p.x, 0, p.z);
    gate.rotation.y = p.h;
    scene.add(gate);
  }

  // turbostroken
  const arrowT = arrowTexture().clone();
  arrowT.needsUpdate = true;
  arrowT.repeat.set(1, 2);
  for (const pad of track.boostPads) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(pad.halfW * 2, pad.len), new THREE.MeshBasicMaterial({ map: arrowT, transparent: true, opacity: 0.95 }));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = pad.h + Math.PI;
    const pp = track.pointAt(pad.s + pad.len / 2, pad.d);
    m.position.set(pp.x, 0.07, pp.z);
    scene.add(m);
  }
  animated.push((t) => { arrowT.offset.y = -t * 1.5; });

  // vaste obstakels
  for (const o of track.obstacles) {
    const m = polish(obstacleMesh(o.kind), { cast: !!shadowSize });
    m.position.set(o.x, 0, o.z);
    m.rotation.y = o.h + rand() * 6;
    if (m.userData.float) animated.push((t) => { m.position.y = 0.4 + Math.sin(t * 2 + o.id) * 0.3; m.rotation.y += 0.01; });
    scene.add(m);
  }

  // ijs, modder, sloten en lava
  const zoneMats = {
    ijs: () => pbr({ color: '#cdeeff', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.78 }),
    modder: () => std({ color: '#5e4128', roughness: 0.55, transparent: true, opacity: 0.94 }),
    water: () => { const t = rippleTexture(); animated.push((tt) => { t.offset.set(tt * 0.03, tt * 0.05); }); return pbr({ color: '#24658f', map: t, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.95 }); },
    lava: () => { const t = lavaTexture(); animated.push((tt) => { t.offset.set(tt * 0.02, -tt * 0.06); }); return pbr({ color: '#ffffff', map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 1.25, roughness: 0.6 }); },
  };
  const zoneMatCache = {};
  for (const zn of track.zones) {
    const len = zn.s1 - zn.s0;
    const mat = zoneMatCache[zn.type] || (zoneMatCache[zn.type] = (zoneMats[zn.type] || zoneMats.modder)());
    // een sloot of lavastroom loopt ook door het landschap
    if ((zn.type === 'water' || zn.type === 'lava') && zn.d0 <= -track.wallD && zn.d1 >= track.wallD) channel(scene, track, zn, mat, animated);
    for (let s = 0; s < len; s += 3) {
      const d0 = Math.max(zn.d0, -track.wallD), d1 = Math.min(zn.d1, track.wallD);
      const p = track.pointAt(zn.s0 + s + 1.5, (d0 + d1) / 2);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(d1 - d0, 3.3), mat);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = p.h;
      m.position.set(p.x, 0.065, p.z);
      m.receiveShadow = true;
      scene.add(m);
    }
  }

  // itemdozen
  const boxes = track.itemBoxes.map((b) => {
    const m = polish(itemBoxMesh(), { cast: !!shadowSize });
    m.position.set(b.x, 1.4, b.z);
    scene.add(m);
    return { mesh: m, active: true, scale: 1, id: b.id };
  });

  // bewegende obstakels
  // schansen en boostringen
  const rampMat = std({ map: rampTexture(), roughness: 0.7 });
  const rampSide = std({ map: stripeTexture('#2b2d36', '#ffd23f', 6, true), roughness: 0.7 });
  for (const rp of track.ramps) {
    const m = rampMesh(rp, rampMat, rampSide);
    m.traverse((o) => { if (o.isMesh) { o.castShadow = !!shadowSize; o.receiveShadow = true; } });
    scene.add(m);
  }
  const rings = track.rings.map((rg) => {
    const m = ringMesh(rg);
    scene.add(m);
    return m;
  });
  animated.push((t) => {
    for (const m of rings) {
      m.userData.spin.rotation.z = t * 1.4;
      if (m.userData.mat.emissiveIntensity !== undefined) m.userData.mat.emissiveIntensity = 2.2 + Math.sin(t * 5 + m.position.x) * 0.6 + (m.userData.flash || 0) * 4;
      if (m.userData.flash) m.userData.flash = Math.max(0, m.userData.flash - 0.03);
    }
  });

  const hazards = track.hazards.map((hz) => {
    const m = polish(hazardMesh(hz.kind), { cast: !!shadowSize });
    scene.add(m);
    return { mesh: m, hz };
  });

  // ---------- decor ----------
  const deco = new THREE.Group();
  scene.add(deco);
  const placed = [];
  const free = (x, z, r) => {
    const loc = track.locate(x, z);
    if (Math.abs(loc.d) < track.wallD + r + 1.5) return false;
    for (const p of placed) if ((p.x - x) ** 2 + (p.z - z) ** 2 < (p.r + r) ** 2) return false;
    return true;
  };
  // langs de baan
  const along = (count, minD, maxD, r) => {
    const out = [];
    for (let n = 0, tries = 0; n < count && tries < count * 12; tries++) {
      const i = Math.floor(rand() * track.N);
      const side = rand() < 0.5 ? -1 : 1;
      const dist = track.wallD + minD + rand() * (maxD - minD);
      const x = track.px[i] + track.nx[i] * side * dist, z = track.pz[i] + track.nz[i] * side * dist;
      if (!free(x, z, r)) continue;
      placed.push({ x, z, r });
      out.push({ x, z, ry: track.heading[i] + (side > 0 ? -Math.PI / 2 : Math.PI / 2), i, side });
      n++;
    }
    return out;
  };
  // ergens in de buurt (ook binnen de lus)
  const anywhere = (count, margin, r, spread = 150) => {
    const out = [];
    for (let n = 0, tries = 0; n < count && tries < count * 15; tries++) {
      const x = minX - spread + rand() * (maxX - minX + spread * 2);
      const z = minZ - spread + rand() * (maxZ - minZ + spread * 2);
      if (!free(x, z, r + margin)) continue;
      placed.push({ x, z, r });
      out.push({ x, z, ry: rand() * Math.PI * 2 });
      n++;
    }
    return out;
  };
  // de beste open plek voor een groot oriëntatiepunt
  const landmarkSpot = (r, preferInside = true) => {
    let best = null, bestScore = -1;
    for (let k = 0; k < 400; k++) {
      const x = preferInside ? minX + rand() * (maxX - minX) : minX - 80 + rand() * (maxX - minX + 160);
      const z = preferInside ? minZ + rand() * (maxZ - minZ) : minZ - 80 + rand() * (maxZ - minZ + 160);
      const loc = track.locate(x, z);
      const dist = Math.abs(loc.d) - track.wallD;
      if (dist < r + 4) continue;
      let ok = true;
      for (const p of placed) if ((p.x - x) ** 2 + (p.z - z) ** 2 < (p.r + r) ** 2) { ok = false; break; }
      if (!ok) continue;
      const score = Math.min(dist, r + 25) - Math.hypot(x - cx, z - cz) * 0.02;
      if (score > bestScore) { bestScore = score; best = { x, z }; }
    }
    if (best) placed.push({ ...best, r });
    return best;
  };
  const pickColor = (list) => list[Math.floor(rand() * list.length)];
  const scale = (a, b) => a + rand() * (b - a);

  const theme = def.theme;
  // eerst de spullen vlak langs de weg (tribunes, borden, pijlen), daarna het verdere decor
  addRoadside({ track, theme, deco, rand, dens, animated, placed });
  // graspollen langs de berm en heuvels aan de horizon
  if (th.grass) grassTufts(deco, track, rand, th.grass, Math.round((quality === 'laag' ? 500 : quality === 'hoog' ? 2600 : 1600) * (th.water === 'zee' ? 0.6 : 1)), placed);
  if (th.hills) hillsRing(scene, bb, th, rand);
  if (theme === 'kust') {
    const lh = landmarkSpot(8, false);
    if (lh) { const m = lighthouse(animated); m.position.set(lh.x, 0, lh.z); deco.add(m); }
    instanced(deco, proto('palm'), along(Math.round(60 * dens), 2, 14, 2).map((p) => ({ ...p, s: scale(0.8, 1.3), ry: rand() * 6 })));
    instanced(deco, proto('hut'), along(Math.round(14 * dens), 6, 18, 3).map((p) => ({ ...p, color: pickColor(['#ff6b6b', '#4aa3ff', '#ffd23f', '#3fbf6a', '#ff9fd0']) })));
    instanced(deco, proto('parasol'), anywhere(Math.round(30 * dens), 1, 1.8, 60).map((p) => ({ ...p, color: pickColor(['#ff4b4b', '#ffd23f', '#4aa3ff', '#ff7eb6']) })));
    instanced(deco, proto('dune'), anywhere(Math.round(16 * dens), 2, 8, 120).map((p) => ({ ...p, s: scale(5, 12), sy: 0.3, color: '#e7cf92' })));
    // bootjes op zee
    for (let n = 0; n < 6; n++) {
      const b = boat(pickColor(['#ffffff', '#ff6b6b', '#ffd23f']));
      b.position.set(maxX + 80 + rand() * 260, -0.6, minZ - 100 + rand() * (maxZ - minZ + 200));
      b.rotation.y = rand() * 6;
      deco.add(b);
      const ph = rand() * 6;
      animated.push((t) => { b.position.y = -0.6 + Math.sin(t * 1.3 + ph) * 0.25; b.rotation.z = Math.sin(t + ph) * 0.06; });
    }
  } else if (theme === 'pretpark') {
    const fw = landmarkSpot(18, true);
    if (fw) { const m = ferrisWheel(animated); m.position.set(fw.x, 0, fw.z); deco.add(m); }
    const cs = landmarkSpot(10, true);
    if (cs) { const m = carousel(animated); m.position.set(cs.x, 0, cs.z); deco.add(m); }
    instanced(deco, proto('tent'), along(Math.round(16 * dens), 4, 20, 3.5).map((p) => ({ ...p, color: pickColor(['#ff4fa0', '#3dd6d0', '#ffd23f', '#7b6cff']) })));
    instanced(deco, proto('lamp'), along(Math.round(40 * dens), 0.5, 1.5, 0.6));
    instanced(deco, proto('oak'), anywhere(Math.round(30 * dens), 2, 2.5).map((p) => ({ ...p, color: pickColor(['#5fcf6a', '#79d65a', '#ff9fd0']) })));
    instanced(deco, proto('balloon'), anywhere(Math.round(40 * dens), 0, 1, 80).map((p) => ({ ...p, y: 6 + rand() * 20, color: pickColor(['#ff4fa0', '#ffd23f', '#3dd6d0', '#7b6cff', '#ff7a00']) })));
  } else if (theme === 'stad') {
    // grachtenpanden rond de stad en in het midden
    const houses = [];
    const ring = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.floor(len / 6.4);
      const ang = Math.atan2(x1 - x0, z1 - z0);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        houses.push({ x: x0 + (x1 - x0) * t, z: z0 + (z1 - z0) * t, ry: ang + Math.PI / 2, sy: scale(0.8, 1.35), color: '#ffffff' });
      }
    };
    const o = 60;
    ring(minX - o, minZ - o, maxX + o, minZ - o); ring(maxX + o, minZ - o, maxX + o, maxZ + o);
    ring(maxX + o, maxZ + o, minX - o, maxZ + o); ring(minX - o, maxZ + o, minX - o, minZ - o);
    for (const p of along(Math.round(40 * dens), 4, 18, 4)) houses.push({ ...p, sy: scale(0.8, 1.3), color: '#ffffff' });
    const pr = proto('house');
    // vijf gevelkleuren
    const groups = [[], [], [], [], []];
    houses.forEach((hh, i) => groups[i % 5].push(hh));
    groups.forEach((list, gi) => instanced(deco, [{ geo: pr[0].geo, mat: pr.facades[gi] }, pr[1]], list));
    instanced(deco, proto('oak'), along(Math.round(30 * dens), 1, 6, 2.5).map((p) => ({ ...p, color: pickColor(['#4f9a45', '#5aa64e']) })));
    instanced(deco, proto('lamp'), along(Math.round(36 * dens), 0.4, 1.2, 0.6));
  } else if (theme === 'bos') {
    instanced(deco, proto('pine'), along(Math.round(140 * dens), 1, 30, 2.2).map((p) => ({ ...p, s: scale(0.9, 1.8) })));
    instanced(deco, proto('pine'), anywhere(Math.round(120 * dens), 2, 2.2, 160).map((p) => ({ ...p, s: scale(1, 2.2) })));
    instanced(deco, proto('oak'), anywhere(Math.round(50 * dens), 2, 2.5).map((p) => ({ ...p, s: scale(0.9, 1.6), color: pickColor(['#3c8f3f', '#4f9e3a', '#2f7a35']) })));
    instanced(deco, proto('mushroom'), along(Math.round(18 * dens), 2, 12, 2.5).map((p) => ({ ...p, s: scale(0.8, 1.8) })));
    instanced(deco, proto('bush'), along(Math.round(60 * dens), 0.5, 6, 1.2).map((p) => ({ ...p, color: pickColor(['#3a8a35', '#4b9c3e']) })));
    instanced(deco, proto('log'), along(Math.round(12 * dens), 1, 8, 2.2));
    instanced(deco, proto('rock'), along(Math.round(20 * dens), 0.5, 10, 1.5).map((p) => ({ ...p, s: scale(0.6, 1.4), color: '#8d8f88' })));
    fireflies(scene, bb, animated);
  } else if (theme === 'haven') {
    const conts = [];
    for (const p of along(Math.round(38 * dens), 3, 20, 7)) {
      const stack = 1 + Math.floor(rand() * 3);
      const color = pickColor(['#d62828', '#2f7de1', '#2a9d8f', '#f4a261', '#7b6cff', '#e9c46a']);
      for (let k = 0; k < stack; k++) conts.push({ x: p.x, z: p.z, y: k * 2.65, ry: p.ry + Math.PI / 2, color: k ? pickColor(['#d62828', '#2f7de1', '#2a9d8f', '#f4a261']) : color });
    }
    instanced(deco, proto('container'), conts);
    for (let n = 0; n < 3; n++) {
      const sp = landmarkSpot(10, n > 0);
      if (sp) { const c = crane(animated, n); c.position.set(sp.x, 0, sp.z); c.rotation.y = rand() * 6; deco.add(c); }
    }
    instanced(deco, proto('tank'), anywhere(Math.round(5 * dens), 3, 6, 40));
    for (let n = 0; n < 4; n++) {
      const b = ship(pickColor(['#d62828', '#2a2a2a', '#2f7de1']));
      const side = n % 4;
      b.position.set(side === 0 ? minX - 75 : side === 1 ? maxX + 75 : cx + (rand() - 0.5) * 200, -0.8, side === 2 ? minZ - 75 : side === 3 ? maxZ + 75 : cz + (rand() - 0.5) * 200);
      b.rotation.y = side < 2 ? 0 : Math.PI / 2;
      deco.add(b);
    }
  } else if (theme === 'sneeuw') {
    instanced(deco, proto('snowpine'), along(Math.round(110 * dens), 1, 26, 2.2).map((p) => ({ ...p, s: scale(0.9, 1.7) })));
    instanced(deco, proto('snowpine'), anywhere(Math.round(80 * dens), 2, 2.2, 140).map((p) => ({ ...p, s: scale(1, 2) })));
    instanced(deco, proto('snowman'), along(Math.round(10 * dens), 2, 10, 1.5));
    instanced(deco, proto('chalet'), along(Math.round(5 * dens), 8, 24, 6));
    const mts = [];
    for (let n = 0; n < 16; n++) {
      const a = (n / 16) * Math.PI * 2 + rand() * 0.3;
      const r = 420 + rand() * 180;
      mts.push({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, sx: 110 + rand() * 80, sz: 110 + rand() * 80, sy: 120 + rand() * 120 });
    }
    instanced(deco, proto('mountain'), mts);
    snowfall(scene, animated);
  } else if (theme === 'woestijn') {
    instanced(deco, proto('cactus'), along(Math.round(50 * dens), 1, 22, 1.6).map((p) => ({ ...p, s: scale(0.7, 1.4), ry: rand() * 6 })));
    instanced(deco, proto('rock'), along(Math.round(40 * dens), 0.5, 18, 2).map((p) => ({ ...p, s: scale(0.8, 2.2), color: pickColor(['#b8673a', '#c97f4a', '#9e5530']) })));
    instanced(deco, proto('dune'), anywhere(Math.round(20 * dens), 3, 10, 160).map((p) => ({ ...p, s: scale(8, 18), sy: 0.25, color: '#efc07a' })));
    const mesas = [];
    for (let n = 0; n < 14; n++) {
      const a = (n / 14) * Math.PI * 2 + rand() * 0.4;
      const r = 260 + rand() * 260;
      mesas.push({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, sx: 30 + rand() * 40, sz: 30 + rand() * 40, sy: 30 + rand() * 50 });
    }
    instanced(deco, proto('mesa'), mesas);
    const sp = landmarkSpot(12, true);
    if (sp) instanced(deco, proto('mesa'), [{ x: sp.x, z: sp.z, sx: 10, sz: 10, sy: 18 }]);
  } else if (theme === 'boerderij') {
    const ml = landmarkSpot(10, true);
    if (ml) { const m = windmill(animated); m.position.set(ml.x, 0, ml.z); deco.add(m); }
    instanced(deco, proto('barn'), along(Math.round(4 * dens) || 2, 10, 26, 9));
    const fields = [];
    for (let n = 0; n < Math.round(10 * dens); n++) {
      const sp = landmarkSpot(11, n % 2 === 0);
      if (sp) fields.push({ x: sp.x, z: sp.z, sx: 22, sz: 16, ry: rand() * 3, color: pickColor(['#ff4f6a', '#ffd23f', '#ff9fd0', '#ff7a00', '#ffffff']) });
    }
    instanced(deco, proto('tulips'), fields);
    instanced(deco, proto('cow'), anywhere(Math.round(16 * dens), 2, 1.8, 90).map((p) => ({ ...p, s: 1.1 })));
    instanced(deco, proto('haybale'), along(Math.round(20 * dens), 1, 12, 1.5).map((p) => ({ ...p, ry: rand() * 6 })));
    instanced(deco, proto('oak'), anywhere(Math.round(40 * dens), 2, 2.5).map((p) => ({ ...p, s: scale(0.9, 1.5), color: pickColor(['#4f9e3a', '#5fb04a', '#3e8a35']) })));
  } else if (theme === 'polder') {
    for (let n = 0; n < 3; n++) {
      const ml = landmarkSpot(10, n !== 1);
      if (ml) { const m = windmill(animated); m.position.set(ml.x, 0, ml.z); m.rotation.y = rand() * 6; deco.add(m); }
    }
    instanced(deco, proto('willow'), along(Math.round(46 * dens), 2, 16, 2.2).map((p) => ({ ...p, s: scale(0.8, 1.3), ry: rand() * 6, color: pickColor(['#8fbf5a', '#9ccb64', '#7fb04f']) })));
    instanced(deco, proto('oak'), anywhere(Math.round(30 * dens), 2, 2.5).map((p) => ({ ...p, s: scale(0.9, 1.4), color: pickColor(['#4f9e3a', '#5fb04a', '#3e8a35']) })));
    instanced(deco, proto('cow'), anywhere(Math.round(22 * dens), 2, 1.8, 100).map((p) => ({ ...p, s: 1.1 })));
    instanced(deco, proto('barn'), along(Math.round(3 * dens) || 2, 12, 28, 9));
    const fields = [];
    for (let n = 0; n < Math.round(8 * dens); n++) {
      const sp = landmarkSpot(11, n % 2 === 0);
      if (sp) fields.push({ x: sp.x, z: sp.z, sx: 24, sz: 14, ry: rand() * 3, color: pickColor(['#ff4f6a', '#ffd23f', '#ff9fd0', '#ff7a00']) });
    }
    instanced(deco, proto('tulips'), fields);
    instanced(deco, proto('haybale'), along(Math.round(16 * dens), 1, 12, 1.5).map((p) => ({ ...p, ry: rand() * 6 })));
  } else if (theme === 'nacht') {
    stars(scene);
    nightCity(deco, track, bb, rand, along, anywhere, dens, animated);
  } else if (theme === 'vulkaan') {
    const vp = landmarkSpot(30, true) || { x: cx, z: cz };
    const v = volcano(animated, scene);
    v.position.set(vp.x, 0, vp.z);
    deco.add(v);
    instanced(deco, proto('deadtree'), along(Math.round(40 * dens), 2, 24, 1.6).map((p) => ({ ...p, s: scale(0.8, 1.5), ry: rand() * 6 })));
    instanced(deco, proto('rock'), along(Math.round(50 * dens), 0.5, 22, 2).map((p) => ({ ...p, s: scale(0.8, 2.6), color: pickColor(['#3a302c', '#2a221f', '#4a3d37']) })));
    instanced(deco, proto('rock'), anywhere(Math.round(40 * dens), 2, 3, 140).map((p) => ({ ...p, s: scale(2, 6), color: pickColor(['#2a221f', '#352b27']) })));
    lavaPools(deco, rand, landmarkSpot, Math.round(8 * dens), animated);
    ash(scene, animated);
  } else if (theme === 'melkweg') {
    stars(scene);
    const planets = [];
    for (let n = 0; n < 10; n++) {
      const a = rand() * Math.PI * 2, r = 250 + rand() * 450;
      planets.push({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, y: -40 + rand() * 260, s: 12 + rand() * 45, color: pickColor(['#ff7cf2', '#7cf8ff', '#ffe14d', '#9b8cff', '#ff9a5a']) });
    }
    instanced(deco, proto('planet'), planets);
    const bottles = anywhere(Math.round(28 * dens), 3, 2, 120).map((p) => ({ ...p, y: 2 + rand() * 30, s: scale(1, 3), rx: rand() * 3, rz: rand() * 3 }));
    const bg = new THREE.Group();
    instanced(bg, proto('bottle'), bottles);
    deco.add(bg);
    animated.push((t) => { bg.position.y = Math.sin(t * 0.6) * 1.5; });
    // ringplaneet
    const rp = new THREE.Group();
    rp.add(new THREE.Mesh(new THREE.IcosahedronGeometry(60, 2), lambert('#ffcf6b', { emissive: '#3a2a00' })));
    const ringM = new THREE.Mesh(new THREE.RingGeometry(80, 120, 48), new THREE.MeshBasicMaterial({ color: '#ffe9b0', side: THREE.DoubleSide, transparent: true, opacity: 0.6, fog: false }));
    ringM.rotation.x = 1.2;
    rp.add(ringM);
    rp.position.set(cx - 500, 160, cz - 400);
    deco.add(rp);
    animated.push((t) => { rp.rotation.y = t * 0.05; });
  }

  // bomen en gebouwen werpen schaduw (graspollen en lichtjes niet)
  if (shadowSize) polish(deco, { round: false, cast: true });
  deco.traverse((o) => { if (o.userData.noShadow) o.castShadow = false; });

  const world = {
    scene, theme: def.theme, th, boxes, hazards, bb, rings, sun,
    // de schaduwcamera volgt de speler (vast raster: geen flikkerende randjes)
    followShadow(x, z) {
      if (!sun.castShadow) return;
      const step = (sun.shadow.camera.right * 2) / sun.shadow.mapSize.x * 4;
      const sx = Math.round(x / step) * step, sz = Math.round(z / step) * step;
      sun.target.position.set(sx, 0, sz);
      sun.position.set(sx + sunDir.x * 150, sunDir.y * 150, sz + sunDir.z * 150);
    },
    flashRing(id) { const m = rings[id]; if (m) m.userData.flash = 1; },
    update(time, dt) {
      for (const f of animated) f(time, dt);
      for (const b of boxes) {
        const target = b.active ? 1 : 0;
        b.scale += (target - b.scale) * Math.min(1, dt * 8);
        b.mesh.visible = b.scale > 0.02;
        b.mesh.scale.setScalar(Math.max(0.001, b.scale));
        b.mesh.rotation.y = time * 1.6 + b.id;
        b.mesh.position.y = 1.4 + Math.sin(time * 2.5 + b.id) * 0.2;
      }
      for (const h of hazards) {
        const p = track.hazardPos(h.hz, time);
        h.mesh.position.set(p.x, 0, p.z);
        h.mesh.rotation.y = p.h;
        const inner = h.mesh.userData.inner;
        const k = h.hz.kind;
        if (k === 'sneeuwbal' || k === 'rolbos' || k === 'lavabal') inner.rotation.x += dt * 5;
        else if (k === 'trekker') inner.position.y = Math.abs(Math.sin(time * 6)) * 0.08;
        else if (k === 'meteoriet') { inner.rotation.x += dt * 2; inner.rotation.z += dt * 1.3; }
        else if (k === 'ufo') { inner.position.y = 1 + Math.sin(time * 3) * 0.4; inner.rotation.y += dt * 2; }
        else if (k === 'botsauto') inner.rotation.y = Math.sin(time * 4) * 0.4;
        else if (k === 'koe' || k === 'egel' || k === 'krab') inner.position.y = Math.abs(Math.sin(time * 8)) * 0.15;
      }
    },
    setBoxes(inactive) {
      const set = new Set(inactive);
      for (const b of boxes) b.active = !set.has(b.id);
    },
    dispose() {
      if (envRT) envRT.dispose();
      scene.traverse((o) => {
        if (o.geometry && !Object.values(P).some((pp) => pp.some((part) => part.geo === o.geometry))) o.geometry.dispose();
      });
    },
  };
  return world;
}

// ---------- grote oriëntatiepunten ----------
function lighthouse(animated) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.4, 22, 14), std({ map: stripeTexture('#ffffff', '#e63946', 6, false) }));
  body.position.y = 11;
  g.add(body);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 3, 12), new THREE.MeshBasicMaterial({ color: '#fff6c0' }));
  top.position.y = 23.5;
  g.add(top);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3, 3, 12), lambert('#e63946'));
  roof.position.y = 26.5;
  g.add(roof);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(3, 60, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#fff6b0', transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.rotation.z = Math.PI / 2;
  beam.position.x = 30;
  const piv = new THREE.Group();
  piv.position.y = 23.5;
  piv.add(beam);
  g.add(piv);
  animated.push((t) => { piv.rotation.y = t * 0.8; });
  return g;
}

function ferrisWheel(animated) {
  const g = new THREE.Group();
  const leg = lambert('#ffffff');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 20, 6), leg);
    l.position.set(sx * 4, 9.5, sz * 2.2);
    l.rotation.z = -sx * 0.2;
    l.rotation.x = sz * 0.1;
    g.add(l);
  }
  const wheel = new THREE.Group();
  wheel.position.y = 19;
  const ringMat = lambert('#ff4fa0');
  for (const z of [-1.2, 1.2]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(14, 0.35, 6, 40), ringMat);
    ring.position.z = z;
    wheel.add(ring);
  }
  const gondolas = [];
  const colors = ['#ffd23f', '#3dd6d0', '#7b6cff', '#ff7a00', '#3fbf6a', '#ff4b4b'];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.2, 14, 0.2), lambert('#ffffff'));
    spoke.position.set(Math.cos(a) * 7, Math.sin(a) * 7, 0);
    spoke.rotation.z = a - Math.PI / 2;
    wheel.add(spoke);
    const gon = new THREE.Mesh(new THREE.BoxGeometry(2, 1.8, 2), lambert(colors[i % colors.length]));
    gon.position.set(Math.cos(a) * 14, Math.sin(a) * 14, 0);
    wheel.add(gon);
    gondolas.push(gon);
  }
  const bulbs = new THREE.Points(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 60 }, (_, i) => new THREE.Vector3(Math.cos(i / 60 * Math.PI * 2) * 14.4, Math.sin(i / 60 * Math.PI * 2) * 14.4, 1.6))), new THREE.PointsMaterial({ color: '#fff3b0', size: 0.7 }));
  wheel.add(bulbs);
  g.add(wheel);
  animated.push((t) => {
    wheel.rotation.z = t * 0.15;
    for (const gon of gondolas) gon.rotation.z = -wheel.rotation.z;
  });
  return g;
}

function carousel(animated) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 1, 20), lambert('#7b6cff'));
  base.position.y = 0.5;
  g.add(base);
  const rot = new THREE.Group();
  g.add(rot);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(9, 4, 20), std({ map: stripeTexture('#ffffff', '#ff4fa0', 12, true) }));
  roof.position.y = 8;
  rot.add(roof);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 6), lambert('#ffd23f'));
    pole.position.set(Math.cos(a) * 6, 4, Math.sin(a) * 6);
    rot.add(pole);
    const horse = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 2.2), lambert(['#ffffff', '#3dd6d0', '#ffd23f', '#ff9fd0'][i % 4]));
    horse.position.set(Math.cos(a) * 6, 3, Math.sin(a) * 6);
    horse.rotation.y = -a;
    horse.userData.ph = i;
    rot.add(horse);
  }
  animated.push((t) => {
    rot.rotation.y = t * 0.6;
    rot.children.forEach((c) => { if (c.userData.ph !== undefined) c.position.y = 3 + Math.sin(t * 3 + c.userData.ph) * 0.6; });
  });
  return g;
}

function windmill(animated) {
  const g = new THREE.Group();
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 5.5, 16, 8), lambert('#2e5d3a'));
  tower.position.y = 8;
  g.add(tower);
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 0.4, 8), lambert('#5a3b2e'));
  gallery.position.y = 6;
  g.add(gallery);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(4, 5, 8), lambert('#4a3b30'));
  cap.position.y = 18.5;
  g.add(cap);
  const blades = new THREE.Group();
  blades.position.set(0, 17, 4);
  for (let i = 0; i < 4; i++) {
    const piv = new THREE.Group();
    piv.rotation.z = (i * Math.PI) / 2;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 14, 0.3), lambert('#ffffff'));
    arm.position.y = 7;
    piv.add(arm);
    const sail = new THREE.Mesh(new THREE.BoxGeometry(2.4, 11, 0.1), std({ map: stripeTexture('#ffffff', '#d93a3a', 10, false) }));
    sail.position.set(1.4, 8, 0);
    piv.add(sail);
    blades.add(piv);
  }
  g.add(blades);
  animated.push((t) => { blades.rotation.z = -t * 0.9; });
  return g;
}

function crane(animated, n) {
  const g = new THREE.Group();
  const col = n % 2 ? '#d62828' : '#ffb703';
  const m = lambert(col);
  for (const sx of [-1.5, 1.5]) for (const sz of [-1.5, 1.5]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.6, 26, 0.6), m);
    leg.position.set(sx, 13, sz);
    g.add(leg);
  }
  const top = new THREE.Group();
  top.position.y = 26;
  const boom = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 34), m);
  boom.position.z = 8;
  top.add(boom);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), lambert('#ffffff'));
  cab.position.y = -1.5;
  top.add(cab);
  const cable = new THREE.Mesh(new THREE.BoxGeometry(0.1, 10, 0.1), lambert('#333333'));
  cable.position.set(0, -5, 20);
  top.add(cable);
  const load = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 8), std({ map: containerTexture('#2a9d8f') }));
  load.position.set(0, -11, 20);
  top.add(load);
  g.add(top);
  animated.push((t) => { top.rotation.y = Math.sin(t * 0.15 + n) * 1.2; });
  return g;
}

function boat(color) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 1.4, 8), lambert(color));
  hull.position.y = 0.7;
  g.add(hull);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 8, 5), lambert('#ffffff'));
  mast.position.y = 5;
  g.add(mast);
  const sail = new THREE.Mesh(new THREE.ConeGeometry(2.4, 7, 3), lambert('#ffffff'));
  sail.position.set(0, 5, -1);
  sail.scale.z = 0.1;
  g.add(sail);
  return g;
}

function ship(color) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 60), lambert(color));
  hull.position.y = 2;
  g.add(hull);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 8), lambert('#ffffff'));
  bridge.position.set(0, 9, -22);
  g.add(bridge);
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 9), std({ map: containerTexture(['#2f7de1', '#e9c46a', '#d62828', '#2a9d8f'][i]) }));
    c.position.set(0, 7.5, -8 + i * 10);
    g.add(c);
  }
  return g;
}

function snowfall(scene, animated) {
  const n = 900;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 120; pos[i * 3 + 1] = Math.random() * 40; pos[i * 3 + 2] = (Math.random() - 0.5) * 120; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.35, transparent: true, opacity: 0.9, depthWrite: false }));
  pts.frustumCulled = false;
  scene.add(pts);
  pts.userData.follow = true;
  animated.push((t, dt) => {
    const a = geo.attributes.position.array;
    for (let i = 0; i < n; i++) {
      a[i * 3 + 1] -= dt * (3 + (i % 5));
      a[i * 3] += Math.sin(t + i) * dt * 0.5;
      if (a[i * 3 + 1] < 0) a[i * 3 + 1] += 40;
    }
    geo.attributes.position.needsUpdate = true;
  });
  scene.userData.snow = pts;
}

function stars(scene) {
  const n = 1500;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2;
    const r = 1100;
    pos[i * 3] = Math.sqrt(1 - u * u) * Math.cos(a) * r;
    pos[i * 3 + 1] = u * r;
    pos[i * 3 + 2] = Math.sqrt(1 - u * u) * Math.sin(a) * r;
    c.setHSL(Math.random(), 0.6, 0.8 + Math.random() * 0.2);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 2.5, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false }));
  pts.userData.follow = true;
  pts.frustumCulled = false;
  scene.add(pts);
  scene.userData.stars = pts;
}

function fireflies(scene, bb, animated) {
  const n = 160;
  const pos = new Float32Array(n * 3);
  const base = [];
  for (let i = 0; i < n; i++) {
    const x = bb.minX - 40 + Math.random() * (bb.maxX - bb.minX + 80), z = bb.minZ - 40 + Math.random() * (bb.maxZ - bb.minZ + 80);
    base.push([x, 1 + Math.random() * 5, z, Math.random() * 6]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#fff7a0', size: 0.45, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  pts.frustumCulled = false;
  scene.add(pts);
  animated.push((t) => {
    for (let i = 0; i < n; i++) {
      const b = base[i];
      pos[i * 3] = b[0] + Math.sin(t * 0.5 + b[3]) * 2;
      pos[i * 3 + 1] = b[1] + Math.sin(t * 0.9 + b[3] * 2) * 0.8;
      pos[i * 3 + 2] = b[2] + Math.cos(t * 0.4 + b[3]) * 2;
    }
    geo.attributes.position.needsUpdate = true;
  });
}

// ---------- schansen, ringen, sloten en lava ----------
function canvasTex(w, h, draw, { repeat = true, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

let rampTex = null;
function rampTexture() {
  if (rampTex) return rampTex;
  rampTex = canvasTex(256, 256, (g, w, h) => {
    // geel-zwarte schuine strepen met witte pijlen omhoog
    g.fillStyle = '#ffd23f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#23252b';
    for (let k = -8; k < 16; k++) { g.beginPath(); g.moveTo(k * 40, 0); g.lineTo(k * 40 + 20, 0); g.lineTo(k * 40 + 20 - 120, h); g.lineTo(k * 40 - 120, h); g.closePath(); g.fill(); }
    for (let k = 0; k < 3; k++) {
      const y0 = 34 + k * 76;
      g.fillStyle = '#ffffff';
      g.beginPath(); g.moveTo(w * 0.22, y0 + 44); g.lineTo(w * 0.5, y0 + 6); g.lineTo(w * 0.78, y0 + 44); g.lineTo(w * 0.78, y0 + 62); g.lineTo(w * 0.5, y0 + 26); g.lineTo(w * 0.22, y0 + 62); g.closePath(); g.fill();
    }
    g.fillStyle = 'rgba(0,0,0,0.18)';
    for (let i = 0; i < 1500; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }, { repeat: false });
  return rampTex;
}

let rippleTex = null;
function rippleTexture() {
  if (rippleTex) return rippleTex;
  rippleTex = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#9fd4f0'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.35})`;
      g.lineWidth = 1 + Math.random() * 1.5;
      const x = Math.random() * w, y = Math.random() * h, r = 4 + Math.random() * 12;
      g.beginPath(); g.ellipse(x, y, r, r * 0.45, 0, 0, Math.PI * 2); g.stroke();
    }
  });
  return rippleTex;
}

let lavaTex = null;
function lavaTexture() {
  if (lavaTex) return lavaTex;
  lavaTex = canvasTex(128, 128, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, '#ff3c00'); grd.addColorStop(0.5, '#ffb100'); grd.addColorStop(1, '#ff4a00');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      g.fillStyle = `rgba(${40 + Math.random() * 40},${15 + Math.random() * 15},10,${0.55 + Math.random() * 0.35})`;
      const x = Math.random() * w, y = Math.random() * h, r = 6 + Math.random() * 16;
      g.beginPath(); g.ellipse(x, y, r, r * 0.6, Math.random() * 3, 0, Math.PI * 2); g.fill();
      if (x < r || x > w - r || y < r || y > h - r) { g.beginPath(); g.ellipse((x + w / 2) % w, (y + h / 2) % h, r * 0.7, r * 0.4, 0, 0, Math.PI * 2); g.fill(); }
    }
    for (let i = 0; i < 160; i++) { g.fillStyle = 'rgba(255,240,150,0.8)'; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
  });
  return lavaTex;
}

// Een wig over de hele breedte van de weg: op rijden en wegvliegen.
function rampMesh(rp, topMat, sideMat) {
  const g = new THREE.Group();
  const W = rp.halfW, L = rp.len, H = rp.H;
  const geo = new THREE.BufferGeometry();
  // hoekpunten: achterkant laag (z=-L/2), voorkant hoog (z=+L/2)
  const v = [
    -W, 0, -L / 2, W, 0, -L / 2, W, H, L / 2, -W, H, L / 2, // helling
  ];
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  geo.setIndex([0, 2, 1, 0, 3, 2]);
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, topMat));
  // zijkanten en voorkant
  const side = new THREE.BufferGeometry();
  side.setAttribute('position', new THREE.Float32BufferAttribute([
    -W, 0, -L / 2, -W, H, L / 2, -W, 0, L / 2, // links
    W, 0, -L / 2, W, 0, L / 2, W, H, L / 2, // rechts
    -W, 0, L / 2, -W, H, L / 2, W, H, L / 2, -W, 0, L / 2, W, H, L / 2, W, 0, L / 2, // voorkant
  ], 3));
  side.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 4, 1, 0, 0, 4, 1, 4, 0], 2));
  side.computeVertexNormals();
  g.add(new THREE.Mesh(side, sideMat));
  // rood-witte schotten langs de randen en vlaggen op de rand
  const rail = std({ map: stripeTexture('#ffffff', '#e63946', 8, false), roughness: 0.6 });
  for (const sx of [-1, 1]) {
    const len = Math.hypot(L, H);
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.45, len), rail);
    r.position.set(sx * (W - 0.12), H / 2 + 0.2, 0);
    r.rotation.x = -Math.atan2(H, L);
    g.add(r);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), std({ color: '#dddddd', roughness: 0.4 }));
    pole.position.set(sx * (W - 0.1), H + 1.3, L / 2);
    g.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), std({ color: sx < 0 ? '#ffd23f' : '#e63946', side: THREE.DoubleSide, roughness: 0.8 }));
    flag.position.set(sx * (W - 0.1) - sx * 0.47, H + 2.3, L / 2);
    g.add(flag);
  }
  g.position.set(rp.x, 0.02, rp.z);
  g.rotation.y = rp.h;
  return g;
}

// Gloeiende boostring, dwars op de baan
function ringMesh(rg) {
  const g = new THREE.Group();
  const spin = new THREE.Group();
  g.add(spin);
  const mat = pbr({ color: '#ffb000', emissive: '#ff8a00', emissiveIntensity: 2.2, roughness: 0.3, metalness: 0.2 });
  spin.add(new THREE.Mesh(new THREE.TorusGeometry(rg.r, 0.22, 14, 48), mat));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshBasicMaterial({ color: i % 2 ? '#ffffff' : '#ff7a00' }));
    b.position.set(Math.cos(a) * rg.r, Math.sin(a) * rg.r, 0);
    spin.add(b);
  }
  const glow = new THREE.Mesh(new THREE.CircleGeometry(rg.r - 0.15, 36), new THREE.MeshBasicMaterial({ color: '#ffcf4a', transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  g.add(glow);
  g.position.set(rg.x, rg.y, rg.z);
  g.rotation.y = rg.h;
  g.userData.spin = spin;
  g.userData.mat = mat;
  return g;
}

// Sloot of lavastroom die dwars door het landschap loopt (onder de weg door)
function channel(scene, track, zn, mat, animated) {
  const p = track.pointAt((zn.s0 + zn.s1) / 2, 0);
  const width = Math.max(4, zn.s1 - zn.s0);
  // lang in de breedte (dwars op de weg), smal in de rijrichting
  const m = new THREE.Mesh(new THREE.PlaneGeometry(420, width), mat);
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = p.h;
  m.position.set(p.x, 0.0, p.z);
  m.material.polygonOffset = true;
  m.material.polygonOffsetFactor = -1;
  m.receiveShadow = true;
  scene.add(m);
  // oevers (voor en achter de sloot, in de rijrichting gezien)
  const bankMat = std({ color: mat.emissiveMap ? '#1d1715' : '#3d6b2c', roughness: 1 });
  const fx = Math.sin(p.h), fz = Math.cos(p.h);
  for (const sgn of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 420), bankMat);
    b.position.set(p.x + fx * sgn * (width / 2 + 0.35), 0.04, p.z + fz * sgn * (width / 2 + 0.35));
    b.rotation.y = p.h + Math.PI / 2;
    b.receiveShadow = true;
    scene.add(b);
  }
}

// ---------- gras en heuvels ----------
function grassTufts(deco, track, rand, color, count, placed) {
  const list = [];
  const base = new THREE.Color(color);
  for (let n = 0, tries = 0; n < count && tries < count * 4; tries++) {
    const i = Math.floor(rand() * track.N);
    const side = rand() < 0.5 ? -1 : 1;
    const dist = track.wallD + 0.3 + Math.pow(rand(), 1.6) * 26;
    const x = track.px[i] + track.nx[i] * side * dist, z = track.pz[i] + track.nz[i] * side * dist;
    if (Math.abs(track.locate(x, z, i).d) < track.wallD + 0.2) continue;
    let blocked = false;
    for (const p of placed) if (p.r > 2 && (p.x - x) ** 2 + (p.z - z) ** 2 < (p.r * 0.8) ** 2) { blocked = true; break; }
    if (blocked) continue;
    const c = base.clone().offsetHSL((rand() - 0.5) * 0.04, (rand() - 0.5) * 0.15, (rand() - 0.5) * 0.12);
    list.push({ x, z, ry: rand() * Math.PI, s: 0.7 + rand() * 0.8, sy: 0.7 + rand() * 0.7, color: '#' + c.getHexString() });
    n++;
  }
  instanced(deco, proto('tuft'), list);
}

function hillsRing(scene, bb, th, rand) {
  const R = 620, n = 160;
  const pos = [], col = [], idx = [];
  const fog = new THREE.Color(th.fog), base = new THREE.Color(th.hills);
  const hazeTop = base.clone().lerp(fog, 0.72), hazeBot = base.clone().lerp(fog, 0.55);
  const seed = rand() * 10;
  const heightAt = (a) => 28 + 22 * Math.sin(a * 3 + seed) + 14 * Math.sin(a * 7.3 + seed * 2) + 7 * Math.sin(a * 17.1 + seed);
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const h = Math.max(6, heightAt(a));
    const c = Math.cos(a), s2 = Math.sin(a);
    // zee aan de oostkant van de kustbaan: daar geen heuvels
    const sea = th.water === 'zee' && c > 0.2 ? 0 : 1;
    pos.push(bb.cx + c * (R + 60), -8, bb.cz + s2 * (R + 60));
    pos.push(bb.cx + c * R, h * 0.62 * sea - 2 * (1 - sea), bb.cz + s2 * R);
    pos.push(bb.cx + c * (R - 50), h * sea - 4 * (1 - sea), bb.cz + s2 * (R - 50));
    col.push(hazeBot.r, hazeBot.g, hazeBot.b, hazeBot.r, hazeBot.g, hazeBot.b, hazeTop.r, hazeTop.g, hazeTop.b);
    if (i < n) {
      const k = i * 3;
      idx.push(k, k + 3, k + 1, k + 1, k + 3, k + 4, k + 1, k + 4, k + 2, k + 2, k + 4, k + 5);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }));
  m.renderOrder = -5;
  scene.add(m);
}

// ---------- Neonstad ----------
let winTex = null;
function windowsTexture() {
  if (winTex) return winTex;
  winTex = canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#151827'; g.fillRect(0, 0, w, h);
    for (let y = 6; y < h; y += 14) for (let x = 6; x < w; x += 12) {
      const r = Math.random();
      g.fillStyle = r < 0.45 ? '#0c0e18' : r < 0.75 ? '#ffd98a' : r < 0.88 ? '#9fe6ff' : '#ff9ad5';
      g.fillRect(x, y, 7, 9);
    }
  });
  return winTex;
}

function nightCity(deco, track, bb, rand, along, anywhere, dens, animated) {
  const tex = windowsTexture();
  const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
  const bmat = pbr({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.9, roughness: 0.6, color: '#8a8fa8' });
  const roof = new THREE.BoxGeometry(1.04, 0.04, 1.04); roof.translate(0, 1.0, 0);
  const roofMat = new THREE.MeshBasicMaterial({ color: '#ff3fa4' });
  const bl = [];
  for (const p of along(Math.round(60 * dens), 5, 30, 7)) bl.push({ ...p, sx: 9 + rand() * 8, sz: 9 + rand() * 8, sy: 14 + rand() * 40 });
  for (const p of anywhere(Math.round(40 * dens), 4, 8, 180)) bl.push({ ...p, sx: 12 + rand() * 14, sz: 12 + rand() * 14, sy: 25 + rand() * 70 });
  // skyline in de verte
  for (let n = 0; n < 60; n++) {
    const a = (n / 60) * Math.PI * 2, r = 300 + rand() * 120;
    bl.push({ x: bb.cx + Math.cos(a) * r, z: bb.cz + Math.sin(a) * r, ry: a, sx: 20 + rand() * 25, sz: 20 + rand() * 25, sy: 40 + rand() * 120 });
  }
  instanced(deco, [{ geo: box, mat: bmat }, { geo: roof, mat: roofMat, tint: false }], bl);
  // lantaarns met een gloed
  const lamps = along(Math.round(46 * dens), 0.4, 1.2, 0.6);
  instanced(deco, proto('lamp'), lamps);
  const glow = new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffcf7a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  for (const l of lamps) { const s = new THREE.Sprite(glow); s.position.set(l.x, 4.6, l.z); s.scale.setScalar(4); s.userData.noShadow = true; deco.add(s); }
  // neonbogen over de weg
  const neon = ['#ff3fa4', '#3ff6ff', '#b46bff', '#ffe14d'];
  for (let k = 0; k < 7; k++) {
    const p = track.pointAt((k / 7) * track.L + 25, 0);
    const col = neon[k % neon.length];
    const arch = new THREE.Mesh(new THREE.TorusGeometry(track.wallD + 0.5, 0.18, 8, 48, Math.PI), new THREE.MeshBasicMaterial({ color: col }));
    arch.position.set(p.x, 0, p.z);
    arch.rotation.y = p.h;
    arch.userData.noShadow = true;
    deco.add(arch);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(track.wallD + 0.5, 0.7, 6, 48, Math.PI), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.position.copy(arch.position); halo.rotation.y = p.h;
    halo.userData.noShadow = true;
    deco.add(halo);
    const ph = k * 0.9;
    animated.push((t) => { halo.material.opacity = 0.12 + Math.max(0, Math.sin(t * 3 + ph)) * 0.14; });
  }
  // maan
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#dfe6ff', fog: false, depthWrite: false, transparent: true }));
  moon.position.set(bb.cx - 500, 380, bb.cz + 300);
  moon.scale.setScalar(160);
  deco.add(moon);
}

// ---------- Vulkaaneiland ----------
function volcano(animated, scene) {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(9, 34, 34, 28, 4, true), std({ color: '#3a2f2b', roughness: 1 }));
  const p = cone.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const a = Math.atan2(p.getZ(i), p.getX(i));
    const f = 1 + Math.sin(a * 5) * 0.06 + Math.sin(a * 11 + p.getY(i)) * 0.04;
    p.setXYZ(i, p.getX(i) * f, p.getY(i), p.getZ(i) * f);
  }
  cone.geometry.computeVertexNormals();
  cone.position.y = 17;
  g.add(cone);
  const lava = new THREE.Mesh(new THREE.CircleGeometry(9.2, 28), new THREE.MeshBasicMaterial({ map: lavaTexture(), color: '#ffffff' }));
  lava.rotation.x = -Math.PI / 2;
  lava.position.y = 32.5;
  g.add(lava);
  // gloeiende stromen langs de helling (smalle strookjes op de kegel)
  const streamMat = new THREE.MeshBasicMaterial({ map: lavaTexture(), color: '#ffffff', side: THREE.DoubleSide });
  for (let i = 0; i < 5; i++) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(9.25, 34.4, 34, 3, 1, true, i * 1.3 + 0.2, 0.05 + (i % 2) * 0.03), streamMat);
    st.position.y = 17;
    g.add(st);
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ff7a1a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  glow.position.y = 38;
  glow.scale.setScalar(60);
  g.add(glow);
  // rookpluim
  const smokeMat = new THREE.SpriteMaterial({ map: glowTexture(), color: '#4a403c', transparent: true, opacity: 0.55, depthWrite: false });
  const puffs = [];
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Sprite(smokeMat.clone());
    g.add(s);
    puffs.push({ s, t: i / 14 });
  }
  animated.push((t, dt) => {
    glow.material.opacity = 0.65 + Math.sin(t * 2.2) * 0.2;
    for (const pf of puffs) {
      pf.t = (pf.t + (dt || 0.016) * 0.07) % 1;
      const k = pf.t;
      pf.s.position.set(Math.sin(k * 5 + pf.t) * 4 + k * 26, 34 + k * 70, Math.cos(k * 4) * 3);
      pf.s.scale.setScalar(12 + k * 45);
      pf.s.material.opacity = 0.6 * (1 - k) * Math.min(1, k * 6);
    }
  });
  return g;
}

function lavaPools(deco, rand, landmarkSpot, count, animated) {
  const t = lavaTexture();
  const mat = new THREE.MeshBasicMaterial({ map: t, color: '#ffffff' });
  for (let i = 0; i < count; i++) {
    const sp = landmarkSpot(7, i % 2 === 0);
    if (!sp) continue;
    const m = new THREE.Mesh(new THREE.CircleGeometry(3 + rand() * 4, 20), mat);
    m.rotation.x = -Math.PI / 2;
    m.scale.y = 0.6 + rand() * 0.4;
    m.position.set(sp.x, 0.05, sp.z);
    m.userData.noShadow = true;
    deco.add(m);
  }
}

function ash(scene, animated) {
  const n = 500;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 120; pos[i * 3 + 1] = Math.random() * 40; pos[i * 3 + 2] = (Math.random() - 0.5) * 120; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ff9a5a', size: 0.22, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.frustumCulled = false;
  scene.add(pts);
  animated.push((t, dt) => {
    const a = geo.attributes.position.array;
    for (let i = 0; i < n; i++) {
      a[i * 3 + 1] += (dt || 0.016) * (1 + (i % 4));
      a[i * 3] += Math.sin(t + i) * (dt || 0.016) * 0.8;
      if (a[i * 3 + 1] > 40) a[i * 3 + 1] -= 40;
    }
    geo.attributes.position.needsUpdate = true;
  });
  scene.userData.snow = pts;
}
