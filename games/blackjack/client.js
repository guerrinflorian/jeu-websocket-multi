// BLACKJACK : rendu client. Vraie table de casino forain : feutre violet,
// rail de cuir, emplacements de mise, sabot, cartes en volume (tranche,
// retournement de la carte cachee), jetons cylindriques empiles, mise libre
// (jetons + reglette + tapis), barre d'actions contextuelle.
// Deux mises en page : paysage et portrait.

import meta from './meta.js';
import {
  drawCard, drawCardBack, drawChip3D, drawChipStack, chipBreakdown, chipSkin, roundRectPath,
} from '/cardkit.js';

const GOLD = '#FFC93C';
const CREAM = '#F5EFE6';
const MAUVE = '#B9A8D0';
const GREEN = '#3DFF8A';
const RED = '#FF4757';
const FELT = '#2E1A54';
const FELT_DARK = '#1B0F35';

// Deux gabarits : le client choisit selon la forme de l'ecran.
const LAND = {
  AW: 1000, AH: 700, portrait: false,
  dealerY: 128, othersY: 292, mineY: 446, barY: 548,
  cw: 60, myCw: 84, otherCw: 38,
};
const PORT = {
  AW: 620, AH: 1030, portrait: true,
  dealerY: 140, othersY: 330, mineY: 556, barY: 660,
  cw: 58, myCw: 78, otherCw: 34,
};

const fmtN = (n) => String(Math.round(n));

export function createClient({ ctx, helpers, config, you, send }) {
  const { juice, sfx, TAU, clamp } = helpers;
  const isAsym = config.format.kind === 'asym';
  const croupierPid = isAsym ? config.teams[0][0] : null;
  const meCroupier = you === croupierPid;
  const seats = Object.keys(config.players).filter((pid) => pid !== croupierPid);
  const seatIdx = Object.fromEntries(seats.map((pid, i) => [pid, i]));

  const zones = [];            // zones tactiles reconstruites a chaque frame
  const flights = [];          // cartes en vol depuis le sabot
  const pops = new Map();      // cle main : temps d'apparition de la derniere carte
  let flip = 0;                // progression du retournement de la carte cachee
  let lastVp = null;
  let L = LAND;
  let view = null;
  let drag = null;             // reglette de mise en cours de glissement
  let dragBet = null;          // valeur locale pendant le glissement
  let lastSent = 0;
  let tableCache = null;
  const sprites = new Map();

  // ── Sprites de cartes (dessin vectoriel mis en cache, blit rapide) ──
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
    if (id < 0) drawCardBack(g, pad, pad, w, { tint: meta.color, thick: Math.max(1, w * 0.03) });
    else drawCard(g, id, pad, pad, w, { thick: Math.max(1, w * 0.03) });
    sprites.set(key, c);
    if (sprites.size > 160) sprites.delete(sprites.keys().next().value);
    return c;
  }

  // Blit d'une carte centree en (cx, cy). sx < 1 : carte de profil (flip).
  function blitCard(cx, cy, w, id, opts = {}) {
    const spr = cardSprite(id, w);
    const dw = spr.width / 2, dh = spr.height / 2;
    ctx.save();
    ctx.translate(cx, cy);
    if (opts.angle) ctx.rotate(opts.angle);
    if (opts.sx !== undefined) ctx.scale(Math.max(0.02, Math.abs(opts.sx)), 1);
    if (opts.scale) ctx.scale(opts.scale, opts.scale);
    ctx.drawImage(spr, -dw / 2, -dh / 2, dw, dh);
    if (opts.dim) {
      roundRectPath(ctx, -w / 2, -w * 0.7, w, w * 1.4, w * 0.09);
      ctx.fillStyle = `rgba(16,8,32,${opts.dim})`;
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Petites briques d'interface ──
  function panel(x, y, w, h, opts = {}) {
    roundRectPath(ctx, x, y, w, h, opts.r || 12);
    ctx.fillStyle = opts.fill || 'rgba(20,10,38,.72)';
    ctx.fill();
    if (opts.stroke) {
      ctx.strokeStyle = opts.stroke;
      ctx.lineWidth = opts.lw || 1.5;
      ctx.stroke();
    }
  }

  function label(text, x, y, opts = {}) {
    ctx.font = `${opts.weight || 600} ${opts.size || 13}px ${opts.display ? 'Bungee, ' : ''}Rubik, system-ui, sans-serif`;
    ctx.textAlign = opts.align || 'center';
    if (opts.outline) {
      ctx.strokeStyle = 'rgba(16,8,32,.85)';
      ctx.lineWidth = opts.outline;
      ctx.strokeText(text, x, y);
    }
    ctx.fillStyle = opts.color || CREAM;
    ctx.fillText(text, x, y);
    ctx.textAlign = 'left';
  }

  // Bouton en relief : biseau clair en haut, ombre portee en bas.
  function button(x, y, w, h, text, opts = {}) {
    const on = opts.enabled !== false;
    const col = opts.color || meta.color;
    ctx.save();
    if (!on) ctx.globalAlpha = 0.32;
    roundRectPath(ctx, x, y + 4, w, h, 12);
    ctx.fillStyle = 'rgba(8,4,18,.75)';
    ctx.fill();
    roundRectPath(ctx, x, y, w, h, 12);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, opts.flat ? col : lighten(col, 0.22));
    g.addColorStop(1, opts.flat ? col : darken(col, 0.18));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    label(text, x + w / 2, y + h / 2 + (opts.sub ? -2 : 5), {
      size: opts.size || 15, weight: 800, color: opts.ink || '#160B2B', display: true,
    });
    if (opts.sub) {
      label(opts.sub, x + w / 2, y + h - 8, { size: 10, weight: 600, color: opts.ink && opts.ink !== '#160B2B' ? 'rgba(245,239,230,.78)' : 'rgba(22,11,43,.72)' });
    }
    ctx.restore();
    if (on && opts.fn) zones.push({ x, y, w, h, fn: opts.fn });
    return { x, y, w, h };
  }

  function lighten(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 255) + 255 * k);
    const g = Math.min(255, ((n >> 8) & 255) + 255 * k);
    const b = Math.min(255, (n & 255) + 255 * k);
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }
  function darken(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${(((n >> 16) & 255) * (1 - k)) | 0},${(((n >> 8) & 255) * (1 - k)) | 0},${((n & 255) * (1 - k)) | 0})`;
  }

  // ── Geometrie des places ──
  const others = seats.filter((pid) => pid !== you);

  function otherPos(i) {
    const n = Math.max(1, others.length);
    if (L.portrait) {
      const perRow = Math.min(4, n);
      const row = Math.floor(i / perRow);
      const rows = Math.ceil(n / perRow);
      const inRow = Math.min(perRow, n - row * perRow);
      const k = inRow === 1 ? 0.5 : (i % perRow) / (inRow - 1);
      const y = L.othersY + (row - (rows - 1) / 2) * 122;
      return { x: 78 + k * (L.AW - 156), y };
    }
    const k = n === 1 ? 0.5 : i / (n - 1);
    return { x: 82 + k * (L.AW - 164), y: L.othersY - Math.sin(k * Math.PI) * 16 };
  }

  // Texte courbe le long d'un arc (mentions legales de la table).
  function arcText(g, text, cx, cy, r, mid, size, color) {
    g.save();
    g.font = `700 ${size}px Rubik, system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = color;
    const step = (size * 0.62) / Math.max(40, r);
    let a = mid + (text.length - 1) * step / 2;
    for (const ch of text) {
      g.save();
      g.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      g.rotate(a - Math.PI / 2);
      g.fillText(ch, 0, 0);
      g.restore();
      a -= step;
    }
    g.restore();
  }

  // ── Decor de table, mis en cache (feutre, rail, mentions, emplacements) ──
  function buildTable(rules) {
    const S = 2;
    const c = document.createElement('canvas');
    c.width = L.AW * S;
    c.height = L.AH * S;
    const g = c.getContext('2d');
    g.scale(S, S);
    const W = L.AW, H = L.AH;
    const railR = 34;
    const top = 26, bot = L.barY - 14;

    // Rail de cuir.
    roundRectPath(g, 12, top - 14, W - 24, bot - top + 28, railR);
    const rail = g.createLinearGradient(0, top - 14, 0, bot + 14);
    rail.addColorStop(0, '#3A2358');
    rail.addColorStop(0.5, '#22143F');
    rail.addColorStop(1, '#150C29');
    g.fillStyle = rail;
    g.fill();
    g.strokeStyle = 'rgba(255,201,60,.32)';
    g.lineWidth = 2;
    g.stroke();
    // Reflet du rail.
    roundRectPath(g, 18, top - 8, W - 36, bot - top + 16, railR - 6);
    g.strokeStyle = 'rgba(255,255,255,.07)';
    g.lineWidth = 6;
    g.stroke();

    // Feutre.
    roundRectPath(g, 30, top, W - 60, bot - top, railR - 12);
    const felt = g.createRadialGradient(W / 2, top + (bot - top) * 0.34, 30, W / 2, top + (bot - top) * 0.5, W * 0.72);
    felt.addColorStop(0, '#3C2270');
    felt.addColorStop(0.55, FELT);
    felt.addColorStop(1, FELT_DARK);
    g.fillStyle = felt;
    g.fill();
    g.save();
    g.clip();

    // Grain du feutre (points fixes, deterministes).
    g.fillStyle = 'rgba(255,255,255,.028)';
    let seed = 1337;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < 900; i++) g.fillRect(rnd() * W, top + rnd() * (bot - top), 2, 2);

    // Marquages de table : ligne de mise discrete + mention doree.
    const cx = W / 2, cy = L.dealerY - (L.portrait ? 40 : 30);
    const r1 = L.portrait ? 250 : 300;
    g.strokeStyle = "rgba(255,201,60,.12)";
    g.lineWidth = 2;
    g.setLineDash([12, 9]);
    g.beginPath();
    g.arc(cx, cy, r1, 0.34, Math.PI - 0.34);
    g.stroke();
    g.setLineDash([]);
    const rTxt = L.portrait ? 116 : 138;
    g.beginPath();
    g.arc(cx, cy, rTxt + 17, 0.6, Math.PI - 0.6);
    g.strokeStyle = "rgba(255,201,60,.2)";
    g.lineWidth = 1.4;
    g.stroke();
    arcText(g, `LE BLACKJACK PAIE ${rules.bj === "3:2" ? "3 POUR 2" : "6 POUR 5"}`,
      cx, cy, rTxt, Math.PI / 2, L.portrait ? 12 : 13, "rgba(255,201,60,.72)");

    g.restore();
    tableCache = { c, key: tableKey(rules) };
  }

  const tableKey = (rules) => `${L.portrait ? 'p' : 'l'}|${others.length}|${rules.bj}|${rules.s17}`;

  // ── Mains ──
  // Dessine une main de cartes en eventail, centree en (cx, cy).
  function drawHand(cards, cx, cy, cw, opts = {}) {
    const n = cards.length;
    if (!n) return { w: 0 };
    const over = cw * (opts.tight ? 0.42 : 0.52);
    const total = cw + (n - 1) * over;
    const x0 = cx - total / 2 + cw / 2;
    for (let i = 0; i < n; i++) {
      const id = cards[i];
      const x = x0 + i * over;
      const ang = (i - (n - 1) / 2) * (opts.fan == null ? 0.045 : opts.fan);
      const isHole = opts.holeIdx === i;
      let sx = 1, drawId = id;
      if (isHole && flip > 0 && flip < 1) {
        const k = flip;
        sx = Math.abs(Math.cos(k * Math.PI));
        if (k < 0.5) drawId = -1;
      }
      const pop = opts.pop && i === n - 1 ? opts.pop : 0;
      blitCard(x, cy - pop * 8, cw, drawId, {
        angle: ang,
        sx,
        scale: 1 + pop * 0.09,
        dim: opts.dim,
      });
    }
    return { w: total, x0: x0 - cw / 2 };
  }

  // Pastille de total facon casino.
  function totalBadge(x, y, total, opts = {}) {
    if (total == null) return;
    const w = 38, h = 24;
    roundRectPath(ctx, x - w / 2, y - h / 2, w, h, 12);
    ctx.fillStyle = opts.bust ? RED : opts.bj ? GOLD : 'rgba(12,6,26,.9)';
    ctx.fill();
    ctx.strokeStyle = opts.bust || opts.bj ? 'rgba(255,255,255,.5)' : 'rgba(185,168,208,.5)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    label(opts.soft && !opts.bust ? `${total}` : String(total), x, y + 5, {
      size: 14, weight: 800, color: opts.bust || opts.bj ? '#160B2B' : CREAM,
    });
  }

  const popOf = (key, now) => {
    const t = pops.get(key);
    return t ? clamp(1 - (now - t) / 240, 0, 1) : 0;
  };

  // ── Sabot : boitier en volume + jauge de cartes restantes ──
  function drawShoe(x, y, w) {
    const h = w * 0.62, d = w * 0.3;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + d, y - d * 0.6);
    ctx.lineTo(x + w + d, y - d * 0.6);
    ctx.lineTo(x + w, y);
    ctx.closePath();
    ctx.fillStyle = '#3A2358';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w + d, y - d * 0.6);
    ctx.lineTo(x + w + d, y + h - d * 0.6);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fillStyle = '#251543';
    ctx.fill();
    roundRectPath(ctx, x, y, w, h, 6);
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#4B2E70');
    g.addColorStop(1, '#1B0F35');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,201,60,.4)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    const frac = view ? clamp(view.shoe / Math.max(1, view.shoeTotal), 0, 1) : 1;
    const inner = w - 10;
    ctx.fillStyle = 'rgba(247,243,234,.85)';
    ctx.fillRect(x + 5, y + 6, inner * frac, h - 12);
    ctx.strokeStyle = 'rgba(20,10,38,.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < Math.round(inner * frac / 4); i++) {
      ctx.beginPath();
      ctx.moveTo(x + 5 + i * 4, y + 6);
      ctx.lineTo(x + 5 + i * 4, y + h - 6);
      ctx.stroke();
    }
    ctx.fillStyle = '#FF3D8A';
    ctx.fillRect(x + 5 + inner * frac, y + 4, 3, h - 8);
    ctx.restore();
  }

  // ── Zone de la banque ──
  function drawDealer(v, now) {
    const cx = L.AW / 2, cy = L.dealerY;
    const dInfo = croupierPid ? (config.players[croupierPid] || {}) : {};
    const name = croupierPid ? (dInfo.name || 'Croupier') : 'Gaston, croupier maison';
    const color = croupierPid ? (dInfo.color || MAUVE) : MAUVE;
    label(`🎩 ${name}`, cx, cy - L.cw * 0.86, { size: 13, weight: 800, color, outline: 3 });

    const hidden = v.dealer.cards.length > 1 && (v.dealer.cards[1] < 0 || (flip > 0 && flip < 1));
    const hand = drawHand(v.dealer.cards, cx, cy, L.cw, {
      holeIdx: hidden ? 1 : -1,
      pop: popOf('D', now),
    });
    if (v.dealer.total != null) {
      totalBadge(cx + hand.w / 2 + 26, cy - L.cw * 0.34, v.dealer.total, {
        bust: v.dealer.total > 21,
        bj: !!v.dealer.bj,
      });
    }
    if (v.bank != null) {
      // Caisse de la banque : en haut a gauche du feutre, loin des cartes.
      panel(46, 44, 158, 38, { fill: "rgba(12,6,26,.7)", stroke: "rgba(255,201,60,.35)", r: 12 });
      label("CAISSE", 60, 62, { size: 10, weight: 800, color: MAUVE, align: "left" });
      label(`${fmtN(v.bank)} 🪙`, 60, 76, { size: 14, weight: 800, color: GOLD, align: "left" });
    }
    drawShoe(L.AW - (L.portrait ? 96 : 136), 44, L.portrait ? 62 : 78);
  }

  // ── Places des autres joueurs ──
  const shortName = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

  function drawOthers(v, now) {
    others.forEach((pid, i) => {
      const p = v.players[pid];
      if (!p) return;
      const pos = otherPos(i);
      const info = config.players[pid] || {};
      const col = info.color || '#888';
      const active = v.phase === 'act' && !p.done;
      const w = L.portrait ? 134 : Math.min(152, (L.AW - 100) / Math.max(1, others.length));
      panel(pos.x - w / 2, pos.y - 42, w, 114, {
        fill: 'rgba(12,6,26,.6)',
        stroke: active ? 'rgba(61,255,138,.55)' : 'rgba(185,168,208,.16)',
        lw: active ? 2 : 1.2,
        r: 14,
      });
      label(shortName(info.name || '', 13), pos.x, pos.y - 27, { size: 11, weight: 800, color: col });

      if (v.phase === 'bet') {
        drawChipStack(ctx, pos.x - w / 2 + 26, pos.y + 26, 10, p.bet, { maxChips: 7, label: false });
        label(`${fmtN(p.bet)}`, pos.x - w / 2 + 26, pos.y + 46, { size: 12, weight: 800, color: GOLD });
        label(p.ok ? '✔ PRÊT' : 'mise…', pos.x + w / 2 - 32, pos.y + 8, {
          size: 11, weight: 800, color: p.ok ? GREEN : MAUVE,
        });
      } else {
        const hands = p.hands;
        const hw = hands.length ? w / hands.length : w;
        hands.forEach((h, hi) => {
          const hx = pos.x - w / 2 + hw * (hi + 0.5);
          const isAct = v.phase === 'act' && hi === p.active && !p.done;
          drawHand(h.cards, hx, pos.y + 5, L.otherCw, {
            tight: true, fan: 0.03, dim: h.bust || h.surr ? 0.45 : 0,
          });
          if (h.cards.length) {
            label(h.bust ? 'SAUTÉ' : h.surr ? 'ABANDON' : String(h.total), hx, pos.y + 46, {
              size: 11, weight: 800,
              color: h.bust ? RED : h.surr ? MAUVE : h.bj ? GOLD : CREAM,
              outline: 3,
            });
          }
          if (isAct) {
            ctx.beginPath();
            ctx.arc(hx, pos.y + 54 + Math.sin(now / 220) * 1.5, 2.5, 0, TAU);
            ctx.fillStyle = GREEN;
            ctx.fill();
          }
        });
      }
      label(`${fmtN(p.chips)} 🪙`, pos.x, pos.y + 63, { size: 11, weight: 600, color: MAUVE });
      if (p.ins > 0) {
        label(p.even ? 'COMPTANT' : `ASSURÉ ${fmtN(p.ins)}`, pos.x, pos.y - 46, {
          size: 10, weight: 700, color: '#29D9FF', outline: 3,
        });
      }
      if (v.phase === 'payout' && p.delta !== 0) {
        label(`${p.delta > 0 ? '+' : ''}${fmtN(p.delta)}`, pos.x, pos.y - 48, {
          size: 15, weight: 800, color: p.delta > 0 ? GREEN : RED, outline: 3,
        });
      }
    });
  }

  // ── Mes mains, en grand ──
  function drawMyHands(v, now) {
    const me = v.players[you];
    if (!me) return;
    const hands = me.hands;
    if (!hands.length) return;
    const n = hands.length;
    const cw = n >= 3 ? L.myCw * 0.66 : n === 2 ? L.myCw * 0.84 : L.myCw;
    const slot = (L.AW - 40) / n;
    hands.forEach((h, hi) => {
      const hx = 20 + slot * (hi + 0.5);
      const hy = L.mineY;
      const isAct = v.phase === 'act' && hi === me.active && !me.done && !h.done;
      if (n > 1 || isAct) {
        const bw = Math.min(slot - 10, Math.max(cw * 2.3, 140));
        const bh = cw * 2.05;
        roundRectPath(ctx, hx - bw / 2, hy - bh * 0.56, bw, bh, 14);
        ctx.fillStyle = isAct ? 'rgba(61,255,138,.08)' : 'rgba(12,6,26,.3)';
        ctx.fill();
        ctx.strokeStyle = isAct ? GREEN : 'rgba(185,168,208,.2)';
        ctx.lineWidth = isAct ? 2.4 : 1.2;
        ctx.stroke();
        if (n > 1) {
          label(`MAIN ${hi + 1}/${n}`, hx, hy - bh * 0.56 + 16, {
            size: 10, weight: 800, color: isAct ? GREEN : MAUVE,
          });
        }
      }
      drawHand(h.cards, hx, hy, cw, {
        pop: popOf(`${you}|${hi}`, now),
        dim: h.bust || h.surr ? 0.5 : 0,
      });
      totalBadge(hx + cw * 1.02, hy - cw * 0.42, h.total, { bust: !!h.bust, bj: !!h.bj });
      drawChipStack(ctx, hx - cw * 0.94, hy + cw * 0.5, 11, h.bet, { maxChips: 8 });
      label(`${fmtN(h.bet)}${h.dbl ? ' ×2' : ''}`, hx - cw * 0.94, hy + cw * 0.78, {
        size: 12, weight: 800, color: h.dbl ? GOLD : CREAM, outline: 3,
      });
      if (h.bust) label('SAUTÉ', hx, hy + cw * 0.24, { size: 17, weight: 800, color: RED, outline: 4, display: true });
      else if (h.surr) label('ABANDON', hx, hy + cw * 0.24, { size: 13, weight: 800, color: MAUVE, outline: 4 });
      if (v.phase === 'payout' && h.res) {
        const txt = h.res === 'bj' ? 'BLACKJACK !' : h.res === 'win' ? 'GAGNÉ' : h.res === 'push' ? 'ÉGALITÉ'
          : h.res === 'surr' ? 'ABANDON' : h.res === 'bust' ? 'SAUTÉ' : 'PERDU';
        const col = h.res === 'bj' ? GOLD : h.res === 'win' ? GREEN : h.res === 'push' ? MAUVE : RED;
        label(txt, hx, hy - cw * 1.12, { size: 15, weight: 800, color: col, outline: 4, display: true });
        if (h.delta) {
          label(`${h.delta > 0 ? '+' : ''}${fmtN(h.delta)} 🪙`, hx, hy - cw * 1.12 + 19, {
            size: 13, weight: 800, color: col, outline: 3,
          });
        }
      }
    });
  }

  // ── Barre de mise : jetons, reglette, raccourcis, tapis ──
  function sendBet(v, force) {
    const now = performance.now();
    if (!force && now - lastSent < 90) return;
    lastSent = now;
    send.act('betSet', { v: Math.round(v) });
  }

  function drawBetBar(v, me) {
    const top = L.barY;
    const H = L.AH - top - 10;
    const bet = dragBet != null ? dragBet : me.bet;
    const locked = !!me.ok;
    panel(20, top, L.AW - 40, H, { fill: 'rgba(10,5,22,.85)', stroke: 'rgba(255,201,60,.22)', r: 16 });

    // Entete : titre, montant, tapis restant.
    label(locked ? 'MISE VERROUILLÉE' : 'FAIS TA MISE', 42, top + 26, {
      size: 12, weight: 800, color: locked ? GREEN : GOLD, align: 'left', display: true,
    });
    label(`TAPIS : ${fmtN(me.chips)} 🪙`, L.AW - 42, top + 26, {
      size: 12, weight: 800, color: MAUVE, align: 'right',
    });
    const amtX = L.portrait ? L.AW / 2 : L.AW / 2 - 46;
    label(fmtN(bet), amtX, top + (L.portrait ? 66 : 36), {
      size: L.portrait ? 34 : 28, weight: 800, color: CREAM, display: true,
    });
    label('jetons misés', amtX, top + (L.portrait ? 86 : 54), { size: 10, weight: 600, color: MAUVE });
    drawChipStack(ctx, L.portrait ? L.AW / 2 : amtX + 116, top + (L.portrait ? 124 : 48),
      L.portrait ? 15 : 13, bet, { maxChips: 10 });

    // Jetons a poser.
    const vals = v.chipVals;
    const cr = L.portrait ? 25 : 21;
    const gap = cr * 2.7;
    const chipY = top + (L.portrait ? 176 : 82);
    const cx0 = (L.portrait ? L.AW / 2 : L.AW / 2 + 90) - ((vals.length - 1) * gap) / 2;
    vals.forEach((val, i) => {
      const x = cx0 + i * gap;
      const afford = !locked && bet + val <= me.chips;
      ctx.save();
      if (!afford) ctx.globalAlpha = 0.28;
      drawChip3D(ctx, x, chipY, cr, val, { squash: 0.44 });
      ctx.restore();
      if (afford) {
        zones.push({
          x: x - cr - 3, y: chipY - cr - 8, w: cr * 2 + 6, h: cr * 2 + 16,
          fn: () => {
            const base = dragBet != null ? dragBet : me.bet;
            dragBet = Math.min(me.chips, base + val);
            sendBet(dragBet, true);
            sfx.play('coin');
          },
        });
      }
    });

    // Reglette : absolument n'importe quel montant.
    const sy = top + (L.portrait ? 224 : 122);
    const sx0 = L.portrait ? 78 : 44;
    const sx1 = L.portrait ? L.AW - 78 : L.AW - 268;
    const frac = clamp((bet - 1) / Math.max(1, me.chips - 1), 0, 1);
    roundRectPath(ctx, sx0, sy - 5, sx1 - sx0, 10, 5);
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.fill();
    roundRectPath(ctx, sx0, sy - 5, (sx1 - sx0) * frac, 10, 5);
    ctx.fillStyle = locked ? 'rgba(61,255,138,.45)' : GOLD;
    ctx.fill();
    const kx = sx0 + (sx1 - sx0) * frac;
    ctx.beginPath();
    ctx.arc(kx, sy, locked ? 8 : 12, 0, TAU);
    ctx.fillStyle = locked ? 'rgba(185,168,208,.6)' : CREAM;
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,10,38,.65)';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (!locked) {
      zones.push({
        x: sx0 - 16, y: sy - 22, w: sx1 - sx0 + 32, h: 44, slider: true,
        fn: (wx) => {
          const f = clamp((wx - sx0) / (sx1 - sx0), 0, 1);
          dragBet = Math.max(1, Math.round(1 + f * (me.chips - 1)));
          sendBet(dragBet);
        },
      });
    }
    label('1', sx0 - 10, sy + 4, { size: 10, weight: 700, color: MAUVE, align: 'right' });
    label('TAPIS', sx1 + 10, sy + 4, { size: 10, weight: 700, color: MAUVE, align: 'left' });

    // Raccourcis de mise.
    const quick = [
      { t: 'MIN', fn: () => send.act('betClear') },
      { t: '×2', fn: () => send.act('betDouble') },
      { t: 'RELANCE', fn: () => send.act('betRepeat') },
      { t: 'TAPIS', fn: () => send.act('betMax') },
    ];
    const qw = L.portrait ? (L.AW - 110) / 4 : 78;
    const qh = L.portrait ? 40 : 34;
    const qy = top + (L.portrait ? 254 : 64);
    quick.forEach((q, i) => {
      const x = L.portrait ? 46 + i * (qw + 8) : 34 + i * (qw + 8);
      button(x, qy, qw, qh, q.t, {
        color: '#4B2E70', ink: CREAM, size: 12, enabled: !locked,
        fn: () => { dragBet = null; q.fn(); sfx.play('click'); },
      });
    });

    // Validation.
    const okW = L.portrait ? L.AW - 92 : 168;
    const okX = L.portrait ? 46 : L.AW - okW - 32;
    const okY = top + (L.portrait ? 304 : 58);
    button(okX, okY, okW, L.portrait ? 46 : 72, locked ? '✔ PRÊT' : 'PRÊT', {
      color: locked ? '#2FA95F' : meta.color,
      sub: locked ? 'touche pour corriger' : 'valide ta mise',
      size: 16,
      fn: () => { dragBet = null; send.act(locked ? 'betEdit' : 'betOk'); sfx.play(locked ? 'click' : 'ready'); },
    });
  }

  // ── Barre d'actions ──
  function drawActBar(v, me) {
    const top = L.barY;
    const H = L.AH - top - 10;
    panel(20, top, L.AW - 40, H, { fill: 'rgba(10,5,22,.82)', stroke: 'rgba(177,75,255,.28)', r: 16 });
    const can = me.can;
    const h = me.hands[me.active];
    const waiting = me.done || !h;
    if (waiting) {
      label('Tes mains sont jouées. On attend les autres flambeurs…', L.AW / 2, top + H / 2 + 5, {
        size: 14, weight: 600, color: MAUVE,
      });
      return;
    }
    label(`TA MAIN : ${h.total}${h.soft ? ' (souple)' : ''}`, L.AW / 2, top + 22, {
      size: 13, weight: 800, color: GOLD, display: true,
    });

    const acts = [
      { t: 'TIRER', a: 'hit', on: can.hit, col: '#2FA95F', key: 'ESPACE' },
      { t: 'RESTER', a: 'stand', on: can.stand, col: '#E03A4E', key: 'R' },
      { t: 'DOUBLER', a: 'double', on: can.dbl, col: GOLD, key: 'D', sub2: `+${fmtN(h.bet)}` },
      { t: 'SPLIT', a: 'split', on: can.split, col: '#29D9FF', key: 'P' },
      { t: 'ABANDON', a: 'surrender', on: can.surr, col: '#6B4E9E', key: 'A' },
    ].filter((x) => x.a !== 'surrender' || v.rules.surr);

    const cols = L.portrait ? 2 : acts.length;
    const rows = Math.ceil(acts.length / cols);
    const gapX = 10, gapY = 10;
    const bw = (L.AW - 60 - gapX * (cols - 1)) / cols;
    const bh = Math.min(L.portrait ? 72 : 54, (H - 44 - gapY * (rows - 1)) / rows);
    const blockH = rows * bh + (rows - 1) * gapY;
    const y0 = top + 36 + Math.max(0, (H - 44 - blockH) / 2);
    acts.forEach((act, i) => {
      const cx = 30 + (i % cols) * (bw + gapX);
      const cy = y0 + Math.floor(i / cols) * (bh + gapY);
      button(cx, cy, bw, bh, act.t, {
        color: act.col,
        ink: act.col === '#6B4E9E' ? CREAM : '#160B2B',
        size: L.portrait ? 15 : 14,
        enabled: !!act.on,
        sub: act.sub2 || act.key,
        fn: () => { send.act(act.a); sfx.play(act.a === 'hit' ? 'click' : 'ready'); },
      });
    });
  }

  // ── Barre d'assurance ──
  function drawInsBar(v, me) {
    const top = L.barY;
    const H = L.AH - top - 10;
    panel(20, top, L.AW - 40, H, { fill: 'rgba(10,5,22,.86)', stroke: 'rgba(41,217,255,.45)', r: 16 });
    const h0 = me.hands[0];
    const cost = h0 ? Math.ceil(h0.bet / 2) : 0;
    const even = h0 && h0.bj;
    label('LA BANQUE MONTRE UN AS', L.AW / 2, top + 26, {
      size: 15, weight: 800, color: '#29D9FF', display: true,
    });
    label(even
      ? 'Tu as un blackjack : prends l\'argent comptant pour être payé à coup sûr.'
      : `L'assurance coûte la moitié de ta mise et paie 2 pour 1 si la banque a blackjack.`,
    L.AW / 2, top + 46, { size: 11, weight: 600, color: MAUVE });

    const bw = L.portrait ? L.AW - 92 : 230;
    const bh = L.portrait ? 60 : 50;
    const gap = 12;
    const blockH = L.portrait ? bh * 2 + gap : bh;
    const y = top + 66 + Math.max(0, (H - 76 - blockH) / 2) + (L.portrait ? bh + gap : 0);
    if (me.ins > 0) {
      label(even ? '✔ ARGENT COMPTANT PRIS' : `✔ ASSURÉ POUR ${fmtN(me.ins)} JETONS`, L.AW / 2, y + 30, {
        size: 15, weight: 800, color: GREEN, display: true,
      });
      return;
    }
    if (insDeclined) {
      label('Tu passes ton tour. Croisons les doigts.', L.AW / 2, y + 30, { size: 13, weight: 600, color: MAUVE });
      return;
    }
    const x1 = L.portrait ? 46 : L.AW / 2 - bw - 8;
    const x2 = L.portrait ? 46 : L.AW / 2 + 8;
    button(x1, L.portrait ? y - bh - gap : y, bw, bh, even ? 'ARGENT COMPTANT' : `ASSURANCE (${fmtN(cost)})`, {
      color: '#29D9FF', size: 14, enabled: !!me.can.ins,
      sub: even ? 'payé 1 pour 1, garanti' : 'paie 2 pour 1',
      fn: () => { send.act('insure'); sfx.play('bank'); },
    });
    button(x2, y, bw, bh, 'NON MERCI', {
      color: '#4B2E70', ink: CREAM, size: 14,
      sub: 'on tente le coup',
      fn: () => { insDeclined = true; sfx.play('click'); },
    });
  }

  // ── Barre du Croupier (format asymetrique) ──
  function drawCroupierBar(v) {
    const top = L.barY;
    const H = L.AH - top - 10;
    panel(20, top, L.AW - 40, H, { fill: 'rgba(10,5,22,.82)', stroke: 'rgba(255,201,60,.3)', r: 16 });
    const t = v.dealer.total;
    if (v.phase !== 'dealer') {
      label('TU ES LA BANQUE', L.AW / 2, top + 30, { size: 17, weight: 800, color: GOLD, display: true });
      label(v.phase === 'bet' ? 'Les flambeurs font leurs mises…' : 'Ils réfléchissent. Savoure.',
        L.AW / 2, top + 54, { size: 13, weight: 600, color: MAUVE });
      return;
    }
    label(`TON TOTAL : ${t}`, L.AW / 2, top + 26, { size: 15, weight: 800, color: GOLD, display: true });
    label('Tu peux rester dès 14. Sinon, la maison tire jusqu\'à 17.', L.AW / 2, top + 46, {
      size: 11, weight: 600, color: MAUVE,
    });
    const bw = L.portrait ? (L.AW - 100) / 2 : 200;
    const bh = L.portrait ? 62 : 50;
    const y = top + 66 + Math.max(0, (H - 76 - bh) / 2);
    button(L.AW / 2 - bw - 8, y, bw, bh, 'TIRER', {
      color: '#2FA95F', size: 15, enabled: t < 21, sub: 'ESPACE',
      fn: () => { send.act('hit'); sfx.play('click'); },
    });
    button(L.AW / 2 + 8, y, bw, bh, 'RESTER', {
      color: '#E03A4E', size: 15, enabled: t >= 14, sub: t < 14 ? 'obligé sous 14' : 'R',
      fn: () => { send.act('stand'); sfx.play('ready'); },
    });
  }

  // ── Barre d'etat (distribution, peek, banque, paiements) ──
  function drawStatusBar(v, me) {
    const top = L.barY;
    const H = L.AH - top - 10;
    panel(20, top, L.AW - 40, H, { fill: 'rgba(10,5,22,.72)', stroke: 'rgba(185,168,208,.18)', r: 16 });
    let title = '', sub = '';
    if (v.phase === 'deal') { title = 'DISTRIBUTION'; sub = 'Le croupier sert la table…'; }
    else if (v.phase === 'peek') { title = 'LE CROUPIER VÉRIFIE SA CARTE'; sub = 'Silence dans la salle.'; }
    else if (v.phase === 'dealer') { title = 'LA BANQUE JOUE'; sub = v.rules.s17 ? 'Elle tire jusqu\'à 17.' : 'Elle tire le 17 souple.'; }
    else if (v.phase === 'payout') {
      const d = me ? me.delta : 0;
      title = d > 0 ? `TU EMPOCHES ${fmtN(d)} JETONS` : d < 0 ? `TU LAISSES ${fmtN(-d)} JETONS` : 'ON REMBALLE, ÉGALITÉ';
      sub = v.dealer.bj ? 'Blackjack de la banque.' : 'Main suivante dans un instant…';
    } else if (v.phase === 'end') { title = 'FIN DE PARTIE'; sub = 'Comptons les jetons.'; }
    else if (!me) { title = 'SPECTATEUR'; sub = 'Tu vois toutes les mains. Profite du spectacle.'; }
    label(title, L.AW / 2, top + H / 2 - 2, { size: 17, weight: 800, color: GOLD, display: true });
    label(sub, L.AW / 2, top + H / 2 + 20, { size: 12, weight: 600, color: MAUVE });
  }

  // ── Cartes en vol depuis le sabot ──
  function targetOf(to, hi) {
    if (to === 'D') return { x: L.AW / 2, y: L.dealerY };
    if (to === you && !meCroupier) {
      const me = view && view.players[you];
      const n = me && me.hands.length ? me.hands.length : 1;
      const slot = (L.AW - 40) / n;
      return { x: 20 + slot * ((hi || 0) + 0.5), y: L.mineY };
    }
    const i = others.indexOf(to);
    return i < 0 ? { x: L.AW / 2, y: L.othersY } : otherPos(i);
  }

  function drawFlights(dt) {
    const sx = L.AW - (L.portrait ? 96 : 136) + 20;
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i];
      f.t += dt;
      const k = f.t / f.dur;
      if (k >= 1) { flights.splice(i, 1); continue; }
      const e = 1 - (1 - k) * (1 - k);
      const tg = targetOf(f.to, f.h);
      blitCard(sx + (tg.x - sx) * e, 60 + (tg.y - 60) * e, L.cw * 0.9, -1, {
        angle: (1 - e) * 1.1,
        scale: 0.9 + e * 0.1,
      });
    }
  }

  // ── Bandeau du haut (main en cours, chrono, regles de la maison) ──
  function drawHud(v) {
    const s = helpers.size();
    const hy = L.portrait ? 62 : 22;
    ctx.textAlign = 'center';
    label(`MAIN ${v.hand}/${v.hands}`, s.w / 2, hy, { size: 15, weight: 800, color: MAUVE, display: true });
    const showTimer = ['bet', 'ins', 'act', 'dealer'].includes(v.phase);
    if (showTimer) {
      const frac = clamp(v.tl / Math.max(1, v.tlMax), 0, 1);
      const bw = Math.min(260, s.w * 0.5);
      roundRectPath(ctx, s.w / 2 - bw / 2, hy + 8, bw, 6, 3);
      ctx.fillStyle = 'rgba(185,168,208,.22)';
      ctx.fill();
      roundRectPath(ctx, s.w / 2 - bw / 2, hy + 8, bw * frac, 6, 3);
      ctx.fillStyle = v.tl < 4 ? RED : v.tl < 8 ? GOLD : GREEN;
      ctx.fill();
      if (v.tl <= 5.5 && v.phase !== 'dealer') {
        label(String(Math.ceil(v.tl)), s.w / 2, hy + 34, { size: 16, weight: 800, color: v.tl < 4 ? RED : GOLD, display: true });
      }
    }
    label(`Sabot ${v.rules.decks} jeu${v.rules.decks > 1 ? 'x' : ''} · BJ ${v.rules.bj} · ${v.rules.s17 ? 'S17' : 'H17'}${v.rules.surr ? ' · abandon' : ''}`,
      s.w / 2, s.h - 6, { size: 10, weight: 600, color: 'rgba(185,168,208,.55)' });
  }

  // ── Etat local d'interface + raccourcis clavier ──
  let insDeclined = false;

  const KEYS = {
    Space: 'hit', Enter: 'hit', KeyT: 'hit', KeyH: 'hit',
    KeyR: 'stand', KeyS: 'stand',
    KeyD: 'double', KeyP: 'split', KeyA: 'surrender', KeyI: 'insure',
  };

  function onKey(e) {
    if (e.repeat || !view) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const me = view.players[you];
    if (meCroupier) {
      if (view.phase !== 'dealer') return;
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyT') { e.preventDefault(); send.act('hit'); }
      else if (e.code === 'KeyR' || e.code === 'KeyS') { e.preventDefault(); send.act('stand'); }
      return;
    }
    if (!me) return;
    if (view.phase === 'bet') {
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); dragBet = null; send.act(me.ok ? 'betEdit' : 'betOk'); sfx.play('ready'); }
      else if (e.code === 'ArrowUp') { e.preventDefault(); sendBet(Math.min(me.chips, me.bet + 5), true); }
      else if (e.code === 'ArrowDown') { e.preventDefault(); sendBet(Math.max(1, me.bet - 5), true); }
      else if (e.code === 'KeyM') { e.preventDefault(); send.act('betMax'); }
      return;
    }
    if (view.phase === 'ins') {
      if (e.code === 'KeyI' || e.code === 'Space') { e.preventDefault(); send.act('insure'); }
      return;
    }
    if (view.phase !== 'act') return;
    const a = KEYS[e.code];
    if (!a || a === 'insure') return;
    e.preventDefault();
    send.act(a);
    sfx.play(a === 'hit' ? 'click' : 'ready');
  }
  addEventListener('keydown', onKey);

  return {
    onTap(x, y, phase) {
      if (!lastVp) return;
      const w = lastVp.toWorld(x, y);
      if (phase === 'start') {
        for (const z of zones) {
          if (w.x >= z.x && w.x <= z.x + z.w && w.y >= z.y && w.y <= z.y + z.h) {
            if (z.slider) { drag = z; z.fn(w.x); return; }
            return; // les boutons agissent au relachement
          }
        }
        return;
      }
      if (phase === 'move') {
        if (drag) drag.fn(w.x);
        return;
      }
      // phase 'end'
      if (drag) {
        drag.fn(w.x);
        if (dragBet != null) sendBet(dragBet, true);
        drag = null;
        return;
      }
      for (const z of zones) {
        if (w.x >= z.x && w.x <= z.x + z.w && w.y >= z.y && w.y <= z.y + z.h) {
          if (!z.slider) z.fn(w.x);
          return;
        }
      }
    },

    onEvents(evs) {
      for (const ev of evs) {
        if (ev.e === 'card') {
          const key = ev.to === 'D' ? 'D' : `${ev.to}|${ev.h || 0}`;
          pops.set(key, performance.now());
          flights.push({ to: ev.to, h: ev.h || 0, t: 0, dur: 0.3 });
          sfx.play('carte');
        } else if (ev.e === 'hand') {
          flights.length = 0;
          pops.clear();
          flip = 0;
          insDeclined = false;
          dragBet = null;
          sfx.play('join');
        } else if (ev.e === 'betok' && ev.pid === you) {
          juice.floater(L.AW / 2, L.barY - 20, `MISE : ${ev.v}`, { color: GOLD, size: 16 });
        } else if (ev.e === 'reveal') {
          flip = 0.001;
          sfx.play('whistle');
        } else if (ev.e === 'insopen') {
          sfx.play('klaxon');
          juice.floater(L.AW / 2, L.dealerY + 70, 'UN AS ! ASSURANCE ?', { color: '#29D9FF', size: 18 });
        } else if (ev.e === 'dealerbj') {
          juice.shake(7);
          juice.flash('#FF4757', 0.2);
          juice.floater(L.AW / 2, L.dealerY + 60, 'BLACKJACK DE LA BANQUE', { color: RED, size: 20 });
          sfx.play('death');
        } else if (ev.e === 'bj') {
          const t = targetOf(ev.pid, 0);
          juice.floater(t.x, t.y - 70, 'BLACKJACK !', { color: GOLD, size: ev.pid === you ? 26 : 16 });
          juice.confetti(t.x, t.y - 40, [GOLD, CREAM, '#B14BFF'], ev.pid === you ? 60 : 24);
          sfx.play(ev.pid === you ? 'win' : 'mission');
        } else if (ev.e === 'bust') {
          const t = targetOf(ev.pid, ev.h);
          juice.floater(t.x, t.y - 60, 'SAUTÉ !', { color: RED, size: ev.pid === you ? 24 : 15 });
          juice.burst(t.x, t.y - 20, { n: 16, color: RED, speed: 150 });
          if (ev.pid === you) juice.shake(6);
          sfx.play('death');
        } else if (ev.e === 'double') {
          const t = targetOf(ev.pid, ev.h);
          juice.floater(t.x, t.y - 70, `TAPIS ×2 (${ev.bet})`, { color: GOLD, size: 17 });
          sfx.play('boost');
        } else if (ev.e === 'split') {
          const t = targetOf(ev.pid, ev.h);
          juice.floater(t.x, t.y - 80, `SPLIT ! ${ev.n} MAINS`, { color: '#29D9FF', size: 18 });
          sfx.play('mission');
        } else if (ev.e === 'surrender') {
          const t = targetOf(ev.pid, ev.h);
          juice.floater(t.x, t.y - 60, 'ABANDON', { color: MAUVE, size: 15 });
          sfx.play('steal');
        } else if (ev.e === 'ins') {
          const t = targetOf(ev.pid, 0);
          juice.floater(t.x, t.y - 80, ev.even ? 'ARGENT COMPTANT' : 'ASSURÉ', { color: '#29D9FF', size: 15 });
          sfx.play('bank');
        } else if (ev.e === 'result' && ev.pid === you) {
          sfx.play(ev.d > 0 ? 'bank' : ev.d < 0 ? 'steal' : 'tickup');
          if (ev.d > 0) juice.confetti(L.AW / 2, L.mineY - 40, [GOLD, GREEN, CREAM], 30);
        } else if (ev.e === 'loan' && ev.pid === you) {
          juice.floater(L.AW / 2, L.barY - 30, `LE FORAIN TE PRÊTE ${ev.n} 🪙`, { color: GOLD, size: 16 });
          sfx.play('coin');
        } else if (ev.e === 'shuffle') {
          juice.floater(L.AW - 140, 96, 'NOUVEAU SABOT', { color: MAUVE, size: 13 });
          sfx.play('melange');
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

      if (!tableCache || tableCache.key !== tableKey(v.rules)) buildTable(v.rules);
      ctx.drawImage(tableCache.c, 0, 0, L.AW, L.AH);

      if (flip > 0 && flip < 1) {
        flip += dt / 0.5;
        if (flip >= 1) flip = 0;
      }

      drawDealer(v, now);
      drawOthers(v, now);
      const me = v.players[you];
      if (me && dragBet != null && (me.bet === dragBet || v.phase !== 'bet')) dragBet = null;
      if (me && !meCroupier) drawMyHands(v, now);
      drawFlights(dt);

      if (meCroupier) drawCroupierBar(v);
      else if (me && v.phase === 'bet') drawBetBar(v, me);
      else if (me && v.phase === 'ins' && me.hands.length) drawInsBar(v, me);
      else if (me && v.phase === 'act') drawActBar(v, me);
      else drawStatusBar(v, me);

      juice.drawWorld(ctx);
      ctx.restore();
      drawHud(v);
    },

    destroy() {
      removeEventListener('keydown', onKey);
      zones.length = 0;
      flights.length = 0;
      sprites.clear();
      pops.clear();
      tableCache = null;
    },
  };
}
