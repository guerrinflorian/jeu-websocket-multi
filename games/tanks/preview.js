// TANKS : vignette d'apercu (menus). Un bout d'arene vue de dessus, deux
// chars, un obus et sa ligne de rebond. Statique, 16:9.

const TAU = Math.PI * 2;

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function char(g, x, y, r, col, a, ta) {
  g.save();
  g.beginPath();
  g.ellipse(x + 2, y + r * 0.5, r * 1.05, r * 0.6, 0, 0, TAU);
  g.fillStyle = 'rgba(0,0,0,.4)';
  g.fill();
  g.translate(x, y);
  g.save();
  g.rotate(a);
  g.fillStyle = '#1A1424';
  roundRect(g, -r * 0.95, -r, r * 1.9, r * 0.5, 2);
  g.fill();
  roundRect(g, -r * 0.95, r * 0.5, r * 1.9, r * 0.5, 2);
  g.fill();
  g.fillStyle = col;
  roundRect(g, -r * 0.8, -r * 0.58, r * 1.6, r * 1.16, 3);
  g.fill();
  g.restore();
  g.save();
  g.rotate(ta);
  g.fillStyle = 'rgba(0,0,0,.55)';
  g.fillRect(r * 0.2, -r * 0.16, r * 1.1, r * 0.32);
  g.restore();
  g.beginPath();
  g.arc(0, 0, r * 0.6, 0, TAU);
  g.fillStyle = col;
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,.5)';
  g.lineWidth = 1;
  g.stroke();
  g.restore();
}

export function drawPreview(ctx, w, h) {
  const fond = ctx.createLinearGradient(0, 0, 0, h);
  fond.addColorStop(0, '#1C2B22');
  fond.addColorStop(1, '#121C16');
  ctx.fillStyle = fond;
  ctx.fillRect(0, 0, w, h);

  const c = h / 4.2;                    // taille d'une case
  ctx.strokeStyle = 'rgba(245,239,230,.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += c) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += c) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Trois blocs en volume.
  const H = Math.max(3, h * 0.07);
  const murs = [[c * 1.2, c * 0.6], [c * 3.4, c * 2.3], [c * 5.6, c * 0.9]];
  for (const [x, y] of murs) {
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(x + 3, y + 4, c, c);
    const face = ctx.createLinearGradient(0, y + c - H, 0, y + c);
    face.addColorStop(0, '#4A3A63');
    face.addColorStop(1, '#241A38');
    ctx.fillStyle = face;
    ctx.fillRect(x, y + c - H, c, H);
    const top = ctx.createLinearGradient(x, y - H, x, y + c - H);
    top.addColorStop(0, '#6B5590');
    top.addColorStop(1, '#4A3A63');
    ctx.fillStyle = top;
    ctx.fillRect(x, y - H, c, c);
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.strokeRect(x + 0.5, y - H + 0.5, c - 1, c - 1);
  }

  // Ligne de visee avec son rebond.
  ctx.save();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = 'rgba(255,201,60,.65)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(c * 1.1, h * 0.78);
  ctx.lineTo(c * 3.3, h * 0.34);
  ctx.lineTo(c * 5.4, h * 0.76);
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(c * 3.3, h * 0.34, 3.5, 0, TAU);
  ctx.fillStyle = 'rgba(255,201,60,.9)';
  ctx.fill();

  char(ctx, c * 0.9, h * 0.8, h * 0.12, '#3DFF8A', -0.4, -0.45);
  char(ctx, c * 5.6, h * 0.78, h * 0.12, '#FF3D8A', 2.6, 2.5);

  // Un obus en vol.
  const g = ctx.createRadialGradient(c * 2.4 - 2, h * 0.53 - 2, 1, c * 2.4, h * 0.53, h * 0.06);
  g.addColorStop(0, '#FFF6D8');
  g.addColorStop(1, '#FFC93C');
  ctx.beginPath();
  ctx.arc(c * 2.4, h * 0.53, h * 0.05, 0, TAU);
  ctx.fillStyle = g;
  ctx.fill();
}
