// CARAMBOLE — rendu client : piste circulaire, auto-tamponneuses, bonus.

import meta from './meta.js';

const TEAM_COLORS = ['#FF3D8A', '#29D9FF', '#FFC93C', '#3DFF8A'];
const BONUS_EMOJI = { enclume: '🐘', aimant: '🧲', gant: '🥊' };

export function createClient({ ctx, helpers, config, you, controls }) {
  const { t, juice, sfx, lerp, angleLerp, TAU } = helpers;
  const AW = meta.arena.w;
  const CX = AW / 2, CY = AW / 2;
  const isAsym = config.format.kind === 'asym';
  const bullPid = isAsym ? config.teams[0][0] : null;
  const falls = [];   // animations de chute {x, y, color, t}

  function interpPlayers(view) {
    const out = {};
    for (const [pid, b] of Object.entries(view.b.players || {})) {
      const a = view.a?.players?.[pid] || b;
      out[pid] = {
        x: lerp(a.x, b.x, view.alpha),
        y: lerp(a.y, b.y, view.alpha),
        a: angleLerp(a.a, b.a, view.alpha),
        al: b.al, cd: b.cd, lv: b.lv, fx: b.fx,
      };
    }
    return out;
  }

  return {
    onEvents(evs) {
      for (const ev of evs) {
        if (ev.e === 'hit') {
          juice.burst(ev.x, ev.y, { n: Math.round(6 + ev.s * 14), color: '#FFC93C', speed: 100 + ev.s * 160, life: 0.4, size: 3 });
          juice.shake(2 + ev.s * 6);
          sfx.play('hit');
        } else if (ev.e === 'dash') {
          sfx.play('dash');
          juice.burst(ev.x, ev.y, { n: 8, color: '#F5EFE6', speed: 80, life: 0.3, size: 2.5 });
        } else if (ev.e === 'fall') {
          const color = config.players[ev.pid]?.color || '#FFF';
          falls.push({ x: ev.x, y: ev.y, color, t: 0 });
          juice.shake(ev.pid === you ? 10 : 5);
          juice.floater(ev.x, ev.y, ev.out ? 'ÉJECTÉ !' : '-1 ❤️', { color, size: 18 });
          sfx.play('fall');
        } else if (ev.e === 'bonus') {
          sfx.play('pickup');
          juice.burst(ev.x, ev.y, { n: 14, color: '#3DFF8A', speed: 120, life: 0.5, size: 3 });
          juice.floater(ev.x, ev.y, BONUS_EMOJI[ev.k] || '🎁', { size: 24 });
        } else if (ev.e === 'go') {
          sfx.play('go');
        } else if (ev.e === 'spawn') {
          sfx.play('pickup');
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

      // Piste : disques concentriques + liseré néon, rouge quand ça rétrécit.
      const platR = lerp(view.a?.platR ?? view.b.platR, view.b.platR, view.alpha);
      const shrinking = (view.a?.platR ?? platR) - view.b.platR > 0.01;
      ctx.beginPath();
      ctx.arc(CX, CY, platR + 8, 0, TAU);
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.fill();
      const grad = ctx.createRadialGradient(CX, CY, platR * 0.2, CX, CY, platR);
      grad.addColorStop(0, '#3A2560');
      grad.addColorStop(1, '#2A1A4A');
      ctx.beginPath();
      ctx.arc(CX, CY, platR, 0, TAU);
      ctx.fillStyle = grad;
      ctx.fill();
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(CX, CY, platR * (i / 3.5), 0, TAU);
        ctx.strokeStyle = 'rgba(245,239,230,.07)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(CX, CY, platR, 0, TAU);
      ctx.strokeStyle = shrinking ? '#FF4757' : '#FF7A3D';
      ctx.lineWidth = shrinking ? 5 : 3.5;
      ctx.globalAlpha = shrinking ? 0.7 + 0.3 * Math.sin(performance.now() / 90) : 1;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Bonus au sol.
      for (const b of view.b.bonuses || []) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 13 + Math.sin(performance.now() / 250) * 1.5, 0, TAU);
        ctx.fillStyle = 'rgba(61,255,138,.15)';
        ctx.fill();
        ctx.strokeStyle = '#3DFF8A';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.font = '16px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(BONUS_EMOJI[b.k] || '🎁', b.x, b.y + 1);
        ctx.textBaseline = 'alphabetic';
      }

      // Animations de chute (le palet part dans le vide en rétrécissant).
      for (let i = falls.length - 1; i >= 0; i--) {
        const f = falls[i];
        f.t += dt;
        if (f.t > 0.6) { falls.splice(i, 1); continue; }
        const k = f.t / 0.6;
        const away = norm(f.x - CX, f.y - CY);
        ctx.globalAlpha = 1 - k;
        ctx.beginPath();
        ctx.arc(f.x + away.x * k * 50, f.y + away.y * k * 50, 16 * (1 - k * 0.8), 0, TAU);
        ctx.fillStyle = f.color;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Les autos tamponneuses.
      const ps = interpPlayers(view);
      for (const [pid, p] of Object.entries(ps)) {
        if (!p.al) continue;
        const color = config.players[pid]?.color || '#888';
        const R = pid === bullPid ? 21 : 16;
        const anvil = p.fx & 1, magnet = p.fx & 2, gant = p.fx & 4, inv = p.fx & 8;

        if (pid === you) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, R + 7 + Math.sin(performance.now() / 200) * 2, 0, TAU);
          ctx.strokeStyle = 'rgba(245,239,230,.6)';
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }
        if (magnet) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 130 * (0.7 + 0.3 * Math.sin(performance.now() / 150)), 0, TAU);
          ctx.strokeStyle = 'rgba(41,217,255,.25)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.globalAlpha = inv ? 0.5 + 0.3 * Math.sin(performance.now() / 60) : 1;
        // Carrosserie.
        ctx.beginPath();
        ctx.arc(p.x, p.y, R, 0, TAU);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = anvil ? 5 : 3.5;
        ctx.strokeStyle = anvil ? '#B9A8D0' : 'rgba(20,10,38,.5)';
        ctx.stroke();
        // Nez (direction).
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(p.a) * R * 0.62, p.y + Math.sin(p.a) * R * 0.62, R * 0.3, 0, TAU);
        ctx.fillStyle = '#F5EFE6';
        ctx.fill();
        if (gant) {
          ctx.font = '13px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('🥊', p.x + R * 0.8, p.y - R * 0.8);
        }
        ctx.globalAlpha = 1;
        // Cœurs du Taureau.
        if (pid === bullPid && state.asym) {
          ctx.font = '11px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('❤️'.repeat(Math.max(0, p.lv)), p.x, p.y - R - 16);
        }
        helpers.nameTag(ctx, p.x, p.y - R - 6, config.players[pid]?.name || '', color);
      }

      juice.drawWorld(ctx);
      ctx.restore();

      // HUD écran.
      ctx.textAlign = 'center';
      ctx.font = '16px Bungee, sans-serif';
      ctx.fillStyle = '#B9A8D0';
      ctx.fillText(t('game.round', { n: `${state.round}/${state.rounds}` }), w / 2, 26);
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

      if (state.phase === 'pre') {
        ctx.font = 'bold 42px Bungee, sans-serif';
        ctx.fillStyle = '#FFC93C';
        ctx.fillText('EN PISTE !', w / 2, h / 2 - 40);
      }
      const meP = state.players[you];
      if (meP && !meP.al && state.phase === 'run') {
        ctx.font = '600 15px Rubik, sans-serif';
        ctx.fillStyle = '#B9A8D0';
        ctx.fillText(t('game.dead'), w / 2, h - 24);
      }
      if (meP) controls.setCooldown('dash', meP.cd);
    },

    destroy() { falls.length = 0; },
  };

  function norm(x, y) {
    const l = Math.hypot(x, y) || 1;
    return { x: x / l, y: y / l };
  }
}
