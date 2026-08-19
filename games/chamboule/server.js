// CHAMBOULE : simulation serveur. Chaque salve : phase « aim » (visée
// secrète, 10 s max, départ anticipé si tout le monde a choisi) puis phase
// « fly » (tous propulsés en même temps, collisions, chutes dans le vide).
// La plateforme rétrécit à chaque salve. Format asym « Le Quilleur ».

import { TAU, clamp } from '../../shared/const.js';
import meta from './meta.js';

const W = meta.arena.w;
const CX = W / 2, CY = W / 2;
const PLAT_R0 = 265;
const PLAT_MIN = 85;
const SHRINK_K = 0.9;      // par salve, à partir de la 2e
const P_R = 15;
const MAX_V = 520;
const FRICTION = 1.35;     // décélération exponentielle
const REST = 0.95;
const STILL_V = 9;         // en dessous : considéré à l'arrêt
const AIM_T = 10;
const FLY_MAX = 6;
const PRE_T = 1.5;
const END_T = 2.2;
const VOLLEY_MAX = 12;     // garde-fou anti-partie infinie
const HIT_WINDOW = 80;     // ticks d'attribution d'une éjection
const QUILL_R = 19;
const QUILL_MASS = 2.5;
const QUILL_POW = 1.35;
const QUILL_LIVES = 2;

const r1 = (v) => Math.round(v * 10) / 10;

export function createState(cfg) {
  const state = {
    cfg,
    rng: cfg.rng,
    asym: cfg.format.kind === 'asym',
    rounds: cfg.settings.rounds || 5,
    tick: 0,
    round: 0,
    volley: 0,
    scores: cfg.teams.map(() => 0),
    phase: 'pre',
    phaseT: PRE_T,
    flyT: 0,
    platR: PLAT_R0,
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
        x: 0, y: 0, vx: 0, vy: 0,
        alive: true, lives: 1,
        aim: null, chosen: false,
        lastHitBy: null, lastHitTick: 0,
        stats: { ejections: 0, falls: 0, selfFalls: 0, skipped: 0, aims: 0, powSum: 0 },
      };
    }
  });
  startRound(state);
  return state;
}

const isQuill = (state, p) => state.asym && p.team === 0;
const radius = (state, p) => (isQuill(state, p) ? QUILL_R : P_R);
const massOf = (state, p) => (isQuill(state, p) ? QUILL_MASS : 1);

function startRound(state) {
  state.round++;
  state.volley = 0;
  state.platR = PLAT_R0;
  state.phase = 'pre';
  state.phaseT = PRE_T;
  const pids = Object.keys(state.players);
  pids.forEach((pid, i) => {
    const p = state.players[pid];
    p.alive = true;
    p.lives = isQuill(state, p) ? QUILL_LIVES : 1;
    p.vx = p.vy = 0;
    p.aim = null;
    p.chosen = false;
    p.lastHitBy = null;
    if (isQuill(state, p)) {
      p.x = CX; p.y = CY;
    } else {
      const ang = (i / pids.length) * TAU;
      p.x = CX + Math.cos(ang) * PLAT_R0 * 0.64;
      p.y = CY + Math.sin(ang) * PLAT_R0 * 0.64;
    }
  });
}

function enterAim(state) {
  state.volley++;
  state.phase = 'aim';
  state.phaseT = AIM_T;
  for (const p of Object.values(state.players)) {
    p.aim = null;
    p.chosen = false;
  }
  state.evq.push({ e: 'aim', volley: state.volley });
}

function setAim(state, p, ax, ay, pow) {
  if (!Number.isFinite(ax) || !Number.isFinite(ay) || !Number.isFinite(pow)) return;
  const len = Math.hypot(ax, ay);
  if (len < 0.001) return;
  if (!p.chosen) state.evq.push({ e: 'lock', pid: p.pid });
  p.aim = { x: ax / len, y: ay / len, pow: clamp(pow, 0.05, 1) };
  p.chosen = true;
}

export function onInput(state, pid, d) {
  // Visée clavier : direction des flèches, puissance fixe.
  const p = state.players[pid];
  if (!p || !d || !p.alive || state.phase !== 'aim') return;
  const mx = Number(d.mx), my = Number(d.my);
  if (Math.hypot(mx || 0, my || 0) > 0.2) setAim(state, p, mx, my, 0.8);
}

export function onAction(state, pid, a, d) {
  const p = state.players[pid];
  if (!p || a !== 'aim' || !p.alive || state.phase !== 'aim' || !d) return;
  setAim(state, p, Number(d.ax), Number(d.ay), Number(d.pow));
}

export function tick(state, dt) {
  const evs = state.evq;
  state.evq = [];
  state.tick++;

  if (state.phase === 'pre') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) enterAim(state);
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

  if (state.phase === 'aim') {
    state.phaseT -= dt;
    const alive = Object.values(state.players).filter((p) => p.alive);
    const allChosen = alive.length > 0 && alive.every((p) => p.chosen);
    if (state.phaseT <= 0 || allChosen) {
      // Envol simultané !
      for (const p of alive) {
        if (p.aim) {
          const pow = p.aim.pow * (isQuill(state, p) ? QUILL_POW : 1);
          p.vx = p.aim.x * pow * MAX_V;
          p.vy = p.aim.y * pow * MAX_V;
          p.stats.aims++;
          p.stats.powSum += p.aim.pow;
        } else {
          p.stats.skipped++;
        }
        p.lastHitBy = null;
      }
      state.phase = 'fly';
      state.flyT = 0;
      evs.push({ e: 'go' });
    }
    return evs;
  }

  // phase 'fly'
  state.flyT += dt;
  const players = Object.values(state.players).filter((p) => p.alive);

  for (const p of players) {
    const f = Math.max(0, 1 - FRICTION * dt);
    p.vx *= f; p.vy *= f;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }

  // Collisions (impulsions élastiques, masses).
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const p = players[i], q = players[j];
      const pr = radius(state, p), qr = radius(state, q);
      const dx = q.x - p.x, dy = q.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d === 0 || d > pr + qr) continue;
      const nx = dx / d, ny = dy / d;
      const overlap = pr + qr - d;
      const pm = massOf(state, p), qm = massOf(state, q);
      p.x -= nx * overlap * (qm / (pm + qm));
      p.y -= ny * overlap * (qm / (pm + qm));
      q.x += nx * overlap * (pm / (pm + qm));
      q.y += ny * overlap * (pm / (pm + qm));
      const rvx = q.vx - p.vx, rvy = q.vy - p.vy;
      const rel = rvx * nx + rvy * ny;
      if (rel < 0) {
        const imp = (-(1 + REST) * rel) / (1 / pm + 1 / qm);
        p.vx -= (imp * nx) / pm;
        p.vy -= (imp * ny) / pm;
        q.vx += (imp * nx) / qm;
        q.vy += (imp * ny) / qm;
        const strength = Math.abs(rel);
        if (strength > 60) {
          p.lastHitBy = q.pid; p.lastHitTick = state.tick;
          q.lastHitBy = p.pid; q.lastHitTick = state.tick;
          evs.push({ e: 'hit', x: r1((p.x + q.x) / 2), y: r1((p.y + q.y) / 2), s: Math.min(1, strength / 500) });
        }
      }
    }
  }

  // Chutes dans le vide.
  for (const p of players) {
    if (Math.hypot(p.x - CX, p.y - CY) > state.platR + radius(state, p) * 0.35) {
      fall(state, p, evs);
    }
  }

  // Fin de salve : tout le monde à l'arrêt (ou temps max).
  const alive = Object.values(state.players).filter((p) => p.alive);
  const still = alive.every((p) => Math.hypot(p.vx, p.vy) < STILL_V);
  if (still || state.flyT > FLY_MAX) {
    for (const p of alive) { p.vx = 0; p.vy = 0; }
    endVolley(state, evs);
  }
  return evs;
}

function fall(state, p, evs) {
  const hitter = state.tick - p.lastHitTick < HIT_WINDOW ? state.players[p.lastHitBy] : null;
  if (hitter && hitter.team !== p.team) hitter.stats.ejections++;
  else p.stats.selfFalls++;
  p.stats.falls++;
  p.lives--;
  evs.push({ e: 'fall', pid: p.pid, x: r1(p.x), y: r1(p.y), out: p.lives <= 0 ? 1 : 0 });
  if (p.lives > 0) {
    // Le Quilleur revient au centre.
    p.x = CX; p.y = CY;
    p.vx = p.vy = 0;
    p.lastHitBy = null;
  } else {
    p.alive = false;
  }
}

function endVolley(state, evs) {
  const alive = Object.values(state.players).filter((p) => p.alive);
  const aliveTeams = new Set(alive.map((p) => p.team));
  if (aliveTeams.size <= 1 || state.volley >= VOLLEY_MAX) {
    const winner = aliveTeams.size === 1 ? [...aliveTeams][0] : null;
    if (winner !== null) state.scores[winner]++;
    evs.push({ e: 'roundEnd', team: winner, round: state.round });
    state.phase = 'end';
    state.phaseT = END_T;
    return;
  }
  // Salve suivante : la plateforme rétrécit, gare à ceux du bord.
  const before = state.platR;
  state.platR = Math.max(PLAT_MIN, state.platR * SHRINK_K);
  if (state.platR < before) evs.push({ e: 'shrink', r: r1(state.platR) });
  for (const p of alive) {
    if (Math.hypot(p.x - CX, p.y - CY) > state.platR + radius(state, p) * 0.35) {
      fall(state, p, evs);
    }
  }
  const left = Object.values(state.players).filter((p) => p.alive);
  const teamsLeft = new Set(left.map((p) => p.team));
  if (teamsLeft.size <= 1) {
    const winner = teamsLeft.size === 1 ? [...teamsLeft][0] : null;
    if (winner !== null) state.scores[winner]++;
    evs.push({ e: 'roundEnd', team: winner, round: state.round });
    state.phase = 'end';
    state.phaseT = END_T;
    return;
  }
  enterAim(state);
}

export function isOver(state) {
  return state.done;
}

export function view(state) {
  if (state._viewTick === state.tick) return state._view;
  const players = {};
  for (const [pid, p] of Object.entries(state.players)) {
    players[pid] = {
      x: r1(p.x), y: r1(p.y),
      al: p.alive ? 1 : 0,
      ch: p.chosen ? 1 : 0,
      lv: p.lives,
    };
  }
  state._view = {
    phase: state.phase,
    pt: r1(Math.max(0, state.phaseT)),
    volley: state.volley,
    round: state.round,
    rounds: state.rounds,
    scores: state.scores,
    asym: state.asym,
    platR: r1(state.platR),
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
  const boulet = top((s) => s.ejections);
  if (boulet.stats.ejections >= 2) titles.push({ pid: boulet.pid, emoji: '🎳', text: `Le Boulet humain : ${boulet.stats.ejections} éjections` });
  const gouffre = top((s) => s.selfFalls);
  if (gouffre.stats.selfFalls >= 2) titles.push({ pid: gouffre.pid, emoji: '🕳️', text: `L'appel du vide : ${gouffre.stats.selfFalls} plongeons solo` });
  const statue = top((s) => s.skipped);
  if (statue.stats.skipped >= 2) titles.push({ pid: statue.pid, emoji: '🗿', text: `La Statue : n'a pas visé ${statue.stats.skipped} fois` });
  const aimers = all.filter((p) => p.stats.aims >= 3);
  if (aimers.length) {
    const bourrin = aimers.slice().sort((a, b) => b.stats.powSum / b.stats.aims - a.stats.powSum / a.stats.aims)[0];
    if (bourrin.stats.powSum / bourrin.stats.aims > 0.82) {
      titles.push({ pid: bourrin.pid, emoji: '🐗', text: 'Bourrin certifié : toujours pleine puissance' });
    }
    const agneau = aimers.slice().sort((a, b) => a.stats.powSum / a.stats.aims - b.stats.powSum / b.stats.aims)[0];
    if (agneau.stats.powSum / agneau.stats.aims < 0.4 && agneau.pid !== bourrin.pid) {
      titles.push({ pid: agneau.pid, emoji: '🐑', text: 'Doux comme un agneau, jamais fort' });
    }
  }
  if (!titles.length) {
    const tank = top((s) => -s.falls);
    titles.push({ pid: tank.pid, emoji: '🧱', text: 'Le plus dur à faire tomber' });
  }
  return { ranking, winners, titles };
}

// ── Bot : vise un ennemi (de préférence près du bord), dose la puissance ──

export function botAct(state, pid, mind, api) {
  const p = state.players[pid];
  if (!p || !p.alive || state.phase !== 'aim') return;
  const { p: pers, rng, mem } = mind;

  // Une visée par salve, après un délai de réflexion crédible.
  const key = `${state.round}-${state.volley}`;
  if (mem.aimedKey === key) return;
  if (mem.delayKey !== key) {
    mem.delayKey = key;
    mem.delay = 1 + rng.next() * 5 * pers.pace;
  }
  if (AIM_T - state.phaseT < mem.delay) return;
  mem.aimedKey = key;

  const quill = isQuill(state, p);
  const myEdge = state.platR - Math.hypot(p.x - CX, p.y - CY);

  // Coup de folie ?
  if (rng.chance(pers.chaos * 0.15)) {
    const a = rng.range(0, TAU);
    api.act('aim', { ax: Math.cos(a), ay: Math.sin(a), pow: 1 });
    return;
  }

  // Trop près du bord : on se replace vers le centre.
  if (myEdge < 55 && rng.chance(0.75)) {
    const d = Math.hypot(CX - p.x, CY - p.y) || 1;
    const pow = clamp((d * 0.6 * FRICTION) / MAX_V, 0.1, 0.6);
    api.act('aim', { ax: (CX - p.x) / d, ay: (CY - p.y) / d, pow: jitterPow(pow, pers, rng) });
    return;
  }

  // Cible : ennemi le plus intéressant (proche + déjà au bord = facile à sortir).
  let target = null, bestScore = -Infinity;
  for (const q of Object.values(state.players)) {
    if (!q.alive || q.team === p.team) continue;
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    const qEdge = state.platR - Math.hypot(q.x - CX, q.y - CY);
    const score = -d * 0.6 - qEdge * pers.aggro;
    if (score > bestScore) { bestScore = score; target = q; }
  }
  if (!target) return;

  const dx = target.x - p.x, dy = target.y - p.y;
  const d = Math.hypot(dx, dy) || 1;
  // Puissance pour arriver un peu au-delà de la cible (portée ≈ v0/λ).
  let pow = clamp(((d + 50) * FRICTION) / (MAX_V * (quill ? QUILL_POW : 1)), 0.15, 1);
  if (quill) pow = Math.min(1, pow * 1.3);
  // Erreur d'angle selon la précision.
  const err = (1 - pers.skill) * 0.45;
  const ang = Math.atan2(dy, dx) + rng.range(-err, err);
  api.act('aim', { ax: Math.cos(ang), ay: Math.sin(ang), pow: jitterPow(pow, pers, rng) });
}

function jitterPow(pow, pers, rng) {
  return clamp(pow * (1 + rng.range(-0.2, 0.2) * (1 - pers.skill)), 0.05, 1);
}
