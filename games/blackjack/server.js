// BLACKJACK : simulation serveur. Une vraie table de 21 :
// mise LIBRE (jetons 1/5/25/100/500, reglette, tapis), sabot de 1 a 6 jeux
// avec carte de coupe, distribution animee, decisions SIMULTANEES,
// SPLIT jusqu'a 4 mains (as splittes : une carte), DOUBLE (aussi apres split),
// ABANDON tardif, ASSURANCE et argent comptant contre l'as, peek du croupier,
// banque a 17 (ou tire le 17 souple), blackjack paye 3:2 ou 6:5.
// Asym « Le Croupier » : le joueur solo tient la banque (libre des 14).

import { makeShoe, handTotal } from '../../shared/cards.js';

export const CHIPS = [1, 5, 25, 100, 500];
const MIN_BET = 1;
const MAX_HANDS = 4;        // 3 splits maximum, comme au casino
const DEAL_STEP = 0.15;
const INS_T = 7;            // fenetre d'assurance / argent comptant
const DEALER_STEP = 0.7;    // rythme de tirage de la banque
const PEEK_T = 0.9;         // suspense du peek quand la banque montre une buche
const PAY_T = 3.2;
const END_T = 2.4;
const RESHUFFLE = 0.28;     // carte de coupe : on remelange sous ce ratio

const rankOf = (id) => (id % 13) + 1;
const valOf = (id) => Math.min(rankOf(id), 10);   // As = 1 ici
const isAce = (id) => rankOf(id) === 1;

// Valide une valeur de reglage contre la liste autorisee.
const pick = (v, allowed, def) => (allowed.includes(v) ? v : def);

function mkHand(bet, fromSplit = false) {
  return {
    cards: [], bet, done: false, bust: false, bj: false,
    dbl: false, surr: false, split: fromSplit, frozen: false, res: null, delta: 0,
  };
}

const activeHand = (p) => p.hands[p.active] || null;
// Total engage sur la table (mises + assurance) : jamais plus que le tapis.
const committed = (p) => p.hands.reduce((s, h) => s + h.bet, 0) + p.ins;
const freeChips = (p) => p.chips - committed(p);

export function createState(cfg) {
  const st = cfg.settings || {};
  const asym = cfg.format.kind === 'asym';
  const croupier = asym ? cfg.teams[0][0] : null;
  const pids = cfg.teams.flat().filter((pid) => pid !== croupier);
  const start = pick(st.chips, [100, 500, 2000], 500);
  const speed = pick(st.speed, [12, 18, 30], 18);
  const decks = pick(st.decks, [1, 2, 6], 6);

  const state = {
    cfg,
    rng: cfg.rng,
    asym, croupier,
    pids,
    teamOf: {},
    rules: {
      hands: pick(st.hands, [3, 8, 15, 30], 8),
      start,
      decks,
      s17: pick(st.soft17, ['s17', 'h17'], 's17') === 's17',
      bjPay: pick(st.payout, ['3:2', '6:5'], '3:2') === '3:2' ? 1.5 : 1.2,
      bjLabel: pick(st.payout, ['3:2', '6:5'], '3:2'),
      surrender: pick(st.surrender, ['on', 'off'], 'on') === 'on',
      actT: speed,
      betT: Math.round(speed * 0.75),
      loan: Math.max(20, Math.round(start * 0.2)),
    },
    hand: 0,
    phase: 'bet',
    phaseT: 0,
    shoe: [],
    shoeTotal: decks * 52,
    dealQ: [],
    dealT: 0,
    dealerCards: [],
    dealerRevealed: false,
    dealerStep: 0,
    dealerBj: false,
    insAvail: false,
    bank: start * 4,
    players: {},
    simT: 0,
    done: false,
    evq: [],
    tick: 0, _viewTick: -1, _viewKey: undefined, _view: null,
  };
  cfg.teams.forEach((team, t) => {
    for (const pid of team) state.teamOf[pid] = t;
  });
  for (const pid of pids) {
    state.players[pid] = {
      pid,
      chips: start,
      betBase: Math.min(10, start),
      bet: 0,
      betOk: false,
      hands: [],
      active: 0,
      done: false,
      ins: 0,
      insEven: false,
      lastDelta: 0,
      stats: {
        bjs: 0, busts: 0, doubles: 0, splits: 0, surrs: 0, wins: 0, pushes: 0,
        loans: 0, insWins: 0, biggest: 0, peak: start, played: 0,
      },
    };
  }
  if (state.asym) state.bank = start * Math.max(3, pids.length);
  reshuffle(state);
  startHand(state);
  return state;
}

// ── Sabot ──────────────────────────────────────────────────────────────

function reshuffle(state) {
  state.shoe = makeShoe(state.rules.decks);
  state.rng.shuffle(state.shoe);
  state.shoeTotal = state.shoe.length;
  state.evq.push({ e: 'shuffle', n: state.rules.decks });
}

function draw(state) {
  if (!state.shoe.length) reshuffle(state);
  return state.shoe.pop();
}

// ── Cycle d'une main ───────────────────────────────────────────────────

function startHand(state) {
  state.hand++;
  if (state.shoe.length < state.shoeTotal * RESHUFFLE) reshuffle(state);
  state.dealerCards = [];
  state.dealerRevealed = false;
  state.dealerBj = false;
  state.insAvail = false;
  state.phase = 'bet';
  state.phaseT = state.rules.betT;
  state.dealQ = [];
  for (const pid of state.pids) {
    const p = state.players[pid];
    if (p.chips < MIN_BET) {
      p.chips += state.rules.loan;
      p.stats.loans++;
      state.evq.push({ e: 'loan', pid, n: state.rules.loan });
    }
    p.bet = Math.max(MIN_BET, Math.min(p.betBase, p.chips));
    p.betOk = false;
    p.hands = [];
    p.active = 0;
    p.done = false;
    p.ins = 0;
    p.insEven = false;
    p.lastDelta = 0;
  }
  state.evq.push({ e: 'hand', n: state.hand, of: state.rules.hands });
}

function enterDeal(state) {
  state.phase = 'deal';
  state.dealT = 0.45;
  state.dealQ = [];
  for (const pid of state.pids) {
    const p = state.players[pid];
    p.bet = Math.max(MIN_BET, Math.min(p.bet, p.chips));
    p.betBase = p.bet;
    p.betOk = true;
    p.hands = [mkHand(p.bet)];
    p.active = 0;
    p.stats.played++;
    p.stats.biggest = Math.max(p.stats.biggest, p.bet);
  }
  // Deux tours de table, puis les 2 cartes de la banque (2e cachee).
  for (let k = 0; k < 2; k++) {
    for (const pid of state.pids) state.dealQ.push(pid);
    state.dealQ.push('D');
  }
}

function giveCard(state, to, hi = null) {
  const id = draw(state);
  if (to === 'D') {
    state.dealerCards.push(id);
    const hidden = state.dealerCards.length === 2 && !state.dealerRevealed;
    state.evq.push({ e: 'card', to: 'D', id: hidden ? -1 : id });
    return id;
  }
  const p = state.players[to];
  if (!p) return id;
  const idx = hi == null ? p.active : hi;
  const h = p.hands[idx];
  if (!h) return id;
  h.cards.push(id);
  state.evq.push({ e: 'card', to, h: idx, id, total: handTotal(h.cards).total });
  return id;
}

// Fin de la distribution : naturels, puis assurance ou peek.
function afterDeal(state) {
  for (const pid of state.pids) {
    const p = state.players[pid];
    const h = p.hands[0];
    if (h && h.cards.length === 2 && handTotal(h.cards).total === 21) {
      h.bj = true;
      h.done = true;
      p.done = true;
      p.stats.bjs++;
      state.evq.push({ e: 'bj', pid });
    }
  }
  const up = state.dealerCards[0];
  if (up !== undefined && isAce(up)) {
    state.insAvail = true;
    state.phase = 'ins';
    state.phaseT = INS_T;
    state.evq.push({ e: 'insopen' });
    return;
  }
  if (up !== undefined && valOf(up) === 10) {
    state.phase = 'peek';
    state.phaseT = PEEK_T;
    return;
  }
  enterAct(state);
}

// Le croupier regarde sa carte cachee : blackjack = main reglee tout de suite.
function resolvePeek(state) {
  state.insAvail = false;
  const d = handTotal(state.dealerCards);
  if (state.dealerCards.length === 2 && d.total === 21) {
    state.dealerBj = true;
    state.dealerRevealed = true;
    state.evq.push({ e: 'reveal', id: state.dealerCards[1] });
    state.evq.push({ e: 'dealerbj' });
    settle(state);
    return;
  }
  enterAct(state);
}

function enterAct(state) {
  state.phase = 'act';
  state.phaseT = state.rules.actT;
  for (const pid of state.pids) {
    const p = state.players[pid];
    if (p.hands.every((h) => h.done)) p.done = true;
  }
  checkAllDone(state);
}

// Passe a la main suivante non jouee ; toutes jouees = joueur fini.
function advance(state, p) {
  while (p.active < p.hands.length && p.hands[p.active].done) p.active++;
  if (p.active >= p.hands.length) {
    p.active = Math.max(0, p.hands.length - 1);
    p.done = true;
  }
}

function checkAllDone(state) {
  if (state.phase !== 'act') return;
  if (state.pids.every((pid) => state.players[pid].done)) enterDealer(state);
}

function enterDealer(state) {
  state.dealerRevealed = true;
  state.evq.push({ e: 'reveal', id: state.dealerCards[1] });
  // Personne n'a de main vivante : la banque n'a rien a jouer.
  const alive = state.pids.some((pid) =>
    state.players[pid].hands.some((h) => !h.bust && !h.surr && !h.bj));
  if (!alive) { settle(state); return; }
  state.phase = 'dealer';
  state.phaseT = state.rules.actT;
  state.dealerStep = DEALER_STEP;
}

// La banque doit-elle tirer ? (17 souple selon la regle de la maison)
function dealerMustHit(state) {
  const t = handTotal(state.dealerCards);
  if (t.total < 17) return true;
  if (t.total === 17 && t.soft && !state.rules.s17) return true;
  return false;
}

// ── Paiements ──────────────────────────────────────────────────────────

function settle(state) {
  state.phase = 'payout';
  state.phaseT = PAY_T;
  state.dealerRevealed = true;
  const d = handTotal(state.dealerCards);
  const dBust = d.total > 21;
  const dBj = state.dealerBj;

  for (const pid of state.pids) {
    const p = state.players[pid];
    let delta = 0;
    for (const h of p.hands) {
      const t = handTotal(h.cards).total;
      let res, gain;
      if (h.surr) { res = 'surr'; gain = -Math.round(h.bet / 2); }
      else if (h.bust) { res = 'bust'; gain = -h.bet; }
      else if (h.bj) {
        if (dBj) { res = 'push'; gain = 0; p.stats.pushes++; }
        else { res = 'bj'; gain = Math.round(h.bet * state.rules.bjPay); p.stats.wins++; }
      } else if (dBj) { res = 'lose'; gain = -h.bet; }
      else if (dBust || t > d.total) { res = 'win'; gain = h.bet; p.stats.wins++; }
      else if (t === d.total) { res = 'push'; gain = 0; p.stats.pushes++; }
      else { res = 'lose'; gain = -h.bet; }
      h.res = res;
      h.delta = gain;
      delta += gain;
    }
    if (p.ins > 0) {
      if (dBj) { delta += p.ins * 2; p.stats.insWins++; }
      else delta -= p.ins;
    }
    p.chips = Math.max(0, p.chips + delta);
    p.lastDelta = delta;
    p.stats.peak = Math.max(p.stats.peak, p.chips);
    state.bank -= delta;
    state.evq.push({ e: 'result', pid, d: delta, ins: p.ins ? 1 : 0 });
  }
}

// ── Actions du joueur ──────────────────────────────────────────────────

function playerHit(state, p) {
  const h = activeHand(p);
  if (!h) return;
  giveCard(state, p.pid);
  const t = handTotal(h.cards).total;
  if (t > 21) {
    h.bust = true;
    h.done = true;
    p.stats.busts++;
    state.evq.push({ e: 'bust', pid: p.pid, h: p.active });
  } else if (t === 21) {
    h.done = true;
  }
  advance(state, p);
}

// Legalite des actions : calculee serveur, envoyee dans la vue (info publique).
function legalFor(state, p) {
  const out = { hit: 0, stand: 0, dbl: 0, split: 0, surr: 0, ins: 0 };
  if (state.phase === 'ins') {
    const h0 = p.hands[0];
    out.ins = state.insAvail && p.ins === 0 && h0 && freeChips(p) >= Math.ceil(h0.bet / 2) ? 1 : 0;
    return out;
  }
  if (state.phase !== 'act' || p.done) return out;
  const h = activeHand(p);
  if (!h || h.done || h.frozen) return out;
  out.hit = 1;
  out.stand = 1;
  const fresh = h.cards.length === 2;
  if (fresh && !h.dbl && freeChips(p) >= h.bet) out.dbl = 1;
  if (fresh && p.hands.length < MAX_HANDS
      && valOf(h.cards[0]) === valOf(h.cards[1]) && freeChips(p) >= h.bet
      && !(h.split && isAce(h.cards[0]))) {
    out.split = 1;
  }
  if (state.rules.surrender && fresh && !h.split && p.hands.length === 1) out.surr = 1;
  return out;
}

export function onInput(state, pid, d) {
  // Repli du harnais de test : un tap brut est traduit en action plausible.
  if (!d || typeof d.tx !== 'number' || !Number.isFinite(d.tx)) return;
  const p = state.players[pid];
  if (!p || state.done) return;
  const band = Math.floor((((d.tx % 900) + 900) % 900) / 150); // 0..5
  if (state.phase === 'bet') {
    if (band === 0) onAction(state, pid, 'betClear');
    else if (band <= 3) onAction(state, pid, 'bet', { v: CHIPS[band] });
    else onAction(state, pid, 'betOk');
    return;
  }
  if (state.phase === 'ins') { if (band === 0) onAction(state, pid, 'insure'); return; }
  const acts = ['hit', 'stand', 'double', 'split', 'surrender', 'stand'];
  onAction(state, pid, acts[band] || 'stand');
}

export function onAction(state, pid, a, d) {
  if (state.done || typeof a !== 'string') return;

  // ── Le Croupier humain tient la banque ──
  if (state.asym && pid === state.croupier) {
    if (state.phase !== 'dealer') return;
    const t = handTotal(state.dealerCards).total;
    if (a === 'hit' && t < 21) {
      giveCard(state, 'D');
      if (handTotal(state.dealerCards).total >= 21) settle(state);
      else state.dealerStep = DEALER_STEP;
    } else if (a === 'stand' && t >= 14) {
      settle(state);
    }
    return;
  }

  const p = state.players[pid];
  if (!p) return;

  // ── Phase de mise : montant totalement libre ──
  if (state.phase === 'bet') {
    if (p.betOk && a !== 'betEdit') return;
    const setBet = (v) => {
      if (!Number.isFinite(v)) return;
      p.bet = Math.max(MIN_BET, Math.min(Math.round(v), p.chips));
    };
    if (a === 'bet' && d && typeof d === 'object') {
      const v = Math.round(Number(d.v));
      if (CHIPS.includes(v)) setBet(p.bet + v);
    } else if (a === 'betSet' && d && typeof d === 'object') {
      setBet(Number(d.v));
    } else if (a === 'betClear') {
      setBet(MIN_BET);
    } else if (a === 'betMax') {
      setBet(p.chips);
    } else if (a === 'betDouble') {
      setBet(p.bet * 2);
    } else if (a === 'betRepeat') {
      setBet(p.betBase);
    } else if (a === 'betEdit') {
      p.betOk = false;
    } else if (a === 'betOk') {
      p.betOk = true;
      state.evq.push({ e: 'betok', pid, v: p.bet });
      if (state.pids.every((id) => state.players[id].betOk)) enterDeal(state);
    }
    return;
  }

  // ── Assurance / argent comptant ──
  if (state.phase === 'ins') {
    if (a !== 'insure') return;
    const h0 = p.hands[0];
    if (!state.insAvail || p.ins > 0 || !h0) return;
    const cost = Math.ceil(h0.bet / 2);
    if (freeChips(p) < cost) return;
    p.ins = cost;
    p.insEven = !!h0.bj;
    state.evq.push({ e: 'ins', pid, even: p.insEven ? 1 : 0 });
    return;
  }

  // ── Phase de jeu ──
  if (state.phase !== 'act' || p.done) return;
  const h = activeHand(p);
  if (!h || h.done) return;
  const can = legalFor(state, p);

  if (a === 'hit') {
    if (!can.hit) return;
    playerHit(state, p);
  } else if (a === 'stand') {
    if (!can.stand) return;
    h.done = true;
    advance(state, p);
  } else if (a === 'double') {
    if (!can.dbl) return;
    h.dbl = true;
    h.bet *= 2;
    p.stats.doubles++;
    p.stats.biggest = Math.max(p.stats.biggest, h.bet);
    state.evq.push({ e: 'double', pid, h: p.active, bet: h.bet });
    giveCard(state, pid, p.active);
    if (handTotal(h.cards).total > 21) {
      h.bust = true;
      p.stats.busts++;
      state.evq.push({ e: 'bust', pid, h: p.active });
    }
    h.done = true;
    advance(state, p);
  } else if (a === 'split') {
    if (!can.split) return;
    const c1 = h.cards[0], c2 = h.cards[1];
    const aces = isAce(c1);
    const nh = mkHand(h.bet, true);
    h.split = true;
    h.cards = [c1];
    nh.cards = [c2];
    p.hands.splice(p.active + 1, 0, nh);
    p.stats.splits++;
    state.evq.push({ e: 'split', pid, h: p.active, n: p.hands.length });
    giveCard(state, pid, p.active);
    giveCard(state, pid, p.active + 1);
    // As splittes : une seule carte par main, on ne rejoue plus.
    for (const sh of [p.hands[p.active], p.hands[p.active + 1]]) {
      if (aces) { sh.done = true; sh.frozen = true; }
      else if (handTotal(sh.cards).total === 21) sh.done = true;
    }
    advance(state, p);
  } else if (a === 'surrender') {
    if (!can.surr) return;
    h.surr = true;
    h.done = true;
    p.stats.surrs++;
    state.evq.push({ e: 'surrender', pid, h: p.active });
    advance(state, p);
  } else {
    return;
  }
  checkAllDone(state);
}

export function tick(state, dt) {
  const evs = state.evq;
  state.evq = [];
  state.tick++;
  state.simT += dt;
  if (state.done) return evs;

  if (state.phase === 'bet') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) enterDeal(state);
  } else if (state.phase === 'deal') {
    state.dealT -= dt;
    if (state.dealT <= 0) {
      if (state.dealQ.length) {
        giveCard(state, state.dealQ.shift());
        state.dealT = state.dealQ.length ? DEAL_STEP : 0.55;
      } else {
        afterDeal(state);
      }
    }
  } else if (state.phase === 'ins') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) { state.phase = 'peek'; state.phaseT = PEEK_T; }
  } else if (state.phase === 'peek') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) resolvePeek(state);
  } else if (state.phase === 'act') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) {
      // Chrono ecoule : les mains restantes restent en l'etat.
      for (const pid of state.pids) {
        const p = state.players[pid];
        if (p.done) continue;
        for (const h of p.hands) h.done = true;
        p.done = true;
      }
      enterDealer(state);
    }
  } else if (state.phase === 'dealer') {
    const t = handTotal(state.dealerCards).total;
    if (state.asym) {
      state.phaseT -= dt;
      if (t >= 21) { settle(state); return evs; }
      if (state.phaseT <= 0) {
        if (dealerMustHit(state)) { giveCard(state, 'D'); state.phaseT = DEALER_STEP; }
        else settle(state);
      }
    } else {
      state.dealerStep -= dt;
      if (state.dealerStep <= 0) {
        if (dealerMustHit(state)) { giveCard(state, 'D'); state.dealerStep = DEALER_STEP; }
        else settle(state);
      }
    }
  } else if (state.phase === 'payout') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) {
      if (state.hand >= state.rules.hands) { state.phase = 'end'; state.phaseT = END_T; }
      else startHand(state);
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
  const key = isCroupier ? 'c' : 'p';
  if (state._viewTick === state.tick && state._viewKey === key) return state._view;
  const showHole = state.dealerRevealed || isCroupier;

  const players = {};
  for (const id of state.pids) {
    const p = state.players[id];
    players[id] = {
      chips: p.chips,
      bet: p.bet,
      ok: p.betOk ? 1 : 0,
      active: p.active,
      done: p.done ? 1 : 0,
      ins: p.ins,
      even: p.insEven ? 1 : 0,
      delta: p.lastDelta,
      can: legalFor(state, p),
      hands: p.hands.map((h) => {
        const t = handTotal(h.cards);
        return {
          cards: h.cards,
          total: t.total,
          soft: t.soft ? 1 : 0,
          bet: h.bet,
          done: h.done ? 1 : 0,
          bust: h.bust ? 1 : 0,
          bj: h.bj ? 1 : 0,
          dbl: h.dbl ? 1 : 0,
          surr: h.surr ? 1 : 0,
          split: h.split ? 1 : 0,
          frozen: h.frozen ? 1 : 0,
          res: h.res,
          delta: h.delta,
        };
      }),
    };
  }

  const dTotal = showHole ? handTotal(state.dealerCards) : null;
  state._view = {
    phase: state.phase,
    tl: Math.round(Math.max(0, state.phaseT) * 10) / 10,
    tlMax: state.phase === 'bet' ? state.rules.betT
      : state.phase === 'ins' ? INS_T
        : state.phase === 'act' || state.phase === 'dealer' ? state.rules.actT : PAY_T,
    hand: state.hand,
    hands: state.rules.hands,
    minBet: MIN_BET,
    chipVals: CHIPS,
    rules: {
      bj: state.rules.bjLabel,
      s17: state.rules.s17 ? 1 : 0,
      surr: state.rules.surrender ? 1 : 0,
      decks: state.rules.decks,
    },
    shoe: state.shoe.length,
    shoeTotal: state.shoeTotal,
    insAvail: state.insAvail ? 1 : 0,
    dealer: {
      cards: state.dealerCards.map((c, i) => (i === 1 && !showHole ? -1 : c)),
      total: dTotal ? dTotal.total : null,
      soft: dTotal && dTotal.soft ? 1 : 0,
      bj: state.dealerBj ? 1 : 0,
    },
    croupier: state.croupier,
    bank: state.asym ? state.bank : null,
    players,
  };
  state._viewTick = state.tick;
  state._viewKey = key;
  return state._view;
}

export function results(state) {
  const cfg = state.cfg;
  const chipsOf = (pid) => (pid === state.croupier ? state.bank : (state.players[pid] ? state.players[pid].chips : 0));
  const teamScore = cfg.teams.map((team) => team.reduce((s, pid) => s + chipsOf(pid), 0));
  const best = Math.max(...teamScore);
  const winTeams = teamScore.map((s, t) => [s, t]).filter(([s]) => s === best).map(([, t]) => t);
  const allTied = winTeams.length === cfg.teams.length && cfg.teams.length > 1;
  const winners = allTied ? [] : winTeams.flatMap((t) => cfg.teams[t]);

  const ranking = cfg.teams.flat()
    .map((pid) => ({ pid, score: chipsOf(pid), label: `${chipsOf(pid)} 🪙` }))
    .sort((a, b) => b.score - a.score);

  const titles = [];
  const all = state.pids.map((pid) => ({ pid, s: state.players[pid].stats }));
  const top = (fn) => all.slice().sort((a, b) => fn(b.s) - fn(a.s))[0];
  if (all.length) {
    const bj = top((s) => s.bjs);
    if (bj.s.bjs >= 1) titles.push({ pid: bj.pid, emoji: '🃏', text: `Main de maitre : ${bj.s.bjs} blackjack(s)` });
    const cut = top((s) => s.splits);
    if (cut.s.splits >= 1) titles.push({ pid: cut.pid, emoji: '✂️', text: `Coupeur de paires : ${cut.s.splits} split(s)` });
    const boom = top((s) => s.busts);
    if (boom.s.busts >= 2) titles.push({ pid: boom.pid, emoji: '💥', text: `Trop gourmand : ${boom.s.busts} mains sautees` });
    const fl = top((s) => s.doubles);
    if (fl.s.doubles >= 2) titles.push({ pid: fl.pid, emoji: '🎰', text: `Le Flambeur : ${fl.s.doubles} doubles` });
    const big = top((s) => s.biggest);
    if (big.s.biggest >= 50) titles.push({ pid: big.pid, emoji: '💸', text: `Plus grosse mise de la soiree : ${big.s.biggest} jetons` });
    const fr = top((s) => s.surrs);
    if (fr.s.surrs >= 2) titles.push({ pid: fr.pid, emoji: '🏳️', text: `Sage ou froussard : ${fr.s.surrs} abandons` });
    const sur = top((s) => s.insWins);
    if (sur.s.insWins >= 1) titles.push({ pid: sur.pid, emoji: '🛡️', text: `Assure tous risques : ${sur.s.insWins} assurance(s) payee(s)` });
    const dette = top((s) => s.loans);
    if (dette.s.loans >= 1) titles.push({ pid: dette.pid, emoji: '🥀', text: `Ardoise chez le forain : ${dette.s.loans} pret(s)` });
  }
  if (state.croupier && state.bank > state.rules.start * Math.max(3, state.pids.length)) {
    titles.push({ pid: state.croupier, emoji: '🎩', text: 'La banque gagne toujours' });
  }
  if (!titles.length && all.length) {
    const sage = top((s) => s.wins);
    titles.push({ pid: sage.pid, emoji: '🧮', text: `Compteur discret : ${sage.s.wins} mains gagnees` });
  }
  return { ranking, winners, titles };
}

// ── Bot : mise selon le temperament, puis vraie strategie de base ──────

// Strategie de base condensee. up = valeur visible de la banque (1 = as).
function basicMove(total, soft, up, can, pairVal) {
  const u = up === 1 ? 11 : up;
  // Paires : la strategie des splits.
  if (can.split && pairVal != null) {
    if (pairVal === 1 || pairVal === 8) return 'split';
    if (pairVal === 9 && u !== 7 && u <= 9) return 'split';
    if ((pairVal === 2 || pairVal === 3 || pairVal === 7) && u <= 7) return 'split';
    if (pairVal === 6 && u <= 6) return 'split';
    if (pairVal === 4 && (u === 5 || u === 6)) return 'split';
  }
  // Abandon : 16 contre 9/10/as, 15 contre 10.
  if (can.surr) {
    if (total === 16 && !soft && (u >= 9 || u === 11)) return 'surrender';
    if (total === 15 && !soft && u === 10) return 'surrender';
  }
  if (soft) {
    if (total >= 19) return 'stand';
    if (total === 18) {
      if (can.dbl && u >= 3 && u <= 6) return 'double';
      return u >= 9 || u === 11 ? 'hit' : 'stand';
    }
    if (can.dbl && total >= 15 && total <= 17 && u >= 4 && u <= 6) return 'double';
    if (can.dbl && total >= 13 && total <= 14 && (u === 5 || u === 6)) return 'double';
    return 'hit';
  }
  if (total >= 17) return 'stand';
  if (total === 11) return can.dbl ? 'double' : 'hit';
  if (total === 10) return can.dbl && u <= 9 ? 'double' : 'hit';
  if (total === 9) return can.dbl && u >= 3 && u <= 6 ? 'double' : 'hit';
  if (total >= 13) return u <= 6 ? 'stand' : 'hit';
  if (total === 12) return u >= 4 && u <= 6 ? 'stand' : 'hit';
  return 'hit';
}

export function botAct(state, pid, mind, api) {
  if (state.done) return;
  const pers = mind.p, rng = mind.rng, mem = mind.mem;

  // Le Croupier asymetrique tient la banque.
  if (state.asym && pid === state.croupier) {
    if (state.phase !== 'dealer') return;
    const key = `d-${state.hand}-${state.dealerCards.length}`;
    if (mem.k === key) return;
    mem.k = key;
    const dt = handTotal(state.dealerCards);
    if (dt.total < 17 || (dt.total === 17 && dt.soft && rng.chance(0.5 + pers.aggro * 0.4))) api.act('hit');
    else api.act('stand');
    return;
  }

  const p = state.players[pid];
  if (!p) return;

  // ── Mise : temperament + taille du tapis ──
  if (state.phase === 'bet') {
    const key = `bet-${state.hand}`;
    if (mem.k !== key) {
      mem.k = key;
      mem.delay = 0.5 + rng.next() * 2.2 * pers.pace;
      mem.at = state.simT;
      return;
    }
    if (p.betOk || state.simT - mem.at < mem.delay) return;
    mem.k = `${key}-done`;
    const unit = Math.max(1, Math.round(state.rules.start / 50));   // 2 % du tapis de depart
    let mult = 1 + Math.round(pers.aggro * 3);                      // 1 a 4 unites
    if (rng.chance(pers.chaos * 0.25)) mult *= 2;                   // coup de sang
    if (p.chips < state.rules.start * 0.3 && rng.chance(0.5)) mult = Math.max(1, mult - 1);
    const target = Math.max(MIN_BET, Math.min(unit * mult, p.chips));
    api.act('betSet', { v: target });
    api.act('betOk');
    return;
  }

  // ── Assurance : rarement, c'est un piege (sauf argent comptant) ──
  if (state.phase === 'ins') {
    const key = `ins-${state.hand}`;
    if (mem.k === key) return;
    mem.k = key;
    const h0 = p.hands[0];
    if (!h0) return;
    if (h0.bj && rng.chance(0.55)) api.act('insure');          // argent comptant
    else if (rng.chance((1 - pers.skill) * 0.25)) api.act('insure');
    return;
  }

  if (state.phase !== 'act' || p.done) return;
  const h = activeHand(p);
  if (!h || h.done) return;
  const key = `${state.hand}-${p.active}-${h.cards.length}-${p.hands.length}`;
  if (mem.k !== key) {
    mem.k = key;
    mem.delay = 0.6 + rng.next() * 3 * pers.pace;
    mem.at = state.simT;
    return;
  }
  if (state.simT - mem.at < mem.delay) return;
  mem.k = `${key}-done`;

  const can = legalFor(state, p);
  const ht = handTotal(h.cards);
  const up = state.dealerCards.length ? valOf(state.dealerCards[0]) : 10;
  const pairVal = h.cards.length === 2 && valOf(h.cards[0]) === valOf(h.cards[1]) ? valOf(h.cards[0]) : null;

  // Coup de folie : le forain n'est pas une machine.
  if (rng.chance(pers.chaos * 0.1)) { api.act(rng.chance(0.6) ? 'hit' : 'stand'); return; }

  const move = basicMove(ht.total, ht.soft, up, can, pairVal);
  // Moins le bot est bon, plus il s'ecarte de la strategie de base.
  if (rng.chance((1 - pers.skill) * 0.35)) {
    if (move === 'double' && can.hit) { api.act('hit'); return; }
    if (move === 'surrender' && can.hit) { api.act('hit'); return; }
    if (move === 'stand' && ht.total <= 16 && can.hit && rng.chance(0.5)) { api.act('hit'); return; }
    if (move === 'hit' && ht.total >= 12 && rng.chance(0.4)) { api.act('stand'); return; }
  }
  api.act(move);
}
