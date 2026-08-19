// Contrôles : joystick dynamique / direction 2 zones / tap, + boutons
// d'action, + clavier (AZERTY et QWERTY). Pointer Events partout.

export class Input {
  constructor(layer, canvas) {
    this.layer = layer;     // div par-dessus le canvas (boutons, joystick)
    this.canvas = canvas;
    this.onMove = null;     // (d) => envoi input
    this.onAct = null;      // (id) => envoi action
    this.onTap = null;      // (x, y) => géré par le jeu (coords CSS canvas)
    this.scheme = null;
    this.buttons = new Map();
    this.joy = null;        // état joystick actif
    this.steerTouches = new Map(); // pointerId → -1|1
    this.keys = new Set();
    this.moveVec = { x: 0, y: 0 };
    this.turn = 0;
    this.lastSent = '';
    this.boundKeyDown = (e) => this.keyDown(e);
    this.boundKeyUp = (e) => this.keyUp(e);
    this.boundPointer = null;
    addEventListener('keydown', this.boundKeyDown);
    addEventListener('keyup', this.boundKeyUp);
  }

  setScheme(controls) {
    this.clear();
    this.scheme = controls?.move || null;
    if (!controls) return;
    for (const b of controls.buttons || []) this.addButton(b);
    if (this.scheme === 'joystick' || this.scheme === 'steer' || this.scheme === 'tap') {
      this.attachPointer();
    }
    if (this.scheme === 'steer') this.makeSteerHints();
  }

  clear() {
    this.layer.querySelectorAll('.ctl-btn, .joy, .steer-hint').forEach((el) => el.remove());
    this.buttons.clear();
    this.joy = null;
    this.steerTouches.clear();
    this.moveVec = { x: 0, y: 0 };
    this.turn = 0;
    this.lastSent = '';
    this.detachPointer();
  }

  destroy() {
    this.clear();
    removeEventListener('keydown', this.boundKeyDown);
    removeEventListener('keyup', this.boundKeyUp);
  }

  // ── Boutons d'action ─────────────────────────────────────────────────

  addButton(def) {
    const el = document.createElement('button');
    el.className = 'ctl-btn';
    el.innerHTML = `<span class="ctl-btn-label">${def.label}</span><span class="ctl-btn-cd"></span>`;
    el.style.setProperty('--slot', this.buttons.size);
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.press(def.id, el);
    });
    this.layer.appendChild(el);
    this.buttons.set(def.id, { el, def, cd: 0 });
  }

  press(id, el) {
    const b = this.buttons.get(id);
    if (b && b.cd > 0) return;
    el?.classList.add('pressed');
    setTimeout(() => el?.classList.remove('pressed'), 120);
    navigator.vibrate?.(12);
    this.onAct?.(id);
  }

  setCooldown(id, frac) {
    const b = this.buttons.get(id);
    if (!b) return;
    b.cd = frac;
    b.el.classList.toggle('cooling', frac > 0.02);
    b.el.style.setProperty('--cd', String(Math.max(0, Math.min(1, frac))));
  }

  showButton(id, visible) {
    const b = this.buttons.get(id);
    if (b) b.el.style.display = visible ? '' : 'none';
  }

  // ── Pointeurs ────────────────────────────────────────────────────────

  attachPointer() {
    if (this.boundPointer) return;
    const down = (e) => this.pointerDown(e);
    const move = (e) => this.pointerMove(e);
    const up = (e) => this.pointerUp(e);
    this.layer.addEventListener('pointerdown', down);
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
    this.boundPointer = { down, move, up };
  }

  detachPointer() {
    if (!this.boundPointer) return;
    this.layer.removeEventListener('pointerdown', this.boundPointer.down);
    removeEventListener('pointermove', this.boundPointer.move);
    removeEventListener('pointerup', this.boundPointer.up);
    removeEventListener('pointercancel', this.boundPointer.up);
    this.boundPointer = null;
  }

  pointerDown(e) {
    if (e.target.closest('.ctl-btn, .hud, .emote-bar, .modal')) return;
    e.preventDefault();
    const r = this.canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (this.scheme === 'tap') {
      this.tapId = e.pointerId;
      this.onTap?.(x, y, 'start');
      return;
    }
    if (this.scheme === 'steer') {
      const side = e.clientX < innerWidth / 2 ? -1 : 1;
      this.steerTouches.set(e.pointerId, side);
      this.computeSteer();
      return;
    }
    if (this.scheme === 'joystick' && !this.joy) {
      this.joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY };
      this.makeJoyVisual(e.clientX, e.clientY);
    }
  }

  pointerMove(e) {
    if (this.scheme === 'tap' && this.tapId === e.pointerId) {
      const r = this.canvas.getBoundingClientRect();
      this.onTap?.(e.clientX - r.left, e.clientY - r.top, 'move');
      return;
    }
    if (this.scheme === 'joystick' && this.joy && e.pointerId === this.joy.id) {
      const dx = e.clientX - this.joy.ox, dy = e.clientY - this.joy.oy;
      const len = Math.hypot(dx, dy);
      const max = 52;
      const k = len > max ? max / len : 1;
      this.moveVec = { x: (dx * k) / max, y: (dy * k) / max };
      this.updateJoyVisual(dx * k, dy * k);
      this.emitMove();
    }
  }

  pointerUp(e) {
    if (this.scheme === 'tap' && this.tapId === e.pointerId) {
      this.tapId = null;
      const r = this.canvas.getBoundingClientRect();
      this.onTap?.(e.clientX - r.left, e.clientY - r.top, 'end');
    }
    if (this.joy && e.pointerId === this.joy.id) {
      this.joy = null;
      this.moveVec = { x: 0, y: 0 };
      this.removeJoyVisual();
      this.emitMove();
    }
    if (this.steerTouches.delete(e.pointerId)) this.computeSteer();
  }

  computeSteer() {
    let t = 0;
    for (const s of this.steerTouches.values()) t += s;
    this.turn = Math.sign(t);
    this.emitMove();
  }

  // ── Clavier (accepte AZERTY et QWERTY) ───────────────────────────────

  keyDown(e) {
    if (e.repeat) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const c = e.code;
    if (c === 'Space' || c === 'Enter') {
      const first = [...this.buttons.values()][0];
      if (first) { e.preventDefault(); this.press(first.def.id, first.el); return; }
    }
    if (c === 'KeyE' || c === 'ShiftLeft') {
      const second = [...this.buttons.values()][1];
      if (second) { e.preventDefault(); this.press(second.def.id, second.el); return; }
    }
    this.keys.add(c);
    this.computeKeys();
  }

  keyUp(e) {
    this.keys.delete(e.code);
    this.computeKeys();
  }

  computeKeys() {
    const k = this.keys;
    const left = k.has('ArrowLeft') || k.has('KeyA') || k.has('KeyQ');
    const right = k.has('ArrowRight') || k.has('KeyD');
    const up = k.has('ArrowUp') || k.has('KeyW') || k.has('KeyZ');
    const down = k.has('ArrowDown') || k.has('KeyS');
    if (this.scheme === 'steer') {
      this.turn = (right ? 1 : 0) - (left ? 1 : 0);
      this.emitMove();
    } else if (this.scheme === 'joystick' || this.scheme === 'tap') {
      if (!this.joy) {
        const x = (right ? 1 : 0) - (left ? 1 : 0);
        const y = (down ? 1 : 0) - (up ? 1 : 0);
        const len = Math.hypot(x, y) || 1;
        this.moveVec = { x: x / len, y: y / len };
        this.emitMove();
      }
    }
  }

  emitMove() {
    let d;
    if (this.scheme === 'steer') d = { turn: this.turn };
    else if (this.scheme === 'joystick' || this.scheme === 'tap') {
      d = { mx: Math.round(this.moveVec.x * 100) / 100, my: Math.round(this.moveVec.y * 100) / 100 };
    } else return;
    const key = JSON.stringify(d);
    if (key === this.lastSent) return;
    this.lastSent = key;
    this.onMove?.(d);
  }

  // ── Visuels ──────────────────────────────────────────────────────────

  makeJoyVisual(x, y) {
    const base = document.createElement('div');
    base.className = 'joy';
    base.innerHTML = '<div class="joy-knob"></div>';
    base.style.left = `${x}px`;
    base.style.top = `${y}px`;
    this.layer.appendChild(base);
    this.joyEl = base;
  }

  updateJoyVisual(dx, dy) {
    const knob = this.joyEl?.querySelector('.joy-knob');
    if (knob) knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  removeJoyVisual() {
    this.joyEl?.remove();
    this.joyEl = null;
  }

  makeSteerHints() {
    for (const [cls, txt] of [['left', '◀'], ['right', '▶']]) {
      const el = document.createElement('div');
      el.className = `steer-hint steer-${cls}`;
      el.textContent = txt;
      this.layer.appendChild(el);
    }
  }
}
