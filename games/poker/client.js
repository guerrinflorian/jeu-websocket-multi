// POKER : rendu client. Table ovale de casino, joueurs autour, cartes
// communes au centre, jetons cylindriques empiles devant chacun, pot au
// milieu. Mes deux cartes en grand, ma meilleure main surlignee et nommee.
// Barre d'actions contextuelle avec reglette de relance.
// Deux mises en page : paysage et portrait.

import meta from './meta.js';
import { drawCard, drawCardBack, drawChipStack, roundRectPath } from '/cardkit.js';

const GOLD = '#FFC93C';
const CREAM = '#F5EFE6';
const MAUVE = '#B9A8D0';
const GREEN = '#3DFF8A';
const RED = '#FF4757';
const CYAN = '#29D9FF';

const LAND = {
  AW: 1000, AH: 700, portrait: false,
  cx: 500, cy: 268, rx: 366, ry: 172,
  boardW: 72, holeW: 44, myHoleW: 88, barY: 518,
};
const PORT = {
  AW: 620, AH: 1030, portrait: true,
  cx: 310, cy: 356, rx: 250, ry: 228,
  boardW: 58, holeW: 38, myHoleW: 82, barY: 700,
};

const fmtN = (n) => String(Math.round(n));
const STREETS = ['PRÉFLOP', 'FLOP', 'TURN', 'RIVER'];

export function createClient({ ctx, helpers, config, you, send }) {
  const { juice, sfx, TAU, clamp } = helpers;

  const zones = [];
  const sprites = new Map();
  const pops = new Map();
  let L = LAND;
  let view = null;
  let lastVp = null;
  let tableCache = null;
  let drag = null;
  let raiseTo = null;       // valeur locale de la reglette
  let lastSent = 0;
  let flyChips = [];        // jetons qui glissent vers le vainqueur

  // ── Sprites de cartes ──
  function cardSprite(id, w) {
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
    if (id < 0) drawCardBack(g, pad, pad, w, { tint: '#2FA95F', thick: Math.max(1, w * 0.03) });
    else drawCard(g, id, pad, pad, w, { thick: Math.max(1, w * 0.03) });
    sprites.set(key, c);
    if (sprites.size > 180) sprites.delete(sprites.keys().next().value);
    return c;
  }

  function blitCard(cx, cy, w, id, opts = {}) {
    const spr = cardSprite(id, w);
    const dw = spr.width / 2, dh = spr.height / 2;
    ctx.save();
    ctx.translate(cx, cy);
    if (opts.angle) ctx.rotate(opts.angle);
    if (opts.scale) ctx.scale(opts.scale, opts.scale);
    if (opts.dim) ctx.globalAlpha = 1 - opts.dim;
    ctx.drawImage(spr, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
    if (opts.glow) {
      ctx.save();
      ctx.translate(cx, cy);
      if (opts.angle) ctx.rotate(opts.angle);
      roundRectPath(ctx, -w / 2, -w * 0.7, w, w * 1.4, w * 0.09);
      ctx.strokeStyle = opts.glow;
      ctx.lineWidth = Math.max(2, w * 0.055);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── Briques d'interface ──
  function panel(x, y, w, h, opts = {}) {
    roundRectPath(ctx, x, y, w, h, opts.r || 12);
    ctx.fillStyle = opts.fill || 'rgba(12,6,26,.68)';
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
      ctx.strokeStyle = 'rgba(10,5,20,.9)';
      ctx.lineWidth = opts.outline;
      ctx.strokeText(text, x, y);
    }
    ctx.fillStyle = opts.color || CREAM;
    ctx.fillText(text, x, y);
    ctx.textAlign = 'left';
  }

  function lighten(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${Math.min(255, ((n >> 16) & 255) + 255 * k) | 0},${Math.min(255, ((n >> 8) & 255) + 255 * k) | 0},${Math.min(255, (n & 255) + 255 * k) | 0})`;
  }
  function darken(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${(((n >> 16) & 255) * (1 - k)) | 0},${(((n >> 8) & 255) * (1 - k)) | 0},${((n & 255) * (1 - k)) | 0})`;
  }

  function button(x, y, w, h, text, opts = {}) {
    const on = opts.enabled !== false;
    const col = opts.color || '#2FA95F';
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
    const ink = opts.ink || '#160B2B';
    label(text, x + w / 2, y + h / 2 + (opts.sub ? -2 : 5), {
      size: opts.size || 15, weight: 800, color: ink, display: true,
    });
    if (opts.sub) {
      label(opts.sub, x + w / 2, y + h - 8, {
        size: 10, weight: 600,
        color: ink !== '#160B2B' ? 'rgba(245,239,230,.78)' : 'rgba(22,11,43,.72)',
      });
    }
    ctx.restore();
    if (on && opts.fn) zones.push({ x, y, w, h, fn: opts.fn });
  }

  // ── Places : moi toujours en bas, les autres autour de l'ovale ──
  function seatOrder(v) {
    const s = v.seats;
    const i = s.indexOf(you);
    return i < 0 ? s : [...s.slice(i), ...s.slice(0, i)];
  }
  function seatPos(k, n) {
    const a = Math.PI / 2 + (k / n) * TAU;
    return { x: L.cx + Math.cos(a) * L.rx, y: L.cy + Math.sin(a) * L.ry };
  }

  // ── Decor : tapis ovale et rail de cuir (mis en cache) ──
  function buildTable() {
    const S = 2;
    const c = document.createElement('canvas');
    c.width = L.AW * S;
    c.height = L.AH * S;
    const g = c.getContext('2d');
    g.scale(S, S);
    const rx = L.rx - 34, ry = L.ry - 44;

    // Rail.
    g.save();
    g.beginPath();
    g.ellipse(L.cx, L.cy, rx + 40, ry + 40, 0, 0, TAU);
    const rail = g.createLinearGradient(0, L.cy - ry, 0, L.cy + ry);
    rail.addColorStop(0, '#3A2358');
    rail.addColorStop(1, '#150C29');
    g.fillStyle = rail;
    g.fill();
    g.strokeStyle = 'rgba(255,201,60,.3)';
    g.lineWidth = 2.5;
    g.stroke();
    // Tapis.
    g.beginPath();
    g.ellipse(L.cx, L.cy, rx, ry, 0, 0, TAU);
    const felt = g.createRadialGradient(L.cx, L.cy - ry * 0.3, 20, L.cx, L.cy, rx);
    felt.addColorStop(0, '#2E7A4E');
    felt.addColorStop(0.6, '#1F5C3A');
    felt.addColorStop(1, '#123B26');
    g.fillStyle = felt;
    g.fill();
    g.save();
    g.clip();
    g.fillStyle = 'rgba(255,255,255,.03)';
    let seed = 4242;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < 700; i++) g.fillRect(rnd() * L.AW, rnd() * L.AH, 2, 2);
    g.restore();
    g.strokeStyle = 'rgba(255,201,60,.22)';
    g.lineWidth = 1.6;
    g.beginPath();
    g.ellipse(L.cx, L.cy, rx - 12, ry - 12, 0, 0, TAU);
    g.stroke();
    g.restore();

    tableCache = { c, key: `${L.portrait ? 'p' : 'l'}` };
  }

  // ── Cartes communes et pot ──
  function drawBoard(v, now) {
    const w = L.boardW;
    const gap = w * 1.14;
    const n = 5;
    const x0 = L.cx - (n - 1) * gap / 2;
    const by = L.cy - (L.portrait ? 30 : 18);
    const winSet = new Set();
    if (v.showdown) {
      for (const h of v.showdown.hands) {
        if (v.showdown.wins.some((wn) => wn.pid === h.pid)) for (const c of h.cards) winSet.add(c);
      }
    } else if (v.me && v.me.hand) {
      for (const c of v.me.hand.cards) winSet.add(c);
    }
    for (let i = 0; i < n; i++) {
      const x = x0 + i * gap;
      const id = v.board[i];
      if (id === undefined) {
        roundRectPath(ctx, x - w / 2, by - w * 0.7, w, w * 1.4, w * 0.09);
        ctx.strokeStyle = 'rgba(255,255,255,.12)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        continue;
      }
      const pop = popOf(`b${i}`, now);
      blitCard(x, by - pop * 10, w, id, {
        scale: 1 + pop * 0.1,
        glow: winSet.has(id) ? GOLD : null,
      });
    }
    // Pot.
    const py = by + w * 0.98;
    if (v.pot > 0) {
      drawChipStack(ctx, L.cx - 46, py + 16, 11, v.pot, { maxChips: 9 });
      label(`POT : ${fmtN(v.pot)}`, L.cx + 24, py + 16, { size: 15, weight: 800, color: GOLD, display: true });
    } else {
      label(STREETS[v.street] || '', L.cx, py + 16, { size: 13, weight: 800, color: 'rgba(255,201,60,.5)', display: true });
    }
    if (v.pots.length > 1) {
      label(`${v.pots.length} pots : ${v.pots.map(fmtN).join(' + ')}`, L.cx, py + 36, {
        size: 10, weight: 600, color: MAUVE,
      });
    }
  }

  const popOf = (key, now) => {
    const t = pops.get(key);
    return t ? clamp(1 - (now - t) / 260, 0, 1) : 0;
  };

  // ── Une place autour du tapis ──
  function drawSeat(v, pid, k, n, now) {
    const p = v.players[pid];
    if (!p) return;
    const pos = seatPos(k, n);
    const info = config.players[pid] || {};
    const col = info.color || '#888';
    const me = pid === you;
    const turn = v.toAct === pid;
    const w = L.portrait ? 128 : 136;
    const h = 58;
    const dim = p.folded || p.out;

    ctx.save();
    if (dim) ctx.globalAlpha = 0.42;

    // Cartes fermees (les miennes sont affichees en grand dans la barre).
    if (!me && p.hole.length) {
      const cw = L.holeW;
      const showdownWin = v.showdown && v.showdown.wins.some((wn) => wn.pid === pid);
      const winCards = new Set();
      if (v.showdown) {
        const hh = v.showdown.hands.find((x) => x.pid === pid);
        if (hh && showdownWin) for (const c of hh.cards) winCards.add(c);
      }
      p.hole.forEach((id, i) => {
        blitCard(pos.x + (i - 0.5) * cw * 0.64, pos.y - 30, cw, id, {
          angle: (i - 0.5) * 0.08,
          glow: winCards.has(id) ? GOLD : null,
        });
      });
    } else if (me) {
      label('TOI', pos.x, pos.y - 30, { size: 13, weight: 800, color: col, display: true, outline: 3 });
    }

    // Panneau.
    panel(pos.x - w / 2, pos.y + 2, w, h, {
      fill: turn ? 'rgba(47,169,95,.22)' : 'rgba(12,6,26,.72)',
      stroke: turn ? GREEN : dim ? 'rgba(185,168,208,.15)' : 'rgba(255,201,60,.2)',
      lw: turn ? 2.4 : 1.2,
      r: 12,
    });
    label((info.name || '').slice(0, 13), pos.x, pos.y + 22, { size: 11, weight: 800, color: col });
    label(p.out ? 'RUINÉ' : `${fmtN(p.chips)} 🪙`, pos.x, pos.y + 42, {
      size: 12, weight: 700, color: p.out ? RED : CREAM,
    });

    // Chrono du joueur au trait.
    if (turn && v.phase === 'bet' && !me) {
      const frac = clamp(v.tl / Math.max(1, v.tlMax), 0, 1);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y + 2 + h / 2, w * 0.56, -Math.PI / 2, -Math.PI / 2 + TAU * frac);
      ctx.strokeStyle = v.tl < 4 ? RED : GREEN;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();

    // Badges : bouton, blindes, action, tapis.
    const bx = pos.x + w / 2 - 6;
    if (pid === v.button) {
      ctx.beginPath();
      ctx.arc(bx, pos.y + 4, 11, 0, TAU);
      ctx.fillStyle = CREAM;
      ctx.fill();
      label('D', bx, pos.y + 8, { size: 12, weight: 800, color: '#160B2B' });
    } else if (pid === v.sbPid || pid === v.bbPid) {
      label(pid === v.sbPid ? 'pb' : 'GB', bx, pos.y + 8, { size: 10, weight: 800, color: MAUVE });
    }
    if (p.allin && !p.folded) {
      label('TAPIS', pos.x, pos.y + 74, { size: 12, weight: 800, color: RED, display: true, outline: 3 });
    } else if (p.label && v.phase === 'bet') {
      label(p.label, pos.x, pos.y + 74, { size: 11, weight: 700, color: MAUVE, outline: 3 });
    }

    // Mise posee devant la place (vers le centre du tapis). Pour les places
    // du haut, on pousse la pile plus loin : sinon elle tombe pile sur
    // l etiquette d action affichee sous le panneau.
    if (p.bet > 0) {
      const versLeBas = (L.cy - pos.y) > Math.abs(L.cx - pos.x);
      const t = versLeBas ? 0.56 : 0.38;
      const mx = pos.x + (L.cx - pos.x) * t;
      const my = pos.y + (L.cy - pos.y) * t;
      drawChipStack(ctx, mx, my, 9, p.bet, { maxChips: 6, label: false });
      label(fmtN(p.bet), mx, my + 20, { size: 11, weight: 800, color: GOLD, outline: 3 });
    }

    // Main montree a l'abattage.
    if (v.showdown) {
      const hh = v.showdown.hands.find((x) => x.pid === pid);
      if (hh) {
        const won = v.showdown.wins.some((wn) => wn.pid === pid);
        label(hh.name, pos.x, pos.y - 62, {
          size: 11, weight: 800, color: won ? GOLD : MAUVE, outline: 3,
        });
      }
    }
  }

  // ── Mes cartes, en grand, dans la barre du bas ──
  function drawMyCards(v, x, y) {
    const p = v.players[you];
    if (!p) return;
    const cw = L.myHoleW;
    const winSet = new Set(v.me && v.me.hand ? v.me.hand.cards : []);
    p.hole.forEach((id, i) => {
      blitCard(x + (i - 0.5) * cw * 0.72, y, cw, id, {
        angle: (i - 0.5) * 0.09,
        dim: p.folded ? 0.55 : 0,
        glow: !p.folded && winSet.has(id) ? GOLD : null,
      });
    });
    if (p.folded) {
      label('COUCHÉ', x, y, { size: 17, weight: 800, color: RED, display: true, outline: 4 });
    } else if (v.me && v.me.hand) {
      label(v.me.hand.name, x, y + cw * 0.86, { size: 12, weight: 800, color: GOLD, outline: 3 });
    }
  }

  // ── Barre d'actions ──
  function sendRaise(val, force) {
    const now = performance.now();
    if (!force && now - lastSent < 90) return;
    lastSent = now;
    raiseTo = val;
  }

  function drawBar(v) {
    const top = L.barY;
    const H = L.AH - top - 10;
    panel(20, top, L.AW - 40, H, { fill: 'rgba(10,5,22,.86)', stroke: 'rgba(255,201,60,.22)', r: 16 });

    const p = v.players[you];
    const me = v.me;
    const spec = !p;
    // Bloc de mes cartes.
    const cardsX = L.portrait ? L.AW / 2 : 132;
    const cardsY = L.portrait ? top + 70 : top + 74;
    if (!spec) drawMyCards(v, cardsX, cardsY);

    const ax = L.portrait ? 40 : 250;
    const aw = L.portrait ? L.AW - 80 : L.AW - 290;
    let ay = L.portrait ? top + 150 : top + 14;

    if (spec) {
      label('SPECTATEUR', L.AW / 2, top + H / 2 - 6, { size: 17, weight: 800, color: GOLD, display: true });
      label('Tu vois toutes les cartes. Profites-en.', L.AW / 2, top + H / 2 + 16, { size: 12, weight: 600, color: MAUVE });
      return;
    }

    const mine = v.toAct === you && v.phase === 'bet';
    if (!mine) {
      const who = v.toAct ? (config.players[v.toAct] || {}).name || '' : '';
      const txt = v.phase === 'showdown' ? 'ABATTAGE'
        : v.phase === 'payout' ? 'ON RAMASSE'
          : v.phase === 'deal' ? 'DISTRIBUTION'
            : v.phase === 'flip' ? STREETS[v.street] || 'CARTES COMMUNES'
              : v.phase === 'end' ? 'FIN DE PARTIE'
                : who ? `AU TOUR DE ${who.toUpperCase().slice(0, 14)}` : '';
      label(txt, ax + aw / 2, ay + (L.portrait ? 40 : H / 2 - 6), {
        size: 16, weight: 800, color: GOLD, display: true,
      });
      if (v.phase === 'bet' && who) {
        label(p.folded ? 'Tu es couché sur ce coup.' : 'Prépare ton coup...', ax + aw / 2, ay + (L.portrait ? 62 : H / 2 + 16), {
          size: 12, weight: 600, color: MAUVE,
        });
      }
      if (v.showdown && v.showdown.wins.length) {
        const noms = [...new Set(v.showdown.wins.map((wn) => (config.players[wn.pid] || {}).name))].join(', ');
        label(`${noms} ramasse le pot`, ax + aw / 2, ay + (L.portrait ? 90 : H / 2 + 36), {
          size: 13, weight: 700, color: GREEN,
        });
      }
      return;
    }

    // C'est a moi : montants et boutons.
    const toCall = me.toCall;
    const minTo = me.minRaiseTo;
    const maxTo = me.maxRaiseTo;
    if (raiseTo == null || raiseTo < minTo || raiseTo > maxTo) raiseTo = minTo;
    label(toCall > 0 ? `À SUIVRE : ${fmtN(toCall)}` : 'PERSONNE N\'A MISÉ', ax + aw / 2, ay + 14, {
      size: 13, weight: 800, color: toCall > 0 ? GOLD : GREEN, display: true,
    });
    label(`Ton tapis : ${fmtN(p.chips)}`, ax + aw / 2, ay + 32, { size: 11, weight: 600, color: MAUVE });
    // Mon chrono : une jauge au-dessus des boutons.
    const tf = clamp(v.tl / Math.max(1, v.tlMax), 0, 1);
    roundRectPath(ctx, ax, ay + 38, aw, 5, 3);
    ctx.fillStyle = 'rgba(185,168,208,.22)';
    ctx.fill();
    roundRectPath(ctx, ax, ay + 38, aw * tf, 5, 3);
    ctx.fillStyle = v.tl < 4 ? RED : GREEN;
    ctx.fill();

    const bh = L.portrait ? 54 : 40;
    const gap = 10;
    const bw = (aw - gap * 2) / 3;
    const by = ay + 46;
    button(ax, by, bw, bh, 'SE COUCHER', {
      color: '#E03A4E', size: 14, enabled: !!me.can.fold,
      sub: 'F', fn: () => { send.act('fold'); sfx.play('leave'); },
    });
    if (me.can.check) {
      button(ax + bw + gap, by, bw, bh, 'CHECKER', {
        color: '#2FA95F', size: 14, sub: 'C', fn: () => { send.act('check'); sfx.play('click'); },
      });
    } else {
      button(ax + bw + gap, by, bw, bh, 'SUIVRE', {
        color: '#2FA95F', size: 14, enabled: !!me.can.call,
        sub: `${fmtN(Math.min(toCall, p.chips))} jetons`,
        fn: () => { send.act('call'); sfx.play('coin'); },
      });
    }
    const tapisSeul = maxTo <= minTo;
    button(ax + (bw + gap) * 2, by, bw, bh, tapisSeul ? 'TAPIS' : 'RELANCER', {
      color: GOLD, size: 14, enabled: !!me.can.raise,
      sub: tapisSeul ? `${fmtN(maxTo)}` : `à ${fmtN(raiseTo)}`,
      fn: () => {
        if (tapisSeul) send.act('allin');
        else send.act('raise', { v: raiseTo });
        sfx.play('boost');
      },
    });

    // Reglette de relance + mises rapides.
    if (me.can.raise && !tapisSeul) {
      const sy = by + bh + (L.portrait ? 26 : 22);
      const sx0 = ax + 24, sx1 = ax + aw - 24;
      const frac = clamp((raiseTo - minTo) / Math.max(1, maxTo - minTo), 0, 1);
      roundRectPath(ctx, sx0, sy - 5, sx1 - sx0, 10, 5);
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      ctx.fill();
      roundRectPath(ctx, sx0, sy - 5, (sx1 - sx0) * frac, 10, 5);
      ctx.fillStyle = GOLD;
      ctx.fill();
      const kx = sx0 + (sx1 - sx0) * frac;
      ctx.beginPath();
      ctx.arc(kx, sy, 12, 0, TAU);
      ctx.fillStyle = CREAM;
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,10,38,.65)';
      ctx.lineWidth = 2;
      ctx.stroke();
      zones.push({
        x: sx0 - 16, y: sy - 22, w: sx1 - sx0 + 32, h: 44, slider: true,
        fn: (wx) => {
          const f = clamp((wx - sx0) / (sx1 - sx0), 0, 1);
          sendRaise(Math.round(minTo + f * (maxTo - minTo)), false);
        },
      });
      const qy = sy + (L.portrait ? 12 : 14);
      const qw = (aw - 20) / 3;
      const quick = [
        { t: '1/2 POT', v: v.curBet + Math.max(v.minRaise, Math.round(v.pot / 2)) },
        { t: 'POT', v: v.curBet + Math.max(v.minRaise, v.pot) },
        { t: 'TAPIS', v: maxTo },
      ];
      quick.forEach((q, i) => {
        button(ax + i * (qw + 10), qy, qw, L.portrait ? 30 : 28, q.t, {
          color: '#4B2E70', ink: CREAM, size: 12,
          fn: () => { raiseTo = clamp(q.v, minTo, maxTo); sfx.play('click'); },
        });
      });
    }

    // Coup d'oeil du Requin.
    if (me.canPeek) {
      const cible = v.seats.find((pid) => pid !== you && !v.players[pid].folded && !v.players[pid].out);
      if (cible) {
        const nom = (config.players[cible] || {}).name || '';
        button(ax + aw - 150, ay - 6, 150, 30, '🦈 COUP D\'OEIL', {
          color: '#29D9FF', size: 11, sub: `dans le jeu de ${nom.slice(0, 10)}`,
          fn: () => { send.act('peek', { pid: cible, i: 0 }); sfx.play('mission'); },
        });
      }
    }
    if (me.peeked) {
      const nom = (config.players[me.peeked.pid] || {}).name || '';
      label(`Tu as vu une carte de ${nom}`, ax + aw / 2, L.AH - 18, { size: 11, weight: 700, color: CYAN });
    }
  }

  // ── Position d'une place (pour les effets) ──
  function posOfPid(v, pid) {
    const order = seatOrder(v);
    const k = order.indexOf(pid);
    return k < 0 ? { x: L.cx, y: L.cy } : seatPos(k, order.length);
  }

  function onKey(e) {
    if (!view || !view.me || view.toAct !== you || view.phase !== 'bet') return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const can = view.me.can;
    const k = e.code;
    if (k === 'KeyF') { e.preventDefault(); if (can.fold) send.act('fold'); }
    else if (k === 'KeyC' || k === 'Space') {
      e.preventDefault();
      if (can.check) send.act('check');
      else if (can.call) send.act('call');
    } else if (k === 'KeyR') {
      e.preventDefault();
      if (can.raise) send.act('raise', { v: raiseTo || view.me.minRaiseTo });
    } else if (k === 'KeyA') {
      e.preventDefault();
      if (can.allin) send.act('allin');
    }
  }
  addEventListener('keydown', onKey);

  return {
    onTap(x, y, phase) {
      if (!lastVp) return;
      const w = lastVp.toWorld(x, y);
      if (phase === 'start') {
        for (const z of zones) {
          if (w.x >= z.x && w.x <= z.x + z.w && w.y >= z.y && w.y <= z.y + z.h) {
            if (z.slider) { drag = z; z.fn(w.x); }
            return;
          }
        }
        return;
      }
      if (phase === 'move') { if (drag) drag.fn(w.x); return; }
      if (drag) { drag.fn(w.x); drag = null; return; }
      for (const z of zones) {
        if (w.x >= z.x && w.x <= z.x + z.w && w.y >= z.y && w.y <= z.y + z.h) {
          if (!z.slider) z.fn(w.x);
          return;
        }
      }
    },

    onEvents(evs) {
      const v = view;
      for (const ev of evs) {
        if (ev.e === 'hand') {
          pops.clear();
          raiseTo = null;
          flyChips = [];
          sfx.play('join');
          juice.floater(L.cx, L.cy - 70, `MAIN ${ev.n}`, { color: GOLD, size: 18 });
          if (ev.level > 0) {
            juice.floater(L.cx, L.cy - 46, `BLINDES ${ev.sb} / ${ev.bb}`, { color: MAUVE, size: 13 });
          }
        } else if (ev.e === 'turn') {
          if (ev.pid === you) {
            sfx.play('whistle');
            juice.floater(L.cx, L.cy + 60, 'À TOI !', { color: GREEN, size: 22 });
          }
        } else if (ev.e === 'act') {
          if (!v) continue;
          const pos = posOfPid(v, ev.pid);
          const mine = ev.pid === you;
          if (ev.a === 'fold') {
            juice.floater(pos.x, pos.y - 54, 'COUCHÉ', { color: MAUVE, size: 14 });
            sfx.play('leave');
          } else if (ev.a === 'check') {
            juice.floater(pos.x, pos.y - 54, 'CHECK', { color: CREAM, size: 13 });
            sfx.play('tickup');
          } else if (ev.a === 'call') {
            juice.floater(pos.x, pos.y - 54, `SUIT ${ev.v}`, { color: CYAN, size: 14 });
            sfx.play('coin');
          } else if (ev.a === 'raise') {
            juice.floater(pos.x, pos.y - 58, `RELANCE ${ev.v}`, { color: GOLD, size: 16 });
            sfx.play('boost');
          } else if (ev.a === 'allin') {
            juice.floater(pos.x, pos.y - 60, 'TAPIS !', { color: RED, size: 20 });
            juice.burst(pos.x, pos.y - 30, { n: 18, color: GOLD, speed: 160 });
            juice.shake(mine ? 6 : 3);
            sfx.play('klaxon');
          }
        } else if (ev.e === 'board') {
          const from = ev.street === 1 ? 0 : ev.street === 2 ? 3 : 4;
          for (let i = 0; i < ev.cards.length; i++) pops.set(`b${from + i}`, performance.now());
          sfx.play('carte');
          juice.floater(L.cx, L.cy - 78, STREETS[ev.street] || '', { color: GOLD, size: 15 });
        } else if (ev.e === 'win') {
          if (!v) continue;
          for (const wn of ev.wins) {
            const pos = posOfPid(v, wn.pid);
            juice.floater(pos.x, pos.y - 70, `+${fmtN(wn.amount)}`, { color: GREEN, size: 18 });
            flyChips.push({ x: L.cx, y: L.cy, tx: pos.x, ty: pos.y, t: 0, amount: wn.amount });
          }
          if (ev.wins.some((wn) => wn.pid === you)) {
            juice.confetti(L.cx, L.cy, [GOLD, GREEN, CREAM], 50);
            sfx.play('bank');
          } else sfx.play(ev.showdown ? 'mission' : 'tickup');
        } else if (ev.e === 'bust') {
          if (!v) continue;
          const pos = posOfPid(v, ev.pid);
          juice.floater(pos.x, pos.y - 60, 'RUINÉ !', { color: RED, size: 18 });
          sfx.play('death');
        } else if (ev.e === 'peek') {
          if (!v) continue;
          const pos = posOfPid(v, ev.target);
          juice.floater(pos.x, pos.y - 66, '🦈 LE REQUIN REGARDE...', { color: CYAN, size: 13 });
          sfx.play('steal');
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

      if (!tableCache || tableCache.key !== (L.portrait ? 'p' : 'l')) buildTable();
      ctx.drawImage(tableCache.c, 0, 0, L.AW, L.AH);

      drawBoard(v, now);
      const order = seatOrder(v);
      order.forEach((pid, k) => drawSeat(v, pid, k, order.length, now));

      // Jetons qui glissent vers le vainqueur.
      for (let i = flyChips.length - 1; i >= 0; i--) {
        const f = flyChips[i];
        f.t += dt;
        const k = Math.min(1, f.t / 0.6);
        if (k >= 1) { flyChips.splice(i, 1); continue; }
        const e = 1 - (1 - k) * (1 - k);
        drawChipStack(ctx, f.x + (f.tx - f.x) * e, f.y + (f.ty - f.y) * e, 10, f.amount, {
          maxChips: 6, label: false,
        });
      }

      drawBar(v);
      juice.drawWorld(ctx);
      ctx.restore();

      // Bandeau du haut.
      const hy = L.portrait ? 62 : 22;
      label(`MAIN ${v.hand}/${v.hands} · ${STREETS[v.street] || ''}`, size.w / 2, hy, {
        size: 15, weight: 800, color: MAUVE, display: true,
      });
      label(`blindes ${v.blinds.sb} / ${v.blinds.bb}`, size.w / 2, hy + 18, {
        size: 11, weight: 600, color: 'rgba(185,168,208,.6)',
      });
    },

    destroy() {
      removeEventListener('keydown', onKey);
      zones.length = 0;
      sprites.clear();
      pops.clear();
      flyChips = [];
      tableCache = null;
    },
  };
}
