// MAGOT : rendu client : tas d'or, caisses, porteurs ralentis, tacles.

import meta from './meta.js';

const TEAM_COLORS = ['#FF3D8A', '#29D9FF', '#FFC93C', '#3DFF8A'];

export function createClient({ ctx, helpers, config, you, controls }) {
  const { t, juice, sfx, lerp, angleLerp, TAU } = helpers;
  const AW = meta.arena.w, AH = meta.arena.h;
  const CX = AW / 2, CY = AH / 2;
  const isAsym = config.format.kind === 'asym';
  const dragonPid = isAsym ? config.teams[0][0] : null;
  let lastCarry = 0;

  const teamColor = (team) => {
    const tm = config.teams[team];
    return config.teams.length > 4 || tm?.length === 1
      ? (config.players[tm[0]]?.color || '#888')
      : TEAM_COLORS[team];
  };

  function interpPlayers(view) {
    const out = {};
    for (const [pid, b] of Object.entries(view.b.players || {})) {
      const a = view.a?.players?.[pid] || b;
      out[pid] = {
        x: lerp(a.x, b.x, view.alpha),
        y: lerp(a.y, b.y, view.alpha),
        a: angleLerp(a.a, b.a, view.alpha),
        c: b.c, st: b.st, cd: b.cd,
      };
    }
    return out;
  }

  return {
    onEvents(evs) {
      for (const ev of evs) {
        if (ev.e === 'coin') {
          if (ev.pid === you) sfx.play(ev.g > 1 ? 'bank' : 'coin');
        } else if (ev.e === 'bank') {
          if (ev.pid === you) sfx.play('bank');
        } else if (ev.e === 'rainWarn') {
          sfx.play('whistle');
          juice.floater(ev.x, ev.y, '💰 PLUIE D\'OR !', { color: '#FFC93C', size: 18 });
        } else if (ev.e === 'rain') {
          sfx.play('bank');
          juice.burst(ev.x, ev.y, { n: 30, color: '#FFC93C', speed: 200, life: 0.9, size: 4, grav: 220 });
          juice.ring(ev.x, ev.y, { color: '#FFC93C', maxR: 90, life: 0.5 });
          juice.shake(4);
        } else if (ev.e === 'pileEmpty') {
          sfx.play('klaxon');
          juice.floater(450, 240, 'LE TAS EST VIDE !', { color: '#FF4757', size: 24 });
        } else if (ev.e === 'golden') {
          sfx.play('mission');
          juice.flash('#FFC93C', 0.25);
        } else if (ev.e === 'drop') {
          juice.burst(ev.x, ev.y, { n: Math.min(30, 8 + ev.n * 2), color: '#FFC93C', speed: 170, life: 0.7, size: 3.5, grav: 60 });
          juice.shake(ev.pid === you ? 9 : 4);
          if (ev.n > 0) juice.floater(ev.x, ev.y, `-${ev.n} 🪙`, { color: '#FF4757', size: 18 });
          sfx.play(ev.pid === you ? 'death' : 'hit');
        } else if (ev.e === 'tackle') {
          sfx.play('dash');
        } else if (ev.e === 'steal') {
          if (config.teams[ev.team]?.includes(you)) {
            sfx.play('steal');
            juice.floater(ev.x, ev.y, 'ON VOUS VOLE !', { color: '#FF4757', size: 14 });
          }
        } else if (ev.e === 'goldpick') {
          sfx.play('bank');
          juice.burst(ev.x, ev.y, { n: 18, color: '#FFC93C', speed: 140, life: 0.6, size: 4 });
          juice.floater(ev.x, ev.y, '+5 ✨', { color: '#FFC93C', size: 20 });
        } else if (ev.e === 'gold') {
          sfx.play('mission');
        } else if (ev.e === 'go') {
          sfx.play('go');
        } else if (ev.e === 'end') {
          sfx.play('whistle');
        }
      }
    },

    render(view, dt) {
      const state = view.latest;
      const { w, h } = helpers.size();
      helpers.bg(ctx);
      const vp = helpers.viewport(AW, AH, 20);
      ctx.save();
      vp.apply(ctx);

      // Sol de la fête.
      ctx.fillStyle = 'rgba(30,16,56,.55)';
      ctx.fillRect(0, 0, AW, AH);
      ctx.strokeStyle = '#FFC93C';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(0, 0, AW, AH);

      // Zone de pluie d'or annoncée : cercle clignotant.
      if (view.b.rain) {
        const blink = 0.4 + 0.6 * Math.abs(Math.sin(performance.now() / 130));
        ctx.globalAlpha = blink;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.arc(view.b.rain.x, view.b.rain.y, 72, 0, TAU);
        ctx.strokeStyle = '#FFC93C';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = '22px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('💰', view.b.rain.x, view.b.rain.y + 8);
        ctx.globalAlpha = 1;
      }

      // Caisses (couronne sur celle du leader).
      const leaderBank = Math.max(0, ...((view.b.caisses || []).map((c) => c.banked)));
      for (const c of view.b.caisses || []) {
        const color = teamColor(c.team);
        const mine = config.teams[c.team]?.includes(you);
        ctx.beginPath();
        ctx.arc(c.x, c.y, 44, 0, TAU);
        ctx.fillStyle = 'rgba(20,10,38,.5)';
        ctx.fill();
        ctx.setLineDash(mine ? [] : [6, 5]);
        ctx.strokeStyle = color;
        ctx.lineWidth = mine ? 4 : 2.5;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = '800 20px Rubik, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = color;
        ctx.fillText(String(c.banked), c.x, c.y + 7);
        ctx.font = '600 10px Rubik, sans-serif';
        ctx.fillStyle = 'rgba(245,239,230,.55)';
        ctx.fillText(mine ? 'TA CAISSE' : 'CAISSE', c.x, c.y - 14);
        if (c.banked > 0 && c.banked === leaderBank) {
          ctx.font = '16px system-ui';
          ctx.fillText('👑', c.x, c.y - 28);
        }
      }

      // Le tas central (fini : il fond à vue d'œil).
      const pileScale = Math.max(0.1, Math.min(1, state.pile / (state.pileMax || 44)));
      ctx.beginPath();
      ctx.arc(CX, CY, 64, 0, TAU);
      ctx.fillStyle = 'rgba(255,201,60,.07)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,201,60,.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Monticule de jetons pseudo-aléatoire mais stable.
      const nCoins = Math.round(24 * pileScale);
      for (let i = 0; i < nCoins; i++) {
        const ga = i * 2.399963;
        const gr = 8 + (i % 7) * 6 * pileScale;
        ctx.beginPath();
        ctx.arc(CX + Math.cos(ga) * gr, CY + Math.sin(ga) * gr, 6, 0, TAU);
        ctx.fillStyle = i % 3 ? '#FFC93C' : '#FFB01F';
        ctx.fill();
        ctx.strokeStyle = 'rgba(20,10,38,.4)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.font = '800 16px Rubik, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = state.pile === 0 ? '#FF4757' : '#FFC93C';
      ctx.fillText(`${state.asym ? '🐉' : '🪙'} ${state.pile}`, CX, CY - 74);

      // Jetons au sol.
      for (const f of view.b.floor || []) {
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.v > 1 ? 9 : 5.5, 0, TAU);
        ctx.fillStyle = f.v > 1 ? '#FFF3B0' : '#FFC93C';
        ctx.fill();
        ctx.strokeStyle = 'rgba(20,10,38,.5)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        if (f.v > 1) {
          ctx.font = '10px system-ui';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#7a4c00';
          ctx.fillText('★', f.x, f.y + 3.5);
        }
      }

      // Joueurs.
      const ps = interpPlayers(view);
      for (const [pid, p] of Object.entries(ps)) {
        const color = config.players[pid]?.color || '#888';
        const R = pid === dragonPid ? 19 : 14;
        helpers.shadow(ctx, p.x, p.y, R);

        if (pid === you) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, R + 7 + Math.sin(performance.now() / 200) * 2, 0, TAU);
          ctx.strokeStyle = 'rgba(245,239,230,.6)';
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }
        // Porteur : halo doré proportionnel (lisible par tout le monde).
        if (p.c > 0) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, R + 4 + Math.min(10, p.c), 0, TAU);
          ctx.strokeStyle = `rgba(255,201,60,${Math.min(0.65, 0.15 + p.c * 0.05)})`;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        ctx.globalAlpha = p.st ? 0.55 : 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, R, 0, TAU);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(20,10,38,.5)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(p.a) * R * 0.6, p.y + Math.sin(p.a) * R * 0.6, R * 0.28, 0, TAU);
        ctx.fillStyle = '#F5EFE6';
        ctx.fill();
        ctx.globalAlpha = 1;
        if (pid === dragonPid) {
          ctx.font = '15px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('🐉', p.x, p.y - R - 16);
        }
        if (p.st) {
          ctx.font = '13px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('💫', p.x, p.y - R - 4);
        }
        if (p.c > 0) {
          ctx.font = '800 12px Rubik, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#FFC93C';
          ctx.strokeStyle = 'rgba(20,10,38,.8)';
          ctx.lineWidth = 3;
          ctx.strokeText(`×${p.c}`, p.x + R + 10, p.y + 4);
          ctx.fillText(`×${p.c}`, p.x + R + 10, p.y + 4);
        }
        helpers.nameTag(ctx, p.x, p.y - R - 6, config.players[pid]?.name || '', color);
      }

      juice.drawWorld(ctx);
      ctx.restore();

      // Son de ramassage local (le serveur reste silencieux sur les picks).
      const meP = state.players[you];
      if (meP) {
        if (meP.c > lastCarry) sfx.play('pickup');
        lastCarry = meP.c;
      }

      // HUD : chrono + scores en direct + heure dorée.
      ctx.textAlign = 'center';
      ctx.font = '26px Bungee, sans-serif';
      const tl = state.timeLeft;
      ctx.fillStyle = state.golden ? '#FFC93C' : tl <= 30 ? '#FF4757' : '#F5EFE6';
      ctx.fillText(`${Math.floor(tl / 60)}:${String(tl % 60).padStart(2, '0')}`, w / 2, 34);

      const caisses = view.b.caisses || [];
      const chipW = Math.min(64, (w - 170) / Math.max(1, caisses.length));
      const x0 = w / 2 - (caisses.length * chipW) / 2 + chipW / 2;
      const bestBank = Math.max(0, ...caisses.map((c) => c.banked));
      caisses.forEach((c, i) => {
        const cx = x0 + i * chipW;
        ctx.beginPath();
        ctx.arc(cx - 14, 50, 6, 0, TAU);
        ctx.fillStyle = teamColor(c.team);
        ctx.fill();
        ctx.font = '800 15px Rubik, sans-serif';
        ctx.fillStyle = '#F5EFE6';
        ctx.textAlign = 'left';
        ctx.fillText(`${c.banked}${c.banked > 0 && c.banked === bestBank ? '👑' : ''}`, cx - 4, 55);
        ctx.textAlign = 'center';
      });

      if (state.golden) {
        const pulse = 0.7 + 0.3 * Math.sin(performance.now() / 150);
        ctx.globalAlpha = pulse;
        ctx.font = '18px Bungee, sans-serif';
        ctx.fillStyle = '#FFC93C';
        ctx.fillText('✨ HEURE DORÉE · DÉPÔTS ×2 ✨', w / 2, 80);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = `rgba(255,201,60,${0.25 * pulse})`;
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, w - 6, h - 6);
      }

      if (meP && meP.c > 0) {
        ctx.font = '600 14px Rubik, sans-serif';
        ctx.fillStyle = '#FFC93C';
        ctx.fillText(`💰 ×${meP.c} : tu ralentis…`, w / 2, h - 24);
      }
      if (state.phase === 'pre') {
        ctx.font = 'bold 40px Bungee, sans-serif';
        ctx.fillStyle = '#FFC93C';
        ctx.fillText('À L\'OR !', w / 2, h / 2 - 40);
      }
      if (meP) controls.setCooldown('tackle', meP.cd);
    },

    destroy() { },
  };
}
