// CARAMBOLE : vignette du menu (drawPreview). Piste ronde, autos
// tamponneuses, un malheureux en train de partir dans le vide.

const TAU = Math.PI * 2;

function car(ctx, x, y, r, a, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.85, r * 1.05, r * 0.38, 0, 0, TAU);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = 'rgba(20,10,38,.5)';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.3, 0, TAU);
  ctx.fillStyle = '#F5EFE6';
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawPreview(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0C0620');
  g.addColorStop(1, '#1E1038');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5, cy = h * 0.54, R = h * 0.42;

  // Le vide, puis la piste.
  ctx.beginPath();
  ctx.arc(cx, cy, R + 5, 0, TAU);
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  ctx.fill();
  const grad = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R);
  grad.addColorStop(0, '#3A2560');
  grad.addColorStop(1, '#2A1A4A');
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.fillStyle = grad;
  ctx.fill();
  for (let i = 0; i < 12; i += 2) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, (i / 12) * TAU, ((i + 1) / 12) * TAU);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,61,138,.06)';
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.strokeStyle = '#FF7A3D';
  ctx.lineWidth = 2.6;
  ctx.stroke();

  // Choc central : deux autos qui se rentrent dedans.
  car(ctx, cx - R * 0.28, cy - R * 0.1, h * 0.085, 0.2, '#FF3D8A');
  car(ctx, cx + R * 0.02, cy - R * 0.02, h * 0.085, Math.PI + 0.4, '#29D9FF');
  // Étincelles du choc.
  ctx.fillStyle = '#FFC93C';
  const ix = cx - R * 0.13, iy = cy - R * 0.06;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + 0.4;
    const d = 7 + (i % 3) * 4;
    ctx.fillRect(ix + Math.cos(a) * d - 1.2, iy + Math.sin(a) * d - 1.2, 2.4, 2.4);
  }

  // Un troisième qui manigance, un quatrième qui tombe.
  car(ctx, cx + R * 0.42, cy + R * 0.42, h * 0.08, -2.2, '#3DFF8A');
  car(ctx, cx - R * 1.06, cy + R * 0.55, h * 0.075, 2.6, '#FFC93C', 0.55);
  ctx.font = `800 ${Math.round(h * 0.1)}px Rubik, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FF4757';
  ctx.fillText('!', cx - R * 1.06, cy + R * 0.28);

  // Un bonus qui attend son heure.
  ctx.beginPath();
  ctx.arc(cx + R * 0.05, cy + R * 0.55, h * 0.07, 0, TAU);
  ctx.fillStyle = 'rgba(61,255,138,.15)';
  ctx.fill();
  ctx.strokeStyle = '#3DFF8A';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.font = `${Math.round(h * 0.1)}px system-ui, sans-serif`;
  ctx.fillText('🧲', cx + R * 0.05, cy + R * 0.59);
}
