// PÉTANQUE : rendu client. Boulodrome nocturne sous les lampions, boules
// métalliques striées aux couleurs des joueurs, visée à la fronde (glisser,
// relâcher = lancer), cercle de mesure au décompte de la mène.

import meta from './meta.js';

const AW = meta.arena.w, AH = meta.arena.h;
const [FX0, FY0, FX1, FY1] = meta.geo.field;
const [CX, CY, CR] = meta.geo.circle;
const BALL_R = meta.geo.ballR;
const JACK_R = meta.geo.jackR;
const DRAG_MAX = 190;    // px de glisser = puissance 100 %
const FRICTION = 1.35;   // doit refléter le serveur (portée du ghost)
const MAX_V = 1150;
const TIREUR_POW = 1.25;
const TEAM_COLORS = ['#FF3D8A', '#29D9FF', '#FFC93C', '#3DFF8A'];

export function createClient({ ctx, helpers, config, you, send, controls }) {
  const { t, juice, sfx, lerp, TAU } = helpers;
  const isAsym = config.format.kind === 'asym';
  const soloPid = isAsym ? config.teams[0][0] : null;
  const manyCamps = config.format.kind === 'ffa' || config.teams.length > 4;
  let drag = null;       // glisser en cours {x0, y0, x, y}
  let myAim = null;      // dernière visée locale
  let lastView = null;
  let lastBtn = null;
  let lastCeil = -1;

  const campColor = (ti) => manyCamps
    ? (config.players[config.teams[ti]?.[0]]?.color || '#888')
    : TEAM_COLORS[ti % 4];

  // Mouchetis du gravier : déterministe, calculé une fois.
  const specks = [];
  let sseed = 987654321;
  const srand = () => {
    sseed = (Math.imul(sseed, 1103515245) + 12345) >>> 0;
    return sseed / 4294967296;
  };
  for (let i = 0; i < 260; i++) {
    specks.push([
      FX0 + srand() * (FX1 - FX0),
      FY0 + srand() * (FY1 - FY0),
      0.05 + srand() * 0.12,
      srand() < 0.25,
    ]);
  }

  function drawField(now) {
    // Bordures en bois du boulodrome.
    ctx.fillStyle = '#4E3722';
    ctx.fillRect(FX0 - 14, FY0 - 14, FX1 - FX0 + 28, FY1 - FY0 + 28);
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 2;
    for (let y = FY0 - 14; y < FY1 + 14; y += 46) {
      ctx.beginPath();
      ctx.moveTo(FX0 - 14, y);
      ctx.lineTo(FX0, y);
      ctx.moveTo(FX1, y);
      ctx.lineTo(FX1 + 14, y);
      ctx.stroke();
    }
    // Gravier.
    const g = ctx.createLinearGradient(0, FY0, 0, FY1);
    g.addColorStop(0, '#31234E');
    g.addColorStop(1, '#251740');
    ctx.fillStyle = g;
    ctx.fillRect(FX0, FY0, FX1 - FX0, FY1 - FY0);
    for (const [sx, sy, a, warm] of specks) {
      ctx.globalAlpha = a;
      ctx.fillStyle = warm ? '#FFC93C' : '#B9A8D0';
      ctx.fillRect(sx, sy, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;
    // Traces de râteau.
    ctx.strokeStyle = 'rgba(185,168,208,.05)';
    ctx.lineWidth = 1;
    for (let x = FX0 + 30; x < FX1; x += 55) {
      ctx.beginPath();
      ctx.moveTo(x, FY0 + 6);
      ctx.lineTo(x + 8, FY1 - 6);
      ctx.stroke();
    }
    // Guirlande de lampions au-dessus du fond de terrain.
    const nb = 9;
    ctx.strokeStyle = 'rgba(185,168,208,.18)';
    ctx.beginPath();
    for (let i = 0; i <= nb; i++) {
      const x = FX0 + (i / nb) * (FX1 - FX0);
      const y = 16 + Math.sin((i / nb) * Math.PI) * 12;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    const cols = ['#FF3D8A', '#29D9FF', '#FFC93C'];
    for (let i = 0; i <= nb; i++) {
      const x = FX0 + (i / nb) * (FX1 - FX0);
      const y = 16 + Math.sin((i / nb) * Math.PI) * 12;
      const on = (Math.floor(now / 500) + i) % 3 === 0;
      ctx.fillStyle = cols[i % 3];
      ctx.globalAlpha = on ? 0.95 : 0.35;
      ctx.beginPath();
      ctx.arc(x, y + 5, on ? 4 : 3, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Cercle de lancer.
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(245,239,230,.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CX, CY, CR, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawBoule(b, color, opts = {}) {
    helpers.shadow(ctx, b.x, b.y, BALL_R * 0.9);
    const g = ctx.createRadialGradient(b.x - BALL_R * 0.4, b.y - BALL_R * 0.45, BALL_R * 0.15, b.x, b.y, BALL_R * 1.15);
    g.addColorStop(0, '#F2F2F6');
    g.addColorStop(0.45, '#AEB2C2');
    g.addColorStop(1, '#565A6E');
    ctx.beginPath();
    ctx.arc(b.x, b.y, BALL_R, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
    // Stries du propriétaire.
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(b.x, b.y, BALL_R * 0.6, -0.6, 1.0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(b.x, b.y, BALL_R * 0.6, Math.PI - 0.6, Math.PI + 1.0);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(20,10,38,.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, BALL_R, 0, TAU);
    ctx.stroke();
    if (opts.pulse) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_R + 5 + Math.sin(performance.now() / 180) * 2, 0, TAU);
      ctx.strokeStyle = 'rgba(245,239,230,.55)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
  }

  function drawJack(jx, jy) {
    const glow = ctx.createRadialGradient(jx, jy, 1, jx, jy, 20);
    glow.addColorStop(0, 'rgba(255,201,60,.4)');
    glow.addColorStop(1, 'rgba(255,201,60,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(jx, jy, 20, 0, TAU);
    ctx.fill();
    helpers.shadow(ctx, jx, jy, JACK_R);
    const g = ctx.createRadialGradient(jx - 2, jy - 2, 1, jx, jy, JACK_R + 1);
    g.addColorStop(0, '#FFE45E');
    g.addColorStop(1, '#C98A12');
    ctx.beginPath();
    ctx.arc(jx, jy, JACK_R, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
  }

  return {
    onTap(x, y, phase) {
      const v = lastView;
      if (!v || v.phase !== 'aim' || v.thrower !== you) { drag = null; return; }
      if (phase === 'start') {
        drag = { x0: x, y0: y, x, y };
      } else if (phase === 'move' && drag) {
        drag.x = x; drag.y = y;
      } else if (phase === 'end' && drag) {
        const dx = drag.x - drag.x0, dy = drag.y - drag.y0;
        const len = Math.hypot(dx, dy);
        drag = null;
        if (len < 16) return; // simple tap : on annule
        const pow = Math.min(1, len / DRAG_MAX);
        myAim = { ax: dx / len, ay: dy / len, pow };
        send.act('aim', myAim);
        send.act('throw');
        sfx.play('click');
      }
    },

    onButton(id) {
      if (id !== 'throw') return false;
      const v = lastView;
      if (!v || v.phase !== 'aim' || v.thrower !== you) return false;
      if (myAim) send.act('aim', myAim);
      return true; // l'hôte envoie act('throw')
    },

    onEvents(evs) {
      for (const ev of evs) {
        if (ev.e === 'jack') {
          sfx.play('whistle');
          juice.floater(ev.x, ev.y, `MÈNE ${ev.n}`, { color: '#FFC93C', size: 24 });
          juice.ring(ev.x, ev.y, { color: '#FFC93C', maxR: 44, life: 0.6 });
          myAim = null;
        } else if (ev.e === 'turn') {
          if (ev.pid === you) {
            sfx.play('ready');
            juice.floater(CX, CY - 50, 'À TOI DE JOUER !', { color: '#3DFF8A', size: 20 });
          }
          myAim = null;
          drag = null;
        } else if (ev.e === 'throw') {
          sfx.play('dash');
        } else if (ev.e === 'hit') {
          juice.burst(ev.x, ev.y, { n: Math.round(5 + ev.s * 14), color: ev.j ? '#FFC93C' : '#F5EFE6', speed: 90 + ev.s * 200, life: 0.4, size: 2.6 });
          juice.shake(1 + ev.s * 6);
          sfx.play('hit');
        } else if (ev.e === 'out') {
          juice.floater(ev.x, ev.y, 'DEHORS !', { color: '#FF4757', size: 15 });
          sfx.play('fall');
        } else if (ev.e === 'carreau') {
          juice.floater(ev.x, ev.y, 'CARREAU !!!', { color: '#FFC93C', size: 28 });
          juice.confetti(ev.x, ev.y, ['#FFC93C', '#63D6C4', '#F5EFE6'], 40);
          juice.shake(7);
          sfx.play('mission');
        } else if (ev.e === 'biberon') {
          juice.floater(ev.x, ev.y, 'BIBERON !', { color: '#63D6C4', size: 20 });
          sfx.play('coin');
        } else if (ev.e === 'mene') {
          if (ev.team >= 0) {
            const mine = (config.teams[ev.team] || []).includes(you);
            sfx.play(mine ? 'bank' : 'whistle');
            const jx = lastView?.jack?.x ?? AW / 2, jy = lastView?.jack?.y ?? 200;
            juice.confetti(jx, jy, [campColor(ev.team), '#F5EFE6'], 36);
          } else {
            sfx.play('klaxon');
            juice.floater(AW / 2, AH / 2, 'MÈNE BLANCHE', { color: '#B9A8D0', size: 22 });
          }
        } else if (ev.e === 'lock' && ev.pid !== you) {
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
      const now = performance.now();
      ctx.save();
      vp.apply(ctx);

      drawField(now);

      // Cochonnet (interpolé).
      const jb = v.jack;
      const ja = view.a?.jack || jb;
      let jx = AW / 2, jy = 200;
      if (jb) {
        jx = lerp(ja.x, jb.x, view.alpha);
        jy = lerp(ja.y, jb.y, view.alpha);
        drawJack(jx, jy);
      }

      // Décompte : cercle de mesure autour du cochonnet.
      if (v.phase === 'count' && v.last && jb) {
        const winT = v.last.team;
        const dists = config.teams.map((_, ti) => v.boules
          .filter((b) => b.tm === ti)
          .map((b) => Math.hypot(b.x - jb.x, b.y - jb.y))
          .sort((a, b) => a - b));
        let enemyBest = Infinity;
        dists.forEach((ds, ti) => { if (ti !== winT && ds.length) enemyBest = Math.min(enemyBest, ds[0]); });
        const radius = Number.isFinite(enemyBest) ? enemyBest : (dists[winT]?.[dists[winT].length - 1] ?? 60) + 24;
        if (winT >= 0) {
          const col = campColor(winT);
          ctx.setLineDash([10, 7]);
          ctx.lineDashOffset = -(now / 30) % 17;
          ctx.strokeStyle = col;
          ctx.globalAlpha = 0.8;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(jx, jy, radius, 0, TAU);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.lineDashOffset = 0;
          ctx.globalAlpha = 1;
        }
      }

      // Boules (interpolées par id).
      const boules = helpers.ix(view, 'boules') || [];
      for (const b of boules) {
        const color = config.players[b.pid]?.color || '#888';
        const isLast = v.phase === 'roll' && b.id === Math.max(...v.boules.map((x) => x.id));
        drawBoule(b, color, { pulse: isLast });
        // Poussière de roulement.
        if (v.phase === 'roll') {
          const prev = view.a?.boules?.find?.((x) => x.id === b.id);
          if (prev && Math.hypot(b.x - prev.x, b.y - prev.y) > 1.5) {
            juice.burst(b.x, b.y + BALL_R * 0.5, { n: 1, color: 'rgba(185,168,208,.5)', speed: 16, life: 0.3, size: 2 });
          }
        }
        // Marque « +1 » sur les boules qui comptent, pendant le décompte.
        if (v.phase === 'count' && v.last && v.last.team === b.tm && jb) {
          const dists = v.boules.filter((x) => x.tm !== b.tm).map((x) => Math.hypot(x.x - jb.x, x.y - jb.y));
          const enemyBest = dists.length ? Math.min(...dists) : Infinity;
          if (Math.hypot(b.x - jb.x, b.y - jb.y) < enemyBest) {
            ctx.font = '800 14px Rubik, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#3DFF8A';
            ctx.fillText('+1', b.x, b.y - BALL_R - 5);
          }
        }
      }

      // Le lanceur en piste : nom + boules restantes près du cercle.
      if (v.thrower && v.phase === 'aim') {
        const color = config.players[v.thrower]?.color || '#F5EFE6';
        helpers.nameTag(ctx, CX, CY + CR + 20, config.players[v.thrower]?.name || '', color, 13);
        const left = v.stock[v.thrower] || 0;
        for (let i = 0; i < left; i++) {
          ctx.beginPath();
          ctx.arc(CX - 40 + i * 14, CY + CR + 34, 4.5, 0, TAU);
          ctx.fillStyle = color;
          ctx.fill();
        }
        // Pastille pulsante dans le cercle.
        ctx.beginPath();
        ctx.arc(CX, CY, 7 + Math.sin(now / 220) * 2, 0, TAU);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.8;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Ghost de visée (mon tour uniquement).
      if (v.phase === 'aim' && v.thrower === you) {
        let ax = 0, ay = 0, pow = 0, live = false;
        if (drag) {
          const dx = drag.x - drag.x0, dy = drag.y - drag.y0;
          const len = Math.hypot(dx, dy);
          if (len > 8) { ax = dx / len; ay = dy / len; pow = Math.min(1, len / DRAG_MAX); live = true; }
        } else if (myAim) {
          ({ ax, ay, pow } = myAim);
        }
        if (pow > 0) {
          const mult = you === soloPid ? TIREUR_POW : 1;
          const range = (pow * MAX_V * mult) / FRICTION;
          const ex = CX + ax * range, ey = CY + ay * range;
          const col = pow > 0.75 ? '#FF4757' : pow > 0.4 ? '#FFC93C' : '#3DFF8A';
          ctx.globalAlpha = live ? 0.95 : 0.55;
          ctx.setLineDash([9, 7]);
          ctx.lineDashOffset = -(now / 22) % 16;
          ctx.beginPath();
          ctx.moveTo(CX, CY);
          ctx.lineTo(ex, ey);
          ctx.strokeStyle = col;
          ctx.lineWidth = 3.5;
          ctx.lineCap = 'round';
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.lineDashOffset = 0;
          // Point de chute estimé.
          ctx.beginPath();
          ctx.arc(ex, ey, BALL_R * 0.85, 0, TAU);
          ctx.strokeStyle = col;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(ex - 6, ey);
          ctx.lineTo(ex + 6, ey);
          ctx.moveTo(ex, ey - 6);
          ctx.lineTo(ex, ey + 6);
          ctx.stroke();
          ctx.font = '800 15px Rubik, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = col;
          ctx.fillText(`${Math.round(pow * 100)} %`, ex, ey - BALL_R - 8);
          ctx.globalAlpha = 1;
        }
      }

      if (v.phase === 'pre') {
        ctx.font = 'bold 40px Bungee, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = meta.color;
        ctx.fillText(`MÈNE ${v.mene}`, AW / 2, AH / 2 - 20);
      }

      juice.drawWorld(ctx);
      ctx.restore();

      // ── HUD écran ──
      ctx.textAlign = 'center';
      ctx.font = '16px Bungee, sans-serif';
      ctx.fillStyle = '#B9A8D0';
      ctx.fillText(`MÈNE ${v.mene}/${v.menes}`, w / 2, 24);

      // Scores + boules restantes par camp.
      const teams = config.teams;
      const chipW = Math.min(64, (w - 40) / Math.max(1, teams.length));
      const x0 = w / 2 - (teams.length * chipW) / 2 + chipW / 2;
      teams.forEach((tm, i) => {
        const cx = x0 + i * chipW;
        const col = campColor(i);
        ctx.beginPath();
        ctx.arc(cx - 14, 44, 6, 0, TAU);
        ctx.fillStyle = col;
        ctx.fill();
        ctx.font = '800 15px Rubik, sans-serif';
        ctx.fillStyle = '#F5EFE6';
        ctx.textAlign = 'left';
        ctx.fillText(String(v.scores[i]), cx - 4, 49);
        const left = tm.reduce((s, pid) => s + (v.stock[pid] || 0), 0);
        ctx.fillStyle = 'rgba(185,168,208,.8)';
        ctx.font = '600 10px Rubik, sans-serif';
        ctx.fillText('●'.repeat(Math.min(left, 8)), cx - 14, 60);
        ctx.textAlign = 'center';
      });

      if (v.phase === 'aim') {
        const ceil = Math.ceil(v.tl);
        if (ceil !== lastCeil) {
          lastCeil = ceil;
          if (v.thrower === you && ceil <= 3 && ceil > 0) sfx.play('count');
        }
        if (v.tl <= 5) {
          ctx.font = '30px Bungee, sans-serif';
          ctx.fillStyle = v.tl <= 3 ? '#FF4757' : '#3DFF8A';
          ctx.fillText(String(ceil), w / 2, 86);
        }
        ctx.font = '600 13px Rubik, sans-serif';
        ctx.fillStyle = '#B9A8D0';
        if (v.thrower === you) {
          ctx.fillStyle = '#3DFF8A';
          ctx.fillText('GLISSE pour viser : relâche pour lancer (ou bouton LANCER)', w / 2, h - 18);
        } else if (v.thrower) {
          ctx.fillText(`Au tour de ${config.players[v.thrower]?.name || '?'}…`, w / 2, h - 18);
        }
      } else if (v.phase === 'count' && v.last) {
        ctx.font = '600 15px Rubik, sans-serif';
        ctx.fillStyle = '#FFC93C';
        if (v.last.team >= 0) {
          const name = teams[v.last.team]?.length === 1
            ? (config.players[teams[v.last.team][0]]?.name || 'camp')
            : `l'équipe ${v.last.team + 1}`;
          ctx.fillText(`+${v.last.pts} point${v.last.pts > 1 ? 's' : ''} pour ${name}`, w / 2, h - 18);
        } else {
          ctx.fillText('Mène blanche : personne ne marque', w / 2, h - 18);
        }
      }

      // Bouton LANCER visible seulement à mon tour.
      const canThrow = v.phase === 'aim' && v.thrower === you;
      if (lastBtn !== canThrow) {
        lastBtn = canThrow;
        controls.showButton('throw', canThrow);
      }
    },

    destroy() {
      drag = null;
      controls.showButton('throw', true);
    },
  };
}
