// Kart + coureur + uiterlijkspullen, opgebouwd uit simpele vormen.
// Alle kartmodellen en coureurs zijn alleen uiterlijk: de botsingsvorm is voor iedereen gelijk.
import * as THREE from '../../vendor/three.module.min.js';
import { CHARACTER_BY_ID, DEFAULT_CHARACTER } from '../../shared/characters.js';
import { SHOP_BY_ID, DEFAULT_EQUIP } from '../../shared/shop.js';
import { cleanLook, lookScales } from '../../shared/look.js';
import { patternTexture, textSprite, shadowTexture, stripeTexture } from './textures.js';
import { smoothGeometry, metal, std, polish, pbr, Q } from './look.js';

const geo = {};
// vormen worden automatisch gladder gemaakt (ronde randen, meer segmenten)
function G(key, fn) { return geo[key] || (geo[key] = smoothGeometry(fn())); }
const matCache = new Map();
// (heette vroeger 'lambert'): nu een echt materiaal dat reageert op licht en schaduw
export function lambert(color, extra = {}) {
  const key = Q.mode + color + JSON.stringify(extra);
  if (!matCache.has(key)) matCache.set(key, pbr({ color, roughness: 0.62, metalness: 0, ...extra }));
  return matCache.get(key);
}

// Band met afgeronde schouders (as langs y, net als een cilinder van 1 bij 1)
function tyreGeometry() {
  const pts = [];
  const ri = 0.62, ro = 1, hw = 0.5, rr = 0.2;
  pts.push(new THREE.Vector2(ri, -hw));
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(ro - rr + Math.cos(a) * rr, -hw + rr + Math.sin(a) * rr)); }
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(ro - rr + Math.cos(a) * rr, hw - rr + Math.sin(a) * rr)); }
  pts.push(new THREE.Vector2(ri, hw));
  const g = new THREE.LatheGeometry(pts, 28);
  g.userData.smooth = true;
  return g;
}

function mesh(g, m, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  return o;
}

const R = 0.38; // straal van een hoofd

// ---------- mascottes (Kees, Bella, ...) ----------
// Geeft { head, hat (eigen hoed, kan verborgen worden), top (hoogte voor winkelhoeden) }
function buildMascotHead(ch) {
  const head = new THREE.Group();
  const hat = new THREE.Group();
  head.add(hat);
  const skin = lambert(ch.skin);
  const eyeW = lambert('#ffffff');
  const eyeB = lambert('#1b1b24');
  const addEyes = (z = 0.33, y = 0.06, spread = 0.13) => {
    for (const sx of [-1, 1]) {
      head.add(mesh(G('eye', () => new THREE.SphereGeometry(0.095, 10, 8)), eyeW, sx * spread, y, z - 0.03));
      head.add(mesh(G('pupil', () => new THREE.SphereGeometry(0.05, 8, 6)), eyeB, sx * spread, y, z + 0.04));
    }
  };
  let top = 0.4;
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
      top = 0.62;
      break;
    }
    case 'ruit': { // drop
      const d = mesh(G('drop', () => new THREE.OctahedronGeometry(0.45, 0)), lambert('#1d1d22', { emissive: '#111' }));
      d.scale.set(1, 1.1, 0.85);
      head.add(d);
      hat.add(mesh(G('strik', () => new THREE.ConeGeometry(0.12, 0.25, 4)), lambert(ch.accent), 0.22, 0.38, 0));
      addEyes(0.3, 0.08);
      top = 0.42;
      break;
    }
    case 'bal': {
      head.add(mesh(G('balHead', () => new THREE.IcosahedronGeometry(0.42, 1)), lambert('#9b5523')));
      hat.add(mesh(G('mosterd', () => new THREE.SphereGeometry(0.12, 8, 6)), lambert('#ffd23f'), 0.05, 0.4, 0));
      addEyes(0.36, 0.06);
      top = 0.4;
      break;
    }
    default: {
      head.add(mesh(G('head', () => new THREE.SphereGeometry(R, 14, 12)), skin));
      addEyes();
      head.add(mesh(G('mond', () => new THREE.BoxGeometry(0.16, 0.035, 0.04)), lambert('#7a2b2b'), 0, -0.13, 0.35));
    }
  }
  const acc = lambert(ch.accent);
  switch (ch.head) {
    case 'strohoed':
      hat.add(mesh(G('brim', () => new THREE.CylinderGeometry(0.62, 0.62, 0.05, 16)), lambert('#e9c46a'), 0, 0.3, 0));
      hat.add(mesh(G('crown', () => new THREE.CylinderGeometry(0.28, 0.34, 0.25, 12)), lambert('#e9c46a'), 0, 0.43, 0));
      hat.add(mesh(G('lint', () => new THREE.CylinderGeometry(0.345, 0.345, 0.07, 12)), lambert('#d93a3a'), 0, 0.35, 0));
      break;
    case 'friet':
      hat.add(mesh(G('frietzak', () => new THREE.CylinderGeometry(0.32, 0.2, 0.32, 10)), lambert('#e8423f'), 0, 0.44, 0));
      for (let i = 0; i < 7; i++) {
        const s = mesh(G('frietje', () => new THREE.BoxGeometry(0.06, 0.34, 0.06)), lambert('#ffd23f'), Math.cos(i * 0.9) * 0.15, 0.62, Math.sin(i * 0.9) * 0.15);
        s.rotation.z = Math.cos(i * 2.1) * 0.25; s.rotation.x = Math.sin(i * 1.7) * 0.25;
        hat.add(s);
      }
      break;
    case 'snavel': {
      const b = mesh(G('snavel', () => new THREE.ConeGeometry(0.11, 0.6, 8)), lambert('#ff8c1a'), 0, -0.05, 0.6);
      b.rotation.x = Math.PI / 2 + 0.2;
      head.add(b);
      hat.add(mesh(G('kuif', () => new THREE.ConeGeometry(0.08, 0.25, 6)), lambert('#1b1b24'), 0, 0.42, -0.1));
      break;
    }
    case 'wafel':
      hat.add(mesh(G('wafel', () => new THREE.CylinderGeometry(0.42, 0.42, 0.12, 18)), std({ map: patternTexture('wafel') }), 0, 0.38, 0));
      break;
    case 'molen': {
      hat.add(mesh(G('molenRomp', () => new THREE.CylinderGeometry(0.12, 0.2, 0.42, 8)), lambert('#7b5a3a'), 0, 0.52, 0));
      hat.add(mesh(G('molenKap', () => new THREE.ConeGeometry(0.16, 0.18, 8)), lambert('#3e8e41'), 0, 0.8, 0));
      const blades = new THREE.Group();
      blades.position.set(0, 0.62, 0.17);
      for (let i = 0; i < 4; i++) {
        const piv = new THREE.Group();
        piv.rotation.z = (i * Math.PI) / 2;
        piv.add(mesh(G('blad', () => new THREE.BoxGeometry(0.08, 0.42, 0.02)), lambert('#ffffff'), 0, 0.21, 0));
        blades.add(piv);
      }
      hat.add(blades);
      head.userData.blades = blades;
      break;
    }
    case 'tulp':
      hat.add(mesh(G('steel', () => new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6)), lambert('#3fa34d'), 0, 0.48, 0));
      for (let i = 0; i < 3; i++) {
        const p = mesh(G('petal', () => new THREE.SphereGeometry(0.14, 8, 8)), lambert('#ff4f9a'), Math.cos(i * 2.1) * 0.08, 0.7, Math.sin(i * 2.1) * 0.08);
        p.scale.set(0.8, 1.6, 0.8);
        p.rotation.z = Math.cos(i * 2.1) * 0.3;
        hat.add(p);
      }
      break;
    case 'kaas': {
      const k = mesh(G('kaas', () => new THREE.CylinderGeometry(0.42, 0.42, 0.3, 3)), std({ map: patternTexture('kaasgaten'), roughness: 0.7 }), 0, 0.46, 0);
      k.rotation.y = Math.PI;
      hat.add(k);
      break;
    }
    case 'pak': case 'ruit': case 'bal':
      break;
    default:
      hat.add(mesh(G('pet', () => new THREE.SphereGeometry(0.4, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2)), acc, 0, 0.12, 0));
  }
  return { head, hat, top };
}

// ---------- mensen (Meke, Meike, Stan, Melle, je eigen coureur, ...) ----------
function buildHumanHead(look) {
  const head = new THREE.Group();
  const hat = new THREE.Group(); // mensen hebben geen eigen hoed, alleen winkelhoeden
  head.add(hat);
  const { ws } = lookScales(look);
  const skin = lambert(look.skin);
  const hairM = lambert(look.hairColor);
  const face = mesh(G('head', () => new THREE.SphereGeometry(R, 14, 12)), skin);
  face.scale.x = 1 + (ws - 1) * 0.28;
  face.scale.z = 1 + (ws - 1) * 0.12;
  head.add(face);
  const fx = face.scale.x;
  // ogen, neus, mond
  const sunglasses = look.glasses === 'zonnebril';
  for (const sx of [-1, 1]) {
    if (!sunglasses) {
      head.add(mesh(G('eye', () => new THREE.SphereGeometry(0.095, 10, 8)), lambert('#ffffff'), sx * 0.13 * fx, 0.06, 0.3));
      head.add(mesh(G('pupil', () => new THREE.SphereGeometry(0.05, 8, 6)), lambert('#1b1b24'), sx * 0.13 * fx, 0.06, 0.37));
    }
    // oren
    head.add(mesh(G('oor', () => new THREE.SphereGeometry(0.08, 8, 6)), skin, sx * R * fx * 0.98, 0, 0));
  }
  head.add(mesh(G('neus', () => new THREE.SphereGeometry(0.06, 8, 6)), lambert(look.skin), 0, -0.03, R * (1 + (ws - 1) * 0.12) * 0.98));
  if (look.facial !== 'baard') head.add(mesh(G('mond', () => new THREE.BoxGeometry(0.16, 0.035, 0.04)), lambert('#7a2b2b'), 0, -0.15, 0.33));

  // haar
  const cap = () => {
    const c = mesh(G('haarkap', () => new THREE.SphereGeometry(R * 1.07, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42)), hairM);
    c.rotation.x = -0.32;
    c.scale.x = fx;
    head.add(c);
    return c;
  };
  let top = R + 0.03;
  switch (look.hair) {
    case 'kort': cap(); break;
    case 'stekels': {
      cap();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const sp = mesh(G('stekel', () => new THREE.ConeGeometry(0.07, 0.22, 5)), hairM, Math.cos(a) * 0.17 * fx, 0.36, Math.sin(a) * 0.17 - 0.04);
        sp.rotation.z = -Math.cos(a) * 0.5; sp.rotation.x = Math.sin(a) * 0.5;
        head.add(sp);
      }
      top = R + 0.1;
      break;
    }
    case 'lang': {
      cap();
      const back = mesh(G('langhaar', () => new THREE.BoxGeometry(R * 2, R * 2.3, R * 0.55)), hairM, 0, -R * 0.55, -R * 0.62);
      back.scale.x = fx;
      head.add(back);
      for (const sx of [-1, 1]) head.add(mesh(G('lok', () => new THREE.BoxGeometry(0.1, R * 1.7, 0.16)), hairM, sx * R * fx * 0.95, -R * 0.4, 0.05));
      break;
    }
    case 'staart': {
      cap();
      const t = mesh(G('staart', () => new THREE.SphereGeometry(0.13, 8, 8)), hairM, 0, -0.02, -R * 1.18);
      t.scale.set(0.9, 2.2, 0.9);
      t.rotation.x = 0.5;
      head.add(t);
      head.add(mesh(G('elastiek', () => new THREE.TorusGeometry(0.07, 0.025, 6, 10)), lambert('#ff5fa2'), 0, 0.12, -R * 1.02));
      break;
    }
    case 'knot': {
      cap();
      head.add(mesh(G('knot', () => new THREE.SphereGeometry(0.16, 10, 8)), hairM, 0, R * 1.02, -0.1));
      top = R + 0.12;
      break;
    }
    case 'krullen': {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const ring = i % 2 ? 0.75 : 0.45;
        const y = i % 2 ? 0.2 : 0.32;
        head.add(mesh(G('krul', () => new THREE.SphereGeometry(0.12, 8, 6)), hairM, Math.cos(a) * R * ring * fx, y, Math.sin(a) * R * ring - 0.05));
      }
      top = R + 0.1;
      break;
    }
    case 'stoppels': { // kaalgeschoren: alleen een waas van korte haartjes
      const mix = new THREE.Color(look.skin).lerp(new THREE.Color(look.hairColor), 0.6);
      const c = mesh(G('stoppelkap', () => new THREE.SphereGeometry(R * 1.012, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.46)), lambert('#' + mix.getHexString(), { roughness: 0.9 }));
      c.rotation.x = -0.3;
      c.scale.x = fx;
      head.add(c);
      top = R + 0.01;
      break;
    }
    case 'warrig': { // kort en warrig: plukjes alle kanten op
      cap();
      const tufts = [[0, 0.37, 0.06, 0.13], [0.15, 0.33, -0.02, 0.12], [-0.16, 0.32, 0.03, 0.12], [0.08, 0.34, -0.17, 0.12], [-0.11, 0.35, -0.13, 0.11], [0.2, 0.24, 0.17, 0.1], [-0.19, 0.26, 0.18, 0.1], [0.03, 0.29, 0.27, 0.11], [0.24, 0.12, -0.12, 0.09], [-0.24, 0.13, -0.1, 0.09]];
      for (const [x, y, z, r] of tufts) {
        const t = mesh(G('pluk', () => new THREE.SphereGeometry(1, 10, 8)), hairM, x * fx, y, z);
        t.scale.set(r * 1.25, r * 0.75, r * 1.05);
        t.rotation.set(z * 4, x * 3, x * 4);
        head.add(t);
      }
      top = R + 0.1;
      break;
    }
    case 'scheiding': { // middenscheiding: twee helften die naar de zijkant vallen
      for (const sx of [-1, 1]) {
        const half = mesh(G('scheidhelft', () => new THREE.SphereGeometry(R * 1.08, 16, 10, 0, Math.PI, 0, Math.PI * 0.52)), hairM, sx * 0.018, 0.01, 0);
        half.rotation.set(-0.28, sx > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
        half.scale.x = fx;
        head.add(half);
        const fringe = mesh(G('pony', () => new THREE.SphereGeometry(1, 12, 8)), hairM, sx * 0.17 * fx, 0.2, 0.25);
        fringe.scale.set(0.15, 0.08, 0.1);
        fringe.rotation.z = sx * 0.6;
        head.add(fringe);
        const side = mesh(G('zijlok', () => new THREE.BoxGeometry(0.09, 0.26, 0.2)), hairM, sx * R * fx * 0.97, 0.02, -0.02);
        head.add(side);
      }
      top = R + 0.05;
      break;
    }
    default: top = R; break; // kaal
  }
  // bril
  if (look.glasses === 'bril') {
    for (const sx of [-1, 1]) {
      const ring = mesh(G('brilglas', () => new THREE.TorusGeometry(0.1, 0.018, 6, 14)), lambert('#222222'), sx * 0.13 * fx, 0.06, 0.39);
      head.add(ring);
    }
    head.add(mesh(G('brug', () => new THREE.BoxGeometry(0.08, 0.02, 0.02)), lambert('#222222'), 0, 0.07, 0.4));
  } else if (sunglasses) {
    for (const sx of [-1, 1]) head.add(mesh(G('zonglas', () => new THREE.BoxGeometry(0.2, 0.12, 0.04)), lambert('#111111', { emissive: '#222' }), sx * 0.13 * fx, 0.06, 0.37));
    head.add(mesh(G('brug', () => new THREE.BoxGeometry(0.08, 0.02, 0.02)), lambert('#111111'), 0, 0.08, 0.39));
  }
  // snor of baard
  if (look.facial === 'snor') {
    for (const sx of [-1, 1]) {
      const m = mesh(G('snorhelft', () => new THREE.BoxGeometry(0.14, 0.05, 0.05)), hairM, sx * 0.065, -0.09, 0.36);
      m.rotation.z = sx * -0.25;
      head.add(m);
    }
  } else if (look.facial === 'baard') {
    const b = mesh(G('baard', () => new THREE.SphereGeometry(R * 1.04, 12, 8, Math.PI * 0.05, Math.PI * 0.9, Math.PI * 0.5, Math.PI * 0.42)), hairM, 0, -0.02, 0.02);
    b.scale.x = fx;
    head.add(b);
  }
  return { head, hat, top };
}

// een kleine duif (kan op het hoofd van een coureur zitten)
function buildDuif() {
  const g = new THREE.Group();
  const grey = lambert('#9aa5b1');
  const body = mesh(G('duifLijf', () => new THREE.SphereGeometry(0.15, 10, 8)), grey);
  body.scale.set(0.9, 0.8, 1.3);
  g.add(body);
  g.add(mesh(G('duifKop', () => new THREE.SphereGeometry(0.085, 8, 6)), lambert('#8b95a3'), 0, 0.12, 0.15));
  const beak = mesh(G('duifSnavel', () => new THREE.ConeGeometry(0.025, 0.08, 5)), lambert('#ff8c1a'), 0, 0.11, 0.25);
  beak.rotation.x = Math.PI / 2;
  g.add(beak);
  for (const sx of [-1, 1]) {
    g.add(mesh(G('duifOog', () => new THREE.SphereGeometry(0.018, 6, 4)), lambert('#111111'), sx * 0.05, 0.14, 0.21));
    const w = mesh(G('duifVleugel', () => new THREE.BoxGeometry(0.04, 0.12, 0.24)), lambert('#7d8796'), sx * 0.13, 0.02, -0.02);
    w.rotation.z = sx * 0.3;
    g.add(w);
  }
  g.add(mesh(G('duifNek', () => new THREE.SphereGeometry(0.07, 8, 6)), lambert('#6fbf8f'), 0, 0.06, 0.1));
  const tail = mesh(G('duifStaart', () => new THREE.BoxGeometry(0.14, 0.03, 0.16)), lambert('#7d8796'), 0, 0.02, -0.2);
  tail.rotation.x = -0.4;
  g.add(tail);
  return g;
}

// ---------- winkelhoeden ----------
function buildHat(kind) {
  const g = new THREE.Group();
  switch (kind) {
    case 'feestmuts': {
      g.add(mesh(G('muts', () => new THREE.ConeGeometry(0.2, 0.5, 12)), std({ map: stripeTexture('#ff5fa2', '#ffd23f', 6) }), 0, 0.22, 0));
      g.add(mesh(G('pompon', () => new THREE.SphereGeometry(0.07, 8, 6)), lambert('#ffffff'), 0, 0.48, 0));
      g.rotation.z = 0.15;
      break;
    }
    case 'pet': {
      const cap = mesh(G('petkap', () => new THREE.SphereGeometry(0.41, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2)), lambert('#e63946'), 0, -0.2, 0);
      g.add(cap);
      g.add(mesh(G('klep', () => new THREE.BoxGeometry(0.42, 0.04, 0.3)), lambert('#b02634'), 0, -0.08, -0.48));
      break;
    }
    case 'bloemen': {
      const cols = ['#ff5fa2', '#ffd23f', '#ffffff', '#ff7a00', '#7b6cff', '#3dd6d0'];
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        g.add(mesh(G('bloem', () => new THREE.SphereGeometry(0.07, 8, 6)), lambert(cols[i % cols.length]), Math.cos(a) * 0.3, -0.06, Math.sin(a) * 0.3));
      }
      break;
    }
    case 'koptelefoon': {
      const band = mesh(G('band', () => new THREE.TorusGeometry(0.42, 0.035, 6, 18, Math.PI)), lambert('#222222'), 0, -0.25, 0);
      g.add(band);
      for (const sx of [-1, 1]) {
        const cup = mesh(G('dop', () => new THREE.CylinderGeometry(0.12, 0.12, 0.1, 12)), lambert('#e63946'), sx * 0.42, -0.3, 0);
        cup.rotation.z = Math.PI / 2;
        g.add(cup);
      }
      break;
    }
    case 'kaas': {
      const k = mesh(G('kaashoed', () => new THREE.CylinderGeometry(0.34, 0.34, 0.22, 3)), std({ map: patternTexture('kaasgaten'), roughness: 0.7 }), 0, 0.08, 0);
      k.rotation.x = Math.PI / 2;
      k.rotation.z = Math.PI / 2;
      g.add(k);
      break;
    }
    case 'viking': {
      g.add(mesh(G('helm', () => new THREE.SphereGeometry(0.41, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2)), lambert('#9aa5b1'), 0, -0.2, 0));
      { const o = mesh(G('helmrand', () => new THREE.TorusGeometry(0.4, 0.04, 6, 18)), lambert('#c98a00'), 0, -0.18, 0); o.rotation.x = Math.PI / 2; g.add(o); }
      for (const sx of [-1, 1]) {
        const horn = mesh(G('hoorn', () => new THREE.ConeGeometry(0.07, 0.36, 8)), lambert('#fff3d6'), sx * 0.42, 0.02, 0);
        horn.rotation.z = -sx * 0.9;
        g.add(horn);
      }
      break;
    }
    case 'melkpak': {
      g.add(mesh(G('pakhoed', () => new THREE.BoxGeometry(0.34, 0.36, 0.34)), lambert('#ffffff'), 0, 0.14, 0));
      g.add(mesh(G('pakhoedband', () => new THREE.BoxGeometry(0.35, 0.08, 0.35)), lambert('#2f7de1'), 0, 0.06, 0));
      const roof = mesh(G('pakhoeddak', () => new THREE.CylinderGeometry(0.2, 0.2, 0.34, 3)), lambert('#eef4ff'), 0, 0.37, 0);
      roof.rotation.z = Math.PI / 2; roof.rotation.x = -Math.PI / 2; roof.scale.set(1, 1, 0.5);
      g.add(roof);
      break;
    }
    case 'kroon': {
      const gold = metal({ color: '#ffcf33', roughness: 0.22, emissive: '#2a1e00' });
      g.add(mesh(G('kroonring', () => new THREE.CylinderGeometry(0.26, 0.26, 0.12, 14, 1, true)), gold, 0, 0.02, 0));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.add(mesh(G('kroonpunt', () => new THREE.ConeGeometry(0.06, 0.16, 5)), gold, Math.cos(a) * 0.25, 0.14, Math.sin(a) * 0.25));
      }
      g.add(mesh(G('kroonsteen', () => new THREE.SphereGeometry(0.04, 6, 6)), lambert('#e63946', { emissive: '#400' }), 0, 0.03, 0.26));
      break;
    }
    default: break;
  }
  return g;
}

// ---------- kartmodellen ----------
// Elk model tekent zijn eigen vorm en geeft terug waar wielen, uitlaten, stuur en coureur zitten.
const STD_WHEELS = [[-0.82, 0.32, 0.82, 0.32, true], [0.82, 0.32, 0.82, 0.32, true], [-0.82, 0.35, -0.78, 0.35, false], [0.82, 0.35, -0.78, 0.35, false]];

const MODELS = {
  standaard(b, M) {
    b.add(mesh(G('chassis', () => new THREE.BoxGeometry(1.36, 0.3, 2.1)), M.paint, 0, 0.42, 0));
    const nose = mesh(G('nose', () => new THREE.CylinderGeometry(0.3, 0.68, 0.7, 4, 1)), M.paint, 0, 0.42, 1.25);
    nose.rotation.x = Math.PI / 2; nose.rotation.y = Math.PI / 4; nose.scale.set(1.15, 1, 0.42);
    b.add(nose);
    b.add(mesh(G('bumper', () => new THREE.BoxGeometry(1.5, 0.16, 0.18)), M.dark, 0, 0.3, 1.55));
    for (const sx of [-1, 1]) b.add(mesh(G('pod', () => new THREE.BoxGeometry(0.28, 0.26, 1.2)), M.dark, sx * 0.8, 0.36, 0.05));
    b.add(mesh(G('seat', () => new THREE.BoxGeometry(0.7, 0.55, 0.22)), M.dark, 0, 0.78, -0.55));
    b.add(mesh(G('engine', () => new THREE.BoxGeometry(0.9, 0.36, 0.5)), M.metal, 0, 0.62, -0.9));
    for (const sx of [-0.28, 0.28]) {
      const p = mesh(G('pipe', () => new THREE.CylinderGeometry(0.09, 0.11, 0.42, 8)), M.metal, sx, 0.62, -1.25);
      p.rotation.x = Math.PI / 2 - 0.3;
      b.add(p);
    }
    b.add(mesh(G('spoiler', () => new THREE.BoxGeometry(1.4, 0.06, 0.34)), M.paint, 0, 1.05, -1.12));
    for (const sx of [-0.45, 0.45]) b.add(mesh(G('strut', () => new THREE.BoxGeometry(0.05, 0.36, 0.05)), M.dark, sx, 0.86, -1.1));
    return { wheels: STD_WHEELS, exhausts: [[-0.28, 0.7, -1.62], [0.28, 0.7, -1.62]], steer: [0, 0.88, 0.32], driver: [0, -0.25] };
  },

  bakfiets(b, M) {
    const wood = lambert('#c99b5f');
    b.add(mesh(G('bak', () => new THREE.BoxGeometry(1.25, 0.55, 0.95)), wood, 0, 0.62, 0.85));
    b.add(mesh(G('bakrand', () => new THREE.BoxGeometry(1.3, 0.08, 1.0)), M.paint, 0, 0.92, 0.85));
    for (let i = 0; i < 3; i++) {
      b.add(mesh(G('fles', () => new THREE.CylinderGeometry(0.09, 0.09, 0.32, 8)), lambert('#ffffff'), -0.3 + i * 0.3, 1.0, 0.85));
      b.add(mesh(G('flesdop', () => new THREE.CylinderGeometry(0.06, 0.06, 0.06, 8)), lambert('#2f7de1'), -0.3 + i * 0.3, 1.19, 0.85));
    }
    b.add(mesh(G('frame', () => new THREE.BoxGeometry(0.14, 0.14, 1.5)), M.paint, 0, 0.45, -0.35));
    b.add(mesh(G('zadelpaal', () => new THREE.BoxGeometry(0.1, 0.45, 0.1)), M.paint, 0, 0.62, -0.55));
    b.add(mesh(G('zadel', () => new THREE.BoxGeometry(0.42, 0.1, 0.4)), M.dark, 0, 0.86, -0.55));
    { const o = mesh(G('spatbord', () => new THREE.TorusGeometry(0.46, 0.05, 6, 14, Math.PI)), M.paint, 0, 0.42, -0.95); o.rotation.y = Math.PI / 2; b.add(o); }
    return {
      wheels: [[-0.55, 0.26, 0.85, 0.26, true, 0.14], [0.55, 0.26, 0.85, 0.26, true, 0.14], [0, 0.42, -0.95, 0.42, false, 0.12]],
      exhausts: [[-0.2, 0.45, -1.35], [0.2, 0.45, -1.35]], steer: [0, 1.02, 0.28], steerBar: true, driver: [0, -0.35],
    };
  },

  roze(b, M) {
    const body = mesh(G('rozelijf', () => new THREE.SphereGeometry(1, 18, 12)), M.paint, 0, 0.52, 0.05);
    body.scale.set(0.8, 0.34, 1.3);
    b.add(body);
    const fluff = mesh(G('pluis', () => new THREE.TorusGeometry(0.6, 0.09, 8, 22)), lambert('#ffffff'), 0, 0.8, -0.3);
    fluff.rotation.x = Math.PI / 2;
    b.add(fluff);
    const heart = new THREE.Group();
    const red = lambert('#ff2f7a');
    for (const sx of [-1, 1]) heart.add(mesh(G('hartbol', () => new THREE.SphereGeometry(0.13, 10, 8)), red, sx * 0.1, 0.06, 0));
    const tip = mesh(G('hartpunt', () => new THREE.ConeGeometry(0.19, 0.26, 10)), red, 0, -0.1, 0);
    tip.rotation.x = Math.PI;
    heart.add(tip);
    heart.position.set(0, 1.12, -1.1);
    b.add(heart);
    for (const sx of [-1, 1]) {
      b.add(mesh(G('hartlamp', () => new THREE.SphereGeometry(0.09, 8, 6)), lambert('#ffffff', { emissive: '#ffb3d9' }), sx * 0.35, 0.6, 1.24));
      b.add(mesh(G('stang', () => new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6)), lambert('#ffffff'), sx * 0.12, 0.92, -1.1));
    }
    return { wheels: [[-0.72, 0.3, 0.78, 0.3, true], [0.72, 0.3, 0.78, 0.3, true], [-0.72, 0.32, -0.78, 0.32, false], [0.72, 0.32, -0.78, 0.32, false]], exhausts: [[-0.25, 0.5, -1.38], [0.25, 0.5, -1.38]], steer: [0, 0.9, 0.35], driver: [0, -0.25] };
  },

  tractor(b, M) {
    b.add(mesh(G('motorkap', () => new THREE.BoxGeometry(0.75, 0.6, 1.0)), M.paint, 0, 0.75, 0.75));
    b.add(mesh(G('grille', () => new THREE.BoxGeometry(0.66, 0.5, 0.06)), M.dark, 0, 0.74, 1.27));
    for (const sx of [-1, 1]) b.add(mesh(G('koplamp', () => new THREE.SphereGeometry(0.08, 8, 6)), lambert('#fff6c0', { emissive: '#665c22' }), sx * 0.26, 0.9, 1.28));
    b.add(mesh(G('trekker', () => new THREE.BoxGeometry(1.0, 0.35, 0.95)), M.paint, 0, 0.62, -0.35));
    b.add(mesh(G('trekstoel', () => new THREE.BoxGeometry(0.62, 0.5, 0.16)), M.dark, 0, 1.0, -0.62));
    for (const sx of [-1, 1]) {
      const f = mesh(G('spatbordT', () => new THREE.CylinderGeometry(0.62, 0.62, 0.38, 12, 1, true, -Math.PI / 2, Math.PI)), M.paint, sx * 0.78, 0.6, -0.5);
      f.rotation.z = Math.PI / 2;
      f.material = M.paint;
      b.add(f);
    }
    b.add(mesh(G('schoorsteen', () => new THREE.CylinderGeometry(0.06, 0.07, 0.6, 8)), M.dark, 0.24, 1.35, 0.95));
    return {
      wheels: [[-0.58, 0.3, 0.95, 0.3, true, 0.22], [0.58, 0.3, 0.95, 0.3, true, 0.22], [-0.8, 0.55, -0.5, 0.55, false, 0.34], [0.8, 0.55, -0.5, 0.55, false, 0.34]],
      exhausts: [[0.24, 1.72, 0.95, 'op']], steer: [0, 1.08, 0.12], driver: [0.12, -0.42],
    };
  },

  melkwagen(b, M) {
    b.add(mesh(G('cabine', () => new THREE.BoxGeometry(1.3, 0.55, 0.75)), M.paint, 0, 0.62, 0.85));
    b.add(mesh(G('voorruit', () => new THREE.BoxGeometry(1.2, 0.45, 0.05)), lambert('#bfe9ff', { transparent: true, opacity: 0.6 }), 0, 1.12, 1.15));
    for (const sx of [-1, 1]) b.add(mesh(G('ruitstijl', () => new THREE.BoxGeometry(0.06, 0.5, 0.06)), M.dark, sx * 0.6, 1.12, 1.15));
    b.add(mesh(G('laadvloer', () => new THREE.BoxGeometry(1.34, 0.14, 1.45)), lambert('#ffffff'), 0, 0.42, -0.45));
    b.add(mesh(G('wagenstoel', () => new THREE.BoxGeometry(0.62, 0.48, 0.16)), M.dark, 0, 0.72, -0.32));
    const crate = lambert('#2f7de1');
    for (const sx of [-1, 1]) {
      b.add(mesh(G('krat', () => new THREE.BoxGeometry(0.5, 0.32, 0.5)), crate, sx * 0.36, 0.65, -0.92));
      for (let i = 0; i < 4; i++) {
        b.add(mesh(G('melkfles', () => new THREE.CylinderGeometry(0.07, 0.08, 0.3, 8)), lambert('#ffffff'), sx * 0.36 + (i % 2 ? 0.11 : -0.11), 0.92, -0.92 + (i < 2 ? 0.11 : -0.11)));
      }
    }
    b.add(mesh(G('melkbord', () => new THREE.BoxGeometry(1.2, 0.26, 0.05)), lambert('#ffffff'), 0, 0.98, 0.5));
    return { wheels: STD_WHEELS, exhausts: [[-0.4, 0.4, -1.25], [0.4, 0.4, -1.25]], steer: [0, 0.98, 0.42], driver: [0, -0.1] };
  },

  badkuip(b, M) {
    const tub = mesh(G('kuip', () => new THREE.CapsuleGeometry(0.55, 1.0, 4, 14)), M.paint, 0, 0.55, 0);
    tub.rotation.x = Math.PI / 2;
    tub.scale.set(1.12, 1, 0.62);
    b.add(tub);
    b.add(mesh(G('badwater', () => new THREE.BoxGeometry(0.95, 0.04, 1.6)), lambert('#6cc4ff', { transparent: true, opacity: 0.85 }), 0, 0.86, 0));
    for (let i = 0; i < 6; i++) b.add(mesh(G('bubbel', () => new THREE.SphereGeometry(0.09, 8, 6)), lambert('#ffffff'), Math.cos(i * 2.4) * 0.35, 0.9, Math.sin(i * 1.7) * 0.6));
    const tap = mesh(G('kraan', () => new THREE.TorusGeometry(0.16, 0.035, 6, 10, Math.PI)), M.metal, 0, 1.0, -0.95);
    tap.rotation.y = Math.PI / 2;
    b.add(tap);
    const duck = new THREE.Group();
    duck.add(mesh(G('eendlijf', () => new THREE.SphereGeometry(0.14, 10, 8)), lambert('#ffd23f')));
    duck.add(mesh(G('eendkop', () => new THREE.SphereGeometry(0.09, 8, 6)), lambert('#ffd23f'), 0, 0.14, 0.06));
    const beak = mesh(G('eendbek', () => new THREE.ConeGeometry(0.04, 0.1, 6)), lambert('#ff8c1a'), 0, 0.13, 0.17);
    beak.rotation.x = Math.PI / 2;
    duck.add(beak);
    duck.position.set(0, 0.98, 1.0);
    b.add(duck);
    return { wheels: STD_WHEELS.map(([x, y, z, r, f]) => [x * 0.85, y, z, r * 0.85, f, 0.22]), exhausts: [[-0.2, 0.5, -1.25], [0.2, 0.5, -1.25]], steer: [0, 0.98, 0.45], driver: [0, -0.2], gold: true };
  },

  klomp(b, M) {
    const body = mesh(G('klomplijf', () => new THREE.SphereGeometry(1, 18, 12)), M.paint, 0, 0.55, 0.2);
    body.scale.set(0.72, 0.42, 1.38);
    b.add(body);
    const toe = mesh(G('klompneus', () => new THREE.SphereGeometry(0.3, 10, 8)), M.paint, 0, 0.72, 1.35);
    toe.scale.set(0.9, 0.7, 1);
    b.add(toe);
    const hole = mesh(G('klompgat', () => new THREE.CylinderGeometry(0.46, 0.46, 0.05, 18)), lambert('#5a3a22'), 0, 0.93, -0.35);
    hole.scale.set(1, 1, 1.3);
    b.add(hole);
    // geschilderde tulp op de zijkant
    for (const sx of [-1, 1]) {
      b.add(mesh(G('tulpje', () => new THREE.SphereGeometry(0.08, 8, 6)), lambert('#e63946'), sx * 0.68, 0.62, 0.55));
      b.add(mesh(G('tulpsteel', () => new THREE.BoxGeometry(0.02, 0.18, 0.02)), lambert('#3fa34d'), sx * 0.69, 0.5, 0.55));
    }
    return { wheels: STD_WHEELS.map(([x, y, z, r, f]) => [x * 0.95, y, z, r, f]), exhausts: [[-0.22, 0.55, -1.3], [0.22, 0.55, -1.3]], steer: [0, 0.98, 0.3], driver: [0, -0.3] };
  },

  monster(b, M) {
    b.add(mesh(G('monsterbak', () => new THREE.BoxGeometry(1.35, 0.42, 2.0)), M.paint, 0, 1.15, 0));
    b.add(mesh(G('monsterneus', () => new THREE.BoxGeometry(1.3, 0.3, 0.4)), M.paint, 0, 1.1, 1.1));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const v = mesh(G('veer', () => new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6)), M.metal, sx * 0.5, 0.8, sz * 0.8);
      v.rotation.z = sx * 0.6;
      b.add(v);
    }
    const cage = mesh(G('rolkooi', () => new THREE.TorusGeometry(0.62, 0.05, 6, 14, Math.PI)), M.dark, 0, 1.38, -0.55);
    b.add(cage);
    b.add(mesh(G('monsterstoel', () => new THREE.BoxGeometry(0.66, 0.55, 0.18)), M.dark, 0, 1.6, -0.55));
    for (const sx of [-1, 1]) b.add(mesh(G('monsterlamp', () => new THREE.BoxGeometry(0.22, 0.1, 0.05)), lambert('#fff6c0', { emissive: '#665c22' }), sx * 0.4, 1.18, 1.31));
    return {
      wheels: [[-0.88, 0.6, 0.85, 0.6, true, 0.45], [0.88, 0.6, 0.85, 0.6, true, 0.45], [-0.88, 0.6, -0.85, 0.6, false, 0.45], [0.88, 0.6, -0.85, 0.6, false, 0.45]],
      exhausts: [[-0.35, 1.3, -1.2], [0.35, 1.3, -1.2]], steer: [0, 1.75, 0.32], driver: [0.82, -0.25],
    };
  },

  raket(b, M) {
    const hull = mesh(G('romp', () => new THREE.CylinderGeometry(0.5, 0.5, 1.9, 16)), M.paint, 0, 0.62, -0.05);
    hull.rotation.x = Math.PI / 2;
    b.add(hull);
    const nose = mesh(G('raketneus', () => new THREE.ConeGeometry(0.5, 0.8, 16)), lambert('#e63946'), 0, 0.62, 1.3);
    nose.rotation.x = Math.PI / 2;
    b.add(nose);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
      const fin = mesh(G('vin', () => new THREE.BoxGeometry(0.05, 0.5, 0.55)), lambert('#e63946'), Math.cos(a) * 0.55, 0.62 + Math.sin(a) * 0.55, -0.85);
      fin.rotation.z = a - Math.PI / 2;
      b.add(fin);
    }
    { const o = mesh(G('straalpijp', () => new THREE.CylinderGeometry(0.3, 0.38, 0.25, 14)), M.metal, 0, 0.62, -1.08); o.rotation.x = Math.PI / 2; b.add(o); }
    { const o = mesh(G('patrijspoort', () => new THREE.TorusGeometry(0.14, 0.03, 6, 12)), M.metal, 0.5, 0.62, 0.5); o.rotation.y = Math.PI / 2; b.add(o); }
    return { wheels: STD_WHEELS.map(([x, y, z, r, f]) => [x * 0.9, y * 0.85, z, r * 0.85, f, 0.2]), exhausts: [[0, 0.62, -1.45]], flame: 2.2, steer: [0, 1.15, 0.35], driver: [0.12, -0.25] };
  },
};

// ---------- de kart ----------
export class KartView {
  static realShadows = true; // echte schaduwen (uit bij lage kwaliteit)

  constructor({ character = DEFAULT_CHARACTER, cosmetics = DEFAULT_EQUIP, look = null, name = '', showName = false, nameColor = '#ffffff' } = {}) {
    this.group = new THREE.Group();
    this.body = new THREE.Group();
    this.group.add(this.body);
    this.t = Math.random() * 10;
    this.wheelSpin = 0;
    this.spinAngle = 0;
    this.poseT = 0;
    this.character = null;
    this.charKey = '';
    this.cos = { ...DEFAULT_EQUIP };
    this.model = null;
    this.driverBase = { y: 0, z: -0.25 };

    const sh = new THREE.Mesh(G('shadow', () => new THREE.PlaneGeometry(2.6, 3.2)), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.04;
    sh.renderOrder = 1;
    this.group.add(sh);
    this.blob = sh; // zachte contactschaduw onder de kart

    // glimmende autolak, chroom en matte kunststof
    this.paint = pbr({ color: '#3a8ef6', roughness: 0.3, metalness: 0.15 });
    this.rimMat = metal({ color: '#d0d4da', roughness: 0.25 });
    this.M = { paint: this.paint, dark: lambert('#2b2d36', { roughness: 0.75 }), metal: metal({ color: '#c5ccd6' }) };
    this.flameMat = new THREE.MeshBasicMaterial({ color: '#ff9a1f', transparent: true, opacity: 0.85 });
    this.chassis = new THREE.Group();
    this.body.add(this.chassis);

    this.driver = new THREE.Group();
    this.body.add(this.driver);
    const capeGeo = new THREE.PlaneGeometry(0.92, 1.05, 6, 8);
    capeGeo.translate(0, -0.525, 0);
    this.capeBase = Float32Array.from(capeGeo.attributes.position.array);
    this.capeMat = std({ color: '#d62828', side: THREE.DoubleSide, roughness: 0.8 });
    this.cape = new THREE.Mesh(capeGeo, this.capeMat);
    this.cape.position.set(0, 1.18, -0.2);
    this.cape.visible = false;
    this.driver.add(this.cape);

    this.shield = new THREE.Mesh(G('shield', () => new THREE.IcosahedronGeometry(1.9, 2)), new THREE.MeshBasicMaterial({ map: patternTexture('kaasgaten'), transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
    this.shield.position.y = 0.8;
    this.shield.visible = false;
    this.group.add(this.shield);

    this.glass = mesh(G('glas', () => new THREE.CylinderGeometry(0.09, 0.07, 0.24, 10)), lambert('#ffffff', { emissive: '#666' }));
    this.glass.visible = false;

    this.buildModel('standaard');
    this.setCharacter(character, look);
    this.setCosmetics(cosmetics);
    if (name && showName) this.setName(name, nameColor);
  }

  setName(name, color = '#ffffff') {
    if (this.tag) { this.group.remove(this.tag); this.tag.material.map.dispose(); this.tag.material.dispose(); }
    this.tag = textSprite(name, { size: 36, color, scale: 0.016, bg: 'rgba(20,20,40,0.55)', stroke: null, pad: 10 });
    this.tag.userData.base = this.tag.scale.clone();
    this.group.add(this.tag);
    this.placeTag();
  }

  placeTag() {
    if (this.tag) this.tag.position.set(0, 2.55 + this.driverBase.y + (this.figureTop || 1.9) - 1.9, 0);
  }

  buildModel(name) {
    const make = MODELS[name] || MODELS.standaard;
    if (this.model === name) return;
    this.model = name;
    for (const c of [...this.chassis.children]) this.chassis.remove(c);
    const spec = make(this.chassis, this.M);
    this.spec = spec;
    // wielen
    const tyre = lambert('#1d1f24', { roughness: 0.92 });
    this.wheels = spec.wheels.map(([x, y, z, r, front, w = 0.3]) => {
      const steerG = new THREE.Group();
      steerG.position.set(x, y, z);
      const spinG = new THREE.Group();
      const t = mesh(G('tyreR', tyreGeometry), tyre);
      t.rotation.z = Math.PI / 2;
      t.scale.set(r, w, r);
      spinG.add(t);
      const rim = mesh(G('rimR', () => new THREE.CylinderGeometry(1, 1, 1, 20)), spec.gold ? metal({ color: '#ffcf33', roughness: 0.25 }) : this.rimMat);
      rim.rotation.z = Math.PI / 2;
      rim.scale.set(r * 0.62, w * 0.86, r * 0.62);
      spinG.add(rim);
      // spaken, zodat je de wielen ziet draaien
      for (let sp = 0; sp < 3; sp++) {
        const bar = mesh(G('spaak', () => new THREE.BoxGeometry(1, 1, 1)), this.M.dark);
        bar.scale.set(w * 0.9 + 0.04, r * 0.16, r * 1.1);
        bar.rotation.x = (sp / 3) * Math.PI;
        spinG.add(bar);
      }
      steerG.add(spinG);
      this.chassis.add(steerG);
      return { steerG, spinG, front, r };
    });
    // uitlaatvlammen voor turbo
    this.exhausts = spec.exhausts.map(([x, y, z, dir]) => {
      const f = mesh(G('flame', () => new THREE.ConeGeometry(0.13, 0.7, 8)), this.flameMat, x, y, z);
      if (dir === 'op') f.rotation.x = 0;
      else f.rotation.x = -Math.PI / 2 - 0.3;
      if (spec.flame) f.scale.setScalar(spec.flame);
      f.userData.base = spec.flame || 1;
      f.visible = false;
      this.chassis.add(f);
      return f;
    });
    // stuur
    const [sx, sy, sz] = spec.steer;
    if (spec.steerBar) {
      this.steeringWheel = mesh(G('stuurstang', () => new THREE.BoxGeometry(0.7, 0.05, 0.05)), this.M.dark, sx, sy, sz);
    } else {
      this.steeringWheel = mesh(G('stuur', () => new THREE.TorusGeometry(0.18, 0.035, 6, 14)), this.M.dark, sx, sy, sz);
      this.steeringWheel.rotation.x = -0.9;
    }
    this.steerBar = !!spec.steerBar;
    this.chassis.add(this.steeringWheel);
    this.driverBase = { y: spec.driver[0], z: spec.driver[1] };
    this.placeDriver();
    this.placeTag();
  }

  placeDriver() {
    const extraBack = this.figure ? Math.max(0, this.figure.ws - 1) * 0.25 : 0;
    this.driver.position.set(0, this.driverBase.y, this.driverBase.z - extraBack);
  }

  setCharacter(id, look) {
    const ch = CHARACTER_BY_ID[id] || CHARACTER_BY_ID[DEFAULT_CHARACTER];
    const fullLook = ch.head === 'mens' ? (ch.custom ? cleanLook(look) : { ...cleanLook(ch.look), ...ch.look }) : null;
    const key = ch.id + JSON.stringify(fullLook || {});
    if (this.charKey === key) return;
    this.charKey = key;
    this.character = ch;
    this.look = fullLook;
    const d = this.driver;
    for (const part of [this.torsoG, this.head, this.armL, this.armR, this.duif]) if (part && part.parent) part.parent.remove(part);
    this.duif = null;

    const isHuman = !!fullLook;
    const { hs, ws } = isHuman ? lookScales(fullLook) : { hs: 1, ws: 1 };
    this.figure = { hs, ws };
    const shirt = isHuman ? fullLook.shirt : ch.body;
    const torsoH = 0.62 * hs;
    const torsoTop = 0.67 + torsoH;
    this.torsoG = new THREE.Group();
    const torso = mesh(G('torso', () => new THREE.CylinderGeometry(0.3, 0.36, 0.62, 10)), lambert(shirt), 0, 0.67 + torsoH / 2, 0);
    torso.scale.set(ws, hs, ws * (ws > 1 ? 0.92 : 1));
    this.torsoG.add(torso);
    if (ws > 1.15) {
      // buik
      const belly = mesh(G('buik', () => new THREE.SphereGeometry(0.36, 12, 10)), lambert(shirt), 0, 0.67 + torsoH * 0.38, 0.06 * ws);
      belly.scale.set(ws * 0.92, hs * 0.85, ws * 0.8);
      this.torsoG.add(belly);
    }
    let neck = 0;
    if (hs > 1.1) {
      neck = (hs - 1) * 0.3;
      const n = mesh(G('nek', () => new THREE.CylinderGeometry(0.1, 0.12, 1, 8)), lambert(isHuman ? fullLook.skin : ch.skin), 0, torsoTop + neck / 2, 0);
      n.scale.y = neck + 0.05;
      this.torsoG.add(n);
    }
    d.add(this.torsoG);

    const hd = isHuman ? buildHumanHead(fullLook) : buildMascotHead(ch);
    this.head = hd.head;
    this.ownHat = hd.hat;
    this.headTop = hd.top;
    const headY = torsoTop + neck + 0.33;
    this.head.position.set(0, headY, 0.02);
    d.add(this.head);
    this.figureTop = headY + hd.top;

    const armMat = lambert(shirt);
    const handMat = lambert(isHuman ? fullLook.skin : ch.head === 'ruit' ? '#1d1d22' : ch.skin);
    const shoulderY = torsoTop - 0.1;
    const mkArm = (sx) => {
      const piv = new THREE.Group();
      piv.position.set(sx * (0.3 * ws + 0.04), shoulderY, 0.02);
      const arm = mesh(G('arm', () => new THREE.CylinderGeometry(0.075, 0.075, 0.55, 6)), armMat, 0, -0.27, 0);
      arm.scale.set(Math.max(1, ws * 0.8), 1, Math.max(1, ws * 0.8));
      piv.add(arm);
      piv.add(mesh(G('hand', () => new THREE.SphereGeometry(0.1, 8, 6)), handMat, 0, -0.56, 0));
      return piv;
    };
    this.armL = mkArm(-1);
    this.armR = mkArm(1);
    this.armZ = 0.15 + Math.max(0, ws - 1) * 0.25;
    d.add(this.armL, this.armR);
    if (ch.armor) this.addArmor(ch, { ws, torsoH, torsoTop, shoulderY, human: isHuman, closed: !!(fullLook && fullLook.helm) });
    // cape tussen de schouders
    this.cape.position.set(0, shoulderY + 0.05, -0.3 * ws + 0.08);
    this.cape.scale.set(Math.max(1, ws * 0.95), hs, 1);
    if (fullLook && fullLook.duif) {
      this.duif = buildDuif();
      d.add(this.duif);
    }
    this.shoulder = { y: shoulderY, x: 0.3 * ws + 0.04 };
    this.placeDriver();
    this.placeTag();
    this.applyHat();
    this.applyPaint();
    this.castShadows();
  }

  // Ridderpak: glimmend harnas, schouderstukken, een embleem en een helm met pluim.
  addArmor(ch, { ws, torsoH, torsoTop, shoulderY, human, closed }) {
    const steel = metal({ color: '#d3d9e1', roughness: 0.22 });
    const dark = metal({ color: '#8a919b', roughness: 0.35 });
    const plume = lambert(ch.accent || '#e63946', { roughness: 0.8 });
    this.torsoG.traverse((o) => { if (o.isMesh) o.material = steel; });
    for (const arm of [this.armL, this.armR]) arm.children.forEach((m, i) => { m.material = i === 0 ? steel : dark; });
    for (const sx of [-1, 1]) {
      const p = mesh(G('schouderstuk', () => new THREE.SphereGeometry(0.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2)), steel, sx * (0.3 * ws + 0.02), shoulderY + 0.02, 0.01);
      p.scale.set(1.2, 0.8, 1.15);
      this.torsoG.add(p);
    }
    // embleem op de borst en een riem
    const emb = mesh(G('embleem', () => new THREE.BoxGeometry(0.2, 0.24, 0.05)), lambert(ch.accent || '#e63946'), 0, 0.67 + torsoH * 0.62, 0.3 * ws + 0.02);
    this.torsoG.add(emb);
    this.torsoG.add(mesh(G('kruisV', () => new THREE.BoxGeometry(0.05, 0.2, 0.06)), lambert('#ffffff'), 0, 0.67 + torsoH * 0.62, 0.3 * ws + 0.03));
    this.torsoG.add(mesh(G('kruisH', () => new THREE.BoxGeometry(0.16, 0.05, 0.06)), lambert('#ffffff'), 0, 0.67 + torsoH * 0.66, 0.3 * ws + 0.03));
    const belt = mesh(G('riem', () => new THREE.CylinderGeometry(0.37, 0.37, 0.08, 22)), lambert('#5a3b22'), 0, 0.72, 0);
    belt.scale.set(ws, 1, ws);
    this.torsoG.add(belt);
    // helm
    const helm = new THREE.Group();
    if (human) {
      const dome = mesh(G('helmbol', () => new THREE.SphereGeometry(R * 1.16, 22, 16)), steel, 0, 0.02, 0);
      dome.scale.set(1.0, 1.12, 1.05);
      helm.add(dome);
      if (closed) {
        // dicht vizier met een kijkspleet
        helm.add(mesh(G('vizier', () => new THREE.BoxGeometry(R * 1.5, 0.05, 0.08)), lambert('#15161a'), 0, 0.06, R * 1.12));
        helm.add(mesh(G('vizierrand', () => new THREE.BoxGeometry(R * 1.62, 0.04, 0.06)), dark, 0, 0.12, R * 1.1));
        for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) helm.add(mesh(G('ademgat', () => new THREE.SphereGeometry(0.018, 6, 4)), lambert('#15161a'), sx * (0.06 + i * 0.05), -0.12, R * 1.13));
      }
      helm.add(mesh(G('helmkam', () => new THREE.BoxGeometry(0.05, 0.12, R * 2.1)), dark, 0, R * 1.22, 0));
      const pl = mesh(G('pluim', () => new THREE.SphereGeometry(1, 12, 10)), plume, 0, R * 1.42, -0.12);
      pl.scale.set(0.08, 0.2, 0.26);
      pl.rotation.x = -0.6;
      helm.add(pl);
      this.headTop = R * 1.45;
    } else {
      // melkpak met open helm: Kees blijft herkenbaar
      const dome = mesh(G('kees-helm', () => new THREE.SphereGeometry(0.47, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2)), steel, 0, 0.32, 0);
      dome.scale.set(1.0, 0.85, 0.95);
      helm.add(dome);
      helm.add(mesh(G('kees-helmrand', () => new THREE.CylinderGeometry(0.47, 0.47, 0.07, 24)), dark, 0, 0.33, 0));
      helm.add(mesh(G('neusstuk', () => new THREE.BoxGeometry(0.06, 0.26, 0.05)), steel, 0, 0.2, 0.34));
      for (const sx of [-1, 1]) helm.add(mesh(G('wangstuk', () => new THREE.BoxGeometry(0.06, 0.34, 0.4)), steel, sx * 0.36, 0.12, 0.05));
      const pl = mesh(G('pluim', () => new THREE.SphereGeometry(1, 12, 10)), plume, 0, 0.78, -0.08);
      pl.scale.set(0.08, 0.2, 0.26);
      pl.rotation.x = -0.6;
      helm.add(pl);
      this.headTop = 0.82;
    }
    this.head.add(helm);
    this.helm = helm;
    this.figureTop = this.head.position.y + this.headTop;
  }

  castShadows() {
    if (!KartView.realShadows) return;
    polish(this.body, { round: false, cast: true });
    this.cape.castShadow = true;
  }

  applyHat() {
    if (!this.head) return;
    if (this.shopHat) { this.shopHat.parent && this.shopHat.parent.remove(this.shopHat); this.shopHat = null; }
    const it = SHOP_BY_ID[this.cos.hoed];
    const hat = it && it.look ? it.look.hat : null;
    this.ownHat.visible = !hat;
    if (hat) {
      this.shopHat = buildHat(hat);
      this.shopHat.position.y = this.headTop;
      this.head.add(this.shopHat);
    }
    // de duif zit op het hoofd, of op de schouder als er een hoed op staat
    if (this.duif) {
      if (hat) this.duif.position.set(this.shoulder.x + 0.02, this.shoulder.y + 0.16, -0.02);
      else this.duif.position.set(0, this.head.position.y + this.headTop + 0.1, 0);
    }
  }

  setCosmetics(cos) {
    this.cos = { ...DEFAULT_EQUIP, ...(cos || {}) };
    const km = SHOP_BY_ID[this.cos.kart];
    this.buildModel(km && km.look ? km.look.model : 'standaard');
    this.modelPaint = km && km.look ? km.look.paint || null : null;
    // cape
    const cape = SHOP_BY_ID[this.cos.cape];
    const cl = cape && cape.look;
    this.cape.visible = !!cl;
    if (cl) {
      this.capeMat.dispose();
      if (cl.pattern) {
        this.capeMat = cl.pattern === 'goud'
          ? pbr({ map: patternTexture('goud'), side: THREE.DoubleSide, metalness: 0.75, roughness: 0.28, emissive: '#3a2800' })
          : std({ map: patternTexture(cl.pattern, cl.colors && cl.colors[0]), side: THREE.DoubleSide, roughness: 0.8 });
      } else {
        this.capeMat = std({ color: cl.colors[0], side: THREE.DoubleSide, roughness: 0.8 });
      }
      this.cape.material = this.capeMat;
    }
    this.sparkle = !!(cl && cl.sparkle);
    this.castShadows();
    // banden
    const bd = SHOP_BY_ID[this.cos.banden];
    const bl = bd && bd.look;
    this.rimMat.color.set(bl ? bl.rim : '#d0d4da');
    this.rimMat.emissive.set(bl && bl.glow ? bl.glow : '#000000');
    this.wheelParticles = bl ? bl.particles || null : null;
    const sp = SHOP_BY_ID[this.cos.spoor];
    this.trail = sp && sp.look ? sp.look : null;
    const ps = SHOP_BY_ID[this.cos.pose];
    this.pose = ps && ps.look ? ps.look.pose : 'duim';
    this.applyHat();
    this.applyPaint();
  }

  applyPaint() {
    if (!this.character) return;
    const k = SHOP_BY_ID[this.cos.kleur];
    const look = k && k.look;
    const p = this.paint;
    p.map = null;
    p.emissive.set('#000000');
    const phys = p.isMeshStandardMaterial;
    if (phys) { p.metalness = 0.15; p.roughness = 0.3; } else p.shininess = 50;
    if (!look) p.color.set(this.modelPaint || this.character.kart);
    else {
      p.color.set(look.color);
      if (look.pattern === 'koe') { p.map = patternTexture('koe'); if (phys) { p.roughness = 0.6; p.metalness = 0; } }
      if (look.metal) { if (phys) { p.metalness = 0.95; p.roughness = 0.12; } else p.shininess = 140; }
      if (look.glow) p.emissive.set(look.glow).multiplyScalar(0.35);
    }
    this.glow = look && look.glow ? look.glow : null;
    p.needsUpdate = true;
  }

  // st: { x, z, h, speed, steer, drift, driftLevel, boost, shield, spin, bump, hop, finished, pose }
  update(dt, st) {
    this.t += dt;
    const g = this.group;
    const y = st.y || 0;
    g.position.set(st.x, y, st.z);
    // neus omhoog over de schans, omlaag bij de landing
    this.pitch = (this.pitch || 0) + ((st.pitch || 0) - (this.pitch || 0)) * Math.min(1, dt * 10);
    g.rotation.set(-this.pitch, st.h, 0, 'YXZ');
    if (this.blob) {
      this.blob.position.y = 0.04 - y;
      const sc = 1 / (1 + y * 0.22);
      this.blob.scale.set(sc, sc, sc);
      this.blob.material.opacity = (KartView.realShadows ? 0.45 : 1) * sc;
    }
    const b = this.body;

    this.wheelSpin += (st.speed || 0) * dt;
    const steerVis = st.drift ? st.drift * 0.25 : (st.steer || 0) * 0.42;
    for (const w of this.wheels) {
      w.spinG.rotation.x = this.wheelSpin / w.r;
      if (w.front) w.steerG.rotation.y = -steerVis;
    }
    if (this.steerBar) this.steeringWheel.rotation.y = -steerVis * 1.2;
    else this.steeringWheel.rotation.z = steerVis * 1.6;

    const driftYaw = st.drift ? -st.drift * 0.38 : 0;
    this.driftYaw = (this.driftYaw || 0) + (driftYaw - (this.driftYaw || 0)) * Math.min(1, dt * 10);
    if (st.spin) this.spinAngle += dt * 14;
    else if (this.spinAngle) {
      const tgt = Math.round(this.spinAngle / (Math.PI * 2)) * Math.PI * 2;
      this.spinAngle += (tgt - this.spinAngle) * Math.min(1, dt * 8);
      if (Math.abs(tgt - this.spinAngle) < 0.01) this.spinAngle = 0;
    }
    b.rotation.y = this.driftYaw + this.spinAngle;
    const wob = st.bump ? Math.sin(this.t * 38) * 0.14 : 0;
    b.rotation.z = wob + (st.drift ? st.drift * 0.08 : -(st.steer || 0) * 0.04);
    const hop = st.hop ? Math.sin(Math.min(1, (this.hopT = (this.hopT || 0) + dt) / 0.3) * Math.PI) * 0.45 : 0;
    if (!st.hop) this.hopT = 0;
    b.position.y = hop + (st.boost ? Math.sin(this.t * 50) * 0.02 : 0);

    for (const f of this.exhausts) {
      f.visible = !!st.boost;
      if (st.boost) { const s = (0.8 + Math.random() * 0.6) * f.userData.base; f.scale.set(f.userData.base, s, f.userData.base); }
    }
    this.shield.visible = !!st.shield;
    if (st.shield) {
      this.shield.rotation.y += dt * 1.5;
      this.shield.material.opacity = 0.28 + Math.sin(this.t * 6) * 0.08;
    }
    if (this.glow) this.paint.emissive.set(this.glow).multiplyScalar(0.25 + Math.sin(this.t * 4) * 0.15);
    if (this.head.userData.blades) this.head.userData.blades.rotation.z += dt * (3 + (st.speed || 0) * 0.3);
    if (this.duif) {
      // de duif knikt mee
      this.duif.rotation.x = Math.sin(this.t * 6) * 0.15;
      this.duif.rotation.y = Math.sin(this.t * 0.7) * 0.4;
    }

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
      const along = -y / H;
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
    const L = this.armL, Rr = this.armR;
    const az = this.armZ || 0.15;
    const rest = () => {
      L.rotation.set(-1.05, 0, -az); Rr.rotation.set(-1.05, 0, az);
      this.driver.position.y = this.driverBase.y;
      this.driver.rotation.y = 0;
      this.body.rotation.x = 0;
      this.glass.visible = false;
    };
    if (!pose) { this.poseT = 0; rest(); return; }
    this.poseT += dt;
    const t = this.poseT;
    rest();
    switch (pose) {
      case 'duim': Rr.rotation.set(-2.9, 0, 0.3); break;
      case 'zwaai': Rr.rotation.set(-2.7, 0, 0.3 + Math.sin(t * 8) * 0.5); break;
      case 'dans':
        this.driver.position.y = this.driverBase.y + Math.abs(Math.sin(t * 7)) * 0.25;
        this.driver.rotation.y = Math.sin(t * 3.5) * 0.5;
        L.rotation.set(-2.6, 0, -0.5 + Math.sin(t * 7) * 0.3);
        Rr.rotation.set(-2.6, 0, 0.5 - Math.sin(t * 7) * 0.3);
        break;
      case 'proost': {
        const drink = (Math.sin(t * 2.5) + 1) / 2;
        Rr.rotation.set(-2.2 - drink * 0.9, 0, 0.2);
        if (this.glass.parent !== Rr) Rr.add(this.glass);
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
        L.rotation.set(-2.9, 0, -0.4); Rr.rotation.set(-2.9, 0, 0.4);
        break;
      }
      default: Rr.rotation.set(-2.9, 0, 0.3);
    }
  }

  // wereldposities voor effecten (achterwielen = laatste twee)
  exhaustWorld(out, idx = 0) {
    this.exhausts[Math.min(idx, this.exhausts.length - 1)].getWorldPosition(out);
    return out;
  }

  wheelWorld(out, idx) {
    const n = this.wheels.length;
    const w = idx >= 2 ? this.wheels[Math.max(0, n - 4 + idx)] || this.wheels[n - 1] : this.wheels[Math.min(idx, n - 1)];
    w.steerG.getWorldPosition(out);
    return out;
  }

  dispose() {
    this.paint.dispose();
    this.capeMat.dispose();
    this.cape.geometry.dispose();
    this.flameMat.dispose();
    if (this.tag) { this.tag.material.map.dispose(); this.tag.material.dispose(); }
  }
}
