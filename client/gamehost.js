// Hôte de jeu côté client : canvas, horloge d'interpolation (rendu à
// t−110 ms entre deux snapshots), boucle 60 fps, juice, contrôles.
// Charge dynamiquement /games/<id>/client.js et lui délègue le rendu.

import * as juice from './juice.js';
import * as sfx from './sfx.js';
import { t } from './strings.js';
import {
  PLAYER_COLORS, TEAM_SHAPES, TAU,
  clamp, lerp, angleLerp, interpEnts,
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
        nameTag: (ctx, x, y, name, color, size = 12) => {
          ctx.font = `600 ${size}px Rubik, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.strokeStyle = 'rgba(20,10,38,.85)';
          ctx.lineWidth = 3;
          ctx.strokeText(name, x, y);
          ctx.fillStyle = color;
          ctx.fillText(name, x, y);
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
    this.input.onTap = (x, y) => this.instance?.onTap?.(x, y);

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

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    removeEventListener('resize', this.boundResize);
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

  // Fond commun « nuit de fête foraine » : dégradé + lumières lointaines.
  drawBg(ctx) {
    if (!this.bgCache || this.bgCache.w !== this.w || this.bgCache.h !== this.h) {
      const g = ctx.createLinearGradient(0, 0, 0, this.h);
      g.addColorStop(0, '#0E0720');
      g.addColorStop(0.6, '#140A26');
      g.addColorStop(1, '#1E1038');
      this.bgCache = { g, w: this.w, h: this.h };
    }
    ctx.fillStyle = this.bgCache.g;
    ctx.fillRect(0, 0, this.w, this.h);
    // Guirlande d'ampoules discrète en haut de l'écran.
    const nb = Math.floor(this.w / 56);
    const time = performance.now() / 1000;
    for (let i = 0; i <= nb; i++) {
      const x = (i / nb) * this.w;
      const y = 10 + Math.sin((i / nb) * Math.PI * 3) * 6;
      const on = (Math.floor(time * 2) + i) % 3 === 0;
      ctx.fillStyle = on ? 'rgba(255,201,60,.8)' : 'rgba(255,201,60,.22)';
      ctx.beginPath();
      ctx.arc(x, y, on ? 3 : 2.2, 0, TAU);
      ctx.fill();
    }
  }
}
