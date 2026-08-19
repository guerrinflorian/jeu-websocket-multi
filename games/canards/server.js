// CANARDS : simulation serveur. Pêche aux canards temps réel : courant en
// boucle, valeurs cachées (view par joueur), portage vers le comptoir,
// splash qui fait lâcher, canard doré, bombes. Asym « Le Héron » qui gobe.

import { TAU, clamp, dist } from '../../shared/const.js';
import meta from './meta.js';

const W = meta.arena.w, H = meta.arena.h;
const CX = W / 2, CY = 315;
const RX = 320, RY = 180;      // ellipse médiane du courant
const LANE = 40;               // demi-largeur de la voie d'eau
const SPEED = 235;
const CARRY_SLOW = 0.78;
const HERON_SPEED = 1.12;
const CATCH_R = 38;
const BANK_R = 52;
const SPLASH_R = 105;
const SPLASH_CD = 4;
const DIP_T = 0.32;
const MISS_STUN = 0.7;
const BOMB_STUN = 1.5;
const GOLD_EVERY = 22;
const GOLD_LIFE = 12;
const RUSH_AT = 15;            // rush final : courant fou
const END_T = 2.0;

const COUNTER_SPOTS = [
  [96, 92], [W - 96, 92], [96, H - 60], [W - 96, H - 60],
  [CX, 66], [CX, H - 46], [56, CY], [W - 56, CY],
];

const r1 = (v) => Math.round(v * 10) / 10;

function duckPos(d) {
  const k = 1 + d.lane / 300;
  return { x: CX + Math.cos(d.a) * RX * k, y: CY + Math.sin(d.a) * RY * k };
}

export function createState(cfg) {
  const asym = cfg.format.kind === 'asym';
  const heron = asym ? cfg.teams[0][0] : null;
  const state = {
    cfg,
    rng: cfg.rng,
    asym, heron,
    pids: cfg.teams.flat(),
    teamOf: {},
    players: {},
    ducks: [],
    duckSeq: 1,
    flow: 0.3,               // vitesse angulaire du courant
    goldTimer: 8,
    duration: cfg.settings.duration || 120,
    t: 0,
    rush: false,
    phase: 'play',
    endT: END_T,
    done: false,
    evq: [],
    tick: 0, _viewTick: -1, _base: null, _views: null,
  };
  cfg.teams.forEach((team, t) => {
    for (const pid of team) {
      state.teamOf[pid] = t;
      const ang = (state.pids.indexOf(pid) / Math.max(1, state.pids.length)) * TAU;
      state.players[pid] = {
        pid,
        x: CX + Math.cos(ang) * RX * 1.35,
        y: clamp(CY + Math.sin(ang) * RY * 1.5, 60, H - 50),
        mx: 0, my: 0,
        st: 0, dipT: 0, splashCd: 0,
        carry: null,           // { val, gold }
        score: 0,
        stats: { caught: 0, banked: 0, missed: 0, splashes: 0, splashHits: 0, bombs: 0, golds: 0, rejected: 0 },
      };
    }
  });
  const n = state.pids.length * 2 + 6;
  for (let i = 0; i < n; i++) spawnDuck(state, true);
  return state;
}

function duckValue(rng) {
  const r = rng.next();
  if (r < 0.4) return 1;
  if (r < 0.68) return 2;
  if (r < 0.84) return 3;
  if (r < 0.93) return 5;
  return -1; // bombe
}

function spawnDuck(state, anywhere = false) {
  state.ducks.push({
    id: state.duckSeq++,
    a: anywhere ? state.rng.range(0, TAU) : state.rng.range(0, TAU),
    lane: state.rng.range(-LANE, LANE),
    spd: state.rng.range(0.85, 1.2),
    val: duckValue(state.rng),
    gold: 0,
    bob: state.rng.range(0, TAU),
  });
}

function counterOf(state, team) {
  const [x, y] = COUNTER_SPOTS[team % COUNTER_SPOTS.length];
  return { x, y };
}

function dropDuck(state, p, reveal, evName) {
  if (!p.carry) return;
  const d = {
    id: state.duckSeq++,
    a: Math.atan2((p.y - CY) / RY, (p.x - CX) / RX),
    lane: clamp((dist(p.x, p.y, CX, CY) - RX) * 0.4, -LANE, LANE),
    spd: state.rng.range(0.85, 1.2),
    val: p.carry.val,
    gold: p.carry.gold,
    bob: state.rng.range(0, TAU),
  };
  state.ducks.push(d);
  state.evq.push({ e: evName, pid: p.pid, val: reveal ? p.carry.val : undefined, x: r1(p.x), y: r1(p.y) });
  p.carry = null;
}

export function onInput(state, pid, d) {
  const p = state.players[pid];
  if (!p || !d) return;
  const mx = Number(d.mx), my = Number(d.my);
  if (!Number.isFinite(mx) || !Number.isFinite(my)) return;
  const len = Math.hypot(mx, my);
  const k = len > 1 ? 1 / len : 1;
  p.mx = mx * k;
  p.my = my * k;
}

export function onAction(state, pid, a) {
  const p = state.players[pid];
  if (!p || state.done || state.phase !== 'play') return;
  if (a === 'dip') {
    if (p.st > 0 || p.dipT > 0) return;
    if (p.carry) {
      // Rejeter le canard porté (valeur révélée : la honte ou le bluff).
      p.stats.rejected++;
      dropDuck(state, p, true, 'reject');
      return;
    }
    p.dipT = DIP_T;
    state.evq.push({ e: 'dip', pid, x: r1(p.x), y: r1(p.y) });
  } else if (a === 'splash') {
    if (p.st > 0 || p.splashCd > 0) return;
    p.splashCd = SPLASH_CD;
    p.stats.splashes++;
    state.evq.push({ e: 'splash', pid, x: r1(p.x), y: r1(p.y) });
    for (const q of Object.values(state.players)) {
      if (q.pid === p.pid) continue;
      if (dist(q.x, q.y, p.x, p.y) > SPLASH_R) continue;
      if (q.carry) {
        p.stats.splashHits++;
        dropDuck(state, q, true, 'drop');
      }
      q.st = Math.max(q.st, 0.5);
    }
    for (const d of state.ducks) {
      const pos = duckPos(d);
      if (dist(pos.x, pos.y, p.x, p.y) < SPLASH_R * 1.3) {
        d.lane = clamp(d.lane + state.rng.range(-25, 25), -LANE, LANE);
        d.a += state.rng.range(-0.15, 0.15);
      }
    }
  }
}

function resolveDip(state, p) {
  let best = null, bestD = CATCH_R;
  for (const d of state.ducks) {
    const pos = duckPos(d);
    const dd = dist(pos.x, pos.y, p.x, p.y);
    if (dd < bestD) { bestD = dd; best = d; }
  }
  if (!best) {
    p.st = MISS_STUN;
    p.stats.missed++;
    state.evq.push({ e: 'miss', pid: p.pid, x: r1(p.x), y: r1(p.y) });
    return;
  }
  state.ducks.splice(state.ducks.indexOf(best), 1);
  if (best.val < 0) {
    p.st = BOMB_STUN;
    p.score = Math.max(0, p.score - 2);
    p.stats.bombs++;
    state.evq.push({ e: 'bomb', pid: p.pid, x: r1(p.x), y: r1(p.y) });
    spawnDuck(state);
    return;
  }
  const isHeron = p.pid === state.heron;
  if (isHeron) {
    p.score += best.val;
    if (best.gold) p.stats.golds++;
    p.stats.caught++;
    p.stats.banked++;
    state.evq.push({ e: 'eat', pid: p.pid, val: best.val, x: r1(p.x), y: r1(p.y) });
    spawnDuck(state);
    return;
  }
  p.carry = { val: best.val, gold: best.gold };
  p.stats.caught++;
  if (best.gold) p.stats.golds++;
  state.evq.push({ e: 'catch', pid: p.pid, gold: best.gold ? 1 : 0 });
  spawnDuck(state);
}

export function tick(state, dt) {
  const evs = state.evq;
  state.evq = [];
  state.tick++;
  if (state.done) return evs;

  if (state.phase === 'end') {
    state.endT -= dt;
    if (state.endT <= 0) state.done = true;
    return evs;
  }

  state.t += dt;
  const left = state.duration - state.t;
  if (!state.rush && left <= RUSH_AT) {
    state.rush = true;
    state.flow = 0.55;
    evs.push({ e: 'rush' });
  }
  if (left <= 0) {
    state.phase = 'end';
    evs.push({ e: 'fin' });
    return evs;
  }

  // Canard doré.
  state.goldTimer -= dt;
  if (state.goldTimer <= 0) {
    state.goldTimer = GOLD_EVERY;
    const candidates = state.ducks.filter((d) => !d.gold && d.val > 0);
    if (candidates.length) {
      const d = state.rng.pick(candidates);
      d.gold = GOLD_LIFE;
      d.val = 10;
      evs.push({ e: 'gold', id: d.id });
    }
  }
  for (const d of state.ducks) {
    if (d.gold > 0) {
      d.gold -= dt;
      if (d.gold <= 0) { d.gold = 0; d.val = duckValue(state.rng); if (d.val < 0) d.val = 2; }
    }
  }

  // Courant + fuite devant le Héron.
  const heron = state.heron ? state.players[state.heron] : null;
  for (const d of state.ducks) {
    d.a = (d.a + state.flow * d.spd * dt) % TAU;
    d.bob += dt * 3;
    if (heron) {
      const pos = duckPos(d);
      const dd = dist(pos.x, pos.y, heron.x, heron.y);
      if (dd < 90) {
        d.a += state.flow * dt * 2.2;
        d.lane = clamp(d.lane + (d.lane >= 0 ? 14 : -14) * dt * 3, -LANE, LANE);
      }
    }
  }

  // Joueurs.
  for (const p of Object.values(state.players)) {
    p.splashCd = Math.max(0, p.splashCd - dt);
    if (p.st > 0) { p.st -= dt; continue; }
    if (p.dipT > 0) {
      p.dipT -= dt;
      if (p.dipT <= 0) resolveDip(state, p);
      continue;
    }
    let sp = SPEED;
    if (p.carry) sp *= CARRY_SLOW;
    if (p.pid === state.heron) sp *= HERON_SPEED;
    p.x = clamp(p.x + p.mx * sp * dt, 26, W - 26);
    p.y = clamp(p.y + p.my * sp * dt, 40, H - 34);

    // Encaissement au comptoir de l'équipe.
    if (p.carry) {
      const c = counterOf(state, state.teamOf[p.pid]);
      if (dist(p.x, p.y, c.x, c.y) < BANK_R) {
        p.score += p.carry.val;
        p.stats.banked++;
        state.evq.push({ e: 'bank', pid: p.pid, val: p.carry.val, x: c.x, y: c.y, gold: p.carry.gold ? 1 : 0 });
        p.carry = null;
      }
    }
  }
  return evs;
}

export function isOver(state) {
  return state.done;
}

export function view(state, pid) {
  if (state._viewTick !== state.tick) {
    const players = state.pids.map((id) => {
      const p = state.players[id];
      return {
        id,
        x: r1(p.x), y: r1(p.y),
        st: p.st > 0 ? 1 : 0,
        dip: p.dipT > 0 ? 1 : 0,
        cd: r1(p.splashCd),
        carry: p.carry ? (p.carry.gold ? 2 : 1) : 0,
        sc: p.score,
      };
    });
    const ducks = state.ducks.map((d) => {
      const pos = duckPos(d);
      return { id: d.id, x: r1(pos.x), y: r1(pos.y), g: d.gold > 0 ? 1 : 0, b: r1(Math.sin(d.bob) * 3) };
    });
    const teamScores = state.cfg.teams.map((team) =>
      Math.round((team.reduce((s, id) => s + state.players[id].score, 0) / team.length) * 10) / 10);
    state._base = {
      phase: state.phase,
      tl: Math.ceil(Math.max(0, state.duration - state.t)),
      rush: state.rush ? 1 : 0,
      players,
      ducks,
      teamScores,
      counters: state.cfg.teams.map((_, t) => {
        const c = counterOf(state, t);
        return { x: c.x, y: c.y, t };
      }),
    };
    state._viewTick = state.tick;
    state._views = new Map();
  }
  const key = pid || '@spec';
  let v = state._views.get(key);
  if (!v) {
    const mine = pid ? state.players[pid] : null;
    v = { ...state._base, myVal: mine?.carry ? mine.carry.val : null };
    state._views.set(key, v);
  }
  return v;
}

export function results(state) {
  const { cfg } = state;
  const teamScore = cfg.teams.map((team) =>
    team.reduce((s, id) => s + state.players[id].score, 0) / team.length);
  const best = Math.max(...teamScore);
  const winTeams = teamScore.map((s, t) => [s, t]).filter(([s]) => s === best).map(([, t]) => t);
  const allTied = winTeams.length === cfg.teams.length && cfg.teams.length > 1;
  const winners = allTied || best === 0 ? [] : winTeams.flatMap((t) => cfg.teams[t]);

  const ranking = state.pids
    .map((pid) => {
      const p = state.players[pid];
      return { pid, score: p.score, tie: p.stats.banked, label: `${p.score} pts` };
    })
    .sort((a, b) => b.score - a.score || b.tie - a.tie)
    .map(({ pid, score, label }) => ({ pid, score, label }));

  const titles = [];
  const all = state.pids.map((pid) => ({ pid, s: state.players[pid].stats }));
  const top = (fn) => all.slice().sort((a, b) => fn(b.s) - fn(a.s))[0];
  const dore = top((s) => s.golds);
  if (dore.s.golds >= 1) titles.push({ pid: dore.pid, emoji: '⭐', text: `Le Doré : ${dore.s.golds} canard(s) en or` });
  const terreur = top((s) => s.splashHits);
  if (terreur.s.splashHits >= 2) titles.push({ pid: terreur.pid, emoji: '💦', text: `Terreur des mares : ${terreur.s.splashHits} canards fait lâcher` });
  const bredouille = top((s) => s.missed);
  if (bredouille.s.missed >= 4) titles.push({ pid: bredouille.pid, emoji: '🕸️', text: `Bredouille : ${bredouille.s.missed} coups d'épuisette dans l'eau` });
  const demineur = top((s) => s.bombs);
  if (demineur.s.bombs >= 2) titles.push({ pid: demineur.pid, emoji: '💣', text: `Démineur malgré lui : ${demineur.s.bombs} bombes gobées` });
  const dedaigneux = top((s) => s.rejected);
  if (dedaigneux.s.rejected >= 3) titles.push({ pid: dedaigneux.pid, emoji: '🧐', text: `Fine bouche : ${dedaigneux.s.rejected} canards rejetés` });
  if (!titles.length) {
    const four = top((s) => s.caught);
    titles.push({ pid: four.pid, emoji: '🎣', text: `Épuisette d'or : ${four.s.caught} canards pêchés` });
  }
  return { ranking, winners, titles };
}

// ── Bot : pêche le plus proche, ramène, splash les porteurs ────────────

export function botAct(state, pid, mind, api) {
  const p = state.players[pid];
  if (!p || state.done || state.phase !== 'play') return;
  const { p: pers, rng } = mind;
  if (p.st > 0 || p.dipT > 0) return;

  // Porteur : cap sur le comptoir (ou rejet d'un canard minable).
  if (p.carry) {
    if (p.carry.val <= 1 && !p.carry.gold && rng.chance(0.25)) {
      api.act('dip'); // rejeter
      return;
    }
    const c = counterOf(state, state.teamOf[pid]);
    const d = dist(p.x, p.y, c.x, c.y) || 1;
    api.input({ mx: (c.x - p.x) / d, my: (c.y - p.y) / d });
    return;
  }

  // Splash opportuniste sur un porteur ennemi proche.
  if (p.splashCd <= 0 && rng.chance(pers.aggro * 0.5)) {
    for (const q of Object.values(state.players)) {
      if (q.pid === pid || !q.carry || state.teamOf[q.pid] === state.teamOf[pid]) continue;
      if (dist(q.x, q.y, p.x, p.y) < SPLASH_R * 0.9) {
        api.act('splash');
        return;
      }
    }
  }

  // Cible : canard doré si visible, sinon le plus proche.
  let target = null, bestScore = -Infinity;
  for (const d of state.ducks) {
    const pos = duckPos(d);
    const dd = dist(pos.x, pos.y, p.x, p.y);
    const sc = (d.gold > 0 ? 500 : 0) - dd;
    if (sc > bestScore) { bestScore = sc; target = pos; }
  }
  if (!target) return;
  const dd = dist(target.x, target.y, p.x, p.y) || 1;
  if (dd < CATCH_R * 0.8) {
    if (rng.chance(0.5 + pers.skill * 0.5)) api.act('dip');
  } else {
    const err = (1 - pers.skill) * 0.5;
    const ang = Math.atan2(target.y - p.y, target.x - p.x) + rng.range(-err, err);
    api.input({ mx: Math.cos(ang), my: Math.sin(ang) });
  }
}
