// BOMBER : rendu client. Une bombe noire au centre avec sa syllabe, la meche
// qui raccourcit, les joueurs en cercle avec leurs coeurs, et le champ de
// saisie qui n apparait que quand la bombe est dans TES mains.
// Deux mises en page : paysage et portrait.

import meta from './meta.js';
import { roundRectPath } from '/cardkit.js';

const GOLD = '#FFC93C';
const CREAM = '#F5EFE6';
const MAUVE = '#B9A8D0';
const GREEN = '#3DFF8A';
const RED = '#FF4757';
const ORANGE = '#FF7A3D';

const LAND = {
  AW: 1000, AH: 640, portrait: false,
  cx: 500, cy: 258, rx: 340, ry: 148,
  bombR: 74, consigneY: 468, alphaY: 508, histY: 546, podW: 132,
};
const PORT = {
  AW: 620, AH: 1030, portrait: true,
  cx: 310, cy: 400, rx: 232, ry: 268,
  bombR: 78, consigneY: 716, alphaY: 796, histY: 886, podW: 124,
};

export function createClient({ ctx, helpers, config, you, send }) {
  const { juice, sfx, TAU, clamp } = helpers;
  let L = LAND;
  let view = null;
  let lastVp = null;
  const zones = [];

  let champVisible = false;     // le champ de saisie est-il affiche ?
  let sylChamp = '';            // syllabe pour laquelle il a ete ouvert
  let marque = 0;               // temps restant de coloration du champ
  let refus = null;             // dernier refus a afficher
  let refusT = 0;
  let boomT = 0;                // animation d explosion
  let boomPid = null;
  const pop = new Map();        // pid -> instant du dernier mot joue

  const ordre = Object.keys(config.players);
  const nomDe = (pid) => {
    const n = ((config.players[pid] || {}).name || '');
    return n.length > 14 ? `${n.slice(0, 13)}…` : n;
  };
  const couleurDe = (pid) => (config.players[pid] || {}).color || '#888';

  const MOTIFS = {
    court: 'trop court !',
    syllabe: 'il manque la syllabe !',
    dico: 'pas dans le dico du forain',
    deja: 'déjà servi !',
  };

  // ── Briques d interface ──
  function panel(x, y, w, h, opts = {}) {
    roundRectPath(ctx, x, y, w, h, opts.r || 14);
    ctx.fillStyle = opts.fill || 'rgba(12,6,26,.7)';
    ctx.fill();
    if (opts.stroke) {
      ctx.strokeStyle = opts.stroke;
      ctx.lineWidth = opts.lw || 1.5;
      ctx.stroke();
    }
  }

  function label(text, x, y, opts = {}) {
    ctx.font = `${opts.weight || 600} ${opts.size || 13}px ${opts.display ? 'Bungee, ' : ''}Rubik, system-ui, sans-serif`;
    ctx.textAlign = opts.align || 'center';
    if (opts.outline) {
      ctx.strokeStyle = 'rgba(16,8,32,.85)';
      ctx.lineWidth = opts.outline;
      ctx.strokeText(text, x, y);
    }
    ctx.fillStyle = opts.color || CREAM;
    ctx.fillText(text, x, y);
    ctx.textAlign = 'left';
  }

  // Un coeur, plein ou brise.
  function coeur(x, y, r, plein, casse) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, r * 0.95);
    ctx.bezierCurveTo(-r * 1.35, r * 0.1, -r * 0.95, -r * 0.95, 0, -r * 0.35);
    ctx.bezierCurveTo(r * 0.95, -r * 0.95, r * 1.35, r * 0.1, 0, r * 0.95);
    ctx.fillStyle = plein ? '#FF3D6E' : 'rgba(255,61,110,.18)';
    ctx.fill();
    if (!plein) {
      ctx.strokeStyle = 'rgba(255,61,110,.45)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    if (casse) {
      ctx.strokeStyle = '#140A26';
      ctx.lineWidth = Math.max(1.4, r * 0.22);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.5);
      ctx.lineTo(r * 0.22, 0);
      ctx.lineTo(-r * 0.2, r * 0.3);
      ctx.lineTo(0, r * 0.9);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Place les joueurs sur une ellipse autour de la bombe.
  function posDe(i, n) {
    const a = -Math.PI / 2 + (i / n) * TAU;
    return { x: L.cx + Math.cos(a) * L.rx, y: L.cy + Math.sin(a) * L.ry, a };
  }

  // ── La bombe ──
  function dessineBombe(v, now, dt) {
    const frac = v.fuseMax > 0 ? clamp(v.tl / v.fuseMax, 0, 1) : 1;
    const panique = 1 - frac;                       // 0 tranquille, 1 imminent
    const secousse = panique > 0.6 ? (panique - 0.6) * 10 : 0;
    const ox = Math.sin(now / 42) * secousse * 2.2;
    const oy = Math.cos(now / 37) * secousse * 1.8;
    const R = L.bombR;
    const x = L.cx + ox, y = L.cy + oy;

    // Halo de chaleur quand ca chauffe.
    if (panique > 0.45) {
      const halo = ctx.createRadialGradient(x, y, R * 0.6, x, y, R * 2.1);
      halo.addColorStop(0, `rgba(255,71,87,${(panique - 0.45) * 0.5})`);
      halo.addColorStop(1, 'rgba(255,71,87,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, R * 2.1, 0, TAU);
      ctx.fill();
    }
    // Ombre au sol.
    ctx.beginPath();
    ctx.ellipse(x, y + R * 1.02, R * 0.92, R * 0.24, 0, 0, TAU);
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.fill();
    // Sphere.
    const g = ctx.createRadialGradient(x - R * 0.35, y - R * 0.4, R * 0.1, x, y, R);
    g.addColorStop(0, panique > 0.7 ? '#5A2330' : '#4A4258');
    g.addColorStop(0.45, '#241B2F');
    g.addColorStop(1, '#0C0714');
    ctx.beginPath();
    ctx.arc(x, y, R, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = panique > 0.6 ? `rgba(255,71,87,${0.3 + panique * 0.6})` : 'rgba(185,168,208,.28)';
    ctx.lineWidth = panique > 0.6 ? 3 : 1.6;
    ctx.stroke();
    // Reflet.
    ctx.beginPath();
    ctx.ellipse(x - R * 0.36, y - R * 0.42, R * 0.2, R * 0.12, -0.6, 0, TAU);
    ctx.fillStyle = 'rgba(245,239,230,.22)';
    ctx.fill();

    // Col et meche : elle raccourcit avec le temps.
    const colX = x + R * 0.42, colY = y - R * 0.82;
    ctx.fillStyle = '#3A2358';
    roundRectPath(ctx, colX - R * 0.12, colY - R * 0.16, R * 0.24, R * 0.26, 3);
    ctx.fill();
    const lon = R * (0.3 + frac * 0.72);
    ctx.beginPath();
    ctx.moveTo(colX, colY - R * 0.1);
    ctx.quadraticCurveTo(colX + lon * 0.55, colY - lon * 0.5, colX + lon * 0.35, colY - lon);
    ctx.strokeStyle = '#C9B79A';
    ctx.lineWidth = Math.max(2, R * 0.055);
    ctx.stroke();
    // Etincelle au bout.
    const sx = colX + lon * 0.35, sy = colY - lon;
    const scint = 0.7 + Math.sin(now / 45) * 0.3;
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * 0.3 * scint);
    sg.addColorStop(0, '#FFF3C4');
    sg.addColorStop(0.4, GOLD);
    sg.addColorStop(1, 'rgba(255,122,61,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sx, sy, R * 0.3 * scint, 0, TAU);
    ctx.fill();

    // La syllabe, en enorme.
    const syl = (v.syl || '').toUpperCase();
    const taille = syl.length >= 3 ? R * 0.62 : R * 0.72;
    label(syl, x, y + taille * 0.34, {
      size: taille, weight: 800, display: true,
      color: panique > 0.7 ? '#FFD9DE' : CREAM, outline: Math.max(4, R * 0.09),
    });
    // Chrono sous la bombe.
    label(`${v.tl.toFixed(1)} s`, x, y + R + 26, {
      size: 15, weight: 800, display: true,
      color: panique > 0.75 ? RED : panique > 0.5 ? GOLD : MAUVE,
    });
    return { x, y, R };
  }

  // ── Les joueurs autour ──
  function dessinePods(v, now) {
    const n = ordre.length;
    ordre.forEach((pid, i) => {
      const p = v.players[pid];
      if (!p) return;
      const pos = posDe(i, n);
      const tient = v.turn === pid && v.phase === 'play';
      const mort = !p.alive;
      const w = L.podW, h = 54;
      const x = clamp(pos.x, w / 2 + 6, L.AW - w / 2 - 6);
      const y = pos.y;
      const battement = tient ? 1 + Math.sin(now / 180) * 0.04 : 1;

      ctx.save();
      if (mort) ctx.globalAlpha = 0.35;
      ctx.translate(x, y);
      ctx.scale(battement, battement);
      panel(-w / 2, -h / 2, w, h, {
        fill: tient ? 'rgba(255,122,61,.16)' : 'rgba(12,6,26,.7)',
        stroke: tient ? ORANGE : mort ? 'rgba(185,168,208,.15)' : 'rgba(185,168,208,.22)',
        lw: tient ? 2.6 : 1.2,
        r: 13,
      });
      label(nomDe(pid), 0, -h / 2 + 17, {
        size: 11, weight: 800, color: mort ? MAUVE : couleurDe(pid),
      });
      // Coeurs.
      const nc = Math.min(6, Math.max(p.vies, 1));
      const cr = 7;
      const total = nc * (cr * 2.4);
      for (let k = 0; k < nc; k++) {
        const cx = -total / 2 + cr * 1.2 + k * cr * 2.4;
        coeur(cx, 6, cr, k < p.vies, false);
      }
      if (p.vies > 6) label(`+${p.vies - 6}`, total / 2 + 12, 10, { size: 10, weight: 800, color: '#FF3D6E' });
      if (mort) label('ÉLIMINÉ', 0, h / 2 - 4, { size: 9, weight: 800, color: MAUVE });
      else if (p.mots) label(`${p.mots} mots`, 0, h / 2 - 4, { size: 9, weight: 600, color: 'rgba(185,168,208,.7)' });
      ctx.restore();

      // Etincelle du mot valide.
      const t = pop.get(pid);
      if (t && now - t < 600) {
        const k = 1 - (now - t) / 600;
        label('✔', x + w / 2 - 6, y - h / 2 + 4, { size: 14 + k * 8, weight: 800, color: GREEN });
      }
      if (tient) {
        // Fil qui relie la bombe au porteur : on voit qui l a.
        ctx.save();
        ctx.strokeStyle = 'rgba(255,122,61,.35)';
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(L.cx, L.cy);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.restore();
      }
    });
  }

  // ── Mon alphabet : les lettres deja placees dans mes mots ──
  function dessineAlphabet(v) {
    const moi = v.players[you];
    if (!moi) return;
    const lettres = v.alphabet || '';
    const eues = new Set(moi.alpha || '');
    const par = L.portrait ? 11 : 21;
    const rangs = Math.ceil(lettres.length / par);
    const pas = Math.min(30, (L.AW - 80) / par);
    const y0 = L.alphaY;
    label(`ALPHABET ${eues.size}/${lettres.length}`, L.AW / 2, y0 - 14, {
      size: 11, weight: 800, color: eues.size === lettres.length ? GREEN : MAUVE, display: true,
    });
    for (let r = 0; r < rangs; r++) {
      const dans = Math.min(par, lettres.length - r * par);
      const x0 = L.AW / 2 - (dans * pas) / 2 + pas / 2;
      for (let k = 0; k < dans; k++) {
        const l = lettres[r * par + k];
        const eu = eues.has(l);
        const x = x0 + k * pas;
        const y = y0 + r * 26;
        if (eu) {
          ctx.beginPath();
          ctx.arc(x, y - 4, pas * 0.42, 0, TAU);
          ctx.fillStyle = 'rgba(255,201,60,.18)';
          ctx.fill();
        }
        label(l.toUpperCase(), x, y, {
          size: 13, weight: 800, color: eu ? GOLD : 'rgba(185,168,208,.3)',
        });
      }
    }
  }

  // ── Le fil des mots joues ──
  function dessineHistorique(v) {
    const h = v.history || [];
    if (!h.length) return;
    const y0 = L.histY;
    label('DERNIERS MOTS', L.AW / 2, y0 - 12, { size: 10, weight: 800, color: 'rgba(185,168,208,.6)' });
    const dispo = h.slice(-(L.portrait ? 3 : 4));
    dispo.forEach((it, i) => {
      const x = L.AW / 2 - ((dispo.length - 1) * 190) / 2 + i * 190;
      const vieux = dispo.length - 1 - i;
      ctx.save();
      ctx.globalAlpha = 1 - vieux * 0.22;
      label(`${nomDe(it.pid)} : ${it.mot}`, x, y0 + 10, {
        size: 12, weight: 600, color: couleurDe(it.pid),
      });
      ctx.restore();
    });
  }

  // ── Bandeau du bas : consigne, refus, attente ──
  function dessineConsigne(v, now) {
    const moi = v.players[you];
    const spectateur = !moi;
    const monTour = v.turn === you && v.phase === 'play' && moi && moi.alive;
    const y = L.consigneY;

    if (v.phase === 'pre') {
      label('LA BOMBE ARRIVE…', L.AW / 2, y, { size: 20, weight: 800, color: ORANGE, display: true });
      return;
    }
    if (v.phase === 'end') {
      label('FIN DE PARTIE', L.AW / 2, y, { size: 20, weight: 800, color: GOLD, display: true });
      return;
    }
    if (v.phase === 'boom' && v.boom) {
      const nom = nomDe(v.boom.pid);
      label(v.boom.pid === you ? 'ÇA T\'A PÉTÉ DANS LES MAINS !' : `${nom} A EXPLOSÉ !`, L.AW / 2, y, {
        size: 20, weight: 800, color: RED, display: true, outline: 4,
      });
      return;
    }
    if (monTour) {
      if (refusT > 0 && refus) {
        label(MOTIFS[refus] || 'refusé', L.AW / 2, y, { size: 17, weight: 800, color: RED, display: true });
      } else {
        label(`UN MOT AVEC « ${(v.syl || '').toUpperCase()} »`, L.AW / 2, y, {
          size: 18, weight: 800, color: GOLD, display: true,
        });
      }
      return;
    }
    if (spectateur) {
      label('👻 Tu regardes la table brûler', L.AW / 2, y, { size: 14, weight: 600, color: MAUVE });
      return;
    }
    if (moi && !moi.alive) {
      label('Éliminé. Tu peux souffler.', L.AW / 2, y, { size: 14, weight: 600, color: MAUVE });
      return;
    }
    const nom = nomDe(v.turn);
    label(`${nom} cherche son mot…`, L.AW / 2, y, { size: 15, weight: 600, color: MAUVE });
  }

  // ── Champ de saisie : ouvert uniquement quand la bombe est chez moi ──
  function majChamp(v) {
    const moi = v.players[you];
    const monTour = v.turn === you && v.phase === 'play' && moi && moi.alive;
    if (monTour) {
      if (!champVisible || sylChamp !== v.syl) {
        champVisible = true;
        sylChamp = v.syl;
        helpers.text.show({
          placeholder: `mot avec ${(v.syl || '').toUpperCase()}`,
          maxLength: 24,
          focus: true,
          onSubmit: (val) => {
            const m = String(val || '').trim();
            if (!m) return;
            send.act('mot', { m });
            helpers.text.clear();
          },
        });
      }
    } else if (champVisible) {
      champVisible = false;
      sylChamp = '';
      helpers.text.hide();
    }
  }

  return {
    onTap(x, y, phase) {
      if (phase !== 'end' || !lastVp) return;
      const w = lastVp.toWorld(x, y);
      for (const z of zones) {
        if (w.x >= z.x && w.x <= z.x + z.w && w.y >= z.y && w.y <= z.y + z.h) { z.fn(); return; }
      }
      // Toucher la bombe redonne le focus au champ (pratique sur telephone).
      if (champVisible) helpers.text.focus();
    },

    onEvents(evs) {
      const now = performance.now();
      for (const ev of evs) {
        if (ev.e === 'tour') {
          if (ev.pid === you) sfx.play('whistle');
        } else if (ev.e === 'syl') {
          if (ev.pid === you) juice.floater(L.cx, L.cy - L.bombR - 30, ev.syl.toUpperCase(), { color: GOLD, size: 22 });
        } else if (ev.e === 'ok') {
          pop.set(ev.pid, now);
          if (ev.pid === you) {
            marque = 0.5;
            helpers.text.mark('good');
            juice.floater(L.cx, L.cy - L.bombR - 10, ev.mot.toUpperCase(), { color: GREEN, size: 20 });
            sfx.play('coin');
          } else {
            sfx.play('tickup');
          }
        } else if (ev.e === 'refus') {
          if (ev.pid === you) {
            refus = ev.r;
            refusT = 1.8;
            marque = 0.6;
            helpers.text.mark('bad');
            juice.shake(3);
            sfx.play('steal');
          }
        } else if (ev.e === 'coeur') {
          const pos = posDe(ordre.indexOf(ev.pid), ordre.length);
          juice.floater(pos.x, pos.y - 40, 'ALPHABET ! +1 ❤', { color: GREEN, size: 18 });
          juice.confetti(pos.x, pos.y, [GREEN, GOLD, CREAM], 40);
          sfx.play('win');
        } else if (ev.e === 'boom') {
          boomT = 1.1;
          boomPid = ev.pid;
          juice.flash('#FF7A3D', 0.4);
          juice.shake(ev.pid === you ? 12 : 8);
          juice.burst(L.cx, L.cy, { n: 46, color: ORANGE, speed: 340, life: 0.9, size: 5, grav: 240 });
          juice.burst(L.cx, L.cy, { n: 26, color: '#FFF3C4', speed: 210, life: 0.7, size: 4 });
          juice.floater(L.cx, L.cy - 20, 'BOUM !', { color: RED, size: 40 });
          sfx.play('death');
          if (ev.pid === you) { helpers.text.hide(); champVisible = false; }
        } else if (ev.e === 'out') {
          const pos = posDe(ordre.indexOf(ev.pid), ordre.length);
          juice.floater(pos.x, pos.y - 34, 'ÉLIMINÉ', { color: RED, size: 18 });
          sfx.play('fall');
        } else if (ev.e === 'win') {
          juice.confetti(L.cx, L.cy, [GOLD, GREEN, '#FF3D8A', CREAM], 90);
          sfx.play('win');
        } else if (ev.e === 'timecap') {
          sfx.play('klaxon');
        }
      }
    },

    render(v0, dt, now) {
      const v = v0.latest;
      view = v;
      const taille = helpers.size();
      L = taille.h / taille.w > 1.12 ? PORT : LAND;
      helpers.bg(ctx);
      const vp = helpers.viewport(L.AW, L.AH, 6);
      lastVp = vp;
      ctx.save();
      vp.apply(ctx);
      zones.length = 0;

      if (refusT > 0) refusT = Math.max(0, refusT - dt);
      if (boomT > 0) boomT = Math.max(0, boomT - dt);
      if (marque > 0) {
        marque = Math.max(0, marque - dt);
        if (marque === 0) helpers.text.mark(null);
      }

      dessinePods(v, now);
      if (v.phase !== 'boom' || boomT > 0.55) dessineBombe(v, now, dt);
      else {
        // Cratere fumant juste apres l explosion.
        ctx.beginPath();
        ctx.ellipse(L.cx, L.cy + L.bombR * 0.6, L.bombR * 0.9, L.bombR * 0.3, 0, 0, TAU);
        ctx.fillStyle = 'rgba(20,10,38,.75)';
        ctx.fill();
        label('💥', L.cx, L.cy + 16, { size: L.bombR * 1.1 });
      }
      dessineAlphabet(v);
      dessineHistorique(v);
      dessineConsigne(v, now);
      majChamp(v);

      juice.drawWorld(ctx);
      ctx.restore();

      // ── Bandeau du haut ──
      const hy = L.portrait ? 62 : 24;
      label(`TOUR ${v.tours} · ${v.booms} explosion${v.booms > 1 ? 's' : ''}`, taille.w / 2, hy, {
        size: 14, weight: 800, color: MAUVE, display: true,
      });
      if (v.phase === 'play') {
        const frac = v.fuseMax > 0 ? clamp(v.tl / v.fuseMax, 0, 1) : 1;
        const bw = Math.min(300, taille.w * 0.55);
        roundRectPath(ctx, taille.w / 2 - bw / 2, hy + 8, bw, 6, 3);
        ctx.fillStyle = 'rgba(185,168,208,.22)';
        ctx.fill();
        roundRectPath(ctx, taille.w / 2 - bw / 2, hy + 8, bw * frac, 6, 3);
        ctx.fillStyle = frac < 0.25 ? RED : frac < 0.5 ? GOLD : GREEN;
        ctx.fill();
      }
      label(`syllabes ${v.niveau} · ${v.sol} mots possibles`, taille.w / 2, taille.h - 6, {
        size: 10, weight: 600, color: 'rgba(185,168,208,.5)',
      });
    },

    destroy() {
      helpers.text.hide();
      champVisible = false;
      zones.length = 0;
      pop.clear();
    },
  };
}
