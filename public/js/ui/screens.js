// Alle schermen (menu, inloggen, lobby, winkel, uitslag, instellingen, uitleg).
import { h, toast, modal } from './dom.js';
import { LOGO, MP_ICON, avatarFor, humanAvatar, trackMapSvg, ITEM_ICONS } from '../icons.js';
import { CHARACTERS, CHARACTER_BY_ID } from '../../shared/characters.js';
import { TRACKS, TRACK_BY_ID } from '../../shared/tracks.js';
import { SHOP_ITEMS, SHOP_BY_ID, SHOP_TABS, RARITIES, ownsItem } from '../../shared/shop.js';
import { BOT_LEVELS } from '../../shared/bots.js';
import { MAX_PLAYERS } from '../../shared/constants.js';
import { formatTime } from '../../shared/util.js';
import { ITEM, ITEM_INFO } from '../../shared/items.js';
import { POINTS_RULES } from '../../shared/points.js';
import { getTrack } from '../game/race-client.js';
import { Controls } from '../input.js';
import { SKIN_COLORS, HAIR_COLORS, SHIRT_COLORS, HAIR_STYLES, HEIGHTS, BUILDS, GLASSES, FACIAL, cleanLook } from '../../shared/look.js';
import { DAILY_BONUS } from '../../shared/profiles.js';

const mp = (n) => h('span', { class: 'mp' }, h('span', { html: MP_ICON }), ` ${n} MP`);

function backBtn(app, to = 'menu', label = 'Terug') {
  return h('button', { class: 'btn btn-ghost back', onclick: () => { app.click(); app.show(to); } }, '‹ ', label);
}

function profileChip(app) {
  const p = app.profile;
  return h('div', { class: 'chip profile-chip' },
    h('span', { class: 'chip-av', html: avatarFor(p.lastCharacter || 'kees', p.look) }),
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

// ---------------- naam kiezen (geen wachtwoord: deze telefoon onthoudt je) ----------------
export function loginScreen(app) {
  const transferMode = !!app.transferMode && !app.offline;
  const err = h('p', { class: 'form-error', role: 'alert' });
  const invite = app.inviteCode ? h('div', { class: 'invite' }, 'Je bent uitgenodigd voor room ', h('b', {}, app.inviteCode), '!') : null;
  let form;
  if (!transferMode) {
    const name = h('input', { id: 'naam', type: 'text', maxlength: '16', autocomplete: 'nickname', autocapitalize: 'words', placeholder: 'Bijv. Jort', enterkeyhint: 'go' });
    const last = app.lastName();
    if (last) name.value = last;
    const btn = h('button', { class: 'btn btn-primary btn-big', type: 'submit' }, 'Start!');
    const submit = (e) => {
      e.preventDefault();
      app.sound.unlock();
      const n = name.value.trim();
      if (n.length < 2) { err.textContent = 'Vul een naam in van minstens 2 tekens.'; return; }
      err.textContent = '';
      btn.disabled = true;
      btn.textContent = 'Even geduld…';
      app.register(n, (msg) => { err.textContent = msg; btn.disabled = false; btn.textContent = 'Start!'; });
    };
    form = h('form', { class: 'card', onsubmit: submit },
      invite,
      h('h2', {}, 'Hoe heet je?'),
      h('label', { for: 'naam' }, 'Jouw naam'), name,
      app.offline ? h('p', { class: 'invite' }, 'Offline-demo: je kunt oefenen tegen computerkarts en de winkel uitproberen. Live racen met vrienden kan via de server.') : null,
      h('p', { class: 'muted small' }, 'Deze telefoon onthoudt je. Je MP-punten en spullen blijven hier bewaard, je hoeft geen code of wachtwoord te onthouden.'),
      err, btn,
      app.offline ? null : h('button', { class: 'linkbtn', type: 'button', onclick: () => { app.transferMode = true; app.show('login'); } }, 'Al MP-punten op een andere telefoon? Zet ze over'));
  } else {
    const code = h('input', { id: 'overzetcode', class: 'code-input code6', type: 'text', maxlength: '6', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'ABC123', enterkeyhint: 'go', 'aria-label': 'Overzetcode' });
    code.addEventListener('input', () => { code.value = code.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); err.textContent = ''; });
    const btn = h('button', { class: 'btn btn-primary btn-big', type: 'submit' }, 'Overzetten');
    const submit = (e) => {
      e.preventDefault();
      if (code.value.length !== 6) { err.textContent = 'Een overzetcode heeft 6 tekens.'; return; }
      btn.disabled = true;
      app.useTransfer(code.value, (msg) => { err.textContent = msg; btn.disabled = false; });
    };
    form = h('form', { class: 'card', onsubmit: submit },
      h('button', { class: 'btn btn-ghost back', type: 'button', onclick: () => { app.transferMode = false; app.show('login'); } }, '‹ Terug'),
      h('h2', {}, 'Punten overzetten'),
      h('p', {}, 'Open de game op je oude telefoon, ga naar Instellingen en tik op "Maak overzetcode". Vul die code hier in.'),
      code, err, btn);
  }
  return h('section', { class: 'screen center' }, h('div', { class: 'logo', html: LOGO }), form);
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
        h('button', { class: 'btn btn-pink btn-small', onclick: () => { app.click(); app.show('creator', { back: 'menu' }); } }, 'Mijn coureur'),
        h('button', { class: 'btn btn-small', onclick: () => { app.click(); app.show('settings'); } }, 'Instellingen')),
      app.profile.dailyReady ? h('div', { class: 'daily' }, `Dagbonus: +${DAILY_BONUS} MP bij je eerste race van vandaag`) : null,
      h('p', { class: 'muted small center-text' },
        `Races: ${app.profile.stats.races || 0} • Gewonnen: ${app.profile.stats.wins || 0} • Podium: ${app.profile.stats.podiums || 0} • `,
        h('button', { class: 'linkbtn inline', onclick: () => { app.click(); app.show('help'); } }, 'Hoe speel je?'))));
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
  app.showroom.setKart(me.character, me.cosmetics, me.look);
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
      return h('div', { class: `player${p.pid === room.you ? ' me' : ''}${p.connected ? '' : ' off'}` },
        h('span', { class: 'av', html: avatarFor(p.character, p.look) }),
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

  const order = [CHARACTER_BY_ID.eigen, ...CHARACTERS.filter((c) => c.special), ...CHARACTERS.filter((c) => !c.custom && !c.special)];
  const chars = h('div', { class: 'chars' }, order.map((c) => {
    const locked = c.special && !ownsItem(app.profile, c.special);
    const item = c.special ? SHOP_BY_ID[c.special] : null;
    return h('button', {
      class: `charcard${me.character === c.id ? ' sel' : ''}${c.custom ? ' custom' : ''}${c.special ? ' special' : ''}${locked ? ' locked' : ''}`, 'aria-pressed': me.character === c.id ? 'true' : 'false',
      onclick: () => {
        app.click();
        if (!locked) { app.send({ t: 'char', id: c.id }); return; }
        if (app.profile.mp < item.price) { app.sound.play('error'); toast(`${c.name} kost ${item.price} MP. Je hebt er ${app.profile.mp}; nog even racen!`, 'error'); return; }
        app.confirm(`${c.name} is een special. Kopen voor ${item.price} MP? In de race heet je dan "${c.name} (${app.profile.name})".`, 'Kopen', () => app.send({ t: 'buy', id: c.special }));
      },
    }, h('span', { html: avatarFor(c.id, me.look) }), h('b', {}, c.custom ? 'Mijn coureur' : c.name.split(' ')[0]),
    locked ? h('small', { class: 'lock' }, `🔒 ${item.price} MP`) : c.special ? h('small', { class: 'lock owned' }, 'special') : null);
  }));
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
      charInfo ? h('p', { class: 'muted small' }, h('b', {}, charInfo.name), ' — ', charInfo.desc, charInfo.special ? ` Je racet als "${charInfo.name} (${me.name})".` : '', ' Alle coureurs zijn even snel.') : null,
      h('button', { class: 'btn btn-pink btn-small', onclick: () => { app.click(); app.show('creator', { back: 'lobby' }); } }, 'Mijn coureur aanpassen'),
      h('div', { class: 'section-title' }, youHost ? 'Kies de baan' : 'Baan'),
      trackSection,
      youHost && track ? h('p', { class: 'muted small' }, track.desc) : null,
      h('div', { class: 'section-title' }, youHost ? 'Instellingen' : 'Uitdaging'),
      hostSettings,
      h('button', { class: 'linkbtn', onclick: () => app.show('shop', { back: 'lobby' }) }, 'Naar de winkel (karts, hoeden, capes en meer)')),
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
    const details = h('div', { class: 'parts hidden' }, (row.parts || []).map((p) => h('div', {}, `${p.label}: ${p.mp > 0 ? '+' : ''}${p.mp} MP`)));
    return h('li', { class: `res${row.id === youPid ? ' me' : ''}${row.place <= 3 ? ' p' + row.place : ''}`, onclick: () => details.classList.toggle('hidden') },
      h('span', { class: 'rplace' }, row.place),
      h('span', { class: 'av', html: avatarFor(row.character, row.look) }),
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

  // de winnaar kiest wie er ook een atje moet doen
  const pk = app.pick;
  let pickCard = null;
  if (pk) {
    const isWinner = pk.winner === youPid;
    const left = h('span', { class: 'pick-count' });
    const tickLeft = () => {
      const s = Math.max(0, Math.ceil((pk.deadline - app.net.serverNow()) / 1000));
      left.textContent = `nog ${s} s`;
      if (document.body.contains(left) && pk.state === 'kiezen' && app.pick === pk) setTimeout(tickLeft, 500);
    };
    if (pk.state === 'kiezen') setTimeout(tickLeft, 0);
    const targetName = pk.target ? (pk.names.find((x) => x.id === pk.target) || {}).name : '';
    if (pk.state === 'kiezen' && isWinner) {
      pickCard = h('div', { class: 'pick-card mine' },
        h('div', { class: 'ch-title' }, '🏆 Je bent de winnaar!'),
        h('div', { class: 'ch-text' }, 'Kies wie er óók een atje karnemelk moet doen:'),
        h('div', { class: 'pick-names' }, pk.options.map((o) => h('button', {
          class: 'btn btn-pick', onclick: () => { app.click(); app.send({ t: 'pick', id: o.id }); },
        }, o.name, r.loser && r.loser.id === o.id ? h('small', {}, ' (verliezer)') : null))),
        h('small', { class: 'muted' }, 'Kies je niet op tijd, dan beslist het rad zelf (', left, ').'));
    } else if (pk.state === 'kiezen') {
      pickCard = h('div', { class: 'pick-card' },
        h('div', { class: 'ch-title' }, `🏆 ${pk.winnerName} mag kiezen…`),
        h('div', { class: 'ch-text small' }, 'Wie moet er óók een atje karnemelk? Zo meteen draait het rad! ', left));
    } else if (pk.state === 'draaien') {
      pickCard = h('div', { class: 'pick-card' }, h('div', { class: 'ch-title' }, '🎡 Het rad draait…'));
    } else {
      pickCard = h('div', { class: `pick-card${pk.target === youPid ? ' mine' : ''}` },
        h('div', { class: 'ch-title' }, `🥛 ${pk.target === youPid ? 'Jij moet' : targetName + ' moet'} óók een atje!`),
        h('div', { class: 'ch-text small' }, pk.byChance ? 'Het rad besliste zelf.' : `Gekozen door winnaar ${pk.winnerName}.`));
    }
  }

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
      // de winnaar moet meteen zien dat hij mag kiezen, dus dan bovenaan
      pickCard && pk.state === 'kiezen' && pk.winner === youPid ? pickCard : null,
      challengeCard,
      pickCard && !(pk.state === 'kiezen' && pk.winner === youPid) ? pickCard : null,
      r.awards && r.awards.length ? h('div', { class: 'awards' }, r.awards.map((a) => h('div', { class: `award award-${a.key}` },
        h('b', {}, a.title), h('span', {}, a.name), h('small', {}, a.text)))) : null,
      rows,
      h('p', { class: 'muted small center-text' }, 'Tik op een rij voor de puntenberekening.')),
    h('div', { class: 'actionbar' }, actions,
      room ? h('button', { class: 'btn btn-ghost', onclick: () => app.confirm('Room verlaten?', 'Verlaten', () => app.leaveRoom()) }, 'Stoppen') : null));
}

// ---------------- winkel ----------------
export function shopScreen(app, opts = {}) {
  const p = app.profile;
  const tab = app.shopTab || 'special';
  const back = opts.back || app.shopBack || 'menu';
  app.shopBack = back;
  app.showroom.setMode('shop');
  const preview = app.shopPreview;
  const eq = { ...p.equipped };
  const show = { ...eq };
  let previewChar = p.lastCharacter || 'kees';
  const pv = preview && SHOP_BY_ID[preview];
  if (pv && pv.slot === 'special') previewChar = pv.look.character;
  else if (pv) show[pv.slot] = preview;
  app.showroom.setKart(previewChar, show, p.look);
  app.showroom.previewPose = tab === 'pose';

  const items = SHOP_ITEMS.filter((i) => i.slot === tab).sort((a, b) => (a.price - b.price));
  const grid = h('div', { class: 'shopgrid' }, items.map((it) => {
    const owned = ownsItem(p, it.id);
    const worn = it.slot === 'special' ? p.lastCharacter === it.look.character : eq[it.slot] === it.id;
    const rar = RARITIES[it.rarity];
    const short = !owned && p.mp < it.price;
    let btn;
    const special = it.slot === 'special';
    if (worn) btn = h('span', { class: 'state worn' }, special ? 'Gekozen ✓' : 'Gedragen ✓');
    else if (owned) btn = h('button', { class: 'btn btn-small btn-green', onclick: (e) => { e.stopPropagation(); app.click(); app.send({ t: 'equip', id: it.id }); } }, special ? 'In bezit • Kiezen' : 'In bezit • Dragen');
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
      h('p', { class: 'muted small' }, 'Alles is alleen uiterlijk: je wordt er niet sneller van, ook niet van een andere kart. Andere spelers zien jouw spullen tijdens de race. Tik op een item om het te bekijken.'),
      tab === 'special' ? h('p', { class: 'muted small' }, 'Specials zijn extra coureurs. In de race heet je dan bijvoorbeeld "Meke (jouw naam)", zodat iedereen ziet wie wie is.') : null,
      h('div', { class: 'tabs' }, Object.entries(SHOP_TABS).map(([k, v]) => h('button', { class: tab === k ? 'on' : '', onclick: () => { app.shopTab = k; app.shopPreview = null; app.show('shop'); } }, v))),
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
  if (it.slot === 'special') return avatarFor(l.character);
  if (it.slot === 'kart') return kartSwatch(l ? l.model : 'standaard');
  if (it.slot === 'hoed') return hatSwatch(l ? l.hat : null);
  const poses = { duim: '👍', zwaai: '👋', dans: '🕺', proost: '🥛', salto: '🤸' };
  return `<span class="emoji">${poses[l ? l.pose : 'duim']}</span>`;
}

function kartSwatch(model) {
  const wheel = (x, y, r = 4.5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#222"/><circle cx="${x}" cy="${y}" r="${r * 0.4}" fill="#ccc"/>`;
  const shapes = {
    standaard: `<path d="M4 26 L10 18 L28 18 L36 24 L36 28 L4 28Z" fill="#3a8ef6"/><rect x="16" y="11" width="6" height="8" fill="#333"/>${wheel(10, 30)}${wheel(30, 30)}`,
    bakfiets: `<rect x="3" y="14" width="15" height="11" fill="#c99b5f" stroke="#8a5a35"/><path d="M18 24 L34 24 L34 18" stroke="#3a8ef6" stroke-width="3" fill="none"/>${wheel(8, 30, 4)}${wheel(31, 29, 5.5)}`,
    roze: `<ellipse cx="20" cy="22" rx="16" ry="8" fill="#ff7eb6"/><path d="M20 12 c-3-4 -8 0 0 6 c8-6 3-10 0-6z" fill="#ff2f7a"/>${wheel(9, 30)}${wheel(31, 30)}`,
    tractor: `<rect x="4" y="18" width="18" height="9" fill="#3fbf6a"/><rect x="20" y="9" width="12" height="14" fill="#3fbf6a"/><rect x="8" y="10" width="3" height="9" fill="#333"/>${wheel(10, 31, 4)}${wheel(28, 28, 8)}`,
    melkwagen: `<rect x="3" y="12" width="22" height="16" fill="#ffffff" stroke="#2f7de1" stroke-width="1.5"/><rect x="25" y="17" width="11" height="11" fill="#2f7de1"/><rect x="7" y="7" width="4" height="6" fill="#fff" stroke="#999"/><rect x="13" y="7" width="4" height="6" fill="#fff" stroke="#999"/>${wheel(9, 30)}${wheel(31, 30)}`,
    badkuip: `<path d="M3 16 h34 v4 a10 9 0 0 1 -10 9 h-14 a10 9 0 0 1 -10 -9z" fill="#f4f7fb" stroke="#9aa5b1"/><circle cx="31" cy="12" r="3.5" fill="#ffd23f"/><path d="M34 12 l3 1 l-3 1z" fill="#ff8c1a"/>${wheel(10, 31, 3.5)}${wheel(30, 31, 3.5)}`,
    klomp: `<path d="M3 22 Q3 14 14 14 L28 13 Q38 13 38 22 Q38 28 28 28 L8 28 Q3 28 3 22Z" fill="#f2c14e" stroke="#9c6a1a"/><ellipse cx="13" cy="17" rx="6" ry="2" fill="#7a4f1a"/>${wheel(10, 31, 3.5)}${wheel(30, 31, 3.5)}`,
    monster: `<rect x="8" y="10" width="24" height="10" rx="2" fill="#e63946"/><path d="M12 10 L16 4 L26 4 L28 10" stroke="#333" stroke-width="2" fill="none"/>${wheel(10, 27, 8)}${wheel(30, 27, 8)}`,
    raket: `<path d="M4 20 L28 14 Q38 20 28 26 Z" fill="#d9e2ec" stroke="#7b6cff"/><path d="M6 14 L12 19 L6 19Z M6 26 L12 21 L6 21Z" fill="#e63946"/><path d="M0 18 l5 2 l-5 2z" fill="#ff9a1f"/>${wheel(12, 31, 3.5)}${wheel(28, 31, 3.5)}`,
  };
  return `<svg viewBox="0 0 40 40">${shapes[model] || shapes.standaard}</svg>`;
}

function hatSwatch(hat) {
  const head = '<circle cx="20" cy="27" r="10" fill="#f6c9a5"/><circle cx="16.5" cy="27" r="1.5" fill="#111"/><circle cx="23.5" cy="27" r="1.5" fill="#111"/>';
  const hats = {
    feestmuts: '<path d="M13 19 L20 2 L27 19Z" fill="#ff5fa2"/><path d="M15 14 L25 14 M17 9 L23 9" stroke="#ffd23f" stroke-width="2"/><circle cx="20" cy="3" r="2.5" fill="#ffd23f"/>',
    pet: '<path d="M10 20 Q20 8 30 20Z" fill="#e63946"/><rect x="2" y="18" width="12" height="3" rx="1.5" fill="#b02634"/>',
    bloemen: ['#ff5fa2', '#ffd23f', '#ffffff', '#ff7a00', '#7b6cff'].map((c, i) => `<circle cx="${11 + i * 4.5}" cy="${17 - Math.sin(i * 0.8) * 1.5}" r="2.6" fill="${c}"/>`).join(''),
    koptelefoon: '<path d="M9 26 Q9 12 20 12 Q31 12 31 26" stroke="#222" stroke-width="2.5" fill="none"/><rect x="6" y="23" width="5" height="8" rx="2" fill="#e63946"/><rect x="29" y="23" width="5" height="8" rx="2" fill="#e63946"/>',
    kaas: '<path d="M10 19 L32 19 L26 6Z" fill="#ffd34d" stroke="#d99a00"/><circle cx="24" cy="14" r="2" fill="#e5a800"/>',
    viking: '<path d="M10 20 Q20 6 30 20Z" fill="#9aa5b1"/><path d="M10 18 Q4 14 5 6 Q8 13 12 15Z M30 18 Q36 14 35 6 Q32 13 28 15Z" fill="#fff3d6" stroke="#c9b48a"/>',
    melkpak: '<rect x="13" y="6" width="14" height="13" fill="#fff" stroke="#2f7de1"/><path d="M13 6 L20 1 L27 6Z" fill="#eef4ff" stroke="#2f7de1"/><rect x="13" y="14" width="14" height="3" fill="#2f7de1"/>',
    kroon: '<path d="M11 19 L11 9 L15.5 14 L20 7 L24.5 14 L29 9 L29 19Z" fill="#ffcf33" stroke="#c98a00"/><circle cx="20" cy="15" r="1.6" fill="#e63946"/>',
  };
  return `<svg viewBox="0 0 40 40">${head}${hat ? hats[hat] || '' : '<path d="M8 8 L32 32" stroke="#bbb" stroke-width="3"/>'}</svg>`;
}

// ---------------- mijn coureur (zelf je uiterlijk maken) ----------------
export function creatorScreen(app, opts = {}) {
  const back = opts.back || app.creatorBack || (app.room ? 'lobby' : 'menu');
  app.creatorBack = back;
  if (!app.draftLook) app.draftLook = cleanLook(app.profile.look);
  const L = app.draftLook;
  app.showroom.setMode('creator');
  app.showroom.setKart('eigen', app.profile.equipped, L);
  const update = (k, v) => {
    L[k] = v;
    app.click();
    app.show('creator');
  };
  const swatches = (k, list) => h('div', { class: 'swatches' }, list.map((c) => h('button', {
    class: `sw${L[k] === c ? ' on' : ''}`, style: { background: c }, 'aria-label': `Kleur ${c}`, 'aria-pressed': L[k] === c ? 'true' : 'false',
    onclick: () => update(k, c),
  })));
  const seg = (k, obj) => h('div', { class: 'seg' }, Object.entries(obj).map(([v, t]) => h('button', {
    class: L[k] === v ? 'on' : '', onclick: () => update(k, v),
  }, typeof t === 'string' ? t : t.name)));
  const save = (use) => {
    app.send({ t: 'look', look: L, use });
    app.draftLook = null;
    app.show(back);
  };
  return h('section', { class: 'screen creator' },
    h('div', { class: 'card creator-card' },
      h('div', { class: 'row space' },
        h('button', { class: 'btn btn-ghost back', onclick: () => { app.draftLook = null; app.click(); app.show(back); } }, '‹ Terug'),
        h('span', { class: 'creator-av', html: humanAvatar(L) })),
      h('h2', {}, 'Mijn coureur'),
      h('p', { class: 'muted small' }, 'Maak jezelf (of wie je maar wilt). Alleen uiterlijk: lang, kort, dun of stevig rijdt allemaal even snel.'),
      h('div', { class: 'section-title' }, 'Huidskleur'), swatches('skin', SKIN_COLORS),
      h('div', { class: 'section-title' }, 'Haar'), seg('hair', HAIR_STYLES),
      L.hair !== 'kaal' ? h('div', {}, h('div', { class: 'section-title' }, 'Haarkleur'), swatches('hairColor', HAIR_COLORS)) : null,
      h('div', { class: 'section-title' }, 'Shirt'), swatches('shirt', SHIRT_COLORS),
      h('div', { class: 'section-title' }, 'Lengte'), seg('height', HEIGHTS),
      h('div', { class: 'section-title' }, 'Bouw'), seg('build', BUILDS),
      h('div', { class: 'section-title' }, 'Bril'), seg('glasses', GLASSES),
      h('div', { class: 'section-title' }, 'Snor of baard'), seg('facial', FACIAL),
      h('p', { class: 'muted small' }, 'Hoeden, capes en andere karts vind je in de winkel.')),
    h('div', { class: 'actionbar' },
      h('button', { class: 'btn btn-primary btn-big grow', onclick: () => save(true) }, 'Opslaan en gebruiken'),
      h('button', { class: 'btn', onclick: () => save(false) }, 'Alleen opslaan')));
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
      app.profile ? profileSettings(app) : null,
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

function profileSettings(app) {
  const name = h('input', { id: 's-naam', type: 'text', maxlength: '16', value: app.profile.name, autocomplete: 'nickname', 'aria-label': 'Naam' });
  const rename = (e) => {
    e.preventDefault();
    const n = name.value.trim();
    if (n.length < 2) { toast('Een naam heeft minstens 2 tekens.', 'error'); return; }
    if (n !== app.profile.name) app.send({ t: 'rename', name: n });
    name.blur();
  };
  const tr = app.transfer && app.transfer.until > Date.now() ? app.transfer : null;
  return h('div', { class: 'profile-box' },
    h('div', { class: 'section-title' }, 'Profiel'),
    h('form', { class: 'row', onsubmit: rename }, h('div', { class: 'grow' }, name), h('button', { class: 'btn btn-small btn-blue', type: 'submit' }, 'Naam opslaan')),
    h('p', { class: 'muted small' }, 'Je MP-punten en spullen staan op deze telefoon. Let op: in Safari en via een icoon op je beginscherm telt dat als twee verschillende telefoons.'),
    app.offline ? null : tr
      ? h('div', { class: 'transfer' },
        h('div', { class: 'muted small' }, 'Overzetcode voor je nieuwe telefoon:'),
        h('div', { class: 'code-big code6' }, tr.code.split('').map((c) => h('span', {}, c))),
        h('p', { class: 'muted small' }, `Open de game op je nieuwe telefoon, tik op "Al MP-punten op een andere telefoon?" en vul deze code in. Geldig tot ${new Date(tr.until).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}.`))
      : h('button', { class: 'btn btn-small', onclick: () => app.send({ t: 'transferCode' }) }, 'Naar een andere telefoon? Maak overzetcode'));
}

// ---------------- uitleg ----------------
export function helpScreen(app) {
  const it = (code) => h('div', { class: 'helpitem' }, h('span', { class: 'hi-icon', html: ITEM_ICONS[code] }), h('div', {}, h('b', {}, ITEM_INFO[code].name), h('p', {}, ITEM_INFO[code].desc)));
  return h('section', { class: 'screen center' },
    h('div', { class: 'card help' },
      backBtn(app),
      h('h2', {}, 'Hoe speel je?'),
      h('h3', {}, 'Rijden'),
      h('p', {}, 'Je kart geeft automatisch gas. Stuur met de pijltjes links onderin (of schuif/kantel, zie Instellingen). Op een toetsenbord: pijltjes of WASD, spatie = drift, E = item, H = toeteren.'),
      h('p', {}, 'Tik op TOET om te toeteren: spelers in de buurt horen en zien het.'),
      h('h3', {}, 'Driften en turbo'),
      h('p', {}, 'Houd DRIFT ingedrukt terwijl je een bocht in stuurt. Hoe langer je drift, hoe meer vonkjes: wit, geel en roze. Laat los voor een turbo!'),
      h('p', {}, 'Raketstart: druk op DRIFT vlak voordat START verschijnt.'),
      h('h3', {}, 'Schansen en boostringen'),
      h('p', {}, 'Rijd met flinke vaart over een geel-zwarte schans en je vliegt! In de lucht vlieg je over andere karts, plassen en obstakels heen. Land je na een mooie sprong, dan krijg je een kleine turbo.'),
      h('p', {}, 'Vlieg (of rij) door een gouden boostring voor een flinke turbo. Op sommige banen moet je over een sloot of lavastroom springen: rij je erdoor, dan word je flink afgeremd.'),
      h('h3', {}, 'Items'),
      h('p', {}, 'Rijd door een regenboog-melkpak voor een item. Wie achteraan rijdt, krijgt betere items.'),
      [ITEM.TURBO, ITEM.TURBO3, ITEM.SCHILD, ITEM.PLAS, ITEM.KLOMP].map(it),
      h('h3', {}, 'Botsen'),
      h('p', {}, 'Ram een andere kart om hem af te remmen en opzij te duwen. Wie het hardst aankomt, wint de botsing. Met een Kaasschild ben je onaantastbaar.'),
      h('h3', {}, 'MP-punten'),
      h('p', {}, `Na elke race: ${POINTS_RULES.finish} MP voor uitrijden, plus een plaatsbonus. Hoe meer spelers, hoe groter de bonus (winnaar van 10 vrienden: 120 MP). Snelste ronde: +${POINTS_RULES.fastestLap} MP. Niet uitgereden: ${POINTS_RULES.dnf} MP. Oefenen levert de helft op. Je eerste uitgereden race van de dag geeft +${DAILY_BONUS} MP dagbonus.`),
      h('p', {}, 'Je punten blijven op deze telefoon bewaard. Nieuwe telefoon? Maak bij Instellingen een overzetcode.'),
      h('h3', {}, 'Titels na de race'),
      h('p', {}, 'Botskampioen (de meeste rammen), Pechvogel (het vaakst geraakt), Itemkoning, Driftkoning en Ringridder (het vaakst door een boostring). Gewoon voor de eer.'),
      h('h3', {}, 'Winkel'),
      h('p', {}, 'Koop andere karts (zoals de Roze droomkart, de Tractorkart of de Monstertruck), hoeden, capes, kartkleuren, bandeneffecten, lichtsporen en overwinningsposes. Zeldzaamheid: Gewoon, Ongewoon, Zeldzaam, Episch en Legendarisch. De Gouden cape is het enige Legendarische item en het duurste.'),
      h('h3', {}, 'Specials'),
      h('p', {}, 'Meke, Meike, Sim, Stan, Jullian, Melle, Duuk, Morris, Ridder Kees en Ridder Jort zijn specials: extra coureurs die je met MP-punten koopt. In de race heet je dan bijvoorbeeld "Meke (Jort)".'),
      h('h3', {}, 'Mijn coureur'),
      h('p', {}, 'Maak je eigen coureur: huidskleur, haar, shirt, lengte, bouw, bril en snor of baard. Kies hem in de lobby bij "Mijn coureur".'),
      h('h3', {}, 'De verliezer'),
      h('p', {}, 'Wie als laatste mens binnenkomt, krijgt een grappige uitdaging, zoals een atje karnemelk. De verliezer of de host kan hem overslaan of een andere kiezen.'),
      h('h3', {}, 'De winnaar kiest'),
      h('p', {}, 'Race je met minstens 2 mensen? Dan tikt de winnaar op de naam van wie er óók een atje karnemelk moet doen. Daarna draait bij iedereen het rad met alle namen en stopt het op die persoon. Kiest de winnaar niet binnen 30 seconden, dan beslist het rad zelf.')));
}
