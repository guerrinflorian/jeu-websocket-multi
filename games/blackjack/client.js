// BLACKJACK : rendu client. Table de tripot forain : feutre nuit, cartes
// procédurales (cardkit), distribution animée, décisions simultanées.

import meta from './meta.js';
import { drawCard, drawCardBack, drawChip, roundRectPath } from '/cardkit.js';

const AW = meta.arena.w, AH = meta.arena.h;

export function createClient({ ctx, helpers, config, you, send, controls }) {
  const { t, juice, sfx, TAU } = helpers;
  const isAsym = config.format.kind === 'asym';
  const croupierPid = isAsym ? config.teams[0][0] : null;
  const meCroupier = you === croupierPid;
  const seats = Object.keys(config.players).filter((pid) => pid !== croupierPid);
  const flights = [];   // cartes en vol vers une main
  let lastBtns = '';
  let lastView = null;

  const seatPos = (i) => {
    const n = Math.max(1, seats.length);
    const k = n === 1 ? 0.5 : i / (n - 1);
    return { x: 120 + k * (AW - 240), y: 330 + Math.sin(k * Math.PI) * 92 };
  };
  const seatIdx = Object.fromEntries(seats.map((pid, i) => [pid, i]));
  const targetPos = (to) => {
    if (to === 'D') return { x: AW / 2, y: 140 };
    if (to === you && !meCroupier) return { x: AW / 2, y: 470 };
    const i = seatIdx[to];
    return i === undefined ? { x: AW / 2, y: 300 } : seatPos(i);
  };

  function setButtons(v) {
    const p = v.players[you];
    let hit = false, stand = false, dbl = false;
    if (meCroupier) {
      hit = stand = v.phase === 'dealer';
    } else if (p) {
      const active = v.phase === 'act' && !p.done;
      hit = stand = active;
      dbl = active && p.cards.length === 2;
    }
    const key = `${hit}${stand}${dbl}`;
    if (key !== lastBtns) {
      lastBtns = key;
      controls.showButton('hit', hit);
      controls.showButton('stand', stand);
      controls.showButton('double', dbl);
    }
  }

  function totalBadge(c2, x, y, total, opts = {}) {
    const w2 = 34;
    roundRectPath(c2, x - w2 / 2, y - 12, w2, 22, 11);
    c2.fillStyle = opts.bust ? '#FF4757' : opts.bj ? '#FFC93C' : 'rgba(20,10,38,.85)';
    c2.fill();
    c2.font = '800 13px Rubik, sans-serif';
    c2.textAlign = 'center';
    c2.fillStyle = opts.bust || opts.bj ? '#140A26' : '#F5EFE6';
    c2.fillText(String(total), x, y + 4);
  }

  function drawHand(c2, cards, cx, cy, w2, hideNone) {
    const n = cards.length;
    if (!n) return;
    const span = Math.min(w2 * 0.72, 190 / n) * (n - 1);
    cards.forEach((id, i) => {
      const x = cx - span / 2 + i * (n > 1 ? span / (n - 1) : 0) - w2 / 2;
      const ang = (i - (n - 1) / 2) * 0.06;
      if (id < 0 && !hideNone) drawCardBack(c2, x, cy - w2 * 0.7, w2, { angle: ang, tint: meta.color });
      else if (id >= 0) drawCard(c2, id, x, cy - w2 * 0.7, w2, { angle: ang });
    });
  }

  return {
    onTap() {},

    onEvents(evs) {
      for (const ev of evs) {
        if (ev.e === 'card') {
          flights.push({ to: ev.to, t: 0, dur: 0.28 });
          sfx.play('click');
        } else if (ev.e === 'bj') {
          const pos = targetPos(ev.pid);
          juice.floater(pos.x, pos.y - 60, 'BLACKJACK !', { color: '#FFC93C', size: 22 });
          juice.confetti(pos.x, pos.y - 40, ['#FFC93C', '#F5EFE6'], 30);
          sfx.play('mission');
        } else if (ev.e === 'bust') {
          const pos = targetPos(ev.pid);
          juice.floater(pos.x, pos.y - 60, 'BOUM ! +21', { color: '#FF4757', size: 20 });
          juice.shake(ev.pid === you ? 6 : 3);
          sfx.play('death');
        } else if (ev.e === 'double') {
          const pos = targetPos(ev.pid);
          juice.floater(pos.x, pos.y - 60, 'TAPIS ×2 !', { color: '#B14BFF', size: 20 });
          sfx.play('boost');
        } else if (ev.e === 'result') {
          const pos = targetPos(ev.pid);
          if (ev.d !== 0) {
            juice.floater(pos.x, pos.y - 44, `${ev.d > 0 ? '+' : ''}${ev.d} 🪙`, {
              color: ev.d > 0 ? '#3DFF8A' : '#FF4757', size: 18,
            });
          }
          if (ev.pid === you) sfx.play(ev.d > 0 ? 'bank' : ev.d < 0 ? 'steal' : 'tickup');
        } else if (ev.e === 'reveal') {
          sfx.play('whistle');
        } else if (ev.e === 'hand') {
          flights.length = 0;
          sfx.play('join');
        } else if (ev.e === 'loan' && ev.pid === you) {
          juice.floater(AW / 2, 420, 'LE FORAIN TE PRÊTE 20 🪙', { color: '#FFC93C', size: 16 });
        }
      }
    },

    render(view, dt) {
      const v = view.latest;
      lastView = v;
      const { w, h } = helpers.size();
      helpers.bg(ctx);
      const vp = helpers.viewport(AW, AH, 8);
      ctx.save();
      vp.apply(ctx);
      setButtons(v);

      // Table : feutre nuit en demi-galette.
      ctx.beginPath();
      ctx.moveTo(70, 70);
      ctx.lineTo(AW - 70, 70);
      ctx.bezierCurveTo(AW - 40, 70, AW - 40, 200, AW - 90, 330);
      ctx.bezierCurveTo(AW - 150, 480, AW / 2 + 180, 570, AW / 2, 570);
      ctx.bezierCurveTo(AW / 2 - 180, 570, 150, 480, 90, 330);
      ctx.bezierCurveTo(40, 200, 40, 70, 70, 70);
      ctx.closePath();
      ctx.fillStyle = '#2B1650';
      ctx.fill();
      ctx.strokeStyle = meta.color;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,201,60,.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.arc(AW / 2, 40, 330, 0.25, Math.PI - 0.25);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '600 15px Rubik, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(245,239,230,.28)';
      ctx.fillText('LA BANQUE TIRE JUSQU\'À 17 · BLACKJACK PAYÉ 3 POUR 2', AW / 2, 268);
      ctx.restore();

      // Sabot.
      drawCardBack(ctx, AW - 130, 46, 52, { tint: meta.color });
      drawCardBack(ctx, AW - 126, 42, 52, { tint: meta.color });

      // Banque (croupier).
      const dName = croupierPid ? (config.players[croupierPid]?.name || 'Croupier') : 'Gaston, croupier maison';
      const dColor = croupierPid ? (config.players[croupierPid]?.color || '#B9A8D0') : '#B9A8D0';
      helpers.nameTag(ctx, AW / 2, 62, `🎩 ${dName}`, dColor, 13);
      drawHand(ctx, v.dealer.cards, AW / 2, 150, 62);
      if (v.dealer.total != null) {
        totalBadge(ctx, AW / 2 + 110, 140, v.dealer.total, { bust: v.dealer.total > 21 });
      }
      if (v.bank != null) {
        ctx.font = '800 14px Rubik, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFC93C';
        ctx.fillText(`banque : ${v.bank} 🪙`, AW / 2, 208);
      }

      // Joueurs autour de la table.
      seats.forEach((pid, i) => {
        const p = v.players[pid];
        if (!p) return;
        const pos = seatPos(i);
        const isMe = pid === you;
        const cw = isMe ? 0 : 40; // ma main est dessinée en grand plus bas
        if (!isMe) {
          drawHand(ctx, p.cards, pos.x, pos.y, cw);
          if (p.cards.length) totalBadge(ctx, pos.x + 52, pos.y - 24, p.total, { bust: !!p.bust, bj: !!p.bj });
        }
        const color = config.players[pid]?.color || '#888';
        helpers.nameTag(ctx, pos.x, pos.y + 26, config.players[pid]?.name || '', color, 12);
        ctx.font = '600 12px Rubik, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#B9A8D0';
        ctx.fillText(`${p.chips} 🪙`, pos.x, pos.y + 42);
        drawChip(ctx, pos.x - 44, pos.y + 36, 10, color, p.bet);
        if (v.phase === 'act') {
          ctx.font = '13px system-ui, sans-serif';
          ctx.fillText(p.bust ? '💥' : p.bj ? '⭐' : p.done ? '✋' : '🤔', pos.x + 44, pos.y + 40);
        }
      });

      // Ma main, en grand.
      const meP = v.players[you];
      if (meP && !meCroupier) {
        drawHand(ctx, meP.cards, AW / 2, 486, 88);
        if (meP.cards.length) {
          totalBadge(ctx, AW / 2 + 130, 460, meP.total, { bust: !!meP.bust, bj: !!meP.bj });
        }
        drawChip(ctx, AW / 2 - 150, 470, 16, config.players[you]?.color || '#FFF', meP.bet);
        ctx.font = '800 14px Rubik, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#F5EFE6';
        ctx.fillText(`${meP.chips} 🪙`, AW / 2 - 150, 504);
      } else if (meCroupier) {
        ctx.font = 'bold 20px Bungee, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFC93C';
        ctx.fillText('TU ES LA BANQUE', AW / 2, 480);
        ctx.font = '600 14px Rubik, sans-serif';
        ctx.fillStyle = '#B9A8D0';
        ctx.fillText(v.phase === 'dealer' ? 'À toi de tirer (obligé sous 14) ou de rester.' : 'Attends la fin de leurs décisions…', AW / 2, 506);
      }

      // Cartes en vol depuis le sabot.
      for (let i = flights.length - 1; i >= 0; i--) {
        const f = flights[i];
        f.t += dt;
        const k = Math.min(1, f.t / f.dur);
        if (k >= 1) { flights.splice(i, 1); continue; }
        const pos = targetPos(f.to);
        const ease = 1 - (1 - k) * (1 - k);
        const x = AW - 126 + (pos.x - (AW - 126)) * ease;
        const y = 42 + (pos.y - 42) * ease;
        drawCardBack(ctx, x, y, 46, { angle: k * 0.8, tint: meta.color });
      }

      juice.drawWorld(ctx);
      ctx.restore();

      // ── HUD ──
      ctx.textAlign = 'center';
      ctx.font = '16px Bungee, sans-serif';
      ctx.fillStyle = '#B9A8D0';
      ctx.fillText(`MAIN ${v.hand}/${v.hands}`, w / 2, 26);

      if (v.phase === 'act' || (v.phase === 'dealer' && isAsym)) {
        const frac = Math.max(0, Math.min(1, v.tl / (v.phase === 'act' ? 15 : 12)));
        ctx.fillStyle = 'rgba(185,168,208,.25)';
        ctx.fillRect(w / 2 - 80, 34, 160, 5);
        ctx.fillStyle = v.tl < 4 ? '#FF4757' : '#3DFF8A';
        ctx.fillRect(w / 2 - 80, 34, 160 * frac, 5);
      }
      const hint = meCroupier
        ? (v.phase === 'dealer' ? 'TIRER ou RESTER : ta banque, tes règles (dès 14).' : '')
        : (v.phase === 'act' && meP && !meP.done ? 'TIRER, RESTER, ou ×2 pour doubler la mise (une seule carte).' : '');
      if (hint) {
        ctx.font = '600 13px Rubik, sans-serif';
        ctx.fillStyle = '#B9A8D0';
        ctx.fillText(hint, w / 2, h - 18);
      }
    },

    destroy() {
      flights.length = 0;
      controls.showButton('hit', true);
      controls.showButton('stand', true);
      controls.showButton('double', true);
    },
  };
}
