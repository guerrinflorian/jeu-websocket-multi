// YAMS : simulation serveur. Tours simultanés : chacun lance ses 5 dés
// (3 relances, 4 pour le Flambeur), garde, relance, puis case son score.
// Le tour avance quand tout le monde a casé (ou au chrono). Feuille
// complète (13 lignes, bonus de section haute) ou express (7 lignes).

import {
  CATS, SHEET_EXPRESS, SHEET_FULL, scoreCat, sheetTotal, upperTotal, UPPER_TARGET,
} from '../../shared/dice.js';
import meta from './meta.js';

const PRE_T = 1.4;
const PLAY_T = 25;
const SHOW_T = 1.8;
const END_T = 2.2;

export function createState(cfg) {
  const asym = cfg.format.kind === 'asym';
  const solo = asym ? cfg.teams[0][0] : null;
  const cats = (cfg.settings.sheet || 'complet') === 'complet' ? SHEET_FULL : SHEET_EXPRESS;
  const state = {
    cfg,
    rng: cfg.rng,
    asym, solo,
    pids: cfg.teams.flat(),
    teamOf: {},
    cats,
    hasUpper: cats.includes('un'),
    round: 1,
    phase: 'pre',
    phaseT: PRE_T,
    players: {},
    simT: 0,
    done: false,
    evq: [],
    tick: 0, _viewTick: -1, _view: null,
  };
  cfg.teams.forEach((team, t) => {
    for (const pid of team) {
      state.teamOf[pid] = t;
      state.players[pid] = {
        dice: [1, 1, 1, 1, 1],
        locked: [false, false, false, false, false],
        rolls: 0,
        rollsMax: pid === solo ? 4 : 3,
        done: false,
        sheet: {},
        stats: { yams: 0, rerolls: 0, zeros: 0, timeouts: 0, gsuites: 0, bonus: 0 },
      };
    }
  });
  return state;
}

function rollDice(state, pid, first = false) {
  const p = state.players[pid];
  for (let i = 0; i < 5; i++) {
    if (first || !p.locked[i]) p.dice[i] = state.rng.int(1, 6);
  }
  p.rolls++;
  if (!first) p.stats.rerolls++;
  state.evq.push({ e: 'roll', pid, first: first ? 1 : 0 });
}

function startRound(state) {
  state.phase = 'play';
  state.phaseT = PLAY_T;
  for (const pid of state.pids) {
    const p = state.players[pid];
    p.locked = [false, false, false, false, false];
    p.rolls = 0;
    p.done = false;
    rollDice(state, pid, true);
  }
  state.evq.push({ e: 'round', n: state.round });
}

function freeCats(state, pid) {
  return state.cats.filter((c) => state.players[pid].sheet[c] === undefined);
}

function pickCat(state, pid, cat, auto = false) {
  const p = state.players[pid];
  if (state.phase !== 'play' || p.done || state.done) return false;
  if (!state.cats.includes(cat) || p.sheet[cat] !== undefined) return false;
  const beforeUpper = upperTotal(p.sheet);
  const sc = scoreCat(cat, p.dice);
  p.sheet[cat] = sc;
  p.done = true;
  if (sc === 0) p.stats.zeros++;
  if (auto) p.stats.timeouts++;
  state.evq.push({ e: 'pick', pid, cat, sc });
  if (cat === 'yams' && sc >= 50) {
    p.stats.yams++;
    state.evq.push({ e: 'yams', pid });
  }
  if (cat === 'gsuite' && sc >= 40) p.stats.gsuites++;
  // Bonus de section haute qui vient d'être décroché : on le fête.
  if (state.hasUpper && beforeUpper < UPPER_TARGET && upperTotal(p.sheet) >= UPPER_TARGET) {
    p.stats.bonus = 1;
    state.evq.push({ e: 'bonus', pid });
  }
  if (state.pids.every((id) => state.players[id].done)) {
    state.phase = 'show';
    state.phaseT = SHOW_T;
  }
  return true;
}

// Pénalité quand on sacrifie (met 0 dans) une catégorie : plus la ligne
// est précieuse, plus on évite.
const SACRIFICE = {
  yams: 18, carre: 12, gsuite: 10, psuite: 8, full: 7, chance: 6, brelan: 5,
  six: 5, cinq: 4, quatre: 3, trois: 2, deux: 1, un: 0.5,
};

// Meilleure case libre pour les dés actuels (chrono et bots).
function bestCat(state, pid) {
  const free = freeCats(state, pid);
  const p = state.players[pid];
  let best = free[0], bestVal = -Infinity;
  for (const cat of free) {
    const sc = scoreCat(cat, p.dice);
    let value = sc;
    if (sc === 0) {
      value -= SACRIFICE[cat] || 0;
    } else if (CATS[cat].upper) {
      // Encourager le bonus : 3 dés et plus de la valeur, c'est le rythme
      // (63 = trois de chaque). Le boost croît avec la valeur : trois 6
      // dans « Les 6 » vaut mieux qu'un brelan moyen.
      const v = CATS[cat].upper;
      if (sc >= v * 3) value += 6 + v;
      else value -= 2;
    } else if (cat === 'chance' && sc < 20) {
      value -= 4; // garder la chance pour un gros tirage
    }
    if (value > bestVal) { bestVal = value; best = cat; }
  }
  return best;
}

export function onInput(state, pid, d) {
  // Fallback harnais : tap = verrouiller un dé au pif ou caser.
  if (!d || typeof d.tx !== 'number' || !Number.isFinite(d.tx)) return;
  const p = state.players[pid];
  if (!p || state.phase !== 'play' || p.done) return;
  if (d.tx < 450) {
    const i = Math.max(0, Math.min(4, Math.floor(d.tx / 90)));
    if (p.rolls > 0) p.locked[i] = !p.locked[i];
  } else {
    pickCat(state, pid, bestCat(state, pid));
  }
}

export function onAction(state, pid, a, d) {
  const p = state.players[pid];
  if (!p || state.done) return;
  if (state.phase !== 'play' || p.done) return;
  if (a === 'roll') {
    if (p.rolls < p.rollsMax) rollDice(state, pid);
  } else if (a === 'lock' && d) {
    const i = Math.round(Number(d.i));
    if (i >= 0 && i < 5 && p.rolls > 0) {
      p.locked[i] = !!(d.on ?? !p.locked[i]);
      state.evq.push({ e: 'lock', pid, i, on: p.locked[i] ? 1 : 0 });
    }
  } else if (a === 'pick' && d && typeof d.cat === 'string') {
    pickCat(state, pid, d.cat);
  }
}

export function tick(state, dt) {
  const evs = state.evq;
  state.evq = [];
  state.tick++;
  state.simT += dt;
  if (state.done) return evs;

  if (state.phase === 'pre') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) startRound(state);
  } else if (state.phase === 'play') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) {
      for (const pid of state.pids) {
        const p = state.players[pid];
        if (!p.done) pickCat(state, pid, bestCat(state, pid), true);
      }
    }
  } else if (state.phase === 'show') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) {
      if (state.round >= state.cats.length) {
        state.phase = 'end';
        state.phaseT = END_T;
      } else {
        state.round++;
        startRound(state);
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
  for (const [pid, p] of Object.entries(state.players)) {
    players[pid] = {
      dice: p.dice,
      locked: p.locked.map((l) => (l ? 1 : 0)),
      rolls: p.rolls,
      rollsMax: p.rollsMax,
      done: p.done ? 1 : 0,
      sheet: p.sheet,
      total: sheetTotal(p.sheet, state.cats),
      upper: state.hasUpper ? upperTotal(p.sheet) : 0,
      bonus: state.hasUpper && upperTotal(p.sheet) >= UPPER_TARGET ? 1 : 0,
    };
  }
  state._view = {
    phase: state.phase,
    tl: Math.round(Math.max(0, state.phaseT) * 10) / 10,
    round: state.round,
    roundN: state.cats.length,
    cats: state.cats,
    hasUpper: state.hasUpper ? 1 : 0,
    players,
  };
  state._viewTick = state.tick;
  return state._view;
}

export function results(state) {
  const { cfg } = state;
  const totalOf = (pid) => sheetTotal(state.players[pid].sheet, state.cats);
  // Score d'équipe = moyenne (équipes inégales comparables).
  const teamScore = cfg.teams.map((team) => Math.round(team.reduce((s, pid) => s + totalOf(pid), 0) / team.length));
  const best = Math.max(...teamScore);
  const winTeams = teamScore.map((s, t) => [s, t]).filter(([s]) => s === best).map(([, t]) => t);
  const allTied = winTeams.length === cfg.teams.length && cfg.teams.length > 1;
  const winners = allTied ? [] : winTeams.flatMap((t) => cfg.teams[t]);

  const ranking = state.pids
    .map((pid) => ({ pid, score: totalOf(pid), label: `${totalOf(pid)} pts` }))
    .sort((a, b) => b.score - a.score)
    .map(({ pid, score, label }) => ({ pid, score, label }));

  const titles = [];
  const all = state.pids.map((pid) => ({ pid, s: state.players[pid].stats }));
  const top = (fn) => all.slice().sort((a, b) => fn(b.s) - fn(a.s))[0];
  const star = top((s) => s.yams);
  if (star.s.yams >= 1) titles.push({ pid: star.pid, emoji: '⭐', text: `YAMS ! ${star.s.yams} fois cinq dés identiques` });
  const bonus = all.filter((x) => x.s.bonus);
  if (bonus.length) {
    const bestBonus = bonus.sort((a, b) => totalOf(b.pid) - totalOf(a.pid))[0];
    titles.push({ pid: bestBonus.pid, emoji: '🎯', text: 'Chasseur de bonus : section haute à 63 et plus (+35)' });
  }
  const grande = top((s) => s.gsuites);
  if (grande.s.gsuites >= 1 && titles.length < 4) titles.push({ pid: grande.pid, emoji: '📶', text: 'Grande suite : cinq dés à la queue leu leu' });
  const poisse = top((s) => s.zeros);
  if (poisse.s.zeros >= 2) titles.push({ pid: poisse.pid, emoji: '🕳️', text: `La Poisse : ${poisse.s.zeros} lignes à zéro` });
  const nerveux = top((s) => s.rerolls);
  if (nerveux.s.rerolls >= 10 && titles.length < 4) titles.push({ pid: nerveux.pid, emoji: '♻️', text: `Poignet nerveux : ${nerveux.s.rerolls} relances` });
  const dodo = top((s) => s.timeouts);
  if (dodo.s.timeouts >= 2 && titles.length < 4) titles.push({ pid: dodo.pid, emoji: '😴', text: `Endormi sur les dés : ${dodo.s.timeouts} cases au chrono` });
  if (!titles.length) {
    titles.push({ pid: ranking[0].pid, emoji: '🎲', text: 'Main la plus chaude de la tablée' });
  }
  return { ranking, winners, titles: titles.slice(0, 4) };
}

// ── Bot : vise le bonus, chasse les suites, sacrifie au moins pire ──────

// Meilleure fenêtre de suite ([1..5] ou [2..6]) : valeurs présentes.
function suiteWindow(counts) {
  let best = null, bestN = 0;
  for (const lo of [1, 2]) {
    const vals = [];
    for (let v = lo; v < lo + 5; v++) if (counts[v] > 0) vals.push(v);
    if (vals.length > bestN) { bestN = vals.length; best = vals; }
  }
  return best || [];
}

export function botAct(state, pid, mind, api) {
  const p = state.players[pid];
  if (!p || state.phase !== 'play' || p.done || state.done) return;
  const { p: pers, rng, mem } = mind;

  const key = `${state.round}-${p.rolls}`;
  if (mem.k !== key) {
    mem.k = key;
    mem.delay = 1 + rng.next() * 2.5 * pers.pace;
    mem.at = state.simT;
  }
  if (state.simT - mem.at < mem.delay) return;
  mem.k = `${key}-acted`;

  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of p.dice) counts[d]++;
  const free = freeCats(state, pid);
  const bestNow = bestCat(state, pid);
  const bestScore = scoreCat(bestNow, p.dice);
  const wantGsuite = free.includes('gsuite');
  const wantPsuite = free.includes('psuite');
  const run = suiteWindow(counts);

  // Content de son sort, ou plus de relances : on case.
  const threshold = 22 + pers.skill * 8;
  const satisfied = bestScore >= threshold && rng.chance(0.55 + pers.skill * 0.3);
  if (p.rolls >= p.rollsMax || satisfied || rng.chance(pers.chaos * 0.08)) {
    api.act('pick', { cat: bestNow });
    return;
  }

  // Stratégie de garde.
  let keepIdx = new Set();
  const maxCount = Math.max(...counts);
  const wantFull = free.includes('full');
  const pairs = [];
  for (let v = 6; v >= 1; v--) if (counts[v] >= 2) pairs.push(v);

  if ((wantGsuite || wantPsuite) && maxCount <= 2 && run.length >= 3 && rng.chance(0.65 + pers.skill * 0.2)) {
    // Chasser la suite : garder une occurrence de chaque valeur de la fenêtre.
    const seen = new Set();
    p.dice.forEach((d, i) => {
      if (run.includes(d) && !seen.has(d)) { seen.add(d); keepIdx.add(i); }
    });
  } else if (wantFull && pairs.length >= 2 && maxCount < 4) {
    // Deux paires (ou brelan + paire) : garder les deux groupes pour le full.
    const [a, b] = pairs;
    let kept = { [a]: 0, [b]: 0 };
    p.dice.forEach((d, i) => {
      if ((d === a && kept[a] < 3) || (d === b && kept[b] < 2)) { kept[d]++; keepIdx.add(i); }
    });
  } else {
    // Garder la valeur la plus prometteuse : fréquence, puis hauteur, avec
    // un faible pour les valeurs dont la ligne haute est encore libre.
    let keepVal = 1, bestW = -1;
    const upperName = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six'];
    for (let v = 1; v <= 6; v++) {
      if (!counts[v]) continue;
      let wgt = counts[v] * 6 + v;
      if (state.hasUpper && free.includes(upperName[v]) && counts[v] >= 2) wgt += 3 + v * 0.5;
      if (wgt > bestW) { bestW = wgt; keepVal = v; }
    }
    p.dice.forEach((d, i) => { if (d === keepVal) keepIdx.add(i); });
  }

  for (let i = 0; i < 5; i++) {
    const keep = keepIdx.has(i);
    if (p.locked[i] !== keep) api.act('lock', { i, on: keep });
  }
  api.act('roll');
}
