// Registre des rooms : codes, création/jointure, grâce de reconnexion,
// nettoyage périodique des rooms vides ou zombies.

import { CFG } from './config.js';
import { CODE_ALPHABET, makeRng } from '../shared/const.js';
import { Room } from './room.js';

export class Rooms {
  constructor(games) {
    this.games = games;
    this.rooms = new Map();       // code → Room
    this.grace = new Map();       // token → { code, pid, until }
    this.rng = makeRng((Date.now() ^ 0x5eed) >>> 0);
    this.sweeper = setInterval(() => this.sweep(), CFG.SWEEP_MS);
  }

  newCode() {
    for (let tries = 0; tries < 50; tries++) {
      let code = '';
      for (let i = 0; i < 4; i++) code += CODE_ALPHABET[this.rng.int(0, CODE_ALPHABET.length - 1)];
      if (!this.rooms.has(code)) return code;
    }
    return null;
  }

  create() {
    if (this.rooms.size >= CFG.MAX_ROOMS) return null;
    const code = this.newCode();
    if (!code) return null;
    const room = new Room(code, this.games);
    this.rooms.set(code, room);
    return room;
  }

  get(code) {
    return this.rooms.get(String(code || '').toUpperCase().trim()) || null;
  }

  // Enregistre la possibilité de reprise pour un token.
  bindToken(token, room, pid) {
    this.grace.set(token, { code: room.code, pid, until: Infinity });
  }

  // À la déconnexion : la reprise n'est valable que GRACE_MS.
  startGrace(token) {
    const g = this.grace.get(token);
    if (g) g.until = Date.now() + CFG.GRACE_MS;
  }

  // Reprise en deux temps : peek (validation) puis complete (attache),
  // pour que le serveur WS envoie `welcome` avant `room`/`start`.
  peekGrace(token) {
    const g = this.grace.get(token);
    if (!g || Date.now() > g.until) return null;
    const room = this.rooms.get(g.code);
    if (!room || !room.members.get(g.pid) || room.members.get(g.pid).bot) return null;
    return { room, pid: g.pid };
  }

  completeResume(token, conn) {
    const g = this.grace.get(token);
    const room = this.rooms.get(g.code);
    if (room.resume(conn, g.pid)) {
      g.until = Infinity;
      return true;
    }
    return false;
  }

  sweep() {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (room.sweep(now)) {
        room.destroy();
        this.rooms.delete(code);
      }
    }
    for (const [token, g] of this.grace) {
      if (Number.isFinite(g.until) && now > g.until + 5000) this.grace.delete(token);
      else if (!this.rooms.has(g.code)) this.grace.delete(token);
    }
  }

  shutdown() {
    clearInterval(this.sweeper);
    for (const room of this.rooms.values()) room.destroy();
    this.rooms.clear();
  }
}
