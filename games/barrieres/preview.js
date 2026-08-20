// BARRIÈRES : vignette du menu. Plateau quadrillé, deux pions face à face,
// une barrière rayée danger au milieu.

export function drawPreview(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#241245');
  g.addColorStop(1, '#140A26');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const cols = 7, rows = 5;
  const cell = Math.min((w * 0.72) / cols, (h * 0.8) / rows);
  const bw = cell * cols, bh = cell * rows;
  const bx = (w - bw) / 2, by = (h - bh) / 2 + h * 0.02;

  rr(ctx, bx - 5, by - 5, bw + 10, bh + 10, 6);
  ctx.fillStyle = '#241448';
  ctx.fill();
  ctx.strokeStyle = '#FF4757';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Cases + lignes de base teintées.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rr(ctx, bx + c * cell + 1.2, by + r * cell + 1.2, cell - 2.4, cell - 2.4, 2.5);
      ctx.fillStyle = (c + r) % 2 === 0 ? '#1B0F33' : '#180D2E';
      ctx.fill();
    }
  }
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#FF3D8A';
  ctx.fillRect(bx, by + (rows - 1) * cell, bw, cell);
  ctx.fillStyle = '#29D9FF';
  ctx.fillRect(bx, by, bw, cell);
  ctx.globalAlpha = 1;

  // Barrière rayée (horizontale, 2 cases de large).
  const wallX = bx + 2 * cell + 2, wallY = by + 2 * cell - cell * 0.13;
  const wallW = cell * 2 - 4, wallH = cell * 0.26;
  ctx.save();
  ctx.shadowColor = '#FF4757';
  ctx.shadowBlur = 6;
  rr(ctx, wallX, wallY, wallW, wallH, wallH * 0.4);
  ctx.fillStyle = '#F5EFE6';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.clip();
  ctx.fillStyle = '#FF4757';
  const step = wallH * 1.2;
  for (let i = -1; i < wallW / step + 1; i++) {
    ctx.beginPath();
    ctx.moveTo(wallX + i * step, wallY);
    ctx.lineTo(wallX + i * step + step * 0.55, wallY);
    ctx.lineTo(wallX + i * step + step * 0.55 - wallH, wallY + wallH);
    ctx.lineTo(wallX + i * step - wallH, wallY + wallH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Pions : rose (bas) qui monte, cyan (haut) qui descend.
  const pawn = (c, r, color, arrow) => {
    const cx = bx + (c + 0.5) * cell, cy = by + (r + 0.5) * cell;
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.34, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,10,38,.55)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.font = `800 ${cell * 0.34}px Rubik, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(20,10,38,.6)';
    ctx.fillText(arrow, cx, cy + cell * 0.12);
  };
  pawn(2, 3, '#FF3D8A', '▲');
  pawn(4, 1, '#29D9FF', '▼');
  pawn(5, 2, '#FFC93C', '▲');
}

function rr(c2, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  c2.beginPath();
  c2.moveTo(x + k, y);
  c2.arcTo(x + w, y, x + w, y + h, k);
  c2.arcTo(x + w, y + h, x, y + h, k);
  c2.arcTo(x, y + h, x, y, k);
  c2.arcTo(x, y, x + w, y, k);
  c2.closePath();
}
