// 3D-achtergrond voor de menu's: je kart op een draaiplateau, en het podium na de race.
import * as THREE from '../../vendor/three.module.min.js';
import { KartView, lambert } from './kart.js';
import { std, skyMaterial, environmentFor, addVariation, roundedBox } from './look.js';
import { Effects } from './effects.js';
import { stripeTexture, textSprite, groundTexture } from './textures.js';

export class Showroom {
  constructor(engine) {
    this.engine = engine;
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color('#9fd8ff');
    // zelfde mooie lucht en licht als in de races
    const th = { sky: ['#3f9cf0', '#e3f3ff'], fog: '#d6ecfb', sun: ['#fff3da', 1.6], sunDir: [0.55, 0.62, 0.55], ground: ['#79c95f'], cloudCover: 0.5 };
    this.skyMat = skyMaterial(th);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), this.skyMat);
    sky.renderOrder = -10;
    s.add(sky);
    const env = environmentFor(th);
    if (env) { s.environment = env.texture; s.environmentIntensity = 0.9; }
    s.add(new THREE.HemisphereLight('#ffffff', '#8fb07a', 0.55));
    const sun = new THREE.DirectionalLight('#fff3da', 2.6);
    sun.position.set(6, 12, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.03;
    s.add(sun);

    // grasveld
    const gt = groundTexture('#6fbf55', ['#63b44b', '#7bcc60', '#5aa844', '#84d468']).clone();
    gt.needsUpdate = true;
    gt.repeat.set(16, 16);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(80, 48), addVariation(std({ map: gt, roughness: 0.95 }), { scale: 0.05, strength: 0.3 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    s.add(ground);
    this.turn = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.35, 48), std({ map: stripeTexture('#ffffff', '#ffd23f', 16, true), roughness: 0.35 }));
    plate.position.y = 0.17;
    plate.receiveShadow = true;
    this.turn.add(plate);
    s.add(this.turn);
    this.kart = new KartView({});
    this.kart.group.position.y = 0.35;
    this.turn.add(this.kart.group);

    // podium
    this.podium = new THREE.Group();
    s.add(this.podium);
    const heights = [1.8, 1.2, 0.8];
    const xs = [0, -3.0, 3.0];
    const colors = ['#ffd23f', '#d9e2ec', '#e0a46a'];
    this.podiumSpots = [];
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(roundedBox(2.8, heights[i], 3, 0.12), lambert(colors[i], { roughness: 0.3, metalness: i === 0 ? 0.5 : 0.2 }));
      b.castShadow = true; b.receiveShadow = true;
      b.position.set(xs[i], heights[i] / 2, 0);
      this.podium.add(b);
      const num = textSprite(String(i + 1), { size: 80, color: '#ffffff', stroke: '#2b1a4a', scale: 0.012 });
      num.position.set(xs[i], heights[i] / 2, 1.7);
      this.podium.add(num);
      this.podiumSpots.push({ x: xs[i], y: heights[i] });
    }
    this.podium.visible = false;
    this.podiumKarts = [];

    this.effects = new Effects(s);
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    this.mode = 'menu';
    this.t = 0;
    this.previewPose = false;
  }

  setFov(f) {
    if (this.camera.fov !== f) { this.camera.fov = f; this.camera.updateProjectionMatrix(); }
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setKart(character, cosmetics, look) {
    this.kart.setCharacter(character, look);
    this.kart.setCosmetics(cosmetics);
  }

  setMode(mode) {
    this.mode = mode;
    this.turn.visible = mode !== 'podium';
    this.podium.visible = mode === 'podium';
  }

  setPodium(rows) {
    for (const k of this.podiumKarts) { this.podium.remove(k.group); k.dispose(); }
    this.podiumKarts = [];
    rows.slice(0, 3).forEach((r, i) => {
      const kv = new KartView({ character: r.character, cosmetics: r.cosmetics, look: r.look, name: r.name, showName: true });
      const spot = this.podiumSpots[i];
      kv.group.position.set(spot.x, spot.y, 0);
      kv.group.rotation.y = 0;
      kv.podiumPlace = i;
      this.podium.add(kv.group);
      this.podiumKarts.push(kv);
    });
    this.setMode('podium');
  }

  update(dt) {
    this.t += dt;
    this.skyMat.uniforms.time.value = this.t;
    const portrait = this.camera.aspect < 1;
    if (this.mode === 'podium') {
      // portret: podium bovenin beeld (de uitslag staat eronder)
      const r = portrait ? 20 : 14;
      const side = portrait ? 0 : 3.4;
      this.setFov(portrait ? 55 : 45);
      this.camera.position.set(side + Math.sin(this.t * 0.2) * 2, portrait ? 3.6 : 4.6, r);
      this.camera.lookAt(side, portrait ? -4.2 : 1.8, 0);
      for (const kv of this.podiumKarts) {
        const spot = this.podiumSpots[kv.podiumPlace];
        kv.update(dt, { x: spot.x, z: 0, h: 0, speed: 0, pose: kv.podiumPlace === 0 || true });
        kv.group.position.y = spot.y;
      }
      if (Math.random() < dt * 30) {
        this.effects.burst((Math.random() - 0.5) * 12, 9, (Math.random() - 0.5) * 4, { n: 1, colors: ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#ff7eb6'], speed: 1, up: 0, life: 3, size: [0.35, 0.3], g: 2, drag: 0.5, additive: false });
      }
    } else {
      this.turn.rotation.y += dt * (this.mode === 'creator' ? 0.3 : 0.45);
      // kart staat bovenin beeld in portret (menu's vullen de onderkant)
      this.setFov(45);
      const creator = this.mode === 'creator';
      const dist = portrait ? (this.mode === 'menu' ? 19 : 14) : creator ? 7.5 : 9.5;
      // in het menu staat de kart tussen logo en knoppen, in winkel/lobby bovenin
      // portret: de kart bovenin het scherm, het menu eronder
      const lookY = portrait ? (this.mode === 'menu' ? -2.8 : -3.6) : creator ? 1.0 : 0.6;
      const side = portrait ? 0 : 5.2; // liggend: kart links in beeld, menu rechts
      const hy = 0.35 + this.kart.driverBase.y + (this.kart.figureTop || 1.9); // hoogte van het hoofd
      if (creator && portrait) {
        // ingezoomd op de coureur: hoofd bovenin beeld
        this.camera.position.set(0, hy + 0.8, 7.5 + this.kart.driverBase.y);
        this.camera.lookAt(0, hy - 2.3, 0);
      } else {
        const extra = Math.max(0, hy - 2.3);
        this.camera.position.set(side, (portrait ? 3.4 : 3.2) + extra * 0.6, dist + extra * 2.2);
        this.camera.lookAt(side, lookY + 1 + extra * 0.4, 0);
      }
      this.kart.update(dt, { x: 0, z: 0, h: 0, speed: 6, pose: this.previewPose });
      this.kart.group.position.y = 0.35;
      if (this.kart.sparkle && Math.random() < dt * 20) this.effects.spark((Math.random() - 0.5) * 1.5, 1 + Math.random(), -0.6, '#ffe14d', 0, 0, 0.3);
      if (this.kart.wheelParticles && Math.random() < dt * 25) {
        const col = { vonk: '#ffd23f', sneeuw: '#ffffff', vuur: '#ff6a00' }[this.kart.wheelParticles];
        const p = new THREE.Vector3();
        this.kart.wheelWorld(p, 2 + Math.floor(Math.random() * 2));
        this.effects.spark(p.x, p.y, p.z, col, 0, 0, 0.35);
      }
    }
    this.effects.setScale(this.engine.pxScale(this.camera));
    this.effects.update(dt);
  }
}
