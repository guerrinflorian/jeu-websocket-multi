// Kit de rendu Canvas : cartes à jouer françaises et dés, 100 % procédural
// (zéro asset, cohérent avec la DA « fête foraine électrique la nuit »).
// Cartes : blanc chaud, coins arrondis, index dans 2 coins, vraies grilles
// de pips pour 2-10, figures V/D/R ornées. Dos : rayures de chapiteau.

import { SUITS, RANK_LABELS, isRed, cardOf } from '/shared/cards.js';

const INK = '#241B2F';        // encre des cartes noires (nuit très foncée)
const RED = '#E4304A';        // encre des cartes rouges
const PAPER = '#F7F3EA';      // papier blanc chaud (jamais #FFF pur)
const PAPER_EDGE = '#D9CFC0';

export function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Grilles de pips (fractions du corps de carte) pour les rangs 2-10.
const PIPS = {
  2: [[0.5, 0.2], [0.5, 0.8]],
  3: [[0.5, 0.2], [0.5, 0.5], [0.5, 0.8]],
  4: [[0.3, 0.22], [0.7, 0.22], [0.3, 0.78], [0.7, 0.78]],
  5: [[0.3, 0.22], [0.7, 0.22], [0.5, 0.5], [0.3, 0.78], [0.7, 0.78]],
  6: [[0.3, 0.22], [0.7, 0.22], [0.3, 0.5], [0.7, 0.5], [0.3, 0.78], [0.7, 0.78]],
  7: [[0.3, 0.22], [0.7, 0.22], [0.5, 0.36], [0.3, 0.5], [0.7, 0.5], [0.3, 0.78], [0.7, 0.78]],
  8: [[0.3, 0.22], [0.7, 0.22], [0.5, 0.36], [0.3, 0.5], [0.7, 0.5], [0.5, 0.64], [0.3, 0.78], [0.7, 0.78]],
  9: [[0.3, 0.2], [0.7, 0.2], [0.3, 0.4], [0.7, 0.4], [0.5, 0.5], [0.3, 0.6], [0.7, 0.6], [0.3, 0.8], [0.7, 0.8]],
  10: [[0.3, 0.2], [0.7, 0.2], [0.5, 0.3], [0.3, 0.4], [0.7, 0.4], [0.3, 0.6], [0.7, 0.6], [0.5, 0.7], [0.3, 0.8], [0.7, 0.8]],
};

function drawSuit(ctx, s, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.font = `${size}px "Segoe UI Symbol", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(SUITS[s], x, y + size * 0.04);
  ctx.textBaseline = 'alphabetic';
}

// Carte face visible. `id` = entier carte (shared/cards.js), w = largeur
// monde, hauteur = w * 1.4. (x, y) = coin haut-gauche. opts: { angle, glow,
// dim, lift } pour la mise en scène.
export function drawCard(ctx, id, x, y, w, opts = {}) {
  const h = w * 1.4;
  const { s, r } = cardOf(id);
  const color = isRed(s) ? RED : INK;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (opts.angle) ctx.rotate(opts.angle);
  ctx.translate(-w / 2, -h / 2);

  // Ombre + papier
  ctx.shadowColor = 'rgba(0,0,0,.45)';
  ctx.shadowBlur = w * 0.12;
  ctx.shadowOffsetY = w * 0.05;
  roundRectPath(ctx, 0, 0, w, h, w * 0.09);
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.lineWidth = Math.max(1, w * 0.015);
  ctx.strokeStyle = opts.glow || PAPER_EDGE;
  if (opts.glow) ctx.lineWidth = Math.max(1.5, w * 0.04);
  ctx.stroke();

  // Index (coin haut-gauche + bas-droit retourné)
  const idxSize = w * 0.2;
  ctx.font = `800 ${idxSize}px Rubik, system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  const label = RANK_LABELS[r - 1];
  ctx.fillText(label, w * 0.14, h * 0.16);
  drawSuit(ctx, s, w * 0.14, h * 0.26, idxSize * 0.85, color);
  ctx.save();
  ctx.translate(w, h);
  ctx.rotate(Math.PI);
  ctx.font = `800 ${idxSize}px Rubik, system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(label, w * 0.14, h * 0.16);
  drawSuit(ctx, s, w * 0.14, h * 0.26, idxSize * 0.85, color);
  ctx.restore();

  // Corps
  if (r === 1) {
    drawSuit(ctx, s, w / 2, h / 2, w * 0.52, color);
  } else if (r <= 10) {
    const pad = w * 0.16;
    const bw = w - pad * 2, by = h * 0.14, bh = h - by * 2;
    for (const [fx, fy] of PIPS[r]) {
      drawSuit(ctx, s, pad + fx * bw, by + fy * bh, w * 0.19, color);
    }
  } else {
    // Figure : cadre orné + grande lettre + couronne de pips.
    roundRectPath(ctx, w * 0.2, h * 0.17, w * 0.6, h * 0.66, w * 0.05);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, w * 0.02);
    ctx.stroke();
    roundRectPath(ctx, w * 0.24, h * 0.2, w * 0.52, h * 0.6, w * 0.04);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = `${w * 0.34}px Bungee, Rubik, system-ui, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(label, w / 2, h * 0.56);
    drawSuit(ctx, s, w / 2, h * 0.3, w * 0.16, color);
    drawSuit(ctx, s, w * 0.35, h * 0.72, w * 0.12, color);
    drawSuit(ctx, s, w * 0.65, h * 0.72, w * 0.12, color);
  }

  if (opts.dim) {
    roundRectPath(ctx, 0, 0, w, h, w * 0.09);
    ctx.fillStyle = `rgba(20,10,38,${opts.dim})`;
    ctx.fill();
  }
  ctx.restore();
}

// Dos de carte : chapiteau rayé + médaillon étoile.
export function drawCardBack(ctx, x, y, w, opts = {}) {
  const h = w * 1.4;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (opts.angle) ctx.rotate(opts.angle);
  ctx.translate(-w / 2, -h / 2);

  ctx.shadowColor = 'rgba(0,0,0,.45)';
  ctx.shadowBlur = w * 0.12;
  ctx.shadowOffsetY = w * 0.05;
  roundRectPath(ctx, 0, 0, w, h, w * 0.09);
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  const m = w * 0.07;
  roundRectPath(ctx, m, m, w - m * 2, h - m * 2, w * 0.06);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#31205A';
  ctx.fillRect(m, m, w - m * 2, h - m * 2);
  ctx.fillStyle = opts.tint || '#FF3D8A';
  const step = w * 0.16;
  for (let i = -6; i < 14; i++) {
    ctx.beginPath();
    ctx.moveTo(m + i * step, m);
    ctx.lineTo(m + i * step + step * 0.5, m);
    ctx.lineTo(m + i * step + step * 0.5 - h, h - m);
    ctx.lineTo(m + i * step - h, h - m);
    ctx.closePath();
    ctx.globalAlpha = 0.55;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Médaillon central
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = '#31205A';
  ctx.fill();
  ctx.strokeStyle = '#FFC93C';
  ctx.lineWidth = Math.max(1, w * 0.02);
  ctx.stroke();
  ctx.font = `${w * 0.22}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎪', w / 2, h / 2 + w * 0.015);
  ctx.textBaseline = 'alphabetic';
  ctx.restore();

  roundRectPath(ctx, 0, 0, w, h, w * 0.09);
  ctx.strokeStyle = opts.glow || PAPER_EDGE;
  ctx.lineWidth = opts.glow ? Math.max(1.5, w * 0.04) : Math.max(1, w * 0.015);
  ctx.stroke();
  ctx.restore();
}

// Dé à jouer : face ivoire bombée, pips encrés. `locked` = liseré néon.
export function drawDie(ctx, x, y, size, value, opts = {}) {
  const r = size * 0.22;
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  if (opts.angle) ctx.rotate(opts.angle);
  ctx.translate(-size / 2, -size / 2);

  ctx.shadowColor = 'rgba(0,0,0,.5)';
  ctx.shadowBlur = size * 0.14;
  ctx.shadowOffsetY = size * 0.06;
  roundRectPath(ctx, 0, 0, size, size, r);
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, '#FDFAF2');
  g.addColorStop(1, '#E8E0D0');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = opts.locked ? (opts.lockColor || '#3DFF8A') : PAPER_EDGE;
  ctx.lineWidth = opts.locked ? Math.max(2, size * 0.07) : Math.max(1, size * 0.03);
  ctx.stroke();

  const P = {
    1: [[0.5, 0.5]],
    2: [[0.28, 0.28], [0.72, 0.72]],
    3: [[0.26, 0.26], [0.5, 0.5], [0.74, 0.74]],
    4: [[0.29, 0.29], [0.71, 0.29], [0.29, 0.71], [0.71, 0.71]],
    5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]],
    6: [[0.29, 0.25], [0.71, 0.25], [0.29, 0.5], [0.71, 0.5], [0.29, 0.75], [0.71, 0.75]],
  };
  ctx.fillStyle = opts.pipColor || INK;
  for (const [fx, fy] of P[value] || []) {
    ctx.beginPath();
    ctx.arc(fx * size, fy * size, size * 0.085, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Jeton de casino / de stand : disque strié bicolore avec valeur.
export function drawChip(ctx, x, y, r, color, label = '') {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y + r * 0.12, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.setLineDash([r * 0.35, r * 0.28]);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.82, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.58, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(20,10,38,.8)';
  ctx.fill();
  if (label !== '') {
    ctx.font = `800 ${r * 0.75}px Rubik, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PAPER;
    ctx.fillText(String(label), x, y + r * 0.04);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
}
