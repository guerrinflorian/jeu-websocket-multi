// Une room : lobby → countdown → playing → results → lobby.
// Le cœur ne connaît aucun jeu : il n'appelle que le contrat (gameloader).

import { randomUUID } from 'node:crypto';
import { CFG } from './config.js';
import { PLAYER_COLORS, makeRng } from '../shared/const.js';
import { computeFormats, findFormat } from '../shared/formats.js';
import { pickBot, makeBotMind, makeAutopilotMind } from './bots.js';

let seedCounter = 1;
const newSeed = () => ((Date.now() ^ (seedCounter++ * 2654435761)) >>> 0);
const newPid = () => randomUUID().replaceAll('-', '').slice(0, 10);

const BOT_SKILLS = ['facile', 'normal', 'costaud'];

export class Room {
  constructor(code, games) {
    this.code = code;
    this.games = games;
    this.members = new Map(); // pid → member
    this.phase = 'lobby';
    this.gameId = games.keys().next().value || null;
    this.formatId = 'ffa';
    this.settings = { botSkill: 'normal' };
    this.rng = makeRng(newSeed());

    // Partie en cours
    this.gameDef = null;
    this.gs = null;
    this.gamePids = [];
    this.startConfig = null;
    this.minds = new Map(); // pid → { mind, next } (bots + autopilotes)
    this.tickNo = 0;
    this.tickTimer = null;
    this.pendingEvs = [];
    this.lastResults = null;

    this.timers = new Set();
    this.lastActivity = Date.now();
    this.emptySince = null;
    this.destroyed = false;

    if (this.gameId) this.applyGameDefaults();
  }

  // ── Membres ──────────────────────────────────────────────────────────

  addHuman(conn, profile) {
    const pid = newPid();
    const m = {
      pid,
      conn,
      name: sanitizeName(profile.name) || `Forain·e ${this.members.size + 1}`,
      face: profile.face ?? 0,
      colorIdx: this.freeColor(),
      team: null,
      ready: false,
      bot: false,
      botDef: null,
      spectator: this.phase !== 'lobby',
      joinedAt: Date.now(),
      disconnectedAt: null,
      lastInputTick: 0,
    };
    this.members.set(pid, m);
    conn.pid = pid;
    conn.room = this;
    conn.send({ t: 'joined', pid, code: this.code });
    this.touch();
    this.reassignTeams();
    this.broadcastRoom();
    if (this.phase === 'playing' || this.phase === 'results') this.sendGameBundle(m);
    return m;
  }

  addBot() {
    if (this.members.size >= CFG.MAX_ROOM_SIZE) return null;
    const used = new Set([...this.members.values()].map((m) => m.name));
    const def = pickBot(used, this.rng);
    const m = {
      pid: newPid(),
      conn: null,
      name: def.name,
      face: def.face,
      colorIdx: this.freeColor(),
      team: null,
      ready: true,
      bot: true,
      botDef: def,
      spectator: false,
      joinedAt: Date.now(),
      disconnectedAt: null,
      lastInputTick: 0,
    };
    this.members.set(m.pid, m);
    return m;
  }

  freeColor() {
    const used = new Set([...this.members.values()].map((m) => m.colorIdx));
    for (let i = 0; i < PLAYER_COLORS.length; i++) if (!used.has(i)) return i;
    return this.members.size % PLAYER_COLORS.length;
  }

  humans() {
    return [...this.members.values()].filter((m) => !m.bot);
  }

  connectedHumans() {
    return this.humans().filter((m) => m.conn);
  }

  eligible() {
    // Participants au prochain lancement (pas les spectateurs arrivés en cours).
    return [...this.members.values()]
      .filter((m) => !m.spectator)
      .sort((a, b) => a.joinedAt - b.joinedAt);
  }

  hostPid() {
    const h = this.connectedHumans().sort((a, b) => a.joinedAt - b.joinedAt)[0];
    return h ? h.pid : null;
  }

  // ── Formats & équipes (lobby) ────────────────────────────────────────

  meta() {
    return this.gameId ? this.games.get(this.gameId).meta : null;
  }

  effectiveN() {
    const meta = this.meta();
    if (!meta) return this.eligible().length;
    return Math.min(Math.max(this.eligible().length, meta.minPlayers), meta.maxPlayers);
  }

  formats() {
    const meta = this.meta();
    return meta ? computeFormats(meta.caps, this.effectiveN()) : [];
  }

  ensureValidFormat() {
    const list = this.formats();
    if (!list.find((f) => f.id === this.formatId)) {
      this.formatId = (list.find((f) => f.id === 'ffa') || list[0])?.id || null;
    }
  }

  currentFormat() {
    this.ensureValidFormat();
    const meta = this.meta();
    return meta && this.formatId ? findFormat(meta.caps, this.effectiveN(), this.formatId) : null;
  }

  // Remplit les équipes dans l'ordre d'arrivée (équipe 0 d'abord : en asym,
  // le premier joueur (l'hôte) prend le rôle solo).
  reassignTeams() {
    const fmt = this.currentFormat();
    const players = this.eligible();
    if (!fmt || fmt.kind === 'ffa') {
      for (const m of players) m.team = null;
      return;
    }
    let t = 0, fill = 0;
    for (const m of players) {
      while (t < fmt.sizes.length - 1 && fill >= fmt.sizes[t]) { t++; fill = 0; }
      m.team = t;
      fill++;
    }
  }

  applyGameDefaults() {
    const meta = this.meta();
    const next = { botSkill: this.settings.botSkill || 'normal' };
    for (const [k, spec] of Object.entries(meta.settings || {})) next[k] = spec.def;
    this.settings = next;
  }

  // ── Diffusion ────────────────────────────────────────────────────────

  send(m, obj) {
    if (m.conn) m.conn.send(obj);
  }

  broadcast(obj) {
    const json = JSON.stringify(obj);
    for (const m of this.members.values()) if (m.conn) m.conn.sendRaw(json);
  }

  broadcastRoom() {
    if (this.destroyed) return;
    this.ensureValidFormat();
    const meta = this.meta();
    const n = this.eligible().length;
    this.broadcast({
      t: 'room',
      code: this.code,
      phase: this.phase,
      gameId: this.gameId,
      formatId: this.formatId,
      hostPid: this.hostPid(),
      settings: this.settings,
      effectiveN: this.effectiveN(),
      botsToAdd: meta ? Math.max(0, meta.minPlayers - n) : 0,
      formats: this.formats(),
      players: [...this.members.values()]
        .sort((a, b) => a.joinedAt - b.joinedAt)
        .map((m) => ({
          pid: m.pid,
          name: m.name,
          face: m.face,
          color: m.colorIdx,
          team: m.team,
          ready: m.ready,
          bot: m.bot,
          tag: m.botDef?.tag || null,
          connected: !!m.conn || m.bot,
          spectator: m.spectator,
        })),
    });
  }

  sendGameBundle(m) {
    // Pour un arrivant en cours de partie ou une reconnexion.
    if (this.startConfig) {
      this.send(m, { t: 'start', gameId: this.startConfig.gameId, config: this.startConfig, you: m.pid });
    }
    if (this.phase === 'playing' && this.gs && this.gameDef?.srv.fullView) {
      // Snapshot complet (ex. traînées entières) pour reconstruire le rendu.
      const pid = this.gamePids.includes(m.pid) ? m.pid : null;
      this.send(m, {
        t: 'snap', full: true, tick: this.tickNo, now: Date.now(),
        state: this.gameDef.srv.fullView(this.gs, pid), ev: [],
      });
    }
    if (this.phase === 'results' && this.lastResults) this.send(m, this.lastResults);
  }

  touch() {
    this.lastActivity = Date.now();
    this.emptySince = this.connectedHumans().length ? null : (this.emptySince || Date.now());
  }

  after(ms, fn) {
    const t = setTimeout(() => { this.timers.delete(t); if (!this.destroyed) fn(); }, ms);
    this.timers.add(t);
    return t;
  }

  // ── Messages entrants ────────────────────────────────────────────────

  handle(conn, msg) {
    const m = this.members.get(conn.pid);
    if (!m) return;
    const isHost = conn.pid === this.hostPid();
    this.touch();
    switch (msg.t) {
      case 'profile': {
        const name = sanitizeName(msg.name);
        if (name) m.name = name;
        if (Number.isInteger(msg.face) && msg.face >= 0 && msg.face < 12) m.face = msg.face;
        this.broadcastRoom();
        break;
      }
      case 'ready':
        if (this.phase === 'lobby' && !m.bot) { m.ready = !!msg.on; this.broadcastRoom(); }
        break;
      case 'setGame':
        if (isHost && this.phase === 'lobby' && this.games.has(msg.gameId)) {
          this.gameId = msg.gameId;
          this.applyGameDefaults();
          this.ensureValidFormat();
          this.reassignTeams();
          this.broadcastRoom();
        }
        break;
      case 'setFormat':
        if (isHost && this.phase === 'lobby' && this.formats().find((f) => f.id === msg.formatId)) {
          this.formatId = msg.formatId;
          this.reassignTeams();
          this.broadcastRoom();
        }
        break;
      case 'setTeam':
        if (isHost && this.phase === 'lobby') this.cycleTeam(msg.pid);
        break;
      case 'shuffle':
        if (isHost && this.phase === 'lobby') {
          const fmt = this.currentFormat();
          if (fmt && fmt.kind !== 'ffa') {
            const players = this.eligible();
            this.rng.shuffle(players);
            let t = 0, fill = 0;
            for (const p of players) {
              while (t < fmt.sizes.length - 1 && fill >= fmt.sizes[t]) { t++; fill = 0; }
              p.team = t; fill++;
            }
            this.broadcastRoom();
          }
        }
        break;
      case 'setSettings':
        if (isHost && this.phase === 'lobby' && msg.patch && typeof msg.patch === 'object') {
          this.applySettings(msg.patch);
          this.broadcastRoom();
        }
        break;
      case 'addBot':
        if (isHost && this.phase === 'lobby') { this.addBot(); this.reassignTeams(); this.broadcastRoom(); }
        break;
      case 'removeBot':
        if (isHost && this.phase === 'lobby') {
          const b = this.members.get(msg.pid);
          if (b?.bot) { this.members.delete(b.pid); this.reassignTeams(); this.broadcastRoom(); }
        }
        break;
      case 'start':
        if (isHost && this.phase === 'lobby') this.start(conn);
        break;
      case 'again':
        if (isHost && this.phase === 'results') this.startCountdown();
        break;
      case 'toLobby':
        if (isHost && this.phase === 'results') this.toLobby();
        break;
      case 'input':
        if (this.phase === 'playing' && !m.bot && this.gamePids.includes(m.pid)) {
          m.lastInputTick = this.tickNo;
          this.safeGame(() => this.gameDef.srv.onInput(this.gs, m.pid, msg.d));
        }
        break;
      case 'act':
        if (this.phase === 'playing' && !m.bot && this.gamePids.includes(m.pid) && typeof msg.a === 'string') {
          m.lastInputTick = this.tickNo;
          this.safeGame(() => this.gameDef.srv.onAction(this.gs, m.pid, msg.a, msg.d));
        }
        break;
      case 'emote': {
        const now = Date.now();
        if (Number.isInteger(msg.e) && msg.e >= 0 && msg.e < 8 && now - (m.lastEmoteAt || 0) > 700) {
          m.lastEmoteAt = now;
          if (this.phase === 'playing') this.pendingEvs.push({ e: 'emote', pid: m.pid, k: msg.e });
          else this.broadcast({ t: 'fx', fx: 'emote', pid: m.pid, k: msg.e });
        }
        break;
      }
      case 'leave':
        this.removeMember(m, 'left');
        conn.room = null;
        break;
    }
  }

  applySettings(patch) {
    const meta = this.meta();
    for (const [k, v] of Object.entries(patch)) {
      if (k === 'botSkill' && BOT_SKILLS.includes(v)) this.settings.botSkill = v;
      else if (meta?.settings?.[k]?.values.includes(v)) this.settings[k] = v;
    }
  }

  cycleTeam(pid) {
    const fmt = this.currentFormat();
    const m = this.members.get(pid);
    if (!fmt || fmt.kind === 'ffa' || !m || m.spectator || m.team == null) return;
    const target = (m.team + 1) % fmt.sizes.length;
    const inTarget = this.eligible().filter((x) => x.team === target);
    if (inTarget.length < fmt.sizes[target]) {
      m.team = target; // place libre (sera comblée par un bot au lancement)
    } else {
      const other = inTarget[0];
      other.team = m.team;
      m.team = target;
    }
    this.broadcastRoom();
  }

  removeMember(m, reason) {
    if (this.phase === 'playing' && this.gamePids.includes(m.pid)) {
      // Départ en pleine partie : le pion devient un bot définitivement.
      m.conn = null;
      m.bot = true;
      m.ready = true;
      m.disconnectedAt = null;
      this.broadcastRoom();
      return;
    }
    this.members.delete(m.pid);
    this.reassignTeams();
    this.broadcastRoom();
    this.touch();
  }

  // ── Lancement ────────────────────────────────────────────────────────

  start() {
    const meta = this.meta();
    if (!meta) return;
    // Complète avec des forains jusqu'au minimum requis.
    while (this.eligible().length < meta.minPlayers && this.members.size < CFG.MAX_ROOM_SIZE) {
      if (!this.addBot()) break;
    }
    if (this.eligible().length < meta.minPlayers) return;
    const notReady = this.connectedHumans().filter((h) => !h.ready && h.pid !== this.hostPid() && !h.spectator);
    if (notReady.length) {
      this.broadcast({ t: 'error', code: 'NOT_READY' });
      return;
    }
    this.ensureValidFormat();
    this.reassignTeams();
    this.broadcastRoom();
    this.startCountdown();
  }

  startCountdown() {
    this.phase = 'countdown';
    this.broadcastRoom();
    const stepMs = 1000 / CFG.TURBO;
    for (let i = 0; i < CFG.COUNTDOWN_S; i++) {
      this.after(i * stepMs, () => this.broadcast({ t: 'countdown', n: CFG.COUNTDOWN_S - i }));
    }
    this.after(CFG.COUNTDOWN_S * stepMs, () => this.launch());
  }

  launch() {
    if (this.destroyed || this.phase !== 'countdown') return;
    const g = this.games.get(this.gameId);
    const players = this.eligible();
    const fmt = this.currentFormat();

    // Construit les équipes depuis les affectations lobby.
    let teams;
    if (!fmt || fmt.kind === 'ffa') {
      teams = players.map((p) => [p.pid]);
    } else {
      teams = fmt.sizes.map(() => []);
      const overflow = [];
      for (const p of players) {
        if (p.team != null && p.team < teams.length && teams[p.team].length < fmt.sizes[p.team]) {
          teams[p.team].push(p.pid);
        } else overflow.push(p.pid);
      }
      for (const pid of overflow) {
        const t = teams.findIndex((tm, i) => tm.length < fmt.sizes[i]);
        teams[Math.max(0, t)].push(pid);
      }
    }

    const playersCfg = {};
    for (const p of players) {
      playersCfg[p.pid] = { name: p.name, color: PLAYER_COLORS[p.colorIdx], face: p.face, bot: p.bot };
    }
    const seed = newSeed();
    const config = {
      gameId: this.gameId,
      teams,
      players: playersCfg,
      format: fmt || { id: 'ffa', kind: 'ffa', sizes: null },
      settings: { ...this.settings },
      seed,
    };
    this.startConfig = config;
    this.gamePids = players.map((p) => p.pid);
    this.gameDef = g;
    this.gs = g.srv.createState({ ...config, rng: makeRng(seed) });

    // Esprits des bots (les humains déconnectés/AFK en recevront un à la volée).
    this.minds.clear();
    let i = 0;
    for (const p of players) {
      if (p.bot) {
        this.minds.set(p.pid, {
          mind: makeBotMind(p.botDef || { p: { aggro: 0.5, skill: 0.5, chaos: 0.3, pace: 1 } }, this.settings.botSkill, seed ^ ++i),
          next: 1 + (i % 3),
        });
      }
      p.lastInputTick = 0;
    }

    this.phase = 'playing';
    this.tickNo = 0;
    this.pendingEvs = [];
    for (const m of this.members.values()) {
      this.send(m, { t: 'start', gameId: this.gameId, config, you: m.pid });
    }
    this.broadcastRoom();
    this.tickTimer = setInterval(() => this.tick(), CFG.TICK_REAL_MS);
  }

  // ── Boucle de jeu ────────────────────────────────────────────────────

  tick() {
    if (this.destroyed || this.phase !== 'playing') return;
    this.tickNo++;
    const dt = CFG.TICK_SIM_MS / 1000;
    try {
      this.runBots();
      const ev = this.gameDef.srv.tick(this.gs, dt) || [];
      if (this.pendingEvs.length) { ev.push(...this.pendingEvs); this.pendingEvs = []; }
      this.broadcastSnap(ev);
      if (this.gameDef.srv.isOver(this.gs)) this.finish();
    } catch (err) {
      console.error(`[room ${this.code}] crash du jeu ${this.gameId} :`, err);
      this.abortGame();
    }
  }

  runBots() {
    const { srv } = this.gameDef;
    for (const pid of this.gamePids) {
      const m = this.members.get(pid);
      const isBot = !m || m.bot;
      const isAway = m && !m.bot && (!m.conn || this.tickNo - m.lastInputTick > CFG.AFK_TICKS);
      if (!isBot && !isAway) continue;
      let entry = this.minds.get(pid);
      if (!entry) {
        entry = { mind: makeAutopilotMind(newSeed()), next: this.tickNo + 2 };
        this.minds.set(pid, entry);
      }
      if (this.tickNo < entry.next) continue;
      const api = {
        input: (d) => srv.onInput(this.gs, pid, d),
        act: (a, d) => srv.onAction(this.gs, pid, a, d),
      };
      srv.botAct(this.gs, pid, entry.mind, api);
      entry.next = this.tickNo + Math.max(1, Math.round((2 + entry.mind.rng.next() * 2) * entry.mind.p.pace));
    }
    // Un humain revenu d'AFK reprend la main : on jette l'esprit d'autopilote.
    for (const [pid, _] of this.minds) {
      const m = this.members.get(pid);
      if (m && !m.bot && m.conn && this.tickNo - m.lastInputTick <= CFG.AFK_TICKS) this.minds.delete(pid);
    }
  }

  broadcastSnap(ev) {
    const { srv } = this.gameDef;
    const cache = new Map();
    const now = Date.now();
    for (const m of this.members.values()) {
      if (!m.conn) continue;
      const pid = this.gamePids.includes(m.pid) ? m.pid : null;
      const view = srv.view(this.gs, pid);
      let json = cache.get(view);
      if (!json) {
        json = JSON.stringify({ t: 'snap', tick: this.tickNo, now, state: view, ev });
        cache.set(view, json);
      }
      m.conn.sendRaw(json);
    }
  }

  safeGame(fn) {
    try { fn(); } catch (err) {
      console.error(`[room ${this.code}] erreur input ${this.gameId} :`, err);
    }
  }

  finish() {
    clearInterval(this.tickTimer);
    this.tickTimer = null;
    let results;
    try {
      results = this.gameDef.srv.results(this.gs);
    } catch (err) {
      console.error(`[room ${this.code}] erreur results ${this.gameId} :`, err);
      results = { ranking: [], titles: [], stats: {} };
    }
    this.phase = 'results';
    this.lastResults = {
      t: 'over',
      gameId: this.gameId,
      teams: this.startConfig.teams,
      players: this.startConfig.players,
      ...results,
    };
    this.broadcast(this.lastResults);
    this.broadcastRoom();
    this.pruneAfterGame();
    this.after(CFG.RESULTS_AUTO_LOBBY_MS, () => {
      if (this.phase === 'results') this.toLobby();
    });
  }

  abortGame() {
    clearInterval(this.tickTimer);
    this.tickTimer = null;
    this.phase = 'lobby';
    this.gs = null;
    this.broadcast({ t: 'error', code: 'GAME_CRASH' });
    this.toLobby();
  }

  pruneAfterGame() {
    // Les humains dont la grâce de reconnexion a expiré pendant la partie
    // sont retirés maintenant (leur pion était autopiloté jusqu'ici).
    for (const m of [...this.members.values()]) {
      if (!m.bot && !m.conn && m.disconnectedAt && Date.now() - m.disconnectedAt > CFG.GRACE_MS) {
        this.members.delete(m.pid);
      }
    }
  }

  toLobby() {
    if (this.destroyed) return;
    this.phase = 'lobby';
    this.gs = null;
    this.gameDef = null;
    this.gamePids = [];
    this.minds.clear();
    this.startConfig = null;
    this.lastResults = null;
    for (const m of [...this.members.values()]) {
      m.spectator = false;
      if (!m.bot) m.ready = false;
      if (!m.bot && !m.conn) this.members.delete(m.pid); // partis pendant les résultats
    }
    this.ensureValidFormat();
    this.reassignTeams();
    this.broadcastRoom();
    this.touch();
  }

  // ── Connexions ───────────────────────────────────────────────────────

  onDisconnect(conn) {
    const m = this.members.get(conn.pid);
    if (!m) return;
    m.conn = null;
    m.ready = false;
    m.disconnectedAt = Date.now();
    this.touch();
    this.broadcastRoom();
  }

  resume(conn, pid) {
    const m = this.members.get(pid);
    if (!m || m.bot) return false;
    if (m.conn) m.conn.close(4001, 'replaced');
    m.conn = conn;
    m.disconnectedAt = null;
    m.lastInputTick = this.tickNo;
    conn.pid = pid;
    conn.room = this;
    this.touch();
    this.broadcastRoom();
    this.sendGameBundle(m);
    return true;
  }

  // ── Cycle de vie ─────────────────────────────────────────────────────

  sweep(now) {
    if (this.phase === 'lobby') {
      let changed = false;
      for (const m of [...this.members.values()]) {
        if (!m.bot && !m.conn && m.disconnectedAt && now - m.disconnectedAt > CFG.GRACE_MS) {
          this.members.delete(m.pid);
          changed = true;
        }
      }
      if (changed) { this.reassignTeams(); this.broadcastRoom(); }
    }
    const noHumans = this.connectedHumans().length === 0;
    if (!noHumans) { this.emptySince = null; return false; }
    if (!this.emptySince) this.emptySince = now;
    const humanMembersLeft = this.humans().length > 0; // en grâce, peut-être de retour
    const ttl = humanMembersLeft ? Math.max(CFG.EMPTY_ROOM_TTL_MS, CFG.GRACE_MS) : CFG.EMPTY_ROOM_TTL_MS;
    if (now - this.emptySince > ttl) return true; // à détruire
    if (this.phase === 'lobby' && now - this.lastActivity > CFG.IDLE_ROOM_TTL_MS) return true;
    return false;
  }

  destroy() {
    this.destroyed = true;
    clearInterval(this.tickTimer);
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    for (const m of this.members.values()) {
      if (m.conn) {
        m.conn.send({ t: 'bye', reason: 'ROOM_CLOSED' });
        m.conn.room = null;
      }
    }
    this.members.clear();
  }
}

function sanitizeName(raw) {
  if (typeof raw !== 'string') return null;
  const clean = raw.replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, CFG.MAX_NAME);
  return clean.length ? clean : null;
}
