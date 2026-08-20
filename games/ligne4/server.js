// LIGNE 4 : simulation serveur. Puissance 4 à 2-8 camps sur grille
// adaptative. Tour par tour strict entre camps (les membres d'une équipe
// alternent), timer par tour avec coup automatique, manches multiples.

import meta from './meta.js';

const W = meta.arena.w;
const TURN_T = 10;      // secondes par tour
const PRE_T = 1.2;
const WIN_T = 2.4;      // pause de fin de manche
const SIM_MAX = 420;    // garde-fou anti-partie infinie (secondes simulées)

export function createState(cfg) {
  const nT = cfg.teams.length;
  const cols = Math.min(7 + 2 * Math.max(0, nT - 2), 15);
  const rows = Math.min(6 + Math.max(0, nT - 2), 10);
  const seats = cfg.teams.flat();
  const state = {
    cfg,
    rng: cfg.rng,
    nT, cols, rows, seats,
    seatOf: Object.fromEntries(seats.map((pid, i) => [pid, i])),
    teamOf: {},
    board: Array.from({ length: rows }, () => Array(cols).fill(-1)),
    filled: 0,
    scores: cfg.teams.map(() => 0),
    rounds: cfg.settings.rounds || 3,
    round: 1,
    phase: 'pre',
    phaseT: PRE_T,
    turnTeam: -1,
    teamPtr: cfg.teams.map(() => 0),
    turnPid: null,
    turnT: 0,
    lastDrop: null,
    simT: 0,
    done: false,
    stats: {},
    evq: [],
    _viewTick: -1, _view: null, tick: 0,
  };
  cfg.teams.forEach((team, t) => {
    for (const pid of team) {
      state.teamOf[pid] = t;
      state.stats[pid] = { drops: 0, winning: 0, blocks: 0, center: 0, timeouts: 0 };
    }
  });
  return state;
}

function startRound(state) {
  for (const row of state.board) row.fill(-1);
  state.filled = 0;
  state.lastDrop = null;
  state.phase = 'pre';
  state.phaseT = PRE_T;
  // Le camp qui ouvre tourne à chaque manche.
  state.turnTeam = (state.round - 2 + state.nT) % state.nT;
}

function nextTurn(state) {
  state.turnTeam = (state.turnTeam + 1) % state.nT;
  const team = state.cfg.teams[state.turnTeam];
  const ptr = state.teamPtr[state.turnTeam] % team.length;
  state.teamPtr[state.turnTeam]++;
  state.turnPid = team[ptr];
  state.turnT = TURN_T;
  state.phase = 'turn';
  state.evq.push({ e: 'turn', pid: state.turnPid, team: state.turnTeam });
}

// Case de chute d'une colonne (-1 si pleine). Ligne 0 = haut.
function landRow(state, c) {
  for (let r = state.rows - 1; r >= 0; r--) if (state.board[r][c] === -1) return r;
  return -1;
}

// L'équipe `t` aligne-t-elle 4 en passant par (c, r) ?
function winsAt(state, t, c, r) {
  const at = (x, y) => {
    if (x < 0 || y < 0 || x >= state.cols || y >= state.rows) return -2;
    const seat = state.board[y][x];
    return seat === -1 ? -1 : state.teamOf[state.seats[seat]];
  };
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    let n = 1;
    const cells = [[c, r]];
    for (const dir of [1, -1]) {
      for (let k = 1; k < 4; k++) {
        if (at(c + dx * k * dir, r + dy * k * dir) === t) { n++; cells.push([c + dx * k * dir, r + dy * k * dir]); }
        else break;
      }
    }
    if (n >= 4) return cells;
  }
  return null;
}

// Le camp `t` gagne-t-il immédiatement en jouant la colonne `c` ?
function wouldWin(state, t, c) {
  const r = landRow(state, c);
  if (r < 0) return null;
  return checkHypothetical(state, t, c, r) ? r : null;
}

function checkHypothetical(state, t, c, r) {
  const at = (x, y) => {
    if (x === c && y === r) return t;
    if (x < 0 || y < 0 || x >= state.cols || y >= state.rows) return -2;
    const seat = state.board[y][x];
    return seat === -1 ? -1 : state.teamOf[state.seats[seat]];
  };
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    let n = 1;
    for (const dir of [1, -1]) {
      for (let k = 1; k < 4; k++) {
        if (at(c + dx * k * dir, r + dy * k * dir) === t) n++;
        else break;
      }
    }
    if (n >= 4) return true;
  }
  return false;
}

function drop(state, pid, c) {
  if (state.phase !== 'turn' || pid !== state.turnPid || state.done) return false;
  if (!Number.isInteger(c) || c < 0 || c >= state.cols) return false;
  const r = landRow(state, c);
  if (r < 0) return false;
  const t = state.teamOf[pid];
  const st = state.stats[pid];

  // Stat « videur » : cette case complétait un alignement ennemi.
  for (let e = 0; e < state.nT; e++) {
    if (e !== t && checkHypothetical(state, e, c, r)) { st.blocks++; break; }
  }

  const seat = state.seatOf[pid];
  state.board[r][c] = seat;
  state.filled++;
  st.drops++;
  if (Math.abs(c - (state.cols - 1) / 2) < 1.6) st.center++;
  state.lastDrop = { c, r, seat };
  state.evq.push({ e: 'drop', pid, seat, c, r });

  const cells = winsAt(state, t, c, r);
  if (cells) {
    st.winning++;
    state.scores[t]++;
    state.phase = 'end';
    state.phaseT = WIN_T;
    state.evq.push({ e: 'win', team: t, pid, cells });
  } else if (state.filled >= state.cols * state.rows) {
    // Grille pleine : la manche va au camp qui a le plus de menaces
    // (fenêtres de 4 avec 3 jetons à lui et une case à personne d'autre).
    const menaces = state.cfg.teams.map((_, e) => countMenaces(state, e));
    const bestM = Math.max(...menaces);
    const bestTeams = menaces.map((m, e) => [m, e]).filter(([m]) => m === bestM);
    const fullWinner = bestM > 0 && bestTeams.length === 1 ? bestTeams[0][1] : null;
    if (fullWinner !== null) state.scores[fullWinner]++;
    state.phase = 'end';
    state.phaseT = WIN_T;
    state.evq.push({ e: 'full', team: fullWinner });
  } else {
    nextTurn(state);
  }
  return true;
}

// Nombre d'alignements de 3 jetons consécutifs d'un camp (départage quand
// la grille est pleine : le camp qui a le mieux « failli » prend la manche).
function countMenaces(state, t) {
  const owner = (x, y) => {
    if (x < 0 || y < 0 || x >= state.cols || y >= state.rows) return -2;
    const seat = state.board[y][x];
    return seat === -1 ? -1 : state.teamOf[state.seats[seat]];
  };
  let n = 0;
  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.cols; x++) {
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
        if (owner(x, y) === t && owner(x + dx, y + dy) === t && owner(x + dx * 2, y + dy * 2) === t) n++;
      }
    }
  }
  return n;
}

// Meilleure colonne (heuristique complète, utilisée par le timeout).
function bestCol(state, t, rng) {
  const valid = [];
  for (let c = 0; c < state.cols; c++) if (landRow(state, c) >= 0) valid.push(c);
  if (!valid.length) return -1;
  for (const c of valid) if (wouldWin(state, t, c) !== null) return c;
  for (const c of valid) {
    for (let e = 0; e < state.nT; e++) {
      if (e !== t && wouldWin(state, e, c) !== null) return c;
    }
  }
  // Éviter d'offrir la case du dessus à un ennemi.
  const safe = valid.filter((c) => {
    const r = landRow(state, c);
    if (r - 1 < 0) return true;
    for (let e = 0; e < state.nT; e++) {
      if (e === t) continue;
      state.board[r][c] = state.seatOf[state.cfg.teams[t][0]];
      const bad = checkHypothetical(state, e, c, r - 1);
      state.board[r][c] = -1;
      if (bad) return false;
    }
    return true;
  });
  const pool = safe.length ? safe : valid;
  // Pondération centrale.
  const mid = (state.cols - 1) / 2;
  pool.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
  const k = Math.min(pool.length - 1, Math.floor((rng ? rng.next() : 0.2) * 3));
  return pool[k];
}

export function onInput(state, pid, d) {
  // Fallback tactile brut (harnais / accès direct) : tx = colonne visée.
  if (!d || typeof d.tx !== 'number' || !Number.isFinite(d.tx)) return;
  const c = Math.floor((d.tx / W) * state.cols);
  drop(state, pid, Math.max(0, Math.min(state.cols - 1, c)));
}

export function onAction(state, pid, a, d) {
  if (a !== 'drop' || !d) return;
  drop(state, pid, Number(d.c));
}

export function tick(state, dt) {
  const evs = state.evq;
  state.evq = [];
  state.tick++;
  state.simT += dt;
  if (state.done) return evs;

  if (state.simT > SIM_MAX) { state.done = true; return evs; }

  if (state.phase === 'pre') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) nextTurn(state);
  } else if (state.phase === 'turn') {
    state.turnT -= dt;
    if (state.turnT <= 0) {
      // Coup automatique : le stand joue proprement à ta place.
      state.stats[state.turnPid].timeouts++;
      const c = bestCol(state, state.teamOf[state.turnPid], state.rng);
      if (c < 0 || !drop(state, state.turnPid, c)) {
        state.phase = 'end';
        state.phaseT = WIN_T;
      }
    }
  } else if (state.phase === 'end') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) {
      if (state.round >= state.rounds) state.done = true;
      else {
        state.round++;
        startRound(state);
        state.evq.push({ e: 'round', n: state.round });
      }
    }
  }
  return evs;
}

export function isOver(state) {
  return state.done;
}

export function view(state) {
  if (state._viewTick === state.tick) return state._view;
  state._view = {
    phase: state.phase,
    tl: Math.round(Math.max(0, state.turnT) * 10) / 10,
    round: state.round,
    rounds: state.rounds,
    scores: state.scores,
    cols: state.cols,
    rows: state.rows,
    seats: state.seats,
    board: state.board.map((row) => row.join(',')).join(';'),
    turn: state.phase === 'turn' ? state.turnPid : null,
    turnTeam: state.turnTeam,
    last: state.lastDrop,
  };
  state._viewTick = state.tick;
  return state._view;
}

export function results(state) {
  const { cfg } = state;
  const best = Math.max(...state.scores);
  const winTeams = state.scores.map((s, t) => [s, t]).filter(([s]) => s === best).map(([, t]) => t);
  const allTied = winTeams.length === cfg.teams.length && cfg.teams.length > 1;
  const winners = allTied || best === 0 ? [] : winTeams.flatMap((t) => cfg.teams[t]);

  const ranking = state.seats
    .map((pid) => {
      const s = state.stats[pid];
      return {
        pid,
        score: state.scores[state.teamOf[pid]],
        tie: s.winning * 5 + s.blocks * 2,
        label: `${state.scores[state.teamOf[pid]]} 🏆`,
      };
    })
    .sort((a, b) => b.score - a.score || b.tie - a.tie)
    .map(({ pid, score, label }) => ({ pid, score, label }));

  const titles = [];
  const all = state.seats.map((pid) => ({ pid, s: state.stats[pid] }));
  const top = (fn) => all.slice().sort((a, b) => fn(b.s) - fn(a.s))[0];
  const sniper = top((s) => s.winning);
  if (sniper.s.winning >= 1) titles.push({ pid: sniper.pid, emoji: '🎯', text: `La Gâchette : ${sniper.s.winning} jeton(s) gagnant(s)` });
  const videur = top((s) => s.blocks);
  if (videur.s.blocks >= 2) titles.push({ pid: videur.pid, emoji: '🚪', text: `Le Videur : ${videur.s.blocks} alignements bouchés` });
  const dodo = top((s) => s.timeouts);
  if (dodo.s.timeouts >= 2) titles.push({ pid: dodo.pid, emoji: '😴', text: `Endormi sur la grille : ${dodo.s.timeouts} tours au chrono` });
  const central = top((s) => s.center);
  if (central.s.center >= 6) titles.push({ pid: central.pid, emoji: '🎪', text: `Squatteur du centre : ${central.s.center} jetons au milieu` });
  if (!titles.length) {
    const ouvrier = top((s) => s.drops);
    titles.push({ pid: ouvrier.pid, emoji: '🧱', text: `Ouvrier du jeton : ${ouvrier.s.drops} jetons posés` });
  }
  return { ranking, winners, titles };
}

// ── Bot : gagne si possible, bloque sinon, vise le centre sans offrir ──

export function botAct(state, pid, mind, api) {
  if (state.phase !== 'turn' || state.turnPid !== pid || state.done) return;
  const { p, rng, mem } = mind;

  const key = `${state.round}-${state.filled}`;
  if (mem.thinkKey !== key) {
    mem.thinkKey = key;
    mem.delay = 0.6 + rng.next() * 2.2 * p.pace;
  }
  if (TURN_T - state.turnT < mem.delay) return;

  const t = state.teamOf[pid];
  const valid = [];
  for (let c = 0; c < state.cols; c++) if (landRow(state, c) >= 0) valid.push(c);
  if (!valid.length) return;

  // Coup de folie assumé.
  if (rng.chance(p.chaos * 0.12)) {
    api.act('drop', { c: rng.pick(valid) });
    return;
  }
  // Victoire immédiate ?
  if (rng.chance(p.skill)) {
    for (const c of valid) if (wouldWin(state, t, c) !== null) { api.act('drop', { c }); return; }
  }
  // Blocage d'une victoire ennemie imminente ?
  if (rng.chance(p.skill * 0.95)) {
    for (const c of valid) {
      for (let e = 0; e < state.nT; e++) {
        if (e !== t && wouldWin(state, e, c) !== null) { api.act('drop', { c }); return; }
      }
    }
  }
  const c = bestCol(state, t, rng);
  api.act('drop', { c: c >= 0 ? c : rng.pick(valid) });
}
