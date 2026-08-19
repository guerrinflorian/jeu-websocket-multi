// Tests du cœur : moteur de formats (unitaire) + lobby réel via WS
// (création, jointure, profils, prêts, bots, migration d'hôte, reconnexion).

import { computeFormats, assignTeams } from '../shared/formats.js';
import { makeRng } from '../shared/const.js';
import { ok, eq, section, sleep, startServer } from './util.js';
import { Sim } from './simclient.js';

const FULL_CAPS = {
  ffa: true,
  teams: { min: 2, max: 4, uneven: true },
  asym: { solo: [1, 2], roles: { solo: 'Solo', crowd: 'Foule' } },
};

export async function run() {
  section('formats : unitaire');
  {
    const ids8 = computeFormats(FULL_CAPS, 8).map((f) => f.id);
    for (const id of ['ffa', 't-4-4', 't-5-3', 't-6-2', 't-3-3-2', 't-2-2-2-2', 'asym-1-7', 'asym-2-6']) {
      ok(ids8.includes(id), `n=8 propose ${id}`);
    }
    eq(computeFormats(FULL_CAPS, 2).map((f) => f.id), ['ffa'], 'n=2 → ffa seul');
    const ids3 = computeFormats(FULL_CAPS, 3).map((f) => f.id);
    eq(ids3, ['ffa', 'asym-1-2'], 'n=3 → ffa + asym-1-2');
    const noUneven = { ffa: true, teams: { min: 2, max: 4, uneven: false } };
    eq(computeFormats(noUneven, 5).map((f) => f.id), ['ffa'], 'n=5 sans uneven → ffa seul');
    const ids6 = computeFormats(FULL_CAPS, 6).map((f) => f.id);
    for (const id of ['t-3-3', 't-4-2', 't-2-2-2', 'asym-1-5', 'asym-2-4']) {
      ok(ids6.includes(id), `n=6 propose ${id}`);
    }
    const rng = makeRng(42);
    const fmt = computeFormats(FULL_CAPS, 5).find((f) => f.id === 't-3-2');
    const teams = assignTeams(fmt, ['a', 'b', 'c', 'd', 'e'], rng);
    eq(teams.map((t) => t.length), [3, 2], 'assignTeams respecte les tailles');
    const ffaTeams = assignTeams({ kind: 'ffa' }, ['a', 'b'], null);
    eq(ffaTeams, [['a'], ['b']], 'assignTeams FFA → équipes de 1');
  }

  section('lobby : intégration WS réelle');
  const srv = await startServer();
  try {
    // 3 humains : création, jointure par code, profils.
    const alice = new Sim(srv.url, 'Alice');
    const bob = new Sim(srv.url, 'Bob');
    const carol = new Sim(srv.url, 'Carol');
    await Promise.all([alice.connect(), bob.connect(), carol.connect()]);
    await alice.hello();
    await bob.hello();
    await carol.hello();
    ok(alice.token && bob.token, 'welcome fournit des tokens');

    await alice.create();
    ok(/^[2-9A-Z]{4}$/.test(alice.code), `code de room lisible (${alice.code})`);
    await bob.join(alice.code);
    await carol.join(alice.code.toLowerCase());
    ok(carol.lastRoom, 'jointure insensible à la casse');
    await alice.untilRoom((r) => r.players.length === 3);
    eq(alice.lastRoom.players.length, 3, '3 joueurs dans la room');
    eq(alice.lastRoom.hostPid, alice.pid, 'le créateur est hôte');
    ok(alice.lastRoom.players.every((p) => p.name), 'tous les joueurs ont un pseudo');

    // Room inconnue.
    const dave = new Sim(srv.url, 'Dave');
    await dave.connect();
    await dave.hello();
    const errP = dave.next('error');
    dave.send({ t: 'join', code: 'ZZZZ' });
    eq((await errP).code, 'BAD_CODE', 'join code inconnu → BAD_CODE');

    // Bots + formats recalculés.
    alice.send({ t: 'addBot' });
    alice.send({ t: 'addBot' });
    await alice.untilRoom((r) => r.players.length === 5);
    const room5 = alice.lastRoom;
    ok(room5.players.filter((p) => p.bot).length === 2, '2 bots ajoutés par l\'hôte');
    ok(room5.players.filter((p) => p.bot).every((p) => p.ready), 'les bots sont auto-prêts');
    if (room5.gameId) ok(room5.formats.some((f) => f.id === 'ffa'), 'formats recalculés (ffa présent)');
    else ok(room5.formats.length === 0, 'aucun jeu chargé → aucun format (games/ vide)');

    // Non-hôte ne peut pas ajouter de bot.
    bob.send({ t: 'addBot' });
    await sleep(300);
    eq(alice.lastRoom.players.length, 5, 'un non-hôte ne peut pas ajouter de bot');

    // Choix d'un format à équipes → affectations visibles.
    const teamFmt = room5.formats.find((f) => f.kind === 'teams');
    if (teamFmt) {
      alice.send({ t: 'setFormat', formatId: teamFmt.id });
      await alice.untilRoom((r) => r.formatId === teamFmt.id);
      const teams = new Set(alice.lastRoom.players.map((p) => p.team));
      ok(teams.size >= 2, `format ${teamFmt.id} → au moins 2 équipes affectées`);
    }

    // Ready.
    bob.send({ t: 'ready', on: true });
    await alice.untilRoom((r) => r.players.find((p) => p.pid === bob.pid)?.ready === true);
    ok(true, 'ready-up propagé');

    // Reconnexion : Bob perd sa connexion, revient avec son token → même pid.
    const bobPid = bob.pid;
    const bobToken = bob.token;
    bob.kill();
    await alice.untilRoom((r) => r.players.find((p) => p.pid === bobPid)?.connected === false);
    ok(true, 'déconnexion de Bob vue par la room');
    const bob2 = new Sim(srv.url, 'Bob2');
    bob2.token = bobToken;
    await bob2.connect();
    const w = await bob2.hello();
    ok(w.resumed === true, 'reprise avec token → resumed');
    eq(w.pid, bobPid, 'reprise → même pid');
    await bob2.untilRoom((r) => r.players.find((p) => p.pid === bobPid)?.connected === true);
    ok(true, 'Bob reconnecté visible par tous');

    // Migration d'hôte : Alice (hôte) part → Bob (plus ancien connecté) hérite.
    alice.kill();
    await bob2.untilRoom((r) => r.hostPid === bobPid);
    ok(true, 'migration d\'hôte vers le plus ancien humain connecté');

    // L'API /api/games répond.
    const res = await fetch(`${srv.httpUrl}/api/games`);
    ok(res.ok && Array.isArray(await res.json()), '/api/games répond un tableau');

    // Le serveur statique bloque les server.js des jeux.
    const blocked = await fetch(`${srv.httpUrl}/games/serpentin/server.js`);
    eq(blocked.status, 404, 'games/*/server.js est bloqué');

    // Flood : le rate limiting ne fait pas tomber le serveur.
    for (let i = 0; i < 300; i++) carol.send({ t: 'setGame', gameId: 'x' });
    for (let i = 0; i < 100; i++) carol.send('garbage-non-json');
    await sleep(500);
    const health = await fetch(`${srv.httpUrl}/healthz`);
    ok(health.ok, 'le serveur survit au flood + messages malformés');

    bob2.close(); carol.close(); dave.close();
    await sleep(200);
    ok(srv.errors.length === 0, `aucune erreur serveur (${srv.errors.length ? srv.errors[0] : 'ok'})`);
  } finally {
    await srv.stop();
  }
}
