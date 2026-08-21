// Couche réseau : WebSocket + reconnexion automatique + ping/latence.
// Émet des événements : 'msg' (message serveur), 'status' (état connexion).

export class Net {
  constructor() {
    this.ws = null;
    this.listeners = { msg: [], status: [] };
    this.token = localStorage.getItem('kermesse.token') || null;
    this.profile = { name: null, face: 0 };
    this.retry = 0;
    this.ping = 0;
    this.wantOpen = false;
    this.pingTimer = null;
    this.status = 'idle';
  }

  on(ev, fn) { this.listeners[ev].push(fn); }
  emit(ev, data) { for (const fn of this.listeners[ev]) fn(data); }

  url() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${location.host}`;
  }

  connect() {
    this.wantOpen = true;
    this.open();
    // Sur telephone, passer dans une autre appli tue la socket sans que
    // « close » arrive tout de suite : au retour on verifie et on relance.
    if (!this.boundWake) {
      this.boundWake = () => {
        if (!this.wantOpen || document.hidden) return;
        if (!this.ws || this.ws.readyState > 1) { this.retry = 0; this.open(); }
      };
      document.addEventListener('visibilitychange', this.boundWake);
      addEventListener('online', this.boundWake);
      addEventListener('pageshow', this.boundWake);
    }
  }

  open() {
    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) return;
    this.setStatus(this.retry ? 'reconnecting' : 'connecting');
    const ws = new WebSocket(this.url());
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      this.setStatus('open');
      this.send({ t: 'hello', token: this.token, name: this.profile.name, face: this.profile.face });
      clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => this.send({ t: 'ping', t0: performance.now() }), 5000);
    };
    ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (msg.t === 'welcome') {
        this.token = msg.token;
        localStorage.setItem('kermesse.token', msg.token);
      }
      if (msg.t === 'pong' && typeof msg.t0 === 'number') {
        this.ping = Math.round(performance.now() - msg.t0);
      }
      this.emit('msg', msg);
    };
    ws.onclose = () => {
      clearInterval(this.pingTimer);
      if (!this.wantOpen) return;
      this.setStatus('reconnecting');
      // Gigue : si le serveur redemarre, huit clients ne reviennent pas
      // tous a la milliseconde pres.
      const base = Math.min(5000, 400 * Math.pow(1.6, this.retry++));
      setTimeout(() => this.open(), base * (0.75 + Math.random() * 0.5));
    };
    ws.onerror = () => { try { ws.close(); } catch { /* déjà fermé */ } };
  }

  setStatus(s) {
    if (this.status !== s) { this.status = s; this.emit('status', s); }
  }

  send(obj) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(obj));
  }

  setProfile(name, face) {
    this.profile = { name, face };
    localStorage.setItem('kermesse.profile', JSON.stringify(this.profile));
    this.send({ t: 'profile', name, face });
  }

  loadProfile() {
    try {
      const p = JSON.parse(localStorage.getItem('kermesse.profile') || 'null');
      if (p && typeof p.name === 'string') this.profile = { name: p.name, face: p.face | 0 };
    } catch { /* profil corrompu → défauts */ }
    return this.profile;
  }
}
