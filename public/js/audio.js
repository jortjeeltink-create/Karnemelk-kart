// Alle geluiden en muziek worden live gemaakt met de Web Audio API (geen geluidsbestanden).
export class Sound {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.music = null;
    this.engine = null;
    this.musicTrack = -1;
  }

  // iOS laat pas geluid toe na een tik van de speler
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  applyVolumes() {
    if (!this.ctx) return;
    const s = this.settings;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.muted ? 0 : 1, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(s.sfx, t, 0.05);
    this.musicBus.gain.setTargetAtTime(s.music * 0.55, t, 0.05);
  }

  ok() { return this.ctx && this.ctx.state === 'running' && !this.settings.muted; }

  tone(freq, dur, { type = 'square', vol = 0.2, slide = 0, delay = 0, attack = 0.005, bus = this.sfxBus } = {}) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  noise(dur, { vol = 0.3, freq = 1200, q = 1, type = 'bandpass', delay = 0, slide = 0 } = {}) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  }

  play(name, vol = 1) {
    if (!this.ok()) return;
    const v = Math.max(0, Math.min(1, vol));
    if (v < 0.03) return;
    switch (name) {
      case 'click': this.tone(880, 0.06, { vol: 0.12 * v, type: 'triangle' }); break;
      case 'tick': this.tone(660, 0.18, { vol: 0.25 * v, type: 'square' }); break;
      case 'go': this.tone(990, 0.5, { vol: 0.28 * v, type: 'square' }); this.tone(1320, 0.5, { vol: 0.12 * v, type: 'triangle' }); break;
      case 'box': [784, 988, 1175].forEach((f, i) => this.tone(f, 0.12, { vol: 0.15 * v, type: 'triangle', delay: i * 0.05 })); break;
      case 'roll': this.tone(1400 + Math.random() * 400, 0.04, { vol: 0.07 * v, type: 'square' }); break;
      case 'item': this.tone(1046, 0.15, { vol: 0.18 * v, type: 'triangle' }); this.tone(1568, 0.2, { vol: 0.12 * v, type: 'triangle', delay: 0.06 }); break;
      case 'boost': this.noise(0.7, { vol: 0.35 * v, freq: 600, slide: 2400, q: 0.8 }); this.tone(220, 0.6, { vol: 0.1 * v, type: 'sawtooth', slide: 300 }); break;
      case 'mini': this.noise(0.4, { vol: 0.25 * v, freq: 1500, slide: 1500, q: 2 }); this.tone(880, 0.25, { vol: 0.08 * v, type: 'square', slide: 400 }); break;
      case 'bump': this.noise(0.18, { vol: 0.5 * v, freq: 300, q: 0.7, type: 'lowpass' }); this.tone(140, 0.2, { vol: 0.3 * v, type: 'sine', slide: -80 }); this.tone(520, 0.12, { vol: 0.12 * v, type: 'square', slide: 300, delay: 0.03 }); break;
      case 'wall': this.noise(0.15, { vol: 0.35 * v, freq: 220, type: 'lowpass' }); break;
      case 'spin': this.tone(700, 0.8, { vol: 0.15 * v, type: 'triangle', slide: -500 }); this.noise(0.5, { vol: 0.2 * v, freq: 3000, q: 3 }); break;
      case 'splash': this.noise(0.35, { vol: 0.35 * v, freq: 1800, q: 1.5, slide: -1200 }); break;
      case 'shield': this.tone(523, 0.3, { vol: 0.12 * v, type: 'sine' }); this.tone(784, 0.4, { vol: 0.12 * v, type: 'sine', delay: 0.08 }); break;
      case 'block': this.tone(1200, 0.2, { vol: 0.15 * v, type: 'triangle', slide: -600 }); break;
      case 'throw': this.noise(0.25, { vol: 0.25 * v, freq: 900, slide: 900, q: 2 }); break;
      case 'hop': this.tone(300, 0.08, { vol: 0.08 * v, type: 'sine', slide: 200 }); break;
      case 'lap': [523, 659, 784].forEach((f, i) => this.tone(f, 0.15, { vol: 0.16 * v, type: 'square', delay: i * 0.09 })); break;
      case 'lastlap': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, { vol: 0.18 * v, type: 'square', delay: i * 0.1 })); break;
      case 'finish': [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, 0.22, { vol: 0.18 * v, type: 'square', delay: i * 0.12 })); break;
      case 'cheer': for (let i = 0; i < 6; i++) this.noise(0.6, { vol: 0.12 * v, freq: 1500 + i * 300, q: 0.6, delay: i * 0.05 }); break;
      case 'buy': [784, 1046, 1318, 1568].forEach((f, i) => this.tone(f, 0.14, { vol: 0.15 * v, type: 'triangle', delay: i * 0.07 })); break;
      case 'error': this.tone(220, 0.25, { vol: 0.18 * v, type: 'square' }); this.tone(180, 0.3, { vol: 0.15 * v, type: 'square', delay: 0.12 }); break;
      case 'rocket': this.noise(1.0, { vol: 0.4 * v, freq: 400, slide: 3000, q: 0.6 }); break;
      case 'horn': this.tone(392, 0.16, { vol: 0.2 * v, type: 'square' }); this.tone(494, 0.16, { vol: 0.16 * v, type: 'square' }); this.tone(392, 0.2, { vol: 0.2 * v, type: 'square', delay: 0.2 }); this.tone(494, 0.2, { vol: 0.16 * v, type: 'square', delay: 0.2 }); break;
      case 'wrong': this.tone(330, 0.2, { vol: 0.12 * v, type: 'square' }); break;
      case 'jump': this.noise(0.45, { vol: 0.3 * v, freq: 500, slide: 1800, q: 0.9 }); this.tone(330, 0.35, { vol: 0.1 * v, type: 'triangle', slide: 500 }); break;
      case 'land': this.noise(0.22, { vol: 0.5 * v, freq: 200, q: 0.7, type: 'lowpass' }); this.tone(90, 0.25, { vol: 0.35 * v, type: 'sine', slide: -40 }); break;
      case 'ring': [988, 1318, 1760].forEach((f, i) => this.tone(f, 0.16, { vol: 0.14 * v, type: 'triangle', delay: i * 0.05 })); this.noise(0.5, { vol: 0.2 * v, freq: 2500, slide: 2500, q: 1.5 }); break;
      default: break;
    }
  }

  // ---------- motor ----------
  startEngine() {
    if (!this.ctx || this.engine) return;
    const c = this.ctx;
    const o1 = c.createOscillator(), o2 = c.createOscillator();
    o1.type = 'sawtooth'; o2.type = 'square';
    const f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 600;
    const g = c.createGain();
    g.gain.value = 0;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.sfxBus);
    o1.start(); o2.start();
    // slipgeluid
    const sk = c.createBufferSource();
    sk.buffer = this.noiseBuf; sk.loop = true;
    const sf = c.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 2400; sf.Q.value = 4;
    const sg = c.createGain(); sg.gain.value = 0;
    sk.connect(sf); sf.connect(sg); sg.connect(this.sfxBus);
    sk.start();
    this.engine = { o1, o2, f, g, sk, sg };
  }

  updateEngine(speed, boost, drift, offroad) {
    if (!this.engine) return;
    const t = this.ctx.currentTime;
    const sp = Math.min(1.4, Math.abs(speed) / 27);
    const base = 55 + sp * 95 + (boost ? 30 : 0);
    this.engine.o1.frequency.setTargetAtTime(base, t, 0.05);
    this.engine.o2.frequency.setTargetAtTime(base * 0.5 + 3, t, 0.05);
    this.engine.f.frequency.setTargetAtTime(400 + sp * 900, t, 0.05);
    this.engine.g.gain.setTargetAtTime(0.05 + sp * 0.06, t, 0.08);
    this.engine.sg.gain.setTargetAtTime(drift ? 0.07 : offroad && sp > 0.2 ? 0.03 : 0, t, 0.05);
  }

  stopEngine() {
    if (!this.engine) return;
    const e = this.engine;
    try { e.o1.stop(); e.o2.stop(); e.sk.stop(); } catch { /* al gestopt */ }
    this.engine = null;
  }

  // ---------- muziek: per baan een eigen vrolijk deuntje ----------
  startMusic(index) {
    if (!this.ctx) return;
    if (this.music && this.musicTrack === index) return;
    this.stopMusic();
    this.musicTrack = index;
    const songs = [
      { bpm: 132, root: 60, prog: [0, 5, 7, 5], scale: [0, 2, 4, 7, 9], lead: 'triangle' },   // kust
      { bpm: 144, root: 62, prog: [0, 7, 9, 5], scale: [0, 2, 4, 7, 9], lead: 'square' },     // pretpark
      { bpm: 126, root: 57, prog: [0, 3, 5, 7], scale: [0, 3, 5, 7, 10], lead: 'square' },    // stad
      { bpm: 120, root: 55, prog: [0, 5, 3, 7], scale: [0, 2, 3, 7, 8], lead: 'triangle' },   // bos
      { bpm: 136, root: 58, prog: [0, 0, 5, 7], scale: [0, 3, 5, 7, 10], lead: 'sawtooth' },  // haven
      { bpm: 128, root: 64, prog: [0, 9, 5, 7], scale: [0, 2, 4, 7, 11], lead: 'triangle' },  // sneeuw
      { bpm: 140, root: 57, prog: [0, 1, 5, 3], scale: [0, 1, 4, 5, 7, 8], lead: 'square' },  // woestijn
      { bpm: 138, root: 60, prog: [0, 5, 0, 7], scale: [0, 2, 4, 5, 7, 9], lead: 'square' },  // boerderij
      { bpm: 118, root: 62, prog: [0, 8, 3, 10], scale: [0, 2, 3, 7, 10], lead: 'sine' },     // melkweg
      { bpm: 112, root: 60, prog: [0, 5, 9, 7], scale: [0, 2, 4, 7, 9], lead: 'triangle' },   // menu
    ];
    const song = songs[index % songs.length];
    const step = 60 / song.bpm / 2;
    let n = 0;
    let next = this.ctx.currentTime + 0.1;
    let seed = index * 97 + 13;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const melody = Array.from({ length: 32 }, () => (rnd() < 0.7 ? song.scale[Math.floor(rnd() * song.scale.length)] + (rnd() < 0.3 ? 12 : 0) : null));
    const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const tick = () => {
      if (!this.ctx) return;
      while (next < this.ctx.currentTime + 0.25) {
        const bar = Math.floor(n / 8) % song.prog.length;
        const chord = song.root + song.prog[bar];
        const beat = n % 8;
        const delay = next - this.ctx.currentTime;
        const vol = index === 9 ? 0.6 : 1;
        if (beat % 2 === 0) this.tone(midi(chord - 24 + (beat === 4 ? 7 : 0)), step * 1.6, { type: 'triangle', vol: 0.16 * vol, delay, bus: this.musicBus });
        const m = melody[n % 32];
        if (m != null && index !== 9 || (index === 9 && beat % 4 === 0 && m != null)) this.tone(midi(chord + m), step * 0.9, { type: song.lead, vol: 0.05 * vol, delay, bus: this.musicBus });
        if (beat === 0 || beat === 4) this.drum('kick', delay, vol);
        if (beat === 2 || beat === 6) this.drum('snare', delay, vol);
        this.drum('hat', delay, vol * 0.6);
        n++;
        next += step;
      }
    };
    this.music = setInterval(tick, 60);
    tick();
  }

  drum(kind, delay, vol) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    if (kind === 'kick') {
      const o = c.createOscillator(); const g = c.createGain();
      o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      g.gain.setValueAtTime(0.35 * vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + 0.2);
    } else {
      const src = c.createBufferSource(); src.buffer = this.noiseBuf;
      const f = c.createBiquadFilter(); f.type = kind === 'hat' ? 'highpass' : 'bandpass'; f.frequency.value = kind === 'hat' ? 7000 : 1800;
      const g = c.createGain();
      const len = kind === 'hat' ? 0.04 : 0.12;
      g.gain.setValueAtTime((kind === 'hat' ? 0.05 : 0.18) * vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      src.connect(f); f.connect(g); g.connect(this.musicBus); src.start(t, Math.random() * 0.5); src.stop(t + len + 0.02);
    }
  }

  stopMusic() {
    if (this.music) clearInterval(this.music);
    this.music = null;
    this.musicTrack = -1;
  }
}
