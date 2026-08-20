// MENTEUR : simulation serveur. Bluff aux des facon Perudo : chacun ses des
// sous son gobelet, on enchérit sur ce que cache toute la table, les 1 sont
// des jokers. MENTEUR ! (on compte, le fautif jette un de) et PILE ! (le
// compte est exact : on recupere un de). Plus de des : elimine.
// Asym « Le Tricheur » : un de de plus, et une relance secrete par manche.

const REVEAL_T = 3.6;     // duree du grand deballage
const PRE_T = 1.6;
const END_T = 2.6;
const ROLL_T = 0.9;       // petit temps de lancer en debut de manche
const MAX_ROUNDS = 80;
const MAX_SIM = 900;

const pick = (v, allowed, def) => (allowed.includes(v) ? v : def);

export function createState(cfg) {
  const st = cfg.settings || {};
  const asym = cfg.format.kind === 'asym';
  const tricheur = asym ? cfg.teams[0][0] : null;
  const startDice = pick(st.des, [3, 5], 5);
  const turnT = pick(st.rythme, [10, 15, 22], 15);

  const state = {
    cfg,
    rng: cfg.rng,
    asym, tricheur,
    startDice,
    turnT,
    players: {},
    order: [],
    turnIdx: 0,
    bid: null,
    bidCount: 0,
    history: [],
    round: 0,
    phase: 'pre',
    phaseT: PRE_T,
    reveal: null,
    winCamp: null,
    elimCount: 0,
    simT: 0,
    done: false,
    evq: [],
    tick: 0, _viewTick: -1, _views: new Map(),
  };

  cfg.teams.forEach((team, c) => {
    for (const pid of team) {
      const solo = pid === tricheur;
      state.players[pid] = {
        pid,
        camp: c,
        dice: [],
        n: startDice + (solo ? 1 : 0),
        alive: true,
        cheated: false,
        elimAt: 0,
        stats: {
          bids: 0, maxQty: 0, calls: 0, callsWon: 0, caught: 0,
          piles: 0, pilesWon: 0, lost: 0, gained: 0, timeouts: 0,
        },
      };
    }
  });

  // Ordre de jeu : on alterne les camps pour que la parole tourne.
  const pools = cfg.teams.map((t) => [...t]);
  let added = true;
  while (added) {
    added = false;
    for (const pool of pools) {
      if (pool.length) { state.order.push(pool.shift()); added = true; }
    }
  }
  state.turnIdx = state.rng.int(0, state.order.length - 1);
  return state;
}

// ── Helpers de table ───────────────────────────────────────────────────

const alivePids = (state) => state.order.filter((pid) => state.players[pid].alive);
const totalDice = (state) => alivePids(state).reduce((s, pid) => s + state.players[pid].n, 0);
const maxDice = (state, pid) => state.startDice + (pid === state.tricheur ? 1 : 0);

// Nombre de des montrant `face`, jokers (les 1) compris.
function countFace(state, face) {
  let n = 0;
  for (const pid of alivePids(state)) {
    for (const d of state.players[pid].dice) {
      if (d === face || d === 1) n++;
    }
  }
  return n;
}

// Mes des a moi (et ceux de mes coequipiers en equipe).
function knownDice(state, pid) {
  const p = state.players[pid];
  if (!p) return [];
  const out = [];
  for (const other of alivePids(state)) {
    const o = state.players[other];
    if (o.camp === p.camp) out.push(...o.dice);
  }
  return out;
}

// L'enchere minimale qui surenchérit sur l'enchère courante (ou null).
function minRaise(state) {
  const tot = totalDice(state);
  if (!state.bid) return { qty: Math.max(1, Math.ceil(tot / 4)), face: 2 };
  if (state.bid.face < 6) return { qty: state.bid.qty, face: state.bid.face + 1 };
  if (state.bid.qty + 1 <= tot) return { qty: state.bid.qty + 1, face: 2 };
  return null;   // plafond atteint : il ne reste que MENTEUR ou PILE
}

function bidLegal(state, qty, face) {
  if (!Number.isInteger(qty) || !Number.isInteger(face)) return false;
  if (face < 2 || face > 6) return false;            // on n enchérit pas sur les jokers
  if (qty < 1 || qty > totalDice(state)) return false;
  if (!state.bid) return true;
  return qty > state.bid.qty || (qty === state.bid.qty && face > state.bid.face);
}

function rollAll(state) {
  for (const pid of alivePids(state)) {
    const p = state.players[pid];
    p.dice = Array.from({ length: p.n }, () => state.rng.int(1, 6));
    p.cheated = false;
  }
  state.evq.push({ e: 'roll' });
}

// ── Deroulement d une manche ───────────────────────────────────────────

const turnPid = (state) => state.order[state.turnIdx];

function nextAliveIdx(state, from) {
  const n = state.order.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (state.players[state.order[i]].alive) return i;
  }
  return from;
}

function campsAlive(state) {
  const set = new Set();
  for (const pid of alivePids(state)) set.add(state.players[pid].camp);
  return [...set];
}

function startRound(state, starter) {
  state.round++;
  state.bid = null;
  state.bidCount = 0;
  state.history = [];
  state.reveal = null;
  rollAll(state);
  if (starter && state.players[starter]) {
    const i = state.order.indexOf(starter);
    state.turnIdx = state.players[starter].alive ? i : nextAliveIdx(state, i);
  } else if (!state.players[turnPid(state)].alive) {
    state.turnIdx = nextAliveIdx(state, state.turnIdx);
  }
  state.phase = 'roll';
  state.phaseT = ROLL_T;
  state.evq.push({ e: 'round', n: state.round });
}

function enterBid(state) {
  state.phase = 'bid';
  state.phaseT = state.turnT;
  state.evq.push({ e: 'turn', pid: turnPid(state) });
}

function advanceTurn(state) {
  state.turnIdx = nextAliveIdx(state, state.turnIdx);
  state.phaseT = state.turnT;
  state.evq.push({ e: 'turn', pid: turnPid(state) });
}

function doBid(state, pid, qty, face) {
  if (state.phase !== 'bid' || turnPid(state) !== pid) return false;
  if (!bidLegal(state, qty, face)) return false;
  const p = state.players[pid];
  state.bid = { pid, qty, face };
  state.bidCount++;
  state.history.push({ pid, qty, face });
  if (state.history.length > 4) state.history.shift();
  p.stats.bids++;
  p.stats.maxQty = Math.max(p.stats.maxQty, qty);
  state.evq.push({ e: 'bid', pid, qty, face });
  advanceTurn(state);
  return true;
}

// Applique la perte (ou le gain) d un de et bascule sur le grand deballage.
function resolve(state, info) {
  const bid = state.bid;
  const rev = {
    kind: info.kind,
    caller: info.caller,
    bidder: bid ? bid.pid : null,
    qty: bid ? bid.qty : 0,
    face: bid ? bid.face : 0,
    count: info.count,
    loser: info.loser || null,
    winner: info.winner || null,
    dice: {},
  };
  for (const pid of alivePids(state)) rev.dice[pid] = [...state.players[pid].dice];

  if (info.loser) {
    const l = state.players[info.loser];
    l.n = Math.max(0, l.n - 1);
    l.stats.lost++;
    state.evq.push({ e: 'lose', pid: info.loser, n: l.n });
    if (l.n === 0) {
      l.alive = false;
      l.elimAt = ++state.elimCount;
      state.evq.push({ e: 'out', pid: info.loser });
    }
  }
  if (info.winner) {
    const w = state.players[info.winner];
    const cap = maxDice(state, info.winner);
    if (w.n < cap) { w.n++; w.stats.gained++; state.evq.push({ e: 'gain', pid: info.winner, n: w.n }); }
  }

  state.reveal = rev;
  state.nextStarter = info.loser && state.players[info.loser].alive
    ? info.loser
    : (info.winner || info.caller);
  state.phase = 'reveal';
  state.phaseT = REVEAL_T;
  state.evq.push({
    e: 'reveal', kind: info.kind, caller: info.caller, count: info.count,
    qty: rev.qty, face: rev.face, loser: rev.loser, winner: rev.winner,
  });
}

function doChallenge(state, pid) {
  if (state.phase !== 'bid' || turnPid(state) !== pid || !state.bid) return false;
  const p = state.players[pid];
  const count = countFace(state, state.bid.face);
  const bidTrue = count >= state.bid.qty;
  p.stats.calls++;
  if (!bidTrue) {
    // L enchere etait fausse : le bluffeur est pris la main dans le sac.
    p.stats.callsWon++;
    state.players[state.bid.pid].stats.caught++;
  }
  state.evq.push({ e: 'menteur', pid });
  resolve(state, {
    kind: 'menteur',
    caller: pid,
    count,
    loser: bidTrue ? pid : state.bid.pid,
  });
  return true;
}

function doPile(state, pid) {
  if (state.phase !== 'bid' || turnPid(state) !== pid || !state.bid) return false;
  if (state.bidCount < 2) return false;   // interdit sur la toute premiere enchere
  const p = state.players[pid];
  const count = countFace(state, state.bid.face);
  const exact = count === state.bid.qty;
  p.stats.piles++;
  if (exact) p.stats.pilesWon++;
  state.evq.push({ e: 'pile', pid });
  resolve(state, {
    kind: 'pile',
    caller: pid,
    count,
    loser: exact ? null : pid,
    winner: exact ? pid : null,
  });
  return true;
}

// Fin forcee : le camp qui a le plus de des sur la table l emporte.
function forceEnd(state) {
  const perCamp = state.cfg.teams.map(() => 0);
  for (const pid of alivePids(state)) perCamp[state.players[pid].camp] += state.players[pid].n;
  const best = Math.max(...perCamp);
  const winners = perCamp.map((v, c) => [v, c]).filter(([v]) => v === best).map(([, c]) => c);
  state.winCamp = winners.length === 1 ? winners[0] : null;
  state.phase = 'end';
  state.phaseT = END_T;
  state.evq.push({ e: 'timecap' });
}

// ── Decision automatique (chrono ecoule, et cerveau des bots) ──────────
// Espérance du nombre de des montrant `face` : mes des connus + les des
// inconnus, dont deux faces sur six comptent (la face voulue et le joker).
function estimate(state, pid, face) {
  const known = knownDice(state, pid);
  let mine = 0;
  for (const d of known) if (d === face || d === 1) mine++;
  const unknown = Math.max(0, totalDice(state) - known.length);
  return mine + unknown * (2 / 6);
}

// Choisit une action raisonnable pour `pid`. `skill` 0..1, `nerve` 0..1.
function decide(state, pid, skill, nerve, rng) {
  const tot = totalDice(state);
  const bid = state.bid;
  const raise = minRaise(state);

  if (bid) {
    const exp = estimate(state, pid, bid.face);
    const over = bid.qty - exp;                   // a quel point l enchere exagere
    const seuil = 1.15 - skill * 0.5;             // les bons joueurs coupent plus tot
    if (state.bidCount >= 2 && Math.abs(bid.qty - exp) < 0.8 && rng.chance(0.12 + skill * 0.3)) {
      return { a: 'pile' };
    }
    if (over > seuil || !raise) return { a: 'menteur' };
    if (over > seuil * 0.6 && rng.chance(0.25 + skill * 0.25)) return { a: 'menteur' };
  }

  // Sinon on surenchérit sur la face qui nous arrange le plus.
  let bestFace = 2, bestExp = -1;
  for (let f = 2; f <= 6; f++) {
    const e = estimate(state, pid, f) + rng.next() * 0.35;
    if (e > bestExp) { bestExp = e; bestFace = f; }
  }
  let qty = Math.max(1, Math.round(bestExp * (0.82 + nerve * 0.3)));
  let face = bestFace;
  if (raise) {
    // On respecte l enchere minimale, puis on pousse un peu si on y croit.
    if (qty < raise.qty || (qty === raise.qty && face < raise.face)) {
      qty = raise.qty;
      face = raise.face;
    }
  }
  qty = Math.min(qty, tot);
  if (!bidLegal(state, qty, face)) {
    if (!raise) return { a: 'menteur' };
    qty = raise.qty;
    face = raise.face;
  }
  return { a: 'bid', qty, face };
}

function autoMove(state, pid) {
  const p = state.players[pid];
  if (!p) return;
  p.stats.timeouts++;
  const d = decide(state, pid, 0.5, 0.35, state.rng);
  if (d.a === 'menteur') doChallenge(state, pid);
  else if (d.a === 'pile') doPile(state, pid);
  else if (!doBid(state, pid, d.qty, d.face)) doChallenge(state, pid);
}

// ── Contrat ────────────────────────────────────────────────────────────

export function onInput(state, pid, d) {
  // Repli du harnais : un tap brut devient une action plausible.
  if (!d || typeof d.tx !== 'number' || !Number.isFinite(d.tx)) return;
  if (state.done || state.phase !== 'bid' || turnPid(state) !== pid) return;
  const band = Math.floor((((d.tx % 1000) + 1000) % 1000) / 200); // 0..4
  const raise = minRaise(state);
  if (band === 3) { doChallenge(state, pid); return; }
  if (band === 4) { if (!doPile(state, pid)) doChallenge(state, pid); return; }
  if (!raise) { doChallenge(state, pid); return; }
  const qty = Math.min(totalDice(state), raise.qty + (band === 2 ? 1 : 0));
  if (!doBid(state, pid, qty, raise.face)) doChallenge(state, pid);
}

export function onAction(state, pid, a, d) {
  if (state.done || typeof a !== 'string') return;
  const p = state.players[pid];
  if (!p || !p.alive) return;

  if (a === 'cheat') {
    // Privilege du Tricheur : relancer un seul de ses des, une fois par manche.
    if (pid !== state.tricheur || p.cheated) return;
    if (state.phase !== 'bid' && state.phase !== 'roll') return;
    if (!d || typeof d !== 'object') return;
    const i = Math.round(Number(d.i));
    if (!Number.isInteger(i) || i < 0 || i >= p.dice.length) return;
    p.dice[i] = state.rng.int(1, 6);
    p.cheated = true;
    state.evq.push({ e: 'cheat', pid });
    return;
  }
  if (state.phase !== 'bid' || turnPid(state) !== pid) return;
  if (a === 'bid') {
    if (!d || typeof d !== 'object') return;
    doBid(state, pid, Math.round(Number(d.qty)), Math.round(Number(d.face)));
  } else if (a === 'menteur') {
    doChallenge(state, pid);
  } else if (a === 'pile') {
    doPile(state, pid);
  }
}

export function tick(state, dt) {
  const evs = state.evq;
  state.evq = [];
  state.tick++;
  state.simT += dt;
  if (state.done) return evs;

  if (state.simT > MAX_SIM && state.phase !== 'end') { forceEnd(state); return evs; }

  if (state.phase === 'pre') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) startRound(state, null);
  } else if (state.phase === 'roll') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) enterBid(state);
  } else if (state.phase === 'bid') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) autoMove(state, turnPid(state));
  } else if (state.phase === 'reveal') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) {
      const camps = campsAlive(state);
      if (camps.length <= 1) {
        state.winCamp = camps.length === 1 ? camps[0] : null;
        state.phase = 'end';
        state.phaseT = END_T;
        state.evq.push({ e: 'win', camp: state.winCamp });
      } else if (state.round >= MAX_ROUNDS) {
        forceEnd(state);
      } else {
        startRound(state, state.nextStarter);
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
  const p = pid ? state.players[pid] : null;
  // Les elimines et les spectateurs voient tout : c est leur recompense.
  const seeAll = state.phase === 'reveal' || state.phase === 'end' || !p || !p.alive;
  const key = seeAll ? 'spec' : `c${p.camp}`;
  if (state._viewTick !== state.tick) {
    state._views.clear();
    state._viewTick = state.tick;
  }
  if (state._views.has(key)) return state._views.get(key);

  const rev = state.reveal;
  const players = {};
  for (const id of state.order) {
    const o = state.players[id];
    // On ne montre les des que : a soi, a ses coequipiers, ou a la revelation.
    const visible = seeAll || (p && o.camp === p.camp);
    let dice = null;
    if (visible) dice = seeAll && rev && rev.dice[id] ? [...rev.dice[id]] : [...o.dice];
    players[id] = {
      camp: o.camp,
      n: o.n,
      alive: o.alive ? 1 : 0,
      dice,
      cheated: o.cheated ? 1 : 0,
    };
  }

  const raise = state.phase === 'bid' ? minRaise(state) : null;
  const v = {
    phase: state.phase,
    tl: Math.round(Math.max(0, state.phaseT) * 10) / 10,
    tlMax: state.phase === 'bid' ? state.turnT : state.phase === 'reveal' ? REVEAL_T : PRE_T,
    round: state.round,
    turn: state.phase === 'bid' ? turnPid(state) : null,
    bid: state.bid ? { ...state.bid } : null,
    bidCount: state.bidCount,
    canPile: state.bidCount >= 2 ? 1 : 0,
    raise,
    total: totalDice(state),
    startDice: state.startDice,
    history: state.history.map((h) => ({ ...h })),
    tricheur: state.tricheur,
    winCamp: state.winCamp,
    reveal: rev ? {
      kind: rev.kind, caller: rev.caller, bidder: rev.bidder,
      qty: rev.qty, face: rev.face, count: rev.count,
      loser: rev.loser, winner: rev.winner,
    } : null,
    players,
  };
  state._views.set(key, v);
  return v;
}

export function results(state) {
  const cfg = state.cfg;
  const pids = cfg.teams.flat();
  const scoreOf = (pid) => {
    const p = state.players[pid];
    if (!p) return 0;
    return p.alive
      ? 100000 + p.n * 1000 + p.stats.callsWon * 10
      : p.elimAt * 1000 + p.stats.callsWon * 10;
  };
  const ranking = pids
    .map((pid) => {
      const p = state.players[pid];
      return {
        pid,
        score: scoreOf(pid),
        label: p && p.alive ? `${p.n} dé${p.n > 1 ? 's' : ''}` : 'éliminé',
      };
    })
    .sort((a, b) => b.score - a.score);

  const winners = state.winCamp != null ? [...cfg.teams[state.winCamp]] : [];

  const titles = [];
  const all = pids.map((pid) => ({ pid, s: state.players[pid].stats, p: state.players[pid] }));
  const top = (fn) => all.slice().sort((a, b) => fn(b) - fn(a))[0];
  const bluff = top((x) => x.s.bids);
  if (bluff.s.bids >= 4) titles.push({ pid: bluff.pid, emoji: '📣', text: `Bluffeur en chef : ${bluff.s.bids} enchères` });
  const limier = top((x) => x.s.callsWon);
  if (limier.s.callsWon >= 2) titles.push({ pid: limier.pid, emoji: '🕵️', text: `Nez de limier : ${limier.s.callsWon} menteurs démasqués` });
  const pris = top((x) => x.s.caught);
  if (pris.s.caught >= 2) titles.push({ pid: pris.pid, emoji: '🤥', text: `Pris la main dans le sac : ${pris.s.caught} fois` });
  const pile = top((x) => x.s.pilesWon);
  if (pile.s.pilesWon >= 1) titles.push({ pid: pile.pid, emoji: '🎯', text: `PILE parfait : ${pile.s.pilesWon} compte exact` });
  const naif = all.filter((x) => x.s.calls === 0 && x.s.lost >= 2)[0];
  if (naif) titles.push({ pid: naif.pid, emoji: '🐑', text: 'A cru tout ce qu\'on lui disait' });
  const premier = all.filter((x) => x.p.elimAt === 1)[0];
  if (premier) titles.push({ pid: premier.pid, emoji: '🥤', text: 'Premier à jeter son gobelet' });
  const dodo = top((x) => x.s.timeouts);
  if (dodo.s.timeouts >= 3) titles.push({ pid: dodo.pid, emoji: '😴', text: `Endormi sur son gobelet : ${dodo.s.timeouts} tours au chrono` });
  if (!titles.length) {
    titles.push({ pid: ranking[0].pid, emoji: '🏆', text: 'Dernier gobelet debout' });
  }
  return { ranking, winners, titles };
}

// ── Bot : estime, enchérit, et coupe quand ca sent le sapin ────────────

export function botAct(state, pid, mind, api) {
  if (state.done) return;
  const pers = mind.p, rng = mind.rng, mem = mind.mem;
  const p = state.players[pid];
  if (!p || !p.alive) return;

  // Le Tricheur relance discretement son plus mauvais de.
  if (pid === state.tricheur && !p.cheated && state.phase === 'bid' && p.dice.length) {
    const ck = `cheat-${state.round}`;
    if (mem.ck !== ck) {
      mem.ck = ck;
      if (rng.chance(0.55 + pers.skill * 0.3)) {
        const counts = [0, 0, 0, 0, 0, 0, 0];
        for (const d of p.dice) counts[d]++;
        let worst = 0, worstScore = Infinity;
        p.dice.forEach((d, i) => {
          const sc = d === 1 ? 99 : counts[d];
          if (sc < worstScore) { worstScore = sc; worst = i; }
        });
        api.act('cheat', { i: worst });
      }
    }
  }

  if (state.phase !== 'bid' || turnPid(state) !== pid) return;
  const key = `${state.round}-${state.bidCount}-${state.turnIdx}`;
  if (mem.k !== key) {
    mem.k = key;
    mem.at = state.simT;
    mem.delay = 0.7 + rng.next() * 2.6 * pers.pace;
    return;
  }
  if (state.simT - mem.at < mem.delay) return;
  mem.k = `${key}-done`;

  // Coup de sang : le forain se laisse parfois emporter.
  if (state.bid && rng.chance(pers.chaos * 0.12)) {
    if (doChallenge(state, pid)) return;
  }
  const d = decide(state, pid, pers.skill, pers.aggro, rng);
  if (d.a === 'menteur') api.act('menteur');
  else if (d.a === 'pile') api.act('pile');
  else api.act('bid', { qty: d.qty, face: d.face });
}
