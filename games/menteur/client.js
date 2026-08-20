// MENTEUR : rendu client. Tapis de bistrot, gobelets renverses, encheres
// criees en grand, et le grand deballage quand quelqu un crie MENTEUR.
// Deux mises en page : paysage et portrait.

import meta from './meta.js';
import { drawDie, roundRectPath } from '/cardkit.js';

const GOLD = '#FFC93C';
const CREAM = '#F5EFE6';
const MAUVE = '#B9A8D0';
const GREEN = '#3DFF8A';
const RED = '#FF4757';
const ROSE = '#FF6B9D';

const LAND = {
  AW: 1000, AH: 640, portrait: false,
  othersY: 132, bidY: 300, mineY: 420, barY: 486,
  cupR: 30, dieS: 52, otherDie: 22,
};
const PORT = {
  AW: 620, AH: 1030, portrait: true,
  othersY: 150, bidY: 392, mineY: 520, barY: 596,
  cupR: 28, dieS: 48, otherDie: 20,
};

const MOTS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit',
  'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
const mot = (n) => (n >= 0 && n < MOTS.length ? MOTS[n] : String(n));

export function createClient({ ctx, helpers, config, you, send }) {
  const { juice, sfx, TAU, clamp } = helpers;
  const zones = [];
  let lastVp = null;
  let L = LAND;
  let view = null;
  let selQty = 1;
  let selFace = 2;
  let syncKey = '';
  let shakeDice = 0;      // agitation des des au lancer
  let revealT = 0;

  const others = Object.keys(config.players).filter((pid) => pid !== you);
  const nameOf = (pid) => {
    const n = ((config.players[pid] || {}).name || '');
    return n.length > 15 ? `${n.slice(0, 14)}…` : n;
  };
  const colorOf = (pid) => (config.players[pid] || {}).color || '#888';

  function otherPos(i, n) {
    if (L.portrait) {
      const perRow = Math.min(4, n);
      const row = Math.floor(i / perRow);
      const rows = Math.ceil(n / perRow);
      const inRow = Math.min(perRow, n - row * perRow);
      const k = inRow === 1 ? 0.5 : (i % perRow) / (inRow - 1);
      return { x: 80 + k * (L.AW - 160), y: L.othersY + (row - (rows - 1) / 2) * 120 };
    }
    const k = n === 1 ? 0.5 : i / (n - 1);
    return { x: 90 + k * (L.AW - 180), y: L.othersY - Math.sin(k * Math.PI) * 18 };
  }

  // ── Briques d interface ──
  function panel(x, y, w, h, opts = {}) {
    roundRectPath(ctx, x, y, w, h, opts.r || 14);
    ctx.fillStyle = opts.fill || 'rgba(12,6,26,.72)';
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

  function lighten(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${Math.min(255, ((n >> 16) & 255) + 255 * k) | 0},${Math.min(255, ((n >> 8) & 255) + 255 * k) | 0},${Math.min(255, (n & 255) + 255 * k) | 0})`;
  }
  function darken(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${(((n >> 16) & 255) * (1 - k)) | 0},${(((n >> 8) & 255) * (1 - k)) | 0},${((n & 255) * (1 - k)) | 0})`;
  }

  function button(x, y, w, h, text, opts = {}) {
    const on = opts.enabled !== false;
    const col = opts.color || ROSE;
    ctx.save();
    if (!on) ctx.globalAlpha = 0.3;
    roundRectPath(ctx, x, y + 4, w, h, 12);
    ctx.fillStyle = 'rgba(8,4,18,.75)';
    ctx.fill();
    roundRectPath(ctx, x, y, w, h, 12);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, lighten(col, 0.22));
    g.addColorStop(1, darken(col, 0.18));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    label(text, x + w / 2, y + h / 2 + (opts.sub ? -2 : 5), {
      size: opts.size || 15, weight: 800, color: opts.ink || '#160B2B', display: true,
    });
    if (opts.sub) label(opts.sub, x + w / 2, y + h - 8, { size: 10, weight: 600, color: opts.ink && opts.ink !== '#160B2B' ? 'rgba(245,239,230,.78)' : 'rgba(22,11,43,.72)' });
    ctx.restore();
    if (on && opts.fn) zones.push({ x, y, w, h, fn: opts.fn });
  }

  // Gobelet renverse : le secret du jeu.
  function drawCup(x, y, r, color, n, opts = {}) {
    ctx.save();
    if (opts.dim) ctx.globalAlpha = 0.32;
    const h = r * 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y + h * 0.52, r * 1.05, r * 0.3, 0, 0, TAU);
    ctx.fillStyle = 'rgba(0,0,0,.32)';
    ctx.fill();
    // Corps du gobelet (plus large en bas car il est retourne).
    ctx.beginPath();
    ctx.moveTo(x - r * 0.72, y - h * 0.5);
    ctx.lineTo(x + r * 0.72, y - h * 0.5);
    ctx.lineTo(x + r, y + h * 0.5);
    ctx.lineTo(x - r, y + h * 0.5);
    ctx.closePath();
    const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
    g.addColorStop(0, darken(color, 0.45));
    g.addColorStop(0.45, color);
    g.addColorStop(1, darken(color, 0.3));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,10,38,.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Fond du gobelet (le dessus, puisqu il est renverse).
    ctx.beginPath();
    ctx.ellipse(x, y - h * 0.5, r * 0.72, r * 0.24, 0, 0, TAU);
    ctx.fillStyle = lighten(color, 0.2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,10,38,.5)';
    ctx.stroke();
    // Nombre de des caches dessous.
    label(String(n), x, y + h * 0.22, { size: r * 0.86, weight: 800, color: '#160B2B', display: true });
    ctx.restore();
  }

  // ── Les autres joueurs autour du tapis ──
  function drawOthers(v, now) {
    const list = others.filter((pid) => v.players[pid]);
    list.forEach((pid, i) => {
      const p = v.players[pid];
      const pos = otherPos(i, list.length);
      const col = colorOf(pid);
      const isTurn = v.turn === pid;
      const dead = !p.alive;

      if (isTurn) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, L.cupR * 1.9 + Math.sin(now / 200) * 3, 0, TAU);
        ctx.strokeStyle = 'rgba(61,255,138,.6)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      if (p.dice && p.dice.length) {
        // Gobelet leve : on voit les des.
        const s = L.otherDie;
        const span = (p.dice.length - 1) * s * 0.82;
        p.dice.forEach((d, k) => {
          const dx = pos.x - span / 2 + k * s * 0.82;
          const hl = v.reveal && (d === v.reveal.face || d === 1);
          drawDie(ctx, dx - s / 2, pos.y - s / 2, s, d, {
            locked: !!hl,
            lockColor: d === 1 ? GOLD : GREEN,
          });
        });
      } else {
        drawCup(pos.x, pos.y, L.cupR, col, p.n, { dim: dead });
      }

      label(dead ? `${nameOf(pid)} (dehors)` : nameOf(pid), pos.x, pos.y + L.cupR * 1.5 + 20, {
        size: 12, weight: 800, color: dead ? MAUVE : col, outline: 3,
      });
      if (!dead && !p.dice) {
        label(`${p.n} dé${p.n > 1 ? 's' : ''}`, pos.x, pos.y + L.cupR * 1.5 + 36, {
          size: 10, weight: 600, color: MAUVE,
        });
      }
      if (p.cheated && pid === v.tricheur) {
        label('a retouché un dé…', pos.x, pos.y - L.cupR * 1.5 - 8, { size: 10, weight: 700, color: GOLD, outline: 3 });
      }
    });
  }

  // ── L enchere en cours, criee au milieu du tapis ──
  function drawBid(v, now) {
    const cx = L.AW / 2, cy = L.bidY;
    const w = L.portrait ? L.AW - 60 : 520;
    panel(cx - w / 2, cy - 52, w, 104, {
      fill: 'rgba(10,5,22,.7)',
      stroke: v.bid ? 'rgba(255,107,157,.5)' : 'rgba(185,168,208,.2)',
      r: 18,
    });
    if (!v.bid) {
      label('PERSONNE N\'A ENCORE PARLÉ', cx, cy + 2, { size: 17, weight: 800, color: MAUVE, display: true });
      label('Ouvre les enchères : annonce ce que cache la table.', cx, cy + 26, { size: 12, weight: 600, color: MAUVE });
      return;
    }
    const s = L.portrait ? 34 : 40;
    label(mot(v.bid.qty).toUpperCase(), cx - s * 0.9, cy + 8, {
      size: L.portrait ? 30 : 36, weight: 800, color: CREAM, display: true, align: 'right',
    });
    drawDie(ctx, cx - s / 2 + s * 0.5, cy - s / 2 - 4, s, v.bid.face, {
      locked: true, lockColor: ROSE,
      angle: Math.sin(now / 600) * 0.05,
    });
    label(`annoncé par ${nameOf(v.bid.pid)}`, cx, cy + 38, {
      size: 12, weight: 700, color: colorOf(v.bid.pid),
    });
  }

  // ── Mes des, en grand ──
  function drawMyDice(v, now) {
    const me = v.players[you];
    if (!me) return;
    const dice = me.dice || [];
    if (!dice.length) {
      label(me.alive ? 'Tes dés arrivent…' : 'Tu es éliminé : tu vois désormais TOUS les gobelets.',
        L.AW / 2, L.mineY, { size: 14, weight: 700, color: MAUVE });
      return;
    }
    const s = L.dieS;
    const gap = s * 1.24;
    const x0 = L.AW / 2 - ((dice.length - 1) * gap) / 2;
    const canCheat = you === v.tricheur && !me.cheated && v.phase === 'bid' && me.alive;
    dice.forEach((d, i) => {
      const x = x0 + i * gap;
      const wob = shakeDice > 0 ? Math.sin(now / 40 + i * 2) * 0.28 : 0;
      const hl = v.reveal && (d === v.reveal.face || d === 1);
      drawDie(ctx, x - s / 2, L.mineY - s / 2, s, d, {
        angle: wob,
        locked: !!hl || d === 1,
        lockColor: d === 1 ? GOLD : GREEN,
      });
      if (d === 1) {
        label('JOKER', x, L.mineY + s * 0.82, { size: 9, weight: 800, color: GOLD, outline: 3 });
      }
      if (canCheat) {
        const z = Math.max(s * 1.24, 76);
        zones.push({
          x: x - z / 2, y: L.mineY - z / 2, w: z, h: z,
          fn: () => { send.act('cheat', { i }); sfx.play('dash'); },
        });
      }
    });
    if (canCheat) {
      label('Privilège du Tricheur : touche un dé pour le relancer (une fois par manche).',
        L.AW / 2, L.mineY - s * 0.9, { size: 11, weight: 700, color: GOLD, outline: 3 });
    }
  }

  // ── Le grand deballage ──
  function drawReveal(v) {
    if (!v.reveal) return;
    const r = v.reveal;
    const cx = L.AW / 2, cy = L.bidY - (L.portrait ? 6 : 18);
    const w = L.portrait ? L.AW - 40 : 620;
    panel(cx - w / 2, cy - 92, w, 184, {
      fill: 'rgba(10,5,22,.94)', stroke: 'rgba(255,201,60,.55)', lw: 2.5, r: 18,
    });
    const verite = r.count >= r.qty;
    const titre = r.kind === 'pile'
      ? (r.winner ? 'PILE ! COMPTE EXACT !' : 'PILE RATÉ !')
      : (verite ? 'VÉRITÉ !' : 'MENSONGE !');
    label(titre, cx, cy - 56, {
      size: 26 + revealT * 20, weight: 800, display: true,
      color: r.kind === 'pile' ? (r.winner ? GOLD : RED) : (verite ? GREEN : RED),
    });
    const cri = r.kind === 'pile' ? 'PILE' : 'MENTEUR';
    const qui = r.caller === you ? `Tu as crié ${cri}` : `${nameOf(r.caller)} a crié ${cri}`;
    const sur = r.bidder === you
      ? `sur TON « ${mot(r.qty)} ${r.face} »`
      : `sur « ${mot(r.qty)} ${r.face} » de ${nameOf(r.bidder)}`;
    label(`${qui} ${sur}`, cx, cy - 30, { size: 12, weight: 600, color: MAUVE });
    // Le de annonce, pose juste a gauche du decompte (largeur mesuree).
    const ds = 34;
    const txt = `il y en avait ${r.count}`;
    ctx.font = '800 22px Bungee, Rubik, system-ui, sans-serif';
    const tw = ctx.measureText(txt).width;
    drawDie(ctx, cx - tw / 2 - ds - 14, cy - ds / 2 + 4, ds, r.face, { locked: true, lockColor: ROSE });
    label(txt, cx + ds * 0.5, cy + 12, { size: 22, weight: 800, color: CREAM, display: true });
    if (r.loser) {
      label(r.loser === you ? 'TU JETTES UN DÉ !' : `${nameOf(r.loser)} jette un dé !`,
        cx, cy + 50, { size: 17, weight: 800, color: RED, display: true });
    } else if (r.winner) {
      label(r.winner === you ? 'TU RÉCUPÈRES UN DÉ !' : `${nameOf(r.winner)} récupère un dé !`,
        cx, cy + 50, { size: 17, weight: 800, color: GOLD, display: true });
    }
    label('Nouvelle manche dans un instant…', cx, cy + 74, { size: 11, weight: 600, color: MAUVE });
  }

  // ── Selecteur d enchere ──
  const legal = (v, qty, face) => {
    if (face < 2 || face > 6) return false;
    if (qty < 1 || qty > v.total) return false;
    if (!v.bid) return true;
    return qty > v.bid.qty || (qty === v.bid.qty && face > v.bid.face);
  };

  function syncSel(v) {
    const key = `${v.round}-${v.bidCount}`;
    if (syncKey === key) return;
    syncKey = key;
    if (v.raise) { selQty = v.raise.qty; selFace = v.raise.face; }
    else { selQty = Math.max(1, Math.ceil(v.total / 4)); selFace = 2; }
  }

  function bump(v, dq, df) {
    let q = selQty + dq;
    let f = selFace + df;
    if (f > 6) f = 2;
    if (f < 2) f = 6;
    q = clamp(q, 1, v.total);
    selQty = q;
    selFace = f;
    sfx.play('tickup');
  }

  function drawSelector(v, me) {
    const top = L.barY;
    const H = L.AH - top - 10;
    panel(20, top, L.AW - 40, H, { fill: 'rgba(10,5,22,.85)', stroke: 'rgba(255,107,157,.35)', r: 16 });
    syncSel(v);
    const canBid = legal(v, selQty, selFace);
    const P = L.portrait;

    // Quantite.
    const qy = top + (P ? 14 : 8);
    const qh = P ? 68 : 52;
    const qw = P ? 76 : 52;
    const qx = P ? L.AW / 2 - 152 : 30;
    const midX = qx + (P ? 152 : 108);
    button(qx, qy, qw, qh, '−', {
      color: '#4B2E70', ink: CREAM, size: 24, enabled: selQty > 1,
      fn: () => bump(v, -1, 0),
    });
    panel(qx + (P ? 82 : 58), qy, P ? 140 : 100, qh, { fill: 'rgba(255,255,255,.06)', r: 12 });
    label(String(selQty), midX, qy + qh * 0.52, {
      size: P ? 32 : 26, weight: 800, color: CREAM, display: true,
    });
    label('dés', midX, qy + qh - 9, { size: 10, weight: 600, color: MAUVE });
    button(qx + (P ? 228 : 164), qy, qw, qh, '+', {
      color: '#4B2E70', ink: CREAM, size: 24, enabled: selQty < v.total,
      fn: () => bump(v, 1, 0),
    });

    // Valeur : les cinq faces jouables (le 1 est joker, jamais annonce).
    const fs = P ? 46 : 40;
    const gap = fs * 1.28;
    const fy = top + (P ? 130 : 30);
    const fx0 = (P ? L.AW / 2 : 470) - (4 * gap) / 2;
    for (let f = 2; f <= 6; f++) {
      const x = fx0 + (f - 2) * gap;
      const okF = legal(v, selQty, f);
      const sel = selFace === f;
      ctx.save();
      if (!okF) ctx.globalAlpha = 0.28;
      drawDie(ctx, x - fs / 2, fy - fs / 2, fs, f, {
        locked: sel, lockColor: sel ? ROSE : undefined,
      });
      ctx.restore();
      if (okF) {
        const z = Math.max(fs * 1.24, P ? 76 : 56);
        zones.push({
          x: x - z / 2, y: fy - z / 2, w: z, h: z,
          fn: () => { selFace = f; sfx.play('click'); },
        });
      }
    }

    // Actions.
    if (P) {
      button(46, top + 182, L.AW - 92, 68, `ENCHÉRIR : ${mot(selQty)} ${selFace}`, {
        color: ROSE, size: 17, enabled: canBid,
        fn: () => { send.act('bid', { qty: selQty, face: selFace }); sfx.play('ready'); },
      });
      button(46, top + 260, L.AW - 92, 72, 'MENTEUR !', {
        color: '#E03A4E', size: 20, enabled: !!v.bid, sub: 'on lève les gobelets',
        fn: () => { send.act('menteur'); sfx.play('klaxon'); },
      });
      button(46, top + 342, L.AW - 92, 72, 'PILE !', {
        color: GOLD, size: 20, enabled: !!v.canPile, sub: 'le compte est exact ? tu récupères un dé',
        fn: () => { send.act('pile'); sfx.play('bank'); },
      });
    } else {
      button(700, top + 8, 270, 52, `ENCHÉRIR : ${mot(selQty)} ${selFace}`, {
        color: ROSE, size: 15, enabled: canBid,
        fn: () => { send.act('bid', { qty: selQty, face: selFace }); sfx.play('ready'); },
      });
      button(30, top + 72, 460, 58, 'MENTEUR !', {
        color: '#E03A4E', size: 20, enabled: !!v.bid, sub: 'on lève les gobelets et on compte',
        fn: () => { send.act('menteur'); sfx.play('klaxon'); },
      });
      button(510, top + 72, 460, 58, 'PILE !', {
        color: GOLD, size: 20, enabled: !!v.canPile, sub: 'compte exact : tu récupères un dé',
        fn: () => { send.act('pile'); sfx.play('bank'); },
      });
    }
  }

  // ── Barre d attente (ce n est pas mon tour) ──
  function drawStatus(v, me) {
    const top = L.barY;
    // Barre compacte : pas besoin de toute la place du selecteur d enchere.
    const H = Math.min(L.AH - top - 10, 150);
    panel(20, top, L.AW - 40, H, { fill: 'rgba(10,5,22,.72)', stroke: 'rgba(185,168,208,.18)', r: 16 });
    let titre = '', sub = '';
    if (v.phase === 'roll') { titre = 'ON SECOUE LES GOBELETS'; sub = 'Manche ' + v.round; }
    else if (v.phase === 'reveal') { titre = 'ON COMPTE'; sub = 'Regarde bien qui avait raison.'; }
    else if (v.phase === 'end') { titre = 'FIN DE PARTIE'; sub = 'Ramassez les dés.'; }
    else if (!me || !me.alive) { titre = 'SPECTATEUR'; sub = 'Tu vois tous les gobelets. Savoure.'; }
    else if (v.turn) { titre = `AU TOUR DE ${nameOf(v.turn).toUpperCase()}`; sub = 'Prépare ton mensonge…'; }
    label(titre, L.AW / 2, top + H / 2 - 4, { size: 17, weight: 800, color: GOLD, display: true });
    label(sub, L.AW / 2, top + H / 2 + 20, { size: 12, weight: 600, color: MAUVE });

    // Historique des dernieres encheres.
    if (v.history.length) {
      const hy = top + H - 16;
      const txt = v.history.slice(-3).map((h) => `${nameOf(h.pid)} : ${h.qty}×${h.face}`).join('   ·   ');
      label(txt, L.AW / 2, hy, { size: 11, weight: 600, color: 'rgba(185,168,208,.7)' });
    }
  }

  function drawHud(v) {
    const s = helpers.size();
    const hy = L.portrait ? 62 : 22;
    label(`MANCHE ${v.round} · ${v.total} DÉS SUR LA TABLE`, s.w / 2, hy, {
      size: 14, weight: 800, color: MAUVE, display: true,
    });
    if (v.phase === 'bid') {
      const frac = clamp(v.tl / Math.max(1, v.tlMax), 0, 1);
      const bw = Math.min(260, s.w * 0.5);
      roundRectPath(ctx, s.w / 2 - bw / 2, hy + 8, bw, 6, 3);
      ctx.fillStyle = 'rgba(185,168,208,.22)';
      ctx.fill();
      roundRectPath(ctx, s.w / 2 - bw / 2, hy + 8, bw * frac, 6, 3);
      ctx.fillStyle = v.tl < 4 ? RED : v.tl < 8 ? GOLD : GREEN;
      ctx.fill();
      if (v.turn === you && v.tl <= 6) {
        label(String(Math.ceil(v.tl)), s.w / 2, hy + 34, {
          size: 16, weight: 800, color: v.tl < 4 ? RED : GOLD, display: true,
        });
      }
    }
    label('Les 1 sont des jokers : ils comptent pour toutes les valeurs.', s.w / 2, s.h - 6, {
      size: 10, weight: 600, color: 'rgba(185,168,208,.5)',
    });
  }

  // ── Position d un joueur (pour les bulles de juice) ──
  function posOf(pid) {
    if (pid === you) return { x: L.AW / 2, y: L.mineY };
    const list = others.filter((p) => view && view.players[p]);
    const i = list.indexOf(pid);
    return i < 0 ? { x: L.AW / 2, y: L.bidY } : otherPos(i, list.length);
  }

  function onKey(e) {
    if (e.repeat || !view || view.phase !== 'bid' || view.turn !== you) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const v = view;
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (legal(v, selQty, selFace)) { send.act('bid', { qty: selQty, face: selFace }); sfx.play('ready'); }
    } else if (e.code === 'KeyM') { e.preventDefault(); send.act('menteur'); sfx.play('klaxon'); }
    else if (e.code === 'KeyP') { e.preventDefault(); send.act('pile'); sfx.play('bank'); }
    else if (e.code === 'ArrowUp') { e.preventDefault(); bump(v, 1, 0); }
    else if (e.code === 'ArrowDown') { e.preventDefault(); bump(v, -1, 0); }
    else if (e.code === 'ArrowRight') { e.preventDefault(); bump(v, 0, 1); }
    else if (e.code === 'ArrowLeft') { e.preventDefault(); bump(v, 0, -1); }
  }
  addEventListener('keydown', onKey);

  return {
    onTap(x, y, phase) {
      if (phase !== 'end' || !lastVp) return;
      const w = lastVp.toWorld(x, y);
      for (const z of zones) {
        if (w.x >= z.x && w.x <= z.x + z.w && w.y >= z.y && w.y <= z.y + z.h) { z.fn(); return; }
      }
    },

    onEvents(evs) {
      for (const ev of evs) {
        if (ev.e === 'round') {
          shakeDice = 0.7;
          syncKey = '';
          sfx.play('dash');
        } else if (ev.e === 'roll') {
          shakeDice = 0.7;
        } else if (ev.e === 'turn') {
          if (ev.pid === you) {
            juice.floater(L.AW / 2, L.bidY - 70, 'À TOI DE PARLER !', { color: GREEN, size: 22 });
            sfx.play('whistle');
          }
        } else if (ev.e === 'bid') {
          const p = posOf(ev.pid);
          juice.floater(p.x, p.y - 46, `${mot(ev.qty)} ${ev.face} !`, { color: colorOf(ev.pid), size: 16 });
          sfx.play('click');
        } else if (ev.e === 'menteur') {
          juice.floater(L.AW / 2, L.bidY - 74, 'MENTEUR !', { color: RED, size: 30 });
          juice.flash('#FF4757', 0.18);
          juice.shake(7);
          sfx.play('klaxon');
        } else if (ev.e === 'pile') {
          juice.floater(L.AW / 2, L.bidY - 74, 'PILE !', { color: GOLD, size: 28 });
          juice.shake(4);
          sfx.play('bank');
        } else if (ev.e === 'reveal') {
          revealT = 0.5;
        } else if (ev.e === 'lose') {
          const p = posOf(ev.pid);
          juice.floater(p.x, p.y - 30, 'un dé en moins', { color: RED, size: 15 });
          juice.burst(p.x, p.y, { n: 14, color: RED, speed: 130 });
          if (ev.pid === you) { juice.shake(6); sfx.play('death'); }
          else sfx.play('steal');
        } else if (ev.e === 'gain') {
          const p = posOf(ev.pid);
          juice.floater(p.x, p.y - 30, 'un dé en plus !', { color: GOLD, size: 16 });
          juice.confetti(p.x, p.y, [GOLD, CREAM, GREEN], 26);
          sfx.play('coin');
        } else if (ev.e === 'out') {
          const p = posOf(ev.pid);
          juice.floater(p.x, p.y - 50, 'ÉLIMINÉ !', { color: RED, size: 20 });
          juice.shake(5);
          sfx.play('fall');
        } else if (ev.e === 'cheat') {
          if (ev.pid === you) {
            juice.floater(L.AW / 2, L.mineY - 60, 'DÉ RELANCÉ EN DOUCE', { color: GOLD, size: 16 });
          }
          sfx.play('pickup');
        } else if (ev.e === 'win') {
          juice.confetti(L.AW / 2, L.bidY, [GOLD, ROSE, GREEN, CREAM], 90);
          juice.shake(6);
          sfx.play('win');
        } else if (ev.e === 'timecap') {
          sfx.play('klaxon');
        }
      }
    },

    render(v0, dt, now) {
      const v = v0.latest;
      view = v;
      const size = helpers.size();
      L = size.h / size.w > 1.12 ? PORT : LAND;
      helpers.bg(ctx);
      const vp = helpers.viewport(L.AW, L.AH, 6);
      lastVp = vp;
      ctx.save();
      vp.apply(ctx);
      zones.length = 0;
      shakeDice = Math.max(0, shakeDice - dt);
      revealT = Math.max(0, revealT - dt);

      // Tapis de bistrot.
      const top = 26, bot = L.barY - 12;
      roundRectPath(ctx, 24, top, L.AW - 48, bot - top, 24);
      const g = ctx.createRadialGradient(L.AW / 2, L.bidY, 20, L.AW / 2, L.bidY, L.AW * 0.7);
      g.addColorStop(0, '#3A2258');
      g.addColorStop(0.6, '#26153F');
      g.addColorStop(1, '#170C2B');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,107,157,.25)';
      ctx.lineWidth = 2;
      ctx.stroke();

      const me = v.players[you];
      drawOthers(v, now);
      if (v.phase === 'reveal') drawReveal(v);
      else drawBid(v, now);
      drawMyDice(v, now);

      if (v.phase === 'bid' && v.turn === you && me && me.alive) drawSelector(v, me);
      else drawStatus(v, me);

      juice.drawWorld(ctx);
      ctx.restore();
      drawHud(v);
    },

    destroy() {
      removeEventListener('keydown', onKey);
      zones.length = 0;
    },
  };
}
