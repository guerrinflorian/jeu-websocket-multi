// TANKS : rendu client. Vue de dessus « un peu de trois quarts » : les murs
// sont des blocs en volume, les chars ont une caisse, des chenilles et une
// tourelle, les obus laissent une trainee. La ligne de visee montre le
// trajet de l'obus, rebonds compris : c'est elle qui rend le jeu jouable.

import meta from './meta.js';
import { CASE, COLS, LIGNES, MONDE_W, MONDE_H, estMur } from '/shared/tanks.js';

const CREAM = '#F5EFE6';
const MAUVE = '#B9A8D0';
const GOLD = '#FFC93C';
const RED = '#FF4757';
const H = 13;                 // hauteur apparente des murs

export function createClient({ ctx, helpers, config, you, send, controls, canvas }) {
  const { juice, sfx, TAU, clamp, lerp } = helpers;
  const teams = config.teams;
  const monCamp = teams.findIndex((t) => t.includes(you));
  const ffa = teams.every((t) => t.length === 1);
  const couleurCamp = (c) => helpers.colors[(c * 2) % helpers.colors.length];
  // En chacun pour soi chacun garde sa couleur du lobby ; en equipe, la
  // couleur du camp prime, c'est elle qui dit qui est un ami.
  const couleurDe = (c) => (ffa ? (config.players[c.id]?.color || couleurCamp(c.camp)) : couleurCamp(c.camp));

  let grille = null;
  let solCache = null;
  let toitCache = null;
  let vp = null;
  let v = null;
  let visee = null;           // angle vise a la souris (PC)
  let viseeT = 0;
  let dernierAim = 0;
  const trainees = new Map(); // id d'obus -> points recents

  // ── Souris : on vise ou l'on regarde, on tire au clic ────────────────
  function angleVersSouris(e) {
    if (!vp || !v) return null;
    const r = canvas.getBoundingClientRect();
    const m = vp.toWorld(e.clientX - r.left, e.clientY - r.top);
    const moi = v.chars.find((c) => c.id === you);
    if (!moi || !moi.alive) return null;
    return Math.atan2(m.y - moi.y, m.x - moi.x);
  }
  function onMove(e) {
    if (e.pointerType === 'touch') return;
    const a = angleVersSouris(e);
    if (a == null) return;
    visee = a;
    viseeT = performance.now();
    const now = performance.now();
    if (now - dernierAim > 90) {
      dernierAim = now;
      send.act('aim', { a: Math.round(a * 100) / 100 });
    }
  }
  function onDown(e) {
    if (e.pointerType === 'touch') return;
    if (e.target.closest('.ctl-btn, .hud, .emote-bar, .modal')) return;
    const a = angleVersSouris(e);
    if (a != null) { visee = a; viseeT = performance.now(); send.act('aim', { a: Math.round(a * 100) / 100 }); }
    send.act('fire');
    sfx.play('click');
  }
  addEventListener('pointermove', onMove);
  addEventListener('pointerdown', onDown);

  // ── Decor : deux couches mises en cache ──────────────────────────────
  // Le sol et la face avant des murs passent SOUS les chars, le dessus des
  // murs passe DESSUS : un char au nord d'un mur est bien masque par lui.
  function buildDecor() {
    const S = 2;
    const mk = () => {
      const c = document.createElement('canvas');
      c.width = MONDE_W * S;
      c.height = (MONDE_H + H) * S;
      const g = c.getContext('2d');
      g.scale(S, S);
      g.translate(0, H);
      return { c, g };
    };
    const sol = mk();
    const toit = mk();
    const g = sol.g;

    // Sol : dalles sombres et lignes de guidage.
    const fond = g.createLinearGradient(0, 0, 0, MONDE_H);
    fond.addColorStop(0, '#1C2B22');
    fond.addColorStop(1, '#121C16');
    g.fillStyle = fond;
    g.fillRect(0, 0, MONDE_W, MONDE_H);
    g.strokeStyle = 'rgba(245,239,230,.045)';
    g.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      g.beginPath();
      g.moveTo(x * CASE, 0);
      g.lineTo(x * CASE, MONDE_H);
      g.stroke();
    }
    for (let y = 0; y <= LIGNES; y++) {
      g.beginPath();
      g.moveTo(0, y * CASE);
      g.lineTo(MONDE_W, y * CASE);
      g.stroke();
    }
    // Traces de chenilles, pour l'ambiance.
    g.strokeStyle = 'rgba(245,239,230,.03)';
    g.lineWidth = 5;
    for (let i = 0; i < 14; i++) {
      const x0 = ((i * 137) % MONDE_W), y0 = ((i * 211) % MONDE_H);
      g.beginPath();
      g.moveTo(x0, y0);
      g.quadraticCurveTo(x0 + 90, y0 + 40, x0 + 170, y0 - 20);
      g.stroke();
    }

    const estM = (cx, cy) => estMur(grille, cx, cy);
    // Ombres portees des murs.
    for (let cy = 0; cy < LIGNES; cy++) {
      for (let cx = 0; cx < COLS; cx++) {
        if (!estM(cx, cy)) continue;
        g.fillStyle = 'rgba(0,0,0,.35)';
        g.fillRect(cx * CASE + 6, cy * CASE + 8, CASE, CASE);
      }
    }
    // Face avant (le cote sud, celui qu'on voit).
    for (let cy = 0; cy < LIGNES; cy++) {
      for (let cx = 0; cx < COLS; cx++) {
        if (!estM(cx, cy)) continue;
        const x = cx * CASE, y = cy * CASE;
        const face = g.createLinearGradient(0, y + CASE - H, 0, y + CASE);
        face.addColorStop(0, '#4A3A63');
        face.addColorStop(1, '#241A38');
        g.fillStyle = face;
        g.fillRect(x, y + CASE - H, CASE, H);
      }
    }
    // Dessus des murs.
    const t = toit.g;
    for (let cy = 0; cy < LIGNES; cy++) {
      for (let cx = 0; cx < COLS; cx++) {
        if (!estM(cx, cy)) continue;
        const x = cx * CASE, y = cy * CASE - H;
        const dessus = t.createLinearGradient(x, y, x, y + CASE);
        dessus.addColorStop(0, '#6B5590');
        dessus.addColorStop(1, '#4A3A63');
        t.fillStyle = dessus;
        t.fillRect(x, y, CASE, CASE);
        // Aretes : claires au nord et a l'ouest, sombres ailleurs.
        t.strokeStyle = 'rgba(255,255,255,.13)';
        t.lineWidth = 1.5;
        t.beginPath();
        t.moveTo(x + 0.5, y + CASE);
        t.lineTo(x + 0.5, y + 0.5);
        t.lineTo(x + CASE, y + 0.5);
        t.stroke();
        t.strokeStyle = 'rgba(0,0,0,.3)';
        t.beginPath();
        t.moveTo(x + CASE - 0.5, y);
        t.lineTo(x + CASE - 0.5, y + CASE - 0.5);
        t.lineTo(x, y + CASE - 0.5);
        t.stroke();
        // Rivets.
        t.fillStyle = 'rgba(255,255,255,.08)';
        for (const [rx, ry] of [[8, 8], [CASE - 8, 8], [8, CASE - 8], [CASE - 8, CASE - 8]]) {
          t.beginPath();
          t.arc(x + rx, y + ry, 2, 0, TAU);
          t.fill();
        }
      }
    }
    solCache = sol.c;
    toitCache = toit.c;
  }

  // ── Chars ────────────────────────────────────────────────────────────
  function drawChar(c, now) {
    const col = couleurDe(c);
    const moi = c.id === you;
    const ami = c.camp === monCamp && !moi;
    const R = c.solo ? 21 : 17;

    ctx.save();
    if (c.inv > 0.5) ctx.globalAlpha = 0.45 + Math.sin(now / 70) * 0.3;

    // Ombre au sol.
    ctx.beginPath();
    ctx.ellipse(c.x + 3, c.y + 7, R * 1.05, R * 0.62, 0, 0, TAU);
    ctx.fillStyle = 'rgba(0,0,0,.42)';
    ctx.fill();

    ctx.translate(c.x, c.y - 3);

    // Caisse et chenilles.
    ctx.save();
    ctx.rotate(c.a);
    ctx.fillStyle = '#1A1424';
    roundRect(ctx, -R * 0.95, -R * 0.98, R * 1.9, R * 0.5, 3);
    ctx.fill();
    roundRect(ctx, -R * 0.95, R * 0.48, R * 1.9, R * 0.5, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245,239,230,.18)';
    ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * R * 0.28, -R * 0.98);
      ctx.lineTo(i * R * 0.28, -R * 0.48);
      ctx.moveTo(i * R * 0.28, R * 0.48);
      ctx.lineTo(i * R * 0.28, R * 0.98);
      ctx.stroke();
    }
    const corps = ctx.createLinearGradient(0, -R * 0.6, 0, R * 0.6);
    corps.addColorStop(0, eclaircir(col, 0.25));
    corps.addColorStop(1, assombrir(col, 0.3));
    ctx.fillStyle = corps;
    roundRect(ctx, -R * 0.8, -R * 0.58, R * 1.6, R * 1.16, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Tourelle et canon.
    ctx.save();
    ctx.rotate(c.ta);
    ctx.fillStyle = assombrir(col, 0.45);
    ctx.fillRect(R * 0.2, -R * 0.17, R * (c.solo ? 1.25 : 1.05), R * 0.34);
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(R * 0.2, -R * 0.17, R * (c.solo ? 1.25 : 1.05), R * 0.34);
    ctx.restore();
    const tour = ctx.createRadialGradient(-R * 0.16, -R * 0.2, R * 0.06, 0, 0, R * 0.62);
    tour.addColorStop(0, eclaircir(col, 0.45));
    tour.addColorStop(1, assombrir(col, 0.18));
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.6, 0, TAU);
    ctx.fillStyle = tour;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Reperes : moi, mes coequipiers.
    if (moi) {
      ctx.save();
      ctx.globalAlpha = 0.55 + Math.sin(now / 260) * 0.25;
      ctx.beginPath();
      ctx.arc(c.x, c.y - 3, R + 8, 0, TAU);
      ctx.strokeStyle = CREAM;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    } else if (ami) {
      ctx.beginPath();
      ctx.moveTo(c.x, c.y - R - 16);
      ctx.lineTo(c.x - 6, c.y - R - 7);
      ctx.lineTo(c.x + 6, c.y - R - 7);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
    }

    // Nom + vies.
    const nom = config.players[c.id]?.name || '?';
    helpers.nameTag(ctx, c.x, c.y + R + 17, moi ? 'TOI' : nom, moi ? CREAM : col, 11);
    for (let i = 0; i < c.vies; i++) {
      const w = c.vies * 9;
      ctx.beginPath();
      ctx.arc(c.x - w / 2 + i * 9 + 4, c.y - R - 12, 3, 0, TAU);
      ctx.fillStyle = RED;
      ctx.fill();
    }
  }

  function drawFantome(c, now) {
    const col = couleurDe(c);
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 20, 0, TAU);
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.restore();
    if (c.resp > 0) {
      helpers.nameTag(ctx, c.x, c.y + 5, c.resp.toFixed(1), col, 14);
    }
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function eclaircir(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${Math.min(255, ((n >> 16) & 255) + 255 * k) | 0},${Math.min(255, ((n >> 8) & 255) + 255 * k) | 0},${Math.min(255, (n & 255) + 255 * k) | 0})`;
  }
  function assombrir(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${(((n >> 16) & 255) * (1 - k)) | 0},${(((n >> 8) & 255) * (1 - k)) | 0},${((n & 255) * (1 - k)) | 0})`;
  }

  // ── Obus et ligne de visee ───────────────────────────────────────────
  function drawObus(o, now) {
    const col = couleurCamp(o.camp);
    let tr = trainees.get(o.id);
    if (!tr) { tr = []; trainees.set(o.id, tr); }
    tr.push({ x: o.x, y: o.y });
    if (tr.length > 9) tr.shift();
    for (let i = 0; i < tr.length - 1; i++) {
      const p = tr[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, (o.gros ? 5 : 3.5) * (i / tr.length), 0, TAU);
      ctx.fillStyle = `rgba(255,201,60,${0.06 + (i / tr.length) * 0.3})`;
      ctx.fill();
    }
    const r = o.gros ? 8 : 5.5;
    ctx.beginPath();
    ctx.ellipse(o.x + 2, o.y + 6, r, r * 0.5, 0, 0, TAU);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fill();
    const g = ctx.createRadialGradient(o.x - r * 0.3, o.y - r * 0.4 - 3, 1, o.x, o.y - 3, r * 1.4);
    g.addColorStop(0, '#FFF6D8');
    g.addColorStop(0.5, GOLD);
    g.addColorStop(1, col);
    ctx.beginPath();
    ctx.arc(o.x, o.y - 3, r, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
  }

  // Trajet exact de l'obus, rebonds compris : c'est ce qui rend le tir
  // au mur jouable au lieu d'etre de la devinette.
  function drawVisee(moi) {
    if (!grille || !moi || moi.alive < 0.5) return;
    const pas = 7;
    let x = moi.x + Math.cos(moi.ta) * 26;
    let y = moi.y + Math.sin(moi.ta) * 26;
    let vx = Math.cos(moi.ta), vy = Math.sin(moi.ta);
    let reb = 0;
    const pts = [{ x, y }];
    const chocs = [];
    for (let i = 0; i < 150 && reb <= v.rebonds; i++) {
      const nx = x + vx * pas, ny = y + vy * pas;
      let tape = false;
      if (estMur(grille, Math.floor(nx / CASE), Math.floor(y / CASE))) { vx = -vx; tape = true; }
      if (estMur(grille, Math.floor(x / CASE), Math.floor(ny / CASE))) { vy = -vy; tape = true; }
      if (tape) { reb++; chocs.push({ x, y }); pts.push({ x, y }); continue; }
      x = nx; y = ny;
      pts.push({ x, y });
      // Le trait s'arrete sur le premier char touchable.
      let stop = false;
      for (const c of v.chars) {
        if (c.alive < 0.5 || c.out > 0.5) continue;
        if (c.id === moi.id && reb === 0) continue;
        if (c.camp === moi.camp && c.id !== moi.id) continue;
        if (Math.hypot(c.x - x, c.y - y) < 19) { stop = true; break; }
      }
      if (stop) break;
    }
    ctx.save();
    ctx.setLineDash([7, 7]);
    ctx.lineDashOffset = -(performance.now() / 26) % 14;
    ctx.strokeStyle = 'rgba(255,201,60,.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    ctx.setLineDash([]);
    for (const c of chocs) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 4, 0, TAU);
      ctx.fillStyle = 'rgba(255,201,60,.8)';
      ctx.fill();
    }
    const bout = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(bout.x, bout.y, 5, 0, TAU);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // ── Bandeau ──────────────────────────────────────────────────────────
  function drawHud(taille) {
    const w = taille.w, h = taille.h;
    ctx.save();
    const moi = v.chars.find((c) => c.id === you);

    // Chrono, au centre : le coin haut gauche est deja pris par le ping.
    const m = Math.floor(v.reste / 60), s = Math.floor(v.reste % 60);
    txt(`${m}:${String(s).padStart(2, '0')}`, w / 2, 34, {
      size: 24, weight: 800, color: v.reste < 20 ? RED : CREAM, display: true, outline: 4,
    });
    txt(v.nomCarte, w / 2, 50, { size: 10, weight: 700, color: MAUVE, outline: 3 });

    // Mes vies, en haut a droite, sous les boutons du bandeau.
    if (moi) {
      const n = Math.max(0, moi.vies);
      const total = Math.max(n, v.viesMax || 3);
      txt('VIES', w - 18, 78, { size: 10, weight: 800, color: MAUVE, align: 'right', outline: 3 });
      for (let i = 0; i < total; i++) {
        coeur(w - 24 - i * 22, 100, 9, i < n ? RED : 'rgba(255,71,87,.2)');
      }
    }

    // Tableau des camps.
    const camps = teams.map((t, i) => ({
      i,
      vies: t.reduce((a, pid) => a + Math.max(0, v.chars.find((c) => c.id === pid)?.vies || 0), 0),
      debout: t.filter((pid) => !(v.chars.find((c) => c.id === pid)?.out)).length,
    }));
    const y0 = 80;
    camps.forEach((c, i) => {
      const y = y0 + i * 20;
      ctx.fillStyle = 'rgba(10,6,20,.55)';
      ctx.fillRect(10, y - 12, 116, 17);
      ctx.fillStyle = couleurCamp(c.i);
      ctx.fillRect(10, y - 12, 4, 17);
      txt(teams.length === v.chars.length ? nomCourt(teams[c.i][0]) : `ÉQUIPE ${c.i + 1}`, 20, y, {
        size: 10, weight: 700, color: c.i === monCamp ? CREAM : MAUVE, align: 'left',
      });
      txt(`${c.debout} ⛊ ${c.vies} ❤`, 122, y, { size: 10, weight: 700, color: MAUVE, align: 'right' });
    });

    // Messages plein ecran.
    if (v.phase === 'pre') {
      bandeau(w, h, 'PRÊTS ?', `${v.nomCarte} · ${Math.ceil(v.pre)}`, GOLD);
    } else if (v.phase === 'fin') {
      const gagnant = v.camps.length === 1 ? v.camps[0] : null;
      const txtG = gagnant == null ? 'ÉGALITÉ'
        : gagnant === monCamp ? 'TERRAIN TENU !' : 'TERRAIN PERDU';
      bandeau(w, h, txtG, v.fin === 'temps' ? 'temps écoulé' : 'dernier debout', gagnant === monCamp ? '#3DFF8A' : RED);
    } else if (moi && moi.out > 0.5) {
      bandeau(w, h, 'HORS JEU', 'tu regardes la fin du match', MAUVE);
    } else if (moi && moi.alive < 0.5) {
      bandeau(w, h, 'TOUCHÉ', `retour dans ${moi.resp.toFixed(1)} s`, RED);
    }
    ctx.restore();
  }

  const nomCourt = (pid) => (config.players[pid]?.name || '?').slice(0, 11);

  function bandeau(w, h, titre, sous, col) {
    ctx.fillStyle = 'rgba(10,6,20,.55)';
    ctx.fillRect(0, h / 2 - 46, w, 84);
    txt(titre, w / 2, h / 2 + 4, { size: 34, weight: 800, color: col, display: true, outline: 5 });
    txt(sous, w / 2, h / 2 + 28, { size: 13, weight: 600, color: MAUVE });
  }

  function coeur(x, y, r, col) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, r * 0.75);
    ctx.bezierCurveTo(-r * 1.4, -r * 0.3, -r * 0.5, -r * 1.2, 0, -r * 0.4);
    ctx.bezierCurveTo(r * 0.5, -r * 1.2, r * 1.4, -r * 0.3, 0, r * 0.75);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.restore();
  }

  function txt(s, x, y, o = {}) {
    ctx.font = `${o.weight || 600} ${o.size || 13}px ${o.display ? 'Bungee, ' : ''}Rubik, system-ui, sans-serif`;
    ctx.textAlign = o.align || 'center';
    if (o.outline) {
      ctx.strokeStyle = 'rgba(10,5,20,.85)';
      ctx.lineWidth = o.outline;
      ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = o.color || CREAM;
    ctx.fillText(s, x, y);
    ctx.textAlign = 'left';
  }

  return {
    onFull(state) {
      if (state?.grille) grille = state.grille;
      solCache = null;
    },

    onEvents(evs) {
      for (const ev of evs) {
        if (ev.e === 'tir') {
          sfx.play('click');
          juice.burst(ev.x, ev.y, { n: 6, color: GOLD, speed: 90, life: 0.2 });
        } else if (ev.e === 'reb') {
          sfx.play('tickup');
          juice.burst(ev.x, ev.y, { n: 4, color: CREAM, speed: 70, life: 0.18 });
        } else if (ev.e === 'boum') {
          juice.burst(ev.x, ev.y, { n: 26, color: '#FF7A3D', speed: 210, life: 0.55 });
          juice.burst(ev.x, ev.y, { n: 14, color: GOLD, speed: 120, life: 0.4 });
          sfx.play('death');
          if (ev.pid === you) { juice.shake(9); juice.flash(RED, 0.22); }
          else juice.shake(3);
          if (ev.reb > 0) juice.floater(ev.x, ev.y - 26, 'PAR REBOND !', { color: GOLD, size: 14 });
        } else if (ev.e === 'out') {
          const nom = config.players[ev.pid]?.name || '?';
          juice.floater(MONDE_W / 2, 40, `${nom} est hors jeu`, { color: MAUVE, size: 15 });
        } else if (ev.e === 'pop') {
          const qui = v && v.chars.find((c) => c.id === ev.pid);
          juice.burst(ev.x, ev.y, { n: 12, color: qui ? couleurDe(qui) : GOLD, speed: 110, life: 0.4 });
          if (ev.pid === you) sfx.play('go');
        } else if (ev.e === 'go') {
          sfx.play('go');
        } else if (ev.e === 'fin') {
          sfx.play('win');
        }
      }
    },

    render(view, dt, now) {
      v = view.latest;
      if (v.grille) grille = v.grille;
      if (!grille) return;
      if (!solCache) buildDecor();

      const taille = helpers.size();
      helpers.bg(ctx);
      vp = helpers.viewport(MONDE_W, MONDE_H + H, 10);
      ctx.save();
      vp.apply(ctx);
      ctx.translate(0, H);

      // Sol + faces avant des murs.
      ctx.drawImage(solCache, 0, -H, MONDE_W, MONDE_H + H);

      // Chars et obus, interpoles entre deux instantanes.
      const chars = helpers.ix(view, 'chars', ['a', 'ta']);
      const obus = helpers.ix(view, 'obus', ['a']);
      const moi = chars.find((c) => c.id === you);
      if (moi && moi.alive > 0.5 && moi.out < 0.5 && v.phase === 'jeu') drawVisee(moi);

      for (const c of chars) {
        if (c.out > 0.5) continue;
        if (c.alive < 0.5) drawFantome(c, now);
      }
      for (const c of [...chars].sort((a, b) => a.y - b.y)) {
        if (c.alive < 0.5 || c.out > 0.5) continue;
        drawChar(c, now);
      }
      for (const o of obus) drawObus(o, now);
      // Trainees d'obus disparus : on fait le menage.
      if (trainees.size > 40) {
        const vivants = new Set(obus.map((o) => o.id));
        for (const id of trainees.keys()) if (!vivants.has(id)) trainees.delete(id);
      }

      // Dessus des murs : masque ce qui est derriere eux.
      ctx.drawImage(toitCache, 0, -H, MONDE_W, MONDE_H + H);

      juice.drawWorld(ctx);
      ctx.restore();

      // Jauge de recharge sur le bouton TIRER.
      if (moi) controls.setCooldown('fire', moi.alive > 0.5 ? moi.rc : 1);
      drawHud(taille);
    },

    destroy() {
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerdown', onDown);
      trainees.clear();
      solCache = null;
      toitCache = null;
    },
  };
}
