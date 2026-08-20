// Kit de rendu Canvas : cartes à jouer françaises, dés et jetons, 100 %
// procédural (zéro asset, cohérent avec la DA « fête foraine électrique »).
// Cartes fidèles aux vraies : enseignes vectorielles (pique, cœur, carreau,
// trèfle), index fins dans les coins (rang + petite enseigne dessous),
// grilles de pips classiques avec la moitié basse retournée, figures V/D/R
// à double tête. Dos : rayures de chapiteau.

import { RANK_LABELS, isRed, cardOf } from '/shared/cards.js';

const INK = '#241B2F';        // encre des cartes noires (nuit très foncée)
const RED = '#D42A45';        // encre des cartes rouges
const PAPER = '#F7F3EA';      // papier blanc chaud (jamais #FFF pur)
const PAPER_EDGE = '#D9CFC0';
const TAU = Math.PI * 2;

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

// ── Enseignes vectorielles ──────────────────────────────────────────────
// Dessine l'enseigne s (0 pique, 1 cœur, 2 carreau, 3 trèfle) centrée en
// (x, y), de hauteur `size`, éventuellement retournée (rot en radians).

export function drawSuitShape(ctx, s, x, y, size, color, rot = 0) {
  const k = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  if (s === 1) {
    // Cœur : deux courbes de Bézier, pointe en bas.
    ctx.moveTo(0, k * 0.95);
    ctx.bezierCurveTo(-k * 1.05, k * 0.25, -k * 1.0, -k * 0.85, 0, -k * 0.35);
    ctx.bezierCurveTo(k * 1.0, -k * 0.85, k * 1.05, k * 0.25, 0, k * 0.95);
  } else if (s === 0) {
    // Pique : cœur inversé + tige évasée.
    ctx.moveTo(0, -k * 0.98);
    ctx.bezierCurveTo(k * 1.02, -k * 0.24, k * 0.95, k * 0.58, 0, k * 0.26);
    ctx.bezierCurveTo(-k * 0.95, k * 0.58, -k * 1.02, -k * 0.24, 0, -k * 0.98);
    ctx.moveTo(0, k * 0.1);
    ctx.quadraticCurveTo(-k * 0.12, k * 0.62, -k * 0.42, k * 0.98);
    ctx.lineTo(k * 0.42, k * 0.98);
    ctx.quadraticCurveTo(k * 0.12, k * 0.62, 0, k * 0.1);
  } else if (s === 2) {
    // Carreau : losange aux flancs légèrement bombés.
    ctx.moveTo(0, -k);
    ctx.quadraticCurveTo(k * 0.3, -k * 0.42, k * 0.72, 0);
    ctx.quadraticCurveTo(k * 0.3, k * 0.42, 0, k);
    ctx.quadraticCurveTo(-k * 0.3, k * 0.42, -k * 0.72, 0);
    ctx.quadraticCurveTo(-k * 0.3, -k * 0.42, 0, -k);
  } else {
    // Trèfle : trois feuilles rondes + tige évasée.
    const r = k * 0.46;
    ctx.moveTo(r, -k * 0.44);
    ctx.arc(0, -k * 0.44, r, 0, TAU);
    ctx.moveTo(-k * 0.46 + r, k * 0.14);
    ctx.arc(-k * 0.46, k * 0.14, r, 0, TAU);
    ctx.moveTo(k * 0.46 + r, k * 0.14);
    ctx.arc(k * 0.46, k * 0.14, r, 0, TAU);
    ctx.moveTo(0, k * 0.05);
    ctx.quadraticCurveTo(-k * 0.1, k * 0.62, -k * 0.36, k * 0.98);
    ctx.lineTo(k * 0.36, k * 0.98);
    ctx.quadraticCurveTo(k * 0.1, k * 0.62, 0, k * 0.05);
  }
  ctx.fill();
  ctx.restore();
}

// Grilles de pips (fractions de la zone centrale) pour les rangs 2-10.
// Disposition classique des cartes françaises ; fy > 0.5 = pip retourné.
const PIPS = {
  2: [[0.5, 0.12], [0.5, 0.88]],
  3: [[0.5, 0.12], [0.5, 0.5], [0.5, 0.88]],
  4: [[0.28, 0.14], [0.72, 0.14], [0.28, 0.86], [0.72, 0.86]],
  5: [[0.28, 0.14], [0.72, 0.14], [0.5, 0.5], [0.28, 0.86], [0.72, 0.86]],
  6: [[0.28, 0.14], [0.72, 0.14], [0.28, 0.5], [0.72, 0.5], [0.28, 0.86], [0.72, 0.86]],
  7: [[0.28, 0.14], [0.72, 0.14], [0.5, 0.32], [0.28, 0.5], [0.72, 0.5], [0.28, 0.86], [0.72, 0.86]],
  8: [[0.28, 0.14], [0.72, 0.14], [0.5, 0.32], [0.28, 0.5], [0.72, 0.5], [0.5, 0.68], [0.28, 0.86], [0.72, 0.86]],
  9: [[0.28, 0.12], [0.72, 0.12], [0.28, 0.375], [0.72, 0.375], [0.5, 0.5], [0.28, 0.625], [0.72, 0.625], [0.28, 0.88], [0.72, 0.88]],
  10: [[0.28, 0.12], [0.72, 0.12], [0.5, 0.245], [0.28, 0.375], [0.72, 0.375], [0.28, 0.625], [0.72, 0.625], [0.5, 0.755], [0.28, 0.88], [0.72, 0.88]],
};

// Index de coin : rang au-dessus, petite enseigne dessous (fin, comme les
// vraies cartes). Dessiné en haut-gauche ; l'appelant tourne pour le bas.
function drawCorner(ctx, label, s, w, h, color) {
  const cx = label === '10' ? w * 0.125 : w * 0.11;
  const fs = label === '10' ? w * 0.145 : w * 0.165;
  ctx.font = `800 ${fs}px Rubik, system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(label, cx, w * 0.225);
  drawSuitShape(ctx, s, w * 0.11, w * 0.335, w * 0.115, color);
}

// Emblèmes des figures (double tête) : couronne (R), fleur (D), écu (V).
function drawEmblem(ctx, r, x, y, size, color) {
  const k = size / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  if (r === 13) {
    // Couronne : base + trois pointes + perles.
    ctx.beginPath();
    ctx.moveTo(-k, k * 0.55);
    ctx.lineTo(-k, -k * 0.25);
    ctx.lineTo(-k * 0.45, k * 0.05);
    ctx.lineTo(0, -k * 0.6);
    ctx.lineTo(k * 0.45, k * 0.05);
    ctx.lineTo(k, -k * 0.25);
    ctx.lineTo(k, k * 0.55);
    ctx.closePath();
    ctx.fill();
    for (const px of [-k, 0, k]) {
      ctx.beginPath();
      ctx.arc(px, px === 0 ? -k * 0.72 : -k * 0.38, k * 0.14, 0, TAU);
      ctx.fill();
    }
  } else if (r === 12) {
    // Rose de la dame : cinq pétales larges autour d'un cœur plein.
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU - Math.PI / 2;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * k * 0.52, Math.sin(a) * k * 0.52, k * 0.42, k * 0.26, a, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, k * 0.3, 0, TAU);
    ctx.fill();
  } else {
    // Écu du valet : blason plein à pointe, bande claire en travers.
    ctx.beginPath();
    ctx.moveTo(-k * 0.7, -k * 0.6);
    ctx.lineTo(k * 0.7, -k * 0.6);
    ctx.lineTo(k * 0.7, k * 0.05);
    ctx.quadraticCurveTo(k * 0.7, k * 0.55, 0, k * 0.85);
    ctx.quadraticCurveTo(-k * 0.7, k * 0.55, -k * 0.7, k * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = PAPER;
    ctx.lineWidth = k * 0.24;
    ctx.beginPath();
    ctx.moveTo(-k * 0.85, k * 0.35);
    ctx.lineTo(k * 0.85, -k * 0.45);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
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
  if (opts.sx !== undefined) ctx.scale(Math.max(0.015, Math.abs(opts.sx)), 1);
  ctx.translate(-w / 2, -h / 2);

  // Tranche : la carte a une epaisseur, on la voit en biais.
  if (opts.thick) {
    roundRectPath(ctx, 0, opts.thick, w, h, w * 0.09);
    ctx.fillStyle = '#B9AE9C';
    ctx.fill();
  }

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

  const label = RANK_LABELS[r - 1];

  // Index : coin haut-gauche + coin bas-droit retourné.
  drawCorner(ctx, label, s, w, h, color);
  ctx.save();
  ctx.translate(w, h);
  ctx.rotate(Math.PI);
  drawCorner(ctx, label, s, w, h, color);
  ctx.restore();

  // Corps
  if (r === 1) {
    // As : grande enseigne centrale.
    drawSuitShape(ctx, s, w / 2, h / 2, w * 0.46, color);
    if (s === 0) {
      // L'as de pique a droit à son cartouche, tradition oblige.
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, w * 0.012);
      ctx.globalAlpha = 0.5;
      roundRectPath(ctx, w * 0.26, h * 0.28, w * 0.48, h * 0.44, w * 0.05);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  } else if (r <= 10) {
    // Pips : colonnes classiques, moitié basse retournée.
    const pad = w * 0.16;
    const bw = w - pad * 2;
    const by = h * 0.15, bh = h * 0.7;
    const size = r >= 8 ? w * 0.155 : w * 0.185;
    for (const [fx, fy] of PIPS[r]) {
      drawSuitShape(ctx, s, pad + fx * bw, by + fy * bh, size, color, fy > 0.5 ? Math.PI : 0);
    }
  } else {
    // Figure à double tête : cadre, moitiés miroir, emblème + enseigne.
    const fx = w * 0.2, fy2 = h * 0.15, fw = w * 0.6, fh = h * 0.7;
    roundRectPath(ctx, fx, fy2, fw, fh, w * 0.035);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, w * 0.018);
    ctx.stroke();
    ctx.save();
    roundRectPath(ctx, fx, fy2, fw, fh, w * 0.035);
    ctx.clip();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = color;
    ctx.fillRect(fx, fy2, fw, fh);
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(fx, fy2 + fh / 2);
    ctx.lineTo(fx + fw, fy2 + fh / 2);
    ctx.lineWidth = Math.max(1, w * 0.01);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Une demi-figure, dessinée deux fois (la seconde retournée).
    const half = (flip) => {
      ctx.save();
      if (flip) {
        ctx.translate(w / 2, h / 2);
        ctx.rotate(Math.PI);
        ctx.translate(-w / 2, -h / 2);
      }
      ctx.font = `${w * 0.16}px Bungee, Rubik, system-ui, sans-serif`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText(label, fx + fw * 0.17, fy2 + fh * 0.21);
      drawSuitShape(ctx, s, fx + fw * 0.83, fy2 + fh * 0.13, w * 0.09, color);
      drawEmblem(ctx, r, w / 2, fy2 + fh * 0.29, w * 0.22, color);
      ctx.restore();
    };
    half(false);
    half(true);
    ctx.restore();
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
  if (opts.sx !== undefined) ctx.scale(Math.max(0.015, Math.abs(opts.sx)), 1);
  ctx.translate(-w / 2, -h / 2);

  if (opts.thick) {
    roundRectPath(ctx, 0, opts.thick, w, h, w * 0.09);
    ctx.fillStyle = '#B9AE9C';
    ctx.fill();
  }

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
  ctx.arc(w / 2, h / 2, w * 0.2, 0, TAU);
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
    ctx.arc(fx * size, fy * size, size * 0.085, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// Jeton de casino / de stand : disque strié bicolore avec valeur.
export function drawChip(ctx, x, y, r, color, label = '') {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y + r * 0.12, r, 0, TAU);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.setLineDash([r * 0.35, r * 0.28]);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.82, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.58, 0, TAU);
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

// ── Jetons de casino en volume ─────────────────────────────────────────
// Couleurs standard de casino : 1 blanc, 5 rouge, 25 vert, 100 noir,
// 500 violet. Un jeton est un cylindre : flanc strié + plateau incrusté.

export const CHIP_SKINS = {
  1: { face: '#EDE6DA', edge: '#B9AE9C', ink: '#241B2F' },
  5: { face: '#E03A4E', edge: '#8F1C2C', ink: '#FFF4F0' },
  25: { face: '#2FA95F', edge: '#186B3A', ink: '#F2FFF6' },
  100: { face: '#2B2340', edge: '#151022', ink: '#F5EFE6' },
  500: { face: '#8B45D6', edge: '#54237F', ink: '#FBF3FF' },
};

export function chipSkin(v) {
  return CHIP_SKINS[v] || { face: '#B14BFF', edge: '#5B2483', ink: '#F5EFE6' };
}

// Decompose un montant en jetons (du plus gros au plus petit).
export function chipBreakdown(amount, values = [500, 100, 25, 5, 1], maxChips = 14) {
  const out = [];
  let rest = Math.max(0, Math.round(amount));
  for (const v of [...values].sort((a, b) => b - a)) {
    const n = Math.floor(rest / v);
    if (n > 0) { out.push({ v, n }); rest -= n * v; }
  }
  // Trop de jetons a l'ecran : on garde les plus gros.
  let total = out.reduce((s, c) => s + c.n, 0);
  while (total > maxChips && out.length) {
    const last = out[out.length - 1];
    const cut = Math.min(last.n, total - maxChips);
    last.n -= cut;
    total -= cut;
    if (last.n <= 0) out.pop();
  }
  return out;
}

// Un jeton vu de trois quarts : plateau elliptique + flanc strie.
export function drawChip3D(ctx, x, y, r, v, opts = {}) {
  const skin = opts.skin || chipSkin(v);
  const ry = r * (opts.squash || 0.42);        // ecrasement de la perspective
  const th = opts.thick != null ? opts.thick : r * 0.3;
  ctx.save();
  if (opts.shadow !== false) {
    ctx.beginPath();
    ctx.ellipse(x, y + th + ry * 0.5, r * 1.05, ry * 0.75, 0, 0, TAU);
    ctx.fillStyle = 'rgba(0,0,0,.34)';
    ctx.fill();
  }
  // Flanc du cylindre.
  ctx.beginPath();
  ctx.ellipse(x, y + th, r, ry, 0, 0, Math.PI);
  ctx.lineTo(x - r, y);
  ctx.ellipse(x, y, r, ry, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fillStyle = skin.edge;
  ctx.fill();
  // Stries du flanc.
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,.4)';
  ctx.lineWidth = Math.max(1, r * 0.1);
  for (let i = -3; i <= 3; i++) {
    const px = x + (i / 3.4) * r;
    ctx.beginPath();
    ctx.moveTo(px, y - ry * 0.2);
    ctx.lineTo(px, y + th + ry);
    ctx.stroke();
  }
  ctx.restore();
  // Plateau.
  ctx.beginPath();
  ctx.ellipse(x, y, r, ry, 0, 0, TAU);
  const g = ctx.createLinearGradient(x - r, y - ry, x + r, y + ry);
  g.addColorStop(0, skin.face);
  g.addColorStop(1, skin.edge);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.stroke();
  // Couronne de mouchetures.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, r, ry, 0, 0, TAU);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + (opts.spin || 0);
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * ry * 0.78, r * 0.12, ry * 0.2, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // Valeur au centre.
  if (opts.label !== false && r >= 9) {
    ctx.font = `800 ${Math.round(r * 0.62)}px Rubik, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = skin.ink;
    ctx.fillText(String(opts.label != null ? opts.label : v), x, y + r * 0.02);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
}

// Pile de jetons representant un montant. (x, y) = base de la pile.
export function drawChipStack(ctx, x, y, r, amount, opts = {}) {
  const parts = chipBreakdown(amount, opts.values, opts.maxChips || 12);
  const step = r * (opts.step || 0.26);
  let i = 0;
  // Du bas vers le haut : les grosses valeurs en dessous.
  for (const part of parts) {
    for (let k = 0; k < part.n; k++) {
      const last = i === parts.reduce((s, c) => s + c.n, 0) - 1;
      drawChip3D(ctx, x, y - i * step, r, part.v, {
        squash: opts.squash,
        thick: step * 0.9,
        shadow: i === 0,
        label: last && opts.label !== false ? part.v : false,
        spin: i * 0.4,
      });
      i++;
    }
  }
  if (!parts.length) {
    // Emplacement vide : simple cercle en pointilles.
    ctx.save();
    ctx.strokeStyle = 'rgba(245,239,230,.25)';
    ctx.setLineDash([r * 0.4, r * 0.35]);
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (opts.squash || 0.42), 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  return i;
}
