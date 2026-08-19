// Tests des jeux : pour CHAQUE jeu du manifest, une partie complète est
// jouée (2 humains pilotés au hasard + 6 forains) jusqu'à l'écran de
// résultats. + reconnexion en pleine partie, spectateur, format asym, fuzz.

import { ok, section, sleep, startServer } from './util.js';
import { Sim } from './simclient.js';

// Génère des inputs plausibles d'après le schéma de contrôles du jeu.
function drive(sim, meta, i) {
  const mv = meta.controls.move;
  if (mv === 'steer') sim.send({ t: 'input', d: { turn: [-1, 0, 1, 0][i % 4] } });
  else if (mv === 'joystick') {
    const a = (i * 0.7) % (Math.PI * 2);
    sim.send({ t: 'input', d: { mx: Math.cos(a), my: Math.sin(a) } });
  } else if (mv === 'tap') {
    sim.send({ t: 'input', d: { tx: 100 + (i * 37) % 800, ty: 100 + (i * 53) % 400 } });
  }
  const btns = meta.controls.buttons || [];
  if (btns.length && i % 6 === 0) sim.send({ t: 'act', a: btns[i % btns.length].id });
  // Fuzz : le serveur doit ignorer les inputs absurdes sans broncher.
  if (i % 11 === 0) sim.send({ t: 'input', d: { turn: 'lol', mx: 1e9, junk: [1, 2] } });
  if (i % 13 === 0) sim.send({ t: 'act', a: 'inexistant' });
}

async function playGame(srv, meta, { formatKind = null, label = '' } = {}) {
  section(`${meta.id}${label} — partie complète`);
  const a = new Sim(srv.url, 'Anna');
  const b = new Sim(srv.url, 'Bilal');
  await Promise.all([a.connect(), b.connect()]);
  await a.hello(); await b.hello();
  await a.create();
  await b.join(a.code);
  a.send({ t: 'setGame', gameId: meta.id });
  await a.untilRoom((r) => r.gameId === meta.id);
  for (let i = 0; i < 6; i++) a.send({ t: 'addBot' });
  const room = await a.untilRoom((r) => r.players.length === 8);

  ok(room.formats.length >= 3, `≥ 3 formats à 8 joueurs (${room.formats.length})`);
  ok(room.formats.some((f) => f.kind === 'asym'), 'au moins un format asymétrique');

  if (formatKind) {
    const fmt = room.formats.find((f) => f.kind === formatKind);
    a.send({ t: 'setFormat', formatId: fmt.id });
    await a.untilRoom((r) => r.formatId === fmt.id);
  }
  // Réglages les plus courts pour le test.
  const patch = {};
  for (const [k, spec] of Object.entries(meta.settings || {})) patch[k] = spec.values[0];
  a.send({ t: 'setSettings', patch });
  b.send({ t: 'ready', on: true });
  await sleep(100);

  const startP = a.next('start', null, 8000);
  a.send({ t: 'start' });
  const start = await startP;
  ok(start.config.teams.flat().length === 8, 'config.teams couvre les 8 joueurs');
  ok(!!start.config.players[a.pid], 'je suis dans config.players');

  await a.next('snap', null, 8000);
  ok(true, 'les snapshots arrivent');

  const overP = a.next('over', null, 180000);
  let i = 0;
  const iv = setInterval(() => { drive(a, meta, i); drive(b, meta, i + 3); i++; }, 60);
  const over = await overP.finally(() => clearInterval(iv));

  ok(Array.isArray(over.ranking) && over.ranking.length === 8, `ranking complet (${over.ranking?.length})`);
  ok(Array.isArray(over.winners), 'winners présent');
  ok(Array.isArray(over.titles) && over.titles.length >= 1, `titres décernés (${over.titles?.length})`);
  await b.next('over', null, 3000).catch(() => null);
  ok(!!b.lastOver, 'l\'autre humain reçoit aussi les résultats');

  a.send({ t: 'toLobby' });
  await a.untilRoom((r) => r.phase === 'lobby', 8000);
  ok(true, 'retour au lobby');
  a.send({ t: 'leave' }); b.send({ t: 'leave' });
  a.close(); b.close();
  await sleep(150);
}

async function testMidGame(srv, meta) {
  section(`${meta.id} — reconnexion & spectateur en pleine partie`);
  const a = new Sim(srv.url, 'Momo');
  const b = new Sim(srv.url, 'Lina');
  await Promise.all([a.connect(), b.connect()]);
  await a.hello(); await b.hello();
  await a.create();
  await b.join(a.code);
  a.send({ t: 'setGame', gameId: meta.id });
  for (let i = 0; i < 4; i++) a.send({ t: 'addBot' });
  await a.untilRoom((r) => r.players.length === 6);
  b.send({ t: 'ready', on: true });
  await sleep(80);
  const startP = a.next('start', null, 8000);
  a.send({ t: 'start' });
  await startP;
  await a.next('snap', null, 8000);

  // B tombe en pleine partie puis revient avec son token.
  const bPid = b.pid, bToken = b.token;
  b.kill();
  await sleep(400);
  const b2 = new Sim(srv.url, 'Lina2');
  b2.token = bToken;
  await b2.connect();
  const w = await b2.hello();
  ok(w.resumed && w.pid === bPid, 'reprise en pleine partie → même pid');
  const startMsg = await b2.next('start', null, 5000);
  ok(startMsg.gameId === meta.id, 'la reprise renvoie le bundle start');
  if (meta.id === 'serpentin') {
    const full = await b2.next('snap', (m) => m.full === true, 5000).catch(() => null);
    ok(!!full, 'snapshot complet (traînées) reçu à la reprise');
  }
  await b2.next('snap', (m) => !m.full, 5000);
  ok(true, 'les snapshots reprennent');

  // Un 3ᵉ humain rejoint en cours de partie → spectateur, jamais d'écran noir.
  const c = new Sim(srv.url, 'Sacha');
  await c.connect();
  await c.hello();
  await c.join(a.code);
  const cStart = await c.next('start', null, 5000);
  ok(!cStart.config.players[c.pid], 'arrivé en cours → spectateur (pas dans la partie)');
  await c.next('snap', null, 5000);
  ok(true, 'le spectateur reçoit les snapshots');

  // L'hôte quitte en pleine partie : la partie continue, l'hôte migre.
  a.kill();
  await b2.untilRoom((r) => r.hostPid === bPid, 8000);
  ok(true, 'migration d\'hôte en pleine partie');
  await b2.next('snap', null, 5000);
  ok(true, 'la partie continue après le départ de l\'hôte');

  b2.close(); c.close();
  await sleep(150);
}

export async function run() {
  const srv = await startServer({ turbo: 10 });
  try {
    const manifest = await (await fetch(`${srv.httpUrl}/api/games`)).json();
    ok(manifest.length >= 1, `${manifest.length} jeu(x) chargé(s)`);
    for (const meta of manifest) {
      await playGame(srv, meta);
    }
    // Le format asymétrique est joué de bout en bout sur chaque jeu.
    for (const meta of manifest) {
      await playGame(srv, meta, { formatKind: 'asym', label: ' (asym 1vN)' });
    }
    await testMidGame(srv, manifest.find((m) => m.id === 'serpentin') || manifest[0]);
    ok(srv.errors.length === 0, `aucune erreur serveur (${srv.errors[0]?.slice(0, 120) || 'ok'})`);
  } finally {
    await srv.stop();
  }
}
