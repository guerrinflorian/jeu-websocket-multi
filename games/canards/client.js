// CANARDS : rendu client. Mare nocturne néon, canards dodus qui suivent le
// courant, épuisettes, comptoirs à auvent rayé, canard doré sous les spots.

import meta from './meta.js';

const AW = meta.arena.w, AH = meta.arena.h;
const CX = AW / 2, CY = 315;
const RX = 320, RY = 180;
const TEAM_COLORS = ['#FF3D8A', '#29D9FF', '#FFC93C', '#3DFF8A'];

export function createClient({ ctx, helpers, config, you, send, controls }) {
  const { t, juice, sfx, TAU, ix } = helpers;
  const isAsym = config.format.kind === 'asym';
  const heronPid = isAsym ? config.teams[0][0] : null;
  const teamIdxOf = {};
  config.teams.forEach((tm, i) => tm.forEach((pid) => { teamIdxOf[pid] = i; }));

  function drawDuck(c2, x, y, bob, gold, scale = 1, dir = 1) {
    const s = 15 * scale;
    c2.save();
    c2.translate(x, y + bob);
    if (gold) {
      c2.shadowColor = '#FFC93C';
      c2.shadowBlur = 16;
    }
    // Reflet.
    c2.globalAlpha = 0.25;
    c2.beginPath();
    c2.ellipse(0, s * 0.85, s * 1.1, s * 0.3, 0, 0, TAU);
    c2.fillStyle = '#0A0A1E';
    c2.fill();
    c2.globalAlpha = 1;
    // Corps.
    c2.beginPath();
    c2.ellipse(0, 0, s, s * 0.72, 0, 0, TAU);
    c2.fillStyle = gold ? '#FFD84D' : '#FFE45E';
    c2.fill();
    c2.strokeStyle = 'rgba(20,10,38,.35)';
    c2.lineWidth = 1.6;
    c2.stroke();
    // Aile.
    c2.beginPath();
    c2.ellipse(-s * 0.15, s * 0.05, s * 0.45, s * 0.3, -0.3, 0, TAU);
    c2.fillStyle = gold ? '#F5B32B' : '#F7CE3E';
    c2.fill();
    // Tête + bec + œil.
    c2.beginPath();
    c2.arc(s * 0.55 * dir, -s * 0.55, s * 0.42, 0, TAU);
    c2.fillStyle = gold ? '#FFD84D' : '#FFE45E';
    c2.fill();
    c2.stroke();
    c2.beginPath();
    c2.moveTo(s * 0.9 * dir, -s * 0.6);
    c2.lineTo(s * 1.25 * dir, -s * 0.48);
    c2.lineTo(s * 0.88 * dir, -s * 0.38);
    c2.closePath();
    c2.fillStyle = '#FF7A3D';
    c2.fill();
    c2.beginPath();
    c2.arc(s * 0.62 * dir, -s * 0.62, s * 0.07, 0, TAU);
    c2.fillStyle = '#241B2F';
    c2.fill();
    if (gold) {
      c2.shadowBlur = 0;
      c2.font = `${s * 0.9}px system-ui, sans-serif`;
      c2.textAlign = 'center';
      c2.fillText('⭐', 0, -s * 1.2);
    }
    c2.restore();
  }

  function drawNet(c2, x, y, color, { dip = 0, st = 0, carry = 0, me = false } = {}) {
    const r = 21;
    c2.save();
    c2.translate(x, y);
    const k = dip ? 0.82 : 1;
    if (me) {
      c2.beginPath();
      c2.arc(0, 0, r + 8 + Math.sin(performance.now() / 200) * 2, 0, TAU);
      c2.strokeStyle = 'rgba(245,239,230,.55)';
      c2.lineWidth = 1.6;
      c2.stroke();
    }
    // Manche.
    c2.strokeStyle = '#8A6A3B';
    c2.lineWidth = 4;
    c2.beginPath();
    c2.moveTo(r * 0.7, r * 0.7);
    c2.lineTo(r * 1.6, r * 1.6);
    c2.stroke();
    // Cerceau + filet.
    c2.beginPath();
    c2.arc(0, 0, r * k, 0, TAU);
    c2.fillStyle = 'rgba(20,10,38,.35)';
    c2.fill();
    c2.strokeStyle = color;
    c2.lineWidth = 3.5;
    c2.stroke();
    c2.strokeStyle = 'rgba(245,239,230,.35)';
    c2.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      c2.beginPath();
      c2.moveTo(i * r * 0.33 * k, -Math.sqrt(Math.max(0, 1 - (i * 0.33) ** 2)) * r * k);
      c2.lineTo(i * r * 0.33 * k, Math.sqrt(Math.max(0, 1 - (i * 0.33) ** 2)) * r * k);
      c2.stroke();
      c2.beginPath();
      c2.moveTo(-Math.sqrt(Math.max(0, 1 - (i * 0.33) ** 2)) * r * k, i * r * 0.33 * k);
      c2.lineTo(Math.sqrt(Math.max(0, 1 - (i * 0.33) ** 2)) * r * k, i * r * 0.33 * k);
      c2.stroke();
    }
    if (carry) drawDuck(c2, 0, -2, 0, carry === 2, 0.75);
    if (st) {
      c2.font = '14px system-ui, sans-serif';
      c2.textAlign = 'center';
      c2.fillText('💫', 0, -r - 8);
    }
    c2.restore();
  }

  return {
    onEvents(evs) {
      for (const ev of evs) {
        if (ev.e === 'dip') {
          juice.ring(ev.x, ev.y, { color: '#29D9FF', maxR: 30, life: 0.3 });
          sfx.play('click');
        } else if (ev.e === 'miss') {
          juice.burst(ev.x, ev.y, { n: 10, color: '#29D9FF', speed: 90, life: 0.4, size: 2.5 });
          if (ev.pid === you) sfx.play('fall');
        } else if (ev.e === 'catch') {
          sfx.play('pickup');
          if (ev.gold) sfx.play('coin');
        } else if (ev.e === 'eat') {
          juice.floater(ev.x, ev.y - 26, `+${ev.val} 🦩`, { color: '#B14BFF', size: 16 });
          sfx.play('coin');
        } else if (ev.e === 'bank') {
          juice.floater(ev.x, ev.y - 30, `+${ev.val} 🦆`, { color: ev.gold ? '#FFC93C' : '#3DFF8A', size: ev.gold ? 22 : 17 });
          juice.confetti(ev.x, ev.y - 10, [ev.gold ? '#FFC93C' : '#3DFF8A'], 14);
          sfx.play(ev.pid === you ? 'bank' : 'coin');
        } else if (ev.e === 'drop') {
          juice.floater(ev.x, ev.y - 26, `LÂCHÉ ! (${ev.val})`, { color: '#FF4757', size: 15 });
          sfx.play('steal');
        } else if (ev.e === 'reject') {
          juice.floater(ev.x, ev.y - 26, `rejeté (${ev.val})…`, { color: '#B9A8D0', size: 13 });
          sfx.play('leave');
        } else if (ev.e === 'bomb') {
          juice.burst(ev.x, ev.y, { n: 24, color: '#FF4757', speed: 220, life: 0.5, size: 3.5 });
          juice.floater(ev.x, ev.y - 30, 'BOUM ! -2 💣', { color: '#FF4757', size: 18 });
          juice.shake(ev.pid === you ? 9 : 4);
          sfx.play('shot');
        } else if (ev.e === 'splash') {
          juice.ring(ev.x, ev.y, { color: '#29D9FF', maxR: 105, life: 0.5, width: 4 });
          juice.burst(ev.x, ev.y, { n: 20, color: '#29D9FF', speed: 180, life: 0.5, size: 3 });
          sfx.play('dash');
        } else if (ev.e === 'gold') {
          juice.floater(CX, CY - 40, 'CANARD DORÉ ! ⭐', { color: '#FFC93C', size: 26 });
          sfx.play('mission');
        } else if (ev.e === 'rush') {
          juice.floater(CX, CY - 70, 'RUSH FINAL ! LE COURANT S\'EMBALLE', { color: '#FF4757', size: 22 });
          sfx.play('klaxon');
        } else if (ev.e === 'fin') {
          sfx.play('whistle');
        }
      }
    },

    render(view, dt) {
      const v = view.latest;
      const { w, h } = helpers.size();
      helpers.bg(ctx);
      const vp = helpers.viewport(AW, AH, 8);
      ctx.save();
      vp.apply(ctx);
      const now = performance.now();

      // La mare : anneau d'eau.
      ctx.beginPath();
      ctx.ellipse(CX, CY, RX * 1.32, RY * 1.42, 0, 0, TAU);
      const wg = ctx.createRadialGradient(CX, CY, RX * 0.5, CX, CY, RX * 1.3);
      wg.addColorStop(0, '#123', );
      wg.addColorStop(0.6, '#14285A');
      wg.addColorStop(1, '#0E1D42');
      ctx.fillStyle = wg;
      ctx.fill();
      ctx.strokeStyle = 'rgba(41,217,255,.4)';
      ctx.lineWidth = 3;
      ctx.stroke();
      // Île centrale.
      ctx.beginPath();
      ctx.ellipse(CX, CY, RX * 0.62, RY * 0.56, 0, 0, TAU);
      ctx.fillStyle = '#221240';
      ctx.fill();
      ctx.strokeStyle = 'rgba(185,168,208,.25)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = '34px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⛲', CX, CY + 6);
      ctx.font = '13px system-ui, sans-serif';
      for (const [lx, ly, e] of [[CX - 90, CY - 30, '🪷'], [CX + 80, CY + 34, '🪷'], [CX + 60, CY - 44, '🌿']]) {
        ctx.fillText(e, lx, ly);
      }
      // Courant : tirets animés sur deux ellipses.
      ctx.setLineDash([14, 22]);
      ctx.lineDashOffset = -(now / 30) % 36;
      ctx.strokeStyle = 'rgba(41,217,255,.18)';
      ctx.lineWidth = 2;
      for (const k of [0.85, 1.12]) {
        ctx.beginPath();
        ctx.ellipse(CX, CY, RX * k, RY * k, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;

      // Comptoirs d'équipe.
      for (const c of v.counters) {
        const color = config.teams.length > 4 ? '#FFC93C' : TEAM_COLORS[c.t % TEAM_COLORS.length];
        ctx.fillStyle = '#1E1038';
        ctx.fillRect(c.x - 34, c.y - 16, 68, 34);
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = i % 2 === 0 ? color : '#F5EFE6';
          ctx.fillRect(c.x - 34 + i * 17, c.y - 26, 17, 10);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(c.x - 34, c.y - 16, 68, 34);
        ctx.font = '800 14px Rubik, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#F5EFE6';
        ctx.fillText(`${v.teamScores[c.t]}`, c.x, c.y + 6);
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillText('🦆', c.x + 24, c.y + 7);
      }

      // Canards (interpolés).
      const ducks = ix(view, 'ducks');
      for (const d of ducks) {
        drawDuck(ctx, d.x, d.y, d.b || 0, !!d.g);
      }

      // Joueurs (interpolés).
      const players = ix(view, 'players');
      for (const p of players) {
        const color = config.players[p.id]?.color || '#888';
        const isHeron = p.id === heronPid;
        if (isHeron) {
          ctx.font = '26px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🦩', p.x, p.y - 26);
        }
        drawNet(ctx, p.x, p.y, color, { dip: p.dip, st: p.st, carry: p.carry, me: p.id === you });
        helpers.nameTag(ctx, p.x, p.y - 30 - (isHeron ? 22 : 0), config.players[p.id]?.name || '', color, 11);
        if (p.id === you && p.carry && v.myVal != null) {
          ctx.font = '800 15px Rubik, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = p.carry === 2 ? '#FFC93C' : '#3DFF8A';
          ctx.fillText(`= ${v.myVal} pts (secret)`, p.x, p.y + 42);
        }
      }

      juice.drawWorld(ctx);
      ctx.restore();

      // Cooldown du splash sur le bouton.
      const meP = v.players.find((p) => p.id === you);
      controls.setCooldown('splash', meP ? (meP.cd || 0) / 4 : 0);

      // ── HUD ──
      ctx.textAlign = 'center';
      ctx.font = '22px Bungee, sans-serif';
      ctx.fillStyle = v.tl <= 15 ? '#FF4757' : '#F5EFE6';
      const mm = Math.floor(v.tl / 60), ss = String(v.tl % 60).padStart(2, '0');
      ctx.fillText(`${mm}:${ss}`, w / 2, 30);
      if (v.rush) {
        ctx.font = '12px Bungee, sans-serif';
        ctx.fillStyle = '#FF4757';
        ctx.fillText('RUSH FINAL', w / 2, 48);
      }
      if (meP) {
        ctx.font = '600 13px Rubik, sans-serif';
        ctx.fillStyle = '#B9A8D0';
        ctx.fillText(
          meP.carry ? (you === heronPid ? '' : 'Ramène-le à TON comptoir ! (PLONGER = rejeter)')
            : you === heronPid ? 'Gobe sur place, grand échassier.' : 'PLONGE sur un canard pour le pêcher',
          w / 2, h - 20,
        );
      }
    },

    destroy() {},
  };
}
