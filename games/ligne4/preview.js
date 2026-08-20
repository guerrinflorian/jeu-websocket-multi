// LIGNE 4 : vignette du menu. Grille lumineuse avec une diagonale gagnante.

export function drawPreview(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#241245');
  g.addColorStop(1, '#140A26');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const cols = 7, rows = 5;
  const cell = Math.min((w * 0.78) / cols, (h * 0.82) / rows);
  const bw = cell * cols, bh = cell * rows;
  const bx = (w - bw) / 2, by = (h - bh) / 2 + h * 0.03;

  // Bâti néon.
  rr(ctx, bx - 6, by - 6, bw + 12, bh + 12, 8);
  ctx.fillStyle = '#241448';
  ctx.fill();
  ctx.strokeStyle = '#FF3D8A';
  ctx.lineWidth = 2;
  ctx.stroke();

  // -1 vide, 0 rose, 1 cyan, 2 jaune. Diagonale rose gagnante.
  const B = [
    [-1, -1, -1, -1, -1, -1, -1],
    [-1, -1, -1, 0, -1, -1, -1],
    [-1, -1, 0, 1, 2, -1, -1],
    [-1, 0, 1, 2, 1, -1, -1],
    [0, 1, 2, 1, 0, 1, -1],
  ];
  const colors = ['#FF3D8A', '#29D9FF', '#FFC93C'];
  const winCells = [[0, 4], [1, 3], [2, 2], [3, 1]];
  const isWin = (c, r) => winCells.some(([wc, wr]) => wc === c && wr === r);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = bx + (c + 0.5) * cell;
      const cy = by + (r + 0.5) * cell;
      const rad = cell * 0.38;
      ctx.beginPath();
      ctx.arc(cx, cy, rad + 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#140A26';
      ctx.fill();
      const s = B[r][c];
      if (s >= 0) {
        const rg = ctx.createRadialGradient(cx - rad * 0.35, cy - rad * 0.4, rad * 0.1, cx, cy, rad);
        rg.addColorStop(0, '#FFFFFF');
        rg.addColorStop(0.2, colors[s]);
        rg.addColorStop(1, colors[s]);
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fillStyle = rg;
        ctx.fill();
        if (isWin(c, r)) {
          ctx.beginPath();
          ctx.arc(cx, cy, rad + 1.6, 0, Math.PI * 2);
          ctx.strokeStyle = '#F5EFE6';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#FF3D8A';
          ctx.shadowBlur = 6;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }
    }
  }

  // Jeton en chute au-dessus de la grille.
  const dropX = bx + 5.5 * cell;
  ctx.beginPath();
  ctx.arc(dropX, by - cell * 0.35, cell * 0.34, 0, Math.PI * 2);
  ctx.fillStyle = '#FF3D8A';
  ctx.fill();
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
