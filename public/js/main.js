// Karnemelk Kart — startpunt in de browser.
import { Engine, webglAvailable } from './render/engine.js';
import { Showroom } from './render/showroom.js';
import { Net, LocalNet } from './net.js';
import { Sound } from './audio.js';
import { Controls } from './input.js';
import { loadSettings, saveSettings, store } from './settings.js';
import { RaceClient } from './game/race-client.js';
import { h, toast, modal, isModalOpen } from './ui/dom.js';
import * as S from './ui/screens.js';
import { DEFAULT_CHARACTER } from '../shared/characters.js';

const TOKEN_KEY = 'kk-token';
const ROOM_KEY = 'kk-room';
const NAME_KEY = 'kk-naam';

class App {
  constructor() {
    this.settings = loadSettings();
    this.sound = new Sound(this.settings);
    this.controls = new Controls(this.settings, this.sound);
    this.profile = null;
    this.room = null;
    this.race = null;
    this.results = null;
    this.challenge = null;
    this.screenName = null;
    this.offline = !!window.KK_OFFLINE;
    const params = new URLSearchParams(location.search);
    const fromPath = location.pathname.match(/^\/join\/([A-Za-z]{4})/);
    const code = (params.get('room') || (fromPath && fromPath[1]) || '').toUpperCase().replace(/[^A-Z]/g, '');
    this.inviteCode = code.length === 4 ? code : null;
    this.pendingJoin = this.inviteCode;
    if (!this.pendingJoin) {
      // na herladen of verbindingsverlies terug naar je room
      try {
        const saved = JSON.parse(store.get(ROOM_KEY) || 'null');
        if (saved && Date.now() - saved.at < 10 * 60 * 1000) this.pendingJoin = saved.code;
      } catch { /* niks */ }
    }
    this.everConnected = false;
  }

  boot() {
    const canvas = document.getElementById('scene');
    // eerste aanraking maakt geluid mogelijk (iOS)
    const unlock = () => this.sound.unlock();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    document.addEventListener('gesturestart', (e) => e.preventDefault());

    if (!webglAvailable()) {
      this.render(S.errorScreen(this, '3D wordt niet ondersteund', 'Je browser kan geen 3D (WebGL) tonen. Probeer Safari of Chrome, en zet "Lage stroommodus" eventueel uit.'));
      return;
    }
    try {
      this.engine = new Engine(canvas, this.settings);
    } catch (e) {
      this.render(S.errorScreen(this, '3D starten lukt niet', 'Er ging iets mis bij het opstarten van de 3D-weergave. Sluit andere tabbladen en probeer het opnieuw.'));
      return;
    }
    this.showroom = new Showroom(this.engine);
    this.engine.setView(this.showroom);
    this.engine.start();
    this.engine.onError = () => {};

    this.net = this.offline ? new LocalNet(window.KK_OFFLINE.createHub()) : new Net();
    this.bindNet();
    this.show('loading');
    const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
    this.net.connect(url);
    this.connTimer = setTimeout(() => {
      if (!this.everConnected) this.render(S.loadingScreen(this, 'De server reageert niet… We blijven het proberen. Draait de server (npm start)?'));
    }, 6000);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.sound.stopMusic();
      else this.updateMusic();
    });
  }

  // ---------- netwerk ----------
  bindNet() {
    const n = this.net;
    n.on('open', () => {
      this.everConnected = true;
      clearTimeout(this.connTimer);
      this.setConn(true);
      n.send({ t: 'hello', token: store.get(TOKEN_KEY) });
    });
    n.on('status', (s) => {
      if (s === 'closed' && this.everConnected) this.setConn(false);
    });
    n.on('welcome', (m) => {
      this.profile = m.profile;
      if (!m.profile) {
        if (this.room) { this.room = null; this.endRace(); }
        this.show('login');
        return;
      }
      this.afterLogin(true);
    });
    n.on('loggedIn', (m) => {
      store.set(TOKEN_KEY, m.token);
      store.set(NAME_KEY, m.profile.name);
      this.profile = m.profile;
      toast(m.created ? `Welkom, ${m.profile.name}! Je krijgt ${m.profile.mp} MP als welkomstcadeau.` : `Welkom terug, ${m.profile.name}!`, 'good');
      this.afterLogin(false);
    });
    n.on('loginFailed', (m) => { if (this.loginErr) this.loginErr(m.msg); });
    n.on('room', (m) => this.onRoom(m));
    n.on('joinFailed', (m) => {
      store.del(ROOM_KEY);
      if (this.joinErr && this.screenName === 'join') { this.joinErr(m.msg); this.sound.play('error'); }
      else { toast(m.msg, 'error', 4500); if (!this.room) this.show('menu'); }
    });
    n.on('race', (m) => this.startRace(m));
    n.on('s', (m) => { if (this.race) this.race.onSnapshot(m); });
    n.on('results', (m) => this.onResults(m));
    n.on('challenge', (m) => {
      this.challenge = m.challenge;
      if (this.screenName === 'results') this.show('results');
    });
    n.on('left', (m) => {
      this.room = null;
      store.del(ROOM_KEY);
      this.endRace();
      if (m.reason) toast(m.reason, 'error', 5000);
      if (this.profile) this.show('menu');
    });
    n.on('profile', (m) => {
      this.profile = m.profile;
      if (m.bought) {
        this.sound.play('buy');
        toast('Gekocht! Je draagt het nu.', 'good');
        this.send({ t: 'equip', id: m.bought });
        this.shopPreview = null;
      }
      if (['shop', 'menu'].includes(this.screenName)) this.show(this.screenName);
      else this.updateShowroomKart();
    });
    n.on('shopFailed', (m) => { this.sound.play('error'); toast(m.msg, 'error'); });
    n.on('notReady', (m) => {
      this.confirm(`Nog niet iedereen is klaar: ${m.names.join(', ')}. Toch starten?`, 'Toch starten', () => this.send({ t: 'start', force: true }));
    });
    n.on('err', (m) => {
      if (m.code === 'login') { this.profile = null; this.show('login'); return; }
      if (m.code === 'noroom') { this.room = null; this.endRace(); this.show('menu'); }
      toast(m.msg, 'error');
    });
  }

  send(obj) {
    if (!this.net.send(obj)) toast('Geen verbinding met de server. Even geduld…', 'error');
  }

  setConn(ok) {
    const el = document.getElementById('conn');
    el.classList.toggle('show', !ok);
  }

  afterLogin(fromWelcome) {
    if (this.pendingJoin) {
      const code = this.pendingJoin;
      this.pendingJoin = null;
      this.send({ t: 'join', code });
      return;
    }
    if (fromWelcome && this.room) {
      // na verbindingsverlies terug in dezelfde room
      this.send({ t: 'join', code: this.room.code });
      return;
    }
    if (!this.room) this.show('menu');
  }

  login(name, pin, onErr) {
    this.loginErr = onErr;
    this.send({ t: 'login', name, pin });
  }

  logout() {
    store.del(TOKEN_KEY);
    store.del(ROOM_KEY);
    this.room = null;
    this.send({ t: 'logout' });
  }

  lastName() { return store.get(NAME_KEY) || ''; }

  createRoom(practice) {
    this.send({ t: 'create', practice });
  }

  joinRoom(code, onErr) {
    this.joinErr = onErr;
    this.send({ t: 'join', code });
  }

  leaveRoom() {
    store.del(ROOM_KEY);
    this.send({ t: 'leave' });
    this.room = null;
    this.endRace();
    this.show('menu');
  }

  onRoom(m) {
    const first = !this.room || this.room.code !== m.code;
    this.room = m;
    if (!m.practice) store.set(ROOM_KEY, JSON.stringify({ code: m.code, at: Date.now() }));
    // uitnodigingslink is gebruikt: adresbalk opschonen zodat herladen je niet opnieuw in een oude room zet
    if (location.search.includes('room=') || location.pathname.startsWith('/join/')) {
      try { history.replaceState(null, '', '/'); } catch { /* niet erg */ }
      this.inviteCode = null;
    }
    if (first && !m.practice) this.sound.play('box');
    if (m.state === 'lobby') {
      if (this.race) this.endRace();
      if (this.screenName !== 'shop' && this.screenName !== 'settings') this.show('lobby');
    } else if (m.state === 'results') {
      if (this.screenName === 'results') return;
      if (this.screenName === 'lobby') this.show('results');
    } else if (m.state === 'race') {
      if (!this.race && this.screenName !== 'race') this.show('lobby');
    }
  }

  startRace(m) {
    this.endRace();
    this.results = null;
    this.challenge = null;
    this.render(h('div'));
    this.screenName = 'race';
    document.body.classList.add('racing');
    try {
      this.race = new RaceClient(this, m);
      this.engine.setView(this.race);
    } catch (e) {
      console.error(e);
      toast('De race kon niet laden op dit apparaat.', 'error');
    }
  }

  endRace() {
    clearTimeout(this.resultsTimer);
    if (this.race) {
      this.race.destroy();
      this.race = null;
    }
    document.body.classList.remove('racing');
    if (this.engine && this.showroom) this.engine.setView(this.showroom);
  }

  onResults(m) {
    this.results = m;
    this.challenge = m.challenge;
    // even de finish laten zien, dan het podium
    const delay = this.race ? 1800 : 0;
    clearTimeout(this.resultsTimer);
    this.resultsTimer = setTimeout(() => {
      this.endRace();
      this.show('results');
      this.sound.play('cheer', 0.6);
    }, delay);
  }

  // ---------- schermen ----------
  render(el) {
    const ui = document.getElementById('ui');
    ui.innerHTML = '';
    ui.appendChild(el);
    ui.scrollTop = 0;
  }

  show(name, opts) {
    // tijdens typen in de lobby niet alles opnieuw opbouwen
    const ae = document.activeElement;
    if (name === 'lobby' && this.screenName === 'lobby' && ae && ae.tagName === 'INPUT' && document.getElementById('ui').contains(ae)) {
      this.pendingLobby = true;
      ae.addEventListener('blur', () => { if (this.pendingLobby && this.screenName === 'lobby') { this.pendingLobby = false; this.show('lobby'); } }, { once: true });
      return;
    }
    const keepScroll = name === this.screenName ? document.querySelector('#ui .screen')?.scrollTop || document.getElementById('ui').scrollTop : 0;
    if (name === 'settings') this.settingsBack = this.screenName === 'settings' ? this.settingsBack : (this.room ? 'lobby' : 'menu');
    let el;
    switch (name) {
      case 'loading': el = S.loadingScreen(this); break;
      case 'login': el = S.loginScreen(this); break;
      case 'menu':
        if (!this.profile) return this.show('login');
        if (this.room) return this.show(this.room.state === 'results' && this.results ? 'results' : 'lobby');
        el = S.menuScreen(this); break;
      case 'join': el = S.joinScreen(this); break;
      case 'lobby':
        if (!this.room) return this.show('menu');
        el = S.lobbyScreen(this); break;
      case 'results':
        if (!this.results) return this.show('lobby');
        el = S.resultsScreen(this); break;
      case 'shop':
        if (!this.profile) return this.show('login');
        el = S.shopScreen(this, opts || {}); break;
      case 'settings': el = S.settingsScreen(this); break;
      case 'help': el = S.helpScreen(this); break;
      default: el = h('div');
    }
    if (name !== 'results' && this.showroom) this.showroom.setMode(['shop', 'lobby'].includes(name) ? name : 'menu');
    if (name === 'results') this.showroom.setMode('podium');
    const same = name === this.screenName;
    this.screenName = name;
    this.render(el);
    if (same && keepScroll) {
      const ui = document.getElementById('ui');
      ui.scrollTop = keepScroll;
    }
    this.updateMusic();
  }

  updateMusic() {
    if (document.hidden || !this.sound.ctx) return;
    if (this.race) return; // de race kiest zelf muziek
    this.sound.startMusic(9);
  }

  updateShowroomKart() {
    if (!this.profile || !this.showroom) return;
    const me = this.room && this.room.players.find((p) => p.pid === this.room.you);
    this.showroom.setKart(me ? me.character : this.profile.lastCharacter || DEFAULT_CHARACTER, this.profile.equipped);
  }

  click() { this.sound.unlock(); this.sound.play('click'); }

  saveSettings() {
    saveSettings(this.settings);
    this.sound.applyVolumes();
  }

  confirm(text, okLabel, onOk) {
    modal({ title: null, body: text, buttons: [{ label: 'Annuleren' }, { label: okLabel, cls: 'btn-primary', onClick: onOk }] });
  }

  async share(code, url) {
    const text = `Race mee in Karnemelk Kart! Groepscode: ${code}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Karnemelk Kart', text, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    this.copy(url);
  }

  async copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast('Link gekopieerd! Plak hem in de groepsapp.', 'good');
    } catch {
      modal({ title: 'Deel deze link', body: h('input', { class: 'copybox', value: text, readonly: true, onfocus: (e) => e.target.select() }), buttons: [{ label: 'Sluiten' }] });
    }
  }
}

const app = new App();
window.kk = app; // handig bij het testen
app.boot();
export { isModalOpen };
