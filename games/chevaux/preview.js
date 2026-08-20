// PETITS CHEVAUX : vignette d'aperçu (menu). Morceau de piste circulaire,
// chevaux colorés, dé au premier plan. Statique, 16:9.

import { drawDie } from '/cardkit.js';

const TAU = Math.PI * 2;

function horse(ctx, x, y, r, color) {
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.85, r * 0.9, r * 0.34, 0, 0, TAU);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = Math.max(1.2, r * 0.16);
  ctx.strokeStyle = 'rgba(20,10,38,.75)';
  ctx.stroke();
  ctx.font = `${Math.round(r * 1.4)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#140A26';
  ctx.fillText('♞', x, y + r * 0.08);
  ctx.textBaseline = 'alphabetic';
}

export function drawPreview(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#241245');
  g.addColorStop(1, '#140A26');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Arc de piste : cases rondes le long d'un grand cercle hors cadre.
  const cx = w * 0.5, cy = h * 2.05, R = h * 1.72;
  const colors = ['#FF3D8A', '#29D9FF', '#FFC93C', '#3DFF8A'];
  const caseR = h * 0.115;
  for (let i = 0; i < 11; i++) {
    const a = -Math.PI / 2 + (i - 5) * 0.107;
    const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
    const isStart = i === 2 || i === 8;
    const col = colors[i === 2 ? 0 : 2];
    ctx.beginPath();
    ctx.arc(x, y, caseR, 0, TAU);
    ctx.fillStyle = isStart ? col + '55' : '#1E1038';
    ctx.fill();
    ctx.lineWidth = isStart ? 2 : 1.2;
    ctx.strokeStyle = isStart ? col : 'rgba(185,168,208,.35)';
    ctx.stroke();
  }
  // Échelle en losanges qui monte vers le haut du cadre.
  for (let k = 0; k < 3; k++) {
    const x = w * 0.30, y = h * (0.62 - k * 0.23);
    const s = caseR * (0.8 - k * 0.08);
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s, y);
    ctx.lineTo(x, y + s);
    ctx.lineTo(x - s, y);
    ctx.closePath();
    ctx.fillStyle = '#FF3D8A33';
    ctx.fill();
    ctx.strokeStyle = '#FF3D8A99';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  // Chevaux sur la piste.
  horse(ctx, w * 0.30, h * 0.80, h * 0.085, colors[0]);
  horse(ctx, w * 0.52, h * 0.745, h * 0.085, colors[1]);
  horse(ctx, w * 0.665, h * 0.77, h * 0.085, colors[3]);
  // Dé en vedette.
  drawDie(ctx, w * 0.78, h * 0.12, h * 0.34, 6, { angle: 0.16 });
  // Titre néon.
  ctx.font = `${Math.round(h * 0.16)}px Bungee, Rubik, system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FF9F43';
  ctx.shadowColor = 'rgba(255,159,67,.6)';
  ctx.shadowBlur = 8;
  ctx.fillText('PETITS CHEVAUX', w * 0.05, h * 0.22);
  ctx.shadowBlur = 0;
}
