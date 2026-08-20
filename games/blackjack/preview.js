// BLACKJACK : vignette d'apercu (menus). Feutre violet, arc dore, deux
// cartes gagnantes et une pile de jetons en volume. Statique, 16:9.

import { drawCard, drawChip3D, roundRectPath } from '/cardkit.js';
import { cardId } from '/shared/cards.js';

export function drawPreview(ctx, w, h) {
  // Feutre.
  const g = ctx.createRadialGradient(w * 0.5, h * 0.3, 8, w * 0.5, h * 0.55, w * 0.75);
  g.addColorStop(0, '#3C2270');
  g.addColorStop(0.6, '#2E1A54');
  g.addColorStop(1, '#1B0F35');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Rail de cuir.
  roundRectPath(ctx, 2, 2, w - 4, h - 4, h * 0.14);
  ctx.strokeStyle = 'rgba(255,201,60,.35)';
  ctx.lineWidth = Math.max(1.5, h * 0.035);
  ctx.stroke();

  // Arc dore de la table.
  ctx.beginPath();
  ctx.arc(w * 0.5, -h * 0.5, h * 1.02, 0.5, Math.PI - 0.5);
  ctx.strokeStyle = 'rgba(255,201,60,.3)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  // La main qui fait rever : As de pique + Roi de coeur.
  const cw = h * 0.46;
  drawCard(ctx, cardId(0, 1), w * 0.2, h * 0.24, cw, { angle: -0.12, thick: 1.5 });
  drawCard(ctx, cardId(1, 13), w * 0.2 + cw * 0.62, h * 0.26, cw, { angle: 0.09, thick: 1.5 });

  // Pile de jetons.
  const cr = h * 0.13;
  drawChip3D(ctx, w * 0.72, h * 0.74, cr, 100, { squash: 0.44, thick: cr * 0.34 });
  drawChip3D(ctx, w * 0.72, h * 0.66, cr, 25, { squash: 0.44, thick: cr * 0.34, shadow: false });
  drawChip3D(ctx, w * 0.72, h * 0.58, cr, 5, { squash: 0.44, thick: cr * 0.34, shadow: false });

  // Le 21 en neon.
  ctx.font = `${Math.round(h * 0.3)}px Bungee, Rubik, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFC93C';
  ctx.shadowColor = 'rgba(255,201,60,.75)';
  ctx.shadowBlur = 10;
  ctx.fillText('21', w * 0.78, h * 0.34);
  ctx.shadowBlur = 0;
}
