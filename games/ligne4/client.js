// LIGNE 4 : rendu client. Machine à jetons foraine : grille percée néon,
// jetons qui tombent avec rebond, ghost de visée, ligne gagnante en fête.

import meta from './meta.js';

const AW = meta.arena.w, AH = meta.arena.h;
const GRAV = 3400;
const TEAM_COLORS = ['#FF3D8A', '#29D9FF', '#FFC93C', '#3DFF8A'];

export function createClient({ ctx, helpers, config, you, send }) {
  const { t, juice, sfx, TAU, shapes } = helpers;
  const byTeam = config.format.kind !== 'ffa';
  const teamIdxOf = {};
  config.teams.forEach((tm, i) => tm.forEach((pid) => { teamIdxOf[pid] = i; }));
  const anims = [];         // jetons en train de tomber
  let lastView = null;
  let hoverCol = -1;
  let winCells = null;
  let winT = 0;
  let lastTurnPid = null;
  let endBanner = null;     // { text, color } affiché pendant la phase 'end'

  // Arène adaptée à l'orientation : la grille reste grande sur mobile
  // en portrait (le serveur ne reçoit que des act 'drop', jamais de coords).
  function dims() {
    const { w, h } = helpers.size();
    return h > w * 1.05 ? { aw: 640, ah: 940 } : { aw: AW, ah: AH };
  }

  function layout(v) {
    const A = dims();
    const portrait = A.ah > A.aw;
    const availW = portrait ? A.aw - 50 : 780;
    const availH = portrait ? A.ah - 330 : 470;
    const cell = Math.min(availW / v.cols, availH / v.rows);
    const bw = cell * v.cols, bh = cell * v.rows;
    return {
      A, cell, bw, bh,
      bx: (A.aw - bw) / 2,
      by: (portrait ? 170 : 118) + (availH - bh) / 2,
    };
  }

  function campLabel(teamIdx) {
    if (!byTeam) {
      const pid = config.teams[teamIdx]?.[0];
      return config.players[pid]?.name || '?';
    }
    return `l'équipe ${shapes[teamIdx % shapes.length]}`;
  }

  function discColor(seatPid) {
    if (byTeam) return TEAM_COLORS[teamIdxOf[seatPid] % TEAM_COLORS.length];
    return config.players[seatPid]?.color || '#888';
  }

  function parseBoard(v) {
    return v.board.split(';').map((row) => row.split(',').map(Number));
  }

  function drawDisc(c2, x, y, r, color, shapeIdx = -1) {
    c2.beginPath();
    c2.arc(x, y + r * 0.16, r, 0, TAU);
    c2.fillStyle = 'rgba(0,0,0,.35)';
    c2.fill();
    const g = c2.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(0.18, color);
    g.addColorStop(1, color);
    c2.beginPath();
    c2.arc(x, y, r, 0, TAU);
    c2.fillStyle = g;
    c2.fill();
    c2.beginPath();
    c2.arc(x, y, r * 0.62, 0, TAU);
    c2.strokeStyle = 'rgba(20,10,38,.4)';
    c2.lineWidth = r * 0.14;
    c2.stroke();
    if (shapeIdx >= 0) {
      c2.font = `${r * 0.8}px system-ui, sans-serif`;
      c2.textAlign = 'center';
      c2.fillStyle = 'rgba(20,10,38,.55)';
      c2.fillText(shapes[shapeIdx % shapes.length], x, y + r * 0.3);
    }
  }

  return {
    onTap(x, y, phase) {
      const v = lastView;
      if (!v || v.turn !== you) { hoverCol = -1; return; }
      const L = layout(v);
      const vp = helpers.viewport(L.A.aw, L.A.ah, 10);
      const w = vp.toWorld(x, y);
      const c = Math.floor((w.x - L.bx) / L.cell);
      const inX = c >= 0 && c < v.cols;
      if (phase === 'start' || phase === 'move') {
        hoverCol = inX ? c : -1;
      } else if (phase === 'end') {
        if (inX && w.y > L.by - 90 && w.y < L.by + L.bh + 40) {
          send.act('drop', { c });
          sfx.play('click');
        }
        hoverCol = -1;
      }
    },

    onEvents(evs, view) {
      const v = view?.latest;
      const L = v ? layout(v) : null;
      for (const ev of evs) {
        if (ev.e === 'drop') {
          if (L) {
            anims.push({ c: ev.c, r: ev.r, seat: ev.seat, y: L.by - L.cell * 0.8, v: 260, t: 0, bounced: false });
          }
          sfx.play('pion');
        } else if (ev.e === 'turn') {
          lastTurnPid = ev.pid;
          if (ev.pid === you && L) {
            sfx.play('ready');
            juice.floater(L.A.aw / 2, L.by - 52, 'À TOI !', { color: '#3DFF8A', size: 22 });
          }
        } else if (ev.e === 'win') {
          winCells = ev.cells;
          winT = 0;
          sfx.play('win');
          const color = discColor(ev.pid);
          endBanner = { text: `MANCHE POUR ${campLabel(ev.team).toUpperCase()} !`, color };
          if (L) {
            const [c0, r0] = ev.cells[0];
            juice.confetti(L.bx + (c0 + 0.5) * L.cell, L.by + (r0 + 0.5) * L.cell, [color, '#FFC93C', '#F5EFE6'], 60);
          }
          juice.shake(6);
        } else if (ev.e === 'full') {
          sfx.play('klaxon');
          endBanner = ev.team == null
            ? { text: 'GRILLE PLEINE : ÉGALITÉ !', color: '#FFC93C' }
            : { text: `GRILLE PLEINE : MANCHE POUR ${campLabel(ev.team).toUpperCase()} !`, color: '#FFC93C' };
        } else if (ev.e === 'round') {
          anims.length = 0;
          winCells = null;
          endBanner = null;
        }
      }
    },

    render(view, dt) {
      const v = view.latest;
      lastView = v;
      const { w, h } = helpers.size();
      helpers.bg(ctx);
      const L = layout(v);
      const vp = helpers.viewport(L.A.aw, L.A.ah, 10);
      ctx.save();
      vp.apply(ctx);

      const board = parseBoard(v);
      const rad = L.cell * 0.4;

      // Pieds de la machine.
      ctx.fillStyle = '#1A0F30';
      ctx.fillRect(L.bx + 18, L.by + L.bh, 26, 34);
      ctx.fillRect(L.bx + L.bw - 44, L.by + L.bh, 26, 34);

      // Bâti : panneau nuit + liseré néon du jeu.
      const M = L.cell * 0.35;
      roundRect(ctx, L.bx - M, L.by - M, L.bw + M * 2, L.bh + M * 2, 18);
      ctx.fillStyle = '#241448';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = v.turn === you ? '#3DFF8A' : meta.color;
      ctx.stroke();

      // Guirlande d'ampoules sur le fronton.
      const nb = Math.max(6, Math.floor(L.bw / 46));
      for (let i = 0; i <= nb; i++) {
        const x = L.bx - M + ((L.bw + M * 2) * i) / nb;
        const on = (Math.floor(performance.now() / 400) + i) % 2 === 0;
        ctx.beginPath();
        ctx.arc(x, L.by - M - 8, on ? 3.4 : 2.6, 0, TAU);
        ctx.fillStyle = on ? '#FFC93C' : 'rgba(255,201,60,.25)';
        ctx.fill();
      }

      // Colonne visée / survolée.
      if (hoverCol >= 0 && v.turn === you && v.phase === 'turn') {
        ctx.fillStyle = 'rgba(245,239,230,.07)';
        ctx.fillRect(L.bx + hoverCol * L.cell, L.by - M, L.cell, L.bh + M * 2);
        drawDisc(ctx, L.bx + (hoverCol + 0.5) * L.cell, L.by - M - 26, rad * 0.9, discColor(you), byTeam ? teamIdxOf[you] : -1);
      }

      // Cases percées + jetons posés.
      const hidden = new Set(anims.map((a) => `${a.c},${a.r}`));
      for (let r = 0; r < v.rows; r++) {
        for (let c = 0; c < v.cols; c++) {
          const cx = L.bx + (c + 0.5) * L.cell;
          const cy = L.by + (r + 0.5) * L.cell;
          ctx.beginPath();
          ctx.arc(cx, cy, rad + 2, 0, TAU);
          ctx.fillStyle = '#140A26';
          ctx.fill();
          ctx.strokeStyle = 'rgba(185,168,208,.16)';
          ctx.lineWidth = 1.4;
          ctx.stroke();
          const seat = board[r][c];
          if (seat >= 0 && !hidden.has(`${c},${r}`)) {
            const pid = v.seats[seat];
            drawDisc(ctx, cx, cy, rad, discColor(pid), byTeam ? teamIdxOf[pid] : -1);
          }
        }
      }

      // Jetons en chute (gravité + rebond).
      for (let i = anims.length - 1; i >= 0; i--) {
        const a = anims[i];
        const targetY = L.by + (a.r + 0.5) * L.cell;
        a.v += GRAV * dt;
        a.y += a.v * dt;
        if (a.y >= targetY) {
          a.y = targetY;
          if (!a.bounced && a.v > 320) {
            a.v = -a.v * 0.3;
            a.bounced = true;
            sfx.play('hit');
            juice.burst(L.bx + (a.c + 0.5) * L.cell, targetY + rad, { n: 5, color: '#FFC93C', speed: 90, life: 0.3, size: 2 });
          } else {
            anims.splice(i, 1);
            continue;
          }
        }
        const pid = v.seats[a.seat];
        drawDisc(ctx, L.bx + (a.c + 0.5) * L.cell, a.y, rad, discColor(pid), byTeam ? teamIdxOf[pid] : -1);
      }

      // Ligne gagnante qui pulse.
      if (winCells) {
        winT += dt;
        const pulse = 0.6 + 0.4 * Math.sin(winT * 9);
        for (const [c, r] of winCells) {
          ctx.beginPath();
          ctx.arc(L.bx + (c + 0.5) * L.cell, L.by + (r + 0.5) * L.cell, rad + 4, 0, TAU);
          ctx.strokeStyle = `rgba(245,239,230,${pulse})`;
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      }
      if (v.phase !== 'end') winCells = null;

      juice.drawWorld(ctx);
      ctx.restore();

      // ── HUD ──
      ctx.textAlign = 'center';
      ctx.font = '16px Bungee, sans-serif';
      ctx.fillStyle = '#B9A8D0';
      ctx.fillText(`${t('game.round', { n: `${v.round}/${v.rounds}` })}`, w / 2, 26);

      // Scores par camp.
      const nT = config.teams.length;
      const chipW = Math.min(64, (w - 40) / nT);
      const x0 = w / 2 - (nT * chipW) / 2 + chipW / 2;
      config.teams.forEach((tm, i) => {
        const cx = x0 + i * chipW;
        const color = byTeam ? TEAM_COLORS[i % TEAM_COLORS.length] : (config.players[tm[0]]?.color || '#888');
        ctx.beginPath();
        ctx.arc(cx - 14, 46, 7, 0, TAU);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.font = '800 16px Rubik, sans-serif';
        ctx.fillStyle = '#F5EFE6';
        ctx.textAlign = 'left';
        ctx.fillText(String(v.scores[i]), cx - 3, 51);
        ctx.textAlign = 'center';
      });

      // Tour en cours + chrono.
      if (v.phase === 'turn' && v.turn) {
        const p = config.players[v.turn];
        const mine = v.turn === you;
        ctx.font = '800 15px Rubik, sans-serif';
        ctx.fillStyle = p?.color || '#F5EFE6';
        ctx.fillText(mine ? 'À TOI DE JOUER' : `Au tour de ${p?.name || '?'}`, w / 2, 72);
        // Barre de temps.
        const frac = Math.max(0, Math.min(1, v.tl / 10));
        const bw = 150;
        ctx.fillStyle = 'rgba(185,168,208,.25)';
        ctx.fillRect(w / 2 - bw / 2, 80, bw, 5);
        ctx.fillStyle = v.tl < 3 ? '#FF4757' : '#3DFF8A';
        ctx.fillRect(w / 2 - bw / 2, 80, bw * frac, 5);
        if (mine && v.tl < 3 && Math.floor(performance.now() / 300) % 2 === 0) {
          ctx.strokeStyle = 'rgba(255,71,87,.5)';
          ctx.lineWidth = 6;
          ctx.strokeRect(3, 3, w - 6, h - 6);
        }
        if (mine) {
          ctx.font = '600 14px Rubik, sans-serif';
          ctx.fillStyle = '#B9A8D0';
          ctx.fillText('Touche une colonne pour lâcher ton jeton', w / 2, h - 20);
        }
      }
      if (v.phase === 'pre') {
        ctx.font = 'bold 36px Bungee, sans-serif';
        ctx.fillStyle = meta.color;
        ctx.fillText('LIGNE 4 !', w / 2, h / 2 - 30);
      }
      // Bannière de fin de manche : qui a pris le point, bien en évidence.
      if (v.phase === 'end' && endBanner) {
        const pulse = 1 + 0.03 * Math.sin(performance.now() / 140);
        ctx.save();
        ctx.translate(w / 2, h / 2 - 40);
        ctx.scale(pulse, pulse);
        ctx.font = `bold ${Math.min(26, w / 18)}px Bungee, sans-serif`;
        ctx.strokeStyle = 'rgba(20,10,38,.85)';
        ctx.lineWidth = 6;
        ctx.strokeText(endBanner.text, 0, 0);
        ctx.fillStyle = endBanner.color;
        ctx.fillText(endBanner.text, 0, 0);
        ctx.restore();
      }
    },

    destroy() {
      anims.length = 0;
    },
  };
}

function roundRect(c2, x, y, w, h, r) {
  c2.beginPath();
  c2.moveTo(x + r, y);
  c2.arcTo(x + w, y, x + w, y + h, r);
  c2.arcTo(x + w, y + h, x, y + h, r);
  c2.arcTo(x, y + h, x, y, r);
  c2.arcTo(x, y, x + w, y, r);
  c2.closePath();
}
