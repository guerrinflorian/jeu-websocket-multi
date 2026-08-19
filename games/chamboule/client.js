// CHAMBOULE — rendu client : plateforme cible, visée fronde secrète
// (glisser n'importe où = direction + puissance), envol simultané.

import meta from './meta.js';

const TEAM_COLORS = ['#FF3D8A', '#29D9FF', '#FFC93C', '#3DFF8A'];
const DRAG_MAX = 140; // px de drag = puissance 100 %

export function createClient({ ctx, helpers, config, you, send }) {
  const { t, juice, sfx, lerp, TAU } = helpers;
  const AW = meta.arena.w;
  const CX = AW / 2, CY = AW / 2;
  const isAsym = config.format.kind === 'asym';
  const quillPid = isAsym ? config.teams[0][0] : null;
  const falls = [];          // animations de chute
  let drag = null;           // {x0, y0, x, y} en px écran
  let myAim = null;          // {ax, ay, pow} dernière visée envoyée
  let lastVolleyKey = '';
  let lastPhase = '';
  let lastCeil = -1;

  function interpPlayers(view) {
    const out = {};
    for (const [pid, b] of Object.entries(view.b.players || {})) {
      const a = view.a?.players?.[pid] || b;
      out[pid] = {
        x: lerp(a.x, b.x, view.alpha),
        y: lerp(a.y, b.y, view.alpha),
        al: b.al, ch: b.ch, lv: b.lv,
      };
    }
    return out;
  }

  return {
    onTap(x, y, phase) {
      if (phase === 'start') {
        drag = { x0: x, y0: y, x, y };
      } else if (phase === 'move' && drag) {
        drag.x = x; drag.y = y;
      } else if (phase === 'end' && drag) {
        const dx = drag.x - drag.x0, dy = drag.y - drag.y0;
        const len = Math.hypot(dx, dy);
        drag = null;
        if (len < 14) return; // simple tap : on annule
        const pow = Math.min(1, len / DRAG_MAX);
        myAim = { ax: dx / len, ay: dy / len, pow };
        send.act('aim', myAim);
        sfx.play('click');
      }
    },

    onEvents(evs) {
      for (const ev of evs) {
        if (ev.e === 'go') {
          sfx.play('go');
          juice.flash('#FFC93C', 0.18);
        } else if (ev.e === 'hit') {
          juice.burst(ev.x, ev.y, { n: Math.round(6 + ev.s * 16), color: '#FFC93C', speed: 100 + ev.s * 200, life: 0.45, size: 3 });
          juice.shake(2 + ev.s * 7);
          sfx.play('hit');
        } else if (ev.e === 'fall') {
          const color = config.players[ev.pid]?.color || '#FFF';
          falls.push({ x: ev.x, y: ev.y, color, t: 0 });
          juice.shake(ev.pid === you ? 10 : 5);
          juice.floater(ev.x, ev.y, ev.out ? 'DANS LE VIDE !' : '-1 ❤️', { color, size: 17 });
          sfx.play('fall');
        } else if (ev.e === 'lock') {
          sfx.play(ev.pid === you ? 'ready' : 'tickup');
        } else if (ev.e === 'aim') {
          sfx.play('whistle');
        } else if (ev.e === 'shrink') {
          sfx.play('steal');
          juice.shake(4);
        } else if (ev.e === 'roundEnd') {
          sfx.play(ev.team === null ? 'klaxon' : 'ready');
        }
      }
    },

    render(view, dt) {
      const state = view.latest;
      const { w, h } = helpers.size();
      helpers.bg(ctx);
      const vp = helpers.viewport(AW, AW, 20);
      ctx.save();
      vp.apply(ctx);

      // Nouvelle salve → on oublie la visée locale.
      const volleyKey = `${state.round}-${state.volley}`;
      if (volleyKey !== lastVolleyKey) { lastVolleyKey = volleyKey; myAim = null; drag = null; }

      // Plateforme façon cible de stand de tir.
      const platR = lerp(view.a?.platR ?? view.b.platR, view.b.platR, view.alpha);
      ctx.beginPath();
      ctx.arc(CX, CY, platR + 8, 0, TAU);
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.fill();
      const rings = [[1, '#2A1A4A'], [0.72, '#31205A'], [0.45, '#2A1A4A'], [0.2, '#3A2560']];
      for (const [k, col] of rings) {
        ctx.beginPath();
        ctx.arc(CX, CY, platR * k, 0, TAU);
        ctx.fillStyle = col;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(CX, CY, platR, 0, TAU);
      ctx.strokeStyle = '#3DFF8A';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(CX, CY, 6, 0, TAU);
      ctx.fillStyle = 'rgba(61,255,138,.5)';
      ctx.fill();

      // Chutes.
      for (let i = falls.length - 1; i >= 0; i--) {
        const f = falls[i];
        f.t += dt;
        if (f.t > 0.6) { falls.splice(i, 1); continue; }
        const k = f.t / 0.6;
        const l = Math.hypot(f.x - CX, f.y - CY) || 1;
        ctx.globalAlpha = 1 - k;
        ctx.beginPath();
        ctx.arc(f.x + ((f.x - CX) / l) * k * 50, f.y + ((f.y - CY) / l) * k * 50, 15 * (1 - k * 0.8), 0, TAU);
        ctx.fillStyle = f.color;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Joueurs.
      const ps = interpPlayers(view);
      const flying = state.phase === 'fly';
      for (const [pid, p] of Object.entries(ps)) {
        if (!p.al) continue;
        const color = config.players[pid]?.color || '#888';
        const R = pid === quillPid ? 19 : 15;
        // Traînée pendant l'envol.
        if (flying) {
          const pv = view.a?.players?.[pid];
          if (pv && Math.hypot(p.x - pv.x, p.y - pv.y) > 1.5) {
            juice.burst(p.x, p.y, { n: 1, color, speed: 20, life: 0.35, size: 2.5 });
          }
        }
        if (pid === you) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, R + 7 + Math.sin(performance.now() / 200) * 2, 0, TAU);
          ctx.strokeStyle = 'rgba(245,239,230,.6)';
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, R, 0, TAU);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(20,10,38,.5)';
        ctx.lineWidth = 3;
        ctx.stroke();
        if (pid === quillPid && state.asym) {
          ctx.font = '13px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('🎳', p.x, p.y + 4);
          ctx.fillText('❤️'.repeat(Math.max(0, p.lv)), p.x, p.y - R - 16);
        }
        // « A choisi » : coche au-dessus de la tête pendant la visée.
        if (state.phase === 'aim' && p.ch) {
          ctx.font = '800 13px Rubik, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#3DFF8A';
          ctx.fillText('✔', p.x + R + 8, p.y - R - 2);
        }
        helpers.nameTag(ctx, p.x, p.y - R - 6, config.players[pid]?.name || '', color);
      }

      // Ma flèche de visée (drag en cours, ou dernière visée validée).
      const meP = ps[you];
      if (meP && meP.al && state.phase === 'aim') {
        let ax = 0, ay = 0, pow = 0, live = false;
        if (drag) {
          const dx = drag.x - drag.x0, dy = drag.y - drag.y0;
          const len = Math.hypot(dx, dy);
          if (len > 6) { ax = dx / len; ay = dy / len; pow = Math.min(1, len / DRAG_MAX); live = true; }
        } else if (myAim) {
          ({ ax, ay, pow } = myAim);
        }
        if (pow > 0) {
          const arrowLen = 40 + pow * 130;
          const ex = meP.x + ax * arrowLen, ey = meP.y + ay * arrowLen;
          const col = pow > 0.75 ? '#FF4757' : pow > 0.4 ? '#FFC93C' : '#3DFF8A';
          ctx.globalAlpha = live ? 0.95 : 0.55;
          ctx.setLineDash(live ? [] : [7, 6]);
          ctx.beginPath();
          ctx.moveTo(meP.x, meP.y);
          ctx.lineTo(ex, ey);
          ctx.strokeStyle = col;
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.stroke();
          ctx.setLineDash([]);
          const aAng = Math.atan2(ay, ax);
          ctx.beginPath();
          ctx.moveTo(ex + Math.cos(aAng) * 12, ey + Math.sin(aAng) * 12);
          ctx.lineTo(ex + Math.cos(aAng + 2.5) * 10, ey + Math.sin(aAng + 2.5) * 10);
          ctx.lineTo(ex + Math.cos(aAng - 2.5) * 10, ey + Math.sin(aAng - 2.5) * 10);
          ctx.closePath();
          ctx.fillStyle = col;
          ctx.fill();
          ctx.font = '800 15px Rubik, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = col;
          ctx.fillText(`${Math.round(pow * 100)} %`, ex + ax * 22, ey + ay * 22 + 5);
          ctx.globalAlpha = 1;
        }
      }

      juice.drawWorld(ctx);
      ctx.restore();

      // ── HUD écran ──
      ctx.textAlign = 'center';
      ctx.font = '16px Bungee, sans-serif';
      ctx.fillStyle = '#B9A8D0';
      ctx.fillText(`${t('game.round', { n: `${state.round}/${state.rounds}` })} · salve ${state.volley}`, w / 2, 26);
      const teams = config.teams;
      const chipW = Math.min(54, (w - 170) / Math.max(1, teams.length));
      const x0 = w / 2 - (teams.length * chipW) / 2 + chipW / 2;
      teams.forEach((tm, i) => {
        const cx = x0 + i * chipW;
        const color = teams.length > 4 ? (config.players[tm[0]]?.color || '#888') : TEAM_COLORS[i];
        ctx.beginPath();
        ctx.arc(cx - 12, 44, 6, 0, TAU);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.font = '800 15px Rubik, sans-serif';
        ctx.fillStyle = '#F5EFE6';
        ctx.textAlign = 'left';
        ctx.fillText(String(state.scores[i]), cx - 2, 49);
        ctx.textAlign = 'center';
      });

      // Phase visée : gros compte à rebours + consigne.
      if (state.phase === 'aim') {
        const ceil = Math.ceil(state.pt);
        if (ceil !== lastCeil) {
          lastCeil = ceil;
          if (ceil <= 3 && ceil > 0) sfx.play('count');
        }
        ctx.font = '34px Bungee, sans-serif';
        ctx.fillStyle = state.pt <= 3 ? '#FF4757' : '#3DFF8A';
        ctx.fillText(String(ceil), w / 2, 86);
        if (meP?.al) {
          const ready = myAim || state.players[you]?.ch;
          ctx.font = '600 14px Rubik, sans-serif';
          ctx.fillStyle = ready ? '#3DFF8A' : '#B9A8D0';
          ctx.fillText(ready ? '✔ PRÊT — tu peux re-viser' : 'GLISSE pour viser : direction + longueur = puissance', w / 2, h - 24);
        }
      }
      if (state.phase !== lastPhase) {
        lastPhase = state.phase;
        if (state.phase === 'aim') juice.floater(CX, CY - 80, 'VISEZ !', { color: '#3DFF8A', size: 30 });
      }
      if (state.phase === 'pre') {
        ctx.font = 'bold 38px Bungee, sans-serif';
        ctx.fillStyle = '#3DFF8A';
        ctx.fillText('CHAMBOULE-TOUT !', w / 2, h / 2 - 40);
      }
      const me = state.players[you];
      if (me && !me.al && state.phase !== 'end') {
        ctx.font = '600 15px Rubik, sans-serif';
        ctx.fillStyle = '#B9A8D0';
        ctx.fillText(t('game.dead'), w / 2, h - 24);
      }
    },

    destroy() { falls.length = 0; },
  };
}
