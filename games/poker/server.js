// POKER : simulation serveur. Texas Hold'em complet, joueurs contre joueurs.
// Bouton de donneur tournant, blindes qui montent, quatre tours d'encheres
// (preflop, flop, turn, river), relance a montant libre, tapis, pots
// secondaires, abattage avec un vrai evaluateur de mains (7 cartes vers 5).
// Asym « Le Requin » : tapis double et un coup d'oeil par main dans le jeu
// d'un adversaire, annonce a toute la table.

import { makeShoe } from '../../shared/cards.js';

const DEAL_T = 1.1;         // distribution des cartes fermees
const FLIP_T = 1.3;         // pause a chaque carte commune
const SHOW_T = 4.2;         // abattage
const PAY_T = 2.2;          // ramassage du pot
const END_T = 2.6;
const SIM_MAX = 1500;       // garde-fou global (secondes simulees)

const pick = (v, allowed, def) => (allowed.includes(v) ? v : def);
const rankOf = (id) => (id % 13) + 1;               // 1 = as
const suitOf = (id) => Math.floor(id / 13) % 4;
const hiRank = (id) => (rankOf(id) === 1 ? 14 : rankOf(id));  // as haut

// ── Evaluateur de mains ────────────────────────────────────────────────
// score5 renvoie un tableau comparable lexicographiquement :
// [categorie, departages...]. 8 = quinte flush ... 0 = hauteur.

export function score5(ids) {
  const rs = ids.map(hiRank);
  const ss = ids.map(suitOf);
  const flush = ss.every((s) => s === ss[0]);
  const cnt = new Map();
  for (const r of rs) cnt.set(r, (cnt.get(r) || 0) + 1);
  const groups = [...cnt.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const uniq = [...cnt.keys()].sort((a, b) => b - a);

  let straight = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straight = uniq[0];
    else if (uniq[0] === 14 && uniq[1] === 5 && uniq[4] === 2) straight = 5; // la roue
  }
  if (flush && straight) return [8, straight];
  if (groups[0][1] === 4) return [7, groups[0][0], groups[1][0]];
  if (groups[0][1] === 3 && groups[1][1] === 2) return [6, groups[0][0], groups[1][0]];
  if (flush) return [5, ...uniq];
  if (straight) return [4, straight];
  if (groups[0][1] === 3) return [3, groups[0][0], ...uniq.filter((r) => r !== groups[0][0])];
  if (groups[0][1] === 2 && groups[1][1] === 2) {
    const hi = Math.max(groups[0][0], groups[1][0]);
    const lo = Math.min(groups[0][0], groups[1][0]);
    return [2, hi, lo, uniq.find((r) => r !== hi && r !== lo)];
  }
  if (groups[0][1] === 2) return [1, groups[0][0], ...uniq.filter((r) => r !== groups[0][0])];
  return [0, ...uniq];
}

export function cmpScore(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i] === undefined ? -1 : a[i];
    const y = b[i] === undefined ? -1 : b[i];
    if (x !== y) return x - y;
  }
  return 0;
}

// Meilleure main de 5 parmi 7 (ou moins). Renvoie { score, cards }.
export function best5(ids) {
  if (ids.length <= 5) return { score: ids.length === 5 ? score5(ids) : [-1], cards: [...ids] };
  let bestS = null, bestC = null;
  const n = ids.length;
  for (let a = 0; a < n - 4; a++) {
    for (let b = a + 1; b < n - 3; b++) {
      for (let c = b + 1; c < n - 2; c++) {
        for (let d = c + 1; d < n - 1; d++) {
          for (let e = d + 1; e < n; e++) {
            const combo = [ids[a], ids[b], ids[c], ids[d], ids[e]];
            const s = score5(combo);
            if (!bestS || cmpScore(s, bestS) > 0) { bestS = s; bestC = combo; }
          }
        }
      }
    }
  }
  return { score: bestS, cards: bestC };
}

const R_UN = ['', '', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'valet', 'dame', 'roi', 'as'];
const R_PL = ['', '', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'valets', 'dames', 'rois', 'as'];

// Nom francais de la main, pour l'abattage.
export function handName(score) {
  if (!score || score[0] < 0) return '';
  const [cat, a, b] = score;
  switch (cat) {
    case 8: return a === 14 ? 'Quinte flush royale' : `Quinte flush à ${R_UN[a]}`;
    case 7: return `Carré de ${R_PL[a]}`;
    case 6: return `Full aux ${R_PL[a]} par les ${R_PL[b]}`;
    case 5: return `Couleur à ${R_UN[a]}`;
    case 4: return `Quinte à ${R_UN[a]}`;
    case 3: return `Brelan de ${R_PL[a]}`;
    case 2: return `Double paire, ${R_PL[a]} et ${R_PL[b]}`;
    case 1: return `Paire de ${R_PL[a]}`;
    default: return `Hauteur ${R_UN[a]}`;
  }
}

// ── Mise en place ──────────────────────────────────────────────────────

export function createState(cfg) {
  const st = cfg.settings || {};
  const asym = cfg.format.kind === 'asym';
  const requin = asym ? cfg.teams[0][0] : null;
  const seats = cfg.teams.flat();
  const start = pick(st.tapis, [200, 1000, 5000], 1000);
  const hands = pick(st.mains, [4, 10, 20], 10);
  const actT = pick(st.rythme, [12, 20, 30], 20);

  const state = {
    cfg,
    rng: cfg.rng,
    asym, requin,
    seats,
    teamOf: {},
    rules: {
      hands, start, actT,
      sb: Math.max(1, Math.round(start / 100)),
      blindEvery: Math.max(3, Math.round(hands / 3)),
    },
    hand: 0,
    button: 0,
    phase: 'deal',
    phaseT: DEAL_T,
    street: 0,
    board: [],
    deck: [],
    curBet: 0,
    minRaise: 0,
    toAct: null,
    turnT: 0,
    players: {},
    pots: [],
    showdown: null,
    lastAct: null,
    winnersOfHand: [],
    simT: 0,
    done: false,
    evq: [],
    tick: 0, _viewTick: -1, _views: new Map(),
  };
  cfg.teams.forEach((team, t) => { for (const pid of team) state.teamOf[pid] = t; });
  seats.forEach((pid, i) => {
    state.players[pid] = {
      pid, seat: i,
      chips: pid === requin ? start * 2 : start,
      hole: [], bet: 0, total: 0,
      folded: false, allin: false, acted: false, out: false,
      peeked: null, peekUsed: false,
      lastLabel: null,
      stats: {
        won: 0, hands: 0, folds: 0, raises: 0, allins: 0, showdowns: 0,
        wins: 0, bluffs: 0, peeks: 0, best: null, bestName: '',
      },
    };
  });
  startHand(state);
  return state;
}

const liveSeats = (state) => state.seats.filter((pid) => !state.players[pid].out);
const inHand = (state) => liveSeats(state).filter((pid) => !state.players[pid].folded);
// Somme deja collectee (hors mises posees sur la rue en cours).
const potCollected = (state) => state.seats.reduce((s, pid) => {
  const p = state.players[pid];
  return s + p.total - p.bet;
}, 0);
const potTotal = (state) => state.seats.reduce((s, pid) => s + state.players[pid].total, 0);

// Sieges dans l'ordre de la table, en partant juste apres `from`.
function seatsAfter(state, from) {
  const n = state.seats.length;
  const start = state.seats.indexOf(from);
  const out = [];
  for (let k = 1; k <= n; k++) out.push(state.seats[(start + k) % n]);
  return out;
}

function nextLive(state, from) {
  for (const pid of seatsAfter(state, from)) {
    if (!state.players[pid].out) return pid;
  }
  return from;
}

function blindsOf(state) {
  const level = Math.floor((state.hand - 1) / state.rules.blindEvery);
  const sb = state.rules.sb * Math.pow(2, level);
  return { sb, bb: sb * 2, level };
}

function pay(state, p, amount) {
  const x = Math.max(0, Math.min(Math.round(amount), p.chips));
  p.chips -= x;
  p.bet += x;
  p.total += x;
  if (p.chips === 0) p.allin = true;
  return x;
}

function startHand(state) {
  state.hand++;
  state.board = [];
  state.pots = [];
  state.showdown = null;
  state.lastAct = null;
  state.winnersOfHand = [];
  state.street = 0;
  state.curBet = 0;
  state.minRaise = 0;
  state.deck = makeShoe(1);
  state.rng.shuffle(state.deck);

  for (const pid of state.seats) {
    const p = state.players[pid];
    p.hole = [];
    p.bet = 0;
    p.total = 0;
    p.acted = false;
    p.peeked = null;
    p.peekUsed = false;
    p.lastLabel = null;
    p.folded = p.out;
    p.allin = false;
  }
  const live = liveSeats(state);
  if (state.hand > 1) state.button = state.seats.indexOf(nextLive(state, state.seats[state.button]));
  for (const pid of live) {
    const p = state.players[pid];
    p.hole = [state.deck.pop(), state.deck.pop()];
    p.stats.hands++;
  }

  // Blindes : en tete a tete le bouton est petite blinde.
  const { sb, bb, level } = blindsOf(state);
  const btnPid = state.seats[state.button];
  let sbPid, bbPid;
  if (live.length === 2) {
    sbPid = btnPid;
    bbPid = live.find((pid) => pid !== btnPid);
  } else {
    sbPid = nextLive(state, btnPid);
    bbPid = nextLive(state, sbPid);
  }
  pay(state, state.players[sbPid], sb);
  pay(state, state.players[bbPid], bb);
  state.curBet = Math.max(state.players[sbPid].bet, state.players[bbPid].bet);
  state.minRaise = bb;
  state.blindPids = { sb: sbPid, bb: bbPid };

  state.phase = 'deal';
  state.phaseT = DEAL_T;
  state.toAct = null;
  state.evq.push({ e: 'hand', n: state.hand, sb, bb, level, btn: btnPid });
}

// ── Deroulement des rues ───────────────────────────────────────────────

function nextActive(state, from) {
  for (const pid of seatsAfter(state, from)) {
    const p = state.players[pid];
    if (!p.out && !p.folded && !p.allin) return pid;
  }
  return null;
}

function setTurn(state, pid) {
  state.toAct = pid;
  state.turnT = state.rules.actT;
  state.phase = 'bet';
  state.evq.push({ e: 'turn', pid, toCall: Math.max(0, state.curBet - state.players[pid].bet) });
}

// Ouvre les encheres d'une rue postflop (les mises repartent de zero).
function openBetting(state) {
  for (const pid of state.seats) {
    const p = state.players[pid];
    p.bet = 0;
    p.acted = false;
    p.locked = false;
  }
  state.curBet = 0;
  state.minRaise = blindsOf(state).bb;
  const first = nextActive(state, state.seats[state.button]);
  if (!first || inHand(state).filter((id) => !state.players[id].allin).length < 2) {
    afterBetting(state);
    return;
  }
  setTurn(state, first);
}

function openPreflop(state) {
  const first = nextActive(state, state.blindPids.bb);
  if (!first || inHand(state).filter((id) => !state.players[id].allin).length < 2) {
    afterBetting(state);
    return;
  }
  setTurn(state, first);
}

function nextBoard(state) {
  state.street++;
  state.deck.pop(); // carte brulee, comme au casino
  const n = state.street === 1 ? 3 : 1;
  const cards = [];
  for (let i = 0; i < n && state.deck.length; i++) {
    const c = state.deck.pop();
    state.board.push(c);
    cards.push(c);
  }
  state.phase = 'flip';
  state.phaseT = FLIP_T;
  state.toAct = null;
  state.evq.push({ e: 'board', street: state.street, cards });
}

// Fin d'un tour d'encheres.
function afterBetting(state) {
  const alive = inHand(state);
  if (alive.length <= 1) { endHand(state); return; }
  const canAct = alive.filter((pid) => !state.players[pid].allin);
  state.runout = canAct.length < 2;
  if (state.street >= 3) { showdown(state); return; }
  nextBoard(state);
}

// Passe au joueur suivant qui doit encore parler.
function advance(state) {
  if (inHand(state).length <= 1) { endHand(state); return; }
  for (const pid of seatsAfter(state, state.toAct)) {
    const p = state.players[pid];
    if (p.out || p.folded || p.allin) continue;
    if (!p.acted || p.bet < state.curBet) { setTurn(state, pid); return; }
  }
  afterBetting(state);
}

// ── Pots (principal et secondaires) ────────────────────────────────────

export function buildPots(state) {
  const contrib = state.seats
    .map((pid) => ({ pid, amt: state.players[pid].total, folded: state.players[pid].folded }))
    .filter((c) => c.amt > 0);
  const levels = [...new Set(contrib.map((c) => c.amt))].sort((a, b) => a - b);
  const pots = [];
  let prev = 0;
  for (const lvl of levels) {
    let amount = 0;
    const eligible = [];
    for (const c of contrib) {
      amount += Math.max(0, Math.min(c.amt, lvl) - prev);
      if (c.amt >= lvl && !c.folded) eligible.push(c.pid);
    }
    if (amount > 0) pots.push({ amount, eligible });
    prev = lvl;
  }
  return pots;
}

// Distribue un pot entre ses gagnants ; le reste indivisible va au premier
// joueur a gauche du bouton, comme au casino.
function sharePot(state, potAmount, winners) {
  const each = Math.floor(potAmount / winners.length);
  let rest = potAmount - each * winners.length;
  const order = seatsAfter(state, state.seats[state.button]);
  const sorted = order.filter((pid) => winners.includes(pid));
  const out = [];
  for (const pid of sorted) {
    let gain = each;
    if (rest > 0) { gain++; rest--; }
    state.players[pid].chips += gain;
    state.players[pid].stats.won += gain;
    out.push({ pid, amount: gain });
  }
  return out;
}

// ── Fins de main ───────────────────────────────────────────────────────

// Tout le monde s'est couche sauf un : il ramasse sans montrer ses cartes.
function endHand(state) {
  const alive = inHand(state);
  const pots = buildPots(state);
  const wins = [];
  for (const pot of pots) {
    const winners = pot.eligible.length ? pot.eligible : alive;
    if (!winners.length) continue;
    wins.push(...sharePot(state, pot.amount, winners));
  }
  state.pots = pots;
  state.winnersOfHand = [...new Set(wins.map((w) => w.pid))];
  for (const w of state.winnersOfHand) state.players[w].stats.wins++;
  if (alive.length === 1) {
    const p = state.players[alive[0]];
    // Gagner sans abattage avec une main faible, c'est un bluff reussi.
    const s = best5([...p.hole, ...state.board]).score;
    if (state.board.length >= 3 && s && s[0] <= 1) p.stats.bluffs++;
  }
  state.phase = 'payout';
  state.phaseT = PAY_T;
  state.toAct = null;
  state.evq.push({ e: 'win', wins, showdown: 0 });
}

function showdown(state) {
  const alive = inHand(state);
  const evals = {};
  for (const pid of alive) {
    const p = state.players[pid];
    const r = best5([...p.hole, ...state.board]);
    evals[pid] = r;
    p.stats.showdowns++;
    if (!p.stats.best || cmpScore(r.score, p.stats.best) > 0) {
      p.stats.best = r.score;
      p.stats.bestName = handName(r.score);
    }
  }
  const pots = buildPots(state);
  const wins = [];
  for (const pot of pots) {
    const cands = pot.eligible.filter((pid) => evals[pid]);
    if (!cands.length) continue;
    let bestS = null;
    for (const pid of cands) {
      if (!bestS || cmpScore(evals[pid].score, bestS) > 0) bestS = evals[pid].score;
    }
    const winners = cands.filter((pid) => cmpScore(evals[pid].score, bestS) === 0);
    wins.push(...sharePot(state, pot.amount, winners));
  }
  state.pots = pots;
  state.winnersOfHand = [...new Set(wins.map((w) => w.pid))];
  for (const w of state.winnersOfHand) state.players[w].stats.wins++;
  state.showdown = {
    hands: alive.map((pid) => ({
      pid,
      hole: state.players[pid].hole,
      cards: evals[pid].cards,
      name: handName(evals[pid].score),
    })),
    wins,
  };
  state.phase = 'showdown';
  state.phaseT = SHOW_T;
  state.toAct = null;
  state.evq.push({ e: 'win', wins, showdown: 1 });
}

function oneCampLeft(state) {
  const live = liveSeats(state);
  if (state.cfg.teams.length <= 1) return live.length <= 1;
  const camps = new Set(live.map((pid) => state.teamOf[pid]));
  return camps.size <= 1 || live.length <= 1;
}

function finishHand(state) {
  for (const pid of state.seats) {
    const p = state.players[pid];
    if (!p.out && p.chips <= 0) {
      p.out = true;
      state.evq.push({ e: 'bust', pid });
    }
  }
  if (state.hand >= state.rules.hands || oneCampLeft(state) || state.simT > SIM_MAX) {
    state.phase = 'end';
    state.phaseT = END_T;
    state.toAct = null;
    return;
  }
  startHand(state);
}

// ── Actions ────────────────────────────────────────────────────────────

function doAct(state, pid, a, d) {
  const p = state.players[pid];
  if (!p || p.out || p.folded) return;

  // Coup d'oeil du Requin : possible pendant son tour, annonce a tous.
  if (a === 'peek') {
    if (pid !== state.requin || p.peekUsed || state.toAct !== pid) return;
    const tid = d && typeof d === 'object' ? d.pid : null;
    const target = state.players[tid];
    if (!target || tid === pid || target.folded || target.out || !target.hole.length) return;
    const i = d && Number(d.i) === 1 ? 1 : 0;
    p.peekUsed = true;
    p.peeked = { pid: tid, i, card: target.hole[i] };
    p.stats.peeks++;
    state.evq.push({ e: 'peek', by: pid, target: tid });
    return;
  }

  if (state.phase !== 'bet' || state.toAct !== pid) return;
  const toCall = state.curBet - p.bet;
  const maxTotal = p.bet + p.chips;

  if (a === 'fold') {
    // Se coucher alors que c'est gratuit : on checke, c'est plus charitable.
    if (toCall <= 0) { p.acted = true; p.lastLabel = 'CHECK'; state.evq.push({ e: 'act', pid, a: 'check' }); }
    else {
      p.folded = true;
      p.acted = true;
      p.lastLabel = 'COUCHÉ';
      p.stats.folds++;
      state.evq.push({ e: 'act', pid, a: 'fold' });
    }
  } else if (a === 'check') {
    if (toCall > 0) return;
    p.acted = true;
    p.lastLabel = 'CHECK';
    state.evq.push({ e: 'act', pid, a: 'check' });
  } else if (a === 'call') {
    if (toCall <= 0) {
      p.acted = true;
      p.lastLabel = 'CHECK';
      state.evq.push({ e: 'act', pid, a: 'check' });
    } else {
      const paid = pay(state, p, toCall);
      p.acted = true;
      p.lastLabel = p.allin ? 'TAPIS' : 'SUIT';
      if (p.allin) p.stats.allins++;
      state.evq.push({ e: 'act', pid, a: 'call', v: paid, allin: p.allin ? 1 : 0 });
    }
  } else if (a === 'raise' || a === 'allin') {
    if (p.locked) return; // un tapis court ne rouvre pas les encheres
    let target;
    if (a === 'allin') target = maxTotal;
    else {
      target = Math.round(Number(d && typeof d === 'object' ? d.v : NaN));
      if (!Number.isFinite(target)) return;
      const minTarget = Math.min(maxTotal, state.curBet + state.minRaise);
      if (target < minTarget) target = minTarget;
      if (target > maxTotal) target = maxTotal;
    }
    if (target <= p.bet) return;
    if (target <= state.curBet && target < maxTotal) return;
    const raiseSize = target - state.curBet;
    pay(state, p, target - p.bet);
    if (p.bet > state.curBet) {
      const full = raiseSize >= state.minRaise;
      if (full) {
        state.minRaise = raiseSize;
        for (const id of state.seats) {
          const q = state.players[id];
          if (id !== pid && !q.folded && !q.out && !q.allin) { q.acted = false; q.locked = false; }
        }
      } else {
        // Tapis court : les autres peuvent completer, pas relancer.
        for (const id of state.seats) {
          const q = state.players[id];
          if (id !== pid && !q.folded && !q.out && !q.allin && q.acted) q.locked = true;
        }
      }
      state.curBet = p.bet;
    }
    p.acted = true;
    p.lastLabel = p.allin ? 'TAPIS' : 'RELANCE';
    if (p.allin) p.stats.allins++; else p.stats.raises++;
    state.evq.push({ e: 'act', pid, a: p.allin ? 'allin' : 'raise', v: p.bet, allin: p.allin ? 1 : 0 });
  } else {
    return;
  }
  advance(state);
}

export function onInput(state, pid, d) {
  // Repli du harnais de test : un tap brut declenche une action plausible.
  if (!d || typeof d.tx !== 'number' || !Number.isFinite(d.tx)) return;
  if (state.done || state.phase !== 'bet' || state.toAct !== pid) return;
  const p = state.players[pid];
  if (!p) return;
  const toCall = state.curBet - p.bet;
  const band = Math.floor((((d.tx % 900) + 900) % 900) / 300); // 0..2
  if (band === 0) doAct(state, pid, toCall > 0 ? 'call' : 'check');
  else if (band === 1) doAct(state, pid, 'raise', { v: state.curBet + state.minRaise });
  else doAct(state, pid, toCall > 0 ? 'fold' : 'check');
}

export function onAction(state, pid, a, d) {
  if (state.done || typeof a !== 'string') return;
  if (!state.players[pid]) return;
  doAct(state, pid, a, d);
}

export function tick(state, dt) {
  const evs = state.evq;
  state.evq = [];
  state.tick++;
  state.simT += dt;
  if (state.done) return evs;

  if (state.simT > SIM_MAX && state.phase !== 'end') {
    state.phase = 'end';
    state.phaseT = END_T;
    state.toAct = null;
    return evs;
  }

  if (state.phase === 'deal') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) openPreflop(state);
  } else if (state.phase === 'bet') {
    state.turnT -= dt;
    if (state.turnT <= 0) {
      const p = state.players[state.toAct];
      const toCall = p ? state.curBet - p.bet : 0;
      doAct(state, state.toAct, toCall > 0 ? 'fold' : 'check');
    }
  } else if (state.phase === 'flip') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) {
      if (state.runout) {
        if (state.street >= 3) showdown(state);
        else nextBoard(state);
      } else openBetting(state);
    }
  } else if (state.phase === 'showdown' || state.phase === 'payout') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) finishHand(state);
  } else if (state.phase === 'end') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) state.done = true;
  }
  return evs;
}

export function isOver(state) {
  return state.done;
}

// ── Vue (secret des cartes fermees) ────────────────────────────────────

export function view(state, pid) {
  const me = pid ? state.players[pid] : null;
  const spec = !me || me.out;            // spectateurs et elimines voient tout
  const key = spec ? 'spec' : pid;
  if (state._viewTick !== state.tick) {
    state._views.clear();
    state._viewTick = state.tick;
  }
  const hit = state._views.get(key);
  if (hit) return hit;

  const shown = new Set();
  if (state.showdown) for (const h of state.showdown.hands) shown.add(h.pid);

  const players = {};
  for (const id of state.seats) {
    const p = state.players[id];
    const reveal = spec || id === pid || shown.has(id);
    players[id] = {
      seat: p.seat,
      chips: p.chips,
      bet: p.bet,
      total: p.total,
      folded: p.folded ? 1 : 0,
      allin: p.allin ? 1 : 0,
      out: p.out ? 1 : 0,
      label: p.lastLabel,
      hole: reveal ? p.hole : p.hole.map(() => -1),
    };
  }

  const toCall = me && state.toAct === pid ? Math.max(0, state.curBet - me.bet) : 0;
  const maxTo = me ? me.bet + me.chips : 0;
  const canRaise = !!me && state.toAct === pid && !me.locked && me.chips > toCall;
  const v = {
    phase: state.phase,
    tl: Math.round(Math.max(0, state.phase === 'bet' ? state.turnT : state.phaseT) * 10) / 10,
    tlMax: state.phase === 'bet' ? state.rules.actT : SHOW_T,
    hand: state.hand,
    hands: state.rules.hands,
    street: state.street,
    board: state.board,
    pot: potCollected(state),
    potAll: potTotal(state),
    curBet: state.curBet,
    minRaise: state.minRaise,
    toAct: state.toAct,
    button: state.seats[state.button],
    blinds: blindsOf(state),
    sbPid: state.blindPids ? state.blindPids.sb : null,
    bbPid: state.blindPids ? state.blindPids.bb : null,
    requin: state.requin,
    seats: state.seats,
    players,
    showdown: state.showdown,
    pots: state.pots.map((p) => p.amount),
    me: me ? {
      // Ma meilleure main du moment (le client n a pas l evaluateur).
      hand: me.hole.length === 2 && state.board.length >= 3
        ? (() => { const r = best5([...me.hole, ...state.board]); return { name: handName(r.score), cards: r.cards }; })()
        : null,
      toCall,
      minRaiseTo: Math.min(maxTo, state.curBet + state.minRaise),
      maxRaiseTo: maxTo,
      peeked: me.peeked,
      canPeek: pid === state.requin && !me.peekUsed && state.toAct === pid ? 1 : 0,
      can: {
        fold: state.toAct === pid ? 1 : 0,
        check: state.toAct === pid && toCall === 0 ? 1 : 0,
        call: state.toAct === pid && toCall > 0 ? 1 : 0,
        raise: canRaise && maxTo > state.curBet ? 1 : 0,
        allin: state.toAct === pid && me.chips > 0 ? 1 : 0,
      },
    } : null,
  };
  state._views.set(key, v);
  return v;
}

export function results(state) {
  const cfg = state.cfg;
  const chipsOf = (pid) => (state.players[pid] ? state.players[pid].chips : 0);
  const teamScore = cfg.teams.map((team) => team.reduce((s, pid) => s + chipsOf(pid), 0));
  const best = Math.max(...teamScore);
  const winTeams = teamScore.map((s, t) => [s, t]).filter(([s]) => s === best).map(([, t]) => t);
  const allTied = winTeams.length === cfg.teams.length && cfg.teams.length > 1;
  const winners = allTied ? [] : winTeams.flatMap((t) => cfg.teams[t]);

  const ranking = cfg.teams.flat()
    .map((pid) => ({ pid, score: chipsOf(pid), label: `${chipsOf(pid)} 🪙` }))
    .sort((a, b) => b.score - a.score);

  const titles = [];
  const all = state.seats.map((pid) => ({ pid, s: state.players[pid].stats }));
  const top = (fn) => all.slice().sort((a, b) => fn(b.s) - fn(a.s))[0];
  const bestHand = all.slice().sort((a, b) => cmpScore(b.s.best || [-1], a.s.best || [-1]))[0];
  if (bestHand && bestHand.s.bestName) {
    titles.push({ pid: bestHand.pid, emoji: '👑', text: `Plus belle main : ${bestHand.s.bestName.toLowerCase()}` });
  }
  const froussard = top((s) => s.folds);
  if (froussard.s.folds >= 3) {
    titles.push({ pid: froussard.pid, emoji: '🙈', text: `A couché ${froussard.s.folds} mains sur ${froussard.s.hands}` });
  }
  const fou = top((s) => s.allins);
  if (fou.s.allins >= 2) titles.push({ pid: fou.pid, emoji: '🔥', text: `${fou.s.allins} tapis dans la soirée` });
  const bluff = top((s) => s.bluffs);
  if (bluff.s.bluffs >= 1) titles.push({ pid: bluff.pid, emoji: '🎭', text: `Bluff du siècle : ${bluff.s.bluffs} pot(s) volé(s) sans rien` });
  const agressif = top((s) => s.raises);
  if (agressif.s.raises >= 4) titles.push({ pid: agressif.pid, emoji: '💣', text: `Relanceur en série : ${agressif.s.raises} relances` });
  const requin = state.requin ? all.find((x) => x.pid === state.requin) : null;
  if (requin && requin.s.peeks >= 1) {
    titles.push({ pid: requin.pid, emoji: '🦈', text: `A jeté ${requin.s.peeks} coup(s) d'oeil dans le jeu des autres` });
  }
  if (!titles.length) titles.push({ pid: ranking[0].pid, emoji: '🃏', text: 'Le plus gros tapis de la fête' });
  return { ranking, winners, titles };
}

// ── Bot : force de main, cote du pot, et un peu de folie ───────────────

// Note de depart facon Chen : suffisant pour un forain.
function preflopScore(hole) {
  const a = hiRank(hole[0]), b = hiRank(hole[1]);
  const hi = Math.max(a, b), lo = Math.min(a, b);
  const val = (r) => (r === 14 ? 10 : r === 13 ? 8 : r === 12 ? 7 : r === 11 ? 6 : r / 2);
  let s = val(hi);
  if (a === b) s = Math.max(5, val(hi) * 2);
  if (suitOf(hole[0]) === suitOf(hole[1])) s += 2;
  const gap = hi - lo - 1;
  if (a !== b) {
    if (gap === 1) s -= 1;
    else if (gap === 2) s -= 2;
    else if (gap === 3) s -= 4;
    else if (gap >= 4) s -= 5;
    if (gap <= 1 && hi < 12) s += 1;
  }
  return Math.max(0, Math.round(s));
}

// Tirages : couleur (4 de la meme) ou quinte ouverte.
function hasDraw(cards) {
  const bySuit = [0, 0, 0, 0];
  for (const c of cards) bySuit[suitOf(c)]++;
  if (bySuit.some((n) => n === 4)) return true;
  const rs = [...new Set(cards.map(hiRank))].sort((a, b) => a - b);
  let run = 1;
  for (let i = 1; i < rs.length; i++) {
    if (rs[i] === rs[i - 1] + 1) { run++; if (run >= 4) return true; }
    else run = 1;
  }
  return false;
}

function handOdds(state, p, nOpp) {
  const cards = [...p.hole, ...state.board];
  if (state.board.length === 0) {
    const s = preflopScore(p.hole);
    return Math.max(0.12, Math.min(0.92, 0.16 + s * 0.045));
  }
  const cat = best5(cards).score[0];
  const table = [0.2, 0.42, 0.6, 0.74, 0.82, 0.88, 0.93, 0.97, 0.99];
  let odds = table[cat] || 0.2;
  if (cat <= 1 && hasDraw(cards) && state.board.length < 5) odds += 0.13;
  odds -= Math.max(0, nOpp - 1) * 0.06;
  return Math.max(0.05, Math.min(0.97, odds));
}

export function botAct(state, pid, mind, api) {
  if (state.done || state.phase !== 'bet' || state.toAct !== pid) return;
  const p = state.players[pid];
  if (!p || p.folded || p.out) return;
  const pers = mind.p, rng = mind.rng, mem = mind.mem;

  const key = `${state.hand}|${state.street}|${state.curBet}|${p.bet}|${p.total}`;
  if (mem.k !== key) {
    mem.k = key;
    mem.at = state.simT;
    mem.delay = 0.35 + rng.next() * 1.6 * pers.pace;
    return;
  }
  if (state.simT - mem.at < mem.delay) return;
  mem.k = `${key}-fait`;

  // Le Requin en profite pour regarder dans un jeu adverse.
  if (pid === state.requin && !p.peekUsed && rng.chance(0.7)) {
    const cible = inHand(state).find((id) => id !== pid);
    if (cible) api.act('peek', { pid: cible, i: rng.chance(0.5) ? 1 : 0 });
  }

  const nOpp = Math.max(1, inHand(state).length - 1);
  const toCall = state.curBet - p.bet;
  const pot = potTotal(state);
  const odds = handOdds(state, p, nOpp);
  const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;
  const skill = pers.skill;
  const folie = rng.chance(pers.chaos * 0.12);

  // Relance : forte main, ou bluff assume.
  const bluff = rng.chance(pers.aggro * 0.16 * (1 - skill * 0.4));
  const veutRelancer = (odds > 0.62 + (1 - pers.aggro) * 0.12 && rng.chance(0.35 + pers.aggro * 0.5)) || bluff;
  const peutRelancer = !p.locked && p.chips > toCall;

  if (folie) {
    api.act(rng.chance(0.5) && peutRelancer ? 'allin' : toCall > 0 ? 'call' : 'check');
    return;
  }

  if (peutRelancer && veutRelancer) {
    const base = Math.max(state.minRaise, Math.round(pot * (0.4 + rng.next() * 0.5)));
    let target = state.curBet + base;
    if (odds > 0.9 && rng.chance(pers.aggro * 0.5)) target = p.bet + p.chips;
    api.act('raise', { v: target });
    return;
  }
  if (toCall <= 0) { api.act('check'); return; }

  // Suivre si la cote du pot le justifie (avec la prudence du personnage).
  const marge = 0.02 + (1 - skill) * 0.14;
  const engage = toCall >= p.chips;
  if (odds >= potOdds + marge - (engage ? 0.05 : 0)) api.act('call');
  else if (rng.chance((1 - skill) * 0.25)) api.act('call');
  else api.act('fold');
}
