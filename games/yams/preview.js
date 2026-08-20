// YAMS : vignette d'aperçu (menu accueil + lobby). Scène statique : un
// yams de 5 sur le tapis, un coin de feuille de score griffonnée.

import { drawDie, roundRectPath } from '/cardkit.js';

export function drawPreview(ctx, w, h) {
  // Fond : nuit de fête, halo bleu du stand.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#241245');
  g.addColorStop(1, '#140A26');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const halo = ctx.createRadialGradient(w * 0.42, h * 0.75, 0, w * 0.42, h * 0.75, w * 0.5);
  halo.addColorStop(0, 'rgba(77,124,255,.22)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  // Coin de feuille de score, posé de travers à droite.
  ctx.save();
  ctx.translate(w * 0.76, h * 0.5);
  ctx.rotate(0.12);
  roundRectPath(ctx, -w * 0.14, -h * 0.34, w * 0.3, h * 0.78, 4);
  ctx.fillStyle = '#F7F3EA';
  ctx.fill();
  ctx.strokeStyle = '#D9CFC0';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(36,27,47,.35)';
  for (let i = 0; i < 5; i++) {
    const ly = -h * 0.24 + i * h * 0.13;
    ctx.beginPath();
    ctx.moveTo(-w * 0.11, ly);
    ctx.lineTo(w * 0.12, ly);
    ctx.stroke();
  }
  ctx.font = `800 ${h * 0.09}px Rubik, sans-serif`;
  ctx.fillStyle = '#4D7CFF';
  ctx.textAlign = 'right';
  ctx.fillText('50', w * 0.12, -h * 0.26);
  ctx.fillText('25', w * 0.12, -h * 0.13);
  ctx.restore();

  // Cinq dés à 5 : YAMS !
  const ds = h * 0.3;
  const angles = [-0.18, 0.1, -0.06, 0.14, -0.1];
  for (let i = 0; i < 5; i++) {
    const dx = w * 0.06 + i * ds * 0.72;
    const dy = h * 0.58 + Math.sin(i * 1.7) * h * 0.05;
    drawDie(ctx, dx, dy, ds, 5, { angle: angles[i] });
  }

  // Titre néon.
  ctx.font = `${h * 0.2}px Bungee, Rubik, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFC93C';
  ctx.shadowColor = 'rgba(255,201,60,.6)';
  ctx.shadowBlur = 8;
  ctx.fillText('YAMS !', w * 0.06, h * 0.3);
  ctx.shadowBlur = 0;
}
