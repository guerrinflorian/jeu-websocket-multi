// CARAMBOLE — simulation serveur : physique de palets (masse, impulsions),
// piste circulaire qui rétrécit, dash, bonus, format « Le Taureau ».

import { TAU, clamp } from '../../shared/const.js';
import meta from './meta.js';

const W = meta.arena.w;
const CX = W / 2, CY = W / 2;
const PLAT_R0 = 285;
const PLAT_MIN = 95;
const SHRINK_DELAY = 12;   // s avant de rétrécir
const SHRINK_RATE = 7;     // unités/s
const P_R = 16;
const ACCEL = 470;
const FRICTION = 2.0;
const REST = 0.92;         // restitution des chocs
const DASH_V = 460;
const DASH_CD = 3.0;
const DASH_ATK = 0.3;      // s de « coup de bélier » après le dash
const BULL_MASS = 2.3;
const BULL_R = 21;
const BULL_CD = 2.2;
const BULL_LIVES = 3;
const BONUS_EVERY = 7;     // s
const BONUS_MAX = 2;
const PRE_T = 1.2;
const END_T = 2.0;

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;

export function createState(cfg) {
  const state = {
    cfg,
    rng: cfg.rng,
    asym: cfg.format.kind === 'asym',
    rounds: cfg.settings.rounds || 5,
    tick: 0,
    round: 0,
    scores: cfg.teams.map(() => 0),
    phase: 'pre',
    phaseT: PRE_T,
    platR: PLAT_R0,
    runT: 0,
    bonuses: [],
    bonusT: BONUS_EVERY,
    bonusId: 0,
    players: {},
    evq: [],
    done: false,
    _viewTick: -1,
    _view: null,
  };
  cfg.teams.forEach((team, t) => {
    for (const pid of team) {
      state.players[pid] = {
        pid, team: t,
        x: 0, y: 0, vx: 0, vy: 0, a: 0,
        ix: 0, iy: 0,
        alive: true, lives: 1,
        dashCd: 0, atkT: 0, invT: 0,
        anvilT: 0, magnetT: 0, gant: false,
        lastHitBy: null, lastHitTick: 0,
        stats: { ejections: 0, falls: 0, selfFalls: 0, bonuses: 0, dashes: 0, bumps: 0 },
      };
    }
  });
  startRound(state);
  return state;
}

const isBull = (state, p) => state.asym && p.team === 0;

function startRound(state) {
  state.round++;
  state.phase = 'pre';
  state.phaseT = PRE_T;
  state.platR = PLAT_R0;
  state.runT = 0;
  state.bonuses = [];
  state.bonusT = BONUS_EVERY;
  const pids = Object.keys(state.players);
  pids.forEach((pid, i) => {
    const p = state.players[pid];
    p.alive = true;
    p.lives = isBull(state, p) ? BULL_LIVES : 1;
    p.vx = p.vy = p.ix = p.iy = 0;
    p.dashCd = 0; p.atkT = 0; p.invT = 0;
    p.anvilT = 0; p.magnetT = 0; p.gant = false;
    p.lastHitBy = null;
    if (isBull(state, p)) {
      p.x = CX; p.y = CY; p.a = 0;
    } else {
      const ang = (i / pids.length) * TAU;
      p.x = CX + Math.cos(ang) * PLAT_R0 * 0.62;
      p.y = CY + Math.sin(ang) * PLAT_R0 * 0.62;
      p.a = ang + Math.PI;
    }
  });
}

export function onInput(state, pid, d) {
  const p = state.players[pid];
  if (!p || !d) return;
  const mx = Number(d.mx), my = Number(d.my);
  if (!Number.isFinite(mx) || !Number.isFinite(my)) return;
  const len = Math.hypot(mx, my);
  const k = len > 1 ? 1 / len : 1;
  p.ix = mx * k;
  p.iy = my * k;
}

export function onAction(state, pid, a) {
  const p = state.players[pid];
  if (!p || a !== 'dash') return;
  if (state.phase !== 'run' || !p.alive || p.dashCd > 0) return;
  const len = Math.hypot(p.ix, p.iy);
  const dx = len > 0.2 ? p.ix / len : Math.cos(p.a);
  const dy = len > 0.2 ? p.iy / len : Math.sin(p.a);
  const power = DASH_V * (p.gant ? 1.45 : 1);
  p.vx += dx * power;
  p.vy += dy * power;
  p.dashCd = isBull(state, p) ? BULL_CD : DASH_CD;
  p.atkT = DASH_ATK * (p.gant ? 1.6 : 1);
  p.gantAtk = p.gant;
  p.gant = false;
  p.stats.dashes++;
  state.evq.push({ e: 'dash', pid, x: r1(p.x), y: r1(p.y) });
}

export function tick(state, dt) {
  const evs = state.evq;
  state.evq = [];
  state.tick++;

  if (state.phase === 'pre') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) { state.phase = 'run'; evs.push({ e: 'go' }); }
    return evs;
  }
  if (state.phase === 'end') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) {
      if (state.round >= state.rounds) state.done = true;
      else startRound(state);
    }
    return evs;
  }

  // phase run
  state.runT += dt;
  if (state.runT > SHRINK_DELAY && state.platR > PLAT_MIN) {
    state.platR = Math.max(PLAT_MIN, state.platR - SHRINK_RATE * dt);
  }

  // Bonus.
  state.bonusT -= dt;
  if (state.bonusT <= 0 && state.bonuses.length < BONUS_MAX && !state.asym) {
    state.bonusT = BONUS_EVERY;
    const ang = state.rng.range(0, TAU);
    const rad = state.rng.range(0, state.platR * 0.7);
    state.bonuses.push({
      id: ++state.bonusId,
      x: r1(CX + Math.cos(ang) * rad),
      y: r1(CY + Math.sin(ang) * rad),
      k: state.rng.pick(['enclume', 'aimant', 'gant']),
    });
    evs.push({ e: 'spawn' });
  }

  const players = Object.values(state.players).filter((p) => p.alive);

  // Intégration.
  for (const p of players) {
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.atkT -= dt;
    p.invT -= dt;
    p.anvilT -= dt;
    p.magnetT -= dt;
    p.vx += p.ix * ACCEL * dt;
    p.vy += p.iy * ACCEL * dt;
    const f = Math.max(0, 1 - FRICTION * dt);
    p.vx *= f; p.vy *= f;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (Math.hypot(p.ix, p.iy) > 0.15 || Math.hypot(p.vx, p.vy) > 30) {
      p.a = Math.atan2(p.vy + p.iy * 60, p.vx + p.ix * 60);
    }
    // Aimant : attire les ennemis proches.
    if (p.magnetT > 0) {
      for (const q of players) {
        if (q.team === p.team) continue;
        const dx = p.x - q.x, dy = p.y - q.y;
        const d = Math.hypot(dx, dy);
        if (d > 1 && d < 130) {
          q.vx += (dx / d) * 160 * dt;
          q.vy += (dy / d) * 160 * dt;
        }
      }
    }
  }

  // Collisions entre palets (impulsions, masse).
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const p = players[i], q = players[j];
      const pr = radius(state, p), qr = radius(state, q);
      const dx = q.x - p.x, dy = q.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d === 0 || d > pr + qr) continue;
      const nx = dx / d, ny = dy / d;
      const overlap = pr + qr - d;
      const pm = mass(state, p), qm = mass(state, q);
      // Sépare.
      p.x -= nx * overlap * (qm / (pm + qm));
      p.y -= ny * overlap * (qm / (pm + qm));
      q.x += nx * overlap * (pm / (pm + qm));
      q.y += ny * overlap * (pm / (pm + qm));
      // Impulsion élastique le long de la normale.
      const rvx = q.vx - p.vx, rvy = q.vy - p.vy;
      const rel = rvx * nx + rvy * ny;
      if (rel < 0) {
        let imp = (-(1 + REST) * rel) / (1 / pm + 1 / qm);
        // Coup de bélier : le dasheur frappe plus fort.
        let bump = 0;
        if (p.atkT > 0) bump += (p.gantAtk ? 2.6 : 1.6);
        if (q.atkT > 0) bump += (q.gantAtk ? 2.6 : 1.6);
        imp *= 1 + bump * 0.6;
        p.vx -= (imp * nx) / pm;
        p.vy -= (imp * ny) / pm;
        q.vx += (imp * nx) / qm;
        q.vy += (imp * ny) / qm;
        const strength = Math.abs(rel);
        if (strength > 90) {
          if (p.team !== q.team) {
            p.lastHitBy = q.pid; p.lastHitTick = state.tick;
            q.lastHitBy = p.pid; q.lastHitTick = state.tick;
            if (p.atkT > 0) p.stats.bumps++;
            if (q.atkT > 0) q.stats.bumps++;
          }
          evs.push({ e: 'hit', x: r1((p.x + q.x) / 2), y: r1((p.y + q.y) / 2), s: Math.min(1, strength / 400) });
        }
      }
    }
  }

  // Ramassage des bonus.
  for (const p of players) {
    for (let i = state.bonuses.length - 1; i >= 0; i--) {
      const b = state.bonuses[i];
      if (Math.hypot(b.x - p.x, b.y - p.y) < radius(state, p) + 12) {
        state.bonuses.splice(i, 1);
        p.stats.bonuses++;
        if (b.k === 'enclume') p.anvilT = 6;
        else if (b.k === 'aimant') p.magnetT = 4;
        else p.gant = true;
        evs.push({ e: 'bonus', pid: p.pid, k: b.k, x: b.x, y: b.y });
      }
    }
  }

  // Chutes.
  for (const p of players) {
    const d = Math.hypot(p.x - CX, p.y - CY);
    if (d > state.platR + radius(state, p) * 0.35 && p.invT <= 0) {
      fall(state, p, evs);
    }
  }

  // Fin de manche ?
  const alive = Object.values(state.players).filter((p) => p.alive);
  const aliveTeams = new Set(alive.map((p) => p.team));
  if (aliveTeams.size <= 1) {
    const winner = aliveTeams.size ? [...aliveTeams][0] : null;
    if (winner !== null) state.scores[winner]++;
    evs.push({ e: 'roundEnd', team: winner, round: state.round });
    state.phase = 'end';
    state.phaseT = END_T;
  }
  return evs;
}

function radius(state, p) {
  return isBull(state, p) ? BULL_R : P_R;
}

function mass(state, p) {
  let m = isBull(state, p) ? BULL_MASS : 1;
  if (p.anvilT > 0) m *= 2.2;
  return m;
}

function fall(state, p, evs) {
  p.lives--;
  const recent = state.tick - p.lastHitTick < 30 ? state.players[p.lastHitBy] : null;
  if (recent && recent.team !== p.team) recent.stats.ejections++;
  else p.stats.selfFalls++;
  p.stats.falls++;
  evs.push({ e: 'fall', pid: p.pid, x: r1(p.x), y: r1(p.y), out: p.lives <= 0 ? 1 : 0 });
  if (p.lives > 0) {
    // Le Taureau revient au centre, brièvement intouchable.
    p.x = CX; p.y = CY; p.vx = p.vy = 0;
    p.invT = 1.2;
    p.lastHitBy = null;
  } else {
    p.alive = false;
  }
}

export function isOver(state) {
  return state.done;
}

export function view(state) {
  if (state._viewTick === state.tick) return state._view;
  const players = {};
  for (const [pid, p] of Object.entries(state.players)) {
    players[pid] = {
      x: r1(p.x), y: r1(p.y), a: r2(p.a),
      al: p.alive ? 1 : 0,
      cd: r2(p.dashCd / (isBull(state, p) ? BULL_CD : DASH_CD)),
      lv: p.lives,
      fx: (p.anvilT > 0 ? 1 : 0) | (p.magnetT > 0 ? 2 : 0) | (p.gant ? 4 : 0) | (p.invT > 0 ? 8 : 0),
    };
  }
  state._view = {
    phase: state.phase,
    round: state.round,
    rounds: state.rounds,
    scores: state.scores,
    asym: state.asym,
    platR: r1(state.platR),
    bonuses: state.bonuses,
    players,
  };
  state._viewTick = state.tick;
  return state._view;
}

export function results(state) {
  const { cfg } = state;
  const best = Math.max(...state.scores);
  const winTeams = state.scores.map((s, t) => [s, t]).filter(([s]) => s === best).map(([, t]) => t);
  const allTied = winTeams.length === cfg.teams.length && cfg.teams.length > 1;
  const winners = allTied ? [] : winTeams.flatMap((t) => cfg.teams[t]);

  const ranking = Object.values(state.players)
    .map((p) => ({
      pid: p.pid,
      score: state.scores[p.team],
      tie: p.stats.ejections * 3 - p.stats.selfFalls,
      label: `${state.scores[p.team]} 🏆`,
    }))
    .sort((a, b) => b.score - a.score || b.tie - a.tie)
    .map(({ pid, score, label }) => ({ pid, score, label }));

  const titles = [];
  const all = Object.values(state.players);
  const top = (fn) => all.slice().sort((a, b) => fn(b.stats) - fn(a.stats))[0];
  const ej = top((s) => s.ejections);
  if (ej.stats.ejections >= 2) titles.push({ pid: ej.pid, emoji: '🐂', text: `Force de la nature — ${ej.stats.ejections} éjections` });
  const solo = top((s) => s.selfFalls);
  if (solo.stats.selfFalls >= 2) titles.push({ pid: solo.pid, emoji: '🤡', text: `Tombé tout seul — ${solo.stats.selfFalls} fois` });
  const dash = top((s) => s.dashes);
  if (dash.stats.dashes >= 5) titles.push({ pid: dash.pid, emoji: '🚗', text: `Klaxonneur fou — ${dash.stats.dashes} dashs` });
  const bon = top((s) => s.bonuses);
  if (bon.stats.bonuses >= 2) titles.push({ pid: bon.pid, emoji: '🎁', text: `Rafleur de bonus — ${bon.stats.bonuses} ramassés` });
  const shy = all.slice().sort((a, b) => (a.stats.bumps + a.stats.dashes) - (b.stats.bumps + b.stats.dashes))[0];
  titles.push({ pid: shy.pid, emoji: '🐔', text: 'Le plus pacifiste (ou le plus lâche ?)' });

  return { ranking, winners, titles };
}

// ── Bot ────────────────────────────────────────────────────────────────

export function botAct(state, pid, mind, api) {
  const p = state.players[pid];
  if (!p || !p.alive || state.phase !== 'run') return;
  const { p: pers, rng } = mind;

  const edge = state.platR - Math.hypot(p.x - CX, p.y - CY);
  let tx = 0, ty = 0;

  // 1. Ne pas tomber : près du bord, on rentre.
  const danger = clamp(1 - edge / 90, 0, 1);
  const toC = norm(CX - p.x, CY - p.y);
  tx += toC.x * danger * 2.2;
  ty += toC.y * danger * 2.2;

  // 2. Bonus à portée ?
  let target = null;
  if (state.bonuses.length && rng.chance(0.8)) {
    target = state.bonuses.reduce((b, c) =>
      dist2(p, c) < dist2(p, b) ? c : b);
    if (Math.sqrt(dist2(p, target)) > 200) target = null;
  }
  // 3. Sinon : l'ennemi le plus proche (pondéré par l'agressivité).
  if (!target) {
    let bd = Infinity;
    for (const q of Object.values(state.players)) {
      if (!q.alive || q.team === p.team) continue;
      const d = dist2(p, q);
      if (d < bd) { bd = d; target = q; }
    }
  }
  if (target) {
    const to = norm(target.x - p.x, target.y - p.y);
    const w = (0.5 + pers.aggro) * (1 - danger * 0.8);
    tx += to.x * w;
    ty += to.y * w;
    // Dash si l'ennemi est aligné et proche du bord (skill = discernement).
    if (p.dashCd <= 0 && target.pid) {
      const d = Math.sqrt(dist2(p, target));
      const tEdge = state.platR - Math.hypot(target.x - CX, target.y - CY);
      const aligned = Math.abs(angleDiff(Math.atan2(to.y, to.x), Math.atan2(p.iy || to.y, p.ix || to.x))) < 0.8;
      if (d < 90 && aligned && (tEdge < 80 || rng.chance(pers.aggro * 0.25)) && rng.chance(pers.skill)) {
        api.input({ mx: to.x, my: to.y });
        api.act('dash');
        return;
      }
    }
  }
  // Dash de survie : on glisse vers le vide.
  if (p.dashCd <= 0 && danger > 0.7) {
    const vOut = (p.vx * -toC.x + p.vy * -toC.y);
    if (vOut > 120 && rng.chance(0.6 + pers.skill * 0.3)) {
      api.input({ mx: toC.x, my: toC.y });
      api.act('dash');
      return;
    }
  }
  if (rng.chance(pers.chaos * 0.05)) { tx = rng.range(-1, 1); ty = rng.range(-1, 1); }
  const n = norm(tx, ty);
  api.input({ mx: n.x, my: n.y });
}

function norm(x, y) {
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l };
}
function dist2(a, b) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}
function angleDiff(a, b) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
