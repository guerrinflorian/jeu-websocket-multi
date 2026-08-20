// MENTEUR : vignette d apercu (menus). Tapis de bistrot, gobelets renverses,
// des dont un joker, et l enchere criee. Statique, 16:9.

import { drawDie, roundRectPath } from '/cardkit.js';

const TAU = Math.PI * 2;

function cup(ctx, x, y, r, color, n) {
  const h = r * 1.5;
  ctx.beginPath();
  ctx.ellipse(x, y + h * 0.52, r * 1.05, r * 0.28, 0, 0, TAU);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.72, y - h * 0.5);
  ctx.lineTo(x + r * 0.72, y - h * 0.5);
  ctx.lineTo(x + r, y + h * 0.5);
  ctx.lineTo(x - r, y + h * 0.5);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,10,38,.6)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x, y - h * 0.5, r * 0.72, r * 0.22, 0, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.fill();
  ctx.font = `800 ${Math.round(r * 0.8)}px Bungee, Rubik, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#160B2B';
  ctx.fillText(String(n), x, y + h * 0.24);
}

export function drawPreview(ctx, w, h) {
  // Tapis.
  const g = ctx.createRadialGradient(w * 0.5, h * 0.55, 10, w * 0.5, h * 0.55, w * 0.7);
  g.addColorStop(0, '#3A2258');
  g.addColorStop(0.6, '#26153F');
  g.addColorStop(1, '#150B28');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  roundRectPath(ctx, 3, 3, w - 6, h - 6, h * 0.12);
  ctx.strokeStyle = 'rgba(255,107,157,.35)';
  ctx.lineWidth = Math.max(1.5, h * 0.03);
  ctx.stroke();

  // Gobelets des adversaires.
  cup(ctx, w * 0.16, h * 0.34, h * 0.15, '#29D9FF', 5);
  cup(ctx, w * 0.37, h * 0.27, h * 0.13, '#FFC93C', 3);
  cup(ctx, w * 0.84, h * 0.34, h * 0.15, '#3DFF8A', 4);

  // Mes des a moi, dont un joker.
  const s = h * 0.22;
  drawDie(ctx, w * 0.42 - s / 2, h * 0.68, s, 5, { angle: -0.1 });
  drawDie(ctx, w * 0.55 - s / 2, h * 0.7, s, 1, { locked: true, lockColor: '#FFC93C', angle: 0.08 });
  drawDie(ctx, w * 0.68 - s / 2, h * 0.67, s, 5, { angle: -0.05 });

  // L enchere criee.
  ctx.font = `${Math.round(h * 0.17)}px Bungee, Rubik, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FF6B9D';
  ctx.shadowColor = 'rgba(255,107,157,.7)';
  ctx.shadowBlur = 9;
  ctx.fillText('QUATRE 5 !', w * 0.6, h * 0.2);
  ctx.shadowBlur = 0;
  ctx.font = `700 ${Math.round(h * 0.1)}px Rubik, system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(245,239,230,.75)';
  ctx.fillText('menteur ?', w * 0.6, h * 0.36);
}
