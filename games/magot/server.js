// MAGOT — simulation serveur : ramasser, porter (ralenti), banquer,
// tacler (tout lâcher), siphonner les caisses, format « Le Dragon ».

import { TAU, clamp } from '../../shared/const.js';
import meta from './meta.js';

const W = meta.arena.w;
const H = meta.arena.h;
const CX = W / 2, CY = H / 2;
const P_R = 14;
const SPEED = 175;
const SLOW_PER_COIN = 0.055;
const SLOW_MIN = 0.4;
const PILE_R = 64;
const PILE_PER_PLAYER = 9; // tas de départ FINI : la rareté fait la bagarre
const PICK_EVERY = 0.4;    // s par jeton ramassé sur le tas
const CAISSE_R = 44;
const BANK_EVERY = 0.25;   // s par jeton déposé
const SIPHON_EVERY = 0.8;  // s par jeton siphonné
const TACKLE_V = 430;
const TACKLE_CD = 2.2;
const TACKLE_ATK = 0.3;
const STUN_T = 0.8;
const FLOOR_TTL = 15;      // s de vie d'un jeton au sol
const FLOOR_MAX = 90;
const RAIN_EVERY = 25;     // s entre deux pluies d'or
const RAIN_WARN = 2.5;     // s d'annonce de la zone avant la pluie
const RAIN_COINS = 8;      // + 1 jeton d'or (x5) par pluie
const GOLD_VALUE = 5;
const GOLDEN_AT = 20;      // s restantes : l'« heure dorée » (dépôts x2)
const DRAGON_TREASURE = 44;
const DRAGON_SPEED = 200;
const DRAGON_CD = 1.8;
const PRE_T = 1.2;
const END_T = 2.5;

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;

export function createState(cfg) {
  const asym = cfg.format.kind === 'asym';
  const nTeams = cfg.teams.length;
  const nPlayers = cfg.teams.flat().length;
  const pile0 = asym ? DRAGON_TREASURE : PILE_PER_PLAYER * nPlayers;
  const state = {
    cfg,
    rng: cfg.rng,
    asym,
    tick: 0,
    phase: 'pre',
    phaseT: PRE_T,
    timeLeft: cfg.settings.duration || 150,
    pile: pile0,
    pileMax: pile0,
    pileEmptied: false,
    floor: [],           // jetons au sol {id, x, y, v, ttl}
    floorId: 0,
    rainT: RAIN_EVERY,
    rain: null,          // {x, y, in} : pluie d'or annoncée
    golden: false,       // heure dorée : dépôts x2
    caisses: [],         // {team, x, y, banked}
    players: {},
    evq: [],
    done: false,
    _viewTick: -1,
    _view: null,
  };

  // Caisses : réparties sur une ellipse autour du tas (pas pour le Dragon).
  const bankTeams = asym ? cfg.teams.slice(1).map((_, i) => i + 1) : cfg.teams.map((_, i) => i);
  bankTeams.forEach((team, i) => {
    const ang = (i / bankTeams.length) * TAU + (bankTeams.length === 2 ? 0 : -Math.PI / 2);
    state.caisses.push({
      team,
      x: r1(CX + Math.cos(ang) * (W / 2 - 90)),
      y: r1(CY + Math.sin(ang) * (H / 2 - 80)),
      banked: 0,
    });
  });

  cfg.teams.forEach((team, t) => {
    team.forEach((pid, i) => {
      const caisse = state.caisses.find((c) => c.team === t);
      const ang = ((t * 3 + i) / (nTeams * 3)) * TAU;
      state.players[pid] = {
        pid, team: t,
        x: caisse ? caisse.x : CX + Math.cos(ang) * 120,
        y: caisse ? caisse.y : CY + Math.sin(ang) * 120,
        a: 0, ix: 0, iy: 0, bx: 0, by: 0,
        carry: 0, stunT: 0, tackleCd: 0, atkT: 0,
        pickT: 0, bankT: 0, siphonT: 0,
        stats: { banked: 0, siphoned: 0, tackles: 0, drops: 0, lost: 0, biggestLoss: 0, gold: 0 },
      };
    });
  });
  return state;
}

const isDragon = (state, p) => state.asym && p.team === 0;

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
  if (!p || a !== 'tackle') return;
  if (state.phase !== 'run' || p.stunT > 0 || p.tackleCd > 0) return;
  const len = Math.hypot(p.ix, p.iy);
  const dx = len > 0.2 ? p.ix / len : Math.cos(p.a);
  const dy = len > 0.2 ? p.iy / len : Math.sin(p.a);
  p.bx += dx * TACKLE_V;
  p.by += dy * TACKLE_V;
  p.tackleCd = isDragon(state, p) ? DRAGON_CD : TACKLE_CD;
  p.atkT = TACKLE_ATK;
  state.evq.push({ e: 'tackle', pid, x: r1(p.x), y: r1(p.y) });
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
    if (state.phaseT <= 0) state.done = true;
    return evs;
  }

  state.timeLeft -= dt;

  // Heure dorée : dans les 20 dernières secondes, chaque dépôt compte x2.
  if (!state.golden && state.timeLeft <= GOLDEN_AT) {
    state.golden = true;
    evs.push({ e: 'golden' });
  }

  // Pluie d'or : zone annoncée à l'avance → tout le monde y court.
  // (pas en mode Dragon : son trésor fini est la seule richesse)
  if (!state.asym) {
    state.rainT -= dt;
    if (!state.rain && state.rainT <= RAIN_WARN && state.timeLeft > 10) {
      state.rain = {
        x: r1(state.rng.range(90, W - 90)),
        y: r1(state.rng.range(90, H - 90)),
        in: RAIN_WARN,
      };
      evs.push({ e: 'rainWarn', x: state.rain.x, y: state.rain.y });
    }
    if (state.rain) {
      state.rain.in -= dt;
      if (state.rain.in <= 0) {
        const { x, y } = state.rain;
        for (let i = 0; i < RAIN_COINS; i++) {
          const ang = state.rng.range(0, TAU);
          const d = state.rng.range(0, 65);
          state.floor.push({
            id: ++state.floorId,
            x: r1(clamp(x + Math.cos(ang) * d, 20, W - 20)),
            y: r1(clamp(y + Math.sin(ang) * d, 20, H - 20)),
            v: 1, ttl: 20,
          });
        }
        state.floor.push({ id: ++state.floorId, x, y, v: GOLD_VALUE, ttl: 20 });
        evs.push({ e: 'rain', x, y });
        state.rain = null;
        state.rainT = RAIN_EVERY;
      }
    }
  }

  const players = Object.values(state.players);

  // Déplacements.
  for (const p of players) {
    p.tackleCd = Math.max(0, p.tackleCd - dt);
    p.atkT -= dt;
    p.stunT -= dt;
    const stunned = p.stunT > 0;
    const base = isDragon(state, p) ? DRAGON_SPEED : SPEED;
    const slow = Math.max(SLOW_MIN, 1 - SLOW_PER_COIN * p.carry * (isDragon(state, p) ? 0.4 : 1));
    const sp = stunned ? 0 : base * slow;
    p.x += (p.ix * sp + p.bx) * dt;
    p.y += (p.iy * sp + p.by) * dt;
    p.bx *= Math.max(0, 1 - 6 * dt);
    p.by *= Math.max(0, 1 - 6 * dt);
    p.x = clamp(p.x, P_R, W - P_R);
    p.y = clamp(p.y, P_R, H - P_R);
    if (Math.hypot(p.ix, p.iy) > 0.15) p.a = Math.atan2(p.iy, p.ix);
  }

  // Tacles & séparation douce.
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const p = players[i], q = players[j];
      const dx = q.x - p.x, dy = q.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d === 0 || d > P_R * 2) continue;
      const nx = dx / d, ny = dy / d;
      const push = (P_R * 2 - d) / 2;
      p.x -= nx * push; p.y -= ny * push;
      q.x += nx * push; q.y += ny * push;
      if (p.team !== q.team) {
        if (p.atkT > 0 && q.stunT <= 0) tackleHit(state, p, q, nx, ny, evs);
        else if (q.atkT > 0 && p.stunT <= 0) tackleHit(state, q, p, -nx, -ny, evs);
      }
    }
  }

  // Ramassage, banque, siphon.
  for (const p of players) {
    if (p.stunT > 0) continue;
    const dragon = isDragon(state, p);

    // Sur le tas central.
    if (Math.hypot(p.x - CX, p.y - CY) < PILE_R) {
      if (dragon) {
        // Le Dragon redépose son butin sur le tas.
        if (p.carry > 0) {
          state.pile += p.carry;
          evs.push({ e: 'bank', pid: p.pid, n: p.carry });
          p.carry = 0;
        }
      } else if (state.pile > 0) {
        p.pickT += dt;
        if (p.pickT >= PICK_EVERY) {
          p.pickT = 0;
          p.carry++;
          state.pile--;
          evs.push({ e: 'pick', pid: p.pid });
          if (state.pile === 0 && !state.asym && !state.pileEmptied) {
            state.pileEmptied = true;
            evs.push({ e: 'pileEmpty' });
          }
        }
      }
    } else p.pickT = 0;

    // Jetons au sol.
    for (let i = state.floor.length - 1; i >= 0; i--) {
      const f = state.floor[i];
      if (Math.hypot(f.x - p.x, f.y - p.y) < P_R + 8) {
        state.floor.splice(i, 1);
        p.carry += f.v;
        if (f.v > 1) { p.stats.gold++; evs.push({ e: 'goldpick', pid: p.pid, x: f.x, y: f.y }); }
        else evs.push({ e: 'pick', pid: p.pid });
      }
    }

    // Caisses.
    for (const c of state.caisses) {
      if (Math.hypot(c.x - p.x, c.y - p.y) > CAISSE_R) continue;
      if (c.team === p.team) {
        if (p.carry > 0) {
          p.bankT += dt;
          if (p.bankT >= BANK_EVERY) {
            p.bankT = 0;
            p.carry--;
            const gain = state.golden ? 2 : 1;
            c.banked += gain;
            p.stats.banked += gain;
            evs.push({ e: 'coin', pid: p.pid, team: c.team, g: gain });
          }
        }
      } else if (c.banked > 0) {
        p.siphonT += dt;
        if (p.siphonT >= SIPHON_EVERY) {
          p.siphonT = 0;
          c.banked--;
          p.carry++;
          p.stats.siphoned++;
          evs.push({ e: 'steal', pid: p.pid, team: c.team, x: c.x, y: c.y });
        }
      }
    }
  }

  // Expiration des jetons au sol.
  for (let i = state.floor.length - 1; i >= 0; i--) {
    const f = state.floor[i];
    f.ttl -= dt;
    if (f.ttl <= 0) {
      state.floor.splice(i, 1);
      if (state.asym) state.pile += f.v; // le trésor revient au Dragon
    }
  }

  // Fin de partie.
  if (state.timeLeft <= 0) {
    state.phase = 'end';
    state.phaseT = END_T;
    evs.push({ e: 'end' });
  }
  return evs;
}

function tackleHit(state, atk, vic, nx, ny, evs) {
  vic.stunT = STUN_T;
  vic.bx += nx * 260;
  vic.by += ny * 260;
  atk.stats.tackles++;
  const n = vic.carry;
  if (n > 0) {
    vic.stats.drops++;
    vic.stats.lost += n;
    vic.stats.biggestLoss = Math.max(vic.stats.biggestLoss, n);
    vic.carry = 0;
    // Éventail de jetons au sol.
    const spawn = Math.min(n, FLOOR_MAX - state.floor.length);
    for (let i = 0; i < spawn; i++) {
      const ang = state.rng.range(0, TAU);
      const d = state.rng.range(16, 44 + n * 1.5);
      state.floor.push({
        id: ++state.floorId,
        x: r1(clamp(vic.x + Math.cos(ang) * d, 20, W - 20)),
        y: r1(clamp(vic.y + Math.sin(ang) * d, 20, H - 20)),
        v: 1, ttl: FLOOR_TTL,
      });
    }
    if (spawn < n && state.asym) state.pile += n - spawn;
  }
  evs.push({ e: 'drop', pid: vic.pid, by: atk.pid, x: r1(vic.x), y: r1(vic.y), n });
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
      c: p.carry,
      st: p.stunT > 0 ? 1 : 0,
      cd: r2(p.tackleCd / (isDragon(state, p) ? DRAGON_CD : TACKLE_CD)),
    };
  }
  state._view = {
    phase: state.phase,
    timeLeft: Math.max(0, Math.ceil(state.timeLeft)),
    asym: state.asym,
    pile: state.pile,
    pileMax: state.pileMax,
    rain: state.rain ? { x: state.rain.x, y: state.rain.y } : null,
    golden: state.golden ? 1 : 0,
    caisses: state.caisses,
    floor: state.floor.map((f) => ({ id: f.id, x: f.x, y: f.y, v: f.v })),
    players,
  };
  state._viewTick = state.tick;
  return state._view;
}

export function results(state) {
  const { cfg } = state;
  // Score d'équipe = jetons en caisse (le Dragon marque avec son tas).
  const teamScores = cfg.teams.map((_, t) => {
    if (state.asym && t === 0) return state.pile;
    return state.caisses.find((c) => c.team === t)?.banked ?? 0;
  });

  let winners;
  if (state.asym) {
    const crowdBanked = teamScores.slice(1).reduce((a, b) => a + b, 0);
    winners = crowdBanked >= Math.ceil(DRAGON_TREASURE / 2)
      ? cfg.teams.slice(1).flat()
      : cfg.teams[0];
  } else {
    const best = Math.max(...teamScores);
    const winTeams = teamScores.map((s, t) => [s, t]).filter(([s]) => s === best).map(([, t]) => t);
    winners = winTeams.length === cfg.teams.length && cfg.teams.length > 1
      ? [] : winTeams.flatMap((t) => cfg.teams[t]);
  }

  const ranking = Object.values(state.players)
    .map((p) => ({
      pid: p.pid,
      score: teamScores[p.team],
      perso: p.stats.banked + p.stats.siphoned,
      label: state.asym && p.team === 0 ? `garde ${state.pile} 🪙` : `${teamScores[p.team]} 🪙`,
    }))
    .sort((a, b) => b.score - a.score || b.perso - a.perso)
    .map(({ pid, score, label }) => ({ pid, score, label }));

  const titles = [];
  const all = Object.values(state.players);
  const top = (fn) => all.slice().sort((a, b) => fn(b.stats) - fn(a.stats))[0];
  const mule = top((s) => s.banked);
  if (mule.stats.banked >= 3) titles.push({ pid: mule.pid, emoji: '🐜', text: `La Fourmi — ${mule.stats.banked} jetons sécurisés` });
  const thief = top((s) => s.siphoned);
  if (thief.stats.siphoned >= 3) titles.push({ pid: thief.pid, emoji: '🕵️', text: `Pickpocket — ${thief.stats.siphoned} jetons siphonnés` });
  const brute = top((s) => s.tackles);
  if (brute.stats.tackles >= 3) titles.push({ pid: brute.pid, emoji: '🥊', text: `Le Bourrin — ${brute.stats.tackles} tacles` });
  const turtle = top((s) => s.biggestLoss);
  if (turtle.stats.biggestLoss >= 6) titles.push({ pid: turtle.pid, emoji: '🐢', text: `Tortue imprudente — ${turtle.stats.biggestLoss} jetons perdus d'un coup` });
  const lazy = all.slice().sort((a, b) =>
    (a.stats.banked + a.stats.siphoned + a.stats.tackles) - (b.stats.banked + b.stats.siphoned + b.stats.tackles))[0];
  if (!state.asym || lazy.team !== 0) titles.push({ pid: lazy.pid, emoji: '🦥', text: 'N\'a strictement rien fait' });

  return { ranking, winners, titles };
}

// ── Bot ────────────────────────────────────────────────────────────────

export function botAct(state, pid, mind, api) {
  const p = state.players[pid];
  if (!p || state.phase !== 'run' || p.stunT > 0) return;
  const { p: pers, rng } = mind;
  const dragon = isDragon(state, p);

  let goal = null;

  if (dragon) {
    // Le Dragon : ramène son butin, chasse le plus gros porteur, ramasse le sol.
    if (p.carry >= 4) goal = { x: CX, y: CY };
    else {
      let carrier = null, best = 1;
      for (const q of Object.values(state.players)) {
        if (q.team === 0) continue;
        const score = q.carry - Math.hypot(q.x - p.x, q.y - p.y) / 200;
        if (q.carry > 0 && score > best) { best = score; carrier = q; }
      }
      const floorNear = nearestFloor(state, p, 260);
      if (carrier) goal = carrier;
      else if (floorNear) goal = floorNear;
      else goal = { x: CX + rng.range(-100, 100), y: CY + rng.range(-80, 80) };
    }
  } else {
    const myCaisse = state.caisses.find((c) => c.team === p.team);
    const greed = 3 + Math.round(pers.aggro * 5);
    const danger = state.asym ? dragonDist(state, p) : Infinity;
    if (state.golden && p.carry > 0 && rng.chance(0.85)) {
      goal = myCaisse; // heure dorée : on sécurise tout, ça compte double
    } else if (state.rain && rng.chance(0.6 + pers.aggro * 0.3)) {
      goal = state.rain; // pluie d'or annoncée : on fonce à la zone
    } else if (p.carry >= greed || (p.carry > 0 && danger < 120 && rng.chance(0.7))) {
      goal = myCaisse; // aller sécuriser
    } else {
      const floorNear = nearestFloor(state, p, 220);
      const enemyCarrier = pers.aggro > 0.55 ? fattestEnemy(state, p) : null;
      const enemyCaisse = pers.chaos > 0.45 ? richestEnemyCaisse(state, p) : null;
      if (floorNear && rng.chance(0.85)) goal = floorNear;
      else if (enemyCarrier && enemyCarrier.carry >= 4 && rng.chance(pers.aggro * 0.6)) goal = enemyCarrier;
      else if (enemyCaisse && rng.chance(0.25)) goal = enemyCaisse;
      else if (!state.asym || state.pile > 0) goal = { x: CX, y: CY };
      else goal = myCaisse;
    }
    // Fuir le Dragon qui charge.
    if (state.asym && danger < 90 && p.carry > 0) {
      const d = Object.values(state.players).find((q) => q.team === 0);
      goal = { x: p.x + (p.x - d.x) * 2, y: p.y + (p.y - d.y) * 2 };
    }
  }

  if (!goal) return;
  const dx = goal.x - p.x, dy = goal.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  let mx = dx / len, my = dy / len;
  if (rng.chance(pers.chaos * 0.08)) { mx = rng.range(-1, 1); my = rng.range(-1, 1); }
  api.input({ mx, my });

  // Tacler un ennemi porteur à portée.
  if (p.tackleCd <= 0 && goal.pid && goal.team !== undefined && goal.team !== p.team) {
    if (len < 55 && rng.chance(pers.skill)) api.act('tackle');
  }
}

function nearestFloor(state, p, maxD) {
  let best = null, bd = maxD * maxD;
  for (const f of state.floor) {
    const d = (f.x - p.x) ** 2 + (f.y - p.y) ** 2;
    const weighted = d / (f.v > 1 ? 4 : 1);
    if (weighted < bd) { bd = weighted; best = f; }
  }
  return best;
}

function fattestEnemy(state, p) {
  let best = null, bc = 2;
  for (const q of Object.values(state.players)) {
    if (q.team === p.team) continue;
    if (q.carry > bc) { bc = q.carry; best = q; }
  }
  return best;
}

function richestEnemyCaisse(state, p) {
  let best = null, bb = 4;
  for (const c of state.caisses) {
    if (c.team === p.team) continue;
    if (c.banked > bb) { bb = c.banked; best = c; }
  }
  return best;
}

function dragonDist(state, p) {
  const d = Object.values(state.players).find((q) => q.team === 0);
  return d ? Math.hypot(d.x - p.x, d.y - p.y) : Infinity;
}
