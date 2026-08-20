// CHAMBOULE : vignette du menu (drawPreview). Plateforme cible au-dessus
// du vide, visées secrètes et palets prêts à l'envol.

const TAU = Math.PI * 2;

function palet(ctx, x, y, r, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.85, r * 1.05, r * 0.38, 0, 0, TAU);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,10,38,.5)';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function fleche(ctx, x, y, ax, ay, len, color) {
  const ex = x + ax * len, ey = y + ay * len;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.setLineDash([]);
  const a = Math.atan2(ay, ax);
  ctx.beginPath();
  ctx.moveTo(ex + Math.cos(a) * 8, ey + Math.sin(a) * 8);
  ctx.lineTo(ex + Math.cos(a + 2.5) * 7, ey + Math.sin(a + 2.5) * 7);
  ctx.lineTo(ex + Math.cos(a - 2.5) * 7, ey + Math.sin(a - 2.5) * 7);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function drawPreview(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0C0620');
  g.addColorStop(1, '#1E1038');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5, cy = h * 0.55, R = h * 0.42;

  // Plateforme cible.
  ctx.beginPath();
  ctx.arc(cx, cy, R + 5, 0, TAU);
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  ctx.fill();
  for (const [k, col] of [[1, '#2A1A4A'], [0.72, '#31205A'], [0.45, '#2A1A4A'], [0.2, '#3A2560']]) {
    ctx.beginPath();
    ctx.arc(cx, cy, R * k, 0, TAU);
    ctx.fillStyle = col;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.strokeStyle = '#3DFF8A';
  ctx.lineWidth = 2.6;
  ctx.stroke();

  // Quatre palets, visées secrètes qui se croisent.
  const r = h * 0.075;
  palet(ctx, cx - R * 0.55, cy - R * 0.25, r, '#FF3D8A');
  fleche(ctx, cx - R * 0.55, cy - R * 0.25, 0.9, 0.35, R * 0.65, '#FF3D8A');
  palet(ctx, cx + R * 0.5, cy - R * 0.4, r, '#29D9FF');
  fleche(ctx, cx + R * 0.5, cy - R * 0.4, -0.75, 0.6, R * 0.55, '#29D9FF');
  palet(ctx, cx + R * 0.35, cy + R * 0.5, r, '#FFC93C');
  fleche(ctx, cx + R * 0.35, cy + R * 0.5, -0.95, -0.25, R * 0.5, '#FFC93C');
  // Coche « prêt » sur le jaune.
  ctx.font = `800 ${Math.round(h * 0.1)}px Rubik, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#3DFF8A';
  ctx.fillText('✔', cx + R * 0.35 + r + 6, cy + R * 0.5 - r);

  // Un palet déjà dans le vide, paix à son âme.
  palet(ctx, cx - R * 1.18, cy + R * 0.62, r * 0.85, '#B14BFF', 0.5);
  ctx.strokeStyle = 'rgba(177,75,255,.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - R * 0.7, cy + R * 0.4);
  ctx.lineTo(cx - R * 1.05, cy + R * 0.56);
  ctx.stroke();
}
