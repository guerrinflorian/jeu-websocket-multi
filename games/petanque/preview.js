// PÉTANQUE : vignette du menu (scène statique dessinée au Canvas).

export function drawPreview(ctx, w, h) {
  const TAU = Math.PI * 2;

  // Gravier nocturne.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#31234E');
  g.addColorStop(1, '#1D1134');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Mouchetis déterministe.
  let seed = 42;
  const rand = () => {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 70; i++) {
    ctx.globalAlpha = 0.05 + rand() * 0.12;
    ctx.fillStyle = rand() < 0.25 ? '#FFC93C' : '#B9A8D0';
    ctx.fillRect(rand() * w, rand() * h, 1.4, 1.4);
  }
  ctx.globalAlpha = 1;

  // Bordure bois.
  ctx.strokeStyle = '#4E3722';
  ctx.lineWidth = Math.max(4, h * 0.07);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);

  // Guirlande de lampions.
  const cols = ['#FF3D8A', '#29D9FF', '#FFC93C'];
  for (let i = 0; i <= 6; i++) {
    const x = w * 0.08 + (i / 6) * w * 0.84;
    const y = h * 0.12 + Math.sin((i / 6) * Math.PI) * h * 0.06;
    ctx.fillStyle = cols[i % 3];
    ctx.globalAlpha = i % 2 ? 0.5 : 0.95;
    ctx.beginPath();
    ctx.arc(x, y, h * 0.035, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const jx = w * 0.6, jy = h * 0.5;

  // Cercle de mesure.
  ctx.setLineDash([6, 5]);
  ctx.strokeStyle = 'rgba(255,201,60,.4)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(jx, jy, h * 0.32, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);

  // Cochonnet.
  const glow = ctx.createRadialGradient(jx, jy, 1, jx, jy, h * 0.14);
  glow.addColorStop(0, 'rgba(255,201,60,.5)');
  glow.addColorStop(1, 'rgba(255,201,60,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(jx, jy, h * 0.14, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#FFE45E';
  ctx.beginPath();
  ctx.arc(jx, jy, h * 0.045, 0, TAU);
  ctx.fill();

  // Boules métalliques striées.
  const boule = (x, y, r, col) => {
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.8, r * 1.05, r * 0.4, 0, 0, TAU);
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.fill();
    const mg = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.15, x, y, r * 1.15);
    mg.addColorStop(0, '#F2F2F6');
    mg.addColorStop(0.45, '#AEB2C2');
    mg.addColorStop(1, '#565A6E');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = mg;
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1.4, r * 0.16);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.6, -0.6, 1.0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.6, Math.PI - 0.6, Math.PI + 1.0);
    ctx.stroke();
  };
  const r = h * 0.085;
  boule(jx - h * 0.22, jy + h * 0.1, r, '#FF3D8A');
  boule(jx + h * 0.26, jy - h * 0.08, r, '#29D9FF');
  boule(w * 0.24, h * 0.72, r, '#3DFF8A');
  boule(w * 0.82, h * 0.68, r, '#FF3D8A');

  // Trajectoire de visée.
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = '#3DFF8A';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(w * 0.12, h * 0.92);
  ctx.quadraticCurveTo(w * 0.3, h * 0.7, jx - h * 0.3, jy + h * 0.14);
  ctx.stroke();
  ctx.setLineDash([]);
}
