// WebGL-renderer, schermformaat en de tekenlus (met automatische kwaliteit).
import * as THREE from '../../vendor/three.module.min.js';

export class Engine {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.settings = settings;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: settings.quality !== 'laag', powerPreference: 'high-performance', alpha: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.view = null;
    this.last = performance.now();
    this.fpsT = 0; this.fpsN = 0; this.fps = 60;
    this.slowFor = 0; this.fastFor = 0;
    this.autoRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.applyQuality();
    const onResize = () => this.resize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', () => setTimeout(onResize, 250));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
    this.resize();
    this.running = false;
  }

  maxRatio() {
    const dpr = window.devicePixelRatio || 1;
    const q = this.settings.quality;
    return Math.min(dpr, q === 'laag' ? 1 : q === 'hoog' ? 2 : 1.5);
  }

  applyQuality() {
    this.ratio = this.settings.quality === 'auto' ? Math.min(this.autoRatio, Math.min(window.devicePixelRatio || 1, 2)) : this.maxRatio();
    this.renderer.setPixelRatio(this.ratio);
    this.resize();
  }

  get qualityLevel() {
    const q = this.settings.quality;
    if (q === 'auto') return this.ratio < 1.1 ? 'laag' : 'normaal';
    return q;
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    if (this.view && this.view.resize) this.view.resize(w, h);
  }

  // pixels per meter op 1 meter afstand (voor deeltjes)
  pxScale(camera) {
    return (this.h * this.ratio) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  }

  setView(view) {
    if (this.view && this.view !== view && this.view.hide) this.view.hide();
    this.view = view;
    if (view && view.resize) view.resize(this.w, this.h);
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = (t) => {
      if (!this.running) return;
      requestAnimationFrame(loop);
      const dt = Math.min(0.1, Math.max(0, (t - this.last) / 1000));
      this.last = t;
      this.measure(dt);
      if (!this.view) return;
      try {
        this.view.update(dt);
        this.renderer.render(this.view.scene, this.view.camera);
      } catch (e) {
        console.error(e);
        if (this.onError) this.onError(e);
      }
    };
    requestAnimationFrame(loop);
  }

  measure(dt) {
    this.fpsT += dt; this.fpsN++;
    if (this.fpsT < 1) return;
    this.fps = this.fpsN / this.fpsT;
    this.fpsT = 0; this.fpsN = 0;
    if (this.settings.quality !== 'auto' || document.hidden) return;
    // te traag? resolutie omlaag. Ruim snel genoeg? langzaam weer omhoog.
    if (this.fps < 40) { this.slowFor++; this.fastFor = 0; } else if (this.fps > 57) { this.fastFor++; this.slowFor = 0; } else { this.slowFor = 0; this.fastFor = 0; }
    const max = Math.min(window.devicePixelRatio || 1, 2);
    if (this.slowFor >= 2 && this.autoRatio > 0.75) { this.autoRatio = Math.max(0.75, this.autoRatio - 0.25); this.slowFor = 0; this.applyQuality(); }
    if (this.fastFor >= 6 && this.autoRatio < max) { this.autoRatio = Math.min(max, this.autoRatio + 0.25); this.fastFor = 0; this.applyQuality(); }
  }
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}
