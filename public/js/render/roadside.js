// Spullen vlak langs de weg: tribunes met juichend publiek, reclameborden, bochtpijlen,
// bandenstapels, vlaggen, pionnen en per baan eigen kleine dingen.
// Alles met "instancing", zodat het ook op een telefoon soepel blijft.
import * as THREE from '../../vendor/three.module.min.js';
import { lambert } from './kart.js';
import { stripeTexture, patternTexture } from './textures.js';

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const tmpE = new THREE.Euler();
const tmpC = new THREE.Color();

function compose(it) {
  tmpP.set(it.x, it.y || 0, it.z);
  tmpE.set(it.rx || 0, it.ry || 0, it.rz || 0);
  tmpQ.setFromEuler(tmpE);
  const s = it.s || 1;
  tmpS.set(s * (it.sx || 1), s * (it.sy || 1), s * (it.sz || 1));
  return tmpM.compose(tmpP, tmpQ, tmpS);
}

// parts: [{ geo, mat, tint? }]; geeft de InstancedMeshes terug (voor animatie)
function instanced(parent, parts, list) {
  if (!list.length) return [];
  return parts.map((part) => {
    const im = new THREE.InstancedMesh(part.geo, part.mat, list.length);
    list.forEach((it, n) => {
      im.setMatrixAt(n, compose(it));
      if (part.tint) im.setColorAt(n, tmpC.set(it.color || '#ffffff'));
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.frustumCulled = false;
    parent.add(im);
    return im;
  });
}

const T = (g, x = 0, y = 0, z = 0) => { g.translate(x, y, z); return g; };

// ---------- kleine prototypes ----------
const PROTO = {};
function proto(name) {
  if (PROTO[name]) return PROTO[name];
  const L = lambert;
  let p;
  switch (name) {
    case 'chevronPaal': p = [{ geo: T(new THREE.BoxGeometry(0.12, 1.6, 0.12), 0, 0.8, 0), mat: L('#555b66') }]; break;
    case 'band': {
      const g = new THREE.TorusGeometry(0.42, 0.17, 6, 12);
      g.rotateX(Math.PI / 2);
      p = [{ geo: g, mat: L('#1d1f24') }, { geo: T(new THREE.CylinderGeometry(0.44, 0.44, 0.06, 12), 0, 0.12, 0), mat: L('#ffffff'), tint: true }];
      break;
    }
    case 'pion': p = [{ geo: T(new THREE.ConeGeometry(0.25, 0.75, 10), 0, 0.42, 0), mat: L('#ff7a00') }, { geo: T(new THREE.CylinderGeometry(0.17, 0.2, 0.12, 10), 0, 0.46, 0), mat: L('#ffffff') }, { geo: T(new THREE.BoxGeometry(0.6, 0.06, 0.6), 0, 0.03, 0), mat: L('#333333') }]; break;
    case 'vlag': {
      const flag = new THREE.BufferGeometry();
      flag.setAttribute('position', new THREE.Float32BufferAttribute([0, 4.4, 0, 0, 3.4, 0, 1.3, 3.9, 0], 3));
      flag.computeVertexNormals();
      p = [{ geo: T(new THREE.CylinderGeometry(0.05, 0.06, 4.6, 6), 0, 2.3, 0), mat: L('#e8e8ec') }, { geo: flag, mat: new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide }), tint: true }];
      break;
    }
    case 'tribune': {
      p = [
        { geo: T(new THREE.BoxGeometry(12, 0.6, 1.4), 0, 0.3, 1.4), mat: L('#b7bdc4') },
        { geo: T(new THREE.BoxGeometry(12, 1.2, 1.4), 0, 0.6, 0), mat: L('#a3aab2') },
        { geo: T(new THREE.BoxGeometry(12, 1.8, 1.4), 0, 0.9, -1.4), mat: L('#8f969d') },
        { geo: T(new THREE.BoxGeometry(12.6, 0.15, 5), 0, 4.6, -0.2), mat: new THREE.MeshLambertMaterial({ map: stripeTexture('#ffffff', '#e63946', 12, true) }) },
        { geo: T(new THREE.BoxGeometry(0.15, 4.6, 0.15), -6, 2.3, -2.4), mat: L('#555b66') },
        { geo: T(new THREE.BoxGeometry(0.15, 4.6, 0.15), 6, 2.3, -2.4), mat: L('#555b66') },
      ];
      break;
    }
    case 'fan': p = [
      { geo: T(new THREE.CylinderGeometry(0.2, 0.24, 0.6, 7), 0, 0.3, 0), mat: L('#ffffff'), tint: true },
      { geo: T(new THREE.SphereGeometry(0.17, 8, 6), 0, 0.76, 0), mat: L('#f1c4a3') },
    ]; break;
    case 'bordPaal': p = [{ geo: T(new THREE.BoxGeometry(0.18, 3.2, 0.18), 0, 1.6, 0), mat: L('#555b66') }]; break;
    // ---- thema's ----
    case 'surfplank': p = [{ geo: (() => { const g = new THREE.CapsuleGeometry(0.28, 1.6, 4, 8); g.scale(1, 1, 0.18); return T(g, 0, 1.0, 0); })(), mat: L('#ffffff'), tint: true }]; break;
    case 'strandbal': p = [{ geo: T(new THREE.SphereGeometry(0.35, 10, 8), 0, 0.35, 0), mat: new THREE.MeshLambertMaterial({ map: stripeTexture('#ff4b4b', '#ffffff', 6, true) }) }]; break;
    case 'ijskar': p = [
      { geo: T(new THREE.BoxGeometry(1.4, 0.9, 0.8), 0, 0.75, 0), mat: L('#ffffff'), tint: true },
      { geo: T(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 5), 0, 1.9, 0), mat: L('#dddddd') },
      { geo: T(new THREE.ConeGeometry(1.0, 0.5, 8), 0, 2.6, 0), mat: new THREE.MeshLambertMaterial({ map: stripeTexture('#ff5fa2', '#ffffff', 8, true) }) },
      { geo: (() => { const g = new THREE.TorusGeometry(0.2, 0.05, 6, 10); g.rotateY(Math.PI / 2); return T(g, 0.5, 0.25, 0.4); })(), mat: L('#333333') },
    ]; break;
    case 'ballonnen': p = [
      { geo: T(new THREE.CylinderGeometry(0.01, 0.01, 2.2, 3), 0, 1.1, 0), mat: L('#ffffff') },
      { geo: T(new THREE.SphereGeometry(0.3, 8, 8), 0, 2.4, 0), mat: L('#ffffff', { emissive: '#222' }), tint: true },
      { geo: T(new THREE.SphereGeometry(0.3, 8, 8), 0.3, 2.2, 0.15), mat: L('#ffd23f') },
      { geo: T(new THREE.SphereGeometry(0.3, 8, 8), -0.25, 2.25, -0.1), mat: L('#3dd6d0') },
    ]; break;
    case 'fiets': {
      const wheel = () => { const g = new THREE.TorusGeometry(0.33, 0.035, 5, 14); g.rotateY(Math.PI / 2); return g; };
      p = [
        { geo: T(wheel(), 0, 0.36, 0.55), mat: L('#222222') },
        { geo: T(wheel(), 0, 0.36, -0.55), mat: L('#222222') },
        { geo: (() => { const g = new THREE.BoxGeometry(0.05, 0.05, 1.1); g.rotateX(0.15); return T(g, 0, 0.62, 0); })(), mat: L('#ffffff'), tint: true },
        { geo: T(new THREE.BoxGeometry(0.05, 0.45, 0.05), 0, 0.55, -0.3), mat: L('#ffffff'), tint: true },
        { geo: T(new THREE.BoxGeometry(0.16, 0.05, 0.25), 0, 0.82, -0.3), mat: L('#222222') },
        { geo: T(new THREE.BoxGeometry(0.5, 0.04, 0.04), 0, 0.9, 0.48), mat: L('#888888') },
      ];
      break;
    }
    case 'bankje': p = [
      { geo: T(new THREE.BoxGeometry(1.6, 0.08, 0.45), 0, 0.45, 0), mat: L('#8a5a35') },
      { geo: T(new THREE.BoxGeometry(1.6, 0.4, 0.06), 0, 0.72, -0.2), mat: L('#8a5a35') },
      { geo: T(new THREE.BoxGeometry(1.5, 0.45, 0.35), 0, 0.22, 0), mat: L('#2b2d36') },
    ]; break;
    case 'varen': p = [{ geo: (() => { const g = new THREE.ConeGeometry(0.6, 0.9, 6); return T(g, 0, 0.45, 0); })(), mat: L('#ffffff'), tint: true }]; break;
    case 'paddo': p = [
      { geo: T(new THREE.CylinderGeometry(0.08, 0.1, 0.35, 6), 0, 0.17, 0), mat: L('#f6f1e4') },
      { geo: T(new THREE.SphereGeometry(0.25, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.32, 0), mat: new THREE.MeshLambertMaterial({ map: patternTexture('stippen', '#e0312b') }) },
    ]; break;
    case 'meerpaal': p = [
      { geo: T(new THREE.CylinderGeometry(0.28, 0.32, 0.8, 10), 0, 0.4, 0), mat: L('#2b2d36') },
      { geo: T(new THREE.CylinderGeometry(0.38, 0.38, 0.12, 10), 0, 0.84, 0), mat: L('#2b2d36') },
    ]; break;
    case 'vatje': p = [
      { geo: T(new THREE.CylinderGeometry(0.4, 0.4, 1.0, 10), 0, 0.5, 0), mat: L('#ffffff'), tint: true },
      { geo: T(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 10), 0, 0.8, 0), mat: L('#333333') },
    ]; break;
    case 'kist': p = [{ geo: T(new THREE.BoxGeometry(1.0, 1.0, 1.0), 0, 0.5, 0), mat: new THREE.MeshLambertMaterial({ map: stripeTexture('#c99b5f', '#a87b45', 6, false) }) }]; break;
    case 'minisneeuwpop': p = [
      { geo: T(new THREE.SphereGeometry(0.45, 10, 8), 0, 0.4, 0), mat: L('#ffffff') },
      { geo: T(new THREE.SphereGeometry(0.32, 10, 8), 0, 1.0, 0), mat: L('#ffffff') },
      { geo: (() => { const g = new THREE.ConeGeometry(0.05, 0.25, 6); g.rotateX(Math.PI / 2); return T(g, 0, 1.0, 0.33); })(), mat: L('#ff8c1a') },
      { geo: T(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 10), 0, 0.72, 0), mat: L('#ffffff'), tint: true },
    ]; break;
    case 'ski': p = [
      { geo: (() => { const g = new THREE.BoxGeometry(0.1, 1.7, 0.04); g.rotateZ(0.25); return T(g, -0.15, 0.85, 0); })(), mat: L('#ffffff'), tint: true },
      { geo: (() => { const g = new THREE.BoxGeometry(0.1, 1.7, 0.04); g.rotateZ(-0.25); return T(g, 0.15, 0.85, 0); })(), mat: L('#ffffff'), tint: true },
    ]; break;
    case 'wagenwiel': p = [{ geo: (() => { const g = new THREE.TorusGeometry(0.6, 0.06, 5, 12); return T(g, 0, 0.6, 0); })(), mat: L('#7a5230') }, { geo: T(new THREE.BoxGeometry(1.15, 0.05, 0.05), 0, 0.6, 0), mat: L('#7a5230') }, { geo: T(new THREE.BoxGeometry(0.05, 1.15, 0.05), 0, 0.6, 0), mat: L('#7a5230') }]; break;
    case 'steentje': p = [{ geo: T(new THREE.DodecahedronGeometry(0.5, 0), 0, 0.25, 0), mat: L('#ffffff'), tint: true }]; break;
    case 'melkbus': p = [
      { geo: T(new THREE.CylinderGeometry(0.3, 0.32, 0.7, 10), 0, 0.35, 0), mat: new THREE.MeshPhongMaterial({ color: '#d5dbe3', shininess: 80, flatShading: true }) },
      { geo: T(new THREE.CylinderGeometry(0.16, 0.3, 0.22, 10), 0, 0.81, 0), mat: new THREE.MeshPhongMaterial({ color: '#d5dbe3', shininess: 80, flatShading: true }) },
      { geo: T(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 10), 0, 0.96, 0), mat: L('#2f7de1') },
    ]; break;
    case 'schaap': p = [
      { geo: (() => { const g = new THREE.IcosahedronGeometry(0.55, 1); g.scale(1, 0.8, 1.3); return T(g, 0, 0.75, 0); })(), mat: L('#f4f1ea') },
      { geo: T(new THREE.SphereGeometry(0.22, 8, 6), 0, 0.85, 0.7), mat: L('#2a2a2a') },
      { geo: T(new THREE.BoxGeometry(0.6, 0.45, 0.9), 0, 0.22, 0), mat: L('#2a2a2a') },
    ]; break;
    case 'kristal': p = [{ geo: (() => { const g = new THREE.OctahedronGeometry(0.6, 0); g.scale(0.6, 1.4, 0.6); return T(g, 0, 0.9, 0); })(), mat: new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#4a3a8a', flatShading: true }), tint: true }]; break;
    case 'satelliet': p = [
      { geo: T(new THREE.BoxGeometry(0.6, 0.6, 0.6), 0, 2.5, 0), mat: L('#d9e2ec') },
      { geo: T(new THREE.BoxGeometry(2.2, 0.04, 0.7), 0, 2.5, 0), mat: L('#2f4f9e', { emissive: '#101a40' }) },
      { geo: T(new THREE.CylinderGeometry(0.02, 0.02, 2.5, 4), 0, 1.25, 0), mat: L('#888888') },
    ]; break;
    default: throw new Error('onbekend prototype ' + name);
  }
  PROTO[name] = p;
  return p;
}

// ---------- texturen ----------
function chevronTexture(dir) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#e63946'; g.fillRect(0, 0, 256, 128);
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 3; i++) {
    const x0 = 30 + i * 70;
    g.beginPath();
    if (dir > 0) { g.moveTo(x0, 14); g.lineTo(x0 + 34, 14); g.lineTo(x0 + 70, 64); g.lineTo(x0 + 34, 114); g.lineTo(x0, 114); g.lineTo(x0 + 36, 64); }
    else { g.moveTo(x0 + 70, 14); g.lineTo(x0 + 36, 14); g.lineTo(x0, 64); g.lineTo(x0 + 36, 114); g.lineTo(x0 + 70, 114); g.lineTo(x0 + 34, 64); }
    g.closePath(); g.fill();
  }
  g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.strokeRect(4, 4, 248, 120);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const BOARD_STYLES = [
  ['#2f7de1', '#ffffff', '#ffd23f'], ['#ff7a00', '#ffffff', '#2f7de1'], ['#ffd23f', '#22223b', '#e63946'],
  ['#3fbf6a', '#ffffff', '#ffd23f'], ['#ff5fa2', '#ffffff', '#22223b'], ['#7b6cff', '#ffffff', '#ffd23f'],
];

function boardTexture(text, style) {
  const [bg, fg, accent] = style;
  const c = document.createElement('canvas');
  c.width = 512; c.height = 192;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 192);
  g.fillStyle = accent; g.fillRect(0, 160, 512, 32); g.fillRect(0, 0, 512, 10);
  g.fillStyle = fg;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const lines = text.split('\n');
  let size = lines.length > 1 ? 52 : 66;
  g.font = `900 ${size}px system-ui, sans-serif`;
  while (Math.max(...lines.map((l) => g.measureText(l).width)) > 470 && size > 26) { size -= 2; g.font = `900 ${size}px system-ui, sans-serif`; }
  lines.forEach((l, i) => g.fillText(l, 256, 86 + (i - (lines.length - 1) / 2) * size * 1.05));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const BOARDS = {
  algemeen: ['DRINK\nKARNEMELK!', 'STROOPWAFELS\n2 HALEN 1 BETALEN', 'REMMEN IS\nVOOR WATJES', 'HUP MEKE!', 'GO NICOLE!', 'CHERSO\nFANCLUB', 'KEES\' KAASHANDEL', 'BIJNA BIJ\nDE FINISH? NEE.'],
  kust: ['VERSE HARING\n50 METER', 'ZONNEBRAND\nNIET VERGETEN'],
  pretpark: ['ACHTBAAN\nLINKSAF', 'SUIKERSPIN\nVOOR 1 MP'],
  stad: ['FIETSEN NIET\nTEGEN DIT BORD', 'TRAM HEEFT\nVOORRANG'],
  bos: ['PAS OP:\nOVERSTEKENDE EGELS', 'NIET IN DE\nPADDENSTOELEN!'],
  haven: ['CONTAINERS\nTE HUUR', 'DE KADE IS\nGEEN BAD'],
  sneeuw: ['GLAD!\n(ECHT WAAR)', 'WARME\nCHOCOMELK'],
  woestijn: ['LAATSTE TANKSTATION\n300 KM', 'CACTUS AAIEN\nOP EIGEN RISICO'],
  boerderij: ['VERSE KARNEMELK\nBIJ DE BOER', 'KOEIEN HEBBEN\nVOORRANG'],
  melkweg: ['MELKWEG:\nNOG 0,5 LICHTJAAR', 'MAANKAAS\nIN DE AANBIEDING'],
};

const BOARD_BACK_GEO = new THREE.BoxGeometry(6.5, 2.5, 0.1);
const BOARD_BACK_MAT = lambert('#5b616c');
const FLAG_COLORS = ['#e63946', '#ffd23f', '#2f7de1', '#3fbf6a', '#ff7a00', '#ff5fa2', '#ffffff'];
const SHIRTS = ['#e63946', '#2f7de1', '#ffd23f', '#3fbf6a', '#ff7a00', '#ff5fa2', '#7b6cff', '#ffffff', '#222831', '#3dd6d0'];

// ctx = { track, theme, deco, rand, dens, animated, placed }
export function addRoadside(ctx) {
  const { track, theme, deco, rand, dens, animated, placed } = ctx;
  const N = track.N;
  const pick = (list) => list[Math.floor(rand() * list.length)];
  // vrije plek? roadGap = minimale afstand tot de muur, r = ruimte voor andere spullen
  const offRoad = (x, z, roadGap) => Math.abs(track.locate(x, z).d) >= track.wallD + roadGap;
  const okSpot = (x, z, r, roadGap) => {
    if (!offRoad(x, z, roadGap)) return false;
    for (const p of placed) if ((p.x - x) ** 2 + (p.z - z) ** 2 < (p.r + r) ** 2) return false;
    return true;
  };
  const at = (i, side, dist) => ({ x: track.px[i] + track.nx[i] * side * dist, z: track.pz[i] + track.nz[i] * side * dist, h: track.heading[i] });
  const curvAt = (i) => track.curv[(i + N) % N];
  const straightness = (i, span) => {
    let m = 0;
    for (let k = -span; k <= span; k += 3) m = Math.max(m, Math.abs(curvAt(i + k)));
    return m;
  };

  // ---- bochten: pijlborden, bandenstapels en pionnen aan de buitenkant ----
  const chevR = [], chevL = [], posts = [], tyres = [], cones = [];
  let i = 0;
  while (i < N) {
    if (Math.abs(curvAt(i)) < 1 / 34) { i++; continue; }
    let j = i;
    let apex = i, maxC = 0;
    while (j < N && Math.abs(curvAt(j)) >= 1 / 40) { if (Math.abs(curvAt(j)) > maxC) { maxC = Math.abs(curvAt(j)); apex = j; } j++; }
    const outer = curvAt(apex) < 0 ? -1 : 1; // bocht naar rechts: buitenkant is links
    const dir = -outer; // pijl wijst de bocht in
    for (let k = -2; k <= 2; k++) {
      const idx = (apex + k * 7 + N) % N;
      const p = at(idx, outer, track.wallD + 0.9);
      if (!okSpot(p.x, p.z, 0.8, 0.5)) continue;
      placed.push({ x: p.x, z: p.z, r: 0.8 });
      const item = { x: p.x, y: 1.55, z: p.z, ry: p.h + Math.PI, s: 1.35 };
      (dir > 0 ? chevR : chevL).push(item);
      posts.push({ x: p.x, z: p.z, ry: p.h });
    }
    // bandenstapels net voor en na de apex
    for (const k of [-4, 4]) {
      const idx = (apex + k * 6 + N) % N;
      const p = at(idx, outer, track.wallD + 1.3);
      if (!okSpot(p.x, p.z, 0.7, 0.6)) continue;
      placed.push({ x: p.x, z: p.z, r: 0.7 });
      const col = pick(['#ffffff', '#e63946', '#ffd23f']);
      for (let h2 = 0; h2 < 3; h2++) tyres.push({ x: p.x, y: 0.17 + h2 * 0.32, z: p.z, ry: rand() * 3, color: col });
    }
    // pionnen aan de binnenkant
    for (const k of [-1, 1]) {
      const idx = (apex + k * 5 + N) % N;
      const p = at(idx, -outer, track.wallD + 0.6);
      if (!okSpot(p.x, p.z, 0.4, 0.3)) continue;
      placed.push({ x: p.x, z: p.z, r: 0.4 });
      cones.push({ x: p.x, z: p.z, ry: rand() * 3 });
    }
    i = j + 20;
  }
  const chevGeo = new THREE.PlaneGeometry(2.0, 1.0);
  instanced(deco, [{ geo: chevGeo, mat: new THREE.MeshBasicMaterial({ map: chevronTexture(1) }) }], chevR);
  instanced(deco, [{ geo: chevGeo, mat: new THREE.MeshBasicMaterial({ map: chevronTexture(-1) }) }], chevL);
  // achterkant van de pijlborden
  instanced(deco, [{ geo: new THREE.BoxGeometry(2.05, 1.05, 0.06), mat: lambert('#5b616c') }], [...chevR, ...chevL].map((c) => ({ ...c, x: c.x - Math.sin(c.ry) * 0.05, z: c.z - Math.cos(c.ry) * 0.05 })));
  instanced(deco, proto('chevronPaal'), posts.flatMap((p) => [{ ...p, x: p.x + Math.cos(p.ry) * 0.75, z: p.z - Math.sin(p.ry) * 0.75 }, { ...p, x: p.x - Math.cos(p.ry) * 0.75, z: p.z + Math.sin(p.ry) * 0.75 }]));
  instanced(deco, proto('band'), tyres);
  instanced(deco, proto('pion'), cones);

  // ---- tribunes met publiek (bij de start en op rechte stukken) ----
  const stands = [];
  const tryStand = (idx) => {
    const first = rand() < 0.5 ? -1 : 1;
    for (const sd of [first, -first]) {
      const p = at(idx, sd, track.wallD + 3.8);
      if (!okSpot(p.x, p.z, 6.8, 3.2)) continue;
      // ook de hoeken moeten naast de weg staan (geen tribune in een bocht)
      const tx = Math.sin(p.h), tz = Math.cos(p.h);
      const nx = track.nx[idx] * sd, nz = track.nz[idx] * sd;
      let ok = true;
      for (const a of [-6.3, 0, 6.3]) for (const b of [-2.2, 2.6]) {
        if (!offRoad(p.x + tx * a + nx * b, p.z + tz * a + nz * b, 0.8)) ok = false;
      }
      if (!ok) continue;
      placed.push({ x: p.x, z: p.z, r: 6.8 });
      stands.push({ x: p.x, z: p.z, ry: p.h + sd * Math.PI / 2 });
      return true;
    }
    return false;
  };
  // bij de startlijn
  for (const off of [-30, -45, 20, 40]) { if (tryStand((N + Math.round(off / track.step)) % N)) break; }
  let tries = 0;
  const want = Math.max(1, Math.round(2 * dens));
  while (stands.length < want + 1 && tries++ < 80) {
    const idx = Math.floor(rand() * N);
    if (straightness(idx, 12) < 1 / 70) tryStand(idx);
  }
  instanced(deco, proto('tribune'), stands);
  // publiek: drie rijen per tribune
  const fans = [];
  for (const st of stands) {
    const cos = Math.cos(st.ry), sin = Math.sin(st.ry);
    const rows = [[1.4, 0.6], [0, 1.2], [-1.4, 1.8]];
    for (const [dz, y] of rows) {
      for (let k = 0; k < 11; k++) {
        if (rand() < 0.15) continue;
        const lx = -5.2 + k * 1.04 + (rand() - 0.5) * 0.3;
        fans.push({
          x: st.x + cos * lx + sin * dz, y, z: st.z - sin * lx + cos * dz, ry: st.ry,
          color: pick(SHIRTS), base: y, phase: rand() * 6, s: 0.9 + rand() * 0.25,
        });
      }
    }
  }
  const fanMeshes = instanced(deco, proto('fan'), fans);
  if (fanMeshes.length) {
    let acc = 0;
    animated.push((t, dt) => {
      acc += dt || 0;
      if (acc < 1 / 30) return; // 30 keer per seconde is genoeg
      acc = 0;
      fans.forEach((f, n) => {
        f.y = f.base + Math.max(0, Math.sin(t * 7 + f.phase)) * 0.22;
        const m = compose(f);
        for (const im of fanMeshes) im.setMatrixAt(n, m);
      });
      for (const im of fanMeshes) im.instanceMatrix.needsUpdate = true;
    });
  }

  // ---- reclameborden ----
  const texts = [...(BOARDS[theme] || []), ...BOARDS.algemeen];
  const boards = [];
  tries = 0;
  const nBoards = Math.max(4, Math.round(7 * Math.min(1.2, dens)));
  while (boards.length < nBoards && tries++ < 300) {
    const idx = Math.floor(rand() * N);
    if (straightness(idx, 6) > 1 / 45) continue;
    const side = rand() < 0.5 ? -1 : 1;
    const p = at(idx, side, track.wallD + 4.6);
    if (!okSpot(p.x, p.z, 3.4, 3.0)) continue;
    if (boards.some((b) => Math.abs(b.idx - idx) < 40 || Math.abs(b.idx - idx) > N - 40)) continue;
    // kijkt naar wie aan komt rijden, iets naar de weg gedraaid
    const fx = -Math.sin(p.h), fz = -Math.cos(p.h);
    const rx = -track.nx[idx] * side, rz = -track.nz[idx] * side;
    const nx = fx + rx * 0.7, nz = fz + rz * 0.7;
    const ry = Math.atan2(nx, nz);
    // beide uiteinden van het bord naast de weg
    if (!offRoad(p.x + Math.cos(ry) * 3.3, p.z - Math.sin(ry) * 3.3, 0.6) || !offRoad(p.x - Math.cos(ry) * 3.3, p.z + Math.sin(ry) * 3.3, 0.6)) continue;
    placed.push({ x: p.x, z: p.z, r: 3.4 });
    boards.push({ x: p.x, z: p.z, ry, idx });
  }
  boards.forEach((b, n) => {
    const tex = boardTexture(texts[n % texts.length], BOARD_STYLES[n % BOARD_STYLES.length]);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.4), new THREE.MeshBasicMaterial({ map: tex }));
    m.position.set(b.x, 3.9, b.z);
    m.rotation.y = b.ry;
    deco.add(m);
    // achterkant: effen, zodat je geen gespiegelde tekst ziet
    const back = new THREE.Mesh(BOARD_BACK_GEO, BOARD_BACK_MAT);
    back.position.set(b.x - Math.sin(b.ry) * 0.06, 3.9, b.z - Math.cos(b.ry) * 0.06);
    back.rotation.y = b.ry;
    deco.add(back);
  });
  instanced(deco, proto('bordPaal'), boards.flatMap((b) => [-2.6, 2.6].map((o) => ({ x: b.x + Math.cos(b.ry) * o, z: b.z - Math.sin(b.ry) * o }))));

  // ---- vlaggen op rechte stukken ----
  const flags = [];
  for (let k = 0; k < N; k += Math.round(26 / track.step)) {
    if (straightness(k, 4) > 1 / 50) continue;
    const side = (k / 26) % 2 < 1 ? 1 : -1;
    const p = at(k, side, track.wallD + 0.7);
    if (!okSpot(p.x, p.z, 0.5, 0.4)) continue;
    placed.push({ x: p.x, z: p.z, r: 0.5 });
    flags.push({ x: p.x, z: p.z, ry: p.h + Math.PI / 2 + (rand() - 0.5) * 0.6, color: pick(FLAG_COLORS), base: p.h + Math.PI / 2, phase: rand() * 6 });
  }
  const flagMeshes = instanced(deco, proto('vlag'), flags);
  if (flagMeshes.length) {
    const flagMesh = flagMeshes[1];
    let acc = 0;
    animated.push((t, dt) => {
      acc += dt || 0;
      if (acc < 1 / 20) return;
      acc = 0;
      flags.forEach((f, n) => {
        f.ry = f.base + Math.sin(t * 2.2 + f.phase) * 0.35;
        flagMesh.setMatrixAt(n, compose(f));
      });
      flagMesh.instanceMatrix.needsUpdate = true;
    });
  }

  // ---- per baan: kleine dingen vlak langs de weg ----
  const close = (count, minD, maxD, r, extra = () => ({})) => {
    const out = [];
    for (let n = 0, t2 = 0; n < count && t2 < count * 14; t2++) {
      const idx = Math.floor(rand() * N);
      const side = rand() < 0.5 ? -1 : 1;
      const p = at(idx, side, track.wallD + minD + rand() * (maxD - minD));
      if (!okSpot(p.x, p.z, r, Math.max(0.3, minD - 0.2))) continue;
      placed.push({ x: p.x, z: p.z, r });
      out.push({ x: p.x, z: p.z, ry: p.h + (rand() - 0.5) * 0.8, ...extra(p) });
      n++;
    }
    return out;
  };
  const c = (n) => Math.round(n * dens);
  switch (theme) {
    case 'kust':
      instanced(deco, proto('surfplank'), close(c(22), 0.8, 4, 0.5, () => ({ rx: -0.25, color: pick(['#ff4b4b', '#ffd23f', '#3dd6d0', '#ff5fa2', '#ffffff']) })));
      instanced(deco, proto('strandbal'), close(c(14), 0.8, 5, 0.4));
      break;
    case 'pretpark':
      instanced(deco, proto('ijskar'), close(c(8), 1, 5, 1.0, () => ({ color: pick(['#ffffff', '#fff0f6', '#e6fbff']) })));
      instanced(deco, proto('ballonnen'), close(c(18), 0.8, 4, 0.5, () => ({ color: pick(['#ff4fa0', '#7b6cff', '#ff7a00']) })));
      break;
    case 'stad': {
      // fietsen in groepjes tegen het hek, typisch Nederlands
      const bikes = [];
      for (const base of close(c(9), 0.9, 1.6, 3.0)) {
        const n = 3 + Math.floor(rand() * 4);
        for (let k = 0; k < n; k++) {
          const o = (k - n / 2) * 0.55;
          bikes.push({ x: base.x + Math.sin(base.ry) * o, z: base.z + Math.cos(base.ry) * o, ry: base.ry + Math.PI / 2 + (rand() - 0.5) * 0.3, color: pick(['#222831', '#e63946', '#2f7de1', '#3fbf6a', '#ffffff', '#ff5fa2', '#ffd23f']) });
        }
      }
      instanced(deco, proto('fiets'), bikes);
      instanced(deco, proto('bankje'), close(c(10), 0.8, 2.5, 1.0));
      break;
    }
    case 'bos':
      instanced(deco, proto('varen'), close(c(50), 0.5, 5, 0.6, () => ({ color: pick(['#3a8a35', '#4b9c3e', '#2f7a35']), s: 0.7 + rand() * 0.6 })));
      instanced(deco, proto('paddo'), close(c(30), 0.5, 4, 0.3, () => ({ s: 0.8 + rand() * 1.2 })));
      break;
    case 'haven':
      instanced(deco, proto('meerpaal'), close(c(20), 0.6, 2, 0.5));
      instanced(deco, proto('vatje'), close(c(18), 0.7, 4, 0.5, () => ({ color: pick(['#ff7a00', '#2f7de1', '#e63946', '#3fbf6a']) })));
      instanced(deco, proto('kist'), close(c(14), 0.8, 4, 0.8, () => ({ ry: rand() * 3 })));
      break;
    case 'sneeuw':
      instanced(deco, proto('minisneeuwpop'), close(c(16), 0.8, 4, 0.6, () => ({ color: pick(['#e63946', '#2f7de1', '#3fbf6a', '#ffd23f']) })));
      instanced(deco, proto('ski'), close(c(14), 0.6, 3, 0.4, () => ({ color: pick(['#e63946', '#2f7de1', '#ffd23f', '#222831']) })));
      break;
    case 'woestijn':
      instanced(deco, proto('wagenwiel'), close(c(10), 0.6, 3, 0.7, () => ({ rx: -0.25 })));
      instanced(deco, proto('vatje'), close(c(10), 0.7, 3, 0.5, () => ({ color: '#a8552b' })));
      instanced(deco, proto('steentje'), close(c(30), 0.5, 5, 0.5, () => ({ color: pick(['#c97f4a', '#b8673a', '#d9a066']), s: 0.6 + rand() })));
      break;
    case 'boerderij':
      instanced(deco, proto('melkbus'), close(c(22), 0.6, 2.5, 0.4));
      instanced(deco, proto('schaap'), close(c(14), 2, 9, 1.0, () => ({ ry: rand() * 6 })));
      break;
    case 'melkweg':
      instanced(deco, proto('kristal'), close(c(26), 0.6, 5, 0.6, () => ({ color: pick(['#7cf8ff', '#ff7cf2', '#ffe14d', '#9b8cff']), s: 0.6 + rand() * 0.9, ry: rand() * 3 })));
      instanced(deco, proto('satelliet'), close(c(6), 2, 8, 1.2, () => ({ ry: rand() * 6 })));
      break;
    default: break;
  }
}
