// YAMS : rendu client. Tes 5 dés en grand (tap = garder), les dés des
// autres qui tremblent en direct, feuille de score en chips néon.

import meta from './meta.js';
import { CATS, scoreCat } from '/shared/dice.js';
import { drawDie, roundRectPath } from '/cardkit.js';

const AW = meta.arena.w, AH = meta.arena.h;

export function createClient({ ctx, helpers, config, you, send, controls }) {
  const { t, juice, sfx, TAU } = helpers;
  let lastView = null;
  const zones = [];
  const tumble = {};        // pid → temps restant d'animation de lancer
  let lastBtn = null;
  const others = Object.keys(config.players).filter((pid) => pid !== you);

  const otherPos = (i) => {
    const perRow = 4;
    const row = Math.floor(i / perRow);
    const inRow = others.length - row * perRow >= perRow ? perRow : others.length - row * perRow;
    const k = inRow === 1 ? 0.5 : (i % perRow) / (inRow - 1);
    return { x: 130 + k * (AW - 260), y: 64 + row * 78 };
  };

  function fakeFace(rngSeed) {
    return 1 + Math.floor(Math.abs(Math.sin(rngSeed)) * 6) % 6;
  }

  return {
    onTap(x, y, phase) {
      if (phase !== 'end') return;
      const vp = helpers.viewport(AW, AH, 8);
      const wpt = vp.toWorld(x, y);
      for (const z of zones) {
        if (wpt.x >= z.x && wpt.x <= z.x + z.w && wpt.y >= z.y && wpt.y <= z.y + z.h) { z.fn(); return; }
      }
    },

    onEvents(evs) {
      for (const ev of evs) {
        if (ev.e === 'roll') {
          tumble[ev.pid] = 0.45;
          if (ev.pid === you || ev.first) sfx.play('dash');
        } else if (ev.e === 'pick') {
          const mine = ev.pid === you;
          const pos = mine ? { x: AW / 2, y: 380 } : otherPos(others.indexOf(ev.pid));
          juice.floater(pos.x, pos.y, `${ev.sc > 0 ? '+' + ev.sc : '0'} ${CATS[ev.cat]?.label || ev.cat}`, {
            color: ev.sc > 0 ? '#3DFF8A' : '#FF4757', size: mine ? 20 : 14,
          });
          if (mine) sfx.play(ev.sc > 0 ? 'coin' : 'steal');
        } else if (ev.e === 'yams') {
          const pos = ev.pid === you ? { x: AW / 2, y: 320 } : otherPos(others.indexOf(ev.pid));
          juice.floater(pos.x, pos.y - 20, 'YAMS !!!', { color: '#FFC93C', size: 34 });
          juice.confetti(pos.x, pos.y, ['#FFC93C', '#4D7CFF', '#F5EFE6'], 60);
          juice.shake(6);
          sfx.play('win');
        } else if (ev.e === 'round') {
          sfx.play('whistle');
        } else if (ev.e === 'lock' && ev.pid === you) {
          sfx.play('tickup');
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
      zones.length = 0;
      for (const pid of Object.keys(tumble)) {
        tumble[pid] -= dt;
        if (tumble[pid] <= 0) delete tumble[pid];
      }

      const me = v.players[you];
      const now = performance.now();

      // Les autres joueurs : panneaux avec dés en direct.
      others.forEach((pid, i) => {
        const p = v.players[pid];
        if (!p) return;
        const pos = otherPos(i);
        const color = config.players[pid]?.color || '#888';
        roundRectPath(ctx, pos.x - 100, pos.y - 26, 200, 62, 12);
        ctx.fillStyle = '#1E1038';
        ctx.fill();
        ctx.strokeStyle = p.done ? 'rgba(61,255,138,.5)' : 'rgba(185,168,208,.2)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.font = '600 11px Rubik, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = color;
        ctx.fillText((config.players[pid]?.name || '').slice(0, 14), pos.x - 90, pos.y - 10);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#F5EFE6';
        ctx.font = '800 13px Rubik, sans-serif';
        ctx.fillText(`${p.total}`, pos.x + 90, pos.y - 10);
        const anim = tumble[pid] > 0;
        p.dice.forEach((d2, di) => {
          const dx = pos.x - 84 + di * 30;
          const val = anim && !p.locked[di] ? fakeFace(now / 60 + di * 7 + i * 13) : d2;
          drawDie(ctx, dx, pos.y - 2, 24, val, { locked: !!p.locked[di], lockColor: color, angle: anim && !p.locked[di] ? Math.sin(now / 50 + di) * 0.3 : 0 });
        });
        ctx.textAlign = 'center';
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillText(p.done ? '✔' : '🎲'.repeat(Math.max(0, p.rollsMax - p.rolls)), pos.x + 74, pos.y + 16);
      });

      // Mes dés, en grand.
      if (me) {
        const dieS = 66;
        const anim = tumble[you] > 0;
        me.dice.forEach((d2, i) => {
          const dx = AW / 2 + (i - 2) * (dieS + 18) - dieS / 2;
          const dy = me.locked[i] ? 398 : 406;
          const val = anim && !me.locked[i] ? fakeFace(now / 55 + i * 11) : d2;
          drawDie(ctx, dx, dy, dieS, val, {
            locked: !!me.locked[i],
            lockColor: '#3DFF8A',
            angle: anim && !me.locked[i] ? Math.sin(now / 45 + i * 2) * 0.35 : 0,
          });
          if (me.locked[i]) {
            ctx.font = '800 11px Rubik, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#3DFF8A';
            ctx.fillText('GARDÉ', dx + dieS / 2, 392);
          }
          if (v.phase === 'play' && !me.done && me.rolls > 0) {
            zones.push({ x: dx, y: dy, w: dieS, h: dieS, fn: () => send.act('lock', { i }) });
          }
        });
        ctx.font = '600 13px Rubik, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#B9A8D0';
        const left = me.rollsMax - me.rolls;
        ctx.fillText(
          me.done ? 'Score casé. Regarde les autres transpirer…'
            : left > 0 ? `${left} relance${left > 1 ? 's' : ''} restante${left > 1 ? 's' : ''} · touche un dé pour le garder`
              : 'Plus de relance : case ton score !',
          AW / 2, 498,
        );

        // Feuille de score.
        const perRow = 6;
        const rows = Math.ceil(v.cats.length / perRow);
        const chipW = 128, chipH = 46;
        v.cats.forEach((cat, ci) => {
          const row = Math.floor(ci / perRow);
          const inRow = Math.min(perRow, v.cats.length - row * perRow);
          const cx = AW / 2 - (inRow * (chipW + 8)) / 2 + (ci % perRow) * (chipW + 8) + chipW / 2 + 4;
          const cy = 516 + row * (chipH + 8);
          const used = me.sheet[cat] !== undefined;
          const preview = !used && v.phase === 'play' && !me.done ? scoreCat(cat, me.dice) : null;
          roundRectPath(ctx, cx - chipW / 2, cy, chipW, chipH, 10);
          ctx.fillStyle = used ? 'rgba(30,16,56,.9)' : preview > 0 ? 'rgba(61,255,138,.14)' : '#1E1038';
          ctx.fill();
          ctx.strokeStyle = used ? 'rgba(185,168,208,.15)' : preview > 0 ? '#3DFF8A' : 'rgba(185,168,208,.35)';
          ctx.lineWidth = preview > 0 ? 2 : 1.2;
          ctx.stroke();
          ctx.font = '600 11px Rubik, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillStyle = used ? '#7A6C93' : '#F5EFE6';
          ctx.fillText(`${CATS[cat].short} ${CATS[cat].label}`, cx - chipW / 2 + 10, cy + 19);
          ctx.textAlign = 'right';
          ctx.font = '800 15px Rubik, sans-serif';
          ctx.fillStyle = used ? '#B9A8D0' : preview > 0 ? '#3DFF8A' : '#7A6C93';
          ctx.fillText(used ? String(me.sheet[cat]) : preview != null ? String(preview) : '·', cx + chipW / 2 - 10, cy + 33);
          if (!used && v.phase === 'play' && !me.done) {
            zones.push({ x: cx - chipW / 2, y: cy, w: chipW, h: chipH, fn: () => { send.act('pick', { cat }); sfx.play('click'); } });
          }
        });

        ctx.font = '800 16px Rubik, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#F5EFE6';
        ctx.fillText(`TOTAL : ${me.total}`, AW / 2, 630);
      }

      // Bouton LANCER : visible seulement quand utile.
      const canRoll = !!me && v.phase === 'play' && !me.done && me.rolls < me.rollsMax;
      if (lastBtn !== canRoll) {
        lastBtn = canRoll;
        controls.showButton('roll', canRoll);
      }

      juice.drawWorld(ctx);
      ctx.restore();

      // ── HUD ──
      ctx.textAlign = 'center';
      ctx.font = '16px Bungee, sans-serif';
      ctx.fillStyle = '#B9A8D0';
      ctx.fillText(`TOUR ${v.round}/${v.roundN}`, w / 2, 24);
      if (v.phase === 'play') {
        const frac = Math.max(0, Math.min(1, v.tl / 25));
        ctx.fillStyle = 'rgba(185,168,208,.25)';
        ctx.fillRect(w / 2 - 80, 32, 160, 5);
        ctx.fillStyle = v.tl < 6 ? '#FF4757' : '#3DFF8A';
        ctx.fillRect(w / 2 - 80, 32, 160 * frac, 5);
      }
      if (v.phase === 'pre') {
        ctx.font = 'bold 36px Bungee, sans-serif';
        ctx.fillStyle = meta.color;
        ctx.fillText('YAMS !', w / 2, h / 2 - 30);
      }
    },

    destroy() {
      zones.length = 0;
      controls.showButton('roll', true);
    },
  };
}
