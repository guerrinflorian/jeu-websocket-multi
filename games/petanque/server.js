// PÉTANQUE : simulation serveur. Tour par tour selon la vraie règle : le
// camp qui n'a pas le point lance. Visée libre (12 s, lancer auto au
// chrono), physique de roulement 20 Hz (friction, carambolages, cochonnet
// déplaçable), décompte de mène : 1 point par boule mieux placée que la
// meilleure boule adverse. Asym « Le Tireur » : 4 boules, bras renforcé.

import { clamp } from '../../shared/const.js';
import meta from './meta.js';

const [FX0, FY0, FX1, FY1] = meta.geo.field;
const [CIRC_X, CIRC_Y] = meta.geo.circle;
const BALL_R = meta.geo.ballR;
const JACK_R = meta.geo.jackR;

const PRE_T = 1.1;
const AIM_T = 10;        // chrono de visée : borné en temps absolu, jamais prolongeable
const COUNT_T = 2.4;
const END_T = 1.6;
const ROLL_MAX = 3.2;    // une boule ne roule jamais plus longtemps
const FRICTION = 1.35;   // décélération exponentielle (gravier)
const SLOW_V = 130;      // sous cette vitesse, le gravier freine bien plus fort
const SLOW_DAMP = 3.2;
const MAX_V = 1150;
const SUBSTEPS = 4;      // sous-pas de simulation : aucune boule ne traverse
const TIREUR_POW = 1.25; // bras du Tireur (asym)
const REST = 0.78;
const JACK_MASS = 0.3;
const STILL_V = 14;

const r1 = (v) => Math.round(v * 10) / 10;

// Répartition des boules : FFA 2-3 joueurs : 3 chacun ; FFA 4+ : 2 chacun ;
// équipes : 6 par camp réparties ; asym : 4 pour le Tireur, 8 pour la foule.
function allocate(cfg) {
  const stock = {};
  const teams = cfg.teams;
  if (cfg.format.kind === 'asym') {
    for (const pid of teams[0]) stock[pid] = 4;
    for (const pid of teams[1]) stock[pid] = 0;
    for (let i = 0; i < 8; i++) stock[teams[1][i % teams[1].length]]++;
  } else if (cfg.format.kind === 'teams') {
    for (const team of teams) {
      for (const pid of team) stock[pid] = 0;
      for (let i = 0; i < 6; i++) stock[team[i % team.length]]++;
    }
  } else {
    const per = teams.length <= 3 ? 3 : 2;
    for (const team of teams) for (const pid of team) stock[pid] = per;
  }
  return stock;
}

export function createState(cfg) {
  const asym = cfg.format.kind === 'asym';
  const state = {
    cfg,
    rng: cfg.rng,
    asym,
    solo: asym ? cfg.teams[0][0] : null,
    camps: cfg.teams,
    campOf: {},
    baseStock: allocate(cfg),
    stock: {},
    cursors: cfg.teams.map(() => 0),
    scores: cfg.teams.map(() => 0),
    menes: cfg.settings.menes || 4,
    mene: 0,
    firstCamp: 0,
    rotFrom: 0,
    phase: 'pre',
    phaseT: PRE_T,
    meneT: 0,
    jack: null,
    boules: [],
    nextId: 1,
    thrower: null,
    aim: null,
    aimed: false,
    rollT: 0,
    aimDl: 0,            // échéance absolue de visée (simT)
    rollDl: 0,           // échéance absolue de roulement (simT)
    meneThrows: 0,
    watch: null,
    throwCount: 0,
    last: null,
    players: {},
    simT: 0,
    done: false,
    evq: [],
    tick: 0, _viewTick: -1, _view: null,
  };
  cfg.teams.forEach((team, t) => {
    for (const pid of team) {
      state.campOf[pid] = t;
      state.players[pid] = {
        stats: { thrown: 0, autos: 0, hits: 0, carreaux: 0, biberons: 0, outs: 0, sumDist: 0, distN: 0 },
      };
    }
  });
  const totalBoules = Object.values(state.baseStock).reduce((a, n) => a + n, 0);
  // Garde-fous dimensionnés sur la mène : généreux pour de vrais joueurs,
  // mais une mène ne peut jamais durer indéfiniment.
  state.totalBoules = totalBoules;
  state.meneMax = 30 + totalBoules * 14;
  state.gameMax = 60 + state.menes * state.meneMax;
  startMene(state);
  return state;
}

function startMene(state) {
  state.mene++;
  state.stock = { ...state.baseStock };
  state.cursors = state.camps.map(() => 0);
  state.boules = [];
  state.watch = null;
  state.thrower = null;
  state.aim = null;
  state.aimed = false;
  state.meneT = 0;
  state.meneThrows = 0;
  state.rotFrom = state.firstCamp;
  state.jack = {
    x: state.rng.range(FX0 + 110, FX1 - 110),
    y: state.rng.range(FY0 + 90, FY0 + 260),
    vx: 0, vy: 0,
  };
  state.phase = 'pre';
  state.phaseT = PRE_T;
  state.evq.push({ e: 'jack', x: r1(state.jack.x), y: r1(state.jack.y), n: state.mene });
}

const campStock = (state, t) => state.camps[t].reduce((s, pid) => s + (state.stock[pid] || 0), 0);

// Meilleure distance au cochonnet du camp t (1e9 si aucune boule posée).
function campBestD(state, t) {
  let best = 1e9;
  for (const b of state.boules) {
    if (b.team !== t) continue;
    const d = Math.hypot(b.x - state.jack.x, b.y - state.jack.y);
    if (d < best) best = d;
  }
  return best;
}

// Le camp le plus mal placé (parmi ceux qui ont des boules) joue : c'est la
// vraie règle, généralisée à N camps. À égalité : ordre de rotation.
function pickCamp(state) {
  const n = state.camps.length;
  let best = -1, bestD = -1, bestRot = Infinity;
  for (let t = 0; t < n; t++) {
    if (campStock(state, t) <= 0) continue;
    const d = campBestD(state, t);
    const rot = (t - state.rotFrom + n * 2) % n;
    if (d > bestD + 1e-9 || (Math.abs(d - bestD) <= 1e-9 && rot < bestRot)) {
      best = t; bestD = d; bestRot = rot;
    }
  }
  if (best >= 0) state.rotFrom = (best + 1) % n;
  return best;
}

function nextTurn(state) {
  const t = pickCamp(state);
  if (t < 0) { scoreMene(state); return; }
  const team = state.camps[t];
  let pid = null;
  for (let k = 0; k < team.length; k++) {
    const cand = team[(state.cursors[t] + k) % team.length];
    if (state.stock[cand] > 0) {
      pid = cand;
      state.cursors[t] = (state.cursors[t] + k + 1) % team.length;
      break;
    }
  }
  if (!pid) { scoreMene(state); return; }
  state.thrower = pid;
  state.aim = null;
  state.aimed = false;
  state.phase = 'aim';
  state.phaseT = AIM_T;
  state.aimDl = state.simT + AIM_T;   // aucun input ne peut repousser ce délai
  state.evq.push({ e: 'turn', pid });
}

// Puissance idéale pour parcourir la distance d (portée = v0 / friction).
function idealPow(state, d, pid) {
  const mult = state.asym && pid === state.solo ? TIREUR_POW : 1;
  return clamp((d * FRICTION) / (MAX_V * mult), 0.12, 1);
}

// Visée automatique (chrono écoulé) : vers le cochonnet, imparfaite.
function autoAim(state) {
  const dx = state.jack.x - CIRC_X, dy = state.jack.y - CIRC_Y;
  const d = Math.hypot(dx, dy) || 1;
  const solo = state.asym && state.thrower === state.solo;
  const errA = solo ? 0.05 : 0.09;
  const ang = Math.atan2(dy, dx) + state.rng.range(-errA, errA);
  const pow = idealPow(state, d, state.thrower) * state.rng.range(0.88, 1.08);
  return { x: Math.cos(ang), y: Math.sin(ang), pow: clamp(pow, 0.12, 1) };
}

function setAim(state, pid, ax, ay, pow) {
  if (state.phase !== 'aim' || pid !== state.thrower) return;
  ax = Number(ax); ay = Number(ay); pow = Number(pow);
  if (!Number.isFinite(ax) || !Number.isFinite(ay) || !Number.isFinite(pow)) return;
  const len = Math.hypot(ax, ay);
  if (len < 0.001) return;
  if (!state.aimed) state.evq.push({ e: 'lock', pid });
  state.aim = { x: ax / len, y: ay / len, pow: clamp(pow, 0.08, 1) };
  state.aimed = true;
}

function throwBoule(state) {
  const pid = state.thrower;
  const p = state.players[pid];
  let aim = state.aim;
  if (!aim) { aim = autoAim(state); p.stats.autos++; }
  state.throwCount++;
  const mult = state.asym && pid === state.solo ? TIREUR_POW : 1;
  const v = aim.pow * MAX_V * mult;
  const b = {
    id: state.nextId++,
    pid,
    team: state.campOf[pid],
    x: CIRC_X + state.rng.range(-3, 3),
    y: CIRC_Y + state.rng.range(-3, 3),
    vx: aim.x * v,
    vy: aim.y * v,
  };
  state.boules.push(b);
  state.stock[pid]--;
  p.stats.thrown++;
  state.watch = { bid: b.id, pid, hit: null, hitSet: new Set() };
  state.phase = 'roll';
  state.rollT = 0;
  state.rollDl = state.simT + ROLL_MAX;
  state.meneThrows++;
  state.evq.push({ e: 'throw', pid });
}

export function onInput(state, pid, d) {
  if (!d || state.done || !state.jack) return;
  // Clavier : direction des touches, puissance auto pour le cochonnet.
  const mx = Number(d.mx), my = Number(d.my);
  if (Number.isFinite(mx) && Number.isFinite(my) && Math.hypot(mx, my) > 0.2) {
    const dist = Math.hypot(state.jack.x - CIRC_X, state.jack.y - CIRC_Y);
    setAim(state, pid, mx, my, idealPow(state, dist, pid));
    return;
  }
  // Fallback tap brut : viser ce point du terrain.
  const tx = Number(d.tx), ty = Number(d.ty);
  if (Number.isFinite(tx) && Number.isFinite(ty)) {
    const dx = clamp(tx, FX0, FX1) - CIRC_X;
    const dy = clamp(ty, FY0, FY1) - CIRC_Y;
    const dist = Math.hypot(dx, dy);
    if (dist > 4) setAim(state, pid, dx, dy, idealPow(state, dist, pid));
  }
}

export function onAction(state, pid, a, d) {
  if (state.done) return;
  if (a === 'aim' && d) {
    setAim(state, pid, d.ax, d.ay, d.pow);
  } else if (a === 'throw') {
    if (state.phase === 'aim' && pid === state.thrower) throwBoule(state);
  }
}

function collide(state, a, b, ra, rb, ma, mb, isJack = false) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  if (d === 0 || d > ra + rb) return;
  const nx = dx / d, ny = dy / d;
  const overlap = ra + rb - d;
  a.x -= nx * overlap * (mb / (ma + mb));
  a.y -= ny * overlap * (mb / (ma + mb));
  b.x += nx * overlap * (ma / (ma + mb));
  b.y += ny * overlap * (ma / (ma + mb));
  const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
  const rel = rvx * nx + rvy * ny;
  if (rel >= 0) return;
  const imp = (-(1 + REST) * rel) / (1 / ma + 1 / mb);
  a.vx -= (imp * nx) / ma;
  a.vy -= (imp * ny) / ma;
  b.vx += (imp * nx) / mb;
  b.vy += (imp * ny) / mb;
  const strength = Math.abs(rel);
  if (strength > 90) {
    state.evq.push({ e: 'hit', x: r1((a.x + b.x) / 2), y: r1((a.y + b.y) / 2), s: Math.min(1, strength / 700), j: isJack ? 1 : 0 });
  }
  // Suivi des touches et du carreau pour la boule fraîchement lancée.
  const w = state.watch;
  if (!w || isJack) return;
  const striker = a.id === w.bid ? a : b.id === w.bid ? b : null;
  const other = striker === a ? b : striker === b ? a : null;
  if (!striker || !other) return;
  if (other.team !== striker.team && strength > 150 && !w.hitSet.has(other.id)) {
    w.hitSet.add(other.id);
    state.players[w.pid].stats.hits++;
  }
  if (!w.hit && other.team !== striker.team && strength > 250) {
    w.hit = { tid: other.id, x: other.x, y: other.y };
  }
}

function physics(state, dt) {
  // Sous-pas : à pleine puissance une boule parcourt 57 px par tick, soit
  // plus de deux diamètres. Sans sous-pas, elle traverserait ses victimes.
  const h = dt / SUBSTEPS;
  for (let i = 0; i < SUBSTEPS; i++) physicsStep(state, h);
}

// Roulement d'un corps : le gravier freine, et bien plus fort en fin de
// course (c'est ce qui fait qu'une boule s'arrête net, pas au ralenti).
function roll(o, dt) {
  const sp = Math.hypot(o.vx, o.vy);
  const fr = FRICTION + (sp < SLOW_V ? SLOW_DAMP : 0);
  const f = Math.max(0, 1 - fr * dt);
  o.vx *= f; o.vy *= f;
  o.x += o.vx * dt;
  o.y += o.vy * dt;
}

function physicsStep(state, dt) {
  const ents = state.boules;
  for (const b of ents) roll(b, dt);
  const j = state.jack;
  roll(j, dt);

  for (let i = 0; i < ents.length; i++) {
    for (let k = i + 1; k < ents.length; k++) {
      collide(state, ents[i], ents[k], BALL_R, BALL_R, 1, 1);
    }
  }
  for (const b of ents) collide(state, b, j, BALL_R, JACK_R, 1, JACK_MASS, true);

  // Le cochonnet rebondit sur les bordures en bois (jamais de mène annulée).
  if (j.x < FX0 + JACK_R) { j.x = FX0 + JACK_R; j.vx = Math.abs(j.vx) * 0.5; }
  if (j.x > FX1 - JACK_R) { j.x = FX1 - JACK_R; j.vx = -Math.abs(j.vx) * 0.5; }
  if (j.y < FY0 + JACK_R) { j.y = FY0 + JACK_R; j.vy = Math.abs(j.vy) * 0.5; }
  if (j.y > FY1 - JACK_R) { j.y = FY1 - JACK_R; j.vy = -Math.abs(j.vy) * 0.5; }

  // Les boules qui sortent du terrain sont mortes.
  for (let i = ents.length - 1; i >= 0; i--) {
    const b = ents[i];
    if (b.x < FX0 - 2 || b.x > FX1 + 2 || b.y < FY0 - 2 || b.y > FY1 + 2) {
      state.players[b.pid].stats.outs++;
      state.evq.push({ e: 'out', pid: b.pid, x: r1(clamp(b.x, FX0, FX1)), y: r1(clamp(b.y, FY0, FY1)) });
      ents.splice(i, 1);
    }
  }
}

// Fin de roulement : biberon (boule collée au petit) et carreau (la cible a
// giclé, le tireur a pris sa place).
function settleThrow(state) {
  const w = state.watch;
  state.watch = null;
  if (!w) return;
  const striker = state.boules.find((b) => b.id === w.bid);
  if (striker) {
    const dj = Math.hypot(striker.x - state.jack.x, striker.y - state.jack.y);
    if (dj < BALL_R + JACK_R + 4) {
      state.players[w.pid].stats.biberons++;
      state.evq.push({ e: 'biberon', pid: w.pid, x: r1(striker.x), y: r1(striker.y) });
    }
  }
  if (w.hit) {
    const target = state.boules.find((b) => b.id === w.hit.tid);
    const gone = !target || Math.hypot(target.x - w.hit.x, target.y - w.hit.y) > 90;
    const took = striker && Math.hypot(striker.x - w.hit.x, striker.y - w.hit.y) < 55;
    if (gone && took) {
      state.players[w.pid].stats.carreaux++;
      state.evq.push({ e: 'carreau', pid: w.pid, x: r1(striker.x), y: r1(striker.y) });
    }
  }
}

function scoreMene(state) {
  state.thrower = null;
  const dists = state.camps.map((_, t) =>
    state.boules.filter((b) => b.team === t)
      .map((b) => Math.hypot(b.x - state.jack.x, b.y - state.jack.y))
      .sort((a, b) => a - b));
  let bestT = -1, bestD = Infinity;
  dists.forEach((ds, t) => {
    if (ds.length && ds[0] < bestD) { bestD = ds[0]; bestT = t; }
  });
  let pts = 0;
  if (bestT >= 0) {
    let enemyBest = Infinity;
    dists.forEach((ds, t) => {
      if (t !== bestT && ds.length) enemyBest = Math.min(enemyBest, ds[0]);
    });
    pts = Number.isFinite(enemyBest)
      ? dists[bestT].filter((d) => d < enemyBest).length
      : dists[bestT].length;
    pts = Math.max(1, pts);
    state.scores[bestT] += pts;
    state.firstCamp = bestT;
  }
  for (const b of state.boules) {
    const st = state.players[b.pid].stats;
    st.sumDist += Math.hypot(b.x - state.jack.x, b.y - state.jack.y);
    st.distN++;
  }
  state.last = { team: bestT, pts };
  state.evq.push({ e: 'mene', team: bestT, pts, n: state.mene });
  state.phase = 'count';
  state.phaseT = COUNT_T;
}

// Garde-fou : mène trop longue : on vide les stocks et on compte.
function forceEndMene(state) {
  for (const pid of Object.keys(state.stock)) state.stock[pid] = 0;
  for (const b of state.boules) { b.vx = 0; b.vy = 0; }
  state.jack.vx = 0; state.jack.vy = 0;
  scoreMene(state);
}

export function tick(state, dt) {
  const evs = state.evq;
  state.evq = [];
  state.tick++;
  state.simT += dt;
  if (state.done) return evs;

  state.meneT += dt;
  // Une mène s'enlise (boule folle, camp bloqué) : on tranche et on compte.
  const meneStuck = state.meneT > state.meneMax
    || state.meneThrows > state.totalBoules + 2;
  if (state.simT > state.gameMax && state.phase !== 'end') {
    state.phase = 'end';
    state.phaseT = 0.5;
  }

  if (state.phase === 'pre') {
    state.phaseT -= dt;
    if (meneStuck) forceEndMene(state);
    else if (state.phaseT <= 0) nextTurn(state);
  } else if (state.phase === 'aim') {
    state.phaseT = Math.max(0, state.aimDl - state.simT);
    if (meneStuck) forceEndMene(state);
    else if (state.simT >= state.aimDl) throwBoule(state);
  } else if (state.phase === 'roll') {
    state.rollT += dt;
    physics(state, dt);
    const still = state.boules.every((b) => Math.hypot(b.vx, b.vy) < STILL_V)
      && Math.hypot(state.jack.vx, state.jack.vy) < STILL_V;
    if (still || state.simT >= state.rollDl || meneStuck) {
      for (const b of state.boules) { b.vx = 0; b.vy = 0; }
      state.jack.vx = 0; state.jack.vy = 0;
      settleThrow(state);
      if (meneStuck) forceEndMene(state);
      else nextTurn(state);
    }
  } else if (state.phase === 'count') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) {
      if (state.mene >= state.menes) { state.phase = 'end'; state.phaseT = END_T; }
      else startMene(state);
    }
  } else if (state.phase === 'end') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) state.done = true;
  }

  if (state.simT > state.gameMax + 6) state.done = true;

  // Les actions traitées pendant ce tick ont pu pousser des événements.
  if (state.evq.length) { evs.push(...state.evq); state.evq = []; }
  return evs;
}

export function isOver(state) {
  return state.done;
}

export function view(state) {
  if (state._viewTick === state.tick) return state._view;
  state._view = {
    phase: state.phase,
    tl: r1(Math.max(0, state.phaseT)),
    mene: state.mene,
    menes: state.menes,
    scores: state.scores,
    jack: state.jack ? { x: r1(state.jack.x), y: r1(state.jack.y) } : null,
    boules: state.boules.map((b) => ({ id: b.id, pid: b.pid, tm: b.team, x: r1(b.x), y: r1(b.y) })),
    thrower: state.thrower,
    aimed: state.aimed ? 1 : 0,
    stock: { ...state.stock },
    last: state.last,
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

  const perso = (pid) => {
    const s = state.players[pid].stats;
    return s.carreaux * 3 + s.biberons * 2 + s.hits - s.outs;
  };
  const ranking = cfg.teams.flat()
    .map((pid) => ({ pid, score: state.scores[state.campOf[pid]], tie: perso(pid) }))
    .sort((a, b) => b.score - a.score || b.tie - a.tie)
    .map(({ pid, score }) => ({ pid, score, label: `${score} pt${score > 1 ? 's' : ''}` }));

  const titles = [];
  const all = cfg.teams.flat().map((pid) => ({ pid, s: state.players[pid].stats }));
  const top = (fn) => all.slice().sort((a, b) => fn(b.s) - fn(a.s))[0];
  const carreau = top((s) => s.carreaux);
  if (carreau.s.carreaux >= 1) titles.push({ pid: carreau.pid, emoji: '🎯', text: `Le Carreau d'or : ${carreau.s.carreaux} boule(s) dégommée(s) sur place` });
  const bib = top((s) => s.biberons);
  if (bib.s.biberons >= 1) titles.push({ pid: bib.pid, emoji: '🍼', text: `Biberon : ${bib.s.biberons} boule(s) collée(s) au cochonnet` });
  const dehors = top((s) => s.outs);
  if (dehors.s.outs >= 2) titles.push({ pid: dehors.pid, emoji: '🚀', text: `Expédition lointaine : ${dehors.s.outs} boules hors du terrain` });
  const dodo = top((s) => s.autos);
  if (dodo.s.autos >= 2) titles.push({ pid: dodo.pid, emoji: '😴', text: `Endormi dans le cercle : ${dodo.s.autos} lancers au chrono` });
  const reguliers = all.filter((x) => x.s.distN >= 2);
  if (reguliers.length) {
    const orfevre = reguliers.slice().sort((a, b) => a.s.sumDist / a.s.distN - b.s.sumDist / b.s.distN)[0];
    if (orfevre.s.sumDist / orfevre.s.distN < 70) {
      titles.push({ pid: orfevre.pid, emoji: '📏', text: 'Main d\'orfèvre : toujours collé au petit' });
    }
  }
  // La Fanny : un camp resté à zéro, moquerie traditionnelle (duels et
  // équipes seulement : à 8 camps, un zéro n'a rien d'infamant).
  if (best > 0 && cfg.teams.length > 1 && cfg.teams.length <= 4) {
    const zeroT = state.scores.findIndex((s) => s === 0);
    if (zeroT >= 0) titles.push({ pid: cfg.teams[zeroT][0], emoji: '🍑', text: 'Fanny ! Zéro point, la bise traditionnelle' });
  }
  if (!titles.length) {
    titles.push({ pid: ranking[0].pid, emoji: '🏆', text: 'Le bras du boulodrome' });
  }
  return { ranking, winners, titles };
}

// ── Bot : pointe vers le cochonnet, tire la boule qui tient le point ────

export function botAct(state, pid, mind, api) {
  if (state.done || state.phase !== 'aim' || state.thrower !== pid) return;
  const { p: pers, rng, mem } = mind;
  const key = `t${state.throwCount}`;
  if (mem.k !== key && mem.k !== `${key}-done`) {
    mem.k = key;
    mem.delay = 0.35 + rng.next() * 1.3 * pers.pace;
    mem.at = state.simT;
  }
  if (mem.k === `${key}-done` || state.simT - mem.at < mem.delay) return;
  mem.k = `${key}-done`;

  const solo = state.asym && pid === state.solo;
  const jack = state.jack;
  const myTeam = state.campOf[pid];

  // Coup de sang : pleine puissance vers le fond, advienne que pourra.
  if (rng.chance(pers.chaos * 0.08)) {
    const ang = -Math.PI / 2 + rng.range(-0.5, 0.5);
    api.act('aim', { ax: Math.cos(ang), ay: Math.sin(ang), pow: 1 });
    api.act('throw');
    return;
  }

  // La boule qui tient le point est-elle adverse et proche ? Tenter le tir.
  let holder = null, holderD = Infinity;
  for (const b of state.boules) {
    const d = Math.hypot(b.x - jack.x, b.y - jack.y);
    if (d < holderD) { holderD = d; holder = b; }
  }
  const wantShoot = holder && holder.team !== myTeam && holderD < 60
    && rng.chance((solo ? 0.75 : pers.aggro * 0.55) + pers.skill * 0.15);

  let tx, ty, powK;
  if (wantShoot) {
    tx = holder.x; ty = holder.y; powK = 1.35;
  } else {
    const off = 12 + (1 - pers.skill) * 26;
    tx = jack.x + rng.range(-off, off);
    ty = jack.y + rng.range(-off * 0.4, off);
    powK = 1;
  }
  const dx = tx - CIRC_X, dy = ty - CIRC_Y;
  const d = Math.hypot(dx, dy) || 1;
  const err = (1 - pers.skill) * (solo ? 0.03 : 0.06);
  const ang = Math.atan2(dy, dx) + rng.range(-err, err);
  const pow = clamp(idealPow(state, d, pid) * powK * rng.range(0.92, 1.08), 0.12, 1);
  api.act('aim', { ax: Math.cos(ang), ay: Math.sin(ang), pow });
  api.act('throw');
}
