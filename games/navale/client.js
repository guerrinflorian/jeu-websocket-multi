// NAVALE : rendu client. Bassin nocturne : ma grille (flotte visible),
// mosaïque des grilles ennemies, visée au doigt, salves simultanées avec
// pluie d'obus. Layout adaptatif portrait / paysage.

import { roundRectPath } from '/cardkit.js';

const WATER = '#0D1B33';
const WATER_EDGE = 'rgba(41,217,255,.35)';
const GRID_LINE = 'rgba(41,217,255,.12)';
const STEEL = '#8FA3BF';
const STEEL_SUNK = '#7A3550';
const HIT = '#FF7A3D';
const MISS = '#4D7CFF';

export function createClient({ ctx, helpers, config, you, send, controls }) {
  const { juice, sfx, TAU } = helpers;
  const teams = config.teams;
  const isAsym = config.format.kind === 'asym';
  const myCamp = teams.findIndex((t) => t.includes(you));
  const nPlayers = teams.flat().length;
  const myMaxAims = isAsym && myCamp === 0 ? Math.max(2, Math.ceil((nPlayers - 1) * 0.55)) : 1;

  const zones = [];        // { x, y, w, h, fn(wpt) }
  const anims = [];        // obus : { g, c, r, t, dur, done }
  let selTarget = -1;
  let lastBtn = null;
  let panels = {};         // g → { x, y, s } (grilles visibles cette frame)
  let shotIdx = 0;

  const campColor = (t) => config.players[teams[t]?.[0]]?.color || '#888';
  const campName = (t) => {
    if (t < 0 || !teams[t]) return '?';
    if (teams[t].length === 1) return config.players[teams[t][0]]?.name || '?';
    if (isAsym && t === 0) return config.players[teams[t][0]]?.name || 'Amiral';
    return `ÉQUIPE ${t + 1}`;
  };

  function ensureTarget(v) {
    const valid = (g) => g >= 0 && g !== myCamp && v.camps[g] && (v.camps[g].alive || myCamp === -1);
    if (valid(selTarget)) return;
    selTarget = -1;
    for (let g = 0; g < v.camps.length; g++) {
      if (g !== myCamp && v.camps[g].alive) { selTarget = g; break; }
    }
    if (selTarget < 0) {
      for (let g = 0; g < v.camps.length; g++) if (g !== myCamp) { selTarget = g; break; }
    }
  }

  // ── Rendu d'une grille ────────────────────────────────────────────────
  function drawGrid(v, g, x, y, size, opts = {}) {
    const camp = v.camps[g];
    const n = camp.n;
    const cs = size / n;
    const grid = camp.grid;
    roundRectPath(ctx, x - 5, y - 5, size + 10, size + 10, Math.max(6, size * 0.03));
    const wg = ctx.createLinearGradient(x, y, x, y + size);
    wg.addColorStop(0, '#102142');
    wg.addColorStop(1, WATER);
    ctx.fillStyle = wg;
    ctx.fill();
    ctx.strokeStyle = opts.sel ? (opts.color || WATER_EDGE) : camp.alive ? WATER_EDGE : 'rgba(122,108,147,.3)';
    ctx.lineWidth = opts.sel ? 3 : 1.5;
    ctx.stroke();

    if (!opts.mini) {
      ctx.strokeStyle = GRID_LINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < n; i++) {
        ctx.moveTo(x + i * cs, y);
        ctx.lineTo(x + i * cs, y + size);
        ctx.moveTo(x, y + i * cs);
        ctx.lineTo(x + n * cs, y + i * cs);
      }
      ctx.stroke();
    }

    const body = (j) => {
      const c2 = grid[j];
      return c2 === 'X' || (opts.full && (c2 === 'S' || c2 === 'x'));
    };
    for (let i = 0; i < n * n; i++) {
      const ch = grid[i];
      if (ch === '.') continue;
      const r = Math.floor(i / n), c = i % n;
      const cx = x + c * cs, cy = y + r * cs;
      if (body(i)) {
        // coque : fusion avec les cases voisines du même navire
        const inset = cs * 0.16;
        const L = c > 0 && body(i - 1) ? 0 : inset;
        const R = c < n - 1 && body(i + 1) ? 0 : inset;
        const T = r > 0 && body(i - n) ? 0 : inset;
        const B = r < n - 1 && body(i + n) ? 0 : inset;
        roundRectPath(ctx, cx + L, cy + T, cs - L - R, cs - T - B, cs * 0.22);
        ctx.fillStyle = ch === 'X' ? STEEL_SUNK : STEEL;
        ctx.fill();
        if (!opts.mini && ch === 'S') {
          ctx.fillStyle = 'rgba(20,10,38,.35)';
          ctx.beginPath();
          ctx.arc(cx + cs / 2, cy + cs / 2, cs * 0.1, 0, TAU);
          ctx.fill();
        }
      }
      if (ch === 'x' || ch === 'X') {
        ctx.strokeStyle = ch === 'x' ? HIT : '#140A26';
        ctx.lineWidth = Math.max(1.5, cs * 0.12);
        const m = cs * 0.28;
        ctx.beginPath();
        ctx.moveTo(cx + m, cy + m);
        ctx.lineTo(cx + cs - m, cy + cs - m);
        ctx.moveTo(cx + cs - m, cy + m);
        ctx.lineTo(cx + m, cy + cs - m);
        ctx.stroke();
        if (ch === 'x') {
          ctx.fillStyle = 'rgba(255,122,61,.2)';
          ctx.fillRect(cx + 1, cy + 1, cs - 2, cs - 2);
        }
      } else if (ch === 'o') {
        ctx.strokeStyle = MISS;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = Math.max(1, cs * 0.09);
        ctx.beginPath();
        ctx.arc(cx + cs / 2, cy + cs / 2, cs * 0.16, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    if (!camp.alive) {
      roundRectPath(ctx, x - 5, y - 5, size + 10, size + 10, Math.max(6, size * 0.03));
      ctx.fillStyle = 'rgba(20,10,38,.55)';
      ctx.fill();
      if (!opts.mini) {
        ctx.font = `800 ${size * 0.09}px Rubik, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FF4757';
        ctx.fillText('FLOTTE ANÉANTIE', x + size / 2, y + size / 2);
      }
    }
    panels[g] = { x, y, s: size };
  }

  // Barres d'état de flotte sous une grille.
  function drawFleetBar(v, g, x, y, size) {
    const camp = v.camps[g];
    let bx = x;
    const u = Math.max(4, size * 0.025);
    for (const s of camp.ships) {
      const len = Math.abs(s);
      const sunk = s < 0;
      for (let k = 0; k < len; k++) {
        ctx.fillStyle = sunk ? 'rgba(255,71,87,.45)' : STEEL;
        ctx.fillRect(bx + k * (u + 1), y, u, u);
      }
      bx += len * (u + 1) + u * 1.6;
    }
  }

  function drawAims(v, g, x, y, size) {
    const camp = v.camps[g];
    const cs = size / camp.n;
    const now = performance.now();
    for (const [pid, list] of Object.entries(v.aims || {})) {
      const color = config.players[pid]?.color || '#FFC93C';
      for (const a of list) {
        if (a.g !== g) continue;
        const cx = x + (a.c % camp.n) * cs + cs / 2;
        const cy = y + Math.floor(a.c / camp.n) * cs + cs / 2;
        const pulse = 1 + Math.sin(now / 150) * 0.12;
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1.5, cs * 0.1);
        ctx.beginPath();
        ctx.arc(cx, cy, cs * 0.3 * pulse, 0, TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - cs * 0.45, cy);
        ctx.lineTo(cx - cs * 0.18, cy);
        ctx.moveTo(cx + cs * 0.18, cy);
        ctx.lineTo(cx + cs * 0.45, cy);
        ctx.moveTo(cx, cy - cs * 0.45);
        ctx.lineTo(cx, cy - cs * 0.18);
        ctx.moveTo(cx, cy + cs * 0.18);
        ctx.lineTo(cx, cy + cs * 0.45);
        ctx.stroke();
      }
    }
  }

  return {
    onTap(x, y, phase) {
      if (phase !== 'end' || !this._vp) return;
      const wpt = this._vp.toWorld(x, y);
      for (const z of zones) {
        if (wpt.x >= z.x && wpt.x <= z.x + z.w && wpt.y >= z.y && wpt.y <= z.y + z.h) {
          z.fn(wpt);
          return;
        }
      }
    },

    onEvents(evs) {
      shotIdx = 0;
      for (const ev of evs) {
        if (ev.e === 'shot') {
          anims.push({ g: ev.g, c: ev.c, r: ev.r, pid: ev.pid, t: -(shotIdx++) * 0.12, dur: 0.3, done: false });
          if (shotIdx <= 3) sfx.play('shot');
        } else if (ev.e === 'sunk') {
          const pn = panels[ev.g];
          if (pn) juice.floater(pn.x + pn.s / 2, pn.y + pn.s / 2, 'COULÉ !', { color: HIT, size: 24 });
          juice.shake(ev.g === myCamp ? 8 : 4);
          sfx.play('boum');
        } else if (ev.e === 'dead') {
          const pn = panels[ev.g];
          if (pn) juice.floater(pn.x + pn.s / 2, pn.y + pn.s / 2 - 30, 'FLOTTE ANÉANTIE !', { color: '#FF4757', size: 22 });
          juice.shake(ev.g === myCamp ? 10 : 5);
          sfx.play('klaxon');
          if (ev.g === selTarget) selTarget = -1;
        } else if (ev.e === 'volley') {
          sfx.play('whistle');
        } else if (ev.e === 'salvo') {
          sfx.play('tickup');
        } else if (ev.e === 'place') {
          if (ev.g === myCamp) sfx.play('dash');
        }
      }
    },

    render(view, dt) {
      const v = view.latest;
      const { w, h } = helpers.size();
      const portrait = h > w * 1.05;
      const W = portrait ? 600 : 960;
      const H = portrait ? 960 : 600;
      helpers.bg(ctx);
      const vp = helpers.viewport(W, H, 8);
      this._vp = vp;
      ctx.save();
      vp.apply(ctx);
      zones.length = 0;
      panels = {};
      ensureTarget(v);

      const iPlay = myCamp >= 0 && v.camps[myCamp];
      const meAlive = iPlay && v.camps[myCamp].alive;
      const enemies = v.camps.map((c, g) => g).filter((g) => g !== myCamp);

      if (v.phase === 'place') {
        // Ma grille en grand, au centre.
        const s = portrait ? 440 : 400;
        const gx = W / 2 - s / 2, gy = portrait ? 200 : 130;
        if (iPlay) {
          helpers.nameTag(ctx, W / 2, gy - 22, `⚓ ${campName(myCamp)}`, campColor(myCamp), 15);
          drawGrid(v, myCamp, gx, gy, s, { full: true, sel: true, color: campColor(myCamp) });
          drawFleetBar(v, myCamp, gx, gy + s + 14, s);
          ctx.font = '600 15px Rubik, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#B9A8D0';
          ctx.fillText('MÉLANGER repositionne ta flotte tant que le chrono tourne.', W / 2, gy + s + 46);
        } else {
          ctx.font = '600 16px Rubik, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#B9A8D0';
          ctx.fillText('Les flottes se mettent en place…', W / 2, H / 2);
        }
      } else {
        // ── Layout de combat ──
        let mineR, targetR, minisR;
        if (portrait) {
          targetR = { x: W / 2 - 180, y: 80, s: 360 };
          minisR = { x: 20, y: 500, w: W - 40, h: 72, row: true };
          mineR = { x: W / 2 - 140, y: 630, s: 280 };
        } else {
          mineR = { x: 40, y: 150, s: 360 };
          targetR = { x: 560, y: 150, s: 360 };
          minisR = { x: 425, y: 140, w: 110, h: 400, row: false };
        }

        // Ma grille (ou, pour un pur spectateur, la première grille).
        const minePane = iPlay ? myCamp : (enemies.length ? v.camps.findIndex((c, g) => g !== selTarget) : 0);
        if (minePane >= 0 && minePane !== selTarget) {
          helpers.nameTag(ctx, mineR.x + mineR.s / 2, mineR.y - 20,
            `⚓ ${campName(minePane)}${minePane === myCamp ? ' (toi)' : ''}`, campColor(minePane), 13);
          drawGrid(v, minePane, mineR.x, mineR.y, mineR.s, { full: true, color: campColor(minePane) });
          drawFleetBar(v, minePane, mineR.x, mineR.y + mineR.s + 12, mineR.s);
        }

        // La cible déployée.
        if (selTarget >= 0) {
          const tc = v.camps[selTarget];
          helpers.nameTag(ctx, targetR.x + targetR.s / 2, targetR.y - 20,
            `🎯 ${campName(selTarget)} · ${tc.left} case${tc.left > 1 ? 's' : ''} à flot`, campColor(selTarget), 13);
          drawGrid(v, selTarget, targetR.x, targetR.y, targetR.s, {
            full: myCamp === -1 || !meAlive, sel: true, color: campColor(selTarget),
          });
          drawFleetBar(v, selTarget, targetR.x, targetR.y + targetR.s + 12, targetR.s);
          drawAims(v, selTarget, targetR.x, targetR.y, targetR.s);
          if (v.phase === 'aim' && meAlive) {
            const tgt = selTarget;
            const { x, y, s } = targetR;
            zones.push({
              x, y, w: s, h: s,
              fn: (wpt) => {
                const n = tc.n;
                const c = Math.floor((wpt.x - x) / (s / n));
                const r = Math.floor((wpt.y - y) / (s / n));
                if (c < 0 || r < 0 || c >= n || r >= n) return;
                const cell = r * n + c;
                if (tc.grid[cell] !== '.') return;
                send.act('aim', { g: tgt, c: cell });
                sfx.play('click');
              },
            });
          }
        }

        // Mosaïque des autres camps.
        const others = v.camps.map((c, g) => g).filter((g) => g !== minePane && g !== selTarget);
        const nb = others.length;
        if (nb) {
          const gap = 10;
          const ms = minisR.row
            ? Math.min(minisR.h - 8, (minisR.w - gap * (nb - 1)) / nb - 2)
            : Math.min(minisR.w - 8, (minisR.h - gap * (nb - 1)) / nb - 14);
          others.forEach((g, i) => {
            const mx = minisR.row
              ? minisR.x + (minisR.w - (nb * (ms + gap) - gap)) / 2 + i * (ms + gap)
              : minisR.x + (minisR.w - ms) / 2;
            const my = minisR.row ? minisR.y : minisR.y + i * (ms + gap + 12);
            drawGrid(v, g, mx, my, ms, { mini: true, full: myCamp === -1 || !meAlive || g === myCamp, color: campColor(g) });
            ctx.font = '600 10px Rubik, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = campColor(g);
            ctx.fillText(campName(g).slice(0, 12), mx + ms / 2, my + ms + 11);
            if (g !== myCamp && (v.camps[g].alive || myCamp === -1)) {
              zones.push({ x: mx - 4, y: my - 4, w: ms + 8, h: ms + 8, fn: () => { selTarget = g; sfx.play('click'); } });
            }
          });
        }

        // Consigne.
        ctx.font = '600 13px Rubik, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#B9A8D0';
        if (v.phase === 'aim' && meAlive) {
          const mine = (v.aims?.[you] || []).length;
          ctx.fillText(
            myMaxAims > 1
              ? `Amiral : ${mine}/${myMaxAims} tirs armés. Touche des cases libres !`
              : mine ? 'Tir armé ! Re-touche la case pour changer d\'avis.'
                : 'Touche une grille ennemie, puis une case libre pour armer ton tir.',
            W / 2, H - 16,
          );
        } else if (!meAlive && iPlay) {
          ctx.fillText('Ta flotte dort avec les poissons. Profite du spectacle !', W / 2, H - 16);
        }
      }

      // ── Obus en vol ──
      for (let i = anims.length - 1; i >= 0; i--) {
        const a = anims[i];
        a.t += dt;
        if (a.t < 0) continue;
        const pn = panels[a.g];
        const k = Math.min(1, a.t / a.dur);
        if (!pn) {
          if (!a.done) { a.done = true; sfx.play(a.r === 'h' ? 'hit' : 'dash'); }
          if (k >= 1) anims.splice(i, 1);
          continue;
        }
        const n = v.camps[a.g].n;
        const cs = pn.s / n;
        const cx = pn.x + (a.c % n) * cs + cs / 2;
        const cy = pn.y + Math.floor(a.c / n) * cs + cs / 2;
        if (k < 1) {
          const sy = cy - (1 - k) * (1 - k) * 90;
          ctx.fillStyle = '#FFC93C';
          ctx.beginPath();
          ctx.arc(cx, sy, Math.max(2.5, cs * 0.14), 0, TAU);
          ctx.fill();
        } else if (!a.done) {
          a.done = true;
          if (a.r === 'h') {
            juice.burst(cx, cy, { n: 14, color: HIT, speed: 130, life: 0.5 });
            juice.ring(cx, cy, { color: HIT, maxR: cs * 1.4, life: 0.35 });
            if (a.g === myCamp) juice.shake(4);
            sfx.play('hit');
          } else {
            juice.burst(cx, cy, { n: 8, color: MISS, speed: 80, life: 0.4, grav: 140 });
            sfx.play('dash');
          }
          anims.splice(i, 1);
        }
      }

      juice.drawWorld(ctx);
      ctx.restore();

      // ── HUD (repère écran) ──
      ctx.textAlign = 'center';
      ctx.font = '16px Bungee, sans-serif';
      ctx.fillStyle = '#B9A8D0';
      const label = v.phase === 'place' ? 'PLACE TA FLOTTE'
        : v.phase === 'aim' ? `SALVE ${v.volley + 1}`
          : v.phase === 'fire' ? 'FEU !'
            : 'FIN DE LA BATAILLE';
      ctx.fillText(label, w / 2, 24);
      if (v.phase === 'place' || v.phase === 'aim') {
        const total = v.phase === 'place' ? 15 : 8;
        const frac = Math.max(0, Math.min(1, v.tl / total));
        ctx.fillStyle = 'rgba(185,168,208,.25)';
        ctx.fillRect(w / 2 - 80, 32, 160, 5);
        ctx.fillStyle = v.tl < 3 ? '#FF4757' : '#3DFF8A';
        ctx.fillRect(w / 2 - 80, 32, 160 * frac, 5);
      }

      // Bouton MÉLANGER seulement pendant le placement.
      const canShuffle = v.phase === 'place' && meAlive;
      if (lastBtn !== canShuffle) {
        lastBtn = canShuffle;
        controls.showButton('shuffle', canShuffle);
      }
    },

    destroy() {
      zones.length = 0;
      anims.length = 0;
      controls.showButton('shuffle', true);
    },
  };
}
