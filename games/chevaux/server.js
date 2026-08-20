// PETITS CHEVAUX : simulation serveur. Tour par tour entre camps sur une
// piste circulaire adaptée au nombre de camps : 6 pour sortir, 6 rejoue
// (2 fois max), capture sur case occupée, échelle d'arrivée vers le centre.
// Asym « Le Jockey » : le solo peut relancer son dé une fois par tour.

const PRE_T = 1.5;
const TURN_T = 10;        // chrono total d'un tour
const AUTO_ROLL_T = 2.2;    // lancer automatique si le joueur tarde
const JOCKEY_T = 3;       // fenêtre GARDER / RELANCER du Jockey
const MOVE_ONE_T = 0.7;   // un seul coup légal : joué tout seul
const MOVE_MANY_T = 5;    // plusieurs coups : le stand tranche après ce délai
const PASS_T = 0.5;       // aucun coup légal : petite pause et on passe
const END_T = 2.5;
const LADDER = 4;         // cases d'échelle (la dernière = arrivée)
const SIM_MAX = 390;      // garde-fou : fin au classement par progression

export function createState(cfg) {
  const C = cfg.teams.length;
  const per = C === 2 ? 16 : C <= 4 ? 11 : C <= 6 ? 7 : 5; // cases par camp
  const N = per * C;
  const H = [2, 3, 4].includes(cfg.settings.chevaux) ? cfg.settings.chevaux : 2;
  const horses = [];
  for (let c = 0; c < C; c++) for (let i = 0; i < H; i++) horses.push({ c, p: i === 0 ? 0 : -1 });
  const asym = cfg.format.kind === 'asym';
  const state = {
    cfg,
    rng: cfg.rng,
    C, per, N, H,
    horses,               // p : -1 écurie, 0..N-1 piste, N..N+3 échelle (N+3 = arrivé)
    jockey: asym ? cfg.teams[0][0] : null,
    camp: cfg.rng.int(0, C - 1),
    turnPtrs: cfg.teams.map(() => 0),
    turnPid: null,
    turnNo: 0,
    phase: 'pre',
    phaseT: PRE_T,
    turnT: 0,
    autoT: 0,
    die: 0,
    legal: [],
    sixStreak: 0,
    rerollUsed: false,
    nextAct: 'next',
    winner: null,
    timecap: false,
    campOf: {},
    stats: {},
    campStats: cfg.teams.map(() => ({ captured: 0 })),
    simT: 0,
    done: false,
    evq: [],
    tick: 0, _viewTick: -1, _view: null,
  };
  cfg.teams.forEach((team, t) => {
    for (const pid of team) {
      state.campOf[pid] = t;
      state.stats[pid] = { rolls: 0, sixes: 0, captures: 0, sorties: 0, arrives: 0, timeouts: 0 };
    }
  });
  return state;
}

const startOf = (state, c) => c * state.per;
const topP = (state) => state.N + LADDER - 1;
const trackCell = (state, c, p) => (startOf(state, c) + p) % state.N;

// Cheval présent sur une case de piste (id, ou -1). Un seul par case.
function horseAtCell(state, cell, skip = -1) {
  for (let id = 0; id < state.horses.length; id++) {
    if (id === skip) continue;
    const h = state.horses[id];
    if (h.p >= 0 && h.p < state.N && trackCell(state, h.c, h.p) === cell) return id;
  }
  return -1;
}

// Coups légaux du camp au trait pour le dé courant (ids de chevaux).
function computeLegal(state) {
  const out = [];
  if (!state.die) return out;
  const top = topP(state);
  state.horses.forEach((h, id) => {
    if (h.c !== state.camp || h.p === top) return;
    if (h.p === -1) {
      if (state.die !== 6) return;
      const occ = horseAtCell(state, startOf(state, state.camp));
      if (occ >= 0 && state.horses[occ].c === state.camp) return;
      out.push(id);
      return;
    }
    const np = Math.min(h.p + state.die, top);
    if (np < state.N) {
      const occ = horseAtCell(state, trackCell(state, h.c, np), id);
      if (occ >= 0 && state.horses[occ].c === h.c) return; // case à soi : interdit
    }
    out.push(id);
  });
  return out;
}

// Ce coup capture-t-il un ennemi ? (aide bot / heuristique)
function wouldCapture(state, id) {
  const h = state.horses[id];
  const np = h.p === -1 ? 0 : Math.min(h.p + state.die, topP(state));
  if (np >= state.N) return false;
  const occ = horseAtCell(state, trackCell(state, h.c, np), id);
  return occ >= 0 && state.horses[occ].c !== h.c;
}

// Meilleur coup déterministe : capture > arrivée > sortie > le plus avancé.
function bestMove(state) {
  const top = topP(state);
  let best = state.legal[0], bestScore = -Infinity;
  for (const id of state.legal) {
    const h = state.horses[id];
    let score;
    if (h.p === -1) {
      score = 500;
    } else {
      const np = Math.min(h.p + state.die, top);
      score = np === top ? 800 + h.p : h.p;
    }
    if (wouldCapture(state, id)) {
      const h2 = state.horses[id];
      const np = h2.p === -1 ? 0 : Math.min(h2.p + state.die, top);
      const vic = horseAtCell(state, trackCell(state, h2.c, np), id);
      score = 1000 + (vic >= 0 ? state.horses[vic].p : 0);
    }
    if (score > bestScore) { bestScore = score; best = id; }
  }
  return best;
}

function startTurn(state) {
  const team = state.cfg.teams[state.camp];
  state.turnPid = team[state.turnPtrs[state.camp] % team.length];
  state.turnNo++;
  state.phase = 'roll';
  state.turnT = TURN_T;
  state.autoT = AUTO_ROLL_T;
  state.die = 0;
  state.legal = [];
  state.sixStreak = 0;
  state.rerollUsed = false;
  state.evq.push({ e: 'turn', pid: state.turnPid, camp: state.camp });
}

function nextCamp(state) {
  state.turnPtrs[state.camp]++;
  state.camp = (state.camp + 1) % state.C;
  startTurn(state);
}

function doRoll(state) {
  state.die = state.rng.int(1, 6);
  const st = state.stats[state.turnPid];
  st.rolls++;
  if (state.die === 6) { st.sixes++; state.sixStreak++; } else state.sixStreak = 0;
  state.evq.push({ e: 'roll', pid: state.turnPid, die: state.die });
  if (state.jockey && state.turnPid === state.jockey && !state.rerollUsed) {
    state.phase = 'jockey';
    state.phaseT = JOCKEY_T;
  } else {
    enterMove(state);
  }
}

function enterMove(state) {
  state.legal = computeLegal(state);
  if (!state.legal.length) {
    state.nextAct = state.die === 6 && state.sixStreak < 3 ? 'replay' : 'next';
    state.phase = 'anim';
    state.phaseT = PASS_T;
    state.evq.push({ e: 'pass', pid: state.turnPid });
    return;
  }
  state.phase = 'move';
  state.autoT = state.legal.length === 1 ? MOVE_ONE_T : MOVE_MANY_T;
}

function applyMove(state, id, timeout = false) {
  const h = state.horses[id];
  const pid = state.turnPid;
  const st = state.stats[pid];
  const top = topP(state);
  let steps;
  if (h.p === -1) {
    h.p = 0;
    steps = 2;
    st.sorties++;
    state.evq.push({ e: 'sortie', h: id, camp: h.c, pid });
  } else {
    const from = h.p;
    h.p = Math.min(h.p + state.die, top);
    steps = h.p - from;
    state.evq.push({ e: 'move', h: id, from, to: h.p });
  }
  if (h.p >= 0 && h.p < state.N) {
    const cell = trackCell(state, h.c, h.p);
    const vid = horseAtCell(state, cell, id);
    if (vid >= 0 && state.horses[vid].c !== h.c) {
      state.horses[vid].p = -1;
      st.captures++;
      state.campStats[state.horses[vid].c].captured++;
      state.evq.push({ e: 'capture', h: vid, camp: state.horses[vid].c, by: pid });
    }
  }
  if (h.p === top) {
    st.arrives++;
    state.evq.push({ e: 'arrive', h: id, camp: h.c, pid });
    if (state.horses.every((x) => x.c !== h.c || x.p === top)) {
      state.winner = h.c;
      state.evq.push({ e: 'win', camp: h.c });
    }
  }
  if (timeout) st.timeouts++;
  state.legal = [];
  state.nextAct = state.die === 6 && state.sixStreak < 3 && state.winner == null ? 'replay' : 'next';
  state.phase = 'anim';
  state.phaseT = Math.min(1.0, 0.45 + steps * 0.05);
}

export function onInput(state, pid, d) {
  // Fallback harnais : un tap brut lance / joue le meilleur coup.
  if (!d || typeof d.tx !== 'number' || !Number.isFinite(d.tx)) return;
  if (state.done || pid !== state.turnPid) return;
  if (state.phase === 'roll') doRoll(state);
  else if (state.phase === 'jockey') enterMove(state);
  else if (state.phase === 'move' && state.legal.length) applyMove(state, bestMove(state));
}

export function onAction(state, pid, a, d) {
  if (state.done || pid !== state.turnPid) return;
  if (a === 'roll' && state.phase === 'roll') {
    doRoll(state);
  } else if (a === 'play' && state.phase === 'move' && d) {
    const h = Math.round(Number(d.h));
    if (Number.isInteger(h) && state.legal.includes(h)) applyMove(state, h);
  } else if (a === 'keep' && state.phase === 'jockey') {
    enterMove(state);
  } else if (a === 'reroll' && state.phase === 'jockey' && !state.rerollUsed) {
    state.rerollUsed = true;
    doRoll(state);
  }
}

export function tick(state, dt) {
  const evs = state.evq;
  state.evq = [];
  state.tick++;
  state.simT += dt;
  if (state.done) return evs;

  if (state.simT > SIM_MAX && state.phase !== 'end') {
    state.timecap = true;
    state.phase = 'end';
    state.phaseT = END_T;
    state.evq.push({ e: 'timecap' });
    return evs;
  }

  if (state.phase === 'pre') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) startTurn(state);
  } else if (state.phase === 'roll') {
    state.turnT -= dt;
    state.autoT -= dt;
    if (state.autoT <= 0 || state.turnT <= 0) doRoll(state);
  } else if (state.phase === 'jockey') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) enterMove(state);
  } else if (state.phase === 'move') {
    state.turnT -= dt;
    state.autoT -= dt;
    if (state.autoT <= 0 || state.turnT <= 0) {
      applyMove(state, bestMove(state), state.legal.length > 1);
    }
  } else if (state.phase === 'anim') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) {
      if (state.winner != null) {
        state.phase = 'end';
        state.phaseT = END_T;
      } else if (state.nextAct === 'replay') {
        state.phase = 'roll';
        state.turnT = TURN_T;
        state.autoT = AUTO_ROLL_T;
        state.die = 0;
        state.evq.push({ e: 'replay', pid: state.turnPid });
      } else {
        nextCamp(state);
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

export function view(state) {
  if (state._viewTick === state.tick) return state._view;
  const tl = state.phase === 'roll' || state.phase === 'move' ? state.turnT : state.phaseT;
  state._view = {
    phase: state.phase,
    tl: Math.round(Math.max(0, tl) * 10) / 10,
    turnNo: state.turnNo,
    camp: state.camp,
    pid: state.turnPid,
    die: state.die,
    streak: state.sixStreak,
    legal: state.legal,
    horses: state.horses.map((h) => h.p),
    N: state.N, per: state.per, H: state.H, C: state.C,
    jockey: state.jockey,
    canReroll: state.phase === 'jockey' && !state.rerollUsed ? 1 : 0,
    arrived: state.cfg.teams.map((_, c) => state.horses.filter((h) => h.c === c && h.p === topP(state)).length),
    winner: state.winner,
    timecap: state.timecap ? 1 : 0,
  };
  state._viewTick = state.tick;
  return state._view;
}

export function results(state) {
  const { cfg } = state;
  const top = topP(state);
  const campScore = cfg.teams.map((_, c) => {
    let arr = 0, prog = 0;
    for (const h of state.horses) if (h.c === c) { if (h.p === top) arr++; prog += h.p + 1; }
    return arr * 10000 + prog;
  });
  const best = Math.max(...campScore);
  const winTeams = campScore.map((s, c) => [s, c]).filter(([s]) => s === best).map(([, c]) => c);
  const allTied = winTeams.length === cfg.teams.length && cfg.teams.length > 1;
  const winners = allTied ? [] : winTeams.flatMap((c) => cfg.teams[c]);

  const pids = cfg.teams.flat();
  const ranking = pids
    .map((pid) => {
      const c = state.campOf[pid];
      const s = state.stats[pid];
      return {
        pid,
        score: campScore[c],
        tie: s.captures * 3 + s.sixes,
        label: `${Math.floor(campScore[c] / 10000)}/${state.H} 🏇`,
      };
    })
    .sort((a, b) => b.score - a.score || b.tie - a.tie)
    .map(({ pid, score, label }) => ({ pid, score, label }));

  const titles = [];
  const all = pids.map((pid) => ({ pid, s: state.stats[pid] }));
  const topBy = (fn) => all.slice().sort((a, b) => fn(b.s) - fn(a.s))[0];
  const boucher = topBy((s) => s.captures);
  if (boucher.s.captures >= 2) titles.push({ pid: boucher.pid, emoji: '🥩', text: `Boucher de l'hippodrome : ${boucher.s.captures} captures` });
  const veinard = topBy((s) => s.sixes);
  if (veinard.s.sixes >= 4) titles.push({ pid: veinard.pid, emoji: '🍀', text: `Copain avec le dé : ${veinard.s.sixes} six` });
  let worstCamp = -1, worstN = 1;
  state.campStats.forEach((cs, c) => { if (cs.captured > worstN) { worstN = cs.captured; worstCamp = c; } });
  if (worstCamp >= 0) titles.push({ pid: cfg.teams[worstCamp][0], emoji: '🩹', text: `Chair à canon : ${worstN} retours à l'écurie` });
  const dodo = topBy((s) => s.timeouts);
  if (dodo.s.timeouts >= 2) titles.push({ pid: dodo.pid, emoji: '😴', text: `Endormi en selle : ${dodo.s.timeouts} coups au chrono` });
  if (!titles.length) {
    titles.push({ pid: ranking[0].pid, emoji: '🏆', text: 'Cravache d\'or de la Kermesse' });
  }
  return { ranking, winners, titles };
}

// ── Bot : capture, sort ses chevaux, pousse le plus avancé ─────────────

export function botAct(state, pid, mind, api) {
  if (state.done || pid !== state.turnPid) return;
  if (state.phase !== 'roll' && state.phase !== 'jockey' && state.phase !== 'move') return;
  const { p: pers, rng, mem } = mind;

  const key = `${state.turnNo}-${state.phase}-${state.die}-${state.rerollUsed ? 1 : 0}`;
  if (mem.k !== key) {
    mem.k = key;
    mem.at = state.simT;
    mem.delay = (state.phase === 'roll' ? 0.08 + rng.next() * 0.25 : 0.15 + rng.next() * 0.4) * pers.pace;
    return;
  }
  if (state.simT - mem.at < mem.delay) return;
  mem.k = `${key}-acted`;

  if (state.phase === 'roll') {
    api.act('roll');
    return;
  }
  if (state.phase === 'jockey') {
    const legal = computeLegal(state);
    const capture = legal.some((id) => wouldCapture(state, id));
    const bad = state.die <= 2 || !legal.length;
    const meh = state.die <= 4 && !capture && state.die !== 6;
    if (!state.rerollUsed && ((bad && rng.chance(0.9)) || (meh && rng.chance(0.4)))) api.act('reroll');
    else api.act('keep');
    return;
  }
  // phase 'move'
  if (!state.legal.length) return;
  let h;
  if (rng.chance(pers.chaos * 0.15) || !rng.chance(Math.max(0.3, pers.skill))) h = rng.pick(state.legal);
  else h = bestMove(state);
  api.act('play', { h });
}
