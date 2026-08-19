// BLACKJACK : simulation serveur. Mains simultanées contre la banque :
// distribution animée, décisions en parallèle (15 s), banque à 17, paiements.
// Asym « Le Croupier » : le joueur solo joue la banque (tirage libre dès 14).

import { makeShoe, handTotal } from '../../shared/cards.js';
import meta from './meta.js';

const ANTE = 10;
const START_CHIPS = 100;
const LOAN = 20;
const DEAL_STEP = 0.16;
const ACT_T = 15;
const DEALER_T = 12;      // temps de décision du Croupier humain
const DEALER_STEP = 0.7;  // rythme de tirage de la banque NPC
const PAY_T = 2.8;
const END_T = 2.0;

export function createState(cfg) {
  const asym = cfg.format.kind === 'asym';
  const croupier = asym ? cfg.teams[0][0] : null;
  const pids = cfg.teams.flat().filter((pid) => pid !== croupier);
  const state = {
    cfg,
    rng: cfg.rng,
    asym, croupier,
    pids,
    teamOf: {},
    hands: cfg.settings.hands || 5,
    hand: 0,
    phase: 'deal',
    phaseT: 0,
    shoe: [],
    dealQ: [],
    dealT: 0,
    dealerCards: [],
    dealerRevealed: false,
    dealerStep: 0,
    bank: START_CHIPS,
    players: {},
    simT: 0,
    done: false,
    evq: [],
    tick: 0, _viewTick: -1, _viewPid: undefined, _view: null,
  };
  cfg.teams.forEach((team, t) => {
    for (const pid of team) state.teamOf[pid] = t;
  });
  for (const pid of pids) {
    state.players[pid] = {
      pid,
      chips: START_CHIPS,
      bet: 0, cards: [], done: false, bust: false, bj: false, doubled: false,
      stats: { bjs: 0, busts: 0, doubles: 0, wins: 0, loans: 0, peak: START_CHIPS },
    };
  }
  startHand(state);
  return state;
}

function draw(state) {
  if (!state.shoe.length) {
    state.shoe = makeShoe(2);
    state.rng.shuffle(state.shoe);
  }
  return state.shoe.pop();
}

function startHand(state) {
  state.hand++;
  state.shoe = makeShoe(2);
  state.rng.shuffle(state.shoe);
  state.dealerCards = [];
  state.dealerRevealed = false;
  state.phase = 'deal';
  state.dealT = 0.6;
  state.dealQ = [];
  for (const pid of state.pids) {
    const p = state.players[pid];
    if (p.chips < ANTE / 2) { p.chips += LOAN; p.stats.loans++; state.evq.push({ e: 'loan', pid }); }
    p.bet = Math.min(ANTE, p.chips);
    p.cards = [];
    p.done = false; p.bust = false; p.bj = false; p.doubled = false;
  }
  // Deux tours de table, puis 2 cartes banque (la 2e reste cachée).
  for (let k = 0; k < 2; k++) {
    for (const pid of state.pids) state.dealQ.push(pid);
    state.dealQ.push('D');
  }
  state.evq.push({ e: 'hand', n: state.hand });
}

function giveCard(state, to) {
  const id = draw(state);
  if (to === 'D') {
    state.dealerCards.push(id);
    const hidden = state.dealerCards.length === 2 && !state.dealerRevealed;
    state.evq.push({ e: 'card', to: 'D', id: hidden ? -1 : id });
  } else {
    const p = state.players[to];
    p.cards.push(id);
    state.evq.push({ e: 'card', to, id, total: handTotal(p.cards).total });
  }
  return id;
}

function enterAct(state) {
  state.phase = 'act';
  state.phaseT = ACT_T;
  for (const pid of state.pids) {
    const p = state.players[pid];
    const t = handTotal(p.cards);
    if (t.total === 21) {
      p.bj = true; p.done = true;
      p.stats.bjs++;
      state.evq.push({ e: 'bj', pid });
    }
  }
  checkAllDone(state);
}

function checkAllDone(state) {
  if (state.phase !== 'act') return;
  if (state.pids.every((pid) => state.players[pid].done)) enterDealer(state);
}

function enterDealer(state) {
  state.phase = 'dealer';
  state.phaseT = DEALER_T;
  state.dealerStep = DEALER_STEP;
  state.dealerRevealed = true;
  state.evq.push({ e: 'reveal', id: state.dealerCards[1] });
}

function dealerDone(state) {
  state.phase = 'payout';
  state.phaseT = PAY_T;
  const d = handTotal(state.dealerCards);
  const dBust = d.total > 21;
  for (const pid of state.pids) {
    const p = state.players[pid];
    let delta;
    const t = handTotal(p.cards);
    if (p.bust) delta = -p.bet;
    else if (p.bj) delta = Math.round(p.bet * 1.5);
    else if (dBust || t.total > d.total) delta = p.bet;
    else if (t.total === d.total) delta = 0;
    else delta = -p.bet;
    p.chips = Math.max(0, p.chips + delta);
    p.stats.peak = Math.max(p.stats.peak, p.chips);
    if (delta > 0) p.stats.wins++;
    state.bank -= delta;
    state.evq.push({ e: 'result', pid, d: delta });
  }
}

function playerHit(state, p) {
  giveCard(state, p.pid);
  const t = handTotal(p.cards);
  if (t.total > 21) {
    p.bust = true; p.done = true;
    p.stats.busts++;
    state.evq.push({ e: 'bust', pid: p.pid });
  } else if (t.total === 21) {
    p.done = true;
  }
}

export function onInput() { /* pas d'intention continue au blackjack */ }

export function onAction(state, pid, a, d) {
  if (state.done) return;
  // Le Croupier humain joue la banque.
  if (state.asym && pid === state.croupier) {
    if (state.phase !== 'dealer') return;
    const t = handTotal(state.dealerCards).total;
    if (a === 'hit' && t < 21) {
      giveCard(state, 'D');
      if (handTotal(state.dealerCards).total >= 21) dealerDone(state);
    } else if (a === 'stand' && t >= 14) {
      dealerDone(state);
    }
    return;
  }
  const p = state.players[pid];
  if (!p || state.phase !== 'act' || p.done) return;
  if (a === 'hit') {
    playerHit(state, p);
  } else if (a === 'stand') {
    p.done = true;
  } else if (a === 'double') {
    if (p.cards.length !== 2 || p.doubled) return;
    p.doubled = true;
    p.bet = Math.min(p.bet * 2, Math.max(p.bet, p.chips));
    p.stats.doubles++;
    state.evq.push({ e: 'double', pid });
    playerHit(state, p);
    p.done = true;
  }
  checkAllDone(state);
}

export function tick(state, dt) {
  const evs = state.evq;
  state.evq = [];
  state.tick++;
  state.simT += dt;
  if (state.done) return evs;

  if (state.phase === 'deal') {
    state.dealT -= dt;
    if (state.dealT <= 0 && state.dealQ.length) {
      giveCard(state, state.dealQ.shift());
      state.dealT = DEAL_STEP;
      if (!state.dealQ.length) state.dealT = 0.5;
    } else if (!state.dealQ.length && state.dealT <= 0) {
      enterAct(state);
    }
  } else if (state.phase === 'act') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) {
      for (const pid of state.pids) {
        const p = state.players[pid];
        if (!p.done) p.done = true; // chrono écoulé : on reste
      }
      enterDealer(state);
    }
  } else if (state.phase === 'dealer') {
    const t = handTotal(state.dealerCards).total;
    if (state.asym) {
      state.phaseT -= dt;
      if (t >= 21) { dealerDone(state); return evs; }
      if (state.phaseT <= 0) {
        // Chrono : la banque suit la règle maison.
        if (t < 17) { giveCard(state, 'D'); state.phaseT = DEALER_STEP; }
        else dealerDone(state);
      }
    } else {
      state.dealerStep -= dt;
      if (state.dealerStep <= 0) {
        if (t < 17) { giveCard(state, 'D'); state.dealerStep = DEALER_STEP; }
        else dealerDone(state);
      }
    }
  } else if (state.phase === 'payout') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) {
      if (state.hand >= state.hands) {
        state.phase = 'end';
        state.phaseT = END_T;
      } else {
        startHand(state);
      }
    }
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
  const isCroupier = state.asym && pid === state.croupier;
  const cacheKey = isCroupier ? 'c' : 'p';
  if (state._viewTick === state.tick && state._viewPid === cacheKey) return state._view;
  const showHole = state.dealerRevealed || isCroupier;
  const players = {};
  for (const [id, p] of Object.entries(state.players)) {
    players[id] = {
      cards: p.cards,
      total: handTotal(p.cards).total,
      bet: p.bet,
      chips: p.chips,
      done: p.done ? 1 : 0,
      bust: p.bust ? 1 : 0,
      bj: p.bj ? 1 : 0,
    };
  }
  const dt2 = state.dealerRevealed || isCroupier ? handTotal(state.dealerCards).total : null;
  state._view = {
    phase: state.phase,
    tl: Math.round(Math.max(0, state.phaseT) * 10) / 10,
    hand: state.hand,
    hands: state.hands,
    dealer: {
      cards: state.dealerCards.map((c, i) => (i === 1 && !showHole ? -1 : c)),
      total: dt2,
    },
    croupier: state.croupier,
    bank: state.asym ? state.bank : null,
    players,
  };
  state._viewTick = state.tick;
  state._viewPid = cacheKey;
  return state._view;
}

export function results(state) {
  const { cfg } = state;
  const chipsOf = (pid) => (pid === state.croupier ? state.bank : state.players[pid]?.chips ?? 0);
  const teamScore = cfg.teams.map((team) => team.reduce((s, pid) => s + chipsOf(pid), 0));
  const best = Math.max(...teamScore);
  const winTeams = teamScore.map((s, t) => [s, t]).filter(([s]) => s === best).map(([, t]) => t);
  const allTied = winTeams.length === cfg.teams.length && cfg.teams.length > 1;
  const winners = allTied ? [] : winTeams.flatMap((t) => cfg.teams[t]);

  const ranking = cfg.teams.flat()
    .map((pid) => ({ pid, score: chipsOf(pid), label: `${chipsOf(pid)} 🪙` }))
    .sort((a, b) => b.score - a.score)
    .map(({ pid, score, label }) => ({ pid, score, label }));

  const titles = [];
  const all = state.pids.map((pid) => ({ pid, s: state.players[pid].stats }));
  const top = (fn) => all.slice().sort((a, b) => fn(b.s) - fn(a.s))[0];
  if (all.length) {
    const bj = top((s) => s.bjs);
    if (bj.s.bjs >= 1) titles.push({ pid: bj.pid, emoji: '🃏', text: `Main de maître : ${bj.s.bjs} blackjack(s)` });
    const boom = top((s) => s.busts);
    if (boom.s.busts >= 2) titles.push({ pid: boom.pid, emoji: '💥', text: `Trop gourmand : ${boom.s.busts} mains sautées` });
    const flambeur = top((s) => s.doubles);
    if (flambeur.s.doubles >= 2) titles.push({ pid: flambeur.pid, emoji: '🎰', text: `Le Flambeur : ${flambeur.s.doubles} doubles` });
    const endette = top((s) => s.loans);
    if (endette.s.loans >= 1) titles.push({ pid: endette.pid, emoji: '🥀', text: `Ardoise chez le forain : ${endette.s.loans} prêt(s)` });
  }
  if (state.croupier && state.bank > START_CHIPS) {
    titles.push({ pid: state.croupier, emoji: '🎩', text: `La banque gagne toujours : +${state.bank - START_CHIPS} jetons` });
  }
  if (!titles.length && all.length) {
    const sage = top((s) => s.wins);
    titles.push({ pid: sage.pid, emoji: '🧮', text: `Compteur discret : ${sage.s.wins} mains gagnées` });
  }
  return { ranking, winners, titles };
}

// ── Bot : stratégie de base simplifiée, teintée de personnalité ────────

export function botAct(state, pid, mind, api) {
  if (state.done) return;
  const { p: pers, rng, mem } = mind;

  if (state.asym && pid === state.croupier) {
    if (state.phase !== 'dealer') return;
    const key = `${state.hand}-${state.dealerCards.length}`;
    if (mem.k === key) return;
    mem.k = key;
    const t = handTotal(state.dealerCards).total;
    if (t < 17 || (t === 17 && rng.chance(pers.aggro * 0.25))) api.act('hit');
    else api.act('stand');
    return;
  }

  const p = state.players[pid];
  if (!p || state.phase !== 'act' || p.done) return;
  const key = `${state.hand}-${p.cards.length}`;
  if (mem.k !== key) {
    mem.k = key;
    mem.delay = 0.8 + rng.next() * 4 * pers.pace;
    mem.at = state.simT;
  }
  if (state.simT - mem.at < mem.delay) return;
  mem.k = `${key}-done`;

  const { total, soft } = handTotal(p.cards);
  const up = state.dealerCards.length ? Math.min((state.dealerCards[0] % 13) + 1, 10) : 10;
  const upVal = up === 1 ? 11 : up;

  if (rng.chance(pers.chaos * 0.12)) { api.act(rng.chance(0.6) ? 'hit' : 'stand'); return; }

  if (p.cards.length === 2 && !p.doubled && (total === 10 || total === 11) && rng.chance(pers.aggro * 0.7)) {
    api.act('double');
    return;
  }
  if (soft && total <= 17) { api.act('hit'); return; }
  if (total <= 11) { api.act('hit'); return; }
  if (total >= 17) { api.act('stand'); return; }
  // 12-16 : tirer si la banque montre fort (7+), selon le skill.
  const bankStrong = upVal >= 7;
  if (bankStrong && rng.chance(0.4 + pers.skill * 0.5)) api.act('hit');
  else if (!bankStrong && rng.chance(1 - pers.skill * 0.6)) api.act('hit');
  else api.act('stand');
}
