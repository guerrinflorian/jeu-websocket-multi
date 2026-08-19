// Couche WebSocket : connexions, hello/reprise, rate limiting, heartbeat.

import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';
import { CFG } from './config.js';

export function attachWs(httpServer, rooms) {
  const wss = new WebSocketServer({
    server: httpServer,
    maxPayload: CFG.MAX_PAYLOAD,
  });

  wss.on('connection', (ws) => {
    if (wss.clients.size > CFG.MAX_CONNS) {
      ws.close(1013, 'full');
      return;
    }
    const conn = makeConn(ws);
    ws.on('pong', () => { conn.alive = true; });
    ws.on('message', (raw) => onMessage(conn, raw, rooms));
    ws.on('close', () => {
      if (conn.room) conn.room.onDisconnect(conn);
      if (conn.token) rooms.startGrace(conn.token);
    });
    ws.on('error', () => {});
  });

  const beat = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.kermesse && !ws.kermesse.alive) { ws.terminate(); continue; }
      if (ws.kermesse) ws.kermesse.alive = false;
      ws.ping();
    }
  }, CFG.HEARTBEAT_MS);
  wss.on('close', () => clearInterval(beat));

  return wss;
}

function makeConn(ws) {
  const conn = {
    ws,
    pid: null,
    token: null,
    room: null,
    profile: { name: null, face: 0 },
    alive: true,
    // Token buckets : un pour le flux d'inputs, un pour le reste.
    inputTokens: CFG.RATE_BURST,
    msgTokens: CFG.RATE_BURST,
    lastRefill: Date.now(),
    strikes: 0,
    send(obj) { this.sendRaw(JSON.stringify(obj)); },
    sendRaw(json) { if (ws.readyState === ws.OPEN) ws.send(json); },
    close(code, reason) { try { ws.close(code, reason); } catch { /* déjà fermé */ } },
  };
  ws.kermesse = conn;
  return conn;
}

function refill(conn) {
  const now = Date.now();
  const dt = (now - conn.lastRefill) / 1000;
  if (dt <= 0) return;
  conn.lastRefill = now;
  conn.inputTokens = Math.min(CFG.RATE_BURST, conn.inputTokens + dt * CFG.RATE_INPUT_PER_S);
  conn.msgTokens = Math.min(CFG.RATE_BURST, conn.msgTokens + dt * CFG.RATE_MSG_PER_S);
}

function onMessage(conn, raw, rooms) {
  refill(conn);
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    return strike(conn);
  }
  if (!msg || typeof msg.t !== 'string') return strike(conn);

  const isFlow = msg.t === 'input' || msg.t === 'ping';
  const bucket = isFlow ? 'inputTokens' : 'msgTokens';
  if (conn[bucket] < 1) {
    if (!isFlow) conn.send({ t: 'error', code: 'RATE' });
    return strike(conn);
  }
  conn[bucket] -= 1;
  conn.strikes = 0;

  switch (msg.t) {
    case 'ping':
      conn.send({ t: 'pong', t0: msg.t0 });
      return;
    case 'hello': {
      applyProfile(conn, msg);
      const token = typeof msg.token === 'string' && msg.token.length <= 64 ? msg.token : null;
      const g = token ? rooms.peekGrace(token) : null;
      if (g) {
        conn.token = token;
        conn.send({ t: 'welcome', pid: g.pid, token, resumed: true });
        if (rooms.completeResume(token, conn)) return;
      }
      conn.pid = null;
      conn.token = token || randomUUID();
      conn.send({ t: 'welcome', pid: null, token: conn.token, resumed: false });
      return;
    }
    case 'create': {
      if (conn.room) return;
      const room = rooms.create();
      if (!room) return conn.send({ t: 'error', code: 'SERVER_FULL' });
      room.addHuman(conn, conn.profile);
      rooms.bindToken(conn.token || (conn.token = randomUUID()), room, conn.pid);
      return;
    }
    case 'join': {
      if (conn.room) return;
      const room = rooms.get(msg.code);
      if (!room) return conn.send({ t: 'error', code: 'BAD_CODE' });
      if (room.members.size >= CFG.MAX_ROOM_SIZE) {
        // Room pleine mais avec des bots en lobby : un humain remplace un bot.
        const bot = room.phase === 'lobby'
          ? [...room.members.values()].find((m) => m.bot)
          : null;
        if (!bot) return conn.send({ t: 'error', code: 'ROOM_FULL' });
        room.members.delete(bot.pid);
      }
      room.addHuman(conn, conn.profile);
      rooms.bindToken(conn.token || (conn.token = randomUUID()), room, conn.pid);
      return;
    }
    case 'profile':
      applyProfile(conn, msg);
      if (conn.room) conn.room.handle(conn, msg);
      return;
    default:
      if (conn.room) conn.room.handle(conn, msg);
  }
}

function applyProfile(conn, msg) {
  if (typeof msg.name === 'string') conn.profile.name = msg.name.slice(0, CFG.MAX_NAME * 2);
  if (Number.isInteger(msg.face)) conn.profile.face = msg.face;
}

function strike(conn) {
  conn.strikes++;
  if (conn.strikes > CFG.RATE_STRIKES) conn.close(1008, 'rate');
}
