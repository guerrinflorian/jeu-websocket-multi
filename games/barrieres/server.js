// BARRIÈRES : simulation serveur. Quoridor forain par équipes : camp bas
// contre camp haut, murs de 2 cases, garantie de passage par BFS (personne
// ne peut être emmuré), saut par-dessus un pion adjacent, tour par tour.

import meta from './meta.js';

const W = meta.arena.w, H = meta.arena.h;
const ROWS = 9;
const WALLS_PER_PLAYER = 15;
const TURN_T = 12;
const SOLO_TURN_T = 16;   // le Contremaître a 2 actions
const PRE_T = 1.4;
const WIN_T = 2.6;
const SIM_MAX = 420;

export function createState(cfg) {
  const sideOf = {};       // pid → 0 (bas, but = ligne 0) | 1 (haut, but = ligne ROWS-1)
  const bySide = [[], []];
  if (cfg.format.kind === 'ffa') {
    cfg.teams.flat().forEach((pid, i) => { sideOf[pid] = i % 2; bySide[i % 2].push(pid); });
  } else {
    cfg.teams.forEach((team, t) => {
      for (const pid of team) { sideOf[pid] = t % 2; bySide[t % 2].push(pid); }
    });
  }
  const maxSide = Math.max(bySide[0].length, bySide[1].length, 1);
  const cols = Math.min(7 + 2 * maxSide, 17);

  const state = {
    cfg,
    rng: cfg.rng,
    asym: cfg.format.kind === 'asym',
    cols, rows: ROWS,
    sideOf, bySide,
    teamOf: {},
    nT: cfg.teams.length,
    pawns: {},              // pid → { x, y, walls }
    wallsH: new Set(),      // ancre 'x,y' : bloque le passage vertical (colonnes x et x+1)
    wallsV: new Set(),      // ancre 'x,y' : bloque le passage horizontal (lignes y et y+1)
    scores: cfg.teams.map(() => 0),
    rounds: cfg.settings.rounds || 1,
    round: 1,
    phase: 'pre',
    phaseT: PRE_T,
    turnTeam: -1,
    turnNo: 0,
    teamPtr: cfg.teams.map(() => 0),
    turnPid: null,
    turnT: 0,
    actionsLeft: 0,
    simT: 0,
    done: false,
    stats: {},
    evq: [],
    tick: 0, _viewTick: -1, _view: null,
  };
  cfg.teams.forEach((team, t) => {
    for (const pid of team) {
      state.teamOf[pid] = t;
      state.stats[pid] = { steps: 0, jumps: 0, walls: 0, pain: 0, timeouts: 0 };
    }
  });
  placePawns(state);
  return state;
}

function placePawns(state) {
  state.wallsH.clear();
  state.wallsV.clear();
  for (const side of [0, 1]) {
    const pids = state.bySide[side];
    const y = side === 0 ? state.rows - 1 : 0;
    pids.forEach((pid, i) => {
      const x = Math.max(0, Math.min(state.cols - 1, Math.floor(((i + 1) * state.cols) / (pids.length + 1))));
      state.pawns[pid] = { x, y, walls: WALLS_PER_PLAYER };
    });
    // Décale les doublons éventuels (petites grilles).
    const seen = new Set();
    for (const pid of pids) {
      const p = state.pawns[pid];
      while (seen.has(p.x)) p.x = (p.x + 1) % state.cols;
      seen.add(p.x);
    }
  }
}

const goalRow = (state, pid) => (state.sideOf[pid] === 0 ? 0 : state.rows - 1);

// ── Murs & déplacements ──────────────────────────────────────────────

// Passage bloqué entre deux cases ADJACENTES ?
function blockedEdge(state, x1, y1, x2, y2) {
  if (x1 === x2) {
    const y = Math.min(y1, y2);
    return state.wallsH.has(`${x1 - 1},${y}`) || state.wallsH.has(`${x1},${y}`);
  }
  const x = Math.min(x1, x2);
  return state.wallsV.has(`${x},${y1 - 1}`) || state.wallsV.has(`${x},${y1}`);
}

function occupied(state, x, y) {
  for (const p of Object.values(state.pawns)) if (p.x === x && p.y === y) return true;
  return false;
}

const inGrid = (state, x, y) => x >= 0 && y >= 0 && x < state.cols && y < state.rows;

// Coups légaux du pion : pas orthogonal, ou saut droit par-dessus un pion.
export function legalMoves(state, pid) {
  const p = state.pawns[pid];
  if (!p) return [];
  const out = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = p.x + dx, ny = p.y + dy;
    if (!inGrid(state, nx, ny) || blockedEdge(state, p.x, p.y, nx, ny)) continue;
    if (!occupied(state, nx, ny)) {
      out.push({ x: nx, y: ny, jump: false });
    } else {
      const jx = p.x + dx * 2, jy = p.y + dy * 2;
      if (inGrid(state, jx, jy) && !blockedEdge(state, nx, ny, jx, jy) && !occupied(state, jx, jy)) {
        out.push({ x: jx, y: jy, jump: true });
      }
    }
  }
  return out;
}

// Champ de distances BFS depuis la ligne but d'un camp (murs seuls).
function distField(state, side) {
  const target = side === 0 ? 0 : state.rows - 1;
  const dist = Array.from({ length: state.rows }, () => Array(state.cols).fill(-1));
  const q = [];
  for (let x = 0; x < state.cols; x++) { dist[target][x] = 0; q.push([x, target]); }
  let head = 0;
  while (head < q.length) {
    const [x, y] = q[head++];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!inGrid(state, nx, ny) || dist[ny][nx] !== -1) continue;
      if (blockedEdge(state, x, y, nx, ny)) continue;
      dist[ny][nx] = dist[y][x] + 1;
      q.push([nx, ny]);
    }
  }
  return dist;
}

// Un mur est-il posable ? (bornes, chevauchement, croisement, passages)
function wallLegal(state, o, x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return 'bad';
  if (x < 0 || y < 0 || x > state.cols - 2 || y > state.rows - 2) return 'bad';
  const hh = state.wallsH, vv = state.wallsV;
  if (o === 'h') {
    if (hh.has(`${x - 1},${y}`) || hh.has(`${x},${y}`) || hh.has(`${x + 1},${y}`) || vv.has(`${x},${y}`)) return 'overlap';
  } else if (o === 'v') {
    if (vv.has(`${x},${y - 1}`) || vv.has(`${x},${y}`) || vv.has(`${x},${y + 1}`) || hh.has(`${x},${y}`)) return 'overlap';
  } else return 'bad';

  // Garantie de passage : chaque pion doit toujours pouvoir atteindre son but.
  const set = o === 'h' ? hh : vv;
  set.add(`${x},${y}`);
  const d0 = distField(state, 0);
  const d1 = distField(state, 1);
  let ok = true;
  for (const [pid, p] of Object.entries(state.pawns)) {
    const d = state.sideOf[pid] === 0 ? d0 : d1;
    if (d[p.y][p.x] === -1) { ok = false; break; }
  }
  set.delete(`${x},${y}`);
  return ok ? 'ok' : 'block';
}

// ── Tours ────────────────────────────────────────────────────────────

function nextTurn(state) {
  state.turnNo++;
  state.turnTeam = (state.turnTeam + 1) % state.nT;
  const team = state.cfg.teams[state.turnTeam];
  const ptr = state.teamPtr[state.turnTeam] % team.length;
  state.teamPtr[state.turnTeam]++;
  state.turnPid = team[ptr];
  const solo = state.asym && state.turnTeam === 0;
  state.actionsLeft = solo ? 2 : 1;
  state.turnT = solo ? SOLO_TURN_T : TURN_T;
  state.phase = 'turn';
  state.evq.push({ e: 'turn', pid: state.turnPid, n: state.actionsLeft });
}

function afterAction(state, pid) {
  const p = state.pawns[pid];
  if (p.y === goalRow(state, pid)) {
    const t = state.teamOf[pid];
    state.scores[t]++;
    state.phase = 'end';
    state.phaseT = WIN_T;
    state.evq.push({ e: 'win', team: t, pid });
    return;
  }
  state.actionsLeft--;
  if (state.actionsLeft > 0) {
    state.evq.push({ e: 'again', pid, n: state.actionsLeft });
  } else {
    nextTurn(state);
  }
}

function tryMove(state, pid, x, y) {
  if (state.phase !== 'turn' || pid !== state.turnPid || state.done) return false;
  const mv = legalMoves(state, pid).find((m) => m.x === x && m.y === y);
  if (!mv) return false;
  const p = state.pawns[pid];
  const from = { x: p.x, y: p.y };
  p.x = x; p.y = y;
  const st = state.stats[pid];
  st.steps++;
  if (mv.jump) st.jumps++;
  state.evq.push({ e: 'move', pid, fx: from.x, fy: from.y, x, y, jump: mv.jump ? 1 : 0 });
  afterAction(state, pid);
  return true;
}

function tryWall(state, pid, o, x, y) {
  if (state.phase !== 'turn' || pid !== state.turnPid || state.done) return false;
  const p = state.pawns[pid];
  if (p.walls <= 0) { state.evq.push({ e: 'reject', pid, why: 'stock' }); return false; }
  const verdict = wallLegal(state, o, x, y);
  if (verdict !== 'ok') {
    state.evq.push({ e: 'reject', pid, why: verdict });
    return false;
  }
  // Douleur infligée : allongement du chemin ennemi.
  const enemySide = 1 - state.sideOf[pid];
  const before = bestDist(state, enemySide);
  (o === 'h' ? state.wallsH : state.wallsV).add(`${x},${y}`);
  const after = bestDist(state, enemySide);
  p.walls--;
  const st = state.stats[pid];
  st.walls++;
  st.pain += Math.max(0, after - before);
  state.evq.push({ e: 'wall', pid, o, x, y });
  afterAction(state, pid);
  return true;
}

// Distance du pion ennemi le mieux placé.
function bestDist(state, side) {
  const d = distField(state, side);
  let best = Infinity;
  for (const pid of state.bySide[side]) {
    const p = state.pawns[pid];
    const v = d[p.y][p.x];
    if (v >= 0 && v < best) best = v;
  }
  return best === Infinity ? 99 : best;
}

// Coup automatique : descendre le champ de distances (saut compris).
function autoMove(state, pid) {
  const p = state.pawns[pid];
  const d = distField(state, state.sideOf[pid]);
  const moves = legalMoves(state, pid);
  if (!moves.length) { // emmuré par des pions : on passe
    state.actionsLeft = 0;
    nextTurn(state);
    return;
  }
  moves.sort((a, b) => d[a.y][a.x] - d[b.y][b.x]);
  const best = moves[0];
  tryMove(state, pid, best.x, best.y);
}

// ── Contrat ──────────────────────────────────────────────────────────

export function onInput(state, pid, d) {
  // Fallback tactile brut (harnais) : (tx, ty) monde → case visée.
  if (!d || typeof d.tx !== 'number' || typeof d.ty !== 'number') return;
  if (!Number.isFinite(d.tx) || !Number.isFinite(d.ty)) return;
  const L = boardLayout(state);
  const x = Math.floor((d.tx - L.bx) / L.cell);
  const y = Math.floor((d.ty - L.by) / L.cell);
  if (inGrid(state, x, y)) tryMove(state, pid, x, y);
}

export function onAction(state, pid, a, d) {
  if (a === 'move' && d) tryMove(state, pid, Math.round(Number(d.x)), Math.round(Number(d.y)));
  else if (a === 'wall' && d) tryWall(state, pid, d.o === 'v' ? 'v' : 'h', Math.round(Number(d.x)), Math.round(Number(d.y)));
}

// Géométrie du plateau en coordonnées monde (partagée avec le client).
export function boardLayout(state) {
  const cell = Math.min(760 / state.cols, 500 / state.rows);
  const bw = cell * state.cols, bh = cell * state.rows;
  return { cell, bw, bh, bx: (W - bw) / 2, by: 96 + (500 - bh) / 2 };
}

export function tick(state, dt) {
  const evs = state.evq;
  state.evq = [];
  state.tick++;
  state.simT += dt;
  if (state.done) return evs;
  if (state.simT > SIM_MAX) {
    // Temps écoulé : la manche revient au camp du pion le plus avancé.
    let bestT = -1, bestD = Infinity, tied = false;
    const d0 = distField(state, 0), d1 = distField(state, 1);
    for (const [pid, p] of Object.entries(state.pawns)) {
      const d = state.sideOf[pid] === 0 ? d0 : d1;
      const v = d[p.y][p.x] === -1 ? 99 : d[p.y][p.x];
      const t = state.teamOf[pid];
      if (v < bestD) { bestD = v; bestT = t; tied = false; }
      else if (v === bestD && t !== bestT) tied = true;
    }
    if (!tied && bestT >= 0) {
      state.scores[bestT]++;
      evs.push({ e: 'win', team: bestT, pid: null });
    }
    state.done = true;
    return evs;
  }

  if (state.phase === 'pre') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) nextTurn(state);
  } else if (state.phase === 'turn') {
    state.turnT -= dt;
    if (state.turnT <= 0) {
      state.stats[state.turnPid].timeouts++;
      const pid = state.turnPid;
      let guard = 3;
      while (state.phase === 'turn' && state.turnPid === pid && guard-- > 0) {
        autoMove(state, pid);
      }
    }
  } else if (state.phase === 'end') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) {
      if (state.round >= state.rounds) state.done = true;
      else {
        state.round++;
        placePawns(state);
        for (const p of Object.values(state.pawns)) p.walls = WALLS_PER_PLAYER;
        state.turnTeam = (state.round - 2 + state.nT) % state.nT;
        state.phase = 'pre';
        state.phaseT = PRE_T;
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
  const pawns = {};
  for (const [pid, p] of Object.entries(state.pawns)) {
    pawns[pid] = { x: p.x, y: p.y, w: p.walls, s: state.sideOf[pid] };
  }
  state._view = {
    phase: state.phase,
    tl: Math.round(Math.max(0, state.turnT) * 10) / 10,
    tmax: state.asym && state.turnTeam === 0 ? SOLO_TURN_T : TURN_T,
    round: state.round,
    rounds: state.rounds,
    scores: state.scores,
    cols: state.cols,
    rows: state.rows,
    turn: state.phase === 'turn' ? state.turnPid : null,
    acts: state.actionsLeft,
    wh: [...state.wallsH].map((k) => k.split(',').map(Number)),
    wv: [...state.wallsV].map((k) => k.split(',').map(Number)),
    pawns,
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

  const d0 = distField(state, 0);
  const d1 = distField(state, 1);
  const ranking = Object.keys(state.pawns)
    .map((pid) => {
      const p = state.pawns[pid];
      const d = state.sideOf[pid] === 0 ? d0 : d1;
      const left = d[p.y][p.x] === -1 ? 99 : d[p.y][p.x];
      return {
        pid,
        score: state.scores[state.teamOf[pid]],
        tie: -left,
        label: state.scores[state.teamOf[pid]] > 0 ? `${state.scores[state.teamOf[pid]]} 🏆` : `à ${left} case${left > 1 ? 's' : ''}`,
      };
    })
    .sort((a, b) => b.score - a.score || b.tie - a.tie)
    .map(({ pid, score, label }) => ({ pid, score, label }));

  const titles = [];
  const all = Object.keys(state.pawns).map((pid) => ({ pid, s: state.stats[pid] }));
  const top = (fn) => all.slice().sort((a, b) => fn(b.s) - fn(a.s))[0];
  const macon = top((s) => s.walls);
  if (macon.s.walls >= 3) titles.push({ pid: macon.pid, emoji: '🧱', text: `Le Maçon : ${macon.s.walls} barrières posées` });
  const archi = top((s) => s.pain);
  if (archi.s.pain >= 6) titles.push({ pid: archi.pid, emoji: '😈', text: `Architecte du malheur : +${archi.s.pain} cases de détour infligées` });
  const mouton = top((s) => s.jumps);
  if (mouton.s.jumps >= 2) titles.push({ pid: mouton.pid, emoji: '🐑', text: `Saute-mouton : ${mouton.s.jumps} sauts` });
  const dodo = top((s) => s.timeouts);
  if (dodo.s.timeouts >= 2) titles.push({ pid: dodo.pid, emoji: '😴', text: `Perdu sur le chantier : ${dodo.s.timeouts} tours au chrono` });
  if (!titles.length) {
    const marath = top((s) => s.steps);
    titles.push({ pid: marath.pid, emoji: '👟', text: `Marathonien : ${marath.s.steps} pas` });
  }
  return { ranking, winners, titles };
}

// ── Bot : course au plus court chemin, murs de harcèlement ────────────

export function botAct(state, pid, mind, api) {
  if (state.phase !== 'turn' || state.turnPid !== pid || state.done) return;
  const { p: pers, rng, mem } = mind;

  // Une réflexion par action (le tour + l'action en cours).
  const key = `${state.turnNo}-${state.actionsLeft}`;
  if (mem.thinkKey !== key) {
    mem.thinkKey = key;
    mem.delay = 0.5 + rng.next() * 1.8 * pers.pace;
    mem.thoughtAt = state.simT;
  }
  if (state.simT - mem.thoughtAt < mem.delay) return;

  const me = state.pawns[pid];
  const mySide = state.sideOf[pid];
  const enemySide = 1 - mySide;
  const myD = distField(state, mySide);
  const myDist = myD[me.y][me.x];
  const enemyDist = bestDist(state, enemySide);

  // Pose de mur : surtout si l'ennemi est devant, selon l'agressivité.
  // Plus le plateau se remplit, moins on empile (sinon personne n'arrive).
  const clutter = Math.max(0.3, 1 - (state.wallsH.size + state.wallsV.size) / 60);
  const wantWall = me.walls > 0 &&
    rng.chance(pers.aggro * clutter * (enemyDist < myDist ? 0.85 : 0.25));
  if (wantWall) {
    // Candidats : ancres autour du meneur ennemi.
    let leader = null, bestLd = Infinity;
    const dE = distField(state, enemySide);
    for (const epid of state.bySide[enemySide]) {
      const ep = state.pawns[epid];
      const v = dE[ep.y][ep.x];
      if (v >= 0 && v < bestLd) { bestLd = v; leader = ep; }
    }
    if (leader) {
      let bestWall = null, bestGain = 0;
      const tries = 4 + Math.round(pers.skill * 10);
      for (let i = 0; i < tries; i++) {
        const o = rng.chance(0.55) ? 'h' : 'v';
        const x = Math.max(0, Math.min(state.cols - 2, leader.x + rng.int(-2, 1)));
        const y = Math.max(0, Math.min(state.rows - 2, leader.y + rng.int(-2, 1)));
        if (wallLegal(state, o, x, y) !== 'ok') continue;
        const set = o === 'h' ? state.wallsH : state.wallsV;
        set.add(`${x},${y}`);
        const gain = bestDist(state, enemySide) - enemyDist;
        const selfCost = distField(state, mySide)[me.y][me.x] - myDist;
        set.delete(`${x},${y}`);
        const score = gain - selfCost * 0.8;
        if (score > bestGain) { bestGain = score; bestWall = { o, x, y }; }
      }
      if (bestWall && bestGain >= 1) {
        api.act('wall', bestWall);
        return;
      }
    }
  }

  // Sinon : avancer vers le but (avec un peu de chaos).
  const moves = legalMoves(state, pid);
  if (!moves.length) return; // le timeout passera le tour
  if (rng.chance(pers.chaos * 0.15)) {
    const m = rng.pick(moves);
    api.act('move', { x: m.x, y: m.y });
    return;
  }
  moves.sort((a, b) => myD[a.y][a.x] - myD[b.y][b.x]);
  const m = moves[0];
  api.act('move', { x: m.x, y: m.y });
}
