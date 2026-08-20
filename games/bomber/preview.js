// BOMBER : vignette d apercu (menus). Bombe noire, meche allumee, syllabe
// en grand et coeurs. Statique, 16:9.

const TAU = Math.PI * 2;

export function drawPreview(ctx, w, h) {
  // Fond de nuit foraine.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#2A1436');
  g.addColorStop(1, '#140A26');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Halo de chaleur.
  const halo = ctx.createRadialGradient(w * 0.42, h * 0.58, h * 0.05, w * 0.42, h * 0.58, h * 0.72);
  halo.addColorStop(0, 'rgba(255,122,61,.32)');
  halo.addColorStop(1, 'rgba(255,122,61,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  const R = h * 0.32;
  const cx = w * 0.42, cy = h * 0.6;

  // Ombre.
  ctx.beginPath();
  ctx.ellipse(cx, cy + R * 1.05, R * 0.9, R * 0.22, 0, 0, TAU);
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.fill();

  // Sphere.
  const sg = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
  sg.addColorStop(0, '#4A4258');
  sg.addColorStop(0.45, '#241B2F');
  sg.addColorStop(1, '#0C0714');
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,71,87,.5)';
  ctx.lineWidth = Math.max(1.5, h * 0.014);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx - R * 0.36, cy - R * 0.42, R * 0.2, R * 0.12, -0.6, 0, TAU);
  ctx.fillStyle = 'rgba(245,239,230,.22)';
  ctx.fill();

  // Meche et etincelle.
  const colX = cx + R * 0.42, colY = cy - R * 0.82;
  ctx.strokeStyle = '#C9B79A';
  ctx.lineWidth = Math.max(2, R * 0.09);
  ctx.beginPath();
  ctx.moveTo(colX, colY);
  ctx.quadraticCurveTo(colX + R * 0.5, colY - R * 0.45, colX + R * 0.3, colY - R * 0.9);
  ctx.stroke();
  const sx = colX + R * 0.3, sy = colY - R * 0.9;
  const eg = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * 0.34);
  eg.addColorStop(0, '#FFF3C4');
  eg.addColorStop(0.4, '#FFC93C');
  eg.addColorStop(1, 'rgba(255,122,61,0)');
  ctx.fillStyle = eg;
  ctx.beginPath();
  ctx.arc(sx, sy, R * 0.34, 0, TAU);
  ctx.fill();

  // La syllabe.
  ctx.font = `${Math.round(R * 0.68)}px Bungee, Rubik, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.strokeStyle = 'rgba(16,8,32,.85)';
  ctx.lineWidth = Math.max(3, R * 0.1);
  ctx.strokeText('TRA', cx, cy + R * 0.24);
  ctx.fillStyle = '#F5EFE6';
  ctx.fillText('TRA', cx, cy + R * 0.24);

  // Coeurs a droite.
  const cr = h * 0.075;
  for (let i = 0; i < 3; i++) {
    const x = w * 0.83, y = h * 0.3 + i * cr * 2.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, cr * 0.95);
    ctx.bezierCurveTo(-cr * 1.35, cr * 0.1, -cr * 0.95, -cr * 0.95, 0, -cr * 0.35);
    ctx.bezierCurveTo(cr * 0.95, -cr * 0.95, cr * 1.35, cr * 0.1, 0, cr * 0.95);
    ctx.fillStyle = i < 2 ? '#FF3D6E' : 'rgba(255,61,110,.2)';
    ctx.fill();
    ctx.restore();
  }
}
