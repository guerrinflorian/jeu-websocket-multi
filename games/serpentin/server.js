// SERPENTIN : simulation serveur (contrat de jeu, voir docs/ARCHITECTURE.md).
// Curve-fever revisité : traînées persistantes avec trous périodiques,
// traînées alliées traversables, boost, format asymétrique « L'Anguille ».

import { TAU, clamp } from '../../shared/const.js';
import meta from './meta.js';

const W = meta.arena.w;
const H = meta.arena.h;
const SPEED = 135;
const TURN = 3.1;
const HEAD_R = 3.5;
const TRAIL_R = 3;
const HIT_D2 = (HEAD_R + TRAIL_R) ** 2;
const DRAW_T = 3.4;              // secondes de tracé…
const GAP_T = 0.3;               // …puis trou
const BOOST_MULT = 1.65;
const BOOST_T = 0.9;
const BOOST_CD = 4.5;
const SELF_IMMUNE = 12;          // ticks : sa propre traînée fraîche ne tue pas
const ANG_SPEED = 1.18;          // multiplicateur Anguille
const ANG_TRAIL = 60;            // ticks de vie de la traînée de l'Anguille
const ANG_SURVIVE = 40;          // secondes à survivre
const PRE_T = 1.3;
const END_T = 2.2;

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
    survT: 0,
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
        x: 0, y: 0, a: 0, turn: 0,
        alive: true, drawClock: 0, gap: false,
        boostT: 0, boostCd: 0,
        trail: [],            // polylignes : [[x,y,tick, x,y,tick, …], …]
        roundStart: 0,
        stats: { kills: 0, deaths: 0, crashes: 0, boosts: 0, surv: 0, firstDeaths: 0 },
      };
    }
  });
  startRound(state);
  return state;
}

function isSolo(state, p) {
  return state.asym && p.team === 0;
}

function startRound(state) {
  state.round++;
  state.phase = 'pre';
  state.phaseT = PRE_T;
  state.survT = ANG_SURVIVE;
  state.firstDeathDone = false;
  const pids = Object.keys(state.players);
  const cx = W / 2, cy = H / 2;
  pids.forEach((pid, i) => {
    const p = state.players[pid];
    p.alive = true;
    p.trail = [];
    p.gap = false;
    p.turn = 0;
    p.boostT = 0;
    p.boostCd = 0;
    p.drawClock = state.rng.range(0, DRAW_T * 0.5);
    p.roundStart = state.tick;
    if (isSolo(state, p)) {
      p.x = cx; p.y = cy;
      p.a = state.rng.range(0, TAU);
    } else {
      // En cercle autour du centre, tournés vers l'intérieur (avec un biais
      // pour ne pas foncer pile sur le centre).
      const ang = (i / pids.length) * TAU + state.rng.range(-0.2, 0.2);
      const rad = Math.min(W, H) * 0.36;
      p.x = cx + Math.cos(ang) * rad * (W / H);
      p.y = cy + Math.sin(ang) * rad;
      p.x = clamp(p.x, 60, W - 60);
      p.y = clamp(p.y, 50, H - 50);
      p.a = Math.atan2(cy - p.y, cx - p.x) + state.rng.range(-0.5, 0.5);
    }
  });
}

export function onInput(state, pid, d) {
  const p = state.players[pid];
  if (!p || !d) return;
  const turn = Number(d.turn);
  if (turn === -1 || turn === 0 || turn === 1) p.turn = turn;
}

export function onAction(state, pid, a) {
  const p = state.players[pid];
  if (!p || a !== 'boost') return;
  if (state.phase !== 'run' || !p.alive || p.boostCd > 0) return;
  p.boostT = BOOST_T;
  p.boostCd = BOOST_CD;
  p.stats.boosts++;
  state.evq.push({ e: 'boost', pid });
}

export function tick(state, dt) {
  const evs = state.evq;
  state.evq = [];
  state.tick++;

  if (state.phase === 'pre') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) {
      state.phase = 'run';
      evs.push({ e: 'go' });
    }
    return evs;
  }

  if (state.phase === 'end') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) {
      if (state.round >= state.rounds) finish(state);
      else startRound(state);
    }
    return evs;
  }

  // phase 'run'
  const players = Object.values(state.players);
  for (const p of players) {
    if (!p.alive) continue;
    p.boostT -= dt;
    p.boostCd = Math.max(0, p.boostCd - dt);
    const speed = SPEED * (isSolo(state, p) ? ANG_SPEED : 1) * (p.boostT > 0 ? BOOST_MULT : 1);
    p.a += p.turn * TURN * dt;
    p.x += Math.cos(p.a) * speed * dt;
    p.y += Math.sin(p.a) * speed * dt;

    // Échantillonnage de la traînée (tracé / trou périodique).
    p.drawClock += dt;
    if (p.drawClock > DRAW_T + GAP_T) p.drawClock -= DRAW_T + GAP_T;
    const drawing = p.drawClock < DRAW_T;
    if (drawing) {
      if (p.gap || p.trail.length === 0) p.trail.push([]);
      p.gap = false;
      p.trail[p.trail.length - 1].push(r1(p.x), r1(p.y), state.tick);
    } else {
      p.gap = true;
    }

    // La traînée de l'Anguille s'évapore.
    if (isSolo(state, p)) {
      const minTick = state.tick - ANG_TRAIL;
      while (p.trail.length) {
        const line = p.trail[0];
        let drop = 0;
        while (drop < line.length && line[drop + 2] < minTick) drop += 3;
        if (drop > 0) line.splice(0, drop);
        if (line.length === 0) p.trail.shift();
        else break;
      }
    }
  }

  // Collisions (appliquées simultanément après tous les déplacements).
  const dead = [];
  for (const p of players) {
    if (!p.alive) continue;
    const hit = hitTest(state, p.x, p.y, p.pid, p.team);
    if (hit) dead.push([p, hit]);
  }
  for (const [p, hit] of dead) {
    p.alive = false;
    p.stats.deaths++;
    p.stats.surv += (state.tick - p.roundStart) / 20;
    if (!state.firstDeathDone) { state.firstDeathDone = true; p.stats.firstDeaths++; }
    if (hit.by === 'wall' || hit.by === 'self') p.stats.crashes++;
    else {
      const killer = state.players[hit.by];
      if (killer) killer.stats.kills++;
    }
    evs.push({ e: 'death', pid: p.pid, x: r1(p.x), y: r1(p.y), by: hit.by });
  }

  // Fin de manche ?
  if (state.phase === 'run') {
    state.survT -= state.asym ? dt : 0;
    const aliveTeams = new Set(players.filter((p) => p.alive).map((p) => p.team));
    let winner = null;
    let over = false;
    if (state.asym) {
      if (!aliveTeams.has(0)) { winner = 1; over = true; }        // Anguille morte
      else if (state.survT <= 0 || !aliveTeams.has(1)) { winner = 0; over = true; }
    } else if (aliveTeams.size <= 1) {
      winner = aliveTeams.size ? [...aliveTeams][0] : null;       // null = double KO
      over = true;
    }
    if (over) {
      for (const p of players) {
        if (p.alive) p.stats.surv += (state.tick - p.roundStart) / 20;
      }
      if (winner !== null) state.scores[winner]++;
      evs.push({ e: 'roundEnd', team: winner, round: state.round });
      state.phase = 'end';
      state.phaseT = END_T;
    }
  }
  return evs;
}

// Teste tête (x, y) contre murs et traînées. Retourne { by } ou null.
// Exporté pour les bots (sondes de trajectoire).
export function hitTest(state, x, y, pid, team, probe = false) {
  const margin = probe ? HEAD_R + 2 : HEAD_R;
  if (x < margin || x > W - margin || y < margin || y > H - margin) return { by: 'wall' };
  const selfMin = state.tick - SELF_IMMUNE;
  for (const q of Object.values(state.players)) {
    const own = q.pid === pid;
    if (!own && q.team === team && !isFfa(state)) continue;      // alliée : traversable
    for (const line of q.trail) {
      const n = line.length;
      if (n < 3) continue;
      let px = line[0], py = line[1];
      for (let i = 3; i < n; i += 3) {
        const qx = line[i], qy = line[i + 1], qt = line[i + 2];
        if (!(own && qt > selfMin) && segDist2(x, y, px, py, qx, qy) < HIT_D2) {
          return { by: own ? 'self' : q.pid };
        }
        px = qx; py = qy;
      }
    }
  }
  return null;
}

function isFfa(state) {
  return state.cfg.format.kind === 'ffa';
}

function segDist2(x, y, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((x - ax) * dx + (y - ay) * dy) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const px = ax + dx * t - x, py = ay + dy * t - y;
  return px * px + py * py;
}

function finish(state) {
  state.done = true;
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
      gp: p.gap ? 1 : 0,
      b: p.boostT > 0 ? 1 : 0,
      cd: r2(p.boostCd / BOOST_CD),
    };
  }
  state._view = {
    phase: state.phase,
    pt: r1(state.phaseT),
    round: state.round,
    rounds: state.rounds,
    scores: state.scores,
    asym: state.asym,
    survT: state.asym ? r1(state.survT) : 0,
    players,
  };
  state._viewTick = state.tick;
  return state._view;
}

export function fullView(state, pid) {
  const trails = {};
  for (const [id, p] of Object.entries(state.players)) {
    trails[id] = p.trail.map((line) => {
      const pts = [];
      for (let i = 0; i < line.length; i += 3) pts.push(line[i], line[i + 1]);
      return pts;
    });
  }
  return { ...view(state, pid), trails };
}

export function results(state) {
  const { cfg } = state;
  const best = Math.max(...state.scores);
  const winTeams = state.scores.map((s, t) => [s, t]).filter(([s]) => s === best).map(([, t]) => t);
  const allTied = winTeams.length === cfg.teams.length;
  const winners = (allTied && cfg.teams.length > 1) ? [] : winTeams.flatMap((t) => cfg.teams[t]);

  const ranking = Object.values(state.players)
    .map((p) => ({
      pid: p.pid,
      score: state.scores[p.team],
      surv: p.stats.surv,
      label: `${state.scores[p.team]} 🏆`,
    }))
    .sort((a, b) => b.score - a.score || b.surv - a.surv)
    .map(({ pid, score, label }) => ({ pid, score, label }));

  const titles = [];
  const byStat = (fn) => Object.values(state.players).slice().sort((a, b) => fn(b.stats) - fn(a.stats))[0];
  const kills = byStat((s) => s.kills);
  if (kills.stats.kills >= 2) titles.push({ pid: kills.pid, emoji: '🔪', text: `Le Boucher : ${kills.stats.kills} victimes` });
  const crash = byStat((s) => s.crashes);
  if (crash.stats.crashes >= 2) titles.push({ pid: crash.pid, emoji: '💣', text: `Kamikaze : ${crash.stats.crashes} sorties de route` });
  const tank = byStat((s) => s.surv);
  titles.push({ pid: tank.pid, emoji: '🛡️', text: `Increvable : ${Math.round(tank.stats.surv)} s de survie` });
  const early = byStat((s) => s.firstDeaths);
  if (early.stats.firstDeaths >= 2) titles.push({ pid: early.pid, emoji: '⚰️', text: `Mort en premier : ${early.stats.firstDeaths} fois` });
  const boost = byStat((s) => s.boosts);
  if (boost.stats.boosts >= 4) titles.push({ pid: boost.pid, emoji: '🚀', text: `Pied au plancher : ${boost.stats.boosts} boosts` });

  return { ranking, winners, titles };
}

// ── Bot : sondes de trajectoire, fuite/chasse en asym ──────────────────

export function botAct(state, pid, mind, api) {
  const p = state.players[pid];
  if (!p || !p.alive || state.phase !== 'run') return;
  const { p: pers, rng } = mind;

  const reach = 70 + pers.skill * 130;
  const angles = [0, 0.55, -0.55, 1.2, -1.2];
  let bestScore = -1, bestAng = 0;
  for (const da of angles) {
    let score = probe(state, p, p.a + da, reach);
    // L'Anguille fuit les chasseurs ; les chasseurs visent l'Anguille.
    if (state.asym) {
      const solo = Object.values(state.players).find((q) => q.team === 0);
      if (solo && solo.alive) {
        const hx = p.x + Math.cos(p.a + da) * 80;
        const hy = p.y + Math.sin(p.a + da) * 80;
        const d = Math.hypot(hx - solo.x, hy - solo.y);
        if (p.team === 0) {
          const hunter = nearest(state, p, 1);
          if (hunter) {
            const dh = Math.hypot(hx - hunter.x, hy - hunter.y);
            score += dh * 0.25;
          }
        } else {
          score -= d * 0.3 * pers.aggro;
        }
      }
    }
    if (score > bestScore) { bestScore = score; bestAng = da; }
  }
  let turn = bestAng > 0.1 ? 1 : bestAng < -0.1 ? -1 : 0;
  if (rng.chance(pers.chaos * 0.06)) turn = rng.pick([-1, 0, 1]);
  api.input({ turn });

  // Boost pour s'échapper (coincé) ou charger (agressif, voie libre).
  if (p.boostCd <= 0) {
    const boxed = bestScore < 55 && rng.chance(0.5 + pers.skill * 0.4);
    const charge = bestScore > reach * 0.9 && rng.chance(pers.aggro * 0.04);
    if (boxed || charge) api.act('boost');
  }
}

function probe(state, p, ang, reach) {
  const step = 13;
  const cos = Math.cos(ang), sin = Math.sin(ang);
  for (let d = step; d <= reach; d += step) {
    if (hitTest(state, p.x + cos * d, p.y + sin * d, p.pid, p.team, true)) return d - step;
  }
  return reach;
}

function nearest(state, p, team) {
  let best = null, bd = Infinity;
  for (const q of Object.values(state.players)) {
    if (!q.alive || q.pid === p.pid || q.team !== team) continue;
    const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}
