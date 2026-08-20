// BOMBER : simulation serveur. Une bombe tourne autour de la table avec une
// syllabe collee dessus ; celui qui la tient doit taper un mot francais qui
// la contient. La meche brule en continu, meme quand la bombe change de
// mains : quand elle explose, c est le porteur qui perd un coeur.
// Asym « L Artificier » : un coeur de plus, des syllabes de 2 lettres, mais
// la bombe lui revient un tour sur deux.

import { normalise, accepte, contient, syllabes, motAvec, solutions } from './mots.js';

const PRE_T = 2.2;          // presentation avant la premiere meche
const BOOM_T = 2.4;         // pause spectacle apres une explosion
const END_T = 2.8;
const FUSE_MIN = 10;        // meche la plus courte au tirage
const FUSE_MAX = 22;        // meche la plus longue
const FUSE_FLOOR = 6;       // jamais moins que ca, meme en fin de partie
const MAX_SIM = 600;        // garde-fou global
const ALPHABET = 'abcdefghijlmnopqrstuv';   // sans k, w, x, y, z : atteignable
const MIN_SOL = { facile: 40, normal: 15, costaud: 8 };

const pick = (v, allowed, def) => (allowed.includes(v) ? v : def);

export function createState(cfg) {
  const st = cfg.settings || {};
  const asym = cfg.format.kind === 'asym';
  const artificier = asym ? cfg.teams[0][0] : null;
  const coeurs = pick(st.coeurs, [1, 3, 5], 3);
  const niveau = pick(st.niveau, ['facile', 'normal', 'costaud'], 'normal');

  const state = {
    cfg,
    rng: cfg.rng,
    asym, artificier,
    coeurs,
    niveau,
    minSol: MIN_SOL[niveau],
    players: {},
    order: [],
    crowd: [],            // ordre des Demineurs (format asymetrique)
    crowdIdx: 0,
    depuisArt: 0,        // tours joues par la foule depuis le dernier de l Artificier
    turnIdx: 0,
    turnPid: null,
    syl: '',
    sylSol: 0,
    fuse: 0,
    fuseMax: 0,
    booms: 0,
    tours: 0,
    used: new Set(),      // mots deja servis (hors vue : ce n est pas JSON-able)
    history: [],
    phase: 'pre',
    phaseT: PRE_T,
    lastBoom: null,
    winCamp: null,
    elimCount: 0,
    simT: 0,
    done: false,
    evq: [],
    tick: 0, _viewTick: -1, _view: null,
  };

  cfg.teams.forEach((team, c) => {
    for (const pid of team) {
      const solo = pid === artificier;
      state.players[pid] = {
        pid,
        camp: c,
        vies: solo ? coeurs * 3 : coeurs,
        alive: true,
        alpha: new Set(),
        elimAt: 0,
        stats: {
          mots: 0, refus: 0, booms: 0, bonus: 0, plusLong: '', lettres: 0,
        },
      };
    }
  });

  // Ordre de table : on alterne les camps pour que la bombe voyage.
  const pools = cfg.teams.map((t) => [...t]);
  let added = true;
  while (added) {
    added = false;
    for (const pool of pools) {
      if (pool.length) { state.order.push(pool.shift()); added = true; }
    }
  }
  if (asym) state.crowd = state.order.filter((pid) => pid !== artificier);
  state.turnIdx = 0;
  state.turnPid = state.order[0];
  return state;
}

// ── Table ──────────────────────────────────────────────────────────────

const alivePids = (state) => state.order.filter((pid) => state.players[pid].alive);

function campsAlive(state) {
  const set = new Set();
  for (const pid of alivePids(state)) set.add(state.players[pid].camp);
  return [...set];
}

// Syllabe jouable : 2 lettres pour l Artificier, 2 ou 3 pour les autres.
function tireSyllabe(state, pid) {
  const court = state.asym && pid === state.artificier;
  const taille = court ? 2 : (state.rng.chance(0.55) ? 3 : 2);
  let liste = syllabes(state.minSol, taille);
  if (!liste.length) liste = syllabes(state.minSol, 0);
  if (!liste.length) liste = syllabes(8, 0);
  const syl = liste[state.rng.int(0, liste.length - 1)];
  state.syl = syl;
  state.sylSol = solutions(syl);
  state.evq.push({ e: 'syl', pid, syl });
}

// Nouvelle meche : elle raccourcit au fil de la partie, la tension monte.
function nouvelleMeche(state) {
  const usure = Math.min(0.5, state.booms * 0.05);
  const lo = Math.max(FUSE_FLOOR, FUSE_MIN * (1 - usure));
  const hi = Math.max(lo + 2, FUSE_MAX * (1 - usure));
  state.fuseMax = Math.round(state.rng.range(lo, hi) * 10) / 10;
  state.fuse = state.fuseMax;
}

// Passe la bombe au joueur suivant (l Artificier la reprend un tour sur deux).
function passeBombe(state, depuis) {
  const vivants = alivePids(state);
  if (!vivants.length) return;
  if (state.asym && state.players[state.artificier] && state.players[state.artificier].alive) {
    const dispo = state.crowd.filter((pid) => state.players[pid].alive);
    const suivantFoule = () => {
      if (!dispo.length) return state.artificier;
      state.crowdIdx = (state.crowdIdx + 1) % dispo.length;
      return dispo[state.crowdIdx];
    };
    if (depuis === state.artificier) {
      state.depuisArt = 0;
      state.turnPid = suivantFoule();
    } else {
      state.depuisArt++;
      // La bombe revient a l Artificier un tour sur trois.
      state.turnPid = state.depuisArt >= 2 ? state.artificier : suivantFoule();
    }
  } else {
    const i = state.order.indexOf(depuis);
    const n = state.order.length;
    let suivant = state.turnPid;
    for (let k = 1; k <= n; k++) {
      const cand = state.order[(i + k) % n];
      if (state.players[cand].alive) { suivant = cand; break; }
    }
    state.turnPid = suivant;
  }
  state.turnIdx = state.order.indexOf(state.turnPid);
  state.tours++;
  tireSyllabe(state, state.turnPid);
  state.evq.push({ e: 'tour', pid: state.turnPid });
}

// ── Le mot du joueur ───────────────────────────────────────────────────

// Retourne null si le mot passe, sinon le motif du refus.
function refusDe(state, mot) {
  if (mot.length < 3) return 'court';
  if (!contient(mot, state.syl)) return 'syllabe';
  if (state.used.has(mot)) return 'deja';
  if (!accepte(mot)) return 'dico';
  return null;
}

function jouerMot(state, pid, brut) {
  if (state.phase !== 'play' || state.turnPid !== pid) return false;
  const p = state.players[pid];
  if (!p || !p.alive) return false;
  const mot = normalise(brut);
  const refus = refusDe(state, mot);
  if (refus) {
    p.stats.refus++;
    state.evq.push({ e: 'refus', pid, r: refus, mot: mot.slice(0, 16) });
    return false;
  }

  state.used.add(mot);
  p.stats.mots++;
  if (mot.length > p.stats.plusLong.length) p.stats.plusLong = mot;
  for (const l of mot) {
    if (ALPHABET.includes(l)) p.alpha.add(l);
  }
  p.stats.lettres = p.alpha.size;
  state.history.push({ pid, mot });
  if (state.history.length > 6) state.history.shift();
  state.evq.push({ e: 'ok', pid, mot });

  // Alphabet complet : un coeur de plus, et on remet le compteur a zero.
  if (p.alpha.size >= ALPHABET.length) {
    p.alpha.clear();
    p.vies++;
    p.stats.bonus++;
    state.evq.push({ e: 'coeur', pid, vies: p.vies });
  }
  passeBombe(state, pid);
  return true;
}

// ── Explosion ──────────────────────────────────────────────────────────

function exploser(state) {
  const pid = state.turnPid;
  const p = state.players[pid];
  state.booms++;
  if (p && p.alive) {
    p.vies = Math.max(0, p.vies - 1);
    p.stats.booms++;
    state.lastBoom = { pid, vies: p.vies, syl: state.syl };
    state.evq.push({ e: 'boom', pid, vies: p.vies });
    if (p.vies === 0) {
      p.alive = false;
      p.elimAt = ++state.elimCount;
      state.evq.push({ e: 'out', pid });
    }
  }
  state.phase = 'boom';
  state.phaseT = BOOM_T;
}

// Fin forcee : on classe a la vie restante.
function forceEnd(state) {
  const perCamp = state.cfg.teams.map(() => 0);
  for (const pid of alivePids(state)) perCamp[state.players[pid].camp] += state.players[pid].vies;
  const best = Math.max(...perCamp);
  const gagnants = perCamp.map((v, c) => [v, c]).filter(([v]) => v === best).map(([, c]) => c);
  state.winCamp = gagnants.length === 1 ? gagnants[0] : null;
  state.phase = 'end';
  state.phaseT = END_T;
  state.evq.push({ e: 'timecap' });
}

// ── Contrat ────────────────────────────────────────────────────────────

export function onInput(state, pid, d) {
  // Repli du harnais : un tap brut tente un mot valable, comme un forain.
  if (!d || typeof d.tx !== 'number' || !Number.isFinite(d.tx)) return;
  if (state.done || state.phase !== 'play' || state.turnPid !== pid) return;
  const mot = motAvec(state.syl, state.rng, state.used);
  if (mot) jouerMot(state, pid, mot);
}

export function onAction(state, pid, a, d) {
  if (state.done || typeof a !== 'string') return;
  if (a !== 'mot') return;
  if (!d || typeof d !== 'object') return;
  if (typeof d.m !== 'string') return;
  jouerMot(state, pid, d.m.slice(0, 40));
}

export function tick(state, dt) {
  const evs = state.evq;
  state.evq = [];
  state.tick++;
  state.simT += dt;
  if (state.done) return evs;

  if (state.simT > MAX_SIM && state.phase !== 'end') { forceEnd(state); return evs; }

  if (state.phase === 'pre') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) {
      state.phase = 'play';
      nouvelleMeche(state);
      state.tours++;
      tireSyllabe(state, state.turnPid);
      state.evq.push({ e: 'tour', pid: state.turnPid });
    }
  } else if (state.phase === 'play') {
    state.fuse -= dt;
    if (state.fuse <= 0) { state.fuse = 0; exploser(state); }
  } else if (state.phase === 'boom') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) {
      const camps = campsAlive(state);
      if (camps.length <= 1) {
        state.winCamp = camps.length === 1 ? camps[0] : null;
        state.phase = 'end';
        state.phaseT = END_T;
        state.evq.push({ e: 'win', camp: state.winCamp });
      } else {
        // La bombe repart toujours au voisin : personne ne prend deux
        // explosions d affilee sans avoir eu la main entre les deux.
        state.lastBoom = null;
        state.phase = 'play';
        nouvelleMeche(state);
        passeBombe(state, state.turnPid);
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

export function view(state) {
  if (state._viewTick === state.tick) return state._view;
  const players = {};
  for (const pid of state.order) {
    const p = state.players[pid];
    players[pid] = {
      camp: p.camp,
      vies: p.vies,
      alive: p.alive ? 1 : 0,
      alpha: [...p.alpha].sort().join(''),
      mots: p.stats.mots,
    };
  }
  state._view = {
    phase: state.phase,
    tl: Math.round(Math.max(0, state.fuse) * 10) / 10,
    fuseMax: state.fuseMax,
    syl: state.syl,
    sol: state.sylSol,
    turn: state.turnPid,
    tours: state.tours,
    booms: state.booms,
    boom: state.lastBoom,
    alphabet: ALPHABET,
    niveau: state.niveau,
    history: state.history.slice(-5),
    win: state.winCamp,
    players,
  };
  state._viewTick = state.tick;
  return state._view;
}

export function results(state) {
  const cfg = state.cfg;
  const pids = cfg.teams.flat();
  // Score : vies restantes d abord, puis ordre d elimination, puis mots joues.
  const scoreDe = (pid) => {
    const p = state.players[pid];
    if (!p) return 0;
    return (p.alive ? 100000 : 0) + p.vies * 1000 + p.elimAt * 100 + Math.min(99, p.stats.mots);
  };
  const perCamp = cfg.teams.map((team) => team.reduce((s, pid) => s + scoreDe(pid), 0));
  const best = Math.max(...perCamp);
  const winCamps = perCamp.map((v, c) => [v, c]).filter(([v]) => v === best).map(([, c]) => c);
  const egalite = winCamps.length === cfg.teams.length && cfg.teams.length > 1;
  const winners = egalite ? [] : winCamps.flatMap((c) => cfg.teams[c]);

  const ranking = pids
    .map((pid) => {
      const p = state.players[pid];
      const label = p && p.alive ? `${p.vies} ❤ · ${p.stats.mots} mots` : `éliminé · ${p ? p.stats.mots : 0} mots`;
      return { pid, score: scoreDe(pid), label };
    })
    .sort((a, b) => b.score - a.score);

  const titles = [];
  const tous = pids.map((pid) => ({ pid, s: state.players[pid].stats }));
  const top = (fn) => tous.slice().sort((a, b) => fn(b.s) - fn(a.s))[0];
  const long = top((s) => s.plusLong.length);
  if (long.s.plusLong.length >= 7) {
    titles.push({ pid: long.pid, emoji: '📚', text: `Plus long mot de la soirée : ${long.s.plusLong} (${long.s.plusLong.length} lettres)` });
  }
  const artificier = top((s) => s.booms);
  if (artificier.s.booms >= 2) {
    titles.push({ pid: artificier.pid, emoji: '💥', text: `A fait péter la bombe ${artificier.s.booms} fois` });
  }
  const sauve = top((s) => s.bonus);
  if (sauve.s.bonus >= 1) {
    titles.push({ pid: sauve.pid, emoji: '🔤', text: `Sauvé par l'alphabet : ${sauve.s.bonus} cœur(s) regagné(s)` });
  }
  const bavard = top((s) => s.mots);
  if (bavard.s.mots >= 5) {
    titles.push({ pid: bavard.pid, emoji: '🗣️', text: `Dictionnaire vivant : ${bavard.s.mots} mots placés` });
  }
  const cafouille = top((s) => s.refus);
  if (cafouille.s.refus >= 4) {
    titles.push({ pid: cafouille.pid, emoji: '🙈', text: `Doigts en compote : ${cafouille.s.refus} mots refusés` });
  }
  if (!titles.length) titles.push({ pid: ranking[0].pid, emoji: '💣', text: 'Nerfs d\'acier au stand de la bombe' });
  return { ranking, winners, titles };
}

// ── Bot : il cherche un mot, hesite, et se plante parfois ──────────────

export function botAct(state, pid, mind, api) {
  if (state.done || state.phase !== 'play' || state.turnPid !== pid) return;
  const p = state.players[pid];
  if (!p || !p.alive) return;
  const pers = mind.p, rng = mind.rng, mem = mind.mem;

  const cle = `${state.tours}-${state.syl}`;
  if (mem.k !== cle) {
    mem.k = cle;
    mem.at = state.simT;
    // Un bon forain trouve vite ; un mauvais cherche ses mots.
    const base = 1.1 + (1 - pers.skill) * 3.4;
    mem.delai = (base + rng.next() * 1.8) * pers.pace;
    // Les syllabes rares font transpirer tout le monde.
    if (state.sylSol < 20) mem.delai *= 1.3;
    mem.rate = rng.chance((1 - pers.skill) * 0.45);   // il va se planter une fois
    mem.essai = false;
    return;
  }
  if (state.simT - mem.at < mem.delai) return;

  // Un premier essai rate : mot deja servi ou sans la syllabe.
  if (mem.rate && !mem.essai) {
    mem.essai = true;
    mem.at = state.simT;
    mem.delai = 0.6 + rng.next() * 1.2;
    const deja = [...state.used];
    const raté = deja.length && rng.chance(0.5)
      ? deja[rng.int(0, deja.length - 1)]
      : 'bidule';
    api.act('mot', { m: raté });
    return;
  }

  const mot = motAvec(state.syl, rng, state.used);
  if (!mot) return;                     // plus rien de dispo : il subira la meche
  api.act('mot', { m: mot });
}
