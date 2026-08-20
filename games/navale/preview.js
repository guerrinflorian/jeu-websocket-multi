// NAVALE : vignette du menu (drawPreview). Grille marine, navire, impact.

export function drawPreview(ctx, w, h) {
  const TAU = Math.PI * 2;
  // Mer de nuit
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#102142');
  g.addColorStop(1, '#0D1B33');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Grille
  const n = 6;
  const size = h * 0.78;
  const cs = size / n;
  const gx = w * 0.08, gy = (h - size) / 2;
  ctx.strokeStyle = 'rgba(41,217,255,.25)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= n; i++) {
    ctx.beginPath();
    ctx.moveTo(gx + i * cs, gy);
    ctx.lineTo(gx + i * cs, gy + size);
    ctx.moveTo(gx, gy + i * cs);
    ctx.lineTo(gx + size, gy + i * cs);
    ctx.stroke();
  }

  // Navire horizontal de 3 cases
  ctx.fillStyle = '#8FA3BF';
  const sx = gx + cs * 1, sy = gy + cs * 1;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(sx + 2, sy + cs * 0.18, cs * 3 - 4, cs * 0.64, cs * 0.3)
    : ctx.rect(sx + 2, sy + cs * 0.18, cs * 3 - 4, cs * 0.64);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,10,38,.35)';
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.arc(sx + cs * (k + 0.5), sy + cs * 0.5, cs * 0.09, 0, TAU);
    ctx.fill();
  }

  // Touché : croix orange + halo sur le navire
  const hx = gx + cs * 2.5, hy = gy + cs * 1.5;
  ctx.strokeStyle = '#FF7A3D';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(hx - cs * 0.24, hy - cs * 0.24);
  ctx.lineTo(hx + cs * 0.24, hy + cs * 0.24);
  ctx.moveTo(hx + cs * 0.24, hy - cs * 0.24);
  ctx.lineTo(hx - cs * 0.24, hy + cs * 0.24);
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU;
    ctx.fillStyle = i % 2 ? '#FF7A3D' : '#FFC93C';
    ctx.fillRect(hx + Math.cos(a) * cs * 0.55 - 1.5, hy + Math.sin(a) * cs * 0.55 - 1.5, 3, 3);
  }

  // Manqué : rond bleu
  ctx.strokeStyle = '#4D7CFF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(gx + cs * 4.5, gy + cs * 3.5, cs * 0.18, 0, TAU);
  ctx.stroke();

  // Réticule armé (jaune, pulsé figé)
  const rx = gx + cs * 1.5, ry = gy + cs * 4.5;
  ctx.strokeStyle = '#FFC93C';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(rx, ry, cs * 0.3, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rx - cs * 0.45, ry); ctx.lineTo(rx - cs * 0.16, ry);
  ctx.moveTo(rx + cs * 0.16, ry); ctx.lineTo(rx + cs * 0.45, ry);
  ctx.moveTo(rx, ry - cs * 0.45); ctx.lineTo(rx, ry - cs * 0.16);
  ctx.moveTo(rx, ry + cs * 0.16); ctx.lineTo(rx, ry + cs * 0.45);
  ctx.stroke();

  // Mini-grilles ennemies à droite
  for (let k = 0; k < 2; k++) {
    const ms = h * 0.3;
    const mx = w * 0.66, my = h * 0.12 + k * (ms + h * 0.16);
    ctx.fillStyle = '#0D1B33';
    ctx.strokeStyle = k === 0 ? '#FF3D8A' : 'rgba(41,217,255,.35)';
    ctx.lineWidth = k === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.rect(mx, my, ms * 1.0, ms);
    ctx.fill();
    ctx.stroke();
    // quelques impacts
    ctx.fillStyle = '#FF7A3D';
    ctx.fillRect(mx + ms * 0.3, my + ms * 0.3, 3, 3);
    ctx.fillStyle = '#4D7CFF';
    ctx.fillRect(mx + ms * 0.6, my + ms * 0.55, 3, 3);
    ctx.fillRect(mx + ms * 0.2, my + ms * 0.7, 3, 3);
  }

  // Titre d'ambiance
  ctx.font = `800 ${Math.round(h * 0.09)}px Rubik, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(245,239,230,.75)';
  ctx.fillText('TOUCHÉ !', w * 0.71, h * 0.93);
}
