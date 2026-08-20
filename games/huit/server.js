// HUIT AMÉRICAIN : simulation serveur. Le crazy eights complet :
// meme couleur ou meme rang, 8 joker qui choisit la couleur, 7 qui fait
// piocher 2 au suivant (CUMULABLE), As qui inverse le sens, Roi qui saute
// le suivant, et la fenetre « CARTE SEULE » : 4 secondes pour annoncer,
// sinon n importe qui peut te denoncer et tu prends 2 cartes.
// Asym « Le Requin » : 2 cartes de moins et il voit le dessus de la pioche.

import { makeShoe, cardOf } from '../../shared/cards.js';

const PRE_T = 1.6;
const TURN_T = 12;        // chrono d un tour
const SUIT_T = 6;         // chrono du choix de couleur apres un 8
const SEULE_T = 4;        // fenetre pour annoncer ou denoncer « carte seule »
const SHOW_T = 3.2;       // decompte de fin de manche
const END_T = 2.4;
const MANCHE_MAX = 210;   // garde-fou : une manche ne s eternise pas

const suitOf = (id) => Math.floor(id / 13) % 4;
const rankOf = (id) => (id % 13) + 1;
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// Points de penalite d une carte restee en main.
function penalty(id) {
  const r = rankOf(id);
  if (r === 8) return 50;
  if (r === 1) return 20;
  if (r >= 11) return 10;
  return r;
}
const handPenalty = (cards) => cards.reduce((s, c) => s + penalty(c), 0);

// Une carte est-elle posable sur le dessus courant ?
function playable(state, id) {
  if (state.pending > 0) return rankOf(id) === 7;   // on ne pare un 7 qu avec un 7
  if (rankOf(id) === 8) return true;                 // le joker se pose sur tout
  const top = state.discard[state.discard.length - 1];
  if (top === undefined) return true;
  return suitOf(id) === state.suit || rankOf(id) === rankOf(top);
}

// Ordre de table : on entrelace les equipes pour ne pas jouer a la suite.
function seatOrder(teams) {
  const out = [];
  const max = Math.max(...teams.map((t) => t.length));
  for (let i = 0; i < max; i++) {
    for (const team of teams) if (team[i]) out.push(team[i]);
  }
  return out;
}

export function createState(cfg) {
  const asym = cfg.format.kind === 'asym';
  const requin = asym ? cfg.teams[0][0] : null;
  const pids = seatOrder(cfg.teams);
  const state = {
    cfg,
    rng: cfg.rng,
    asym, requin,
    pids,
    teamOf: {},
    manches: [1, 3, 5].includes(cfg.settings.manches) ? cfg.settings.manches : 3,
    manche: 0,
    phase: 'pre',
    phaseT: PRE_T,
    turnT: 0,
    dir: 1,
    turnIdx: 0,
    turnPid: null,
    hands: {},
    draw: [],
    discard: [],
    suit: 0,
    pending: 0,         // cumul des 7 (en cartes a piocher)
    passStreak: 0,
    drew: false,        // le joueur courant a deja pioche ce tour
    seule: null,        // { pid, t, called }
    winner: null,
    scores: {},
    stats: {},
    mancheT: 0,
    simT: 0,
    done: false,
    evq: [],
    tick: 0, _viewTick: -1, _views: new Map(),
  };
  cfg.teams.forEach((team, t) => {
    for (const pid of team) {
      state.teamOf[pid] = t;
      state.scores[pid] = 0;
      state.hands[pid] = [];
      state.stats[pid] = {
        wins: 0, sevens: 0, eights: 0, drawn: 0, denounced: 0, forgot: 0,
        called: 0, snitched: 0, pen: 0,
      };
    }
  });
  startManche(state);
  return state;
}

// ── Distribution ───────────────────────────────────────────────────────

function startManche(state) {
  state.manche++;
  state.mancheT = 0;
  state.dir = 1;
  state.pending = 0;
  state.passStreak = 0;
  state.drew = false;
  state.seule = null;
  state.winner = null;
  state.draw = makeShoe(1);
  state.rng.shuffle(state.draw);
  state.discard = [];
  const base = state.pids.length >= 6 ? 5 : 7;
  for (const pid of state.pids) {
    const n = pid === state.requin ? Math.max(3, base - 2) : base;
    state.hands[pid] = state.draw.splice(0, n).sort((a, b) => a - b);
  }
  // Premiere carte de la defausse : jamais un 8 (sinon couleur indefinie).
  let first = state.draw.pop();
  let guard = 0;
  while (first !== undefined && rankOf(first) === 8 && guard++ < 60) {
    state.draw.unshift(first);
    first = state.draw.pop();
  }
  state.discard.push(first);
  state.suit = suitOf(first);
  // Le donneur commence : celui qui suit le vainqueur de la manche precedente.
  state.turnIdx = (state.manche - 1) % state.pids.length;
  state.turnPid = state.pids[state.turnIdx];
  state.phase = 'play';
  state.turnT = TURN_T;
  state.evq.push({ e: 'manche', n: state.manche, of: state.manches });
  state.evq.push({ e: 'turn', pid: state.turnPid });
  // Effet immediat de la carte retournee : on reste simple, seul le 7 compte.
  if (rankOf(first) === 7) state.pending = 2;
}

// Pioche une carte, remelange la defausse si besoin. null si plus rien.
function drawOne(state) {
  if (!state.draw.length) {
    if (state.discard.length <= 1) return null;
    const top = state.discard.pop();
    state.draw = state.discard;
    state.discard = [top];
    state.rng.shuffle(state.draw);
    state.evq.push({ e: 'shuffle', n: state.draw.length });
  }
  return state.draw.length ? state.draw.pop() : null;
}

function give(state, pid, k) {
  let got = 0;
  for (let i = 0; i < k; i++) {
    const c = drawOne(state);
    if (c === null) break;
    state.hands[pid].push(c);
    got++;
  }
  state.hands[pid].sort((a, b) => a - b);
  state.stats[pid].drawn += got;
  return got;
}

// ── Deroulement des tours ──────────────────────────────────────────────

function advance(state, skip = 0) {
  const n = state.pids.length;
  const step = state.dir * (1 + skip);
  state.turnIdx = (((state.turnIdx + step) % n) + n) % n;
  state.turnPid = state.pids[state.turnIdx];
  state.turnT = TURN_T;
  state.drew = false;
  state.phase = 'play';
  state.evq.push({ e: 'turn', pid: state.turnPid });
}

// Ouvre la fenetre « carte seule » quand un joueur tombe a une carte.
function openSeule(state, pid) {
  state.seule = { pid, t: SEULE_T, called: false };
  state.evq.push({ e: 'seule', pid });
}

function endManche(state, winnerPid) {
  state.winner = winnerPid;
  if (winnerPid) {
    state.stats[winnerPid].wins++;
    state.evq.push({ e: 'win', pid: winnerPid });
  } else {
    state.evq.push({ e: 'nowin' });
  }
  for (const pid of state.pids) {
    const pen = handPenalty(state.hands[pid]);
    state.scores[pid] += pen;
    state.stats[pid].pen += pen;
  }
  state.seule = null;
  state.phase = 'show';
  state.phaseT = SHOW_T;
}

function playCard(state, pid, id) {
  const hand = state.hands[pid];
  const i = hand.indexOf(id);
  if (i < 0 || !playable(state, id)) return false;
  hand.splice(i, 1);
  state.discard.push(id);
  state.suit = suitOf(id);
  state.passStreak = 0;
  state.drew = false;
  const r = rankOf(id);
  state.evq.push({ e: 'play', pid, c: id, n: hand.length });

  if (hand.length === 0) {
    endManche(state, pid);
    return true;
  }
  if (hand.length === 1) openSeule(state, pid);

  if (r === 8) {
    state.stats[pid].eights++;
    state.phase = 'suit';
    state.phaseT = SUIT_T;
    return true;                      // le joueur choisit sa couleur
  }
  if (r === 7) {
    state.pending += 2;
    state.stats[pid].sevens++;
    state.evq.push({ e: 'sept', pid, cum: state.pending });
    advance(state);
    return true;
  }
  if (r === 1) {
    state.dir *= -1;
    state.evq.push({ e: 'demitour', pid, dir: state.dir });
    // A deux, inverser revient a rejouer : on saute quand meme le tour.
    advance(state);
    return true;
  }
  if (r === 13) {
    const n = state.pids.length;
    const victim = state.pids[(state.turnIdx + state.dir + n * 2) % n];
    state.evq.push({ e: 'saute', pid: victim, by: pid });
    advance(state, 1);
    return true;
  }
  advance(state);
  return true;
}

// Le joueur pioche : encaisse le cumul des 7, ou tire une carte.
function doDraw(state, pid) {
  if (state.pending > 0) {
    const k = state.pending;
    state.pending = 0;
    const got = give(state, pid, k);
    state.evq.push({ e: 'draw', pid, k: got, n: state.hands[pid].length, forced: 1 });
    state.passStreak = 0;
    advance(state);
    return true;
  }
  if (state.drew) return false;       // une seule pioche par tour
  const got = give(state, pid, 1);
  state.drew = true;
  state.evq.push({ e: 'draw', pid, k: got, n: state.hands[pid].length, forced: 0 });
  if (got === 0) {                    // plus rien a piocher : on passe
    state.passStreak++;
    if (state.passStreak >= state.pids.length) { endManche(state, null); return true; }
    advance(state);
    return true;
  }
  const hasPlay = state.hands[pid].some((c) => playable(state, c));
  if (!hasPlay) {                     // rien de jouable : le tour passe
    state.passStreak++;
    if (state.passStreak >= state.pids.length) { endManche(state, null); return true; }
    advance(state);
  }
  return true;
}

function chooseSuit(state, pid, s) {
  if (state.phase !== 'suit' || pid !== state.turnPid) return false;
  if (![0, 1, 2, 3].includes(s)) return false;
  state.suit = s;
  state.evq.push({ e: 'suit', pid, s });
  advance(state);
  return true;
}

// Coup automatique au chrono (et base du bot) : indice de la carte a jouer.
function autoPick(state, pid) {
  const hand = state.hands[pid] || [];
  const opts = hand.filter((c) => playable(state, c));
  if (!opts.length) return null;
  // On garde les 8 pour plus tard si autre chose fait l affaire.
  const notEight = opts.filter((c) => rankOf(c) !== 8);
  const pool = notEight.length ? notEight : opts;
  return pool.reduce((a, b) => (penalty(a) >= penalty(b) ? a : b));
}

function autoTurn(state, pid) {
  const c = autoPick(state, pid);
  if (c !== null) {
    playCard(state, pid, c);
    if (state.phase === 'suit') {
      // Couleur automatique : celle dont il a le plus de cartes.
      const cnt = [0, 0, 0, 0];
      for (const x of state.hands[pid]) cnt[suitOf(x)]++;
      chooseSuit(state, pid, cnt.indexOf(Math.max(...cnt)));
    }
    return;
  }
  doDraw(state, pid);
  if (state.turnPid === pid && state.phase === 'play') {
    const c2 = autoPick(state, pid);
    if (c2 !== null) {
      playCard(state, pid, c2);
      if (state.phase === 'suit') {
        const cnt = [0, 0, 0, 0];
        for (const x of state.hands[pid]) cnt[suitOf(x)]++;
        chooseSuit(state, pid, cnt.indexOf(Math.max(...cnt)));
      }
    } else {
      state.passStreak++;
      if (state.passStreak >= state.pids.length) endManche(state, null);
      else advance(state);
    }
  }
}

// ── Carte seule : annoncer, denoncer ───────────────────────────────────

function callSeule(state, pid) {
  const s = state.seule;
  if (!s || s.pid !== pid || s.called) return false;
  s.called = true;
  state.stats[pid].called++;
  state.evq.push({ e: 'called', pid });
  return true;
}

function denounce(state, by) {
  const s = state.seule;
  if (!s || s.pid === by) return false;
  if (s.called) {                     // trop tard : il avait annonce
    state.evq.push({ e: 'raté', pid: by });
    return false;
  }
  const victim = s.pid;
  state.seule = null;
  give(state, victim, 2);
  state.stats[victim].forgot++;
  state.stats[by].denounced++;
  state.evq.push({ e: 'denonce', pid: victim, by, n: state.hands[victim].length });
  return true;
}

// ── Entrees ────────────────────────────────────────────────────────────

export function onInput(state, pid, d) {
  // Repli du harnais : un tap brut devient une action plausible.
  if (!d || typeof d.tx !== 'number' || !Number.isFinite(d.tx)) return;
  if (state.done || !state.hands[pid]) return;
  const band = Math.floor((((d.tx % 1000) + 1000) % 1000) / 250); // 0..3
  if (state.seule && state.seule.pid === pid && band === 3) { callSeule(state, pid); return; }
  if (state.seule && state.seule.pid !== pid && band === 3) { denounce(state, pid); return; }
  if (state.phase === 'suit' && pid === state.turnPid) { chooseSuit(state, pid, band); return; }
  if (state.phase !== 'play' || pid !== state.turnPid) return;
  if (band === 0) { doDraw(state, pid); return; }
  const c = autoPick(state, pid);
  if (c !== null) playCard(state, pid, c);
  else doDraw(state, pid);
}

export function onAction(state, pid, a, d) {
  if (state.done || typeof a !== 'string' || !state.hands[pid]) return;

  if (a === 'seule') { callSeule(state, pid); return; }
  if (a === 'denonce') { denounce(state, pid); return; }

  if (a === 'suit') {
    const s = d && typeof d === 'object' ? num(d.s) : null;
    if (s !== null) chooseSuit(state, pid, Math.round(s));
    return;
  }
  if (state.phase !== 'play' || pid !== state.turnPid) return;

  if (a === 'play') {
    const c = d && typeof d === 'object' ? num(d.c) : null;
    if (c === null) return;
    playCard(state, pid, Math.round(c));
    return;
  }
  if (a === 'draw') { doDraw(state, pid); return; }
  if (a === 'pass') {
    if (!state.drew || state.pending > 0) return;   // on ne passe qu apres avoir pioche
    state.passStreak++;
    if (state.passStreak >= state.pids.length) endManche(state, null);
    else advance(state);
  }
}

export function tick(state, dt) {
  const evs = state.evq;
  state.evq = [];
  state.tick++;
  state.simT += dt;
  if (state.done) return evs;

  // Fenetre « carte seule » : elle vit en parallele, sans bloquer le jeu.
  if (state.seule) {
    state.seule.t -= dt;
    if (state.seule.t <= 0) state.seule = null;
  }

  if (state.phase === 'pre') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) startManche(state);
    return evs;
  }
  if (state.phase === 'play' || state.phase === 'suit') {
    state.mancheT += dt;
    if (state.mancheT > MANCHE_MAX) { endManche(state, null); return evs; }
  }
  if (state.phase === 'play') {
    state.turnT -= dt;
    if (state.turnT <= 0) autoTurn(state, state.turnPid);
  } else if (state.phase === 'suit') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) {
      const cnt = [0, 0, 0, 0];
      for (const x of state.hands[state.turnPid]) cnt[suitOf(x)]++;
      chooseSuit(state, state.turnPid, cnt.indexOf(Math.max(...cnt)));
    }
  } else if (state.phase === 'show') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) {
      if (state.manche >= state.manches) { state.phase = 'end'; state.phaseT = END_T; }
      else startManche(state);
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
  const spec = !pid || !state.hands[pid];
  const key = spec ? 'spec' : pid;
  if (state._viewTick !== state.tick) {
    state._views.clear();
    state._viewTick = state.tick;
  }
  const hit = state._views.get(key);
  if (hit) return hit;

  const myTeam = spec ? -1 : state.teamOf[pid];
  const teamPlay = state.cfg.format.kind === 'teams';
  const players = {};
  for (const id of state.pids) {
    const hand = state.hands[id];
    // Secret : on ne montre les cartes que pour soi, ses coequipiers en
    // format equipes, et les spectateurs (qui ont droit au spectacle).
    const open = spec || id === pid || (teamPlay && state.teamOf[id] === myTeam);
    players[id] = {
      n: hand.length,
      cards: open ? hand : null,
      turn: id === state.turnPid ? 1 : 0,
      team: state.teamOf[id],
      score: state.scores[id],
      pen: state.phase === 'show' ? handPenalty(hand) : null,
    };
  }
  const top = state.discard[state.discard.length - 1];
  const v = {
    phase: state.phase,
    tl: Math.round(Math.max(0, state.phase === 'play' ? state.turnT : state.phaseT) * 10) / 10,
    tlMax: state.phase === 'play' ? TURN_T : state.phase === 'suit' ? SUIT_T : SHOW_T,
    manche: state.manche,
    manches: state.manches,
    turn: state.turnPid,
    dir: state.dir,
    top: top === undefined ? null : top,
    suit: state.suit,
    pending: state.pending,
    drawN: state.draw.length,
    drew: state.drew ? 1 : 0,
    order: state.pids,
    winner: state.winner,
    requin: state.requin,
    // Privilege du Requin : il voit le dessus de la pioche.
    peek: !spec && pid === state.requin && state.draw.length
      ? state.draw[state.draw.length - 1] : null,
    seule: state.seule
      ? { pid: state.seule.pid, t: Math.round(state.seule.t * 10) / 10, called: state.seule.called ? 1 : 0 }
      : null,
    can: {
      play: !spec && state.phase === 'play' && state.turnPid === pid ? 1 : 0,
      draw: !spec && state.phase === 'play' && state.turnPid === pid && (state.pending > 0 || !state.drew) ? 1 : 0,
      pass: !spec && state.phase === 'play' && state.turnPid === pid && state.drew && state.pending === 0 ? 1 : 0,
      suit: !spec && state.phase === 'suit' && state.turnPid === pid ? 1 : 0,
      seule: !spec && state.seule && state.seule.pid === pid && !state.seule.called ? 1 : 0,
      denonce: !spec && state.seule && state.seule.pid !== pid && !state.seule.called ? 1 : 0,
    },
    // Cartes jouables de MA main (calculees serveur : jamais de divergence).
    ok: spec ? [] : state.hands[pid].filter((c) => playable(state, c)),
    players,
  };
  state._views.set(key, v);
  return v;
}

export function results(state) {
  const { cfg } = state;
  const penOf = (pid) => state.scores[pid] || 0;
  // Score d equipe : moyenne, pour comparer 1 contre 7 sans injustice.
  const teamPen = cfg.teams.map((team) => team.reduce((s, p) => s + penOf(p), 0) / team.length);
  const best = Math.min(...teamPen);
  const winTeams = teamPen.map((s, t) => [s, t]).filter(([s]) => Math.abs(s - best) < 0.001).map(([, t]) => t);
  const allTied = winTeams.length === cfg.teams.length && cfg.teams.length > 1;
  const winners = allTied ? [] : winTeams.flatMap((t) => cfg.teams[t]);

  // Le plus PETIT total gagne : on classe donc sur l oppose.
  const ranking = cfg.teams.flat()
    .map((pid) => ({ pid, score: -penOf(pid), label: `${penOf(pid)} pts` }))
    .sort((a, b) => b.score - a.score);

  const titles = [];
  const all = state.pids.map((pid) => ({ pid, s: state.stats[pid] }));
  const top = (fn) => all.slice().sort((a, b) => fn(b.s) - fn(a.s))[0];
  const sept = top((s) => s.sevens);
  if (sept.s.sevens >= 2) titles.push({ pid: sept.pid, emoji: '7️⃣', text: `Roi du 7 : ${sept.s.sevens} fois la note salee` });
  const huit = top((s) => s.eights);
  if (huit.s.eights >= 2) titles.push({ pid: huit.pid, emoji: '8️⃣', text: `Change la couleur comme de chemise : ${huit.s.eights} huit` });
  const oubli = top((s) => s.forgot);
  if (oubli.s.forgot >= 1) titles.push({ pid: oubli.pid, emoji: '🤫', text: `A oublie CARTE SEULE ${oubli.s.forgot} fois` });
  const balance = top((s) => s.denounced);
  if (balance.s.denounced >= 1) titles.push({ pid: balance.pid, emoji: '🔔', text: `Delateur officiel : ${balance.s.denounced} denonciation(s)` });
  const pioche = top((s) => s.drawn);
  if (pioche.s.drawn >= 12) titles.push({ pid: pioche.pid, emoji: '🃏', text: `A pioche la moitie du paquet : ${pioche.s.drawn} cartes` });
  const vainqueur = top((s) => s.wins);
  if (vainqueur.s.wins >= 1) titles.push({ pid: vainqueur.pid, emoji: '🎴', text: `Main la plus rapide : ${vainqueur.s.wins} manche(s)` });
  if (!titles.length) titles.push({ pid: ranking[0].pid, emoji: '🎖️', text: 'A su se debarrasser de ses cartes' });
  return { ranking, winners, titles };
}

// ── Bot : joue les effets au bon moment, garde ses 8, oublie parfois ────

export function botAct(state, pid, mind, api) {
  if (state.done || !state.hands[pid]) return;
  const pers = mind.p, rng = mind.rng, mem = mind.mem;

  // Annoncer « carte seule » : les bons bots y pensent, les autres oublient.
  const s = state.seule;
  if (s && s.pid === pid && !s.called) {
    const key = `c-${state.manche}-${state.discard.length}`;
    if (mem.ck !== key) {
      mem.ck = key;
      if (rng.chance(0.3 + pers.skill * 0.65)) { api.act('seule'); return; }
    }
  }
  // Denoncer l etourdi : question de temperament.
  if (s && s.pid !== pid && !s.called && s.t < SEULE_T - 0.8) {
    const key = `d-${s.pid}-${state.manche}`;
    if (mem.dk !== key) {
      mem.dk = key;
      if (rng.chance(0.3 + pers.aggro * 0.6)) { api.act('denonce'); return; }
    }
  }

  // Choix de la couleur apres un 8.
  if (state.phase === 'suit' && state.turnPid === pid) {
    const key = `s-${state.manche}-${state.tick}`;
    if (mem.sk === key) return;
    mem.sk = key;
    const cnt = [0, 0, 0, 0];
    for (const c of state.hands[pid]) cnt[suitOf(c)]++;
    let best = cnt.indexOf(Math.max(...cnt));
    if (rng.chance(pers.chaos * 0.2)) best = rng.int(0, 3);
    api.act('suit', { s: best });
    return;
  }

  if (state.phase !== 'play' || state.turnPid !== pid) return;
  const hand = state.hands[pid];
  const key = `${state.manche}-${state.discard.length}-${hand.length}-${state.drew ? 1 : 0}`;
  if (mem.k !== key) {
    mem.k = key;
    mem.delay = 0.3 + rng.next() * 1.3 * pers.pace;
    mem.at = state.simT;
    return;
  }
  if (state.simT - mem.at < mem.delay) return;
  mem.k = `${key}-done`;

  const opts = hand.filter((c) => playable(state, c));
  if (!opts.length) {
    if (state.drew && state.pending === 0) api.act('pass');
    else api.act('draw');
    return;
  }
  // Un adversaire est sur le point de gagner : on sort l artillerie.
  const menace = state.pids.some((o) => o !== pid && state.teamOf[o] !== state.teamOf[pid] && state.hands[o].length <= 2);
  const score = (c) => {
    const r = rankOf(c);
    let v = penalty(c);                       // se debarrasser des grosses cartes
    if (r === 8) v -= 45;                      // le joker se garde pour plus tard
    if (menace && (r === 7 || r === 13 || r === 1)) v += 40;
    if (hand.length <= 2 && r === 8) v += 60;  // sauf pour finir
    if (suitOf(c) === state.suit) v += 3;
    return v;
  };
  let pick = opts.reduce((a, b) => (score(a) >= score(b) ? a : b));
  if (rng.chance(pers.chaos * 0.15)) pick = rng.pick(opts);
  if (hand.length > 3 && state.pending === 0 && !state.drew
      && rng.chance((1 - pers.skill) * 0.12)) {
    api.act('draw');                           // hesitation des bots faibles
    return;
  }
  api.act('play', { c: pick });
}
