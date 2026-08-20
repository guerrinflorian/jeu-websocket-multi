// POKER : vignette d'apercu (menus). Tapis vert, deux cartes fermees en
// main, trois cartes communes et une pile de jetons. Statique, 16:9.

import { drawCard, drawCardBack, drawChip3D, roundRectPath } from '/cardkit.js';
import { cardId } from '/shared/cards.js';

export function drawPreview(ctx, w, h) {
  const TAU = Math.PI * 2;
  // Fond nuit.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#241245');
  g.addColorStop(1, '#140A26');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Tapis ovale.
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.56, w * 0.46, h * 0.42, 0, 0, TAU);
  const felt = ctx.createRadialGradient(w * 0.5, h * 0.4, 6, w * 0.5, h * 0.56, w * 0.5);
  felt.addColorStop(0, '#2E7A4E');
  felt.addColorStop(1, '#123B26');
  ctx.fillStyle = felt;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,201,60,.35)';
  ctx.lineWidth = Math.max(1.4, h * 0.02);
  ctx.stroke();

  // Trois cartes communes.
  const cw = h * 0.3;
  const board = [cardId(0, 1), cardId(1, 13), cardId(0, 12)];
  board.forEach((id, i) => {
    drawCard(ctx, id, w * 0.28 + i * cw * 1.16, h * 0.3, cw, { thick: 1.2 });
  });

  // Ma main : deux cartes en bas.
  drawCard(ctx, cardId(3, 1), w * 0.12, h * 0.58, cw * 1.1, { angle: -0.14, thick: 1.4 });
  drawCard(ctx, cardId(2, 13), w * 0.12 + cw * 0.8, h * 0.6, cw * 1.1, { angle: 0.12, thick: 1.4 });

  // Dos de cartes chez l'adversaire.
  drawCardBack(ctx, w * 0.74, h * 0.62, cw * 0.9, { angle: 0.1, tint: '#2FA95F' });
  drawCardBack(ctx, w * 0.8, h * 0.6, cw * 0.9, { angle: -0.08, tint: '#2FA95F' });

  // Pile de jetons au centre.
  const cr = h * 0.11;
  drawChip3D(ctx, w * 0.55, h * 0.78, cr, 100, { squash: 0.44, thick: cr * 0.3 });
  drawChip3D(ctx, w * 0.55, h * 0.72, cr, 25, { squash: 0.44, thick: cr * 0.3, shadow: false });
  drawChip3D(ctx, w * 0.55, h * 0.66, cr, 500, { squash: 0.44, thick: cr * 0.3, shadow: false });
}
