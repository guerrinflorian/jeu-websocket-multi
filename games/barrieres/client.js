// BARRIÈRES : rendu client. Plateau de chantier forain : rainures, murs
// rayés danger, cases jouables surlignées, ghost de barrière à confirmer.

import meta from './meta.js';

const AW = meta.arena.w, AH = meta.arena.h;
const SIDE_COLORS = ['#FF3D8A', '#29D9FF']; // camp bas, camp haut

export function createClient({ ctx, helpers, config, you, send, controls }) {
  const { t, juice, sfx, TAU } = helpers;
  let lastView = null;
  let wallMode = false;
  let ghost = null;         // { o, x, y }
  let rejectT = 0;
  let rejectMsg = '';
  let endBanner = null;     // { text, color } pendant la phase 'end'

  // Arène adaptée à l'orientation : plateau plein écran en portrait aussi
  // (le serveur ne reçoit que des act 'move'/'wall', jamais de coordonnées).
  function dims() {
    const { w, h } = helpers.size();
    return h > w * 1.05 ? { aw: 640, ah: 940 } : { aw: AW, ah: AH };
  }

  function layout(v) {
    const A = dims();
    const portrait = A.ah > A.aw;
    const availW = portrait ? A.aw - 44 : 760;
    const availH = portrait ? A.ah - 300 : 500;
    const cell = Math.min(availW / v.cols, availH / v.rows);
    const bw = cell * v.cols, bh = cell * v.rows;
    return {
      A, cell, bw, bh,
      bx: (A.aw - bw) / 2,
      by: (portrait ? 150 : 96) + (availH - bh) / 2,
    };
  }

  function campLabel(teamIdx, pid) {
    const team = config.teams[teamIdx] || [];
    if (pid && team.length <= 1) return config.players[pid]?.name || '?';
    if (team.length === 1) return config.players[team[0]]?.name || '?';
    return `le camp ${teamIdx + 1}`;
  }

  function wallsSets(v) {
    return {
      h: new Set(v.wh.map(([x, y]) => `${x},${y}`)),
      v: new Set(v.wv.map(([x, y]) => `${x},${y}`)),
    };
  }

  function blockedEdge(v, W2, x1, y1, x2, y2) {
    if (x1 === x2) {
      const y = Math.min(y1, y2);
      return W2.h.has(`${x1 - 1},${y}`) || W2.h.has(`${x1},${y}`);
    }
    const x = Math.min(x1, x2);
    return W2.v.has(`${x},${y1 - 1}`) || W2.v.has(`${x},${y1}`);
  }

  function legalMoves(v) {
    const me = v.pawns[you];
    if (!me) return [];
    const W2 = wallsSets(v);
    const occ = new Set(Object.values(v.pawns).map((p) => `${p.x},${p.y}`));
    const inG = (x, y) => x >= 0 && y >= 0 && x < v.cols && y < v.rows;
    const out = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = me.x + dx, ny = me.y + dy;
      if (!inG(nx, ny) || blockedEdge(v, W2, me.x, me.y, nx, ny)) continue;
      if (!occ.has(`${nx},${ny}`)) out.push({ x: nx, y: ny, jump: false });
      else {
        const jx = me.x + dx * 2, jy = me.y + dy * 2;
        if (inG(jx, jy) && !blockedEdge(v, W2, nx, ny, jx, jy) && !occ.has(`${jx},${jy}`)) {
          out.push({ x: jx, y: jy, jump: true });
        }
      }
    }
    return out;
  }

  // Rainure la plus proche d'un point monde → candidat de barrière.
  function wallCandidate(v, L, wx, wy) {
    const gx = (wx - L.bx) / L.cell;
    const gy = (wy - L.by) / L.cell;
    if (gx < -0.5 || gy < -0.5 || gx > v.cols + 0.5 || gy > v.rows + 0.5) return null;
    const fx = Math.abs(gx - Math.round(gx));
    const fy = Math.abs(gy - Math.round(gy));
    if (fy <= fx) {
      const y = Math.max(0, Math.min(v.rows - 2, Math.round(gy) - 1));
      const x = Math.max(0, Math.min(v.cols - 2, Math.round(gx) - 1));
      return { o: 'h', x, y };
    }
    const x = Math.max(0, Math.min(v.cols - 2, Math.round(gx) - 1));
    const y = Math.max(0, Math.min(v.rows - 2, Math.round(gy) - 1));
    return { o: 'v', x, y };
  }

  function drawWall(c2, L, o, x, y, alpha = 1, color = meta.color) {
    const th = L.cell * 0.22;
    let px, py, w2, h2;
    if (o === 'h') {
      px = L.bx + x * L.cell + 3;
      py = L.by + (y + 1) * L.cell - th / 2;
      w2 = L.cell * 2 - 6;
      h2 = th;
    } else {
      px = L.bx + (x + 1) * L.cell - th / 2;
      py = L.by + y * L.cell + 3;
      w2 = th;
      h2 = L.cell * 2 - 6;
    }
    c2.save();
    c2.globalAlpha = alpha;
    c2.shadowColor = color;
    c2.shadowBlur = 8;
    rr(c2, px, py, w2, h2, th * 0.4);
    c2.fillStyle = '#F5EFE6';
    c2.fill();
    c2.shadowBlur = 0;
    c2.clip();
    c2.fillStyle = color;
    const step = th * 1.15;
    const len = Math.max(w2, h2);
    for (let i = -1; i < len / step + 1; i++) {
      c2.beginPath();
      c2.moveTo(px + i * step, py);
      c2.lineTo(px + i * step + step * 0.55, py);
      c2.lineTo(px + i * step + step * 0.55 - h2, py + h2);
      c2.lineTo(px + i * step - h2, py + h2);
      c2.closePath();
      c2.fill();
    }
    c2.restore();
  }

  return {
    onButton(id) {
      if (id === 'wallmode') {
        const v = lastView;
        wallMode = !wallMode;
        ghost = null;
        sfx.play('click');
        if (wallMode && v && (v.pawns[you]?.w || 0) <= 0) {
          wallMode = false;
          const L = layout(v);
          juice.floater(L.A.aw / 2, L.by + L.bh / 2, 'PLUS DE BARRIÈRES !', { color: '#FF4757', size: 20 });
        }
        return false; // géré côté client, rien à envoyer
      }
      return false;
    },

    onTap(x, y, phase) {
      const v = lastView;
      if (!v || phase !== 'end' || v.turn !== you) return;
      const L = layout(v);
      const vp = helpers.viewport(L.A.aw, L.A.ah, 10);
      const w = vp.toWorld(x, y);
      if (wallMode) {
        const cand = wallCandidate(v, L, w.x, w.y);
        if (!cand) { ghost = null; return; }
        if (ghost && ghost.o === cand.o && ghost.x === cand.x && ghost.y === cand.y) {
          send.act('wall', ghost);
          sfx.play('click');
          ghost = null;
          wallMode = false;
        } else {
          ghost = cand;
          sfx.play('tickup');
        }
        return;
      }
      const cx = Math.floor((w.x - L.bx) / L.cell);
      const cy = Math.floor((w.y - L.by) / L.cell);
      const mv = legalMoves(v).find((m) => m.x === cx && m.y === cy);
      if (mv) {
        send.act('move', { x: mv.x, y: mv.y });
        sfx.play('click');
      }
    },

    onEvents(evs, view) {
      const v = view?.latest || lastView;
      const L = v ? layout(v) : null;
      for (const ev of evs) {
        if (ev.e === 'move') {
          sfx.play(ev.jump ? 'dash' : 'pion');
          if (L) {
            juice.burst(L.bx + (ev.x + 0.5) * L.cell, L.by + (ev.y + 0.5) * L.cell, {
              n: 6, color: config.players[ev.pid]?.color || '#FFF', speed: 70, life: 0.35, size: 2.5,
            });
          }
        } else if (ev.e === 'wall') {
          sfx.play('pion');
          juice.shake(3);
        } else if (ev.e === 'turn') {
          if (ev.pid === you && L) {
            sfx.play('ready');
            juice.floater(L.A.aw / 2, L.by - 36, ev.n > 1 ? `À TOI ! (${ev.n} actions)` : 'À TOI !', { color: '#3DFF8A', size: 20 });
          }
        } else if (ev.e === 'again' && ev.pid === you && L) {
          juice.floater(L.A.aw / 2, L.by - 36, 'ENCORE UNE ACTION !', { color: '#FFC93C', size: 18 });
        } else if (ev.e === 'reject' && ev.pid === you) {
          rejectT = 1.6;
          rejectMsg = ev.why === 'block' ? 'PASSAGE OBLIGATOIRE !' : ev.why === 'stock' ? 'PLUS DE BARRIÈRES !' : 'TROP SERRÉ ICI !';
          sfx.play('klaxon');
          juice.shake(4);
        } else if (ev.e === 'win') {
          sfx.play('win');
          const teamPids = config.teams[ev.team] || [];
          const colors = teamPids.map((pid) => config.players[pid]?.color || '#3DFF8A');
          endBanner = {
            text: `${campLabel(ev.team, ev.pid).toUpperCase()} TOUCHE AU BUT !`,
            color: (ev.pid && config.players[ev.pid]?.color) || colors[0] || '#3DFF8A',
          };
          if (L) juice.confetti(L.A.aw / 2, L.by + L.bh / 2 - 40, colors.length ? colors : ['#3DFF8A'], 60);
        } else if (ev.e === 'round') {
          ghost = null;
          wallMode = false;
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

      // Plateau : cadre + cases.
      rr(ctx, L.bx - 14, L.by - 14, L.bw + 28, L.bh + 28, 16);
      ctx.fillStyle = '#241448';
      ctx.fill();
      ctx.strokeStyle = meta.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      for (let cy = 0; cy < v.rows; cy++) {
        for (let cx = 0; cx < v.cols; cx++) {
          const px = L.bx + cx * L.cell, py = L.by + cy * L.cell;
          rr(ctx, px + 2.5, py + 2.5, L.cell - 5, L.cell - 5, 5);
          ctx.fillStyle = (cx + cy) % 2 === 0 ? '#1B0F33' : '#180D2E';
          ctx.fill();
        }
      }
      // Lignes de base : bas = camp 0, haut = camp 1.
      for (const side of [0, 1]) {
        const y = side === 0 ? v.rows - 1 : 0;
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = SIDE_COLORS[side];
        ctx.fillRect(L.bx, L.by + y * L.cell, L.bw, L.cell);
        ctx.globalAlpha = 1;
      }
      // Ma ligne d'arrivée, marquée noir sur blanc (enfin, néon sur nuit).
      const mySide = v.pawns[you]?.s;
      if (mySide !== undefined) {
        const gy = mySide === 0 ? 0 : v.rows - 1;
        const pulse = 0.5 + 0.3 * Math.sin(performance.now() / 300);
        ctx.globalAlpha = pulse;
        ctx.setLineDash([L.cell * 0.4, L.cell * 0.25]);
        ctx.strokeStyle = '#3DFF8A';
        ctx.lineWidth = 2.4;
        ctx.strokeRect(L.bx + 2, L.by + gy * L.cell + 2, L.bw - 4, L.cell - 4);
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.font = `800 ${Math.max(9, L.cell * 0.3)}px Rubik, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(61,255,138,${0.5 + pulse * 0.4})`;
        ctx.fillText('TON ARRIVÉE', L.bx + L.bw / 2, L.by + gy * L.cell + (gy === 0 ? -6 : L.cell + 13));
      }

      // Cases jouables (mon tour, hors mode barrière).
      const myTurn = v.turn === you && v.phase === 'turn';
      if (myTurn && !wallMode) {
        const pulse = 0.25 + 0.15 * Math.sin(performance.now() / 240);
        for (const m of legalMoves(v)) {
          rr(ctx, L.bx + m.x * L.cell + 6, L.by + m.y * L.cell + 6, L.cell - 12, L.cell - 12, 6);
          ctx.fillStyle = `rgba(61,255,138,${m.jump ? pulse + 0.12 : pulse})`;
          ctx.fill();
        }
      }

      // Murs posés.
      for (const [x, y] of v.wh) drawWall(ctx, L, 'h', x, y);
      for (const [x, y] of v.wv) drawWall(ctx, L, 'v', x, y);

      // Ghost de barrière.
      if (wallMode && ghost && myTurn) {
        const blink = 0.45 + 0.3 * Math.sin(performance.now() / 160);
        drawWall(ctx, L, ghost.o, ghost.x, ghost.y, blink, '#FFC93C');
      }

      // Pions.
      for (const [pid, p] of Object.entries(v.pawns)) {
        const cx = L.bx + (p.x + 0.5) * L.cell;
        const cy = L.by + (p.y + 0.5) * L.cell;
        const rad = L.cell * 0.34;
        const color = config.players[pid]?.color || '#888';
        helpers.shadow(ctx, cx, cy, rad);
        if (pid === you) {
          ctx.beginPath();
          ctx.arc(cx, cy, rad + 5 + Math.sin(performance.now() / 200) * 1.6, 0, TAU);
          ctx.strokeStyle = 'rgba(245,239,230,.65)';
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, TAU);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = pid === v.turn ? '#F5EFE6' : 'rgba(20,10,38,.55)';
        ctx.lineWidth = pid === v.turn ? 3 : 2.4;
        ctx.stroke();
        // Flèche direction du but.
        ctx.font = `800 ${rad}px Rubik, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(20,10,38,.6)';
        ctx.fillText(p.s === 0 ? '▲' : '▼', cx, cy + rad * 0.36);
        helpers.nameTag(ctx, cx, cy - rad - 6, config.players[pid]?.name || '', color, 11);
        // Stock de barrières.
        ctx.font = '600 10px Rubik, sans-serif';
        ctx.fillStyle = '#B9A8D0';
        ctx.fillText(`🚧${p.w}`, cx, cy + rad + 12);
      }

      juice.drawWorld(ctx);
      ctx.restore();

      // ── HUD ──
      ctx.textAlign = 'center';
      ctx.font = '16px Bungee, sans-serif';
      ctx.fillStyle = '#B9A8D0';
      ctx.fillText(v.rounds > 1 ? t('game.round', { n: `${v.round}/${v.rounds}` }) : 'BARRIÈRES', w / 2, 24);

      if (v.phase === 'turn' && v.turn) {
        const p = config.players[v.turn];
        const mine = v.turn === you;
        ctx.font = '800 15px Rubik, sans-serif';
        ctx.fillStyle = p?.color || '#F5EFE6';
        ctx.fillText(
          mine
            ? (wallMode ? 'MODE BARRIÈRE : touche une rainure, retouche pour valider' : `À TOI${v.acts > 1 ? ` (${v.acts} actions)` : ''} : avance ou pose une barrière`)
            : `Au tour de ${p?.name || '?'}`,
          w / 2, 48,
        );
        const frac = Math.max(0, Math.min(1, v.tl / v.tmax));
        ctx.fillStyle = 'rgba(185,168,208,.25)';
        ctx.fillRect(w / 2 - 80, 56, 160, 5);
        ctx.fillStyle = v.tl < 4 ? '#FF4757' : '#3DFF8A';
        ctx.fillRect(w / 2 - 80, 56, 160 * frac, 5);
      }
      if (v.phase === 'pre') {
        ctx.font = 'bold 34px Bungee, sans-serif';
        ctx.fillStyle = meta.color;
        ctx.fillText('AUX BARRIÈRES !', w / 2, h / 2 - 30);
      }
      if (v.phase === 'end' && endBanner) {
        const pulse = 1 + 0.03 * Math.sin(performance.now() / 140);
        ctx.save();
        ctx.translate(w / 2, h / 2 - 40);
        ctx.scale(pulse, pulse);
        ctx.font = `bold ${Math.min(24, w / 20)}px Bungee, sans-serif`;
        ctx.strokeStyle = 'rgba(20,10,38,.85)';
        ctx.lineWidth = 6;
        ctx.strokeText(endBanner.text, 0, 0);
        ctx.fillStyle = endBanner.color;
        ctx.fillText(endBanner.text, 0, 0);
        ctx.restore();
      }
      if (rejectT > 0) {
        rejectT -= dt;
        ctx.font = 'bold 22px Bungee, sans-serif';
        ctx.fillStyle = '#FF4757';
        ctx.fillText(rejectMsg, w / 2, h / 2 - 60);
      }
      const me = v.pawns[you];
      if (me && v.turn === you) {
        ctx.font = '600 13px Rubik, sans-serif';
        ctx.fillStyle = '#B9A8D0';
        ctx.fillText(`Il te reste ${me.w} barrière${me.w > 1 ? 's' : ''}`, w / 2, h - 18);
      }
    },

    destroy() {},
  };
}

function rr(c2, x, y, w, h, r) {
  const rr2 = Math.min(r, w / 2, h / 2);
  c2.beginPath();
  c2.moveTo(x + rr2, y);
  c2.arcTo(x + w, y, x + w, y + h, rr2);
  c2.arcTo(x + w, y + h, x, y + h, rr2);
  c2.arcTo(x, y + h, x, y, rr2);
  c2.arcTo(x, y, x + w, y, rr2);
  c2.closePath();
}
