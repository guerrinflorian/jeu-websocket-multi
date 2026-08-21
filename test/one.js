// Test d'UN seul stand : `node test/one.js <id>` (ou plusieurs ids).
// Joue la partie complète en chacun pour soi puis en 1 contre tous, comme
// le fait `npm test`, mais sans repasser sur les seize autres.

import { ok, summary, startServer } from './util.js';
import { playGame } from './games.test.js';

const ids = process.argv.slice(2);
if (!ids.length) {
  console.error('usage : node test/one.js <id du jeu> [autre id...]');
  process.exit(2);
}

const srv = await startServer({ turbo: 10 });
try {
  const manifest = await (await fetch(`${srv.httpUrl}/api/games`)).json();
  for (const id of ids) {
    const meta = manifest.find((m) => m.id === id);
    if (!meta) { ok(false, `jeu « ${id} » introuvable dans le manifest`); continue; }
    await playGame(srv, meta);
    await playGame(srv, meta, { formatKind: 'asym', label: ' (asym 1vN)' });
  }
  ok(srv.errors.length === 0, `aucune erreur serveur (${srv.errors[0]?.slice(0, 120) || 'ok'})`);
} finally {
  await srv.stop();
}
process.exit(summary() ? 0 : 1);
