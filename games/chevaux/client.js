// PETITS CHEVAUX : rendu client. Plateau circulaire néon : piste en anneau,
// écuries à l'extérieur, échelles rayonnantes vers le centre, dé au milieu.
// Tap sur un cheval surligné pour le jouer.

import meta from './meta.js';
import { drawDie } from '/cardkit.js';

const AW = meta.arena.w, AH = meta.arena.h;
const CX = AW / 2, CY = AH / 2;
const R = 290;            // rayon de la piste
const LTOP = 232;         // rayon de la 1re case d'échelle
const LSTEP = 58;         // écart entre cases d'échelle
const STABLE_R = 350;     // rayon des écuries
const DONE_R = 36;        // rayon du cercle des arrivés

export function createClient({ ctx, helpers, config, you, send, controls }) {
  const { juice, sfx, TAU, clamp } = helpers;
  const teams = config.teams;
  const zones = [];
  const disp = {};          // id → { p: progression affichée (float) }
  let rollAnim = 0;
  let lastView = null;
  let lastBtns = '';

  const campColor = (c) => config.players[teams[c]?.[0]]?.color || helpers.colors[c % helpers.colors.length];
  const campLabel = (c) => {
    const names = (teams[c] || []).map((pid) => (config.players[pid]?.name || '').slice(0, 12));
    return names.length <= 1 ? names[0] || '' : `${names[0]} +${names.length - 1}`;
  };

  const startAngle = (vw, c, offset = 0) => -Math.PI / 2 + ((c * vw.per + offset) / vw.N) * TAU;

  function ringPos(vw, c, pf) {
    if (pf > vw.N - 1) {
      const a = startAngle(vw, c, vw.N - 1);
      const rad = LTOP - LSTEP * (pf - vw.N);
      return { x: CX + Math.cos(a) * rad, y: CY + Math.sin(a) * rad };
    }
    const a = startAngle(vw, c, pf);
    return { x: CX + Math.cos(a) * R, y: CY + Math.sin(a) * R };
  }

  function stablePos(vw, c, i) {
    const a = startAngle(vw, c);
    const rows = Math.ceil(vw.H / 2);
    const bx = CX + Math.cos(a) * STABLE_R;
    const by = CY + Math.sin(a) * STABLE_R;
    return {
      x: bx + ((i % 2) - (vw.H > 1 ? 0.5 : 0)) * 30,
      y: by + (Math.floor(i / 2) - (rows - 1) / 2) * 30,
    };
  }

  function donePos(vw, c, i) {
    const a = startAngle(vw, c) + (i - (vw.H - 1) / 2) * 0.35;
    return { x: CX + Math.cos(a) * DONE_R, y: CY + Math.sin(a) * DONE_R };
  }

  function posOfDisp(vw, id, pf) {
    const c = Math.floor(id / vw.H), i = id % vw.H;
    if (pf <= -0.999) return stablePos(vw, c, i);
    if (pf < 0) {
      const a = stablePos(vw, c, i), b = ringPos(vw, c, 0);
      const k = pf + 1;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    if (pf >= vw.N + 3 - 0.01) return donePos(vw, c, i);
    return ringPos(vw, c, pf);
  }

  function drawHorse(x, y, color, r2, opts = {}) {
    if (opts.halo) {
      ctx.beginPath();
      ctx.arc(x, y, r2 + 5 + Math.sin(performance.now() / 160) * 2, 0, TAU);
      ctx.strokeStyle = '#3DFF8A';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(x, y + r2 * 0.85, r2 * 0.9, r2 * 0.34, 0, 0, TAU);
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, r2, 0, TAU);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(20,10,38,.75)';
    ctx.stroke();
    ctx.font = `${Math.round(r2 * 1.4)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#140A26';
    ctx.fillText('♞', x, y + 1);
    ctx.textBaseline = 'alphabetic';
  }

  function evPos(evH) {
    if (!lastView || disp[evH] === undefined) return { x: CX, y: CY };
    return posOfDisp(lastView, evH, disp[evH].p);
  }

  return {
    onTap(x, y, phase) {
      if (phase !== 'end') return;
      const vp = helpers.viewport(AW, AH, 8);
      const w = vp.toWorld(x, y);
      for (const z of zones) {
        const dx = w.x - z.x, dy = w.y - z.y;
        if (dx * dx + dy * dy <= z.r * z.r) { z.fn(); return; }
      }
    },

    onEvents(evs) {
      for (const ev of evs) {
        if (ev.e === 'roll') {
          rollAnim = 0.45;
          sfx.play(ev.pid === you ? 'dash' : 'tickup');
        } else if (ev.e === 'turn') {
          if (ev.pid === you) {
            juice.floater(CX, CY - 96, 'À TOI !', { color: '#3DFF8A', size: 26 });
            sfx.play('whistle');
          }
        } else if (ev.e === 'sortie') {
          const p = evPos(ev.h);
          juice.floater(p.x, p.y, 'SORTIE !', { color: '#29D9FF', size: 16 });
          sfx.play('join');
        } else if (ev.e === 'capture') {
          const p = evPos(ev.h);
          juice.floater(p.x, p.y, 'CAPTURÉ !', { color: '#FF4757', size: 18 });
          juice.burst(p.x, p.y, { n: 18, color: '#FF4757', speed: 160 });
          juice.shake(5);
          sfx.play('steal');
          if (disp[ev.h]) disp[ev.h].p = -1;
        } else if (ev.e === 'arrive') {
          juice.confetti(CX, CY, ['#FFC93C', '#FF9F43', '#F5EFE6'], 40);
          juice.floater(CX, CY - 70, 'ARRIVÉ !', { color: '#FFC93C', size: 20 });
          sfx.play('coin');
        } else if (ev.e === 'replay') {
          juice.floater(CX, CY - 70, 'ENCORE !', { color: '#FFC93C', size: 18 });
          sfx.play('pickup');
        } else if (ev.e === 'pass') {
          if (ev.pid === you) juice.floater(CX, CY - 70, 'AUCUN COUP…', { color: '#B9A8D0', size: 15 });
        } else if (ev.e === 'move') {
          sfx.play('click');
        } else if (ev.e === 'win') {
          juice.confetti(CX, CY, ['#FFC93C', '#3DFF8A', '#FF3D8A', '#29D9FF'], 90);
          juice.shake(6);
          sfx.play('win');
        } else if (ev.e === 'timecap') {
          sfx.play('klaxon');
        }
      }
    },

    render(view, dt, now) {
      const v = view.latest;
      const { w, h } = helpers.size();
      helpers.bg(ctx);
      const vp = helpers.viewport(AW, AH, 8);
      ctx.save();
      vp.apply(ctx);
      zones.length = 0;
      rollAnim = Math.max(0, rollAnim - dt);

      const caseR = clamp(0.36 * (TAU * R / v.N), 10, 17);
      const meActive = v.pid === you;

      // Piste : anneau + cases.
      ctx.beginPath();
      ctx.arc(CX, CY, R, 0, TAU);
      ctx.strokeStyle = 'rgba(245,239,230,.05)';
      ctx.lineWidth = caseR * 2.6;
      ctx.stroke();
      for (let abs = 0; abs < v.N; abs++) {
        const a = -Math.PI / 2 + (abs / v.N) * TAU;
        const x = CX + Math.cos(a) * R, y = CY + Math.sin(a) * R;
        const isStart = abs % v.per === 0;
        const c = Math.floor(abs / v.per);
        ctx.beginPath();
        ctx.arc(x, y, caseR, 0, TAU);
        ctx.fillStyle = isStart ? campColor(c) + '55' : '#1E1038';
        ctx.fill();
        ctx.lineWidth = isStart ? 2 : 1.2;
        ctx.strokeStyle = isStart ? campColor(c) : 'rgba(185,168,208,.28)';
        ctx.stroke();
      }

      // Échelles d'arrivée (diamants) + écuries + noms.
      for (let c = 0; c < v.C; c++) {
        const col = campColor(c);
        const a = startAngle(v, c, v.N - 1);
        for (let k = 0; k < 4; k++) {
          const rad = LTOP - LSTEP * k;
          const x = CX + Math.cos(a) * rad, y = CY + Math.sin(a) * rad;
          const s = caseR * (k === 3 ? 1.0 : 0.85);
          ctx.beginPath();
          ctx.moveTo(x, y - s);
          ctx.lineTo(x + s, y);
          ctx.lineTo(x, y + s);
          ctx.lineTo(x - s, y);
          ctx.closePath();
          ctx.fillStyle = col + (k === 3 ? '66' : '33');
          ctx.fill();
          ctx.strokeStyle = col + '99';
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
        for (let i = 0; i < v.H; i++) {
          const p = stablePos(v, c, i);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 13, 0, TAU);
          ctx.fillStyle = 'rgba(30,16,56,.7)';
          ctx.fill();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = col + '77';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.setLineDash([]);
        }
        const sa = startAngle(v, c);
        const nx = clamp(CX + Math.cos(sa) * STABLE_R, 70, AW - 70);
        const ny = CY + Math.sin(sa) * STABLE_R + (Math.sin(sa) >= 0 ? 44 : -36);
        helpers.nameTag(ctx, nx, ny, campLabel(c), col, 13);
      }

      // Centre : podium.
      ctx.beginPath();
      ctx.arc(CX, CY, 54, 0, TAU);
      ctx.fillStyle = 'rgba(30,16,56,.92)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,201,60,.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Chevaux (animation de progression).
      for (let id = 0; id < v.horses.length; id++) {
        const target = v.horses[id];
        let d = disp[id];
        if (!d) d = disp[id] = { p: target };
        if (target < d.p - 0.001) d.p = target;
        else if (target > d.p) d.p = Math.min(target, d.p + dt * (d.p < 0 ? 3.2 : 9));
      }
      lastView = v;
      const myLegal = meActive && v.phase === 'move' ? v.legal : [];
      for (let id = 0; id < v.horses.length; id++) {
        const c = Math.floor(id / v.H);
        const pf = disp[id].p;
        const pos = posOfDisp(v, id, pf);
        const done = v.horses[id] === v.N + 3 && pf >= v.N + 3 - 0.01;
        const inStable = pf <= -0.999;
        const r2 = done ? 9 : inStable ? 11 : Math.min(15, caseR * 0.95);
        const playable = myLegal.includes(id);
        drawHorse(pos.x, pos.y, campColor(c), r2, { halo: playable });
        if (playable) {
          zones.push({ x: pos.x, y: pos.y, r: Math.max(32, r2 * 2.4), fn: () => { send.act('play', { h: id }); sfx.play('click'); } });
        }
      }

      // Dé au centre.
      const showDie = v.phase !== 'pre' && v.phase !== 'end';
      if (showDie) {
        const tumbling = rollAnim > 0;
        if (v.die || tumbling) {
          const ds = 54;
          const val = tumbling ? 1 + Math.floor(Math.abs(Math.sin(now / 47)) * 6) % 6 : v.die;
          ctx.beginPath();
          ctx.arc(CX, CY, 44, 0, TAU);
          ctx.strokeStyle = campColor(v.camp);
          ctx.lineWidth = 3;
          ctx.stroke();
          drawDie(ctx, CX - ds / 2, CY - ds / 2, ds, val, { angle: tumbling ? Math.sin(now / 45) * 0.4 : 0 });
        } else {
          ctx.font = '30px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.globalAlpha = 0.6 + Math.sin(now / 250) * 0.3;
          ctx.fillText('🎲', CX, CY + 10);
          ctx.globalAlpha = 1;
          if (meActive && v.phase === 'roll') {
            zones.push({ x: CX, y: CY, r: 60, fn: () => send.act('roll') });
          }
        }
      } else if (v.phase === 'pre' || v.phase === 'end') {
        ctx.font = '28px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⭐', CX, CY + 10);
      }

      juice.drawWorld(ctx);
      ctx.restore();

      // ── HUD (repère écran) ──
      ctx.textAlign = 'center';
      if (v.phase !== 'pre' && v.phase !== 'end') {
        const name = (config.players[v.pid]?.name || '').slice(0, 14).toUpperCase();
        ctx.font = '15px Bungee, sans-serif';
        ctx.fillStyle = campColor(v.camp);
        ctx.fillText(v.pid === you ? 'À TOI DE JOUER !' : `TOUR DE ${name}`, w / 2, 24);
        const max = v.phase === 'jockey' ? 4 : 10;
        const frac = Math.max(0, Math.min(1, v.tl / max));
        ctx.fillStyle = 'rgba(185,168,208,.25)';
        ctx.fillRect(w / 2 - 80, 32, 160, 5);
        ctx.fillStyle = v.tl < 3 ? '#FF4757' : '#3DFF8A';
        ctx.fillRect(w / 2 - 80, 32, 160 * frac, 5);
        // Chevaux arrivés par camp.
        const chipW = Math.min(52, (w - 20) / v.C);
        const x0 = w / 2 - (v.C * chipW) / 2;
        for (let c = 0; c < v.C; c++) {
          const x = x0 + c * chipW + chipW / 2;
          ctx.beginPath();
          ctx.arc(x - 14, 50, 5, 0, TAU);
          ctx.fillStyle = campColor(c);
          ctx.fill();
          ctx.font = '600 11px Rubik, sans-serif';
          ctx.fillStyle = c === v.camp ? '#F5EFE6' : '#B9A8D0';
          ctx.textAlign = 'left';
          ctx.fillText(`${v.arrived[c]}/${v.H}`, x - 6, 54);
        }
        ctx.textAlign = 'center';
      }
      if (v.phase === 'pre') {
        ctx.font = 'bold 30px Bungee, sans-serif';
        ctx.fillStyle = meta.color;
        ctx.fillText('PETITS CHEVAUX', w / 2, h / 2 - 30);
        ctx.font = '600 14px Rubik, sans-serif';
        ctx.fillStyle = '#B9A8D0';
        ctx.fillText('Un 6 pour sortir de l\'écurie !', w / 2, h / 2);
      }
      if (v.phase === 'end') {
        ctx.font = 'bold 26px Bungee, sans-serif';
        ctx.fillStyle = '#FFC93C';
        if (v.winner != null) {
          ctx.fillText('VICTOIRE !', w / 2, h / 2 - 34);
          ctx.font = '600 15px Rubik, sans-serif';
          ctx.fillStyle = campColor(v.winner);
          ctx.fillText(campLabel(v.winner), w / 2, h / 2 - 8);
        } else {
          ctx.fillText(v.timecap ? 'TEMPS ÉCOULÉ !' : 'FIN DE PARTIE', w / 2, h / 2 - 20);
        }
      }
      // Aide contextuelle.
      let hint = '';
      if (meActive && v.phase === 'roll') hint = 'Lance le dé (bouton, ESPACE, ou touche le centre).';
      else if (meActive && v.phase === 'jockey') hint = `Dé de ${v.die} : GARDER ou RELANCER ? (privilège du Jockey)`;
      else if (meActive && v.phase === 'move' && v.legal.length > 1) hint = 'Touche le cheval que tu veux jouer.';
      else if (v.phase === 'move' && v.streak >= 1 && v.die === 6) hint = 'Un 6 : ce camp rejouera !';
      if (hint) {
        ctx.font = '600 13px Rubik, sans-serif';
        ctx.fillStyle = '#B9A8D0';
        ctx.fillText(hint, w / 2, h - 16);
      }

      // Boutons contextuels.
      const showRoll = meActive && v.phase === 'roll';
      const showJockey = meActive && v.phase === 'jockey';
      const key = `${showRoll}|${showJockey}|${showJockey && !!v.canReroll}`;
      if (key !== lastBtns) {
        lastBtns = key;
        controls.showButton('roll', showRoll);
        controls.showButton('keep', showJockey);
        controls.showButton('reroll', showJockey && !!v.canReroll);
      }
    },

    destroy() {
      zones.length = 0;
      controls.showButton('roll', true);
      controls.showButton('keep', true);
      controls.showButton('reroll', true);
    },
  };
}
