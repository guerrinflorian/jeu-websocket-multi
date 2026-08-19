// 7 FAMILLES : rendu client. Cartes famille procédurales, sélection en
// 3 taps (famille → membre → joueur), bulles de demande publiques.

import meta from './meta.js';
import { FAMILIES, MEMBERS, famOf } from '/shared/cards.js';
import { roundRectPath } from '/cardkit.js';

const AW = meta.arena.w, AH = meta.arena.h;

export function createClient({ ctx, helpers, config, you, send }) {
  const { t, juice, sfx, TAU } = helpers;
  let lastView = null;
  let selFam = -1;
  let selMem = -1;
  let bubble = null;        // { from, to, fam, mem, ok, t }
  const zones = [];         // zones cliquables recalculées à chaque frame
  const others = Object.keys(config.players).filter((pid) => pid !== you);

  const otherPos = (i) => {
    const n = Math.max(1, others.length);
    const k = n === 1 ? 0.5 : i / (n - 1);
    return { x: 130 + k * (AW - 260), y: 190 + Math.sin(k * Math.PI) * 26 };
  };
  const posOf = (pid) => (pid === you ? { x: AW / 2, y: 560 } : otherPos(others.indexOf(pid)));

  function drawFamCard(c2, x, y, w, card, opts = {}) {
    const h = w * 1.4;
    const { fam, mem } = famOf(card);
    const F = FAMILIES[fam], M = MEMBERS[mem];
    c2.save();
    c2.translate(x + w / 2, y + h / 2);
    if (opts.angle) c2.rotate(opts.angle);
    c2.translate(-w / 2, -h / 2);
    c2.shadowColor = 'rgba(0,0,0,.4)';
    c2.shadowBlur = w * 0.1;
    c2.shadowOffsetY = w * 0.04;
    roundRectPath(c2, 0, 0, w, h, w * 0.1);
    c2.fillStyle = '#F7F3EA';
    c2.fill();
    c2.shadowColor = 'transparent';
    c2.shadowBlur = 0;
    c2.shadowOffsetY = 0;
    c2.strokeStyle = opts.glow || '#D9CFC0';
    c2.lineWidth = opts.glow ? Math.max(1.5, w * 0.05) : 1;
    c2.stroke();
    // Bandeau famille.
    c2.save();
    roundRectPath(c2, 0, 0, w, h, w * 0.1);
    c2.clip();
    c2.fillStyle = F.color;
    c2.fillRect(0, 0, w, h * 0.24);
    c2.restore();
    c2.font = `${w * 0.17}px system-ui, sans-serif`;
    c2.textAlign = 'center';
    c2.fillText(F.emoji, w * 0.16, h * 0.17);
    c2.font = `800 ${w * 0.1}px Rubik, sans-serif`;
    c2.fillStyle = '#140A26';
    c2.fillText(F.name.toUpperCase().slice(0, 11), w * 0.58, h * 0.16);
    // Membre.
    c2.font = `${w * 0.5}px system-ui, sans-serif`;
    c2.fillText(M.emoji, w / 2, h * 0.62);
    c2.font = `800 ${w * 0.15}px Rubik, sans-serif`;
    c2.fillStyle = '#241B2F';
    c2.fillText(M.name, w / 2, h * 0.88);
    if (opts.dim) {
      roundRectPath(c2, 0, 0, w, h, w * 0.1);
      c2.fillStyle = `rgba(20,10,38,${opts.dim})`;
      c2.fill();
    }
    c2.restore();
  }

  function myGroups(v) {
    const hand = v.hands[you] || [];
    const groups = new Map();
    for (const c of hand) {
      const f = famOf(c).fam;
      if (!groups.has(f)) groups.set(f, []);
      groups.get(f).push(c);
    }
    for (const arr of groups.values()) arr.sort((a, b) => a - b);
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }

  return {
    onTap(x, y, phase) {
      if (phase !== 'end') return;
      const vp = helpers.viewport(AW, AH, 8);
      const wpt = vp.toWorld(x, y);
      for (const z of zones) {
        if (wpt.x >= z.x && wpt.x <= z.x + z.w && wpt.y >= z.y && wpt.y <= z.y + z.h) {
          z.fn();
          return;
        }
      }
      if (selMem >= 0) { selMem = -1; sfx.play('click'); }
      else if (selFam >= 0) { selFam = -1; sfx.play('click'); }
    },

    onEvents(evs) {
      for (const ev of evs) {
        if (ev.e === 'ask') {
          bubble = { ...ev, t: 0 };
          sfx.play(ev.ok ? 'coin' : 'steal');
          if (ev.from === you && !ev.ok) juice.floater(AW / 2, 480, 'PIOCHE !', { color: '#FF4757', size: 20 });
          if (ev.to === you && ev.ok) juice.floater(AW / 2, 480, 'TU DONNES TA CARTE…', { color: '#FFC93C', size: 16 });
        } else if (ev.e === 'draw') {
          sfx.play('pickup');
        } else if (ev.e === 'lucky') {
          const pos = posOf(ev.pid);
          juice.floater(pos.x, pos.y - 40, 'BONNE PIOCHE ! 🍀', { color: '#3DFF8A', size: 18 });
          sfx.play('mission');
        } else if (ev.e === 'family') {
          const pos = posOf(ev.pid);
          const F = FAMILIES[ev.fam];
          juice.floater(pos.x, pos.y - 56, `FAMILLE ${F.name.toUpperCase()} !`, { color: F.color, size: 20 });
          juice.confetti(pos.x, pos.y - 30, [F.color, '#F5EFE6'], 40);
          sfx.play('win');
        } else if (ev.e === 'turn') {
          if (ev.pid === you) {
            sfx.play('ready');
            juice.floater(AW / 2, 440, 'À TOI DE DEMANDER !', { color: '#3DFF8A', size: 20 });
          }
          selFam = -1; selMem = -1;
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
      const myTurn = v.turn === you && v.phase === 'turn';

      // Tableau des 7 familles (haut).
      const slotW = 74;
      const x0 = AW / 2 - (7 * slotW) / 2;
      for (let f = 0; f < 7; f++) {
        const F = FAMILIES[f];
        const sx = x0 + f * slotW + slotW / 2;
        const winner = v.famDone[f];
        roundRectPath(ctx, sx - 30, 26, 60, 64, 10);
        ctx.fillStyle = winner !== undefined ? 'rgba(61,255,138,.12)' : '#1E1038';
        ctx.fill();
        ctx.strokeStyle = winner !== undefined ? (config.players[winner]?.color || '#3DFF8A') : 'rgba(185,168,208,.25)';
        ctx.lineWidth = winner !== undefined ? 2.4 : 1.2;
        ctx.stroke();
        ctx.font = '26px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.globalAlpha = winner !== undefined ? 1 : 0.75;
        ctx.fillText(F.emoji, sx, 62);
        ctx.globalAlpha = 1;
        ctx.font = '600 9px Rubik, sans-serif';
        ctx.fillStyle = winner !== undefined ? (config.players[winner]?.color || '#3DFF8A') : '#B9A8D0';
        ctx.fillText(winner !== undefined ? (config.players[winner]?.name || '').slice(0, 9) : F.name.slice(0, 11), sx, 82);
      }

      // Pioche au centre.
      const deckX = AW / 2, deckY = 300;
      for (let i = 0; i < Math.min(4, v.deckN); i++) {
        roundRectPath(ctx, deckX - 24 - i * 1.5, deckY - 34 - i * 2, 48, 68, 6);
        ctx.fillStyle = i === Math.min(4, v.deckN) - 1 ? '#31205A' : '#241448';
        ctx.fill();
        ctx.strokeStyle = 'rgba(245,239,230,.3)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.font = '800 13px Rubik, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#B9A8D0';
      ctx.fillText(v.deckN ? `pioche · ${v.deckN}` : 'pioche vide', deckX, deckY + 52);

      // Les autres joueurs.
      others.forEach((pid, i) => {
        const pos = otherPos(i);
        const color = config.players[pid]?.color || '#888';
        const isTurn = v.turn === pid;
        if (isTurn) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 30 + Math.sin(performance.now() / 180) * 3, 0, TAU);
          ctx.strokeStyle = 'rgba(245,239,230,.6)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 24, 0, TAU);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(20,10,38,.5)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.font = '18px system-ui, sans-serif';
        ctx.fillText('🂠', pos.x, pos.y + 7);
        helpers.nameTag(ctx, pos.x, pos.y - 32, config.players[pid]?.name || '', color, 11);
        ctx.font = '600 11px Rubik, sans-serif';
        ctx.fillStyle = '#F5EFE6';
        ctx.fillText(`${v.counts[pid] ?? 0} carte${(v.counts[pid] ?? 0) > 1 ? 's' : ''}`, pos.x, pos.y + 42);
        const fams = v.fams[pid] || [];
        if (fams.length) {
          ctx.font = '13px system-ui, sans-serif';
          ctx.fillText(fams.map((f) => FAMILIES[f].emoji).join(''), pos.x, pos.y + 58);
        }
      });

      // Bulle de la dernière demande.
      if (bubble) {
        bubble.t += dt;
        if (bubble.t > 3.4) bubble = null;
        else {
          const from = posOf(bubble.from);
          const F = FAMILIES[bubble.fam], M = MEMBERS[bubble.mem];
          const toP = config.players[bubble.to];
          const text = `${F.emoji} ${M.name} → ${toP?.name || '?'} ?`;
          const stamp = bubble.t > 0.7 ? (bubble.ok ? 'TIENS ! 🎁' : 'PIOCHE !') : null;
          const bx = Math.max(120, Math.min(AW - 120, from.x));
          const by = from.y + (bubble.from === you ? -74 : 74);
          ctx.font = '600 13px Rubik, sans-serif';
          const tw = ctx.measureText(text).width + 24;
          roundRectPath(ctx, bx - tw / 2, by - 16, tw, stamp ? 46 : 30, 10);
          ctx.fillStyle = 'rgba(245,239,230,.95)';
          ctx.fill();
          ctx.fillStyle = '#241B2F';
          ctx.textAlign = 'center';
          ctx.fillText(text, bx, by + 3);
          if (stamp) {
            ctx.font = '800 13px Rubik, sans-serif';
            ctx.fillStyle = bubble.ok ? '#0E8F4D' : '#C22B3D';
            ctx.fillText(stamp, bx, by + 22);
          }
        }
      }

      // Ma main, groupée par famille.
      const groups = myGroups(v);
      const gw = 58;
      const groupSpan = Math.min(112, groups.length > 1 ? (AW - 200) / groups.length : 112);
      const gx0 = AW / 2 - (groups.length * groupSpan) / 2 + groupSpan / 2;
      groups.forEach(([fam, cards], gi) => {
        const gx = gx0 + gi * groupSpan;
        const raised = selFam === fam;
        const gy = raised ? 500 : 522;
        cards.forEach((card, ci) => {
          drawFamCard(ctx, gx - gw / 2 + (ci - (cards.length - 1) / 2) * 14, gy, gw, card, {
            angle: (ci - (cards.length - 1) / 2) * 0.05,
            glow: raised ? FAMILIES[fam].color : null,
          });
        });
        ctx.font = '800 12px Rubik, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = raised ? FAMILIES[fam].color : '#B9A8D0';
        ctx.fillText(`${cards.length}/6`, gx, 622);
        if (myTurn) {
          zones.push({
            x: gx - groupSpan / 2, y: 470, w: groupSpan, h: 170,
            fn: () => { selFam = fam; selMem = -1; sfx.play('click'); },
          });
        }
      });

      // Étape 2 : choisir le membre manquant.
      if (myTurn && selFam >= 0 && selMem < 0) {
        const hand = new Set(v.hands[you] || []);
        const mw = 52;
        const mx0 = AW / 2 - (6 * (mw + 10)) / 2 + (mw + 10) / 2;
        ctx.font = '800 14px Rubik, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = FAMILIES[selFam].color;
        ctx.fillText(`Famille ${FAMILIES[selFam].name} : je demande…`, AW / 2, 372);
        for (let m = 0; m < 6; m++) {
          const card = selFam * 6 + m;
          const owned = hand.has(card);
          const mx = mx0 + m * (mw + 10);
          drawFamCard(ctx, mx - mw / 2, 384, mw, card, { dim: owned ? 0.55 : 0, glow: owned ? null : '#FFC93C' });
          if (owned) {
            ctx.font = '800 16px Rubik, sans-serif';
            ctx.fillStyle = '#3DFF8A';
            ctx.fillText('✔', mx + mw / 2 - 8, 398);
          } else {
            zones.push({
              x: mx - mw / 2, y: 384, w: mw, h: mw * 1.4,
              fn: () => { selMem = m; sfx.play('click'); },
            });
          }
        }
      }

      // Étape 3 : choisir la cible.
      if (myTurn && selFam >= 0 && selMem >= 0) {
        ctx.font = '800 14px Rubik, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#F5EFE6';
        ctx.fillText(`${FAMILIES[selFam].emoji} ${MEMBERS[selMem].name} : à qui ?`, AW / 2, 380);
        const cw2 = 92;
        const cx0 = AW / 2 - (others.length * cw2) / 2 + cw2 / 2;
        others.forEach((pid, i) => {
          const cx = cx0 + i * cw2;
          const color = config.players[pid]?.color || '#888';
          roundRectPath(ctx, cx - 40, 394, 80, 54, 12);
          ctx.fillStyle = '#1E1038';
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx, 412, 11, 0, TAU);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.font = '600 10px Rubik, sans-serif';
          ctx.fillStyle = '#F5EFE6';
          ctx.fillText((config.players[pid]?.name || '').slice(0, 11), cx, 440);
          zones.push({
            x: cx - 40, y: 394, w: 80, h: 54,
            fn: () => {
              send.act('ask', { fam: selFam, mem: selMem, to: pid });
              selFam = -1; selMem = -1;
              sfx.play('whistle');
            },
          });
        });
      }

      juice.drawWorld(ctx);
      ctx.restore();

      // ── HUD ──
      ctx.textAlign = 'center';
      if (v.phase === 'turn' && v.turn) {
        const p = config.players[v.turn];
        ctx.font = '800 15px Rubik, sans-serif';
        ctx.fillStyle = p?.color || '#F5EFE6';
        ctx.fillText(myTurn
          ? (selFam < 0 ? 'Touche une de TES familles' : selMem < 0 ? 'Choisis le membre manquant' : 'Choisis ta victime')
          : `${p?.name || '?'} réfléchit…`, w / 2, 22);
        const frac = Math.max(0, Math.min(1, v.tl / v.tmax));
        ctx.fillStyle = 'rgba(185,168,208,.25)';
        ctx.fillRect(w / 2 - 80, 30, 160, 5);
        ctx.fillStyle = v.tl < 3 ? '#FF4757' : '#3DFF8A';
        ctx.fillRect(w / 2 - 80, 30, 160 * frac, 5);
      }
      if (v.phase === 'pre') {
        ctx.font = 'bold 34px Bungee, sans-serif';
        ctx.fillStyle = '#FFC93C';
        ctx.fillText('7 FAMILLES !', w / 2, h / 2 - 30);
      }
    },

    destroy() { zones.length = 0; },
  };
}
