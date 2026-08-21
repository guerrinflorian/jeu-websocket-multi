// ROULETTE : vignette d'apercu (menus). Le cylindre a gauche, la bille dans
// sa case, un bout de tapis vert et deux jetons poses. Statique, 16:9.

import { drawChip3D, roundRectPath } from '/cardkit.js';
import { ORDRE, ROUGES } from '/shared/roulette.js';

const TAU = Math.PI * 2;
const teinte = (n) => (n === 0 ? '#0E7A3C' : ROUGES.has(n) ? '#C0182C' : '#171018');

export function drawPreview(ctx, w, h) {
  // Feutre.
  const g = ctx.createRadialGradient(w * 0.55, h * 0.3, 8, w * 0.5, h * 0.6, w * 0.8);
  g.addColorStop(0, '#1A5C37');
  g.addColorStop(0.6, '#14512F');
  g.addColorStop(1, '#0A2A19');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  roundRectPath(ctx, 2, 2, w - 4, h - 4, h * 0.12);
  ctx.strokeStyle = 'rgba(255,201,60,.35)';
  ctx.lineWidth = Math.max(1.5, h * 0.03);
  ctx.stroke();

  // Le cylindre.
  const cx = w * 0.31, cy = h * 0.52, R = h * 0.42;
  ctx.beginPath();
  ctx.ellipse(cx, cy + R * 0.85, R * 1.05, R * 0.25, 0, 0, TAU);
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fill();
  const bois = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.15, cx, cy, R * 1.14);
  bois.addColorStop(0, '#8A4A22');
  bois.addColorStop(1, '#2E1509');
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.12, 0, TAU);
  ctx.fillStyle = bois;
  ctx.fill();

  const pas = TAU / ORDRE.length;
  ORDRE.forEach((n, i) => {
    const a0 = i * pas - Math.PI / 2 - pas / 2 + 0.35;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R * 0.94, a0, a0 + pas);
    ctx.closePath();
    ctx.fillStyle = teinte(n);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,201,60,.4)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  });

  // Moyeu dore.
  const moy = ctx.createRadialGradient(cx - R * 0.12, cy - R * 0.16, R * 0.04, cx, cy, R * 0.44);
  moy.addColorStop(0, '#E8C98A');
  moy.addColorStop(1, '#7A5326');
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.44, 0, TAU);
  ctx.fillStyle = moy;
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((i / 4) * TAU + 0.4);
    ctx.fillStyle = 'rgba(255,232,190,.7)';
    ctx.fillRect(-R * 0.02, -R * 0.42, R * 0.04, R * 0.42);
    ctx.restore();
  }

  // La bille dans sa case.
  const ba = -1.15;
  const bx = cx + Math.cos(ba) * R * 0.76, by = cy + Math.sin(ba) * R * 0.76;
  ctx.beginPath();
  ctx.arc(bx, by, R * 0.075, 0, TAU);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Un bout de tapis a droite : trois numeros et les chances.
  const cw = w * 0.13, chh = h * 0.2, x0 = w * 0.6, y0 = h * 0.2;
  const nums = [[5, 0], [6, 1], [7, 2]];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      const n = 5 + i * 3 + j;
      roundRectPath(ctx, x0 + j * cw, y0 + i * chh, cw - 2, chh - 2, 2);
      ctx.fillStyle = teinte(n);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.45)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.font = `800 ${Math.max(6, chh * 0.5)}px Bungee, Rubik, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#F5EFE6';
      ctx.fillText(String(n), x0 + j * cw + cw / 2 - 1, y0 + i * chh + chh * 0.66);
    }
  }
  // Deux jetons poses : un plein et un cheval.
  drawChip3D(ctx, x0 + cw - 1, y0 + chh * 1.5, Math.max(6, h * 0.11), 25, { squash: 0.5, label: false });
  drawChip3D(ctx, x0 + cw * 0.5, y0 + chh * 0.5, Math.max(5, h * 0.09), 5, { squash: 0.5, label: false });

  ctx.textAlign = 'left';
}
