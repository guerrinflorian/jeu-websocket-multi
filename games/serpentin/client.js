// SERPENTIN : rendu client. Les traînées sont accumulées localement à
// partir des snapshots (le serveur n'envoie que les têtes), et
// reconstruites via le snapshot complet à la (re)connexion.

import meta from './meta.js';

const TEAM_COLORS = ['#FF3D8A', '#29D9FF', '#FFC93C', '#3DFF8A'];
const ANG_FADE_MS = 3000;

export function createClient({ ctx, helpers, config, you, controls }) {
  const { t, juice, sfx, lerp, angleLerp, TAU } = helpers;
  const AW = meta.arena.w, AH = meta.arena.h;
  const trails = new Map();   // pid → [{ pts: [x,y,t,…], open }]
  let lastTick = -1;
  let lastRound = 0;
  let goAt = 0;               // instant du dernier « go » (pour l'aide TOI)
  const isAsym = config.format.kind === 'asym';
  const soloPids = new Set(isAsym ? config.teams[0] : []);
  const myTeam = config.teams.findIndex((tm) => tm.includes(you));

  function lineFor(pid) {
    if (!trails.has(pid)) trails.set(pid, []);
    return trails.get(pid);
  }

  function appendSnap(state, tick) {
    if (tick <= lastTick) return;
    lastTick = tick;
    if (state.round !== lastRound) {
      lastRound = state.round;
      trails.clear();
    }
    const now = performance.now();
    for (const [pid, ps] of Object.entries(state.players)) {
      const lines = lineFor(pid);
      const last = lines[lines.length - 1];
      if (!ps.al || ps.gp) {
        if (last) last.open = false;
        continue;
      }
      if (!last || !last.open) lines.push({ pts: [ps.x, ps.y, now], open: true });
      else last.pts.push(ps.x, ps.y, now);
    }
  }

  function rebuild(state) {
    trails.clear();
    lastRound = state.round;
    const now = performance.now();
    for (const [pid, playerLines] of Object.entries(state.trails || {})) {
      const lines = lineFor(pid);
      for (const flat of playerLines) {
        const pts = [];
        for (let i = 0; i < flat.length; i += 2) pts.push(flat[i], flat[i + 1], now);
        lines.push({ pts, open: false });
      }
      const last = lines[lines.length - 1];
      if (last && state.players[pid]?.al && !state.players[pid]?.gp) last.open = true;
    }
  }

  function interpPlayers(view) {
    const out = {};
    for (const [pid, b] of Object.entries(view.b.players || {})) {
      const a = view.a?.players?.[pid] || b;
      out[pid] = {
        x: lerp(a.x, b.x, view.alpha),
        y: lerp(a.y, b.y, view.alpha),
        a: angleLerp(a.a, b.a, view.alpha),
        al: b.al, gp: b.gp, b: b.b, cd: b.cd,
      };
    }
    return out;
  }

  return {
    onFull(state) { rebuild(state); },

    onEvents(evs) {
      for (const ev of evs) {
        if (ev.e === 'death') {
          const color = config.players[ev.pid]?.color || '#FFF';
          juice.burst(ev.x, ev.y, { n: 26, color, speed: 160, life: 0.7, size: 3.5 });
          juice.burst(ev.x, ev.y, { n: 10, color: '#FFC93C', speed: 90, life: 0.5, size: 2.5 });
          juice.ring(ev.x, ev.y, { color, maxR: 46, life: 0.4 });
          juice.shake(ev.pid === you ? 9 : 5);
          juice.floater(ev.x, ev.y, '💥', { size: 22 });
          sfx.play(ev.by === 'wall' ? 'hit' : 'death');
        } else if (ev.e === 'go') {
          sfx.play('go');
          goAt = performance.now();
          juice.floater(AW / 2, AH / 2 - 60, 'GO !', { color: '#3DFF8A', size: 34 });
        } else if (ev.e === 'boost') {
          sfx.play('boost');
        } else if (ev.e === 'roundEnd') {
          sfx.play(ev.team === null ? 'klaxon' : (isAsym && ev.team === 0) ? 'whistle' : 'ready');
          if (ev.team !== null) {
            const colors = (config.teams[ev.team] || []).map((pid) => config.players[pid]?.color || '#FFC93C');
            juice.confetti(AW / 2, AH / 3, colors.length ? colors : ['#FFC93C'], 50);
          }
        }
      }
    },

    render(view, dt) {
      const state = view.latest;
      appendSnap(state, view.tick);
      const { w, h } = helpers.size();
      helpers.bg(ctx);
      const vp = helpers.viewport(AW, AH, 26);
      ctx.save();
      vp.apply(ctx);

      // Piste : panneau nuit, points de repère, double bord néon.
      ctx.fillStyle = 'rgba(30,16,56,.6)';
      ctx.fillRect(0, 0, AW, AH);
      ctx.fillStyle = 'rgba(245,239,230,.05)';
      for (let gx = 80; gx < AW; gx += 80) {
        for (let gy = 80; gy < AH; gy += 80) {
          ctx.fillRect(gx - 1.5, gy - 1.5, 3, 3);
        }
      }
      ctx.strokeStyle = 'rgba(41,217,255,.14)';
      ctx.lineWidth = 12;
      ctx.strokeRect(-6, -6, AW + 12, AH + 12);
      ctx.strokeStyle = 'rgba(41,217,255,.45)';
      ctx.lineWidth = 6;
      ctx.strokeRect(-2, -2, AW + 4, AH + 4);
      ctx.strokeStyle = '#29D9FF';
      ctx.lineWidth = 2.2;
      ctx.strokeRect(0, 0, AW, AH);
      // Coins lumineux.
      ctx.fillStyle = '#29D9FF';
      for (const [cx2, cy2] of [[0, 0], [AW, 0], [0, AH], [AW, AH]]) {
        ctx.beginPath();
        ctx.arc(cx2, cy2, 5, 0, TAU);
        ctx.fill();
      }

      // Traînées.
      const now = performance.now();
      for (const [pid, lines] of trails) {
        const color = config.players[pid]?.color || '#888';
        const fade = soloPids.has(pid);
        for (const line of lines) {
          const pts = line.pts;
          if (pts.length < 6) continue;
          for (const [width, alpha] of [[13, 0.07], [7, 0.2], [3.2, 0.95]]) {
            ctx.beginPath();
            let started = false;
            for (let i = 0; i < pts.length; i += 3) {
              if (fade && now - pts[i + 2] > ANG_FADE_MS) continue;
              if (!started) { ctx.moveTo(pts[i], pts[i + 1]); started = true; }
              else ctx.lineTo(pts[i], pts[i + 1]);
            }
            ctx.strokeStyle = color;
            ctx.globalAlpha = fade ? alpha * 0.75 : alpha;
            ctx.lineWidth = width;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;

      // Têtes.
      const ps = interpPlayers(view);
      for (const [pid, p] of Object.entries(ps)) {
        if (!p.al) continue;
        const color = config.players[pid]?.color || '#888';
        const lines = trails.get(pid);
        const last = lines?.[lines.length - 1];
        if (last?.open && last.pts.length >= 3) {
          const n = last.pts.length;
          ctx.beginPath();
          ctx.moveTo(last.pts[n - 3], last.pts[n - 2]);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = color;
          ctx.lineWidth = 3.4;
          ctx.stroke();
        }
        if (pid === you) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 11 + Math.sin(now / 200) * 2, 0, TAU);
          ctx.strokeStyle = 'rgba(245,239,230,.7)';
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }
        if (p.b) {
          juice.burst(p.x - Math.cos(p.a) * 6, p.y - Math.sin(p.a) * 6,
            { n: 1, color, speed: 40, life: 0.35, size: 2.5 });
        }
        // Halo lumineux derrière la tête.
        ctx.globalAlpha = 0.22;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 11, 0, TAU);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, TAU);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(p.a) * 9, p.y + Math.sin(p.a) * 9);
        ctx.lineTo(p.x + Math.cos(p.a + 2.5) * 5.5, p.y + Math.sin(p.a + 2.5) * 5.5);
        ctx.lineTo(p.x + Math.cos(p.a - 2.5) * 5.5, p.y + Math.sin(p.a - 2.5) * 5.5);
        ctx.closePath();
        ctx.fillStyle = '#F5EFE6';
        ctx.fill();
        // Aide au départ : trajectoire de lancement en pointillés + « TOI ».
        const showHelp = state.phase === 'pre' || (goAt && now - goAt < 1600);
        if (showHelp) {
          ctx.setLineDash([7, 6]);
          ctx.globalAlpha = 0.65;
          ctx.beginPath();
          ctx.moveTo(p.x + Math.cos(p.a) * 12, p.y + Math.sin(p.a) * 12);
          ctx.lineTo(p.x + Math.cos(p.a) * 44, p.y + Math.sin(p.a) * 44);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
          if (pid === you) {
            ctx.font = '800 13px Rubik, sans-serif';
            ctx.textAlign = 'center';
            ctx.strokeStyle = 'rgba(20,10,38,.85)';
            ctx.lineWidth = 3;
            ctx.fillStyle = '#F5EFE6';
            ctx.strokeText('TOI ▼', p.x, p.y - 28);
            ctx.fillText('TOI ▼', p.x, p.y - 28);
          }
        }
        helpers.nameTag(ctx, p.x, p.y - 14, config.players[pid]?.name || '', color);
      }

      juice.drawWorld(ctx);
      ctx.restore();

      // ── HUD écran ──
      ctx.textAlign = 'center';
      ctx.font = '16px Bungee, sans-serif';
      ctx.fillStyle = '#B9A8D0';
      ctx.fillText(t('game.round', { n: `${state.round}/${state.rounds}` }), w / 2, 26);

      // Scores par équipe (pastilles).
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

      // Chrono de l'Anguille.
      if (state.asym && state.phase === 'run') {
        ctx.font = '22px Bungee, sans-serif';
        ctx.fillStyle = state.survT < 10 ? '#FF4757' : '#FFC93C';
        ctx.fillText(`${Math.max(0, Math.ceil(state.survT))} s`, w / 2, 78);
      }

      // Phases.
      if (state.phase === 'pre') {
        ctx.font = 'bold 42px Bungee, sans-serif';
        ctx.fillStyle = '#FFC93C';
        ctx.fillText(`MANCHE ${state.round}`, w / 2, h / 2 - 46);
        ctx.font = '600 16px Rubik, sans-serif';
        ctx.fillStyle = '#B9A8D0';
        ctx.fillText('Repère ta flèche de départ…', w / 2, h / 2 - 16);
      } else if (state.phase === 'end') {
        ctx.font = 'bold 34px Bungee, sans-serif';
        const evTeam = lastWinnerTeam(state);
        if (evTeam === null) {
          ctx.fillStyle = '#FF4757';
          ctx.fillText('DOUBLE K.O. !', w / 2, h / 2 - 40);
        } else {
          const label = teamLabel(evTeam);
          ctx.fillStyle = teams.length > 4 ? (config.players[teams[evTeam][0]]?.color || '#3DFF8A') : TEAM_COLORS[evTeam];
          ctx.fillText(`MANCHE À ${label} !`, w / 2, h / 2 - 40);
        }
      }

      // Mort → invitation à spectater.
      const meP = state.players[you];
      if (meP && !meP.al && state.phase === 'run') {
        ctx.font = '600 15px Rubik, sans-serif';
        ctx.fillStyle = '#B9A8D0';
        ctx.fillText(t('game.dead'), w / 2, h - 24);
      }

      if (meP) controls.setCooldown('boost', meP.cd);
    },

    destroy() { trails.clear(); },
  };

  function teamLabel(teamIdx) {
    const tm = config.teams[teamIdx];
    if (isAsym) return teamIdx === 0 ? config.format.roles?.solo?.toUpperCase() || 'SOLO' : 'LA MEUTE';
    if (tm.length === 1) return (config.players[tm[0]]?.name || '?').toUpperCase();
    return `L'ÉQUIPE ${['●', '▲', '■', '◆'][teamIdx] || teamIdx + 1}`;
  }

  function lastWinnerTeam(state) {
    // L'équipe gagnante de la manche = celle qui a encore un joueur en vie
    // (ou, en asym, déduite du chrono).
    const alive = new Set();
    for (const [pid, p] of Object.entries(state.players)) {
      if (p.al) alive.add(config.teams.findIndex((tm) => tm.includes(pid)));
    }
    if (state.asym) return alive.has(0) ? 0 : 1;
    return alive.size === 1 ? [...alive][0] : null;
  }
}
