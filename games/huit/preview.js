// HUIT AMÉRICAIN : vignette d'apercu (menus). Tapis, defausse avec un 8,
// eventail de cartes et pastille de couleur demandee. Statique, 16:9.

import { drawCard, drawCardBack, drawSuitShape } from '/cardkit.js';
import { cardId } from '/shared/cards.js';

const TAU = Math.PI * 2;

export function drawPreview(ctx, w, h) {
  // Tapis.
  const g = ctx.createRadialGradient(w * 0.45, h * 0.45, 8, w * 0.5, h * 0.5, w * 0.7);
  g.addColorStop(0, '#3A2263');
  g.addColorStop(1, '#150C29');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Sens du jeu.
  ctx.strokeStyle = 'rgba(41,217,255,.3)';
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 6]);
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.55, w * 0.4, h * 0.36, 0, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);

  // Pioche a gauche.
  const cw = h * 0.42;
  drawCardBack(ctx, w * 0.1, h * 0.3, cw, { tint: '#FF7A3D' });

  // Defausse : le fameux 8, avec la couleur demandee.
  drawCard(ctx, cardId(1, 8), w * 0.38, h * 0.26, cw, { angle: 0.05, thick: 1.5 });

  // Eventail de main en bas a droite.
  for (let i = 0; i < 3; i++) {
    drawCard(ctx, cardId(i, 7 + i * 2), w * 0.62 + i * cw * 0.32, h * 0.44 + i * h * 0.02,
      cw * 0.82, { angle: -0.16 + i * 0.14, thick: 1.2 });
  }

  // Pastille de couleur demandee.
  const px = w * 0.87, py = h * 0.22, pr = h * 0.13;
  ctx.beginPath();
  ctx.arc(px, py, pr, 0, TAU);
  ctx.fillStyle = '#F5EFE6';
  ctx.fill();
  ctx.strokeStyle = '#FFC93C';
  ctx.lineWidth = 2;
  ctx.stroke();
  drawSuitShape(ctx, 1, px, py, pr * 1.3, '#D42A45');
}
