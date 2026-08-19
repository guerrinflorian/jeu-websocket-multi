// 7 FAMILLES : simulation serveur. Demandes publiques, transferts, pioche,
// « bonne pioche » qui fait rejouer, familles posées. Les mains sont
// secrètes (view par joueur), la mémoire du jeu est l'historique public.

import { FAMILIES, famId, famOf, makeFamilyDeck } from '../../shared/cards.js';
import meta from './meta.js';

const PRE_T = 1.4;
const END_T = 2.2;
const SIM_MAX = 380;

export function createState(cfg) {
  const asym = cfg.format.kind === 'asym';
  const pids = cfg.teams.flat();
  // Ordre des tours : chacun son tour ; en asym, le Collectionneur joue
  // un tour sur deux (1 contre tous, littéralement).
  let order;
  if (asym) {
    const solo = cfg.teams[0][0];
    order = cfg.teams[1].flatMap((pid) => [solo, pid]);
  } else {
    order = [...pids];
  }
  const state = {
    cfg,
    rng: cfg.rng,
    asym,
    pids,
    order,
    orderIdx: -1,
    teamOf: {},
    turnT: 0,
    turnTime: cfg.settings.turnTime || 10,
    turnPid: null,
    phase: 'pre',
    phaseT: PRE_T,
    deck: [],
    players: {},
    famDone: {},           // fam → pid
    askLog: [],            // { from, to, card, ok } : mémoire publique
    asksSinceFam: 0,
    lastAsk: null,
    simT: 0,
    done: false,
    evq: [],
    tick: 0, _viewTick: -1, _base: null,
  };
  cfg.teams.forEach((team, t) => {
    for (const pid of team) {
      state.teamOf[pid] = t;
      state.players[pid] = { hand: [], fams: [], stats: { asks: 0, hits: 0, streak: 0, bestStreak: 0, lucky: 0, given: 0 } };
    }
  });
  state.deck = makeFamilyDeck();
  state.rng.shuffle(state.deck);
  const per = pids.length <= 6 ? 6 : 5;
  for (let k = 0; k < per; k++) for (const pid of pids) state.players[pid].hand.push(state.deck.pop());
  for (const pid of pids) checkFamilies(state, pid, true);
  return state;
}

function checkFamilies(state, pid, silent = false) {
  const p = state.players[pid];
  for (let f = 0; f < FAMILIES.length; f++) {
    if (state.famDone[f] !== undefined) continue;
    const members = p.hand.filter((c) => famOf(c).fam === f);
    if (members.length === 6) {
      p.hand = p.hand.filter((c) => famOf(c).fam !== f);
      p.fams.push(f);
      state.famDone[f] = pid;
      state.asksSinceFam = 0;
      if (!silent) state.evq.push({ e: 'family', pid, fam: f });
    }
  }
}

function allDone(state) {
  if (Object.keys(state.famDone).length >= FAMILIES.length) return true;
  if (state.deck.length) return false;
  // Anti-enlisement : pioche vide et plus rien ne se complète depuis
  // longtemps, les cartes ne font que circuler. On siffle la fin.
  if (state.asksSinceFam >= 70) return true;
  return state.pids.every((pid) => state.players[pid].hand.length === 0);
}

function nextTurn(state) {
  if (allDone(state)) { endGame(state); return; }
  for (let guard = 0; guard <= state.order.length; guard++) {
    state.orderIdx = (state.orderIdx + 1) % state.order.length;
    const pid = state.order[state.orderIdx];
    const p = state.players[pid];
    if (!p.hand.length) {
      if (state.deck.length) {
        p.hand.push(state.deck.pop());
        state.evq.push({ e: 'draw', pid, deckN: state.deck.length });
        checkFamilies(state, pid);
        if (!p.hand.length) continue; // la pioche a complété une famille
      } else continue;
    }
    state.turnPid = pid;
    state.turnT = state.turnTime;
    state.phase = 'turn';
    state.evq.push({ e: 'turn', pid });
    return;
  }
  endGame(state);
}

function endGame(state) {
  if (state.phase === 'end' || state.done) return;
  state.phase = 'end';
  state.phaseT = END_T;
  state.evq.push({ e: 'over' });
}

// Demandes valides pour un joueur (utilisé par le bot et le coup auto).
export function validAsks(state, pid) {
  const p = state.players[pid];
  const mine = new Set(p.hand);
  const famsInHand = new Set(p.hand.map((c) => famOf(c).fam));
  const out = [];
  for (const fam of famsInHand) {
    if (state.famDone[fam] !== undefined) continue;
    for (let mem = 0; mem < 6; mem++) {
      const card = famId(fam, mem);
      if (mine.has(card)) continue;
      for (const to of state.pids) {
        if (to === pid) continue;
        out.push({ fam, mem, to });
      }
    }
  }
  return out;
}

function doAsk(state, pid, fam, mem, to) {
  if (state.phase !== 'turn' || state.turnPid !== pid || state.done) return false;
  if (!Number.isInteger(fam) || !Number.isInteger(mem)) return false;
  if (fam < 0 || fam >= FAMILIES.length || mem < 0 || mem >= 6) return false;
  if (to === pid || !state.players[to]) return false;
  const p = state.players[pid];
  const card = famId(fam, mem);
  if (p.hand.includes(card)) return false;
  if (!p.hand.some((c) => famOf(c).fam === fam)) return false;

  const target = state.players[to];
  const has = target.hand.includes(card);
  p.stats.asks++;
  state.asksSinceFam++;
  state.evq.push({ e: 'ask', from: pid, to, fam, mem, ok: has ? 1 : 0 });
  state.askLog.push({ from: pid, to, card, ok: has });
  if (state.askLog.length > 60) state.askLog.shift();
  state.lastAsk = { from: pid, to, fam, mem, ok: has ? 1 : 0 };

  if (has) {
    target.hand.splice(target.hand.indexOf(card), 1);
    p.hand.push(card);
    p.stats.hits++;
    p.stats.streak++;
    p.stats.bestStreak = Math.max(p.stats.bestStreak, p.stats.streak);
    target.stats.given++;
    checkFamilies(state, pid);
    if (allDone(state)) { endGame(state); return true; }
    if (!p.hand.length) { nextTurn(state); return true; }
    state.turnT = state.turnTime; // il rejoue
  } else {
    p.stats.streak = 0;
    if (state.deck.length) {
      const drawn = state.deck.pop();
      p.hand.push(drawn);
      state.evq.push({ e: 'draw', pid, deckN: state.deck.length });
      checkFamilies(state, pid);
      if (drawn === card) {
        p.stats.lucky++;
        state.evq.push({ e: 'lucky', pid, card });
        if (allDone(state)) { endGame(state); return true; }
        state.turnT = state.turnTime; // bonne pioche : il rejoue
        return true;
      }
    }
    if (allDone(state)) { endGame(state); return true; }
    nextTurn(state);
  }
  return true;
}

// Coup automatique (chrono écoulé) : demande plausible, mémoire incluse.
function autoAsk(state, pid) {
  const asks = validAsks(state, pid);
  if (!asks.length) { nextTurn(state); return; }
  const known = knownHolders(state);
  const smart = asks.filter((a) => known.get(famId(a.fam, a.mem)) === a.to);
  const pick = smart.length && state.rng.chance(0.7) ? state.rng.pick(smart) : state.rng.pick(asks);
  doAsk(state, pid, pick.fam, pick.mem, pick.to);
}

// Qui détient quoi, d'après l'historique public (dernière info gagne).
function knownHolders(state) {
  const map = new Map();
  for (const entry of state.askLog) {
    if (entry.ok) map.set(entry.card, entry.from);
    // Une demande ratée : le demandeur n'a PAS la carte (info négative,
    // trop fine pour le bot simple, ignorée ici).
  }
  return map;
}

export function onInput(state, pid, d) {
  // Fallback harnais : un tap déclenche une demande auto plausible.
  if (!d || typeof d.tx !== 'number' || !Number.isFinite(d.tx)) return;
  if (state.phase === 'turn' && state.turnPid === pid) autoAsk(state, pid);
}

export function onAction(state, pid, a, d) {
  if (a !== 'ask' || !d) return;
  doAsk(state, pid, Math.round(Number(d.fam)), Math.round(Number(d.mem)), String(d.to || ''));
}

export function tick(state, dt) {
  const evs = state.evq;
  state.evq = [];
  state.tick++;
  state.simT += dt;
  if (state.done) return evs;
  if (state.simT > SIM_MAX && state.phase !== 'end') { endGame(state); }

  if (state.phase === 'pre') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) nextTurn(state);
  } else if (state.phase === 'turn') {
    state.turnT -= dt;
    if (state.turnT <= 0) autoAsk(state, state.turnPid);
  } else if (state.phase === 'end') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) state.done = true;
  }
  return evs;
}

export function isOver(state) {
  return state.done;
}

export function view(state, pid) {
  if (state._viewTick !== state.tick) {
    const counts = {};
    const fams = {};
    for (const [id, p] of Object.entries(state.players)) {
      counts[id] = p.hand.length;
      fams[id] = p.fams;
    }
    state._base = {
      phase: state.phase,
      tl: Math.round(Math.max(0, state.turnT) * 10) / 10,
      tmax: state.turnTime,
      deckN: state.deck.length,
      turn: state.phase === 'turn' ? state.turnPid : null,
      counts,
      fams,
      lastAsk: state.lastAsk,
      famDone: state.famDone,
    };
    state._viewTick = state.tick;
    state._views = new Map();
  }
  const key = pid || '@spec';
  let v = state._views.get(key);
  if (!v) {
    const hands = {};
    if (pid && state.players[pid]) {
      const myTeam = state.teamOf[pid];
      for (const other of state.pids) {
        if (other === pid || (state.cfg.format.kind !== 'ffa' && state.teamOf[other] === myTeam)) {
          hands[other] = state.players[other].hand;
        }
      }
    }
    v = { ...state._base, hands };
    state._views.set(key, v);
  }
  return v;
}

export function results(state) {
  const { cfg } = state;
  const famCount = (pid) => state.players[pid].fams.length;
  // La plus grosse collection en main départage les parties sifflées.
  const bestPartial = (pid) => {
    const per = {};
    for (const c of state.players[pid].hand) {
      const f = famOf(c).fam;
      per[f] = (per[f] || 0) + 1;
    }
    return Math.max(0, ...Object.values(per));
  };
  const scoreOf = (pid) => famCount(pid) * 10 + bestPartial(pid);
  const teamScore = cfg.teams.map((team) => team.reduce((s, pid) => s + scoreOf(pid), 0));
  const best = Math.max(...teamScore);
  const winTeams = teamScore.map((s, t) => [s, t]).filter(([s]) => s === best).map(([, t]) => t);
  const allTied = winTeams.length === cfg.teams.length && cfg.teams.length > 1;
  const winners = allTied || best === 0 ? [] : winTeams.flatMap((t) => cfg.teams[t]);

  const ranking = state.pids
    .map((pid) => ({
      pid,
      score: scoreOf(pid),
      tie: state.players[pid].stats.hits,
      label: famCount(pid) > 0 ? `${famCount(pid)} 👪` : `${bestPartial(pid)}/6`,
    }))
    .sort((a, b) => b.score - a.score || b.tie - a.tie)
    .map(({ pid, score, label }) => ({ pid, score, label }));

  const titles = [];
  const all = state.pids.map((pid) => ({ pid, s: state.players[pid].stats, fams: famCount(pid) }));
  const top = (fn) => all.slice().sort((a, b) => fn(b) - fn(a))[0];
  const memo = top((x) => x.s.bestStreak);
  if (memo.s.bestStreak >= 3) titles.push({ pid: memo.pid, emoji: '🧠', text: `Mémoire d'éléphant : ${memo.s.bestStreak} bonnes demandes d'affilée` });
  const lucky = top((x) => x.s.lucky);
  if (lucky.s.lucky >= 2) titles.push({ pid: lucky.pid, emoji: '🍀', text: `Bonne pioche : ${lucky.s.lucky} cartes miraculeuses` });
  const facteur = top((x) => x.s.given);
  if (facteur.s.given >= 4) titles.push({ pid: facteur.pid, emoji: '📮', text: `Le Facteur : ${facteur.s.given} cartes distribuées aux autres` });
  const bredouille = all.slice().sort((a, b) => (a.s.hits / Math.max(1, a.s.asks)) - (b.s.hits / Math.max(1, b.s.asks)))[0];
  if (bredouille.s.asks >= 5 && bredouille.s.hits / bredouille.s.asks < 0.2) {
    titles.push({ pid: bredouille.pid, emoji: '🎣', text: 'Pêche en eau trouble : presque jamais la bonne personne' });
  }
  if (!titles.length) {
    const curious = top((x) => x.s.asks);
    titles.push({ pid: curious.pid, emoji: '❓', text: `Grand curieux : ${curious.s.asks} demandes` });
  }
  return { ranking, winners, titles };
}

// ── Bot : mémoire publique + un peu de flair ──────────────────────────

export function botAct(state, pid, mind, api) {
  if (state.phase !== 'turn' || state.turnPid !== pid || state.done) return;
  const { p: pers, rng, mem } = mind;

  // Une réflexion par « occasion de demander » (tour + nombre de demandes).
  const key = `${state.orderIdx}-${state.players[pid].stats.asks}`;
  if (mem.k !== key) {
    mem.k = key;
    mem.delay = 0.8 + rng.next() * 2.5 * pers.pace;
    mem.at = state.simT;
  }
  if (state.simT - mem.at < mem.delay) return;

  const asks = validAsks(state, pid);
  if (!asks.length) return; // le chrono passera le tour
  if (rng.chance(pers.chaos * 0.2)) {
    const a = rng.pick(asks);
    api.act('ask', a);
    return;
  }
  // Mémoire : viser un détenteur connu.
  const known = knownHolders(state);
  const smart = asks.filter((a) => known.get(famId(a.fam, a.mem)) === a.to);
  if (smart.length && rng.chance(pers.skill)) {
    api.act('ask', rng.pick(smart));
    return;
  }
  // Sinon : privilégier la famille la plus avancée dans sa main, et les
  // joueurs qui ont le plus de cartes.
  const p = state.players[pid];
  const famCount = {};
  for (const c of p.hand) famCount[famOf(c).fam] = (famCount[famOf(c).fam] || 0) + 1;
  asks.sort((a, b) => {
    const fa = famCount[a.fam] || 0, fb = famCount[b.fam] || 0;
    const ha = state.players[a.to].hand.length, hb = state.players[b.to].hand.length;
    return (fb * 3 + hb * 0.4) - (fa * 3 + ha * 0.4);
  });
  const k = Math.min(asks.length - 1, Math.floor(rng.next() * 3));
  api.act('ask', asks[k]);
}
