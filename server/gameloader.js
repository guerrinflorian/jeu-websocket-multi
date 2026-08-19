// Charge games/*/ et valide le contrat de jeu au démarrage (fail fast).
// Le cœur ne connaît aucun jeu : il n'appelle que le contrat.

import { readdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const SRV_FNS = ['createState', 'onInput', 'onAction', 'tick', 'isOver', 'view', 'results', 'botAct'];
const META_FIELDS = ['id', 'name', 'emoji', 'pitch', 'minPlayers', 'maxPlayers', 'caps', 'controls', 'howto'];

export async function loadGames(gamesDir) {
  const games = new Map();
  if (!existsSync(gamesDir)) return games;
  for (const dir of readdirSync(gamesDir, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const id = dir.name;
    const metaPath = path.join(gamesDir, id, 'meta.js');
    const srvPath = path.join(gamesDir, id, 'server.js');
    if (!existsSync(metaPath) || !existsSync(srvPath)) {
      throw new Error(`Jeu « ${id} » : meta.js ou server.js manquant`);
    }
    const meta = (await import(pathToFileURL(metaPath))).default;
    const srv = await import(pathToFileURL(srvPath));
    for (const f of META_FIELDS) {
      if (meta?.[f] === undefined) throw new Error(`Jeu « ${id} » : meta.${f} manquant`);
    }
    if (meta.id !== id) throw new Error(`Jeu « ${id} » : meta.id (${meta.id}) ≠ nom du dossier`);
    for (const f of SRV_FNS) {
      if (typeof srv[f] !== 'function') throw new Error(`Jeu « ${id} » : server.${f}() manquant`);
    }
    games.set(id, { meta, srv });
  }
  return games;
}

// Liste sérialisable des metas, pour GET /api/games.
export function gamesManifest(games) {
  return [...games.values()].map((g) => g.meta);
}
