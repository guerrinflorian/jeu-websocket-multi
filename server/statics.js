// Mini serveur statique : client/ à la racine, /shared/ et /games/ exposés.
// games/*/server.js est bloqué (code serveur), le reste du dossier jeu est
// public (meta.js, client.js, rules.md).

import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

const GAME_PUBLIC = new Set(['meta.js', 'client.js', 'rules.md', 'preview.js']);

export function makeStatics(rootDir, prod) {
  const clientDir = path.join(rootDir, 'client');
  const sharedDir = path.join(rootDir, 'shared');
  const gamesDir = path.join(rootDir, 'games');

  return function serve(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end();
      return;
    }
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (url.includes('..') || url.includes('\0')) {
      res.writeHead(400).end();
      return;
    }

    let file = null;
    if (url === '/' || url === '/index.html') {
      file = path.join(clientDir, 'index.html');
    } else if (url.startsWith('/shared/')) {
      file = path.join(sharedDir, url.slice('/shared/'.length));
    } else if (url.startsWith('/games/')) {
      const parts = url.slice('/games/'.length).split('/');
      if (parts.length !== 2 || !GAME_PUBLIC.has(parts[1])) {
        res.writeHead(404).end();
        return;
      }
      file = path.join(gamesDir, parts[0], parts[1]);
    } else {
      file = path.join(clientDir, url.slice(1));
    }

    if (!existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('404');
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const headers = {
      'content-type': MIME[ext] || 'application/octet-stream',
      'cache-control': prod && ext !== '.html' ? 'public, max-age=300' : 'no-cache',
    };
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    createReadStream(file).pipe(res);
  };
}
