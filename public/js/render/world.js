// Bouwt de 3D-wereld van een baan: weg, bermen, muren, obstakels, itemdozen en decor.
import * as THREE from '../../vendor/three.module.min.js';
import { rng, hashString } from '../../shared/util.js';
import { roadTexture, groundTexture, stripeTexture, checkerTexture, arrowTexture, questionTexture, patternTexture, facadeTexture, containerTexture, textCanvas, glowTexture } from './textures.js';
import { lambert } from './kart.js';

export const THEMES = {
  kust: {
    sky: ['#3aa5ff', '#d4f1ff'], fog: '#cbeaff', fogFar: 560, road: 'asfalt',
    ground: ['#ecd49b', ['#e0c486', '#f5e3b2', '#d4b677']], shoulder: ['#f3dfaa', ['#e7cf92', '#fbeccc']],
    curb: ['#ff4b4b', '#ffffff'], wall: { style: 'blokken', c1: '#ffffff', c2: '#2f7de1', h: 0.9 },
    hemi: ['#ffffff', '#e8c88a', 1.1], sun: ['#fff1d6', 1.7], water: 'zee', music: 0,
  },
  pretpark: {
    sky: ['#5b3cff', '#ffb8dd'], fog: '#f0b7e6', fogFar: 480, road: 'snoep',
    ground: ['#79cf63', ['#6cc257', '#8ade73', '#65b852']], shoulder: ['#ffe6f2', ['#ffd0e6', '#fff3f9']],
    curb: ['#ffd23f', '#ff4fa0'], wall: { style: 'blokken', c1: '#ffd23f', c2: '#3dd6d0', h: 0.9 },
    hemi: ['#ffe0f4', '#7a6cff', 1.15], sun: ['#ffe9f3', 1.4], music: 1,
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
    hemi: ['#f4ffe8', '#2f5a24', 1.1], sun: ['#fff6d8', 1.5], music: 3,
  },
  haven: {
    sky: ['#6f93c2', '#e1e9f1'], fog: '#d4dee8', fogFar: 520, road: 'beton',
    ground: ['#9aa1a8', ['#8f969d', '#a6adb4', '#868d94']], shoulder: ['#b7bdc4', ['#aab0b7', '#c4cad0']],
    curb: ['#ffd23f', '#222222'], wall: { style: 'blokken', c1: '#ffd23f', c2: '#222222', h: 1.0 },
    hemi: ['#f0f5ff', '#5b6b7d', 1.1], sun: ['#fff8ec', 1.5], water: 'haven', music: 4,
  },
  sneeuw: {
    sky: ['#7dbdff', '#f3f9ff'], fog: '#e8f2ff', fogFar: 440, road: 'sneeuw',
    ground: ['#f2f7fc', ['#e6eef6', '#ffffff', '#dbe6f1']], shoulder: ['#ffffff', ['#eef4fa', '#e3ecf5']],
    curb: ['#e63946', '#ffffff'], wall: { style: 'sneeuwwal', c1: '#ffffff', c2: '#dfe9f3', h: 1.2 },
    hemi: ['#ffffff', '#9fb6cc', 1.05], sun: ['#ffffff', 1.3], snow: true, music: 5,
  },
  woestijn: {
    sky: ['#ff9e57', '#ffe9c4'], fog: '#f6d6a2', fogFar: 520, road: 'asfalt',
    ground: ['#e9b56a', ['#dca55c', '#f2c47f', '#d39a4f']], shoulder: ['#dba05a', ['#cf934d', '#e7b06c']],
    curb: ['#ffffff', '#ff7b00'], wall: { style: 'rots', c1: '#c76b3a', c2: '#a8552b', h: 1.4 },
    hemi: ['#fff1d8', '#b06a35', 1.1], sun: ['#fff0c8', 1.8], music: 6,
  },
  boerderij: {
    sky: ['#4aa3ff', '#e2f2ff'], fog: '#d8ecff', fogFar: 500, road: 'zand',
    ground: ['#67bb46', ['#5daf3e', '#74c752', '#56a438']], shoulder: ['#8dd062', ['#81c457', '#9adb6e']],
    curb: ['#ffffff', '#d93a3a'], wall: { style: 'hek', c1: '#ffffff', c2: '#dddddd', h: 1.0 },
    hemi: ['#ffffff', '#5e8f3a', 1.1], sun: ['#fff6e0', 1.6], music: 7,
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
    parent.add(im);
  }
}

const P = {}; // prototypes, lui aangemaakt
function proto(name) {
  if (P[name]) return P[name];
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
      p = [{ geo: stem, mat: L('#f6f1e4') }, { geo: cap, mat: new THREE.MeshLambertMaterial({ map: patternTexture('stippen', '#e0312b') }) }];
      break;
    }
    case 'house': {
      const box = new THREE.BoxGeometry(6, 10, 6); box.translate(0, 5, 0);
      const roof = prism(3.6, 6.4); roof.scale(1, 1, 0.75); roof.translate(0, 11.2, 0);
      const mats = ['#a3523a', '#5a3b2e', '#c9a77c', '#3f5560', '#7b2d26'].map((c, i) => new THREE.MeshLambertMaterial({ map: facadeTexture(c, i + 1) }));
      p = [{ geo: box, mat: mats[0], tint: true }, { geo: roof, mat: L('#3a3a42') }];
      p.facades = mats;
      break;
    }
    case 'hut': {
      const box = new THREE.BoxGeometry(3, 2.6, 3); box.translate(0, 1.3, 0);
      const roof = prism(1.9, 3.4); roof.scale(1, 1, 0.6); roof.translate(0, 3.1, 0);
      p = [{ geo: box, mat: new THREE.MeshLambertMaterial({ map: stripeTexture('#ffffff', '#ffffff', 2, true) }), tint: true }, { geo: roof, mat: L('#f4f0e8') }];
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
      p = [{ geo: box, mat: new THREE.MeshLambertMaterial({ map: containerTexture('#ffffff') }), tint: true }];
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
      p = [{ geo: body, mat: new THREE.MeshLambertMaterial({ map: patternTexture('koe') }) }, { geo: head, mat: L('#ffffff') }, { geo: snout, mat: L('#f2a7b3') }, { geo: legs, mat: L('#2a2a2a') }];
      break;
    }
    case 'haybale': { const g = new THREE.CylinderGeometry(0.9, 0.9, 1.6, 10); g.rotateZ(Math.PI / 2); g.translate(0, 0.9, 0); p = [{ geo: g, mat: L('#e9c46a') }]; break; }
    case 'tent': {
      const base = new THREE.CylinderGeometry(2.6, 2.6, 2.4, 10); base.translate(0, 1.2, 0);
      const top = new THREE.ConeGeometry(3.0, 2.6, 10); top.translate(0, 3.7, 0);
      const flag = new THREE.ConeGeometry(0.25, 0.8, 4); flag.translate(0, 5.3, 0);
      p = [{ geo: base, mat: new THREE.MeshLambertMaterial({ map: stripeTexture('#ffffff', '#e8423f', 8, true) }) },
        { geo: top, mat: new THREE.MeshLambertMaterial({ map: stripeTexture('#ffffff', '#ffffff', 2, true) }), tint: true }, { geo: flag, mat: L('#ffd23f') }];
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
    case 'tulips': { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); g.translate(0, 0.06, 0); p = [{ geo: g, mat: new THREE.MeshLambertMaterial({ map: stripeTexture('#ffffff', '#3e8e41', 8, false) }), tint: true }]; break; }
    case 'planet': { const g = new THREE.IcosahedronGeometry(1, 2); p = [{ geo: g, mat: new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#222244' }), tint: true }]; break; }
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
      add(new THREE.BoxGeometry(1.6, 0.25, 2.4), new THREE.MeshLambertMaterial({ map: stripeTexture('#ffffff', '#2f7de1', 6, true) }), 0, 0.6);
      { const back = add(new THREE.BoxGeometry(1.6, 1.6, 0.2), new THREE.MeshLambertMaterial({ map: stripeTexture('#ffffff', '#2f7de1', 6, true) }), 0, 1.3, -1.0); back.rotation.x = -0.4; }
      add(new THREE.BoxGeometry(1.7, 0.6, 2.0), L('#c9a77c'), 0, 0.3);
      break;
    case 'popcornkar':
      add(new THREE.BoxGeometry(2.2, 1.4, 1.6), L('#e8423f'), 0, 0.9);
      add(new THREE.BoxGeometry(2.0, 0.8, 1.4), L('#ffffff', { transparent: true, opacity: 0.6 }), 0, 2.0);
      for (let i = 0; i < 6; i++) add(new THREE.IcosahedronGeometry(0.2, 0), L('#fff3c4'), (i % 3 - 1) * 0.5, 1.75, (i < 3 ? -1 : 1) * 0.3);
      add(new THREE.ConeGeometry(1.6, 0.7, 4), new THREE.MeshLambertMaterial({ map: stripeTexture('#ffffff', '#e8423f', 6, true) }), 0, 2.75).rotation.y = Math.PI / 4;
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
      { const cap = add(new THREE.SphereGeometry(2.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ map: patternTexture('stippen', '#e0312b') }), 0, 2.2); cap.scale.y = 0.7; }
      break;
    case 'vat': {
      const m = add(new THREE.CylinderGeometry(0.9, 0.9, 1.8, 12), L('#ff7a00'), 0, 0.9);
      for (const y of [0.4, 1.4]) add(new THREE.CylinderGeometry(0.93, 0.93, 0.12, 12), L('#333333'), 0, y);
      m.userData.color = true;
      break;
    }
    case 'krat':
      add(new THREE.BoxGeometry(2.0, 2.0, 2.0), new THREE.MeshLambertMaterial({ map: stripeTexture('#c99b5f', '#a87b45', 6, false) }), 0, 1.0);
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
      add(new THREE.IcosahedronGeometry(1.6, 1), new THREE.MeshLambertMaterial({ color: '#a8743f', wireframe: true }), 0, 1.6);
      add(new THREE.IcosahedronGeometry(1.1, 0), new THREE.MeshLambertMaterial({ color: '#8a5a2b', wireframe: true }), 0, 1.6);
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
    default:
      add(new THREE.SphereGeometry(1.5, 10, 8), L('#ff00ff'), 0, 1.5);
  }
  g.userData.kind = kind;
  g.userData.inner = inner;
  return g;
}

export function itemBoxMesh() {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ map: questionTexture(), transparent: true, opacity: 0.92, emissive: '#333333' });
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
  const m = new THREE.Mesh(new THREE.CircleGeometry(2.1, 18), new THREE.MeshPhongMaterial({ color: '#fbfbf6', shininess: 120, specular: '#ffffff', transparent: true, opacity: 0.9 }));
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
  const th = THEMES[def.theme] || THEMES.kust;
  const scene = new THREE.Scene();
  const rand = rng(hashString(def.id));
  const dens = quality === 'laag' ? 0.5 : quality === 'hoog' ? 1.4 : 1;
  const animated = [];

  scene.fog = new THREE.Fog(th.fog, 60, th.fogFar);
  scene.background = new THREE.Color(th.sky[1]);

  // lucht
  const skyGeo = new THREE.SphereGeometry(1500, 24, 14);
  const cols = [];
  const top = new THREE.Color(th.sky[0]), hor = new THREE.Color(th.sky[1]);
  const pa = skyGeo.attributes.position;
  for (let i = 0; i < pa.count; i++) {
    const y = pa.getY(i) / 1500;
    const c = hor.clone().lerp(top, Math.pow(Math.max(0, y), 0.6));
    cols.push(c.r, c.g, c.b);
  }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -10;
  scene.add(sky);

  // licht
  scene.add(new THREE.HemisphereLight(th.hemi[0], th.hemi[1], th.hemi[2]));
  const sun = new THREE.DirectionalLight(th.sun[0], th.sun[1]);
  sun.position.set(120, 200, 80);
  scene.add(sun);
  if (!th.stars) {
    const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#fff6d0', fog: false, depthWrite: false, transparent: true }));
    sunSprite.position.set(500, 420, 330);
    sunSprite.scale.setScalar(260);
    scene.add(sunSprite);
  }

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
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(gw, gd), new THREE.MeshLambertMaterial({ map: gt }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(gx, -0.02, gz);
    scene.add(ground);
    if (th.water) {
      const wmat = new THREE.MeshPhongMaterial({ color: th.water === 'gracht' ? '#3b6f7a' : '#2b8fd6', shininess: 90, specular: '#cfefff', transparent: true, opacity: 0.95, flatShading: true });
      const wgeo = new THREE.PlaneGeometry(2400, 2400, 40, 40);
      const water = new THREE.Mesh(wgeo, wmat);
      water.rotation.x = -Math.PI / 2;
      water.position.set(cx, -0.9, cz);
      scene.add(water);
      const base = Float32Array.from(wgeo.attributes.position.array);
      animated.push((t) => {
        const a = wgeo.attributes.position.array;
        for (let i = 0; i < a.length; i += 3) a[i + 2] = Math.sin(base[i] * 0.05 + t * 1.2) * 0.25 + Math.cos(base[i + 1] * 0.04 + t) * 0.25;
        wgeo.attributes.position.needsUpdate = true;
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
  const road = new THREE.Mesh(ribbon(track, -track.halfW, track.halfW, 0.03, 12), new THREE.MeshLambertMaterial({ map: roadT, emissive: th.stars ? '#3a3266' : '#000000' }));
  scene.add(road);
  const sT = groundTexture(th.shoulder[0], th.shoulder[1], 7);
  for (const sgn of [-1, 1]) {
    const sh = new THREE.Mesh(ribbon(track, sgn * track.halfW, sgn * track.wallD, 0.015, 6), new THREE.MeshLambertMaterial({ map: sT, emissive: th.stars ? '#1c1450' : '#000000' }));
    scene.add(sh);
    const curb = new THREE.Mesh(ribbon(track, sgn * (track.halfW - 0.05), sgn * (track.halfW + 0.75), 0.05, 2.5, { yOuter: 0.12 }),
      th.stars ? new THREE.MeshBasicMaterial({ map: stripeTexture(th.curb[0], th.curb[1], 2) }) : new THREE.MeshLambertMaterial({ map: stripeTexture(th.curb[0], th.curb[1], 2) }));
    scene.add(curb);
    const w = th.wall;
    const wt = wallTexture(w.style, w.c1, w.c2);
    const wallMat = w.style === 'glow'
      ? new THREE.MeshBasicMaterial({ map: wt, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
      : new THREE.MeshLambertMaterial({ map: wt, side: THREE.DoubleSide, transparent: w.style === 'hek', alphaTest: w.style === 'hek' ? 0.5 : 0 });
    const wall = new THREE.Mesh(wallGeometry(track, sgn * track.wallD, w.h, w.style === 'sneeuwwal' ? 0.8 : 0), wallMat);
    scene.add(wall);
  }

  // startlijn + poort
  {
    const p = track.pointAt(0, 0);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(track.halfW * 2, 2.2), new THREE.MeshLambertMaterial({ map: (() => { const t = checkerTexture().clone(); t.needsUpdate = true; t.repeat.set(track.halfW, 1); return t; })() }));
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
    const m = obstacleMesh(o.kind);
    m.position.set(o.x, 0, o.z);
    m.rotation.y = o.h + rand() * 6;
    if (m.userData.float) animated.push((t) => { m.position.y = 0.4 + Math.sin(t * 2 + o.id) * 0.3; m.rotation.y += 0.01; });
    scene.add(m);
  }

  // ijs en modder
  for (const zn of track.zones) {
    const len = zn.s1 - zn.s0;
    const color = zn.type === 'ijs' ? '#bfe9ff' : '#6b4a2e';
    const mat = zn.type === 'ijs'
      ? new THREE.MeshPhongMaterial({ color, shininess: 140, specular: '#ffffff', transparent: true, opacity: 0.8 })
      : new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.92 });
    for (let s = 0; s < len; s += 3) {
      const d0 = Math.max(zn.d0, -track.wallD), d1 = Math.min(zn.d1, track.wallD);
      const p = track.pointAt(zn.s0 + s + 1.5, (d0 + d1) / 2);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(d1 - d0, 3.3), mat);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = p.h;
      m.position.set(p.x, 0.065, p.z);
      scene.add(m);
    }
  }

  // itemdozen
  const boxes = track.itemBoxes.map((b) => {
    const m = itemBoxMesh();
    m.position.set(b.x, 1.4, b.z);
    scene.add(m);
    return { mesh: m, active: true, scale: 1, id: b.id };
  });

  // bewegende obstakels
  const hazards = track.hazards.map((hz) => {
    const m = hazardMesh(hz.kind);
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

  const world = {
    scene, theme: def.theme, th, boxes, hazards, bb,
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
        if (k === 'sneeuwbal' || k === 'rolbos') inner.rotation.x += dt * 5;
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
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.4, 22, 14), new THREE.MeshLambertMaterial({ map: stripeTexture('#ffffff', '#e63946', 6, false) }));
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
  const roof = new THREE.Mesh(new THREE.ConeGeometry(9, 4, 20), new THREE.MeshLambertMaterial({ map: stripeTexture('#ffffff', '#ff4fa0', 12, true) }));
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
    const sail = new THREE.Mesh(new THREE.BoxGeometry(2.4, 11, 0.1), new THREE.MeshLambertMaterial({ map: stripeTexture('#ffffff', '#d93a3a', 10, false) }));
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
  const load = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 8), new THREE.MeshLambertMaterial({ map: containerTexture('#2a9d8f') }));
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
    const c = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 9), new THREE.MeshLambertMaterial({ map: containerTexture(['#2f7de1', '#e9c46a', '#d62828', '#2a9d8f'][i]) }));
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
