// LA KERMESSE : un seul process : statique + WebSocket + /healthz.

import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CFG } from './config.js';
import { loadGames, gamesManifest } from './gameloader.js';
import { makeStatics } from './statics.js';
import { Rooms } from './rooms.js';
import { attachWs } from './wsserver.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const games = await loadGames(path.join(ROOT, 'games'));
const manifestJson = JSON.stringify(gamesManifest(games));
const rooms = new Rooms(games);
const serveStatic = makeStatics(ROOT, CFG.PROD);

const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' }).end('ok');
    return;
  }
  if (url === '/api/games') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-cache' });
    res.end(manifestJson);
    return;
  }
  serveStatic(req, res);
});

const wss = attachWs(server, rooms);

server.listen(CFG.PORT, CFG.HOST, () => {
  console.log(`🎪 La Kermesse ouvre ses portes sur http://localhost:${CFG.PORT} (${games.size} jeux)`);
});

// Arrêt propre (Render envoie SIGTERM au redéploiement) : on prévient les
// clients avec un code explicite pour qu'ils re-connectent d'eux-mêmes.
function shutdown() {
  console.log('🎪 Fermeture de la Kermesse…');
  for (const ws of wss.clients) ws.close(1012, 'restart');
  rooms.shutdown();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Un bug ne doit pas éteindre la fête : on journalise et on continue.
process.on('uncaughtException', (err) => console.error('uncaughtException :', err));
process.on('unhandledRejection', (err) => console.error('unhandledRejection :', err));
