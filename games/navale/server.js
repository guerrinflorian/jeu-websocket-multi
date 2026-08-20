// NAVALE : simulation serveur. Bataille navale en salves SIMULTANÉES :
// placement (15 s, mélange à volonté), puis salves de 8 s : chacun arme une
// case en secret, tout part en même temps. Flotte coulée = camp éliminé.
// Asym « L'Amiral » : grille 10×10, flotte double, plusieurs tirs par salve.

const PLACE_T = 15;
const AIM_T = 8;
const FIRE_T = 2.0;
const END_T = 2.5;
const MAX_VOLLEYS = 36;
const FLEETS = { courte: [4, 3, 2], complete: [4, 3, 2, 2] };

export function createState(cfg) {
  const asym = cfg.format.kind === 'asym';
  const fleetDef = FLEETS[cfg.settings.flotte] || FLEETS.complete;
  const pids = cfg.teams.flat();
  const state = {
    cfg,
    rng: cfg.rng,
    asym,
    pids,
    phase: 'place',
    phaseT: PLACE_T,
    volley: 0,
    camps: [],
    players: {},
    simT: 0,
    done: false,
    evq: [],
    tick: 0, _viewTick: -1, _views: new Map(),
  };
  cfg.teams.forEach((team, t) => {
    const amiral = asym && t === 0;
    const n = amiral ? 10 : 8;
    const sizes = amiral ? [...fleetDef, ...fleetDef] : fleetDef;
    const camp = {
      idx: t,
      n,
      alive: true,
      deadAt: 0,
      members: [...team],
      fleetSizes: sizes,
      ships: [],
      cellShip: [],
      fired: [],
      shuffleCd: 0,
    };
    placeFleet(state.rng, camp);
    state.camps.push(camp);
    for (const pid of team) {
      state.players[pid] = {
        pid,
        camp: t,
        aims: [],
        maxAims: amiral ? Math.max(2, Math.ceil((pids.length - 1) * 0.55)) : 1,
        stats: { shots: 0, hits: 0, sunk: 0 },
      };
    }
  });
  return state;
}

// Place (ou replace) toute la flotte d'un camp, sans chevauchement.
function placeFleet(rng, camp) {
  const n = camp.n;
  camp.ships = [];
  camp.cellShip = new Array(n * n).fill(-1);
  camp.fired = new Array(n * n).fill(0);
  for (const size of camp.fleetSizes) {
    for (let tries = 0; tries < 400; tries++) {
      const horiz = rng.chance(0.5);
      const r = rng.int(0, n - 1 - (horiz ? 0 : size - 1));
      const c = rng.int(0, n - 1 - (horiz ? size - 1 : 0));
      const cells = [];
      for (let k = 0; k < size; k++) cells.push((r + (horiz ? 0 : k)) * n + (c + (horiz ? k : 0)));
      if (cells.some((i) => camp.cellShip[i] >= 0)) continue;
      const si = camp.ships.length;
      for (const i of cells) camp.cellShip[i] = si;
      camp.ships.push({ cells, hits: 0, sunk: false, size });
      break;
    }
  }
}

function cellsLeft(camp) {
  let total = 0;
  for (const s of camp.ships) if (!s.sunk) total += s.size - s.hits;
  return total;
}

// La marée monte : +1 obus par joueur toutes les 8 salves (max +2).
// Garantit que la bataille converge, même à 8 camps qui s'arrosent.
function surgeBonus(state) {
  return Math.min(2, Math.floor(state.volley / 8));
}

function maxAimsNow(state, p) {
  return p.maxAims + surgeBonus(state);
}

function validAim(state, p, a) {
  if (!a || !Number.isInteger(a.g) || !Number.isInteger(a.c)) return false;
  const target = state.camps[a.g];
  if (!target || a.g === p.camp || !target.alive) return false;
  return a.c >= 0 && a.c < target.n * target.n && target.fired[a.c] === 0;
}

// Case de chasse « intelligente » : poursuite d'un navire touché (axe
// prioritaire), sinon damier, sinon n'importe quelle case libre.
// N'utilise QUE l'information publique (tirs + navires coulés).
function huntCell(rng, camp, excluded) {
  const n = camp.n;
  const taken = (i) => camp.fired[i] !== 0 || excluded.has(i);
  const hits = [];
  for (let i = 0; i < n * n; i++) {
    if (camp.fired[i] === 2 && !camp.ships[camp.cellShip[i]].sunk) hits.push(i);
  }
  if (hits.length) {
    const cand = [];
    for (const i of hits) {
      const r = Math.floor(i / n), c = i % n;
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
        const j = rr * n + cc;
        if (taken(j)) continue;
        const ro = r - dr, co = c - dc;
        const aligned = ro >= 0 && co >= 0 && ro < n && co < n && camp.fired[ro * n + co] === 2;
        cand.push({ j, w: aligned ? 4 : 1 });
      }
    }
    if (cand.length) {
      const tot = cand.reduce((s, x) => s + x.w, 0);
      let roll = rng.next() * tot;
      for (const x of cand) { roll -= x.w; if (roll <= 0) return x.j; }
      return cand[0].j;
    }
  }
  const pool = [];
  for (let i = 0; i < n * n; i++) {
    if (!taken(i) && (Math.floor(i / n) + (i % n)) % 2 === 0) pool.push(i);
  }
  if (pool.length) return rng.pick(pool);
  const rest = [];
  for (let i = 0; i < n * n; i++) if (!taken(i)) rest.push(i);
  return rest.length ? rng.pick(rest) : -1;
}

// Tir automatique (chrono écoulé) : cible le camp le plus faible.
function autoAim(state, p, existing) {
  const targets = state.camps
    .filter((c) => c.alive && c.idx !== p.camp)
    .sort((a, b) => cellsLeft(a) - cellsLeft(b));
  for (const t of targets) {
    const excluded = new Set(existing.filter((x) => x.g === t.idx).map((x) => x.c));
    const c = huntCell(state.rng, t, excluded);
    if (c >= 0) return { g: t.idx, c };
  }
  return null;
}

function startAim(state) {
  state.phase = 'aim';
  state.phaseT = AIM_T;
  state.evq.push({ e: 'salvo', n: state.volley + 1 });
}

function resolveVolley(state) {
  state.volley++;
  state.evq.push({ e: 'volley', n: state.volley });
  // Collecte de tous les tirs sur l'état PRÉ-salve (simultanéité).
  const shots = [];
  for (const pid of state.pids) {
    const p = state.players[pid];
    if (!state.camps[p.camp].alive) { p.aims = []; continue; }
    const valid = p.aims.filter((a) => validAim(state, p, a)).slice(0, p.maxAims);
    while (valid.length < p.maxAims) {
      const a = autoAim(state, p, valid);
      if (!a) break;
      valid.push(a);
    }
    for (const a of valid) shots.push({ pid, g: a.g, c: a.c });
    p.aims = [];
  }
  // Application : une case navire = un seul dégât, mais chaque tireur
  // qui a visé juste est crédité (tirs strictement simultanés).
  for (const s of shots) {
    const camp = state.camps[s.g];
    const p = state.players[s.pid];
    p.stats.shots++;
    const si = camp.cellShip[s.c];
    if (si >= 0) {
      p.stats.hits++;
      if (camp.fired[s.c] !== 2) {
        camp.fired[s.c] = 2;
        const ship = camp.ships[si];
        ship.hits++;
        if (ship.hits >= ship.size) {
          ship.sunk = true;
          p.stats.sunk++;
          state.evq.push({ e: 'sunk', g: s.g, size: ship.size, pid: s.pid });
        }
      }
      state.evq.push({ e: 'shot', g: s.g, c: s.c, r: 'h', pid: s.pid });
    } else {
      if (camp.fired[s.c] === 0) camp.fired[s.c] = 1;
      state.evq.push({ e: 'shot', g: s.g, c: s.c, r: 'm', pid: s.pid });
    }
  }
  for (const camp of state.camps) {
    if (camp.alive && camp.ships.length && camp.ships.every((sh) => sh.sunk)) {
      camp.alive = false;
      camp.deadAt = state.volley;
      state.evq.push({ e: 'dead', g: camp.idx });
    }
  }
}

export function onInput(state, pid, d) {
  // Fallback harnais : un tap brut arme une case libre pseudo-aléatoire.
  if (!d || typeof d.tx !== 'number' || !Number.isFinite(d.tx)
    || typeof d.ty !== 'number' || !Number.isFinite(d.ty)) return;
  const p = state.players[pid];
  if (!p || state.phase !== 'aim' || state.done) return;
  if (!state.camps[p.camp]?.alive) return;
  const targets = state.camps.filter((c) => c.alive && c.idx !== p.camp);
  if (!targets.length) return;
  const t = targets[Math.abs(Math.floor(d.tx)) % targets.length];
  const total = t.n * t.n;
  const start = Math.abs(Math.floor(d.tx) * 7 + Math.floor(d.ty) * 13) % total;
  for (let k = 0; k < total; k++) {
    const c = (start + k) % total;
    if (t.fired[c] !== 0) continue;
    if (!p.aims.some((x) => x.g === t.idx && x.c === c)) {
      p.aims.push({ g: t.idx, c });
      if (p.aims.length > p.maxAims) p.aims.shift();
    }
    return;
  }
}

export function onAction(state, pid, a, d) {
  const p = state.players[pid];
  if (!p || state.done) return;
  const camp = state.camps[p.camp];
  if (a === 'shuffle') {
    if (state.phase !== 'place' || !camp || camp.shuffleCd > 0) return;
    camp.shuffleCd = 0.3;
    placeFleet(state.rng, camp);
    state.evq.push({ e: 'place', g: camp.idx });
  } else if (a === 'aim') {
    if (state.phase !== 'aim' || !camp?.alive || !d) return;
    const g = Math.round(Number(d.g));
    const c = Math.round(Number(d.c));
    if (!Number.isFinite(g) || !Number.isFinite(c)) return;
    if (!validAim(state, p, { g, c })) return;
    const ix = p.aims.findIndex((x) => x.g === g && x.c === c);
    if (ix >= 0) { p.aims.splice(ix, 1); return; } // re-tap : désarme
    p.aims.push({ g, c });
    if (p.aims.length > p.maxAims) p.aims.shift();
  }
}

export function tick(state, dt) {
  const evs = state.evq;
  state.evq = [];
  state.tick++;
  state.simT += dt;
  if (state.done) return evs;

  if (state.phase === 'place') {
    state.phaseT -= dt;
    for (const camp of state.camps) camp.shuffleCd = Math.max(0, camp.shuffleCd - dt);
    if (state.phaseT <= 0) startAim(state);
  } else if (state.phase === 'aim') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) {
      resolveVolley(state);
      state.phase = 'fire';
      state.phaseT = FIRE_T;
    }
  } else if (state.phase === 'fire') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) {
      const alive = state.camps.filter((c) => c.alive);
      if (alive.length <= 1 || state.volley >= MAX_VOLLEYS) {
        state.phase = 'end';
        state.phaseT = END_T;
      } else {
        startAim(state);
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
  const myCamp = p ? p.camp : -1;
  const playing = p && state.camps[myCamp].alive;
  const key = playing ? myCamp : 'spec'; // les éliminés voient tout
  if (state._viewTick !== state.tick) {
    state._views.clear();
    state._viewTick = state.tick;
  }
  if (state._views.has(key)) return state._views.get(key);

  const camps = state.camps.map((c) => {
    const full = !playing || c.idx === myCamp;
    let grid = '';
    for (let i = 0; i < c.n * c.n; i++) {
      const f = c.fired[i];
      const si = c.cellShip[i];
      const sunk = si >= 0 && c.ships[si].sunk;
      if (sunk) grid += 'X';
      else if (f === 2) grid += 'x';
      else if (f === 1) grid += 'o';
      else if (si >= 0 && full) grid += 'S';
      else grid += '.';
    }
    return {
      n: c.n,
      alive: c.alive ? 1 : 0,
      grid,
      ships: c.ships.map((s) => (s.sunk ? -s.size : s.size)),
      left: cellsLeft(c),
    };
  });
  const aims = {};
  if (playing) {
    for (const mate of state.camps[myCamp].members) {
      const mp = state.players[mate];
      if (mp.aims.length) aims[mate] = mp.aims.map((a) => ({ g: a.g, c: a.c }));
    }
  }
  const v = {
    phase: state.phase,
    tl: Math.round(Math.max(0, state.phaseT) * 10) / 10,
    volley: state.volley,
    maxV: MAX_VOLLEYS,
    camps,
    aims,
  };
  state._views.set(key, v);
  return v;
}

export function results(state) {
  const { cfg } = state;
  const scoreOf = (pid) => {
    const pl = state.players[pid];
    const camp = state.camps[pl.camp];
    return pl.stats.hits * 10 + pl.stats.sunk * 15 + (camp.alive ? 40 : camp.deadAt);
  };
  const aliveCamps = state.camps.filter((c) => c.alive);
  let winTeams;
  if (aliveCamps.length) {
    const best = Math.max(...aliveCamps.map((c) => cellsLeft(c)));
    winTeams = aliveCamps.filter((c) => cellsLeft(c) === best).map((c) => c.idx);
  } else {
    const last = Math.max(...state.camps.map((c) => c.deadAt));
    winTeams = state.camps.filter((c) => c.deadAt === last).map((c) => c.idx);
  }
  const allTied = winTeams.length === cfg.teams.length && cfg.teams.length > 1;
  const winners = allTied ? [] : winTeams.flatMap((t) => cfg.teams[t]);

  const ranking = state.pids
    .map((pid) => {
      const s = state.players[pid].stats;
      return { pid, score: scoreOf(pid), label: `${s.hits} 🎯 · ${s.sunk} ⚓` };
    })
    .sort((a, b) => b.score - a.score);

  const titles = [];
  const all = state.pids.map((pid) => ({
    pid,
    s: state.players[pid].stats,
    camp: state.camps[state.players[pid].camp],
  }));
  const top = (fn) => all.slice().sort((a, b) => fn(b) - fn(a))[0];
  const sniper = top((x) => (x.s.shots >= 5 ? x.s.hits / x.s.shots : -1));
  if (sniper.s.shots >= 5 && sniper.s.hits / sniper.s.shots >= 0.5) {
    titles.push({ pid: sniper.pid, emoji: '🎯', text: `Sniper des mers : ${Math.round((sniper.s.hits / sniper.s.shots) * 100)} % au but` });
  }
  const fossoyeur = top((x) => x.s.sunk);
  if (fossoyeur.s.sunk >= 2) {
    titles.push({ pid: fossoyeur.pid, emoji: '⚓', text: `Fossoyeur des flots : ${fossoyeur.s.sunk} navires coulés` });
  }
  const arroseur = top((x) => x.s.shots - x.s.hits);
  if (arroseur.s.shots - arroseur.s.hits >= 8) {
    titles.push({ pid: arroseur.pid, emoji: '💦', text: `Arroseur arrosé : ${arroseur.s.shots - arroseur.s.hits} plouf dans l'eau` });
  }
  const bulle = all.find((x) => !x.camp.alive && x.s.shots >= 3 && x.s.hits === 0);
  if (bulle) {
    titles.push({ pid: bulle.pid, emoji: '🫧', text: 'Coulé sans avoir touché personne' });
  }
  if (!titles.length) {
    titles.push({ pid: ranking[0].pid, emoji: '🚢', text: 'Loup de mer de la Kermesse' });
  }
  return { ranking, winners, titles };
}

// ── Bot : mélange parfois au placement, chasse en damier + poursuite ────

export function botAct(state, pid, mind, api) {
  const p = state.players[pid];
  if (!p || state.done) return;
  const camp = state.camps[p.camp];
  const { p: pers, rng, mem } = mind;

  if (state.phase === 'place') {
    if (mem.k !== 'place') {
      mem.k = 'place';
      mem.shuffles = rng.chance(0.5) ? 1 + (rng.chance(0.3) ? 1 : 0) : 0;
    }
    if (mem.shuffles > 0 && camp.shuffleCd <= 0 && rng.chance(0.15)) {
      mem.shuffles--;
      api.act('shuffle');
    }
    return;
  }
  if (state.phase !== 'aim' || !camp.alive) return;
  if (p.aims.length >= p.maxAims) return;

  const key = `v${state.volley}-${p.aims.length}`;
  if (mem.k !== key) {
    mem.k = key;
    mem.at = state.simT;
    mem.delay = 0.6 + rng.next() * 2.5 * pers.pace;
  }
  if (state.simT - mem.at < mem.delay) return;

  const targets = state.camps.filter((c) => c.alive && c.idx !== p.camp);
  if (!targets.length) return;
  const focused = rng.chance(0.3 + pers.skill * 0.6);
  const target = focused
    ? targets.slice().sort((a, b) => cellsLeft(a) - cellsLeft(b))[0]
    : rng.pick(targets);
  const excluded = new Set(p.aims.filter((x) => x.g === target.idx).map((x) => x.c));
  let c;
  if (rng.chance(0.3 * (1 - pers.skill))) {
    const free = [];
    for (let i = 0; i < target.n * target.n; i++) {
      if (target.fired[i] === 0 && !excluded.has(i)) free.push(i);
    }
    c = free.length ? rng.pick(free) : -1;
  } else {
    c = huntCell(rng, target, excluded);
  }
  if (c >= 0) api.act('aim', { g: target.idx, c });
}
