// YAMS : rendu client. Layout adaptatif portrait / paysage : tes 5 dés en
// grand (tap = garder), vraie feuille de score avec sections et jauge de
// bonus, panneaux des autres joueurs avec dés en direct, bouton LANCER
// intégré au canvas. Caser un zéro demande une confirmation (re-tap).

import meta from './meta.js';
import { CATS, scoreCat, UPPER_TARGET } from '/shared/dice.js';
import { drawDie, roundRectPath } from '/cardkit.js';

const NUIT2 = '#1E1038';
const CRAIE = '#F5EFE6';
const CRAIE2 = '#B9A8D0';
const VERT = '#3DFF8A';
const ROUGE = '#FF4757';
const JAUNE = '#FFC93C';

export function createClient({ ctx, helpers, config, you, send, controls }) {
  const { juice, sfx } = helpers;
  const zones = [];              // zones tactiles (px écran)
  const tumble = {};             // pid : temps restant d'animation de lancer
  let armZero = null;            // { cat, at } : confirmation avant un zéro
  const others = Object.keys(config.players).filter((pid) => pid !== you);
  const pos = {};                // pid : dernière position dessinée (events)

  // Le bouton DOM est remplacé par un bouton dessiné dans le layout
  // (Espace reste le raccourci clavier : il presse le bouton caché).
  controls.showButton('roll', false);

  function fakeFace(seed) {
    return 1 + Math.floor(Math.abs(Math.sin(seed)) * 6) % 6;
  }

  function hitZone(x, y) {
    for (const z of zones) {
      if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) { z.fn(); return true; }
    }
    return false;
  }

  function tryPick(cat, preview, now) {
    if (preview === 0 && (!armZero || armZero.cat !== cat || now - armZero.at > 1600)) {
      armZero = { cat, at: now };
      sfx.play('tickup');
      return;
    }
    armZero = null;
    send.act('pick', { cat });
    sfx.play('click');
  }

  // ── Panneau d'un autre joueur ─────────────────────────────────────────
  function drawPanel(v, pid, x, y, pw, ph) {
    const p = v.players[pid];
    if (!p) return;
    pos[pid] = { x: x + pw / 2, y: y + ph / 2 };
    const color = config.players[pid]?.color || '#888';
    const now = performance.now();
    roundRectPath(ctx, x, y, pw, ph, 10);
    ctx.fillStyle = NUIT2;
    ctx.fill();
    ctx.strokeStyle = p.done ? 'rgba(61,255,138,.55)' : 'rgba(185,168,208,.22)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = `600 ${Math.max(9, pw * 0.062)}px Rubik, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = color;
    ctx.fillText((config.players[pid]?.name || '').slice(0, 12), x + 7, y + 13);
    ctx.textAlign = 'right';
    ctx.fillStyle = CRAIE;
    ctx.font = `800 ${Math.max(10, pw * 0.07)}px Rubik, sans-serif`;
    ctx.fillText(String(p.total), x + pw - 7, y + 13);
    const anim = tumble[pid] > 0;
    const ds = Math.min(ph - 26, (pw - 14 - 4 * 3) / 5);
    p.dice.forEach((d2, di) => {
      const dx = x + 7 + di * (ds + 3);
      const val = anim && !p.locked[di] ? fakeFace(now / 60 + di * 7 + x) : d2;
      drawDie(ctx, dx, y + 18, ds, val, {
        locked: !!p.locked[di], lockColor: color,
        angle: anim && !p.locked[di] ? Math.sin(now / 50 + di) * 0.3 : 0,
      });
    });
    ctx.textAlign = 'center';
    ctx.font = `${Math.max(8, pw * 0.055)}px system-ui, sans-serif`;
    ctx.fillStyle = CRAIE2;
    const marks = p.done ? '✔' : '🎲'.repeat(Math.max(0, p.rollsMax - p.rolls));
    ctx.fillText(marks, x + pw / 2, y + ph - 5);
  }

  // ── Une colonne de feuille : header + lignes + (jauge de bonus) ───────
  function drawSheetColumn(v, me, cats, x, y, colW, lh, title, withGauge, playable, now) {
    ctx.font = '800 11px Rubik, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = CRAIE2;
    ctx.fillText(title, x + 2, y + 12);
    let cy = y + 20;
    for (const cat of cats) {
      const used = me.sheet[cat] !== undefined;
      const preview = !used && playable ? scoreCat(cat, me.dice) : null;
      const armed = armZero && armZero.cat === cat && now - armZero.at <= 1600;
      roundRectPath(ctx, x, cy, colW, lh, 9);
      ctx.fillStyle = armed ? 'rgba(255,71,87,.18)'
        : used ? 'rgba(30,16,56,.9)'
          : preview > 0 ? 'rgba(61,255,138,.12)' : NUIT2;
      ctx.fill();
      ctx.strokeStyle = armed ? ROUGE
        : used ? 'rgba(185,168,208,.13)'
          : preview > 0 ? 'rgba(61,255,138,.8)' : 'rgba(185,168,208,.32)';
      ctx.lineWidth = preview > 0 || armed ? 1.8 : 1.1;
      ctx.stroke();
      const fs = Math.min(13, lh * 0.32);
      ctx.font = `600 ${fs}px Rubik, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillStyle = used ? '#7A6C93' : CRAIE;
      ctx.fillText(CATS[cat].label, x + 10, cy + lh / 2 - 2);
      ctx.font = `400 ${Math.max(8, fs - 3)}px Rubik, sans-serif`;
      ctx.fillStyle = used ? 'rgba(122,108,147,.7)' : 'rgba(185,168,208,.7)';
      ctx.fillText(armed ? 'RE-TAP POUR 0 !' : CATS[cat].hint, x + 10, cy + lh / 2 + fs - 1);
      ctx.textAlign = 'right';
      ctx.font = `800 ${Math.min(16, lh * 0.4)}px Rubik, sans-serif`;
      if (used) {
        ctx.fillStyle = me.sheet[cat] === 0 ? 'rgba(255,71,87,.75)' : CRAIE2;
        ctx.fillText(String(me.sheet[cat]), x + colW - 10, cy + lh / 2 + 5);
      } else if (preview != null) {
        ctx.fillStyle = preview > 0 ? VERT : 'rgba(185,168,208,.5)';
        ctx.fillText(String(preview), x + colW - 10, cy + lh / 2 + 5);
      } else {
        ctx.fillStyle = 'rgba(185,168,208,.35)';
        ctx.fillText('·', x + colW - 10, cy + lh / 2 + 5);
      }
      if (!used && playable) {
        const p2 = preview;
        zones.push({ x: x - 2, y: cy - 2, w: colW + 4, h: lh + 4, fn: () => tryPick(cat, p2, performance.now()) });
      }
      cy += lh + 5;
    }
    if (withGauge) {
      const frac = Math.min(1, me.upper / UPPER_TARGET);
      roundRectPath(ctx, x, cy, colW, 18, 9);
      ctx.fillStyle = NUIT2;
      ctx.fill();
      roundRectPath(ctx, x, cy, Math.max(10, colW * frac), 18, 9);
      ctx.fillStyle = me.bonus ? 'rgba(61,255,138,.35)' : 'rgba(255,201,60,.28)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(185,168,208,.3)';
      ctx.lineWidth = 1;
      roundRectPath(ctx, x, cy, colW, 18, 9);
      ctx.stroke();
      ctx.font = '800 10px Rubik, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = me.bonus ? VERT : CRAIE2;
      ctx.fillText(me.bonus ? 'BONUS +35 ✔' : `BONUS : ${me.upper} / ${UPPER_TARGET} (+35)`, x + colW / 2, cy + 13);
      cy += 24;
    }
    return cy;
  }

  // ── Mes dés + bouton LANCER dessiné ───────────────────────────────────
  function drawMyDice(v, me, cx, y, dieS, playable) {
    const now = performance.now();
    const anim = tumble[you] > 0;
    const gap = Math.max(6, dieS * 0.16);
    const total = 5 * dieS + 4 * gap;
    pos[you] = { x: cx, y: y + dieS / 2 };
    me.dice.forEach((d2, i) => {
      const dx = cx - total / 2 + i * (dieS + gap);
      const dy = me.locked[i] ? y - 6 : y;
      const val = anim && !me.locked[i] ? fakeFace(now / 55 + i * 11) : d2;
      drawDie(ctx, dx, dy, dieS, val, {
        locked: !!me.locked[i],
        lockColor: VERT,
        angle: anim && !me.locked[i] ? Math.sin(now / 45 + i * 2) * 0.35 : 0,
      });
      if (me.locked[i]) {
        ctx.font = `800 ${Math.max(8, dieS * 0.16)}px Rubik, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = VERT;
        ctx.fillText('GARDÉ', dx + dieS / 2, y - 12);
      }
      if (playable && me.rolls > 0) {
        zones.push({ x: dx - 4, y: dy - 12, w: dieS + 8, h: dieS + 18, fn: () => send.act('lock', { i }) });
      }
    });
    return y + dieS;
  }

  function drawRollButton(me, cx, y, playable) {
    const left = me.rollsMax - me.rolls;
    const canRoll = playable && left > 0;
    const bw = 190, bh = 42;
    roundRectPath(ctx, cx - bw / 2, y, bw, bh, 21);
    ctx.fillStyle = canRoll ? meta.color : 'rgba(42,26,74,.7)';
    ctx.fill();
    ctx.strokeStyle = canRoll ? 'rgba(245,239,230,.5)' : 'rgba(185,168,208,.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = '800 15px Bungee, Rubik, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = canRoll ? '#140A26' : 'rgba(185,168,208,.45)';
    const label = canRoll ? `🎲 LANCER (${left})`
      : me.done ? 'SCORE CASÉ ✔'
        : me.rolls === 0 ? 'PRÉPARE-TOI…' : 'CASE TON SCORE';
    ctx.fillText(label, cx, y + 27);
    if (canRoll) {
      zones.push({ x: cx - bw / 2, y: y - 4, w: bw, h: bh + 8, fn: () => send.act('roll') });
    }
    return y + bh;
  }

  function helpText(me, playable) {
    if (!playable) return me?.done ? 'Score casé. Regarde les autres transpirer…' : '';
    const left = me.rollsMax - me.rolls;
    if (left > 0 && me.rolls > 0) return 'Touche un dé pour le GARDER, une ligne pour caser.';
    if (left > 0) return 'Premier lancer : garde, relance, ou case direct.';
    return 'Plus de relance : case ton score dans une ligne libre !';
  }

  return {
    onTap(x, y, phase) {
      if (phase !== 'end') return;
      hitZone(x, y);
    },

    onEvents(evs) {
      const { w, h } = helpers.size();
      const at = (pid) => pos[pid] || { x: w / 2, y: h / 2 };
      for (const ev of evs) {
        if (ev.e === 'roll') {
          tumble[ev.pid] = 0.45;
          if (ev.pid === you || ev.first) sfx.play('des');
        } else if (ev.e === 'pick') {
          const p2 = at(ev.pid);
          juice.floater(p2.x, p2.y, `${ev.sc > 0 ? '+' + ev.sc : '0'} ${CATS[ev.cat]?.label || ev.cat}`, {
            color: ev.sc > 0 ? VERT : ROUGE, size: ev.pid === you ? 20 : 13,
          });
          if (ev.pid === you) sfx.play(ev.sc > 0 ? 'coin' : 'steal');
        } else if (ev.e === 'yams') {
          const p2 = at(ev.pid);
          juice.floater(p2.x, p2.y - 24, 'YAMS !!!', { color: JAUNE, size: 34 });
          juice.confetti(p2.x, p2.y, [JAUNE, meta.color, CRAIE], 60);
          juice.shake(6);
          sfx.play('win');
        } else if (ev.e === 'bonus') {
          const p2 = at(ev.pid);
          juice.floater(p2.x, p2.y - 16, 'BONUS +35 !', { color: VERT, size: ev.pid === you ? 24 : 15 });
          if (ev.pid === you) sfx.play('bank');
        } else if (ev.e === 'round') {
          armZero = null;
          sfx.play('whistle');
        } else if (ev.e === 'lock' && ev.pid === you) {
          sfx.play('tickup');
        }
      }
    },

    render(view, dt) {
      const v = view.latest;
      const { w, h } = helpers.size();
      helpers.bg(ctx);
      zones.length = 0;
      const now = performance.now();
      for (const pid of Object.keys(tumble)) {
        tumble[pid] -= dt;
        if (tumble[pid] <= 0) delete tumble[pid];
      }
      if (armZero && now - armZero.at > 1600) armZero = null;

      const me = v.players[you];
      const playable = !!me && v.phase === 'play' && !me.done;
      const portrait = h > w * 1.02;
      const topY = 44;

      // ── HUD : tour, chrono, total ──
      ctx.textAlign = 'center';
      ctx.font = '15px Bungee, sans-serif';
      ctx.fillStyle = CRAIE2;
      ctx.fillText(`TOUR ${v.round}/${v.roundN}`, w / 2, 22);
      if (v.phase === 'play') {
        const frac = Math.max(0, Math.min(1, v.tl / 25));
        ctx.fillStyle = 'rgba(185,168,208,.25)';
        ctx.fillRect(w / 2 - 80, 30, 160, 5);
        ctx.fillStyle = v.tl < 6 ? ROUGE : VERT;
        ctx.fillRect(w / 2 - 80, 30, 160 * frac, 5);
      }
      if (me) {
        ctx.textAlign = 'left';
        ctx.font = '800 13px Rubik, sans-serif';
        ctx.fillStyle = JAUNE;
        ctx.fillText(`TOTAL ${me.total}`, 12, 24);
        if (me.bonus) {
          ctx.font = '600 10px Rubik, sans-serif';
          ctx.fillStyle = VERT;
          ctx.fillText('bonus +35 ✔', 12, 38);
        }
      }

      // ── Spectateur : grille de tous les joueurs ──
      if (!me) {
        const all = Object.keys(v.players);
        const cols = portrait ? 2 : Math.min(4, all.length);
        const pw = Math.min(220, (w - 24 - (cols - 1) * 10) / cols);
        const ph = 64;
        all.forEach((pid, i) => {
          const gx = w / 2 - (cols * (pw + 10) - 10) / 2 + (i % cols) * (pw + 10);
          const gy = topY + 20 + Math.floor(i / cols) * (ph + 10);
          drawPanel(v, pid, gx, gy, pw, ph);
        });
        juice.drawWorld(ctx);
        return;
      }

      // ── Panneaux des autres ──
      let panelsBottom = topY;
      if (others.length) {
        if (portrait) {
          const cols = Math.min(4, others.length);
          const pw = (w - 16 - (cols - 1) * 6) / cols;
          const ph = 56;
          others.forEach((pid, i) => {
            const gx = 8 + (i % cols) * (pw + 6);
            const gy = topY + Math.floor(i / cols) * (ph + 6);
            drawPanel(v, pid, gx, gy, pw, ph);
          });
          panelsBottom = topY + Math.ceil(others.length / cols) * 62;
        } else {
          // Paysage : panneaux dans la bande centrale, entre les colonnes.
          const colW = Math.max(230, Math.min(w * 0.27, 320));
          const cxL = 12 + (v.hasUpper ? colW + 14 : 0);
          const cxR = w - 12 - colW - 14;
          const centerW = Math.max(180, cxR - cxL);
          const cols = Math.max(1, Math.min(others.length, Math.floor(centerW / 172)));
          const pw = Math.min(180, (centerW - (cols - 1) * 8) / cols);
          const ph = 56;
          others.forEach((pid, i) => {
            const gx = cxL + (centerW - (cols * (pw + 8) - 8)) / 2 + (i % cols) * (pw + 8);
            const gy = topY + Math.floor(i / cols) * (ph + 6);
            drawPanel(v, pid, gx, gy, pw, ph);
          });
          panelsBottom = topY + Math.ceil(others.length / cols) * 62;
        }
      }

      // ── Dés, bouton, feuille ──
      const upperCats = v.hasUpper ? v.cats.slice(0, 6) : null;
      const lowerCats = v.hasUpper ? v.cats.slice(6) : v.cats;

      if (portrait) {
        const dieS = Math.min(60, (w - 24 - 4 * 9) / 5);
        const diceBottom = drawMyDice(v, me, w / 2, panelsBottom + 22, dieS, playable);
        const btnBottom = drawRollButton(me, w / 2, diceBottom + 12, playable);
        ctx.font = '600 11px Rubik, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = CRAIE2;
        ctx.fillText(helpText(me, playable), w / 2, btnBottom + 16);
        const sheetY = btnBottom + 26;
        const availH = h - sheetY - 10;
        if (upperCats) {
          const colW = (w - 16 - 8) / 2;
          const lh = Math.max(30, Math.min(48, (availH - 22 - 24) / 6 - 5));
          const lh2 = Math.max(28, Math.min(48, (availH - 22) / 7 - 5));
          const lhc = Math.min(lh, lh2);
          drawSheetColumn(v, me, upperCats, 8, sheetY, colW, lhc, 'SECTION HAUTE', true, playable, now);
          drawSheetColumn(v, me, lowerCats, 8 + colW + 8, sheetY, colW, lhc, 'SECTION BASSE', false, playable, now);
        } else {
          const colW = Math.min(w - 24, 360);
          const lh = Math.max(30, Math.min(50, (availH - 22) / 7 - 5));
          drawSheetColumn(v, me, lowerCats, w / 2 - colW / 2, sheetY, colW, lh, 'FEUILLE EXPRESS', false, playable, now);
        }
      } else {
        const colW = Math.max(230, Math.min(w * 0.27, 320));
        const availH = h - topY - 14;
        const lhU = (availH - 22 - 24) / 6 - 5;
        const lhL = (availH - 22) / 7 - 5;
        const lh = Math.max(30, Math.min(52, lhU, lhL));
        if (upperCats) {
          drawSheetColumn(v, me, upperCats, 12, topY, colW, lh, 'SECTION HAUTE', true, playable, now);
        }
        drawSheetColumn(v, me, lowerCats, w - 12 - colW, topY, colW, lh, v.hasUpper ? 'SECTION BASSE' : 'FEUILLE EXPRESS', false, playable, now);
        const cxL = 12 + (v.hasUpper ? colW + 14 : 0);
        const cxR = w - 12 - colW - 14;
        const cx = (cxL + cxR) / 2;
        const dieS = Math.min(70, (cxR - cxL - 36 - 4 * 10) / 5);
        const dy = Math.max(panelsBottom + 24, h * 0.42);
        const diceBottom = drawMyDice(v, me, cx, dy, dieS, playable);
        const btnBottom = drawRollButton(me, cx, diceBottom + 16, playable);
        ctx.font = '600 12px Rubik, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = CRAIE2;
        ctx.fillText(helpText(me, playable), cx, btnBottom + 20);
      }

      // ── Bandeaux de phase ──
      if (v.phase === 'pre') {
        ctx.font = 'bold 36px Bungee, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = meta.color;
        ctx.fillText('YAMS !', w / 2, h / 2 - 30);
      } else if (v.phase === 'show') {
        ctx.font = '800 15px Rubik, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = CRAIE2;
        ctx.fillText(v.round >= v.roundN ? 'Feuille pleine ! Comptage…' : `Fin du tour ${v.round}`, w / 2, h / 2);
      }

      juice.drawWorld(ctx);
    },

    destroy() {
      zones.length = 0;
      controls.showButton('roll', true);
    },
  };
}
