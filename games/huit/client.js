// HUIT AMÉRICAIN : rendu client. Tapis de famille : la defausse au centre,
// la pioche a cote, la couleur demandee en gros, ta main en eventail en bas
// (les cartes injouables sont assombries), les autres joueurs autour avec
// leurs dos de cartes. Deux mises en page : paysage et portrait.

import meta from './meta.js';
import { drawCard, drawCardBack, drawSuitShape, roundRectPath } from '/cardkit.js';
import { SUIT_NAMES } from '/shared/cards.js';

const GOLD = '#FFC93C';
const CREAM = '#F5EFE6';
const MAUVE = '#B9A8D0';
const GREEN = '#3DFF8A';
const RED = '#FF4757';
const CYAN = '#29D9FF';
const SUIT_COL = ['#241B2F', '#D42A45', '#D42A45', '#241B2F'];

const LAND = {
  AW: 1000, AH: 660, portrait: false,
  tableY: 248, othersY: 92, handY: 470, barY: 556,
  cw: 92, myCw: 86, otherCw: 26,
};
const PORT = {
  AW: 620, AH: 1040, portrait: true,
  tableY: 462, othersY: 150, handY: 782, barY: 892,
  cw: 88, myCw: 84, otherCw: 24,
};

const fmtN = (n) => String(Math.round(n));
const suitOf = (id) => Math.floor(id / 13) % 4;
const rankOf = (id) => (id % 13) + 1;

export function createClient({ ctx, helpers, config, you, send }) {
  const { juice, sfx, TAU, clamp } = helpers;
  const zones = [];
  const flights = [];        // cartes en vol vers la defausse ou vers une main
  const sprites = new Map();
  let L = LAND;
  let view = null;
  let lastVp = null;
  let seuleFlash = 0;
  const others = Object.keys(config.players).filter((pid) => pid !== you);
  const shortName = (n, max) => (n.length > max ? `${n.slice(0, max - 1)}…` : n);

  // ── Sprites de cartes (vectoriel mis en cache, blit rapide) ──
  function sprite(id, w) {
    const key = `${id}|${Math.round(w)}`;
    const hit = sprites.get(key);
    if (hit) return hit;
    const S = 2;
    const pad = Math.round(w * 0.2);
    const c = document.createElement('canvas');
    c.width = Math.ceil((w + pad * 2) * S);
    c.height = Math.ceil((w * 1.4 + pad * 2) * S);
    const g = c.getContext('2d');
    g.scale(S, S);
    if (id < 0) drawCardBack(g, pad, pad, w, { tint: meta.color, thick: Math.max(1, w * 0.03) });
    else drawCard(g, id, pad, pad, w, { thick: Math.max(1, w * 0.03) });
    sprites.set(key, c);
    if (sprites.size > 180) sprites.delete(sprites.keys().next().value);
    return c;
  }

  function blit(cx, cy, w, id, opts = {}) {
    const spr = sprite(id, w);
    const dw = spr.width / 2, dh = spr.height / 2;
    ctx.save();
    ctx.translate(cx, cy);
    if (opts.angle) ctx.rotate(opts.angle);
    if (opts.scale) ctx.scale(opts.scale, opts.scale);
    ctx.drawImage(spr, -dw / 2, -dh / 2, dw, dh);
    if (opts.dim) {
      roundRectPath(ctx, -w / 2, -w * 0.7, w, w * 1.4, w * 0.09);
      ctx.fillStyle = `rgba(14,7,28,${opts.dim})`;
      ctx.fill();
    }
    if (opts.glow) {
      roundRectPath(ctx, -w / 2, -w * 0.7, w, w * 1.4, w * 0.09);
      ctx.strokeStyle = opts.glow;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  }

  function panel(x, y, w, h, opts = {}) {
    roundRectPath(ctx, x, y, w, h, opts.r || 12);
    ctx.fillStyle = opts.fill || 'rgba(18,9,36,.7)';
    ctx.fill();
    if (opts.stroke) {
      ctx.strokeStyle = opts.stroke;
      ctx.lineWidth = opts.lw || 1.4;
      ctx.stroke();
    }
  }

  function label(text, x, y, opts = {}) {
    ctx.font = `${opts.weight || 600} ${opts.size || 13}px ${opts.display ? 'Bungee, ' : ''}Rubik, system-ui, sans-serif`;
    ctx.textAlign = opts.align || 'center';
    if (opts.outline) {
      ctx.strokeStyle = 'rgba(14,7,28,.85)';
      ctx.lineWidth = opts.outline;
      ctx.strokeText(text, x, y);
    }
    ctx.fillStyle = opts.color || CREAM;
    ctx.fillText(text, x, y);
    ctx.textAlign = 'left';
  }

  const lighten = (hex, k) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${Math.min(255, ((n >> 16) & 255) + 255 * k) | 0},${Math.min(255, ((n >> 8) & 255) + 255 * k) | 0},${Math.min(255, (n & 255) + 255 * k) | 0})`;
  };
  const darken = (hex, k) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${(((n >> 16) & 255) * (1 - k)) | 0},${(((n >> 8) & 255) * (1 - k)) | 0},${((n & 255) * (1 - k)) | 0})`;
  };

  function button(x, y, w, h, text, opts = {}) {
    const on = opts.enabled !== false;
    const col = opts.color || meta.color;
    ctx.save();
    if (!on) ctx.globalAlpha = 0.3;
    roundRectPath(ctx, x, y + 4, w, h, 12);
    ctx.fillStyle = 'rgba(8,4,18,.75)';
    ctx.fill();
    roundRectPath(ctx, x, y, w, h, 12);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, lighten(col, 0.2));
    g.addColorStop(1, darken(col, 0.18));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.26)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    label(text, x + w / 2, y + h / 2 + (opts.sub ? -2 : 5), {
      size: opts.size || 15, weight: 800, color: opts.ink || '#160B2B', display: true,
    });
    if (opts.sub) label(opts.sub, x + w / 2, y + h - 8, { size: 10, weight: 600, color: opts.ink && opts.ink !== '#160B2B' ? 'rgba(245,239,230,.78)' : 'rgba(22,11,43,.72)' });
    ctx.restore();
    if (on && opts.fn) zones.push({ x, y, w, h, fn: opts.fn });
  }

  // ── Place des autres joueurs autour du tapis ──
  function otherPos(i) {
    const n = Math.max(1, others.length);
    if (L.portrait) {
      const perRow = Math.min(4, n);
      const row = Math.floor(i / perRow);
      const rows = Math.ceil(n / perRow);
      const inRow = Math.min(perRow, n - row * perRow);
      const k = inRow === 1 ? 0.5 : (i % perRow) / (inRow - 1);
      return { x: 82 + k * (L.AW - 164), y: L.othersY + (row - (rows - 1) / 2) * 118 };
    }
    const k = n === 1 ? 0.5 : i / (n - 1);
    return { x: 92 + k * (L.AW - 184), y: L.othersY + Math.sin(k * Math.PI) * -10 };
  }

  const posOf = (pid) => (pid === you
    ? { x: L.AW / 2, y: L.handY }
    : otherPos(Math.max(0, others.indexOf(pid))));

  // ── Tapis : defausse, pioche, couleur demandee, sens du jeu ──
  function drawTable(v, now) {
    const cx = L.AW / 2, cy = L.tableY;
    // Tapis feutre.
    const r = L.portrait ? 210 : 190;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.45, r, 0, 0, TAU);
    const g = ctx.createRadialGradient(cx, cy - 20, 20, cx, cy, r * 1.4);
    g.addColorStop(0, '#3A2263');
    g.addColorStop(1, '#1B0F35');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,201,60,.22)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Sens du jeu : une fleche courbe autour du tapis.
    ctx.save();
    ctx.strokeStyle = 'rgba(41,217,255,.35)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = (v.dir > 0 ? -now : now) / 60;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.15, r * 0.72, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    const aArrow = v.dir > 0 ? 0.35 : Math.PI - 0.35;
    const ax = cx + Math.cos(aArrow) * r * 1.15, ay = cy + Math.sin(aArrow) * r * 0.72;
    ctx.translate(ax, ay);
    ctx.rotate(aArrow + (v.dir > 0 ? Math.PI / 2 : -Math.PI / 2));
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(9, 6);
    ctx.lineTo(-9, 6);
    ctx.closePath();
    ctx.fillStyle = CYAN;
    ctx.fill();
    ctx.restore();

    // Pioche.
    const pileX = cx - (L.portrait ? 108 : 130);
    for (let i = Math.min(4, Math.ceil(v.drawN / 8)); i >= 0; i--) {
      blit(pileX - i * 1.6, cy - i * 2.2, L.cw * 0.86, -1, {});
    }
    label(`${v.drawN} cartes`, pileX, cy + L.cw * 0.94, { size: 12, weight: 800, color: MAUVE, outline: 3 });
    label('PIOCHE', pileX, cy - L.cw * 0.72, { size: 10, weight: 800, color: MAUVE, outline: 3 });
    if (v.can.draw) {
      zones.push({
        x: pileX - L.cw * 0.55, y: cy - L.cw * 0.66, w: L.cw * 1.1, h: L.cw * 1.4,
        fn: () => { send.act('draw'); sfx.play('click'); },
      });
      ctx.beginPath();
      roundRectPath(ctx, pileX - L.cw * 0.47, cy - L.cw * 0.62, L.cw * 0.94, L.cw * 1.3, 8);
      ctx.strokeStyle = `rgba(61,255,138,${0.5 + Math.sin(now / 220) * 0.3})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    // Le Requin voit le dessus de la pioche.
    if (v.peek != null) {
      blit(pileX, cy - L.cw * 1.25, L.cw * 0.42, v.peek, { angle: -0.2 });
      label('tu la vois', pileX, cy - L.cw * 1.72, { size: 9, weight: 700, color: GOLD, outline: 3 });
    }

    // Defausse.
    if (v.top != null) {
      blit(cx, cy, L.cw, v.top, { angle: 0.04 });
    }
    // Couleur demandee, en gros.
    const sx = cx + (L.portrait ? 112 : 136);
    panel(sx - 40, cy - 52, 80, 104, { fill: 'rgba(12,6,26,.75)', stroke: 'rgba(255,201,60,.3)', r: 14 });
    label('COULEUR', sx, cy - 34, { size: 9, weight: 800, color: MAUVE });
    ctx.save();
    ctx.beginPath();
    ctx.arc(sx, cy + 2, 26, 0, TAU);
    ctx.fillStyle = CREAM;
    ctx.fill();
    drawSuitShape(ctx, v.suit, sx, cy + 2, 34, SUIT_COL[v.suit]);
    ctx.restore();
    label(SUIT_NAMES[v.suit], sx, cy + 44, { size: 10, weight: 700, color: MAUVE });

    // Cumul des 7 en attente.
    if (v.pending > 0) {
      const py = cy + (L.portrait ? 128 : 116);
      panel(cx - 96, py - 22, 192, 44, { fill: 'rgba(255,71,87,.18)', stroke: RED, r: 12, lw: 2 });
      label(`+${v.pending} CARTES EN JEU`, cx, py + 6, { size: 16, weight: 800, color: RED, display: true });
    }
  }

  // ── Les autres joueurs : dos de cartes, compte, alerte carte seule ──
  function drawOthers(v, now) {
    others.forEach((pid, i) => {
      const p = v.players[pid];
      if (!p) return;
      const pos = otherPos(i);
      const info = config.players[pid] || {};
      const col = info.color || '#888';
      const isTurn = v.turn === pid;
      const alerte = p.n === 1;
      const w = L.portrait ? 132 : Math.min(140, (L.AW - 120) / Math.max(1, others.length));
      panel(pos.x - w / 2, pos.y - 34, w, 88, {
        fill: 'rgba(12,6,26,.62)',
        stroke: isTurn ? 'rgba(61,255,138,.75)' : alerte ? 'rgba(255,201,60,.6)' : 'rgba(185,168,208,.16)',
        lw: isTurn ? 2.4 : 1.3,
        r: 14,
      });
      label(shortName(info.name || '', 13), pos.x, pos.y - 18, { size: 11, weight: 800, color: col });

      // Dos de cartes en eventail (ou cartes visibles pour les coequipiers).
      const n = Math.min(p.n, 7);
      const step = Math.min(14, (w - 30) / Math.max(1, n));
      for (let k = 0; k < n; k++) {
        const x = pos.x - ((n - 1) * step) / 2 + k * step;
        const id = p.cards ? p.cards[k] : -1;
        blit(x, pos.y + 12, L.otherCw, id === undefined ? -1 : id, {
          angle: (k - (n - 1) / 2) * 0.07,
        });
      }
      // Compte de cartes.
      const badge = pos.x + w / 2 - 18;
      ctx.beginPath();
      ctx.arc(badge, pos.y + 34, 13, 0, TAU);
      ctx.fillStyle = alerte ? GOLD : 'rgba(12,6,26,.9)';
      ctx.fill();
      ctx.strokeStyle = alerte ? '#fff' : 'rgba(185,168,208,.45)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      label(String(p.n), badge, pos.y + 39, {
        size: 13, weight: 800, color: alerte ? '#160B2B' : CREAM,
      });
      if (alerte) {
        const puls = 0.6 + Math.sin(now / 160) * 0.4;
        label('CARTE SEULE !', pos.x, pos.y - 40, {
          size: 11, weight: 800, color: `rgba(255,201,60,${puls})`, outline: 3, display: true,
        });
      }
      label(`${p.score} pts`, pos.x - w / 2 + 22, pos.y + 39, { size: 10, weight: 700, color: MAUVE });
    });
  }

  // ── Ma main en eventail ──
  function drawMyHand(v, now) {
    const me = v.players[you];
    if (!me || !me.cards) return;
    const cards = me.cards;
    const n = cards.length;
    if (!n) return;
    const cw = n > 9 ? L.myCw * 0.74 : n > 6 ? L.myCw * 0.86 : L.myCw;
    const maxW = L.AW - 90;
    const step = Math.min(cw * 0.72, maxW / Math.max(1, n));
    const x0 = L.AW / 2 - ((n - 1) * step) / 2;
    const canPlay = !!v.can.play;
    cards.forEach((id, i) => {
      const jouable = v.ok.includes(id);
      const x = x0 + i * step;
      const lift = jouable && canPlay ? 12 + Math.sin(now / 300 + i) * 2 : 0;
      const ang = (i - (n - 1) / 2) * 0.035;
      blit(x, L.handY - lift, cw, id, {
        angle: ang,
        dim: canPlay && !jouable ? 0.55 : 0,
        glow: jouable && canPlay ? 'rgba(61,255,138,.85)' : null,
      });
      if (canPlay && jouable) {
        zones.push({
          x: x - step / 2, y: L.handY - lift - cw * 0.7, w: Math.max(44, step), h: cw * 1.4,
          fn: () => { send.act('play', { c: id }); sfx.play('click'); },
        });
      }
    });
    // Rappel du nombre de cartes.
    label(`${n} carte${n > 1 ? 's' : ''} en main`, L.AW / 2, L.handY + cw * 0.92, {
      size: 11, weight: 700, color: MAUVE, outline: 3,
    });
  }

  // ── Barre du bas : actions contextuelles ──
  function drawBar(v, now) {
    const top = L.barY;
    const H = L.AH - top - 10;
    const me = v.players[you];

    // Choix de la couleur apres un 8 : quatre grandes pastilles.
    if (v.can.suit) {
      panel(20, top, L.AW - 40, H, { fill: 'rgba(10,5,22,.9)', stroke: GOLD, r: 16, lw: 2 });
      label('TU AS POSÉ UN 8 : CHOISIS LA COULEUR', L.AW / 2, top + 24, {
        size: 14, weight: 800, color: GOLD, display: true,
      });
      const r = Math.min(34, (H - 46) / 2);
      const gap = r * 2.9;
      const x0 = L.AW / 2 - (3 * gap) / 2;
      for (let s = 0; s < 4; s++) {
        const x = x0 + s * gap, y = top + 40 + r;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fillStyle = CREAM;
        ctx.fill();
        ctx.strokeStyle = `rgba(255,201,60,${0.5 + Math.sin(now / 200) * 0.3})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        drawSuitShape(ctx, s, x, y, r * 1.25, SUIT_COL[s]);
        zones.push({
          x: x - r - 4, y: y - r - 4, w: r * 2 + 8, h: r * 2 + 8,
          fn: () => { send.act('suit', { s }); sfx.play('ready'); },
        });
      }
      return;
    }

    panel(20, top, L.AW - 40, H, { fill: 'rgba(10,5,22,.82)', stroke: 'rgba(255,122,61,.28)', r: 16 });

    // Fenetre « carte seule » : annoncer ou denoncer, c est le sel du jeu.
    if (v.seule) {
      if (seuleFlash > 0) {
        ctx.save();
        ctx.globalAlpha = seuleFlash * 0.25;
        roundRectPath(ctx, 20, top, L.AW - 40, H, 16);
        ctx.fillStyle = GOLD;
        ctx.fill();
        ctx.restore();
      }
      const cible = config.players[v.seule.pid] || {};
      const reste = Math.max(0, v.seule.t);
      if (v.can.seule) {
        label(`VITE ! ${reste.toFixed(1)} s POUR ANNONCER`, L.AW / 2, top + 22, {
          size: 13, weight: 800, color: GOLD, display: true,
        });
        button(L.AW / 2 - 150, top + 32, 300, Math.min(56, H - 42), '🔔 CARTE SEULE !', {
          color: GOLD, size: 18, sub: 'sinon ils te denoncent',
          fn: () => { send.act('seule'); sfx.play('mission'); },
        });
        return;
      }
      if (v.can.denonce) {
        label(`${shortName(cible.name || '', 14)} N'A PLUS QU'UNE CARTE ET N'A RIEN DIT`, L.AW / 2, top + 22, {
          size: 12, weight: 800, color: CYAN, display: true,
        });
        button(L.AW / 2 - 150, top + 32, 300, Math.min(56, H - 42), '🔔 DÉNONCER !', {
          color: CYAN, size: 18, sub: `${reste.toFixed(1)} s : il prendra 2 cartes`,
          fn: () => { send.act('denonce'); sfx.play('klaxon'); },
        });
        return;
      }
    }

    // Phase de fin de manche : le decompte.
    if (v.phase === 'show') {
      const gagnant = v.winner ? (config.players[v.winner] || {}).name : null;
      label(gagnant ? `${gagnant} A POSÉ SA DERNIÈRE CARTE` : 'MANCHE TERMINÉE', L.AW / 2, top + 26, {
        size: 16, weight: 800, color: GOLD, display: true,
      });
      const pen = me && me.pen != null ? me.pen : 0;
      label(pen === 0 ? 'Tu ne prends aucun point. Impeccable.' : `Tu ramasses ${pen} points de penalite.`,
        L.AW / 2, top + 50, { size: 13, weight: 600, color: pen === 0 ? GREEN : MAUVE });
      return;
    }
    if (v.phase === 'end') {
      label('FIN DE PARTIE', L.AW / 2, top + 32, { size: 18, weight: 800, color: GOLD, display: true });
      return;
    }

    // Mon tour : piocher, passer. Sinon : qui joue.
    if (v.can.play) {
      const bw = Math.min(210, (L.AW - 80) / 2);
      const bh = Math.min(52, H - 30);
      const by = top + (H - bh) / 2;
      label('À TOI DE JOUER', L.AW / 2, top + 18, { size: 12, weight: 800, color: GREEN, display: true });
      const nJouable = v.ok.length;
      button(L.AW / 2 - bw - 8, by + 6, bw, bh, v.pending > 0 ? `ENCAISSER +${v.pending}` : '🎴 PIOCHER', {
        color: v.pending > 0 ? RED : '#4B2E70', ink: CREAM, size: 15,
        enabled: !!v.can.draw,
        sub: v.pending > 0 ? 'ou pose un 7' : v.drew ? 'deja pioche' : 'une carte',
        fn: () => { send.act('draw'); sfx.play('click'); },
      });
      button(L.AW / 2 + 8, by + 6, bw, bh, 'PASSER', {
        color: '#6B4E9E', ink: CREAM, size: 15,
        enabled: !!v.can.pass,
        sub: v.can.pass ? 'rien de jouable' : nJouable ? `${nJouable} carte(s) jouable(s)` : 'pioche d abord',
        fn: () => { send.act('pass'); sfx.play('leave'); },
      });
      return;
    }
    const qui = config.players[v.turn] || {};
    label(v.turn ? `AU TOUR DE ${shortName(qui.name || '', 15).toUpperCase()}` : 'DISTRIBUTION…',
      L.AW / 2, top + H / 2 - 2, { size: 15, weight: 800, color: MAUVE, display: true });
    if (me && me.cards) {
      label(`${v.ok.length} de tes cartes iraient sur ce tas`, L.AW / 2, top + H / 2 + 20, {
        size: 11, weight: 600, color: 'rgba(185,168,208,.7)',
      });
    }
  }

  // ── Cartes en vol ──
  function drawFlights(dt) {
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i];
      f.t += dt;
      const k = f.t / f.dur;
      if (k >= 1) { flights.splice(i, 1); continue; }
      const e = 1 - (1 - k) * (1 - k);
      blit(f.x0 + (f.x1 - f.x0) * e, f.y0 + (f.y1 - f.y0) * e, L.cw * 0.8, f.id, {
        angle: (1 - e) * (f.spin || 0.8),
        scale: 0.85 + e * 0.15,
      });
    }
  }

  // ── Bandeau du haut ──
  function drawHud(v) {
    const s = helpers.size();
    const hy = L.portrait ? 60 : 22;
    label(`MANCHE ${v.manche}/${v.manches}`, s.w / 2, hy, {
      size: 15, weight: 800, color: MAUVE, display: true,
    });
    if (v.phase === 'play' || v.phase === 'suit') {
      const frac = clamp(v.tl / Math.max(1, v.tlMax), 0, 1);
      const bw = Math.min(240, s.w * 0.46);
      roundRectPath(ctx, s.w / 2 - bw / 2, hy + 8, bw, 6, 3);
      ctx.fillStyle = 'rgba(185,168,208,.22)';
      ctx.fill();
      roundRectPath(ctx, s.w / 2 - bw / 2, hy + 8, bw * frac, 6, 3);
      ctx.fillStyle = v.tl < 4 ? RED : v.tl < 7 ? GOLD : GREEN;
      ctx.fill();
    }
    const me = v.players[you];
    if (me) {
      label(`TON TOTAL : ${me.score} pts`, s.w - 14, s.h - 10, {
        size: 11, weight: 700, color: MAUVE, align: 'right',
      });
    }
    label('le plus petit total gagne', 14, s.h - 10, {
      size: 10, weight: 600, color: 'rgba(185,168,208,.55)', align: 'left',
    });
  }

  return {
    onTap(x, y, phase) {
      if (phase !== 'end' || !lastVp) return;
      const w = lastVp.toWorld(x, y);
      // Les zones les plus recentes (barre, main) priment sur le tapis.
      for (let i = zones.length - 1; i >= 0; i--) {
        const z = zones[i];
        if (w.x >= z.x && w.x <= z.x + z.w && w.y >= z.y && w.y <= z.y + z.h) { z.fn(); return; }
      }
    },

    onEvents(evs) {
      for (const ev of evs) {
        if (ev.e === 'play') {
          const from = posOf(ev.pid);
          flights.push({
            id: ev.c, x0: from.x, y0: from.y, x1: L.AW / 2, y1: L.tableY, t: 0, dur: 0.26, spin: 0.9,
          });
          sfx.play('click');
          if (rankOf(ev.c) === 8) sfx.play('boost');
        } else if (ev.e === 'draw') {
          const to = posOf(ev.pid);
          for (let k = 0; k < Math.min(4, ev.k); k++) {
            flights.push({
              id: -1, x0: L.AW / 2 - 130, y0: L.tableY, x1: to.x, y1: to.y, t: -k * 0.06, dur: 0.28, spin: -0.6,
            });
          }
          sfx.play(ev.forced ? 'steal' : 'pickup');
          if (ev.forced && ev.k >= 4) {
            juice.floater(posOf(ev.pid).x, posOf(ev.pid).y - 40, `+${ev.k} !`, { color: RED, size: 22 });
            juice.shake(5);
          }
        } else if (ev.e === 'sept') {
          juice.floater(L.AW / 2, L.tableY + 60, `7 ! +${ev.cum} POUR LE SUIVANT`, { color: RED, size: 18 });
          juice.shake(3);
          sfx.play('hit');
        } else if (ev.e === 'suit') {
          juice.floater(L.AW / 2, L.tableY - 60, SUIT_NAMES[ev.s].toUpperCase(), { color: GOLD, size: 20 });
          sfx.play('whistle');
        } else if (ev.e === 'demitour') {
          juice.floater(L.AW / 2, L.tableY - 70, 'DEMI-TOUR !', { color: CYAN, size: 20 });
          sfx.play('dash');
        } else if (ev.e === 'saute') {
          const p = posOf(ev.pid);
          juice.floater(p.x, p.y - 30, 'TOUR SAUTÉ !', { color: MAUVE, size: 16 });
          sfx.play('leave');
        } else if (ev.e === 'seule') {
          seuleFlash = 1;
          juice.floater(L.AW / 2, L.tableY - 100, 'UNE SEULE CARTE !', { color: GOLD, size: 22 });
          sfx.play('klaxon');
        } else if (ev.e === 'called') {
          const p = posOf(ev.pid);
          juice.floater(p.x, p.y - 50, 'CARTE SEULE !', { color: GREEN, size: 18 });
          sfx.play('mission');
        } else if (ev.e === 'denonce') {
          const p = posOf(ev.pid);
          juice.floater(p.x, p.y - 50, 'DÉNONCÉ ! +2', { color: RED, size: 20 });
          juice.burst(p.x, p.y, { n: 18, color: RED, speed: 160 });
          juice.shake(6);
          sfx.play('klaxon');
        } else if (ev.e === 'win') {
          const p = posOf(ev.pid);
          juice.confetti(p.x, p.y, [GOLD, GREEN, CREAM, meta.color], ev.pid === you ? 70 : 30);
          juice.floater(p.x, p.y - 60, 'PLUS DE CARTES !', { color: GOLD, size: 22 });
          sfx.play(ev.pid === you ? 'win' : 'bank');
        } else if (ev.e === 'manche') {
          flights.length = 0;
          sfx.play('join');
        } else if (ev.e === 'shuffle') {
          juice.floater(L.AW / 2 - 130, L.tableY - 70, 'ON REMÉLANGE', { color: MAUVE, size: 14 });
          sfx.play('dash');
        } else if (ev.e === 'turn' && ev.pid === you) {
          sfx.play('tickup');
        }
      }
    },

    render(v0, dt, now) {
      const v = v0.latest;
      view = v;
      const size = helpers.size();
      L = size.h / size.w > 1.12 ? PORT : LAND;
      helpers.bg(ctx);
      const vp = helpers.viewport(L.AW, L.AH, 6);
      lastVp = vp;
      ctx.save();
      vp.apply(ctx);
      zones.length = 0;
      seuleFlash = Math.max(0, seuleFlash - dt * 1.5);

      drawTable(v, now);
      drawOthers(v, now);
      drawMyHand(v, now);
      drawFlights(dt);
      drawBar(v, now);

      juice.drawWorld(ctx);
      ctx.restore();
      drawHud(v);
    },

    destroy() {
      zones.length = 0;
      flights.length = 0;
      sprites.clear();
    },
  };
}
