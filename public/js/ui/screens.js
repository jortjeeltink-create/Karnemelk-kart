// Alle schermen (menu, inloggen, lobby, winkel, uitslag, instellingen, uitleg).
import { h, toast, modal } from './dom.js';
import { LOGO, MP_ICON, avatarSvg, trackMapSvg, ITEM_ICONS } from '../icons.js';
import { CHARACTERS, CHARACTER_BY_ID } from '../../shared/characters.js';
import { TRACKS, TRACK_BY_ID } from '../../shared/tracks.js';
import { SHOP_ITEMS, SHOP_BY_ID, SLOTS, RARITIES, ownsItem } from '../../shared/shop.js';
import { BOT_LEVELS } from '../../shared/bots.js';
import { MAX_PLAYERS } from '../../shared/constants.js';
import { formatTime } from '../../shared/util.js';
import { ITEM, ITEM_INFO } from '../../shared/items.js';
import { POINTS_RULES } from '../../shared/points.js';
import { getTrack } from '../game/race-client.js';
import { Controls } from '../input.js';

const mp = (n) => h('span', { class: 'mp' }, h('span', { html: MP_ICON }), ` ${n} MP`);

function backBtn(app, to = 'menu', label = 'Terug') {
  return h('button', { class: 'btn btn-ghost back', onclick: () => { app.click(); app.show(to); } }, '‹ ', label);
}

function profileChip(app) {
  const p = app.profile;
  const ch = CHARACTER_BY_ID[p.lastCharacter] || CHARACTERS[0];
  return h('div', { class: 'chip profile-chip' },
    h('span', { class: 'chip-av', html: avatarSvg(ch) }),
    h('span', { class: 'chip-name' }, p.name),
    mp(p.mp));
}

// ---------------- laden ----------------
export function loadingScreen(app, text = 'Verbinden met de server…') {
  return h('section', { class: 'screen center' },
    h('div', { class: 'logo', html: LOGO }),
    h('div', { class: 'card small-card' }, h('div', { class: 'spinner' }), h('p', {}, text)));
}

export function errorScreen(app, title, text) {
  return h('section', { class: 'screen center' },
    h('div', { class: 'logo', html: LOGO }),
    h('div', { class: 'card' }, h('h2', {}, title), h('p', {}, text),
      h('button', { class: 'btn btn-primary', onclick: () => location.reload() }, 'Opnieuw proberen')));
}

// ---------------- inloggen ----------------
export function loginScreen(app) {
  const name = h('input', { id: 'naam', type: 'text', maxlength: '16', autocomplete: 'nickname', autocapitalize: 'words', placeholder: 'Bijv. Jort', enterkeyhint: 'next' });
  const pin = h('input', { id: 'pin', type: 'text', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '4', autocomplete: 'off', placeholder: '••••', class: 'pin', enterkeyhint: 'go' });
  const err = h('p', { class: 'form-error', role: 'alert' });
  const last = app.lastName();
  if (last) name.value = last;
  const submit = (e) => {
    e && e.preventDefault();
    app.sound.unlock();
    const n = name.value.trim();
    const p = pin.value.trim();
    if (n.length < 2) return (err.textContent = 'Vul een naam in van minstens 2 tekens.');
    if (!/^\d{4}$/.test(p)) return (err.textContent = 'Kies een PIN van precies 4 cijfers.');
    err.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Even geduld…';
    app.login(n, p, (msg) => { err.textContent = msg; btn.disabled = false; btn.textContent = 'Start!'; });
  };
  name.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); pin.focus(); } });
  pin.addEventListener('input', () => { pin.value = pin.value.replace(/\D/g, '').slice(0, 4); });
  const btn = h('button', { class: 'btn btn-primary btn-big', type: 'submit' }, 'Start!');
  const invite = app.inviteCode ? h('div', { class: 'invite' }, 'Je bent uitgenodigd voor room ', h('b', {}, app.inviteCode), '!') : null;
  return h('section', { class: 'screen center' },
    h('div', { class: 'logo', html: LOGO }),
    h('form', { class: 'card', onsubmit: submit },
      invite,
      h('h2', {}, 'Wie rijdt er mee?'),
      h('label', { for: 'naam' }, 'Jouw naam'), name,
      h('label', { for: 'pin' }, 'Geheime PIN (4 cijfers)'), pin,
      app.offline ? h('p', { class: 'invite' }, 'Offline-demo: je kunt oefenen tegen computerkarts en de winkel uitproberen. Live racen met vrienden kan via de server.') : null,
      h('p', { class: 'muted small' }, 'Met je naam en PIN worden je MP-punten en spullen bewaard. Op een ander apparaat log je in met dezelfde naam en PIN. Nieuw? Dan maken we meteen een profiel voor je.'),
      err, btn));
}

// ---------------- hoofdmenu ----------------
export function menuScreen(app) {
  app.showroom.setMode('menu');
  app.showroom.previewPose = false;
  app.updateShowroomKart();
  const off = app.offline;
  return h('section', { class: 'screen menu' },
    h('div', { class: 'topbar' }, profileChip(app)),
    h('div', { class: 'logo logo-menu', html: LOGO }),
    h('div', { class: 'card menu-card' },
      h('button', { class: 'btn btn-primary btn-big', disabled: off, onclick: () => { app.click(); app.createRoom(false); } },
        h('span', {}, 'Room maken'), h('small', {}, off ? 'Kan alleen met de server' : `Race live met maximaal ${MAX_PLAYERS} vrienden`)),
      h('button', { class: 'btn btn-blue btn-big', disabled: off, onclick: () => { app.click(); app.show('join'); } },
        h('span', {}, 'Meedoen met code'), h('small', {}, off ? 'Kan alleen met de server' : 'Vul de groepscode van je vriend in')),
      h('div', { class: 'row menu-row' },
        h('button', { class: 'btn btn-green btn-mid', onclick: () => { app.click(); app.createRoom(true); } }, h('span', {}, 'Oefenen'), h('small', {}, 'tegen bots')),
        h('button', { class: 'btn btn-yellow btn-mid', onclick: () => { app.click(); app.show('shop'); } }, h('span', {}, 'Winkel'), h('small', {}, 'capes en meer'))),
      h('div', { class: 'row menu-row' },
        h('button', { class: 'btn btn-small', onclick: () => { app.click(); app.show('settings'); } }, 'Instellingen'),
        h('button', { class: 'btn btn-small', onclick: () => { app.click(); app.show('help'); } }, 'Uitleg')),
      h('p', { class: 'muted small center-text' },
        `Races: ${app.profile.stats.races || 0} • Gewonnen: ${app.profile.stats.wins || 0} • Podium: ${app.profile.stats.podiums || 0}`,
        off ? null : h('button', { class: 'linkbtn', onclick: () => app.confirm('Wil je uitloggen op dit apparaat? Je punten blijven bewaard.', 'Uitloggen', () => app.logout()) }, 'Uitloggen'))));
}

// ---------------- meedoen ----------------
export function joinScreen(app) {
  const input = h('input', { class: 'code-input', type: 'text', maxlength: '4', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'ABCD', enterkeyhint: 'go', 'aria-label': 'Groepscode' });
  const err = h('p', { class: 'form-error', role: 'alert' });
  input.addEventListener('input', () => { input.value = input.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); err.textContent = ''; });
  const go = (e) => {
    e.preventDefault();
    if (input.value.length !== 4) { err.textContent = 'Een groepscode heeft 4 letters.'; return; }
    app.joinRoom(input.value, (msg) => { err.textContent = msg; });
  };
  setTimeout(() => input.focus(), 50);
  return h('section', { class: 'screen center' },
    h('form', { class: 'card', onsubmit: go },
      backBtn(app),
      h('h2', {}, 'Meedoen met een room'),
      h('p', {}, 'Vraag de groepscode aan degene die de room heeft gemaakt.'),
      input, err,
      h('button', { class: 'btn btn-primary btn-big', type: 'submit' }, 'Meedoen!')));
}

// ---------------- lobby ----------------
export function lobbyScreen(app) {
  const room = app.room;
  const youHost = room.host === room.you;
  const s = room.settings;
  const me = room.players.find((p) => p.pid === room.you) || {};
  app.showroom.setMode('lobby');
  app.showroom.setKart(me.character, me.cosmetics);
  const shareUrl = `${location.origin}/?room=${room.code}`;

  const header = room.practice
    ? h('div', { class: 'lobby-head' }, h('h2', {}, 'Oefenen'), h('p', { class: 'muted small' }, 'Race alleen of tegen computerkarts. Je verdient de helft van de normale MP-punten.'))
    : h('div', { class: 'lobby-head' },
      h('div', { class: 'muted small' }, 'Groepscode'),
      h('div', { class: 'code-big', 'aria-label': `Groepscode ${room.code.split('').join(' ')}` }, room.code.split('').map((c) => h('span', {}, c))),
      h('div', { class: 'row' },
        h('button', { class: 'btn btn-blue', onclick: () => app.share(room.code, shareUrl) }, 'Deel link'),
        h('button', { class: 'btn', onclick: () => app.copy(shareUrl) }, 'Kopieer link')),
      h('p', { class: 'muted small' }, 'Vrienden openen de link in Safari (of een andere browser) en kiezen een naam. Geen app nodig.'));

  const humans = room.players.length;
  const players = h('div', { class: 'players' },
    h('div', { class: 'section-title' }, `Spelers ${humans + (s.bots || 0)}/${room.max}`),
    room.players.map((p) => {
      const ch = CHARACTER_BY_ID[p.character] || CHARACTERS[0];
      return h('div', { class: `player${p.pid === room.you ? ' me' : ''}${p.connected ? '' : ' off'}` },
        h('span', { class: 'av', html: avatarSvg(ch) }),
        h('span', { class: 'pname' }, p.name, p.host ? h('span', { class: 'tag tag-host' }, 'host') : null),
        h('span', { class: 'pstatus' },
          !p.connected ? h('span', { class: 'tag tag-off' }, 'verbinding weg…')
            : room.state === 'race' && !p.racing ? h('span', { class: 'tag' }, 'kijkt mee')
              : p.host ? null
                : p.ready ? h('span', { class: 'tag tag-ready' }, 'klaar ✓') : h('span', { class: 'tag tag-wait' }, 'nog niet klaar')),
        youHost && p.pid !== room.you && !room.practice
          ? h('button', { class: 'xbtn', 'aria-label': `${p.name} verwijderen`, onclick: () => app.confirm(`${p.name} uit de room verwijderen?`, 'Verwijderen', () => app.send({ t: 'kick', pid: p.pid })) }, '×') : null);
    }),
    s.bots ? h('div', { class: 'player bots' }, h('span', { class: 'av av-bot' }, '🤖'), h('span', { class: 'pname' }, `${s.bots} computerkart${s.bots > 1 ? 's' : ''}`), h('span', { class: 'tag' }, BOT_LEVELS[s.botLevel].name)) : null);

  const chars = h('div', { class: 'chars' }, CHARACTERS.map((c) => h('button', {
    class: `charcard${me.character === c.id ? ' sel' : ''}`, 'aria-pressed': me.character === c.id ? 'true' : 'false',
    onclick: () => { app.click(); app.send({ t: 'char', id: c.id }); },
  }, h('span', { html: avatarSvg(c) }), h('b', {}, c.name.split(' ')[0]))));
  const charInfo = CHARACTER_BY_ID[me.character];

  const track = TRACK_BY_ID[s.trackId];
  const trackSection = youHost
    ? h('div', { class: 'tracks' },
      [...TRACKS.map((t) => h('button', {
        class: `trackcard theme-${t.theme}${s.trackId === t.id ? ' sel' : ''}`,
        onclick: () => { app.click(); app.send({ t: 'settings', settings: { trackId: t.id } }); },
      }, h('span', { class: 'map', html: trackMapSvg(getTrack(t.id)) }), h('b', {}, t.name), h('small', {}, t.place))),
      h('button', { class: `trackcard theme-random${s.trackId === 'random' ? ' sel' : ''}`, onclick: () => { app.click(); app.send({ t: 'settings', settings: { trackId: 'random' } }); } },
        h('span', { class: 'map big-q' }, '?'), h('b', {}, 'Willekeurig'), h('small', {}, 'Verrassing!'))])
    : h('div', { class: `trackcard wide theme-${track ? track.theme : 'random'}` },
      track ? h('span', { class: 'map', html: trackMapSvg(getTrack(track.id)) }) : h('span', { class: 'map big-q' }, '?'),
      h('div', {}, h('b', {}, track ? track.name : 'Willekeurige baan'), h('small', {}, track ? `${track.place} — ${track.desc}` : 'De host laat het lot beslissen.')));

  const maxBots = Math.max(0, room.max - humans);
  const hostSettings = youHost ? h('div', { class: 'settings-box' },
    h('div', { class: 'setrow' }, h('span', {}, 'Computerkarts'),
      h('div', { class: 'stepper' },
        h('button', { class: 'btn btn-small', 'aria-label': 'Minder', disabled: s.bots <= 0, onclick: () => app.send({ t: 'settings', settings: { bots: s.bots - 1 } }) }, '−'),
        h('b', {}, String(s.bots)),
        h('button', { class: 'btn btn-small', 'aria-label': 'Meer', disabled: s.bots >= maxBots, onclick: () => app.send({ t: 'settings', settings: { bots: s.bots + 1 } }) }, '+'))),
    s.bots ? h('div', { class: 'setrow' }, h('span', {}, 'Niveau'),
      h('div', { class: 'seg' }, Object.entries(BOT_LEVELS).map(([k, v]) => h('button', { class: s.botLevel === k ? 'on' : '', onclick: () => app.send({ t: 'settings', settings: { botLevel: k } }) }, v.name)))) : null,
    h('div', { class: 'setrow' }, h('span', {}, 'Uitdaging voor de verliezer'),
      h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: s.challengeOn, onchange: (e) => app.send({ t: 'settings', settings: { challengeOn: e.target.checked } }) }), h('i'))),
    s.challengeOn ? (() => {
      const inp = h('input', { type: 'text', maxlength: '80', value: s.challengeText, 'aria-label': 'Uitdaging' });
      inp.addEventListener('change', () => app.send({ t: 'settings', settings: { challengeText: inp.value } }));
      return h('div', { class: 'setrow col' }, inp, h('small', { class: 'muted' }, 'Pas de uitdaging aan als je wilt. Na de race kan de verliezer hem nog overslaan of wisselen.'));
    })() : null)
    : h('p', { class: 'muted small' }, s.challengeOn ? `Uitdaging voor de verliezer: ${s.challengeText}` : 'Geen uitdaging voor de verliezer deze keer.');

  const notReady = room.players.filter((p) => p.connected && !p.host && !p.ready).length;
  let action;
  if (room.state === 'race') action = h('div', { class: 'muted' }, 'De race is bezig… je kijkt mee.');
  else if (youHost) {
    action = h('button', { class: 'btn btn-primary btn-big grow', onclick: () => { app.click(); app.send({ t: 'start' }); } },
      room.practice ? 'Start de race!' : notReady ? `Start race (${notReady} nog niet klaar)` : 'Start de race!');
  } else {
    action = h('button', { class: `btn btn-big grow ${me.ready ? 'btn-green' : 'btn-primary'}`, onclick: () => { app.click(); app.send({ t: 'ready', on: !me.ready }); } },
      me.ready ? 'Klaar! (tik om te annuleren)' : 'Ik ben klaar!');
  }

  return h('section', { class: 'screen lobby' },
    h('div', { class: 'card lobby-card' },
      h('div', { class: 'row space' }, h('button', { class: 'btn btn-ghost back', onclick: () => app.confirm('Weet je zeker dat je de room wilt verlaten?', 'Verlaten', () => app.leaveRoom()) }, '‹ Verlaten'), profileChip(app)),
      header,
      players,
      h('div', { class: 'section-title' }, 'Kies je coureur'),
      chars,
      charInfo ? h('p', { class: 'muted small' }, h('b', {}, charInfo.name), ' — ', charInfo.desc, ' Alle coureurs zijn even snel.') : null,
      h('div', { class: 'section-title' }, youHost ? 'Kies de baan' : 'Baan'),
      trackSection,
      youHost && track ? h('p', { class: 'muted small' }, track.desc) : null,
      h('div', { class: 'section-title' }, youHost ? 'Instellingen' : 'Uitdaging'),
      hostSettings,
      h('button', { class: 'linkbtn', onclick: () => app.show('shop', { back: 'lobby' }) }, 'Naar de winkel (uiterlijk aanpassen)')),
    h('div', { class: 'actionbar' }, action));
}

// ---------------- uitslag ----------------
export function resultsScreen(app) {
  const r = app.results;
  const room = app.room;
  const youHost = room && room.host === room.you;
  const youPid = room ? room.you : null;
  app.showroom.setPodium(r.rows);
  const myRow = r.rows.find((x) => x.id === youPid);
  const ch = app.challenge;
  const canChange = ch && (ch.loser === youPid || youHost);

  const rows = h('ol', { class: 'results' }, r.rows.map((row) => {
    const c = CHARACTER_BY_ID[row.character] || CHARACTERS[0];
    const details = h('div', { class: 'parts hidden' }, (row.parts || []).map((p) => h('div', {}, `${p.label}: ${p.mp > 0 ? '+' : ''}${p.mp} MP`)));
    return h('li', { class: `res${row.id === youPid ? ' me' : ''}${row.place <= 3 ? ' p' + row.place : ''}`, onclick: () => details.classList.toggle('hidden') },
      h('span', { class: 'rplace' }, row.place),
      h('span', { class: 'av', html: avatarSvg(c) }),
      h('span', { class: 'rname' }, row.name, h('small', {}, row.finished ? formatTime(row.time) + (row.bestLap ? `  •  beste ronde ${formatTime(row.bestLap)}` : '') : 'niet uitgereden')),
      h('span', { class: 'rmp' }, row.isBot ? h('small', { class: 'muted' }, 'bot') : `+${row.mp} MP`),
      details);
  }));

  const challengeCard = r.loser && ch ? h('div', { class: `challenge${ch.skipped ? ' skipped' : ''}${ch.done ? ' done' : ''}` },
    h('div', { class: 'ch-title' }, ch.loser === youPid ? 'Jij bent de verliezer…' : `Verliezer: ${r.loser.name}`),
    h('div', { class: 'ch-text' }, ch.skipped ? 'Uitdaging overgeslagen. Volgende keer beter!' : ch.done ? `${ch.text} — gedaan! 🎉` : ch.text),
    canChange && !ch.skipped && !ch.done ? h('div', { class: 'row' },
      h('button', { class: 'btn btn-small', onclick: () => app.send({ t: 'challenge', action: 'next' }) }, 'Andere uitdaging'),
      h('button', { class: 'btn btn-small', onclick: () => app.send({ t: 'challenge', action: 'skip' }) }, 'Overslaan'),
      h('button', { class: 'btn btn-small btn-green', onclick: () => app.send({ t: 'challenge', action: 'done' }) }, 'Gedaan!')) : null)
    : r.loser ? h('div', { class: 'challenge' }, h('div', { class: 'ch-title' }, `Laatste mens: ${r.loser.name}`), h('div', { class: 'ch-text small' }, 'Geen uitdaging deze keer.')) : null;

  let actions;
  if (!room) actions = [h('button', { class: 'btn btn-primary grow', onclick: () => app.show('menu') }, 'Naar het menu')];
  else if (youHost) {
    actions = [
      h('button', { class: 'btn btn-primary btn-big grow', onclick: () => { app.click(); app.send({ t: 'again' }); } }, 'Opnieuw racen'),
      h('button', { class: 'btn', onclick: () => { app.click(); app.send({ t: 'lobby' }); } }, room.practice ? 'Andere baan' : 'Naar lobby'),
    ];
  } else {
    actions = [h('div', { class: 'muted grow center-text' }, 'Wachten op de host voor de volgende race…')];
  }

  return h('section', { class: 'screen results-screen' },
    h('div', { class: 'card results-card' },
      h('div', { class: 'winner' },
        h('div', { class: 'trophy', 'aria-hidden': 'true' }, '🏆'),
        h('div', {}, h('small', {}, r.practice ? 'Oefenrace — winnaar' : 'Winnaar'), h('b', {}, r.winner.name))),
      myRow ? h('div', { class: 'earned' }, 'Jij verdient ', h('b', {}, `+${myRow.mp} MP`), ` • totaal ${app.profile ? app.profile.mp : '?'} MP`) : null,
      challengeCard,
      rows,
      h('p', { class: 'muted small center-text' }, 'Tik op een rij voor de puntenberekening.')),
    h('div', { class: 'actionbar' }, actions,
      room ? h('button', { class: 'btn btn-ghost', onclick: () => app.confirm('Room verlaten?', 'Verlaten', () => app.leaveRoom()) }, 'Stoppen') : null));
}

// ---------------- winkel ----------------
export function shopScreen(app, opts = {}) {
  const p = app.profile;
  const tab = app.shopTab || 'cape';
  const back = opts.back || app.shopBack || 'menu';
  app.shopBack = back;
  app.showroom.setMode('shop');
  const preview = app.shopPreview;
  const eq = { ...p.equipped };
  const show = { ...eq };
  if (preview && SHOP_BY_ID[preview]) show[SHOP_BY_ID[preview].slot] = preview;
  app.showroom.setKart(p.lastCharacter || 'kees', show);
  app.showroom.previewPose = tab === 'pose';

  const items = SHOP_ITEMS.filter((i) => i.slot === tab).sort((a, b) => (a.price - b.price));
  const grid = h('div', { class: 'shopgrid' }, items.map((it) => {
    const owned = ownsItem(p, it.id);
    const worn = eq[it.slot] === it.id;
    const rar = RARITIES[it.rarity];
    const short = !owned && p.mp < it.price;
    let btn;
    if (worn) btn = h('span', { class: 'state worn' }, 'Gedragen ✓');
    else if (owned) btn = h('button', { class: 'btn btn-small btn-green', onclick: (e) => { e.stopPropagation(); app.click(); app.send({ t: 'equip', id: it.id }); } }, 'In bezit • Dragen');
    else btn = h('button', {
      class: `btn btn-small ${short ? 'btn-disabled' : 'btn-primary'}`, 'aria-disabled': short ? 'true' : 'false',
      onclick: (e) => {
        e.stopPropagation();
        if (short) { app.sound.play('error'); toast(`Te weinig MP-punten: je hebt er ${p.mp}, je hebt er ${it.price} nodig.`, 'error'); return; }
        app.confirm(`${it.name} (${rar.name}) kopen voor ${it.price} MP?`, 'Kopen', () => app.send({ t: 'buy', id: it.id }));
      },
    }, short ? `Te weinig MP (${it.price})` : `Kopen • ${it.price} MP`);
    return h('div', {
      class: `shopcard rar-${it.rarity}${preview === it.id ? ' sel' : ''}${worn ? ' worn' : ''}`, style: { '--rar': rar.color },
      onclick: () => { app.shopPreview = it.id; app.show('shop'); },
    },
    h('span', { class: 'swatch', html: swatch(it) }),
    h('b', {}, it.name),
    h('span', { class: 'rar' }, rar.name),
    h('span', { class: 'price' }, it.free ? 'Gratis' : `${it.price} MP`),
    btn);
  }));

  return h('section', { class: 'screen shop' },
    h('div', { class: 'card shop-card' },
      h('div', { class: 'row space' }, backBtn(app, back), mp(p.mp)),
      h('h2', {}, 'Winkel'),
      h('p', { class: 'muted small' }, 'Alles is alleen uiterlijk: je wordt er niet sneller van. Andere spelers zien jouw spullen tijdens de race. Tik op een item om het te bekijken.'),
      h('div', { class: 'tabs' }, Object.entries(SLOTS).map(([k, v]) => h('button', { class: tab === k ? 'on' : '', onclick: () => { app.shopTab = k; app.shopPreview = null; app.show('shop'); } }, v))),
      grid,
      h('div', { class: 'legend' }, Object.values(RARITIES).map((r) => h('span', { style: { '--rar': r.color } }, r.name)))));
}

function swatch(it) {
  const l = it.look;
  if (it.slot === 'cape') {
    if (!l) return '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="none" stroke="#bbb" stroke-width="3"/><path d="M10 30 L30 10" stroke="#bbb" stroke-width="3"/></svg>';
    const fill = l.pattern === 'regenboog' ? 'url(#rb)' : l.pattern === 'goud' ? 'url(#gd)' : l.colors[0];
    return `<svg viewBox="0 0 40 40"><defs><linearGradient id="rb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff595e"/><stop offset=".25" stop-color="#ffca3a"/><stop offset=".5" stop-color="#8ac926"/><stop offset=".75" stop-color="#1982c4"/><stop offset="1" stop-color="#6a4c93"/></linearGradient><linearGradient id="gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3a0"/><stop offset=".5" stop-color="#ffcf33"/><stop offset="1" stop-color="#c98a00"/></linearGradient></defs><path d="M12 6 L28 6 L34 34 Q20 30 6 34 Z" fill="${fill}" stroke="rgba(0,0,0,.25)"/>${l.pattern === 'stippen' ? '<circle cx="15" cy="16" r="2" fill="#fff"/><circle cx="24" cy="22" r="2" fill="#fff"/><circle cx="18" cy="28" r="2" fill="#fff"/>' : ''}${l.pattern === 'sterren' ? '<circle cx="15" cy="15" r="1.5" fill="#ffe066"/><circle cx="25" cy="20" r="1.2" fill="#fff"/><circle cx="19" cy="27" r="1.5" fill="#fff"/>' : ''}</svg>`;
  }
  if (it.slot === 'kleur') {
    const c = l ? l.color : '#3a8ef6';
    return `<svg viewBox="0 0 40 40"><rect x="5" y="14" width="30" height="12" rx="5" fill="${c}" stroke="rgba(0,0,0,.25)"/>${l && l.pattern === 'koe' ? '<circle cx="14" cy="19" r="3" fill="#111"/><circle cx="26" cy="21" r="2.5" fill="#111"/>' : ''}<circle cx="11" cy="28" r="4" fill="#222"/><circle cx="29" cy="28" r="4" fill="#222"/>${l && l.glow ? '<rect x="5" y="14" width="30" height="12" rx="5" fill="none" stroke="#ffb000" stroke-width="2"/>' : ''}</svg>`;
  }
  if (it.slot === 'banden') {
    const c = l ? l.rim : '#d0d4da';
    return `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="#222"/><circle cx="20" cy="20" r="7" fill="${c}"/>${l && l.glow ? `<circle cx="20" cy="20" r="9" fill="none" stroke="${l.glow}" stroke-width="2"/>` : ''}${l && l.particles ? `<circle cx="34" cy="10" r="2" fill="${c}"/><circle cx="36" cy="18" r="1.5" fill="${c}"/>` : ''}</svg>`;
  }
  if (it.slot === 'spoor') {
    if (!l) return '<svg viewBox="0 0 40 40"><path d="M6 30 Q20 10 34 22" stroke="#ccc" stroke-width="3" fill="none" stroke-dasharray="3 4"/></svg>';
    const cols = l.colors;
    return `<svg viewBox="0 0 40 40">${cols.map((c, i) => `<path d="M4 ${26 + i * 2 - cols.length} ${l.zigzag ? 'L12 18 L20 26 L28 18 L36 26' : 'Q20 8 36 20'}" stroke="${c}" stroke-width="${cols.length > 1 ? 2.5 : 5}" fill="none" stroke-linecap="round"/>`).join('')}</svg>`;
  }
  const poses = { duim: '👍', zwaai: '👋', dans: '🕺', proost: '🥛', salto: '🤸' };
  return `<span class="emoji">${poses[l ? l.pose : 'duim']}</span>`;
}

// ---------------- instellingen ----------------
export function settingsScreen(app) {
  const s = app.settings;
  const set = (k, v, rerender = false) => { s[k] = v; app.saveSettings(); if (rerender) app.show('settings'); };
  const slider = (k, label) => h('div', { class: 'setrow' }, h('label', { for: `s-${k}` }, label),
    h('input', { id: `s-${k}`, type: 'range', min: '0', max: '1', step: '0.05', value: String(s[k]), oninput: (e) => set(k, +e.target.value) }));
  const toggle = (k, label, sub) => h('div', { class: 'setrow' }, h('span', {}, label, sub ? h('small', { class: 'muted block' }, sub) : null),
    h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: !!s[k], onchange: (e) => set(k, e.target.checked, true) }), h('i')));
  const seg = (k, label, opts) => h('div', { class: 'setrow col' }, h('span', {}, label),
    h('div', { class: 'seg' }, opts.map(([v, t]) => h('button', {
      class: s[k] === v ? 'on' : '',
      onclick: async () => {
        if (k === 'controls' && v === 'kantelen') {
          const ok = await Controls.requestTilt();
          if (!ok) { toast('Kantelen werkt niet: geef toestemming voor beweging, of gebruik een https-link.', 'error', 4500); return; }
        }
        set(k, v, true);
        if (k === 'quality') app.engine.applyQuality();
      },
    }, t))));
  return h('section', { class: 'screen center' },
    h('div', { class: 'card' },
      backBtn(app, app.settingsBack || 'menu'),
      h('h2', {}, 'Instellingen'),
      h('div', { class: 'section-title' }, 'Geluid'),
      toggle('muted', 'Alles stil'),
      slider('music', 'Muziek'),
      slider('sfx', 'Geluidseffecten'),
      h('div', { class: 'section-title' }, 'Besturing'),
      seg('controls', 'Sturen met', [['knoppen', 'Knoppen'], ['schuif', 'Schuifbalk'], ['kantelen', 'Kantelen']]),
      s.controls === 'kantelen' ? toggle('tiltInvert', 'Kantelrichting omdraaien', 'Gebruik dit als sturen precies verkeerd om gaat.') : null,
      toggle('autoGas', 'Automatisch gas geven', 'Aan: je rijdt vanzelf. Uit: je krijgt een GAS-knop.'),
      toggle('lefty', 'Linkshandig', 'Sturen rechts, knoppen links.'),
      toggle('vibrate', 'Trillen bij botsingen', 'Werkt op Android; iPhones ondersteunen dit niet in de browser.'),
      h('div', { class: 'section-title' }, 'Beeld'),
      seg('quality', 'Grafische kwaliteit', [['auto', 'Automatisch'], ['laag', 'Laag'], ['normaal', 'Normaal'], ['hoog', 'Hoog']]),
      toggle('names', 'Namen boven karts'),
      toggle('minimap', 'Minikaart tonen'),
      h('p', { class: 'muted small' }, 'Tip: zet de game op je beginscherm (Safari: deelknop → "Zet op beginscherm") voor een volledig scherm.')));
}

// ---------------- uitleg ----------------
export function helpScreen(app) {
  const it = (code) => h('div', { class: 'helpitem' }, h('span', { class: 'hi-icon', html: ITEM_ICONS[code] }), h('div', {}, h('b', {}, ITEM_INFO[code].name), h('p', {}, ITEM_INFO[code].desc)));
  return h('section', { class: 'screen center' },
    h('div', { class: 'card help' },
      backBtn(app),
      h('h2', {}, 'Hoe speel je?'),
      h('h3', {}, 'Rijden'),
      h('p', {}, 'Je kart geeft automatisch gas. Stuur met de pijltjes links onderin (of schuif/kantel, zie Instellingen). Op een toetsenbord: pijltjes of WASD, spatie = drift, E = item.'),
      h('h3', {}, 'Driften en turbo'),
      h('p', {}, 'Houd DRIFT ingedrukt terwijl je een bocht in stuurt. Hoe langer je drift, hoe meer vonkjes: wit, geel en roze. Laat los voor een turbo!'),
      h('p', {}, 'Raketstart: druk op DRIFT vlak voordat START verschijnt.'),
      h('h3', {}, 'Items'),
      h('p', {}, 'Rijd door een regenboog-melkpak voor een item. Wie achteraan rijdt, krijgt betere items.'),
      [ITEM.TURBO, ITEM.TURBO3, ITEM.SCHILD, ITEM.PLAS, ITEM.KLOMP].map(it),
      h('h3', {}, 'Botsen'),
      h('p', {}, 'Ram een andere kart om hem af te remmen en opzij te duwen. Wie het hardst aankomt, wint de botsing. Met een Kaasschild ben je onaantastbaar.'),
      h('h3', {}, 'MP-punten'),
      h('p', {}, `Na elke race: ${POINTS_RULES.finish} MP voor uitrijden, plus een plaatsbonus. Hoe meer spelers, hoe groter de bonus (winnaar van 10 vrienden: 120 MP). Snelste ronde: +${POINTS_RULES.fastestLap} MP. Niet uitgereden: ${POINTS_RULES.dnf} MP. Oefenen levert de helft op.`),
      h('h3', {}, 'Winkel'),
      h('p', {}, 'Koop capes, kartkleuren, bandeneffecten, lichtsporen en overwinningsposes. Zeldzaamheid: Gewoon, Ongewoon, Zeldzaam, Episch en Legendarisch. De Gouden cape is het enige Legendarische item.'),
      h('h3', {}, 'De verliezer'),
      h('p', {}, 'Wie als laatste mens binnenkomt, krijgt een grappige uitdaging, zoals een atje karnemelk. De verliezer of de host kan hem overslaan of een andere kiezen.')));
}
