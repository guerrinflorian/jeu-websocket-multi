// SERPENTIN : vignette du menu (drawPreview). Scène statique : trois
// serpentins néon qui s'entrecroisent sur la piste nocturne.

const TAU = Math.PI * 2;

function trail(ctx, pts, color) {
  for (const [width, alpha] of [[9, 0.1], [5, 0.25], [2.4, 0.95]]) {
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 4) {
      ctx.quadraticCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3]);
    }
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function head(ctx, x, y, a, color) {
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(x, y, 3.4, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6);
  ctx.lineTo(x + Math.cos(a + 2.5) * 3.6, y + Math.sin(a + 2.5) * 3.6);
  ctx.lineTo(x + Math.cos(a - 2.5) * 3.6, y + Math.sin(a - 2.5) * 3.6);
  ctx.closePath();
  ctx.fillStyle = '#F5EFE6';
  ctx.fill();
}

export function drawPreview(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0C0620');
  g.addColorStop(1, '#1E1038');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Étoiles.
  ctx.fillStyle = 'rgba(245,239,230,.35)';
  for (const [fx, fy] of [[0.12, 0.14], [0.3, 0.08], [0.55, 0.16], [0.82, 0.1], [0.93, 0.3], [0.68, 0.06]]) {
    ctx.fillRect(fx * w, fy * h, 1.4, 1.4);
  }

  // Bord de piste néon.
  ctx.strokeStyle = 'rgba(41,217,255,.5)';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(w * 0.045, h * 0.08, w * 0.91, h * 0.84);

  // Trois serpentins qui se cherchent des noises.
  trail(ctx, [
    w * 0.1, h * 0.75,
    w * 0.3, h * 0.85, w * 0.42, h * 0.6,
    w * 0.5, h * 0.42, w * 0.66, h * 0.5,
  ], '#FF3D8A');
  head(ctx, w * 0.66, h * 0.5, -0.3, '#FF3D8A');

  trail(ctx, [
    w * 0.9, h * 0.2,
    w * 0.66, h * 0.14, w * 0.58, h * 0.34,
    w * 0.5, h * 0.56, w * 0.34, h * 0.4,
  ], '#29D9FF');
  head(ctx, w * 0.34, h * 0.4, Math.PI * 0.85, '#29D9FF');

  trail(ctx, [
    w * 0.16, h * 0.22,
    w * 0.36, h * 0.18, w * 0.44, h * 0.26,
    w * 0.55, h * 0.36, w * 0.75, h * 0.72,
  ], '#FFC93C');
  head(ctx, w * 0.75, h * 0.72, 0.9, '#FFC93C');

  // Petit éclat de collision imminente.
  ctx.fillStyle = '#F5EFE6';
  const sx = w * 0.44, sy = h * 0.47;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    ctx.fillRect(sx + Math.cos(a) * 6 - 1, sy + Math.sin(a) * 6 - 1, 2, 2);
  }
}
