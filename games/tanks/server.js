// TANKS : simulation serveur. Des blindes vus du dessus dans une arene a
// murs, des obus qui rebondissent, trois vies chacun. Le serveur fait
// autorite sur tout : deplacement, collisions, rebonds, degats.

import {
  CASE, COLS, LIGNES, MONDE_W, MONDE_H, carte, carteHasard, estMur,
} from '../../shared/tanks.js';

const R_CHAR = 17;          // rayon du char
const R_OBUS = 5;
const V_CHAR = 132;         // unites par seconde
const V_OBUS = 300;
const VIE_OBUS = 5.5;       // secondes avant que l'obus s'eteigne
const MAX_OBUS = 5;         // obus simultanes par char
const RESPAWN = 2.6;
const INVUL = 1.4;          // secondes d'invulnerabilite a la reapparition
const PRE_T = 2.4;
const END_T = 3.4;
const TOUR_V = 7.5;         // vitesse de rotation de la tourelle (rad/s)

const pick = (v, allowed, def) => (allowed.includes(v) ? v : def);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const norm = (a) => {
  let x = a % (Math.PI * 2);
  if (x > Math.PI) x -= Math.PI * 2;
  if (x < -Math.PI) x += Math.PI * 2;
  return x;
};

export function createState(cfg) {
  const st = cfg.settings || {};
  const asym = cfg.format.kind === 'asym';
  const lourd = asym ? cfg.teams[0][0] : null;
  const carteId = pick(st.carte, ['arene', 'labyrinthe', 'bastion', 'hasard'], 'arene');
  const plan = carteId === 'hasard' ? carteHasard(cfg.rng) : carte(carteId);
  const rules = {
    carte: carteId,
    vies: pick(st.vies, [1, 3, 5], 3),
    duree: pick(st.duree, [90, 150, 240], 150),
    recharge: pick(st.recharge, [1.2, 2, 3], 2),
    rebonds: pick(st.rebonds, [1, 3, 5], 3),
  };

  const state = {
    cfg,
    rng: cfg.rng,
    asym, lourd,
    rules,
    plan,
    grille: plan.grille,
    chars: {},
    pids: [],
    obus: [],
    obusId: 1,
    reste: rules.duree,
    phase: 'pre',
    phaseT: PRE_T,
    simT: 0,
    done: false,
    fin: null,
    campsVivants: [],
    evq: [],
    tick: 0, _viewTick: -1, _view: null,
  };

  // Les departs sont distribues camp par camp : les equipiers ensemble.
  const ordre = [];
  const restant = cfg.teams.map((t) => [...t]);
  let encore = true;
  while (encore) {
    encore = false;
    for (const t of restant) if (t.length) { ordre.push(t.shift()); encore = true; }
  }
  const departs = plan.departs;
  ordre.forEach((pid, i) => {
    const camp = cfg.teams.findIndex((t) => t.includes(pid));
    const [cx, cy] = departs[i % departs.length];
    const solo = pid === lourd;
    state.pids.push(pid);
    state.chars[pid] = {
      pid, camp, solo,
      x: cx * CASE + CASE / 2,
      y: cy * CASE + CASE / 2,
      a: 0, ta: 0,
      mx: 0, my: 0,
      vies: solo ? rules.vies + 2 : rules.vies,
      alive: true,
      out: false,
      recharge: 0,
      respawn: 0,
      invul: INVUL,
      depart: i % departs.length,
      stats: { kills: 0, morts: 0, tirs: 0, touches: 0, rebonds: 0, suicides: 0, ricochets: 0 },
    };
  });
  state.campsVivants = [...new Set(cfg.teams.map((t, i) => i))];
  return state;
}

// ── Terrain ────────────────────────────────────────────────────────────

const mur = (state, cx, cy) => estMur(state.grille, cx, cy);
const murEn = (state, x, y) => mur(state, Math.floor(x / CASE), Math.floor(y / CASE));

// Repousse un cercle hors des cases pleines qu'il chevauche.
function degage(state, ent, r) {
  for (let k = 0; k < 3; k++) {
    let bouge = false;
    const cx0 = Math.floor((ent.x - r) / CASE), cx1 = Math.floor((ent.x + r) / CASE);
    const cy0 = Math.floor((ent.y - r) / CASE), cy1 = Math.floor((ent.y + r) / CASE);
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        if (!mur(state, cx, cy)) continue;
        const bx = cx * CASE, by = cy * CASE;
        const px = clamp(ent.x, bx, bx + CASE);
        const py = clamp(ent.y, by, by + CASE);
        const dx = ent.x - px, dy = ent.y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 >= r * r) continue;
        const d = Math.sqrt(d2) || 0.0001;
        if (d2 < 0.0001) {
          // Centre pile dans le mur : on sort par le cote le plus proche.
          const gx = ent.x - (bx + CASE / 2), gy = ent.y - (by + CASE / 2);
          if (Math.abs(gx) > Math.abs(gy)) ent.x += Math.sign(gx || 1) * (CASE / 2 + r);
          else ent.y += Math.sign(gy || 1) * (CASE / 2 + r);
        } else {
          ent.x += (dx / d) * (r - d);
          ent.y += (dy / d) * (r - d);
        }
        bouge = true;
      }
    }
    if (!bouge) break;
  }
  ent.x = clamp(ent.x, r, MONDE_W - r);
  ent.y = clamp(ent.y, r, MONDE_H - r);
}

// ── Obus ───────────────────────────────────────────────────────────────

function tirer(state, c) {
  if (!c.alive || c.recharge > 0) return;
  const miens = state.obus.filter((o) => o.pid === c.pid).length;
  if (miens >= MAX_OBUS) return;
  c.recharge = state.rules.recharge;
  c.stats.tirs++;
  const d = c.solo ? R_CHAR + 12 : R_CHAR + 9;
  const o = {
    id: state.obusId++,
    pid: c.pid,
    camp: c.camp,
    x: c.x + Math.cos(c.ta) * d,
    y: c.y + Math.sin(c.ta) * d,
    vx: Math.cos(c.ta) * V_OBUS * (c.solo ? 1.15 : 1),
    vy: Math.sin(c.ta) * V_OBUS * (c.solo ? 1.15 : 1),
    reb: 0,
    t: VIE_OBUS,
    perce: c.solo ? 1 : 0,
    gros: c.solo ? 1 : 0,
  };
  // Un obus qui nait dans un mur (char colle a la paroi) part du centre.
  if (murEn(state, o.x, o.y)) { o.x = c.x; o.y = c.y; }
  state.obus.push(o);
  state.evq.push({ e: 'tir', pid: c.pid, x: o.x, y: o.y, a: c.ta });
}

// Avance un obus, gere les rebonds. Retourne false s'il doit disparaitre.
function avanceObus(state, o, dt) {
  const pas = Math.max(1, Math.ceil((Math.hypot(o.vx, o.vy) * dt) / 8));
  const sdt = dt / pas;
  for (let i = 0; i < pas; i++) {
    const nx = o.x + o.vx * sdt;
    const ny = o.y + o.vy * sdt;
    let tape = false;
    if (murEn(state, nx, o.y)) { o.vx = -o.vx; tape = true; }
    if (murEn(state, o.x, ny)) { o.vy = -o.vy; tape = true; }
    if (tape) {
      o.reb++;
      state.evq.push({ e: 'reb', x: o.x, y: o.y });
      const tireur = state.chars[o.pid];
      if (tireur) tireur.stats.rebonds++;
      if (o.reb > state.rules.rebonds) return false;
      continue;
    }
    o.x = nx;
    o.y = ny;
    // Diagonale exacte dans un coin : on ne laisse rien traverser.
    if (murEn(state, o.x, o.y)) {
      o.vx = -o.vx;
      o.vy = -o.vy;
      o.reb++;
      if (o.reb > state.rules.rebonds) return false;
    }
  }
  return true;
}

function touche(state, c, o) {
  c.invul = 0;
  c.vies--;
  c.alive = false;
  c.stats.morts++;
  const tireur = state.chars[o.pid];
  if (tireur) {
    if (tireur === c) tireur.stats.suicides++;
    else { tireur.stats.kills++; tireur.stats.touches++; if (o.reb > 0) tireur.stats.ricochets++; }
  }
  state.evq.push({ e: 'boum', pid: c.pid, x: c.x, y: c.y, par: o.pid, reb: o.reb });
  if (c.vies <= 0) {
    c.out = true;
    state.evq.push({ e: 'out', pid: c.pid });
    majCamps(state);
  } else {
    c.respawn = RESPAWN;
  }
}

// Reapparition : le depart le plus loin des adversaires encore en vie.
function reapparait(state, c) {
  const departs = state.plan.departs;
  let best = null, bestD = -1;
  for (let i = 0; i < departs.length; i++) {
    const [cx, cy] = departs[i];
    const x = cx * CASE + CASE / 2, y = cy * CASE + CASE / 2;
    let d = 1e9;
    for (const pid of state.pids) {
      const e = state.chars[pid];
      if (!e.alive || e.camp === c.camp) continue;
      d = Math.min(d, Math.hypot(e.x - x, e.y - y));
    }
    if (d === 1e9) d = 1e6 - i;
    if (d > bestD) { bestD = d; best = { x, y, i }; }
  }
  c.x = best.x;
  c.y = best.y;
  c.alive = true;
  c.invul = INVUL;
  c.recharge = Math.min(c.recharge, 0.6);
  c.mx = 0;
  c.my = 0;
  state.evq.push({ e: 'pop', pid: c.pid, x: c.x, y: c.y });
}

function majCamps(state) {
  const camps = new Set();
  for (const pid of state.pids) if (!state.chars[pid].out) camps.add(state.chars[pid].camp);
  state.campsVivants = [...camps];
}

function finPartie(state, raison) {
  if (state.phase === 'fin') return;
  state.fin = raison;
  state.phase = 'fin';
  state.phaseT = END_T;
  state.evq.push({ e: 'fin', r: raison });
}

// ── Entrees ────────────────────────────────────────────────────────────

export function onInput(state, pid, d) {
  const c = state.chars[pid];
  if (!c || state.done) return;
  if (!d || typeof d !== 'object') return;
  // Le harnais de test envoie parfois des taps : on s'en sert comme cap.
  if (typeof d.tx === 'number' && Number.isFinite(d.tx)) {
    const a = ((d.tx % 360) / 360) * Math.PI * 2;
    c.mx = Math.cos(a);
    c.my = Math.sin(a);
    return;
  }
  const mx = Number(d.mx), my = Number(d.my);
  if (!Number.isFinite(mx) || !Number.isFinite(my)) return;
  const len = Math.hypot(mx, my);
  const k = len > 1 ? 1 / len : 1;
  c.mx = clamp(mx * k, -1, 1);
  c.my = clamp(my * k, -1, 1);
}

export function onAction(state, pid, a, d) {
  const c = state.chars[pid];
  if (!c || state.done || typeof a !== 'string') return;
  if (a === 'fire') {
    if (state.phase === 'jeu') tirer(state, c);
    return;
  }
  // Visee a la souris sur PC : le client envoie l'angle voulu.
  if (a === 'aim' && d && Number.isFinite(Number(d.a))) {
    c.viseur = norm(Number(d.a));
    c.viseurT = state.simT;
  }
}

// ── Boucle ─────────────────────────────────────────────────────────────

export function tick(state, dt) {
  const evs = state.evq;
  state.evq = [];
  state.tick++;
  state.simT += dt;
  if (state.done) return evs;

  if (state.phase === 'pre') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) { state.phase = 'jeu'; state.evq.push({ e: 'go' }); }
    return evs;
  }
  if (state.phase === 'fin') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) state.done = true;
    return evs;
  }

  state.reste = Math.max(0, state.reste - dt);

  // Chars.
  for (const pid of state.pids) {
    const c = state.chars[pid];
    if (c.out) continue;
    if (c.recharge > 0) c.recharge = Math.max(0, c.recharge - dt);
    if (!c.alive) {
      c.respawn -= dt;
      if (c.respawn <= 0) reapparait(state, c);
      continue;
    }
    if (c.invul > 0) c.invul = Math.max(0, c.invul - dt);

    const v = V_CHAR * (c.solo ? 0.82 : 1);
    const len = Math.hypot(c.mx, c.my);
    if (len > 0.12) {
      c.x += (c.mx / len) * v * dt * Math.min(1, len);
      c.y += (c.my / len) * v * dt * Math.min(1, len);
      c.a = Math.atan2(c.my, c.mx);
      degage(state, c, R_CHAR);
    }
    // La tourelle suit la direction de marche, ou la souris sur PC.
    const cible = (c.viseur != null && state.simT - c.viseurT < 1.5) ? c.viseur
      : (len > 0.12 ? c.a : c.ta);
    const d = norm(cible - c.ta);
    const pas = TOUR_V * dt;
    c.ta = norm(c.ta + clamp(d, -pas, pas));
  }

  // Obus.
  for (let i = state.obus.length - 1; i >= 0; i--) {
    const o = state.obus[i];
    o.t -= dt;
    if (o.t <= 0 || !avanceObus(state, o, dt)) {
      state.evq.push({ e: 'fin-obus', x: o.x, y: o.y });
      state.obus.splice(i, 1);
      continue;
    }
    const rayon = R_OBUS + (o.gros ? 3 : 0);
    for (const pid of state.pids) {
      const c = state.chars[pid];
      if (!c.alive || c.invul > 0 || c.out) continue;
      // Jamais les coequipiers. Son propre obus, seulement apres un rebond.
      if (c.pid === o.pid) { if (!o.reb) continue; } else if (c.camp === o.camp) continue;
      if (Math.hypot(c.x - o.x, c.y - o.y) > R_CHAR + rayon) continue;
      touche(state, c, o);
      if (o.perce > 0) { o.perce--; continue; }
      state.obus.splice(i, 1);
      break;
    }
  }

  // Fin de partie.
  if (state.campsVivants.length <= 1 && state.cfg.teams.length > 1) {
    finPartie(state, 'dernier');
  } else if (state.campsVivants.length === 0) {
    finPartie(state, 'dernier');
  } else if (state.reste <= 0) {
    finPartie(state, 'temps');
  }
  return evs;
}

export function isOver(state) {
  return state.done;
}

// ── Vue ────────────────────────────────────────────────────────────────
// Le plan du terrain n'est envoye qu'au debut (et dans la vue complete,
// pour ceux qui arrivent en cours de route) : le client le garde.

function corps(state) {
  return {
    phase: state.phase,
    reste: Math.round(state.reste * 10) / 10,
    duree: state.rules.duree,
    pre: state.phase === 'pre' ? Math.round(Math.max(0, state.phaseT) * 10) / 10 : 0,
    carte: state.rules.carte,
    nomCarte: state.plan.nom,
    rebonds: state.rules.rebonds,
    recharge: state.rules.recharge,
    viesMax: state.rules.vies,
    lourd: state.lourd,
    fin: state.fin,
    camps: state.campsVivants,
    chars: state.pids.map((pid) => {
      const c = state.chars[pid];
      return {
        id: pid,
        x: Math.round(c.x * 10) / 10,
        y: Math.round(c.y * 10) / 10,
        a: Math.round(c.a * 100) / 100,
        ta: Math.round(c.ta * 100) / 100,
        camp: c.camp,
        vies: c.vies,
        alive: c.alive ? 1 : 0,
        out: c.out ? 1 : 0,
        solo: c.solo ? 1 : 0,
        inv: c.invul > 0 ? 1 : 0,
        rc: Math.round(clamp(c.recharge / state.rules.recharge, 0, 1) * 100) / 100,
        resp: c.alive ? 0 : Math.round(Math.max(0, c.respawn) * 10) / 10,
        k: c.stats.kills,
      };
    }),
    obus: state.obus.map((o) => ({
      id: o.id,
      x: Math.round(o.x * 10) / 10,
      y: Math.round(o.y * 10) / 10,
      a: Math.round(Math.atan2(o.vy, o.vx) * 100) / 100,
      camp: o.camp,
      gros: o.gros,
    })),
  };
}

export function view(state) {
  if (state._viewTick === state.tick) return state._view;
  const v = corps(state);
  // Le plan circule pendant les premieres secondes, puis on l'economise.
  if (state.phase === 'pre' || state.simT < 3.5) v.grille = state.grille;
  state._view = v;
  state._viewTick = state.tick;
  return v;
}

// Vue complete : pour une reconnexion ou un spectateur en cours de partie.
export function fullView(state) {
  return { ...corps(state), grille: state.grille };
}

// ── Resultats ──────────────────────────────────────────────────────────

export function results(state) {
  const cfg = state.cfg;
  const c = (pid) => state.chars[pid];
  const scoreCamp = cfg.teams.map((team) => team.reduce((s, pid) => {
    const t = c(pid);
    return s + (t ? Math.max(0, t.vies) * 10 + t.stats.kills * 3 : 0);
  }, 0));
  const debout = cfg.teams.map((team) => team.some((pid) => c(pid) && !c(pid).out));
  let winTeams;
  const encore = debout.map((d, i) => (d ? i : -1)).filter((i) => i >= 0);
  if (encore.length === 1 && cfg.teams.length > 1) {
    winTeams = encore;
  } else {
    const cand = encore.length ? encore : cfg.teams.map((_, i) => i);
    const best = Math.max(...cand.map((i) => scoreCamp[i]));
    winTeams = cand.filter((i) => scoreCamp[i] === best);
  }
  const allTied = winTeams.length === cfg.teams.length && cfg.teams.length > 1;
  const winners = allTied ? [] : winTeams.flatMap((t) => cfg.teams[t]);

  const ranking = cfg.teams.flat().map((pid) => {
    const t = c(pid);
    const s = t ? t.stats.kills * 100 + Math.max(0, t.vies) : 0;
    return {
      pid,
      score: s,
      label: t ? `${t.stats.kills} élim. · ${Math.max(0, t.vies)} ❤` : '0',
    };
  }).sort((a, b) => b.score - a.score);

  const titles = [];
  const tous = state.pids.map((pid) => ({ pid, s: state.chars[pid].stats, v: state.chars[pid].vies }));
  const top = (fn) => tous.slice().sort((a, b) => fn(b) - fn(a))[0];
  if (tous.length) {
    const tueur = top((x) => x.s.kills);
    if (tueur.s.kills >= 1) titles.push({ pid: tueur.pid, emoji: '🎯', text: `Canonnier : ${tueur.s.kills} char(s) détruit(s)` });
    const ric = top((x) => x.s.ricochets);
    if (ric.s.ricochets >= 1) titles.push({ pid: ric.pid, emoji: '🪞', text: `Le mur est son ami : ${ric.s.ricochets} tir(s) par rebond` });
    const surv = top((x) => x.v);
    if (surv.v > 0) titles.push({ pid: surv.pid, emoji: '🛡️', text: `Blindage intact : ${surv.v} vie(s) restante(s)` });
    const boulet = top((x) => x.s.suicides);
    if (boulet.s.suicides >= 1) titles.push({ pid: boulet.pid, emoji: '🤦', text: `Tir retour : ${boulet.s.suicides} obus reçu(s) de sa propre main` });
    const gaspi = top((x) => x.s.tirs);
    if (gaspi.s.tirs >= 12) titles.push({ pid: gaspi.pid, emoji: '💨', text: `${gaspi.s.tirs} obus tirés, la ferraille coûte cher` });
  }
  if (!titles.length && tous.length) {
    titles.push({ pid: tous[0].pid, emoji: '🚜', text: 'A tenu le terrain' });
  }
  return { ranking, winners, titles };
}

// ── Forains ────────────────────────────────────────────────────────────
// Navigation par vague : un parcours en largeur depuis la case de la cible
// donne, pour chaque case, la distance jusqu'a elle. Le bot descend la
// pente. C'est simple, ca ne coute rien sur 11 x 9 cases, et ca ne se
// coince jamais dans un couloir.

function vague(state, cx, cy) {
  const d = new Int16Array(COLS * LIGNES).fill(-1);
  if (mur(state, cx, cy)) return d;
  const file = [cy * COLS + cx];
  d[cy * COLS + cx] = 0;
  for (let i = 0; i < file.length; i++) {
    const k = file[i];
    const x = k % COLS, y = (k / COLS) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= LIGNES) continue;
      const nk = ny * COLS + nx;
      if (d[nk] >= 0 || mur(state, nx, ny)) continue;
      d[nk] = d[k] + 1;
      file.push(nk);
    }
  }
  return d;
}

// Le trajet est-il degage entre deux points ?
function vue(state, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const n = Math.ceil(Math.hypot(dx, dy) / 10);
  for (let i = 1; i < n; i++) {
    if (murEn(state, x0 + (dx * i) / n, y0 + (dy * i) / n)) return false;
  }
  return true;
}

// Un obus parti a cet angle touche-t-il quelqu'un d'autre que les siens ?
function simuleTir(state, c, a, portee) {
  let x = c.x + Math.cos(a) * (R_CHAR + 10);
  let y = c.y + Math.sin(a) * (R_CHAR + 10);
  let vx = Math.cos(a), vy = Math.sin(a);
  let reb = 0;
  const pas = 9;
  for (let i = 0; i < portee; i++) {
    const nx = x + vx * pas, ny = y + vy * pas;
    let tape = false;
    if (murEn(state, nx, y)) { vx = -vx; tape = true; }
    if (murEn(state, x, ny)) { vy = -vy; tape = true; }
    if (tape) {
      if (++reb > state.rules.rebonds) return null;
      continue;
    }
    x = nx; y = ny;
    for (const pid of state.pids) {
      const e = state.chars[pid];
      if (!e.alive || e.out || e.invul > 0) continue;
      if (e.camp === c.camp && e.pid !== c.pid) continue;
      if (e.pid === c.pid && reb === 0) continue;
      if (Math.hypot(e.x - x, e.y - y) < R_CHAR + R_OBUS + 2) {
        return { pid, reb, ami: e.camp === c.camp };
      }
    }
  }
  return null;
}

export function botAct(state, pid, mind, api) {
  const c = state.chars[pid];
  if (!c || state.done || state.phase !== 'jeu' || !c.alive || c.out) return;
  const pers = mind.p, rng = mind.rng, mem = mind.mem;

  // Cible : l'adversaire vivant le plus proche.
  let cible = null, dmin = 1e9;
  for (const p of state.pids) {
    const e = state.chars[p];
    if (!e.alive || e.out || e.camp === c.camp) continue;
    const d = Math.hypot(e.x - c.x, e.y - c.y);
    if (d < dmin) { dmin = d; cible = e; }
  }
  if (!cible) { api.input({ mx: 0, my: 0 }); return; }

  // Navigation : on recalcule la carte de distances de temps en temps.
  const cx = Math.floor(c.x / CASE), cy = Math.floor(c.y / CASE);
  const tx = Math.floor(cible.x / CASE), ty = Math.floor(cible.y / CASE);
  if (!mem.d || mem.tx !== tx || mem.ty !== ty || state.simT - (mem.at || 0) > 0.7) {
    mem.d = vague(state, tx, ty);
    mem.tx = tx;
    mem.ty = ty;
    mem.at = state.simT;
  }
  const dist = mem.d;
  const ici = dist[cy * COLS + cx];
  let mx = 0, my = 0;
  // Distance de combat : on garde ses distances, on ne colle pas.
  const idealMin = 110 + (1 - pers.aggro) * 140;
  if (ici >= 0) {
    let best = ici, bx = 0, by = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= LIGNES) continue;
      const nd = dist[ny * COLS + nx];
      if (nd < 0) continue;
      if (dmin < idealMin ? nd > best : nd < best) { best = nd; bx = dx; by = dy; }
    }
    if (bx || by) {
      // On vise le centre de la case voisine : pas de frottement aux angles.
      const gx = (cx + bx) * CASE + CASE / 2 - c.x;
      const gy = (cy + by) * CASE + CASE / 2 - c.y;
      const l = Math.hypot(gx, gy) || 1;
      mx = gx / l;
      my = gy / l;
    }
  }
  // Un peu de vie : les bots frileux zigzaguent en recharge.
  if (c.recharge > 0.2 && rng.chance(pers.chaos * 0.25)) {
    const t = state.simT * 2 + (mind.seedA || 0);
    mx += Math.cos(t) * 0.5;
    my += Math.sin(t) * 0.5;
  }
  api.input({ mx: Math.round(mx * 100) / 100, my: Math.round(my * 100) / 100 });

  // Tir : direct d'abord, puis par rebond si le bot sait viser.
  if (c.recharge > 0) return;
  if (mem.pause && state.simT < mem.pause) return;
  const direct = Math.atan2(cible.y - c.y, cible.x - c.x);
  const clair = vue(state, c.x, c.y, cible.x, cible.y);
  const ecart = Math.abs(norm(direct - c.ta));
  const tolerance = 0.12 + (1 - pers.skill) * 0.22;

  if (clair && ecart < tolerance) {
    const r = simuleTir(state, c, c.ta, 90);
    if (r && !r.ami && r.pid !== c.pid) {
      api.act('fire');
      mem.pause = state.simT + 0.15 + (1 - pers.skill) * 0.9;
      return;
    }
  }
  // Tir par rebond : on balaie quelques angles et on garde le premier bon.
  if (!rng.chance(0.25 + pers.skill * 0.6)) return;
  const dep = rng.next() * Math.PI * 2;
  for (let i = 0; i < 24; i++) {
    const a = dep + (i / 24) * Math.PI * 2;
    if (Math.abs(norm(a - c.ta)) > tolerance) continue;
    const r = simuleTir(state, c, a, 110);
    if (r && !r.ami && r.pid !== c.pid) {
      api.act('fire');
      mem.pause = state.simT + 0.3 + (1 - pers.skill) * 1.2;
      return;
    }
  }
}
