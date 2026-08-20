// MAGOT : vignette du menu (drawPreview). Tas d'or central, caisses,
// porteurs ralentis et tacle imminent.

const TAU = Math.PI * 2;

function coin(ctx, x, y, r, star = false) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = star ? '#FFF3B0' : '#FFC93C';
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,10,38,.45)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  if (star) {
    ctx.font = `${Math.round(r * 1.3)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7a4c00';
    ctx.fillText('★', x, y + r * 0.5);
  }
}

function joueur(ctx, x, y, r, a, color, carry) {
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.85, r * 1.05, r * 0.38, 0, 0, TAU);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fill();
  if (carry) {
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, TAU);
    ctx.strokeStyle = 'rgba(255,201,60,.55)';
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,10,38,.5)';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.28, 0, TAU);
  ctx.fillStyle = '#F5EFE6';
  ctx.fill();
}

export function drawPreview(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#140A26');
  g.addColorStop(1, '#221240');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,201,60,.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(w * 0.03, h * 0.06, w * 0.94, h * 0.88);

  const cx = w * 0.5, cy = h * 0.5;

  // Le tas central qui fait rêver.
  ctx.beginPath();
  ctx.arc(cx, cy, h * 0.3, 0, TAU);
  ctx.fillStyle = 'rgba(255,201,60,.08)';
  ctx.fill();
  for (let i = 0; i < 14; i++) {
    const ga = i * 2.399963;
    const gr = h * 0.05 + (i % 5) * h * 0.045;
    coin(ctx, cx + Math.cos(ga) * gr, cy + Math.sin(ga) * gr * 0.7, h * 0.05);
  }
  coin(ctx, cx + w * 0.16, cy + h * 0.18, h * 0.062, true);

  // Deux caisses rivales.
  for (const [fx, fy, color, n] of [[0.12, 0.24, '#FF3D8A', 7], [0.88, 0.72, '#29D9FF', 4]]) {
    ctx.beginPath();
    ctx.arc(fx * w, fy * h, h * 0.15, 0, TAU);
    ctx.fillStyle = 'rgba(20,10,38,.55)';
    ctx.fill();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `800 ${Math.round(h * 0.12)}px Rubik, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(String(n), fx * w, fy * h + h * 0.045);
  }

  // Un porteur chargé qui fuit, un tacleur qui arrive.
  joueur(ctx, w * 0.3, h * 0.64, h * 0.075, Math.PI * 0.9, '#FF3D8A', true);
  ctx.font = `800 ${Math.round(h * 0.09)}px Rubik, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFC93C';
  ctx.fillText('×6', w * 0.3 + h * 0.14, h * 0.62);
  joueur(ctx, w * 0.46, h * 0.78, h * 0.075, Math.PI * 0.95, '#29D9FF', false);
  // Traînée de charge du tacleur.
  ctx.strokeStyle = 'rgba(41,217,255,.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.56, h * 0.84);
  ctx.lineTo(w * 0.5, h * 0.8);
  ctx.stroke();
}
