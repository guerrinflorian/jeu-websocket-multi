// Orchestrateur : réseau ⇄ écrans ⇄ hôte de jeu.

import { Net } from './net.js';
import { Input } from './input.js';
import { GameHost } from './gamehost.js';
import * as sfx from './sfx.js';
import { t } from './strings.js';
import {
  renderHome, renderLobby, renderResults, renderEmoteBar,
  showEmote, toast, openRules, closeModal,
} from './ui.js';
import { PLAYER_COLORS } from '/shared/const.js';

const $ = (id) => document.getElementById(id);

const net = new Net();
const input = new Input($('ctl-layer'), $('game'));
const host = new GameHost({
  canvas: $('game'),
  layer: $('ctl-layer'),
  net,
  input,
  onEmote: (pid, k) => emoteFrom(pid, k),
});

let manifest = [];
let myPid = null;
let lastRoom = null;
let lastOver = null;
let screen = 'home';
let pendingJoin = new URLSearchParams(location.search).get('r')?.toUpperCase() || null;

// ── Écrans ─────────────────────────────────────────────────────────────

function setScreen(name) {
  screen = name;
  document.body.dataset.screen = name;
  if (name === 'lobby') sfx.startAmbient();
  else sfx.stopAmbient();
}

function goHome() {
  myPid = null;
  lastRoom = null;
  lastOver = null;
  host.stop();
  closeModal();
  history.replaceState(null, '', '/');
  setScreen('home');
  renderHome($('scr-home'), {
    profile: net.profile,
    prefillCode: pendingJoin,
    manifest,
    onProfile: (name, face) => net.setProfile(name || null, face),
    onCreate: () => { sfx.boot(); sfx.play('click'); net.send({ t: 'create' }); },
    onJoin: (code) => { sfx.boot(); sfx.play('click'); net.send({ t: 'join', code }); },
  });
}

function refreshLobby() {
  if (!lastRoom) return;
  renderLobby($('scr-lobby'), lastRoom, { myPid, manifest, net, onLeave: goHome });
}

function playerInfo(pid) {
  // Cherche d'abord dans la room (lobby), sinon dans la config de partie.
  const rp = lastRoom?.players.find((p) => p.pid === pid);
  if (rp) return { name: rp.name, face: rp.face, color: PLAYER_COLORS[rp.color % PLAYER_COLORS.length] };
  const cp = host.config?.players?.[pid];
  return cp || null;
}

function emoteFrom(pid, k) {
  showEmote($('emote-feed'), playerInfo(pid), k);
}

// ── Messages serveur ───────────────────────────────────────────────────

net.on('msg', (msg) => {
  switch (msg.t) {
    case 'welcome':
      if (!msg.resumed && pendingJoin && net.profile.name) {
        net.send({ t: 'join', code: pendingJoin });
      } else if (msg.resumed) {
        myPid = msg.pid;
        toast(t('net.resumed'), 'ok');
      }
      break;

    case 'joined':
      myPid = msg.pid;
      pendingJoin = null;
      history.replaceState(null, '', `/?r=${msg.code}`);
      sfx.play('join');
      break;

    case 'room':
      lastRoom = msg;
      if (msg.phase === 'lobby') {
        if (screen === 'game') host.stop();
        setScreen('lobby');
        refreshLobby();
      } else if (msg.phase === 'countdown') {
        setScreen('lobby');
        refreshLobby();
      } else if (screen === 'lobby' && (msg.phase === 'playing' || msg.phase === 'results')) {
        // On a rejoint une partie en cours : le bundle start/over suit.
      }
      break;

    case 'countdown':
      showCountdown(msg.n);
      break;

    case 'start': {
      const meta = manifest.find((m) => m.id === msg.gameId);
      host.config = msg.config;
      setScreen('game');
      closeModal();
      $('hud-rules').onclick = () => meta && openRules(meta);
      updateSpectator(msg);
      host.start(msg.gameId, msg.config, msg.you, meta).then(() => sfx.play('go'));
      break;
    }

    case 'snap':
      if (screen !== 'game' && lastRoom?.phase !== 'results') setScreen('game');
      host.feedSnap(msg);
      break;

    case 'over': {
      lastOver = msg;
      host.stop();
      setScreen('results');
      const winners = msg.winners || [];
      sfx.play(winners.includes(myPid) || winners.length === 0 ? 'win' : 'lose');
      renderResults($('scr-results'), { ...msg, hostPid: lastRoom?.hostPid }, { myPid, manifest, net });
      break;
    }

    case 'fx':
      if (msg.fx === 'emote') emoteFrom(msg.pid, msg.k);
      break;

    case 'error':
      toast(t('err.' + msg.code), 'err');
      break;

    case 'bye':
      toast(t('err.' + (msg.reason || 'ROOM_CLOSED')), 'err');
      goHome();
      break;
  }

  // L'hôte a pu changer pendant les résultats : re-rendre les boutons.
  if (msg.t === 'room' && screen === 'results' && lastOver) {
    renderResults($('scr-results'), { ...lastOver, hostPid: msg.hostPid }, { myPid, manifest, net });
  }
});

net.on('status', (s) => {
  const banner = $('net-banner');
  if (s === 'open') {
    banner.classList.remove('show');
  } else if (s === 'reconnecting') {
    banner.textContent = t('net.reconnecting');
    banner.classList.add('show');
  } else if (s === 'connecting') {
    banner.textContent = t('net.connecting');
    banner.classList.add('show');
  }
});

// ── HUD ────────────────────────────────────────────────────────────────

function updateSpectator(startMsg) {
  const spec = !startMsg.config.players[startMsg.you];
  $('spectator-banner').textContent = spec ? t('game.spectator') : '';
  $('spectator-banner').classList.toggle('show', spec);
}

function showCountdown(n) {
  const ov = $('overlay');
  ov.innerHTML = `<div class="count-num">${n}</div>`;
  sfx.play('count');
  setTimeout(() => { if (ov.firstChild?.textContent === String(n)) ov.innerHTML = ''; }, 950);
}

setInterval(() => {
  const el = $('ping');
  if (screen === 'game') {
    el.textContent = `${net.ping} ms`;
    el.className = 'hud-ping ' + (net.ping < 80 ? 'good' : net.ping < 200 ? 'mid' : 'bad');
  }
}, 1000);

$('hud-quit').addEventListener('click', () => {
  net.send({ t: 'leave' });
  goHome();
});
$('hud-emote').addEventListener('click', () => {
  $('emote-bar').classList.toggle('show');
});
renderEmoteBar($('emote-bar'), net);
$('emote-bar').addEventListener('click', () => setTimeout(() => $('emote-bar').classList.remove('show'), 150));

// ── Boot ───────────────────────────────────────────────────────────────

addEventListener('pointerdown', () => sfx.boot(), { once: true, capture: true });

async function boot() {
  net.loadProfile();
  try {
    manifest = await (await fetch('/api/games')).json();
  } catch {
    toast(t('net.offline'), 'err');
  }
  goHome();
  net.connect();
}

boot();
