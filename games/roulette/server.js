// ROULETTE : simulation serveur. Roulette francaise a un seul zero, avec le
// vrai tapis (pleins, chevaux, transversales, carres, sixains, colonnes,
// douzaines, chances simples), les maximums de table reglementaires et la
// regle du zero (partage, prison ou tout perdu).
// Le tour : on mise (12 s), le cylindre part deux secondes avant la fin,
// « rien ne va plus », la bille tombe deux secondes plus tard, on paie.
// Asym « Le Chef de Table » : il tient la banque et a droit a quelques
// coups de poignet pour faire sauter la bille d'une case.

import { ORDRE, couleur, mise, maximum, CHANCES_SIMPLES, JETONS } from '../../shared/roulette.js';

const LANCE_T = 2.0;        // le cylindre part quand il reste ca a miser
const RIEN_T = 2.0;         // « rien ne va plus » : la bille tourne encore
const PAIE_T = 4.6;         // on regarde ce qu'on a gagne ou perdu
const PRE_T = 2.2;          // presentation de la table
const END_T = 3.0;
const NUDGES = 3;           // coups de poignet du Chef de Table
const MIN_MISE = 1;

const pick = (v, allowed, def) => (allowed.includes(v) ? v : def);

export function createState(cfg) {
  const st = cfg.settings || {};
  const asym = cfg.format.kind === 'asym';
  const chef = asym ? cfg.teams[0][0] : null;
  const rules = {
    tours: pick(st.tours, [5, 10, 20, 40], 10),
    tapis: pick(st.tapis, [200, 500, 2000], 500),
    max: pick(st.max, [100, 350, 1000], 350),
    zero: pick(st.zero, ['partage', 'prison', 'perdu'], 'partage'),
    betT: pick(st.rythme, [8, 12, 20], 12),
  };

  const state = {
    cfg,
    rng: cfg.rng,
    asym, chef,
    rules,
    pids: [],
    players: {},
    banque: null,
    banque0: null,
    tour: 0,
    phase: 'pre',
    phaseT: PRE_T,
    res: null,
    hist: [],
    nudge: asym ? NUDGES : 0,
    nudged: 0,
    simT: 0,
    done: false,
    fin: null,
    evq: [],
    tick: 0, _viewTick: -1, _view: null,
  };

  for (const pid of cfg.teams.flat()) {
    if (pid === chef) continue;
    state.pids.push(pid);
    state.players[pid] = {
      pid,
      chips: rules.tapis,
      bets: {},          // cle -> montant
      hist: [],          // ordre de pose, pour ANNULER
      prison: {},        // cle -> montant emprisonne (regle du zero)
      last: {},          // mises du tour precedent, pour REJOUER
      ok: false,
      delta: 0,
      gains: [],         // detail du dernier tour
      stats: { jetons: 0, gagnes: 0, pleins: 0, plusGros: 0, secs: 0, zeros: 0, tours: 0 },
    };
  }
  if (asym) {
    state.banque = rules.tapis * Math.max(1, state.pids.length);
    state.banque0 = state.banque;
  }
  return state;
}

// ── Mises ──────────────────────────────────────────────────────────────

const engage = (p) => Object.values(p.bets).reduce((s, v) => s + v, 0);

const limite = (state, cle) => maximum(cle, state.rules.max);

// Pose `amt` jetons sur `cle`. Retourne le montant reellement pose.
function poser(state, p, cle, amt) {
  const m = mise(cle);
  if (!m || !Number.isFinite(amt) || amt <= 0) return 0;
  const dispo = p.chips - engage(p);
  const place = limite(state, cle) - (p.bets[cle] || 0);
  const pose = Math.floor(Math.min(amt, dispo, place));
  if (pose < MIN_MISE) return 0;
  p.bets[cle] = (p.bets[cle] || 0) + pose;
  p.hist.push({ cle, amt: pose });
  return pose;
}

function retirerTout(p) {
  p.bets = {};
  p.hist = [];
  // Les mises en prison ne se retirent pas : c'est le principe.
  for (const [cle, amt] of Object.entries(p.prison)) p.bets[cle] = amt;
}

function rejouer(state, p) {
  retirerTout(p);
  let n = 0;
  for (const [cle, amt] of Object.entries(p.last)) {
    if (p.prison[cle]) continue;
    if (poser(state, p, cle, amt) > 0) n++;
  }
  return n;
}

function doubler(state, p) {
  const copie = Object.entries(p.bets).filter(([cle]) => !p.prison[cle]);
  let n = 0;
  for (const [cle, amt] of copie) if (poser(state, p, cle, amt) > 0) n++;
  return n;
}

// ── Deroulement d'un tour ──────────────────────────────────────────────

function startTour(state) {
  state.tour++;
  state.res = null;
  state.nudged = 0;
  for (const pid of state.pids) {
    const p = state.players[pid];
    p.ok = false;
    p.delta = 0;
    p.gains = [];
    retirerTout(p);
  }
  state.phase = 'mise';
  state.phaseT = state.rules.betT;
  state.evq.push({ e: 'tour', n: state.tour });
}

function lancer(state) {
  state.phase = 'rien';
  state.phaseT = RIEN_T;
  // La bille est tiree maintenant : les mises sont deja fermees.
  state.res = ORDRE[state.rng.int(0, ORDRE.length - 1)];
  state.evq.push({ e: 'rien' });
}

// Coup de poignet du Chef de Table : la bille saute d'une case.
function poignet(state, dir) {
  if (state.phase !== 'rien' || state.nudge <= 0 || state.nudged) return;
  const i = ORDRE.indexOf(state.res);
  const j = (i + (dir < 0 ? -1 : 1) + ORDRE.length) % ORDRE.length;
  state.res = ORDRE[j];
  state.nudge--;
  state.nudged = 1;
  state.evq.push({ e: 'poignet', n: state.res });
}

// Reglement du tour : c'est ici que les jetons changent de main.
function payer(state) {
  const n = state.res;
  const zeroRule = state.rules.zero;
  let mouvementBanque = 0;

  for (const pid of state.pids) {
    const p = state.players[pid];
    const prisonAvant = { ...p.prison };
    p.prison = {};
    let delta = 0;
    p.gains = [];
    if (Object.keys(p.bets).length) p.stats.tours++;

    for (const [cle, amt] of Object.entries(p.bets)) {
      const m = mise(cle);
      if (!m) continue;
      const emprisonnee = prisonAvant[cle] === amt;
      const gagne = m.ns.includes(n);

      if (emprisonnee) {
        // Mise liberee : elle revient telle quelle si elle passe.
        if (n === 0) { p.prison[cle] = amt; p.gains.push({ cle, amt, r: 0, pris: 1 }); continue; }
        if (gagne) { p.gains.push({ cle, amt, r: 0, libre: 1 }); continue; }
        delta -= amt;
        p.gains.push({ cle, amt, r: -amt });
        continue;
      }

      if (gagne) {
        const gain = amt * m.pay;
        delta += gain;
        p.gains.push({ cle, amt, r: gain });
        p.stats.gagnes++;
        if (m.kind === 'plein') p.stats.pleins++;
        if (m.kind === 'simple') p.stats.secs++;
        continue;
      }

      // Perdue. Sauf chance simple sur le zero : la maison est polie.
      if (n === 0 && CHANCES_SIMPLES.has(cle)) {
        if (zeroRule === 'partage') {
          const rendu = Math.floor(amt / 2);
          delta -= amt - rendu;
          p.gains.push({ cle, amt, r: -(amt - rendu), partage: 1 });
          continue;
        }
        if (zeroRule === 'prison') {
          p.prison[cle] = amt;
          p.gains.push({ cle, amt, r: 0, pris: 1 });
          continue;
        }
      }
      delta -= amt;
      p.gains.push({ cle, amt, r: -amt });
    }

    p.chips += delta;
    p.delta = delta;
    mouvementBanque -= delta;
    p.last = { ...p.bets };
    if (delta > p.stats.plusGros) p.stats.plusGros = delta;
    if (n === 0) p.stats.zeros++;
    if (delta !== 0) state.evq.push({ e: 'paie', pid, d: delta });
  }

  if (state.banque != null) state.banque += mouvementBanque;
  state.hist.unshift(n);
  if (state.hist.length > 24) state.hist.pop();
  state.phase = 'paie';
  state.phaseT = PAIE_T;
  state.evq.push({ e: 'bille', n, c: couleur(n) });
}

function finPartie(state, raison) {
  state.fin = raison;
  state.phase = 'fin';
  state.phaseT = END_T;
  state.evq.push({ e: 'fin', r: raison });
}

// Tout le monde a valide sa mise : on lance sans attendre le chrono.
function tousPrets(state) {
  const actifs = state.pids.filter((pid) => state.players[pid].chips > 0);
  return actifs.length > 0 && actifs.every((pid) => state.players[pid].ok);
}

// ── Entrees ────────────────────────────────────────────────────────────

export function onInput(state, pid, d) {
  // Repli du harnais de test : un tap brut devient une mise plausible.
  if (!d || typeof d.tx !== 'number' || !Number.isFinite(d.tx)) return;
  if (state.phase !== 'mise') return;
  const p = state.players[pid];
  if (!p) return;
  const bande = Math.floor((((d.tx % 900) + 900) % 900) / 100); // 0..8
  const cles = ['rouge', 'noir', 'pair', 'impair', 'manque', 'passe', 'dz:1', 'col:2'];
  if (bande >= cles.length) { onAction(state, pid, 'pret'); return; }
  onAction(state, pid, 'mise', { k: cles[bande], v: JETONS[bande % JETONS.length] });
}

export function onAction(state, pid, a, d) {
  if (state.done || typeof a !== 'string') return;

  // Le Chef de Table ne mise pas : il tient la banque et le poignet.
  if (state.chef && pid === state.chef) {
    if (a === 'poignet') poignet(state, d && d.dir < 0 ? -1 : 1);
    return;
  }

  const p = state.players[pid];
  if (!p) return;

  if (a === 'mise') {
    if (state.phase !== 'mise' || p.ok) return;
    const cle = d && typeof d.k === 'string' ? d.k : null;
    const v = d && Number.isFinite(d.v) ? Math.floor(d.v) : 0;
    if (!cle || !JETONS.includes(v)) return;
    const pose = poser(state, p, cle, v);
    if (pose > 0) {
      p.stats.jetons++;
      state.evq.push({ e: 'jeton', pid, k: cle, v: pose });
    } else {
      state.evq.push({ e: 'refus', pid, k: cle });
    }
    return;
  }
  if (a === 'annuler') {
    if (state.phase !== 'mise' || p.ok) return;
    const last = p.hist.pop();
    if (!last) return;
    p.bets[last.cle] -= last.amt;
    if (p.bets[last.cle] <= 0) delete p.bets[last.cle];
    state.evq.push({ e: 'annule', pid });
    return;
  }
  if (a === 'effacer') {
    if (state.phase !== 'mise' || p.ok) return;
    retirerTout(p);
    state.evq.push({ e: 'annule', pid });
    return;
  }
  if (a === 'doubler') {
    if (state.phase !== 'mise' || p.ok) return;
    if (doubler(state, p)) state.evq.push({ e: 'jeton', pid, k: null, v: 0 });
    return;
  }
  if (a === 'rejouer') {
    if (state.phase !== 'mise' || p.ok) return;
    if (rejouer(state, p)) state.evq.push({ e: 'rejoue', pid });
    return;
  }
  if (a === 'pret') {
    if (state.phase !== 'mise') return;
    p.ok = !p.ok;
    if (p.ok) state.evq.push({ e: 'pret', pid });
    return;
  }
}

// ── Boucle ─────────────────────────────────────────────────────────────

export function tick(state, dt) {
  const evs = state.evq;
  state.evq = [];
  state.tick++;
  state.simT += dt;
  if (state.done) return evs;

  state.phaseT -= dt;

  if (state.phase === 'pre') {
    if (state.phaseT <= 0) startTour(state);
  } else if (state.phase === 'mise') {
    // Tout le monde a valide : on n'attend pas le chrono pour lancer.
    if (state.phaseT > LANCE_T && tousPrets(state)) state.phaseT = LANCE_T;
    if (state.phaseT <= 0) lancer(state);
  } else if (state.phase === 'rien') {
    if (state.phaseT <= 0) payer(state);
  } else if (state.phase === 'paie') {
    if (state.phaseT <= 0) {
      if (state.banque != null && state.banque <= 0) finPartie(state, 'banque');
      else if (state.tour >= state.rules.tours) finPartie(state, 'tours');
      else if (state.pids.every((pid) => state.players[pid].chips <= 0)) finPartie(state, 'ruine');
      else startTour(state);
    }
  } else if (state.phase === 'fin') {
    if (state.phaseT <= 0) state.done = true;
  }
  return evs;
}

export function isOver(state) {
  return state.done;
}

// ── Vue ────────────────────────────────────────────────────────────────
// Aucun secret a la roulette : les jetons sont sur le tapis, tout le monde
// les voit. Une seule vue, mise en cache par tick.

export function view(state) {
  if (state._viewTick === state.tick) return state._view;

  const players = {};
  for (const pid of state.pids) {
    const p = state.players[pid];
    players[pid] = {
      chips: p.chips,
      engage: engage(p),
      ok: p.ok ? 1 : 0,
      delta: p.delta,
      bets: Object.entries(p.bets).map(([k, a]) => ({ k, a, p: p.prison[k] ? 1 : 0 })),
      gains: state.phase === 'paie' ? p.gains : [],
    };
  }

  const tlMax = state.phase === 'mise' ? state.rules.betT
    : state.phase === 'rien' ? RIEN_T
      : state.phase === 'paie' ? PAIE_T
        : state.phase === 'pre' ? PRE_T : END_T;

  state._view = {
    phase: state.phase,
    tl: Math.round(Math.max(0, state.phaseT) * 100) / 100,
    tlMax,
    lance: state.phase === 'mise' && state.phaseT <= LANCE_T ? 1 : 0,
    tour: state.tour,
    tours: state.rules.tours,
    res: state.phase === 'mise' || state.phase === 'pre' ? null : state.res,
    hist: state.hist.slice(0, 14),
    zero: state.rules.zero,
    max: state.rules.max,
    chipVals: JETONS,
    chef: state.chef,
    banque: state.banque,
    nudge: state.nudge,
    nudged: state.nudged,
    fin: state.fin,
    players,
  };
  state._viewTick = state.tick;
  return state._view;
}

// ── Resultats ──────────────────────────────────────────────────────────

export function results(state) {
  const cfg = state.cfg;
  const avoir = (pid) => (pid === state.chef ? state.banque : (state.players[pid] ? state.players[pid].chips : 0));
  const teamScore = cfg.teams.map((team) => team.reduce((s, pid) => s + avoir(pid), 0));
  const best = Math.max(...teamScore);
  const winTeams = teamScore.map((s, t) => [s, t]).filter(([s]) => s === best).map(([, t]) => t);
  const allTied = winTeams.length === cfg.teams.length && cfg.teams.length > 1;
  const winners = allTied ? [] : winTeams.flatMap((t) => cfg.teams[t]);

  const ranking = cfg.teams.flat()
    .map((pid) => ({ pid, score: avoir(pid), label: `${avoir(pid)} 🪙` }))
    .sort((a, b) => b.score - a.score);

  const titles = [];
  const tous = state.pids.map((pid) => ({ pid, s: state.players[pid].stats, c: state.players[pid].chips }));
  const top = (fn) => tous.slice().sort((a, b) => fn(b) - fn(a))[0];
  if (tous.length) {
    const gros = top((x) => x.s.plusGros);
    if (gros.s.plusGros > 0) titles.push({ pid: gros.pid, emoji: '💰', text: `Plus beau coup : +${gros.s.plusGros} jetons d'un seul tour` });
    const plein = top((x) => x.s.pleins);
    if (plein.s.pleins >= 1) titles.push({ pid: plein.pid, emoji: '🎯', text: `Numéro fétiche : ${plein.s.pleins} plein(s) rentré(s)` });
    const prudent = top((x) => x.s.secs);
    if (prudent.s.secs >= 3) titles.push({ pid: prudent.pid, emoji: '⚖️', text: `Joue la sécurité : ${prudent.s.secs} chances simples gagnées` });
    const flambeur = top((x) => x.s.jetons);
    if (flambeur.s.jetons >= 12) titles.push({ pid: flambeur.pid, emoji: '🪙', text: `Le tapis chargé : ${flambeur.s.jetons} jetons posés` });
    const maudit = top((x) => x.s.zeros);
    if (maudit.s.zeros >= 2) titles.push({ pid: maudit.pid, emoji: '🟢', text: `Le zéro le suit : ${maudit.s.zeros} fois sur la table` });
    const ruine = tous.slice().sort((a, b) => a.c - b.c)[0];
    if (ruine.c <= 0) titles.push({ pid: ruine.pid, emoji: '🥀', text: 'Ruiné avant la fermeture' });
  }
  if (state.chef) {
    const gagne = state.banque > state.banque0;
    titles.push({ pid: state.chef, emoji: '🎩', text: gagne ? 'La banque gagne toujours' : 'La banque a tremblé' });
  }
  if (!titles.length && tous.length) {
    const chanceux = top((x) => x.c);
    titles.push({ pid: chanceux.pid, emoji: '🍀', text: `Reparti avec ${chanceux.c} jetons` });
  }
  return { ranking, winners, titles };
}

// ── Forains ────────────────────────────────────────────────────────────

import { MISES } from '../../shared/roulette.js';

// Cles disponibles par famille, pour tirer une mise au hasard.
const PAR_FAMILLE = {};
for (const [cle, m] of MISES) {
  (PAR_FAMILLE[m.kind] || (PAR_FAMILLE[m.kind] = [])).push(cle);
}

// Ce que la banque gagnerait (positif) ou paierait (negatif) sur ce numero.
// Version simplifiee : sert au Chef de Table pour choisir son coup de poignet.
function gainBanque(state, n) {
  let g = 0;
  for (const pid of state.pids) {
    for (const [cle, amt] of Object.entries(state.players[pid].bets)) {
      const m = mise(cle);
      if (!m) continue;
      g += m.ns.includes(n) ? -amt * m.pay : amt;
    }
  }
  return g;
}

// Decoupe un montant en jetons du stand (les gros d'abord).
function enJetons(montant) {
  const out = [];
  let reste = Math.max(0, Math.floor(montant));
  for (let i = JETONS.length - 1; i >= 0 && out.length < 10; i--) {
    while (reste >= JETONS[i] && out.length < 10) { out.push(JETONS[i]); reste -= JETONS[i]; }
  }
  return out;
}

export function botAct(state, pid, mind, api) {
  if (state.done) return;
  const pers = mind.p, rng = mind.rng, mem = mind.mem;

  // Le Chef de Table : il ne triche que si la bille fait mal a la caisse.
  if (state.chef && pid === state.chef) {
    if (state.phase !== 'rien' || state.nudge <= 0 || state.nudged) return;
    const cle = `n-${state.tour}`;
    if (mem.k === cle) return;
    mem.k = cle;
    const i = ORDRE.indexOf(state.res);
    const ici = gainBanque(state, state.res);
    const gauche = gainBanque(state, ORDRE[(i - 1 + ORDRE.length) % ORDRE.length]);
    const droite = gainBanque(state, ORDRE[(i + 1) % ORDRE.length]);
    if (ici >= 0 || !rng.chance(0.4 + pers.aggro * 0.5)) return;
    if (gauche > ici && gauche >= droite) api.act('poignet', { dir: -1 });
    else if (droite > ici) api.act('poignet', { dir: 1 });
    return;
  }

  const p = state.players[pid];
  if (!p || state.phase !== 'mise' || p.ok || p.chips <= 0) return;

  const cle = `m-${state.tour}`;
  if (mem.k !== cle) {
    mem.k = cle;
    mem.at = state.simT;
    mem.delay = 0.4 + rng.next() * 2.4 * pers.pace;
    mem.fait = false;
    return;
  }
  if (mem.fait || state.simT - mem.at < mem.delay) return;
  mem.fait = true;

  // Un habitue remet parfois exactement les memes jetons que le tour d'avant.
  if (Object.keys(p.last).length && rng.chance(0.3 + pers.skill * 0.2)) {
    api.act('rejouer');
    if (rng.chance(pers.aggro * 0.4)) api.act('doubler');
    api.act('pret');
    return;
  }

  const unite = Math.max(1, Math.round(state.rules.tapis / 60));
  let budget = Math.round(unite * (1 + pers.aggro * 4));
  if (rng.chance(pers.chaos * 0.25)) budget *= 2;                 // coup de sang
  if (p.chips < state.rules.tapis * 0.3) budget = Math.max(1, Math.round(budget * 0.6));
  budget = Math.min(p.chips, Math.max(1, budget));

  const nb = 1 + rng.int(0, pers.chaos > 0.5 ? 3 : 2);
  const part = Math.max(1, Math.floor(budget / nb));
  for (let i = 0; i < nb; i++) {
    const r = rng.next();
    let famille;
    if (r < 0.2 + pers.skill * 0.3) famille = 'simple';
    else if (r < 0.62) famille = rng.chance(0.5) ? 'douzaine' : 'colonne';
    else if (r < 0.62 + pers.aggro * 0.28) famille = 'plein';
    else famille = rng.pick(['cheval', 'transversale', 'carre', 'sixain']);
    const liste = PAR_FAMILLE[famille];
    const k = liste[rng.int(0, liste.length - 1)];
    for (const v of enJetons(part)) api.act('mise', { k, v });
  }
  api.act('pret');
}
