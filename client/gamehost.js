// Hôte de jeu côté client : canvas, horloge d'interpolation (rendu à
// t−110 ms entre deux snapshots), boucle 60 fps, juice, contrôles.
// Charge dynamiquement /games/<id>/client.js et lui délègue le rendu.

import * as juice from './juice.js';
import * as sfx from './sfx.js';
import { t } from './strings.js';
import {
  PLAYER_COLORS, TEAM_SHAPES, TAU,
  clamp, lerp, angleLerp, interpEnts, makeRng,
} from '/shared/const.js';

const INTERP_DELAY = 110; // ms de retard de rendu (voir docs/RESEARCH.md)

export class GameHost {
  constructor({ canvas, layer, net, input, onEmote }) {
    this.canvas = canvas;
    this.layer = layer;
    this.net = net;
    this.input = input;
    this.onEmote = onEmote;
    this.ctx = canvas.getContext('2d');
    this.snaps = [];
    this.offset = null; // horloge serveur − performance.now()
    this.instance = null;
    this.raf = 0;
    this.lastFrame = 0;
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
    this.running = false;
    this.boundResize = () => this.resize();
  }

  async start(gameId, config, you, meta) {
    this.stop();
    juice.reset();
    this.snaps = [];
    this.offset = null;
    addEventListener('resize', this.boundResize);
    this.resize();

    const mod = await import(`/games/${gameId}/client.js`);
    const host = this;
    const env = {
      canvas: this.canvas,
      ctx: this.ctx,
      you,
      config,
      meta,
      send: {
        input: (d) => this.net.send({ t: 'input', d }),
        act: (a, d) => this.net.send({ t: 'act', a, d }),
      },
      controls: {
        setCooldown: (id, frac) => this.input.setCooldown(id, frac),
        showButton: (id, on) => this.input.showButton(id, on),
      },
      helpers: {
        t,
        colors: PLAYER_COLORS,
        shapes: TEAM_SHAPES,
        juice,
        sfx,
        clamp, lerp, angleLerp, TAU, interpEnts,
        size: () => ({ w: host.w, h: host.h }),
        ix: (view, key, angKeys) => interpEnts(view.a?.[key], view.b?.[key], view.alpha, angKeys),
        viewport: (worldW, worldH, pad = 0) => host.viewport(worldW, worldH, pad),
        bg: (ctx) => host.drawBg(ctx),
        // Saisie de texte pour les jeux de mots. Champ DOM par-dessus le
        // canvas : c'est ce qui ouvre le clavier natif sur telephone.
        text: {
          show: (opts) => host.showText(opts),
          hide: () => host.hideText(),
          value: () => (host.textEl ? host.textEl.value : ''),
          clear: () => { if (host.textEl) host.textEl.value = ''; },
          focus: () => { try { host.textEl?.focus(); } catch { /* refus du navigateur */ } },
          mark: (state) => {
            if (!host.textEl) return;
            host.textEl.classList.toggle('bad', state === 'bad');
            host.textEl.classList.toggle('good', state === 'good');
          },
        },
        nameTag: (ctx, x, y, name, color, size = 12) => {
          ctx.font = `600 ${size}px Rubik, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.strokeStyle = 'rgba(20,10,38,.85)';
          ctx.lineWidth = 3;
          ctx.strokeText(name, x, y);
          ctx.fillStyle = color;
          ctx.fillText(name, x, y);
        },
        shadow: (ctx, x, y, r) => {
          ctx.beginPath();
          ctx.ellipse(x, y + r * 0.9, r * 1.05, r * 0.4, 0, 0, TAU);
          ctx.fillStyle = 'rgba(0,0,0,.32)';
          ctx.fill();
        },
      },
    };

    // Contrôles déclarés par le jeu.
    this.input.setScheme(meta.controls);
    this.input.onMove = (d) => env.send.input(d);
    this.input.onAct = (id) => {
      const r = this.instance?.onButton?.(id);
      if (r !== false) env.send.act(id);
    };
    this.input.onTap = (x, y, phase) => this.instance?.onTap?.(x, y, phase);

    this.instance = mod.createClient(env);
    this.running = true;
    this.lastFrame = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
      this.lastFrame = now;
      this.frame(dt, now);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  // ── Champ de saisie (jeux de mots) ──
  showText({ placeholder = '', maxLength = 24, onChange = null, onSubmit = null, focus = true } = {}) {
    if (!this.textEl) {
      const el = document.createElement('input');
      el.className = 'game-text';
      el.type = 'text';
      el.autocomplete = 'off';
      el.autocapitalize = 'none';
      el.spellcheck = false;
      el.setAttribute('enterkeyhint', 'send');
      el.addEventListener('input', () => this.textCb.change?.(el.value));
      el.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          e.preventDefault();
          this.textCb.submit?.(el.value);
        }
      });
      this.layer.appendChild(el);
      this.textEl = el;
      this.textCb = {};
    }
    this.textCb = { change: onChange, submit: onSubmit };
    this.textEl.placeholder = placeholder;
    this.textEl.maxLength = maxLength;
    this.textEl.style.display = 'block';
    if (focus) {
      try { this.textEl.focus({ preventScroll: true }); } catch { /* refus du navigateur */ }
    }
  }

  hideText() {
    if (!this.textEl) return;
    this.textEl.blur();
    this.textEl.value = '';
    this.textEl.classList.remove('bad', 'good');
    this.textEl.style.display = 'none';
    this.textCb = {};
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    removeEventListener('resize', this.boundResize);
    if (this.textEl) { this.textEl.remove(); this.textEl = null; this.textCb = {}; }
    try { this.instance?.destroy?.(); } catch { /* jeu déjà démonté */ }
    this.instance = null;
    this.input.setScheme(null);
    this.input.onMove = this.input.onAct = this.input.onTap = null;
  }

  feedSnap(msg) {
    const at = performance.now();
    if (msg.full) {
      try { this.instance?.onFull?.(msg.state); } catch (err) { this.reportGameError(err); }
    }
    // Horloge serveur estimée (EMA lente : stable malgré le jitter).
    const o = msg.now - at;
    this.offset = this.offset === null ? o : this.offset * 0.95 + o * 0.05;
    this.snaps.push({ ...msg, at });
    if (this.snaps.length > 12) this.snaps.shift();
    if (msg.ev?.length && this.instance) {
      const emotes = [];
      const rest = [];
      for (const e of msg.ev) (e.e === 'emote' ? emotes : rest).push(e);
      for (const e of emotes) this.onEmote?.(e.pid, e.k);
      if (rest.length) {
        try { this.instance.onEvents?.(rest, this.view()); } catch (err) { this.reportGameError(err); }
      }
    }
  }

  view() {
    const n = this.snaps.length;
    if (!n) return null;
    const renderT = this.offset + performance.now() - INTERP_DELAY;
    let a = this.snaps[0], b = this.snaps[n - 1];
    for (let i = n - 1; i > 0; i--) {
      if (this.snaps[i - 1].now <= renderT) { a = this.snaps[i - 1]; b = this.snaps[i]; break; }
    }
    const span = b.now - a.now;
    const alpha = span > 0 ? clamp((renderT - a.now) / span, 0, 1) : 1;
    return { a: a.state, b: b.state, alpha, latest: this.snaps[n - 1].state, tick: b.tick };
  }

  frame(dt, now) {
    const ctx = this.ctx;
    juice.update(dt);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    const view = this.view();
    if (view && this.instance) {
      const so = juice.shakeOffset();
      ctx.save();
      ctx.translate(so.x, so.y);
      try { this.instance.render(view, dt, now); } catch (err) { this.reportGameError(err); }
      ctx.restore();
    }
    juice.drawScreen(ctx, this.w, this.h);
  }

  reportGameError(err) {
    if (!this.lastErrAt || performance.now() - this.lastErrAt > 5000) {
      this.lastErrAt = performance.now();
      console.error('Erreur de rendu du jeu :', err);
    }
  }

  resize() {
    this.dpr = Math.min(2.5, devicePixelRatio || 1);
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.bgCache = null;
  }

  // Viewport letterboxé pour un monde worldW×worldH (coords CSS px).
  viewport(worldW, worldH, pad = 0) {
    const availW = this.w - pad * 2;
    const availH = this.h - pad * 2;
    const s = Math.min(availW / worldW, availH / worldH);
    const ox = (this.w - worldW * s) / 2;
    const oy = (this.h - worldH * s) / 2;
    return {
      s, ox, oy,
      apply: (ctx) => { ctx.translate(ox, oy); ctx.scale(s, s); },
      toWorld: (cx, cy) => ({ x: (cx - ox) / s, y: (cy - oy) / s }),
    };
  }

  // Fond commun « nuit de fête foraine » : ciel étoilé, silhouettes de
  // grande roue et de chapiteau, halos de néons. Rendu une fois par taille
  // dans un canvas hors écran, puis blitté chaque frame.
  buildBgCache() {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(this.w * this.dpr));
    c.height = Math.max(1, Math.round(this.h * this.dpr));
    const b = c.getContext('2d');
    b.scale(this.dpr, this.dpr);
    const w = this.w, h = this.h;

    const g = b.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0C0620');
    g.addColorStop(0.55, '#140A26');
    g.addColorStop(1, '#221240');
    b.fillStyle = g;
    b.fillRect(0, 0, w, h);

    // Étoiles (déterministes : même ciel à chaque frame).
    const rng = makeRng(777);
    for (let i = 0; i < 70; i++) {
      const x = rng.next() * w;
      const y = rng.next() * h * 0.7;
      b.globalAlpha = 0.12 + rng.next() * 0.4;
      b.fillStyle = rng.chance(0.2) ? '#FFC93C' : '#F5EFE6';
      b.fillRect(x, y, rng.chance(0.15) ? 2 : 1.2, rng.chance(0.15) ? 2 : 1.2);
    }
    b.globalAlpha = 1;

    // Halos de néons lointains.
    for (const [fx, fy, r, col] of [
      [0.15, 0.95, w * 0.5, 'rgba(255,61,138,.06)'],
      [0.85, 0.9, w * 0.45, 'rgba(41,217,255,.06)'],
      [0.5, 1.05, w * 0.6, 'rgba(255,201,60,.05)'],
    ]) {
      const rad = b.createRadialGradient(fx * w, fy * h, 0, fx * w, fy * h, r);
      rad.addColorStop(0, col);
      rad.addColorStop(1, 'rgba(0,0,0,0)');
      b.fillStyle = rad;
      b.fillRect(0, 0, w, h);
    }

    // Grande roue en silhouette (bas gauche).
    const wx = w * 0.1, wy = h * 0.98, wr = Math.min(w, h) * 0.3;
    b.strokeStyle = 'rgba(185,168,208,.09)';
    b.lineWidth = 2;
    b.beginPath();
    b.arc(wx, wy - wr, wr, 0, TAU);
    b.stroke();
    b.beginPath();
    b.arc(wx, wy - wr, wr * 0.7, 0, TAU);
    b.stroke();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      b.beginPath();
      b.moveTo(wx, wy - wr);
      b.lineTo(wx + Math.cos(a) * wr, wy - wr + Math.sin(a) * wr);
      b.stroke();
      b.fillStyle = 'rgba(185,168,208,.12)';
      b.fillRect(wx + Math.cos(a) * wr - 3, wy - wr + Math.sin(a) * wr, 6, 5);
    }

    // Chapiteau en silhouette (bas droite).
    const tx = w * 0.88, ty = h, tw = Math.min(w, h) * 0.3;
    b.fillStyle = 'rgba(185,168,208,.07)';
    b.beginPath();
    b.moveTo(tx - tw / 2, ty);
    b.quadraticCurveTo(tx - tw * 0.2, ty - tw * 0.45, tx, ty - tw * 0.55);
    b.quadraticCurveTo(tx + tw * 0.2, ty - tw * 0.45, tx + tw / 2, ty);
    b.closePath();
    b.fill();
    b.fillRect(tx - 1.5, ty - tw * 0.7, 3, tw * 0.16);
    b.beginPath();
    b.moveTo(tx, ty - tw * 0.7);
    b.lineTo(tx + 12, ty - tw * 0.66);
    b.lineTo(tx, ty - tw * 0.62);
    b.closePath();
    b.fill();

    this.bgCache = { c, w, h };
  }

  drawBg(ctx) {
    if (!this.bgCache || this.bgCache.w !== this.w || this.bgCache.h !== this.h) {
      this.buildBgCache();
    }
    ctx.drawImage(this.bgCache.c, 0, 0, this.w, this.h);
    // Guirlande d'ampoules animée en haut de l'écran.
    const nb = Math.floor(this.w / 56);
    const time = performance.now() / 1000;
    ctx.strokeStyle = 'rgba(185,168,208,.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= nb; i++) {
      const x = (i / nb) * this.w;
      const y = 10 + Math.sin((i / nb) * Math.PI * 3) * 6;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    for (let i = 0; i <= nb; i++) {
      const x = (i / nb) * this.w;
      const y = 10 + Math.sin((i / nb) * Math.PI * 3) * 6;
      const on = (Math.floor(time * 2) + i) % 3 === 0;
      ctx.fillStyle = on ? 'rgba(255,201,60,.85)' : 'rgba(255,201,60,.22)';
      ctx.beginPath();
      ctx.arc(x, y, on ? 3 : 2.2, 0, TAU);
      ctx.fill();
    }
  }
}
