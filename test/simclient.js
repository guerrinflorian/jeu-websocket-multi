// Client WebSocket simulé pour le harnais : buffer de messages, attentes
// typées avec timeout, caches (room, snap, pid, token).

import WebSocket from 'ws';

export class Sim {
  constructor(url, name) {
    this.url = url;
    this.name = name;
    this.ws = null;
    this.buf = [];
    this.waiters = [];
    this.pid = null;
    this.token = null;
    this.code = null;
    this.lastRoom = null;
    this.lastSnap = null;
    this.lastOver = null;
    this.snapCount = 0;
    this.closed = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.on('open', resolve);
      this.ws.on('error', reject);
      this.ws.on('message', (raw) => this.onMsg(JSON.parse(raw.toString())));
      this.ws.on('close', () => { this.closed = true; });
    });
  }

  onMsg(msg) {
    if (msg.t === 'welcome') { this.token = msg.token; if (msg.pid) this.pid = msg.pid; }
    if (msg.t === 'joined') { this.pid = msg.pid; this.code = msg.code; }
    if (msg.t === 'room') this.lastRoom = msg;
    if (msg.t === 'snap') { this.lastSnap = msg; this.snapCount++; }
    if (msg.t === 'over') this.lastOver = msg;
    const entry = { msg, used: false };
    this.buf.push(entry);
    if (this.buf.length > 800) this.buf.splice(0, 200);
    for (let i = 0; i < this.waiters.length; i++) {
      const w = this.waiters[i];
      if (w.match(msg)) {
        entry.used = true;
        this.waiters.splice(i, 1);
        w.resolve(msg);
        return;
      }
    }
  }

  send(obj) {
    this.ws.send(JSON.stringify(obj));
  }

  // Attend le prochain message qui matche. Consomme d'abord les messages
  // déjà reçus non consommés (les rafales TCP livrent plusieurs messages
  // dans le même tour de boucle : ne jamais les rater).
  next(type, pred = null, timeout = 8000) {
    const match = (m) => m.t === type && (!pred || pred(m));
    for (const entry of this.buf) {
      if (!entry.used && match(entry.msg)) {
        entry.used = true;
        return Promise.resolve(entry.msg);
      }
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const i = this.waiters.findIndex((w) => w.resolve === resolve);
        if (i >= 0) this.waiters.splice(i, 1);
        reject(new Error(`[${this.name}] timeout en attendant « ${type} »`));
      }, timeout);
      this.waiters.push({ match, resolve: (m) => { clearTimeout(timer); resolve(m); } });
    });
  }

  // Attend qu'une condition sur l'état de room soit vraie (inclut l'état courant).
  async untilRoom(pred, timeout = 8000) {
    if (this.lastRoom && pred(this.lastRoom)) return this.lastRoom;
    return this.next('room', pred, timeout);
  }

  async hello(profile = {}) {
    const p = this.next('welcome');
    this.send({ t: 'hello', token: this.token, name: profile.name ?? this.name, face: profile.face ?? 0 });
    return p;
  }

  async create() {
    const p = this.next('joined');
    this.send({ t: 'create' });
    await p;
    return this.untilRoom(() => true);
  }

  async join(code) {
    const p = this.next('joined');
    this.send({ t: 'join', code });
    await p;
    return this.untilRoom(() => true);
  }

  me() {
    return this.lastRoom?.players.find((p) => p.pid === this.pid) || null;
  }

  close() {
    this.ws.close();
  }

  kill() {
    this.ws.terminate();
  }
}
