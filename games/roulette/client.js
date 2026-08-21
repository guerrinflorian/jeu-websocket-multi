// ROULETTE : rendu client. Un vrai cylindre a 37 cases avec la bille qui
// tombe dans la bonne, et le vrai tapis francais : on pose ses jetons sur un
// numero, sur une ligne (cheval), sur un coin (carre), en bout de rangee
// (transversale, sixain), ou sur les chances exterieures.
// Deux mises en page : le tapis en long (paysage) ou en haut (portrait).

import meta from './meta.js';
import { drawChip3D, roundRectPath } from '/cardkit.js';
import {
  ORDRE, ROUGES, MISES, mise, maximum, rangee, colonne, JETONS, couleur,
} from '/shared/roulette.js';

const GOLD = '#FFC93C';
const CREAM = '#F5EFE6';
const MAUVE = '#B9A8D0';
const GREEN = '#3DFF8A';
const RED = '#FF4757';
const FELT = '#14512F';
const FELT2 = '#0D3520';
const BOIS = '#5A2E17';

// Le tapis vit dans une grille de 14 x 5 cases « canoniques » :
// x 0..1 le zero, 1..13 les douze rangees, 13..14 les colonnes ;
// y 0..3 les trois lignes de numeros, 3..4 les douzaines, 4..5 les chances.
const GW = 14, GH = 5;

const LAND = {
  AW: 1000, AH: 700, portrait: false,
  rx: 208, ry: 252, rr: 146,
  fx: 400, fy: 96, fw: 540, fh: 296,
  barY: 476, stripY: 424, histX: 976, histY: 96, histR: 14,
};
const PORT = {
  AW: 620, AH: 1240, portrait: true,
  rx: 310, ry: 208, rr: 126,
  fx: 52, fy: 402, fw: 480, fh: 560,
  barY: 980, stripY: 354, histX: 590, histY: 420, histR: 13,
};

const fmt = (n) => String(Math.round(n));

export function createClient({ ctx, helpers, config, you, send }) {
  const { juice, sfx, TAU, clamp } = helpers;
  const isAsym = config.format.kind === 'asym';
  const chefPid = isAsym ? config.teams[0][0] : null;
  const meChef = you === chefPid;
  const sieges = Object.keys(config.players).filter((pid) => pid !== chefPid);

  const zones = [];
  let L = LAND;
  let vp = null;
  let v = null;
  let jeton = JETONS[0];        // jeton actif
  let cible = null;             // mise visee sous le doigt
  let feutreCache = null;
  let roueCache = null;
  let roueA = 0;                // angle du cylindre
  let roueV = 0;                // vitesse du cylindre
  let billeA = 0;
  let billeR = 1;
  let lastRes = null;
  let flash = 0;

  // ── Grille du tapis ──────────────────────────────────────────────────
  const cw = () => (L.portrait ? L.fw / GH : L.fw / GW);
  const ch = () => (L.portrait ? L.fh / GW : L.fh / GH);

  // Grille canonique -> pixels du gabarit.
  function pix(gx, gy) {
    return L.portrait
      ? { x: L.fx + gy * cw(), y: L.fy + gx * ch() }
      : { x: L.fx + gx * cw(), y: L.fy + gy * ch() };
  }
  // Pixels -> grille canonique.
  function grille(px, py) {
    return L.portrait
      ? { gx: (py - L.fy) / ch(), gy: (px - L.fx) / cw() }
      : { gx: (px - L.fx) / cw(), gy: (py - L.fy) / ch() };
  }
  // Rectangle ecran d'une zone canonique.
  function rect(gx0, gy0, gx1, gy1) {
    const a = pix(gx0, gy0), b = pix(gx1, gy1);
    return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
  }
  // Case canonique d'un numero.
  const caseDe = (n) => (n === 0
    ? { gx: 0, gy: 0, gw: 1, gh: 3 }
    : { gx: rangee(n), gy: 3 - colonne(n), gw: 1, gh: 1 });

  // Point ou se pose le jeton d'une mise, en coordonnees canoniques.
  function ancre(cle) {
    const m = mise(cle);
    if (!m) return null;
    const [t, arg] = cle.split(':');
    if (t === 'p') {
      const c = caseDe(Number(arg));
      return { gx: c.gx + c.gw / 2, gy: c.gy + c.gh / 2 };
    }
    if (t === 'c') {
      const [a, b] = arg.split('-').map(Number);
      if (a === 0) return { gx: 1, gy: caseDe(b).gy + 0.5 };
      const ca = caseDe(a), cb = caseDe(b);
      return ca.gx === cb.gx
        ? { gx: ca.gx + 0.5, gy: Math.max(ca.gy, cb.gy) }
        : { gx: Math.max(ca.gx, cb.gx), gy: ca.gy + 0.5 };
    }
    if (t === 't') return { gx: rangee(Number(arg)) + 0.5, gy: 0 };
    if (t === 's') return { gx: rangee(Number(arg)) + 1, gy: 0 };
    if (t === 'q') {
      const c = caseDe(Number(arg));
      return { gx: c.gx + 1, gy: c.gy };
    }
    if (cle === 'pr') return { gx: 1, gy: 0 };
    if (t === 'col') return { gx: 13.5, gy: 3 - Number(arg) + 0.5 };
    if (t === 'dz') return { gx: 1 + (Number(arg) - 1) * 4 + 2, gy: 3.5 };
    const i = ['manque', 'pair', 'rouge', 'noir', 'impair', 'passe'].indexOf(cle);
    return i >= 0 ? { gx: 1 + i * 2 + 1, gy: 4.5 } : null;
  }

  // Quelle mise vise ce doigt ? On lit le tapis comme un croupier : au
  // milieu d'une case c'est un plein, sur une ligne un cheval, sur un coin
  // un carre, en bout de rangee une transversale ou un sixain.
  const T = 0.26;
  function cibleAt(px, py) {
    const { gx, gy } = grille(px, py);
    if (gx < -0.6 || gx > GW + 0.4 || gy < -0.7 || gy > GH + 0.4) return null;

    // Chances exterieures : de simples cases.
    if (gy >= 3 && gy <= GH && gx >= 1 && gx <= 13) {
      if (gy < 4) return `dz:${clamp(Math.floor((gx - 1) / 4) + 1, 1, 3)}`;
      const i = clamp(Math.floor((gx - 1) / 2), 0, 5);
      return ['manque', 'pair', 'rouge', 'noir', 'impair', 'passe'][i];
    }
    if (gx >= 13 && gx <= GW && gy >= 0 && gy <= 3) {
      return `col:${3 - clamp(Math.floor(gy), 0, 2)}`;
    }

    // Bout de rangee : transversales et sixains.
    if (gy < 0 && gx >= 1 && gx <= 13) {
      const bord = Math.round(gx);
      if (Math.abs(gx - bord) < 0.3 && bord >= 2 && bord <= 12) {
        const cle = `s:${(bord - 1) * 3 - 2}`;
        if (MISES.has(cle)) return cle;
      }
      if (gx < 1.35 && gy > -0.55) return 'pr';
      const r = clamp(Math.floor(gx), 1, 12);
      return `t:${r * 3 - 2}`;
    }
    if (gy < 0 && gx < 1) return 'pr';

    if (gy < 0 || gy > 3) return null;

    // Le zero, et ses chevaux le long de sa bordure droite.
    if (gx < 1) {
      if (gx > 1 - T) {
        if (gy < 0.34) return 'pr';
        const n = 3 - Math.min(2, Math.floor(gy));
        return `c:0-${n}`;
      }
      return 'p:0';
    }

    const cx = Math.floor(gx), cy = Math.min(2, Math.floor(gy));
    const u = gx - cx, w = gy - cy;
    const gauche = u < T, droite = u > 1 - T;
    const haut = w < T, bas = w > 1 - T;
    const bx = droite ? cx + 1 : cx;             // bordure verticale visee
    const by = bas ? cy + 1 : cy;                // bordure horizontale visee

    // Coin interieur : carre.
    if ((gauche || droite) && (haut || bas) && bx >= 2 && bx <= 12 && by >= 1 && by <= 2) {
      const cle = `q:${(bx - 2) * 3 + (3 - by)}`;
      if (MISES.has(cle)) return cle;
    }
    // Ligne verticale : cheval entre deux rangees voisines.
    if (gauche || droite) {
      if (bx === 1) {
        const n = 3 - cy;
        return `c:0-${n}`;
      }
      if (bx >= 2 && bx <= 12) {
        const a = (bx - 2) * 3 + (3 - cy);
        const cle = `c:${a}-${a + 3}`;
        if (MISES.has(cle)) return cle;
      }
    }
    // Ligne horizontale : cheval entre deux lignes voisines.
    if ((haut && by >= 1) || (bas && by <= 2)) {
      const hautN = (cx - 1) * 3 + (3 - (by - 1));
      const basN = (cx - 1) * 3 + (3 - by);
      const cle = `c:${Math.min(hautN, basN)}-${Math.max(hautN, basN)}`;
      if (MISES.has(cle)) return cle;
    }
    const n = (cx - 1) * 3 + (3 - cy);
    return n >= 1 && n <= 36 ? `p:${n}` : null;
  }

  // ── Petites briques ──────────────────────────────────────────────────
  function label(text, x, y, o = {}) {
    ctx.font = `${o.weight || 600} ${o.size || 13}px ${o.display ? 'Bungee, ' : ''}Rubik, system-ui, sans-serif`;
    ctx.textAlign = o.align || 'center';
    if (o.outline) {
      ctx.strokeStyle = 'rgba(10,5,20,.85)';
      ctx.lineWidth = o.outline;
      ctx.strokeText(text, x, y);
    }
    ctx.fillStyle = o.color || CREAM;
    ctx.fillText(text, x, y);
    ctx.textAlign = 'left';
  }

  function panel(x, y, w, h, o = {}) {
    roundRectPath(ctx, x, y, w, h, o.r || 12);
    ctx.fillStyle = o.fill || 'rgba(10,5,22,.82)';
    ctx.fill();
    if (o.stroke) {
      ctx.strokeStyle = o.stroke;
      ctx.lineWidth = o.lw || 1.5;
      ctx.stroke();
    }
  }

  function button(x, y, w, h, text, o = {}) {
    const on = o.enabled !== false;
    const col = o.color || meta.color;
    ctx.save();
    if (!on) ctx.globalAlpha = 0.3;
    roundRectPath(ctx, x, y + 3, w, h, 11);
    ctx.fillStyle = 'rgba(6,3,14,.8)';
    ctx.fill();
    roundRectPath(ctx, x, y, w, h, 11);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, lighten(col, 0.2));
    g.addColorStop(1, darken(col, 0.18));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.26)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    label(text, x + w / 2, y + h / 2 + (o.sub ? -2 : 5), {
      size: o.size || 13, weight: 800, color: o.ink || '#12071F', display: true,
    });
    if (o.sub) label(o.sub, x + w / 2, y + h - 7, { size: 9, weight: 600, color: 'rgba(18,7,31,.72)' });
    ctx.restore();
    if (on && o.fn) zones.push({ x, y, w, h, fn: o.fn });
  }

  function lighten(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${Math.min(255, ((n >> 16) & 255) + 255 * k) | 0},${Math.min(255, ((n >> 8) & 255) + 255 * k) | 0},${Math.min(255, (n & 255) + 255 * k) | 0})`;
  }
  function darken(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${(((n >> 16) & 255) * (1 - k)) | 0},${(((n >> 8) & 255) * (1 - k)) | 0},${((n & 255) * (1 - k)) | 0})`;
  }

  const teinte = (n) => (n === 0 ? '#0E7A3C' : ROUGES.has(n) ? '#C0182C' : '#171018');

  // ── Le tapis, dessine une fois puis recopie ─────────────────────────
  function buildFeutre() {
    const S = 2;
    const c = document.createElement('canvas');
    c.width = L.AW * S;
    c.height = L.AH * S;
    const g = c.getContext('2d');
    g.scale(S, S);
    const CW = cw(), CH = ch();
    const cell = (gx0, gy0, gx1, gy1) => {
      const a = pix(gx0, gy0), b = pix(gx1, gy1);
      return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
    };

    // Drap de feutre + liseré de bois.
    const bord = cell(-0.35, -0.75, GW + 0.35, GH + 0.35);
    roundRectPath(g, bord.x - 10, bord.y - 10, bord.w + 20, bord.h + 20, 18);
    g.fillStyle = BOIS;
    g.fill();
    g.strokeStyle = 'rgba(255,201,60,.35)';
    g.lineWidth = 2;
    g.stroke();
    roundRectPath(g, bord.x, bord.y, bord.w, bord.h, 12);
    const gr = g.createLinearGradient(bord.x, bord.y, bord.x, bord.y + bord.h);
    gr.addColorStop(0, FELT);
    gr.addColorStop(1, FELT2);
    g.fillStyle = gr;
    g.fill();

    const caseBox = (n) => {
      const c0 = caseDe(n);
      return cell(c0.gx, c0.gy, c0.gx + c0.gw, c0.gy + c0.gh);
    };
    const dessineCase = (r, n, taille) => {
      roundRectPath(g, r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3, 4);
      g.fillStyle = teinte(n);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,.5)';
      g.lineWidth = 1.2;
      g.stroke();
      g.font = `800 ${taille}px Bungee, Rubik, system-ui, sans-serif`;
      g.textAlign = 'center';
      g.fillStyle = CREAM;
      g.fillText(String(n), r.x + r.w / 2, r.y + r.h / 2 + taille * 0.36);
    };

    const tailleNum = Math.min(CW, CH) * 0.46;
    dessineCase(caseBox(0), 0, tailleNum * 1.1);
    for (let n = 1; n <= 36; n++) dessineCase(caseBox(n), n, tailleNum);

    // Liseré des bouts de rangée : c'est la qu'on pose transversales et
    // sixains, comme sur une vraie table. Sans repere, personne ne devine.
    {
      const bande = cell(1, -0.6, 13, 0);
      roundRectPath(g, bande.x, bande.y, bande.w, bande.h, 4);
      g.fillStyle = 'rgba(0,0,0,.2)';
      g.fill();
      g.strokeStyle = 'rgba(255,201,60,.3)';
      g.lineWidth = 1;
      g.stroke();
      for (let r = 2; r <= 12; r++) {
        const p0 = pix(r, -0.6), p1 = pix(r, 0);
        g.beginPath();
        g.moveTo(p0.x, p0.y);
        g.lineTo(p1.x, p1.y);
        g.strokeStyle = 'rgba(255,201,60,.3)';
        g.lineWidth = 1;
        g.stroke();
      }
      const c0 = cell(1, -0.6, 13, 0);
      g.save();
      g.translate(c0.x + c0.w / 2, c0.y + c0.h / 2);
      if (L.portrait) g.rotate(Math.PI / 2);
      g.font = `700 ${Math.max(7, Math.min(11, Math.min(CW, CH) * 0.24))}px Rubik, sans-serif`;
      g.textAlign = 'center';
      g.fillStyle = 'rgba(255,201,60,.75)';
      g.fillText('TRANSVERSALES  ·  SIXAINS SUR LES TRAITS', 0, 3);
      g.restore();
    }

    // Colonnes « 2 à 1 ».
    for (let i = 0; i < 3; i++) {
      const r = cell(13, i, 14, i + 1);
      roundRectPath(g, r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3, 4);
      g.fillStyle = 'rgba(0,0,0,.22)';
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,.45)';
      g.lineWidth = 1.2;
      g.stroke();
      g.save();
      g.translate(r.x + r.w / 2, r.y + r.h / 2);
      if (!L.portrait) g.rotate(-Math.PI / 2);
      g.font = `800 ${Math.min(CW, CH) * 0.3}px Bungee, Rubik, sans-serif`;
      g.textAlign = 'center';
      g.fillStyle = GOLD;
      g.fillText('2 À 1', 0, Math.min(CW, CH) * 0.1);
      g.restore();
    }

    // Douzaines et chances simples.
    const bandes = [
      [1, 3, 5, 4, '1RE DOUZAINE', '1-12'], [5, 3, 9, 4, '2E DOUZAINE', '13-24'],
      [9, 3, 13, 4, '3E DOUZAINE', '25-36'],
      [1, 4, 3, 5, 'MANQUE', '1-18'], [3, 4, 5, 5, 'PAIR', ''],
      [5, 4, 7, 5, 'ROUGE', ''], [7, 4, 9, 5, 'NOIR', ''],
      [9, 4, 11, 5, 'IMPAIR', ''], [11, 4, 13, 5, 'PASSE', '19-36'],
    ];
    for (const [x0, y0, x1, y1, nom, sous] of bandes) {
      const r = cell(x0, y0, x1, y1);
      roundRectPath(g, r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3, 4);
      g.fillStyle = nom === 'ROUGE' ? 'rgba(192,24,44,.55)' : nom === 'NOIR' ? 'rgba(10,6,12,.6)' : 'rgba(0,0,0,.22)';
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,.45)';
      g.lineWidth = 1.2;
      g.stroke();
      g.save();
      g.translate(r.x + r.w / 2, r.y + r.h / 2);
      if (L.portrait) g.rotate(Math.PI / 2);
      const t = Math.min(r.w, r.h) * (L.portrait ? 0.3 : 0.34);
      g.font = `800 ${Math.max(8, Math.min(15, t))}px Bungee, Rubik, sans-serif`;
      g.textAlign = 'center';
      g.fillStyle = CREAM;
      g.fillText(nom, 0, sous ? -1 : 4);
      if (sous) {
        g.font = `600 ${Math.max(7, Math.min(11, t * 0.75))}px Rubik, sans-serif`;
        g.fillStyle = MAUVE;
        g.fillText(sous, 0, 11);
      }
      g.restore();
    }
    feutreCache = { c, key: `${L.portrait}|${L.AW}` };
  }

  // ── Le cylindre ──────────────────────────────────────────────────────
  const angleCase = (n) => (ORDRE.indexOf(n) / ORDRE.length) * TAU;

  function buildRoue() {
    const S = 2;
    const R = L.rr;
    const c = document.createElement('canvas');
    c.width = c.height = R * 2.3 * S;
    const g = c.getContext('2d');
    g.scale(S, S);
    const O = R * 1.15;
    g.translate(O, O);

    // Bois du plateau.
    const bois = g.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.2, 0, 0, R * 1.14);
    bois.addColorStop(0, '#8A4A22');
    bois.addColorStop(0.7, BOIS);
    bois.addColorStop(1, '#2E1509');
    g.beginPath();
    g.arc(0, 0, R * 1.14, 0, TAU);
    g.fillStyle = bois;
    g.fill();
    g.strokeStyle = 'rgba(255,201,60,.5)';
    g.lineWidth = 2;
    g.stroke();

    // Piste de la bille.
    g.beginPath();
    g.arc(0, 0, R * 1.02, 0, TAU);
    g.strokeStyle = 'rgba(20,10,30,.55)';
    g.lineWidth = R * 0.14;
    g.stroke();

    // Les 37 cases.
    const pas = TAU / ORDRE.length;
    ORDRE.forEach((n, i) => {
      const a0 = i * pas - Math.PI / 2 - pas / 2;
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, R * 0.92, a0, a0 + pas);
      g.closePath();
      g.fillStyle = teinte(n);
      g.fill();
      g.strokeStyle = 'rgba(255,201,60,.45)';
      g.lineWidth = 1;
      g.stroke();
      g.save();
      g.rotate(a0 + pas / 2 + Math.PI / 2);
      g.font = `800 ${R * 0.082}px Bungee, Rubik, sans-serif`;
      g.textAlign = 'center';
      g.fillStyle = CREAM;
      g.fillText(String(n), 0, -R * 0.78);
      g.restore();
    });

    // Moyeu et croisillons de la tourelle.
    g.beginPath();
    g.arc(0, 0, R * 0.44, 0, TAU);
    const moy = g.createRadialGradient(-R * 0.12, -R * 0.16, R * 0.05, 0, 0, R * 0.44);
    moy.addColorStop(0, '#E8C98A');
    moy.addColorStop(1, '#7A5326');
    g.fillStyle = moy;
    g.fill();
    for (let i = 0; i < 4; i++) {
      g.save();
      g.rotate((i / 4) * TAU);
      g.beginPath();
      g.moveTo(-R * 0.03, 0);
      g.lineTo(R * 0.03, 0);
      g.lineTo(R * 0.012, -R * 0.42);
      g.lineTo(-R * 0.012, -R * 0.42);
      g.closePath();
      g.fillStyle = 'rgba(255,232,190,.75)';
      g.fill();
      g.restore();
    }
    g.beginPath();
    g.arc(0, 0, R * 0.1, 0, TAU);
    g.fillStyle = '#3C2410';
    g.fill();
    roueCache = { c, key: `${R}`, O };
  }

  function drawRoue(dt, now) {
    if (!roueCache || roueCache.key !== String(L.rr)) buildRoue();
    const R = L.rr;
    const cx = L.rx, cy = L.ry;

    // Vitesse : le cylindre s'emballe au lancement puis retombe.
    const veut = v.phase === 'rien' ? 3.1 : v.lance ? 2.4 : v.phase === 'paie' ? 0.7 : 0.25;
    roueV += (veut - roueV) * Math.min(1, dt * 1.6);
    roueA += roueV * dt;

    // Ombre du plateau.
    ctx.beginPath();
    ctx.ellipse(cx, cy + R * 0.92, R * 1.1, R * 0.3, 0, 0, TAU);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(roueA);
    ctx.drawImage(roueCache.c, -roueCache.O, -roueCache.O, roueCache.O * 2, roueCache.O * 2);
    ctx.restore();

    // La bille : accrochee a sa case, avec un decalage qui s'efface.
    const res = v.res;
    if (res == null) {
      billeA += dt * 7.5;
      billeR = 1;
    } else {
      const k = v.phase === 'rien' ? clamp(1 - v.tl / Math.max(0.001, v.tlMax), 0, 1) : 1;
      const reste = (1 - k) ** 2;
      billeA = roueA + angleCase(res) - Math.PI / 2 + reste * 9 * TAU;
      billeR = 1 + reste * 0.14;
    }
    const br = R * (res == null ? 1.02 : 0.78 * billeR);
    const bx = cx + Math.cos(billeA) * br;
    const by = cy + Math.sin(billeA) * br;
    ctx.beginPath();
    ctx.arc(bx, by + 2, R * 0.045, 0, TAU);
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.fill();
    const bg = ctx.createRadialGradient(bx - R * 0.015, by - R * 0.018, 1, bx, by, R * 0.05);
    bg.addColorStop(0, '#FFFFFF');
    bg.addColorStop(1, '#B9A8D0');
    ctx.beginPath();
    ctx.arc(bx, by, R * 0.045, 0, TAU);
    ctx.fillStyle = bg;
    ctx.fill();

    // Le numero sorti, en gros, sur le moyeu.
    if (res != null && (v.phase === 'paie' || v.phase === 'fin')) {
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.33, 0, TAU);
      ctx.fillStyle = teinte(res);
      ctx.fill();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 3;
      ctx.stroke();
      label(String(res), cx, cy + R * 0.14, { size: R * 0.4, weight: 800, color: CREAM, display: true });
    }
  }

  // ── Les jetons poses sur le tapis ────────────────────────────────────
  function drawMises(now) {
    const CW = cw(), CH = ch();
    const r = Math.max(7, Math.min(CW, CH) * 0.34);
    const pids = Object.keys(v.players);
    pids.forEach((pid, i) => {
      const p = v.players[pid];
      const moi = pid === you;
      const col = config.players[pid]?.color || '#FF3D8A';
      // Chacun pose ses jetons legerement decales : on voit qui a mise quoi.
      const a = (i / Math.max(1, pids.length)) * TAU;
      const ox = Math.cos(a) * r * 0.5 * (pids.length > 1 ? 1 : 0);
      const oy = Math.sin(a) * r * 0.5 * (pids.length > 1 ? 1 : 0);
      for (const b of p.bets) {
        const an = ancre(b.k);
        if (!an) continue;
        const q = pix(an.gx, an.gy);
        const rr = moi ? r : r * 0.78;
        drawChip3D(ctx, q.x + ox, q.y + oy, rr, b.a, { squash: 0.5, label: false });
        ctx.beginPath();
        ctx.arc(q.x + ox, q.y + oy, rr + 1, 0, TAU);
        ctx.strokeStyle = moi ? CREAM : col;
        ctx.lineWidth = moi ? 2 : 1.4;
        ctx.stroke();
        if (b.p) label('🔒', q.x + ox, q.y + oy - rr - 3, { size: 10 });
        if (moi) {
          label(fmt(b.a), q.x + ox, q.y + oy + rr * 0.36, {
            size: Math.max(8, rr * 0.82), weight: 800, color: '#12071F', outline: 0,
          });
        }
      }
    });
  }

  // Surbrillance du numero sorti et des mises gagnantes.
  function drawGagnants() {
    if (v.res == null || (v.phase !== 'paie' && v.phase !== 'rien')) return;
    const n = v.res;
    const c0 = caseDe(n);
    const r = rect(c0.gx, c0.gy, c0.gx + c0.gw, c0.gy + c0.gh);
    const puls = 0.55 + Math.sin(performance.now() / 160) * 0.3;
    ctx.save();
    ctx.globalAlpha = puls;
    roundRectPath(ctx, r.x - 1, r.y - 1, r.w + 2, r.h + 2, 5);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    if (v.phase !== 'paie') return;
    const moi = v.players[you];
    if (!moi) return;
    for (const g of moi.gains) {
      if (g.r <= 0) continue;
      const an = ancre(g.cle);
      if (!an) continue;
      const q = pix(an.gx, an.gy);
      ctx.beginPath();
      ctx.arc(q.x, q.y, Math.min(cw(), ch()) * 0.5, 0, TAU);
      ctx.strokeStyle = GREEN;
      ctx.lineWidth = 2;
      ctx.stroke();
      label(`+${fmt(g.r)}`, q.x, q.y - Math.min(cw(), ch()) * 0.55, {
        size: 12, weight: 800, color: GREEN, outline: 3,
      });
    }
  }

  // Ce que le doigt vise, sur le tapis : fantome du jeton + cases couvertes.
  function drawCibleTapis() {
    if (!cible || v.phase !== 'mise') return;
    const m = mise(cible);
    const an = ancre(cible);
    if (!m || !an) return;
    const q = pix(an.gx, an.gy);
    const r = Math.max(9, Math.min(cw(), ch()) * 0.42);
    ctx.save();
    ctx.globalAlpha = 0.72;
    drawChip3D(ctx, q.x, q.y, r, jeton, { squash: 0.5, label: false });
    ctx.restore();
    ctx.beginPath();
    ctx.arc(q.x, q.y, r + 3, 0, TAU);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Toutes les cases couvertes clignotent doucement.
    ctx.save();
    ctx.globalAlpha = 0.35;
    for (const n of m.ns) {
      const c0 = caseDe(n);
      const rr = rect(c0.gx, c0.gy, c0.gx + c0.gw, c0.gy + c0.gh);
      roundRectPath(ctx, rr.x + 2, rr.y + 2, rr.w - 4, rr.h - 4, 4);
      ctx.fillStyle = GOLD;
      ctx.fill();
    }
    ctx.restore();
  }

  // Et son nom, en clair, par-dessus tout le reste.
  function drawCibleNom() {
    if (!cible || v.phase !== 'mise') return;
    const m = mise(cible);
    if (!m) return;
    const maxi = maximum(cible, v.max);
    const dejaMise = (v.players[you]?.bets || []).find((b) => b.k === cible);
    const boite = { x: L.AW / 2 - 190, y: L.barY - 42, w: 380, h: 34 };
    panel(boite.x, boite.y, boite.w, boite.h, { fill: 'rgba(10,5,22,.9)', stroke: GOLD, r: 10 });
    label(`${m.nom} · payé ${m.pay} pour 1`, L.AW / 2 - 6, boite.y + 15, {
      size: 13, weight: 800, color: GOLD, display: true, align: 'right',
    });
    label(`max ${maxi}${dejaMise ? ` · déjà ${dejaMise.a}` : ''}`, L.AW / 2 + 6, boite.y + 15, {
      size: 11, weight: 600, color: MAUVE, align: 'left',
    });
    label('relâche pour poser le jeton', L.AW / 2, boite.y + 28, { size: 10, weight: 600, color: MAUVE });
  }

  // ── Le tableau d'affichage : les derniers numeros sortis ─────────────
  function drawHistorique() {
    const hist = v.hist || [];
    const n = Math.min(hist.length, L.portrait ? 8 : 12);
    if (!n) return;
    const r = L.histR;
    const x0 = L.histX;
    const y0 = L.histY;
    label('SORTIS', x0 - r + 2, y0 - r - 8, { size: 9, weight: 800, color: MAUVE, align: 'center' });
    for (let i = 0; i < n; i++) {
      const y = y0 + i * (r * 2 + 4);
      ctx.beginPath();
      ctx.arc(x0 - r + 2, y, r, 0, TAU);
      ctx.fillStyle = teinte(hist[i]);
      ctx.fill();
      ctx.strokeStyle = i === 0 ? GOLD : 'rgba(255,255,255,.25)';
      ctx.lineWidth = i === 0 ? 2 : 1;
      ctx.stroke();
      label(String(hist[i]), x0 - r + 2, y + 4, { size: r * 0.82, weight: 800, color: CREAM });
    }
  }

  // ── La barre du bas : jetons, boutons, tapis ─────────────────────────
  function drawBarre() {
    const top = L.barY;
    const H = L.AH - top - 10;
    panel(18, top, L.AW - 36, H, { fill: 'rgba(9,4,20,.88)', stroke: 'rgba(255,201,60,.22)', r: 16 });
    const me = v.players[you];

    if (meChef) {
      label('LE CHEF DE TABLE', 40, top + 24, { size: 13, weight: 800, color: GOLD, align: 'left', display: true });
      label(`BANQUE : ${fmt(v.banque)} 🪙`, L.AW - 40, top + 24, { size: 15, weight: 800, color: CREAM, align: 'right' });
      const dispo = v.nudge > 0 && v.phase === 'rien' && !v.nudged;

      // Ce que la table lui doit ou lui rapporte, en clair.
      const surTapis = Object.values(v.players).reduce((n, p) => n + p.engage, 0);
      const bilan = -Object.values(v.players).reduce((n, p) => n + p.delta, 0);
      if (v.phase === 'paie' && bilan !== 0) {
        label(bilan > 0 ? `LA BANQUE ENCAISSE +${fmt(bilan)}` : `LA BANQUE PAIE ${fmt(bilan)}`,
          L.AW / 2, top + 52, { size: 15, weight: 800, color: bilan > 0 ? GREEN : RED, display: true });
      } else {
        label(`${fmt(surTapis)} jetons sur le tapis`, L.AW / 2, top + 52, {
          size: 13, weight: 700, color: surTapis > 0 ? CREAM : MAUVE,
        });
      }
      label(dispo ? 'La bille tourne : un coup de poignet ?' : `Coups de poignet restants : ${v.nudge}`,
        L.AW / 2, top + 74, { size: 12, weight: 600, color: dispo ? GOLD : MAUVE });
      const bw = Math.min(190, (L.AW - 120) / 2);
      const by = top + H - (L.portrait ? 74 : 58);
      button(L.AW / 2 - bw - 10, by, bw, 46, '◀ UNE CASE', {
        color: '#B14BFF', enabled: dispo, sub: 'la bille recule',
        fn: () => { send.act('poignet', { dir: -1 }); sfx.play('steal'); },
      });
      button(L.AW / 2 + 10, by, bw, 46, 'UNE CASE ▶', {
        color: '#B14BFF', enabled: dispo, sub: 'la bille avance',
        fn: () => { send.act('poignet', { dir: 1 }); sfx.play('steal'); },
      });
      return;
    }
    if (!me) return;

    const verrou = v.phase !== 'mise' || !!me.ok;
    label(verrou ? (me.ok ? 'MISES VALIDÉES' : 'RIEN NE VA PLUS') : 'FAITES VOS JEUX',
      40, top + 24, { size: 13, weight: 800, color: verrou ? GREEN : GOLD, align: 'left', display: true });
    label(`TAPIS : ${fmt(me.chips - me.engage)} 🪙`, L.AW - 40, top + 24, {
      size: 13, weight: 800, color: MAUVE, align: 'right',
    });
    label(`sur le tapis : ${fmt(me.engage)}`, L.AW - 40, top + 40, { size: 11, weight: 600, color: CREAM, align: 'right' });
    label(`maximum de la table : ${fmt(v.max)} aux chances simples`, 40, top + 40, {
      size: 10, weight: 600, color: MAUVE, align: 'left',
    });

    // Les jetons du stand.
    const cr = L.portrait ? 25 : 22;
    const gap = cr * 2.7;
    const cy = top + (L.portrait ? 104 : 84);
    const cx0 = L.AW / 2 - ((JETONS.length - 1) * gap) / 2;
    JETONS.forEach((val, i) => {
      const x = cx0 + i * gap;
      const actif = val === jeton;
      const payable = !verrou && me.chips - me.engage >= val;
      ctx.save();
      if (!payable) ctx.globalAlpha = 0.3;
      drawChip3D(ctx, x, cy - (actif ? 7 : 0), cr, val, { squash: 0.46 });
      ctx.restore();
      if (actif) {
        ctx.beginPath();
        ctx.arc(x, cy - 7, cr + 4, 0, TAU);
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      if (payable) {
        zones.push({
          x: x - cr - 4, y: cy - cr - 12, w: cr * 2 + 8, h: cr * 2 + 20,
          fn: () => { jeton = val; sfx.play('click'); },
        });
      }
    });

    // Boutons du tapis.
    const bw = (L.AW - 120) / 5;
    const by = top + H - (L.portrait ? 66 : 54);
    const bh = L.portrait ? 54 : 44;
    const actifs = !verrou;
    const btns = [
      ['ANNULER', 'dernier jeton', '#6B4E8F', actifs && me.bets.length > 0, () => { send.act('annuler'); sfx.play('click'); }],
      ['EFFACER', 'tout retirer', '#6B4E8F', actifs && me.bets.length > 0, () => { send.act('effacer'); sfx.play('steal'); }],
      ['×2', 'double tout', '#29D9FF', actifs && me.bets.length > 0, () => { send.act('doubler'); sfx.play('coin'); }],
      ['REJOUER', 'les mêmes', GOLD, actifs, () => { send.act('rejouer'); sfx.play('coin'); }],
      [me.ok ? 'MODIFIER' : 'PRÊT', me.ok ? 'je remise' : 'faites tourner', me.ok ? '#6B4E8F' : '#3DFF8A',
        v.phase === 'mise', () => { send.act('pret'); sfx.play('ready'); }],
    ];
    btns.forEach(([t, sub, col, on, fn], i) => {
      button(50 + i * (bw + 5), by, bw, bh, t, { color: col, sub, enabled: on, fn, size: 12, ink: '#12071F' });
    });
  }

  // ── Bandeau du haut : tour, chrono, joueurs ──────────────────────────
  function drawHud() {
    const t = v.phase === 'mise' ? (v.lance ? 'LE CYLINDRE TOURNE' : 'FAITES VOS JEUX')
      : v.phase === 'rien' ? 'RIEN NE VA PLUS'
        : v.phase === 'paie' ? (v.res === 0 ? 'ZÉRO !' : `${v.res} ${couleur(v.res).toUpperCase()}`)
          : v.phase === 'fin' ? (v.fin === 'banque' ? 'LA BANQUE A SAUTÉ' : 'LA TABLE FERME')
            : 'LA TABLE OUVRE';
    const col = v.phase === 'rien' ? RED : v.phase === 'paie' ? GOLD : CREAM;
    panel(L.AW / 2 - 150, 14, 300, 46, { fill: 'rgba(9,4,20,.8)', stroke: 'rgba(255,201,60,.25)', r: 12 });
    label(t, L.AW / 2, 36, { size: 16, weight: 800, color: col, display: true });
    label(`TOUR ${v.tour} / ${v.tours}`, L.AW / 2, 52, { size: 10, weight: 600, color: MAUVE });

    // Chrono de mise.
    if (v.phase === 'mise' || v.phase === 'rien') {
      const f = clamp(v.tl / Math.max(0.001, v.tlMax), 0, 1);
      roundRectPath(ctx, L.AW / 2 - 140, 62, 280, 7, 4);
      ctx.fillStyle = 'rgba(255,255,255,.14)';
      ctx.fill();
      roundRectPath(ctx, L.AW / 2 - 140, 62, 280 * f, 7, 4);
      ctx.fillStyle = v.phase === 'rien' ? RED : v.tl < 3 ? GOLD : GREEN;
      ctx.fill();
    }

    // Bandeau des joueurs.
    const n = sieges.length;
    const w = Math.min(150, (L.AW - 60) / Math.max(1, n));
    const y = L.stripY;
    const x0 = L.AW / 2 - (n * w) / 2;
    sieges.forEach((pid, i) => {
      const p = v.players[pid];
      if (!p) return;
      const x = x0 + i * w;
      const col2 = config.players[pid]?.color || '#FF3D8A';
      panel(x + 2, y, w - 4, 26, {
        fill: pid === you ? 'rgba(255,201,60,.14)' : 'rgba(9,4,20,.7)',
        stroke: p.ok ? GREEN : 'rgba(255,255,255,.12)', r: 8,
      });
      label(config.players[pid]?.name || '?', x + 8, y + 12, {
        size: 10, weight: 700, color: col2, align: 'left',
      });
      label(`${fmt(p.chips)} 🪙`, x + 8, y + 22, { size: 10, weight: 600, color: CREAM, align: 'left' });
      if (v.phase === 'paie' && p.delta !== 0) {
        label(`${p.delta > 0 ? '+' : ''}${fmt(p.delta)}`, x + w - 10, y + 18, {
          size: 12, weight: 800, color: p.delta > 0 ? GREEN : RED, align: 'right',
        });
      } else if (p.ok) {
        label('✔', x + w - 10, y + 18, { size: 12, weight: 800, color: GREEN, align: 'right' });
      }
    });
    if (v.banque != null) {
      panel(14, 14, 140, 40, { fill: 'rgba(9,4,20,.8)', stroke: 'rgba(255,201,60,.25)', r: 10 });
      label('LA BANQUE', 84, 30, { size: 10, weight: 700, color: MAUVE });
      label(`${fmt(v.banque)} 🪙`, 84, 46, { size: 14, weight: 800, color: GOLD, display: true });
    }
  }

  // ── Clavier ──────────────────────────────────────────────────────────
  function onKey(e) {
    if (e.repeat || !v) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (meChef) {
      if (v.phase !== 'rien' || v.nudge <= 0 || v.nudged) return;
      if (e.code === 'ArrowLeft') { e.preventDefault(); send.act('poignet', { dir: -1 }); }
      else if (e.code === 'ArrowRight') { e.preventDefault(); send.act('poignet', { dir: 1 }); }
      return;
    }
    const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
    if (i >= 0) { e.preventDefault(); jeton = JETONS[i]; sfx.play('click'); return; }
    if (v.phase !== 'mise') return;
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); send.act('pret'); sfx.play('ready'); }
    else if (e.code === 'Backspace') { e.preventDefault(); send.act('annuler'); }
    else if (e.code === 'Delete') { e.preventDefault(); send.act('effacer'); }
    else if (e.code === 'KeyD') { e.preventDefault(); send.act('doubler'); }
    else if (e.code === 'KeyR') { e.preventDefault(); send.act('rejouer'); }
  }
  addEventListener('keydown', onKey);

  return {
    onTap(x, y, phase) {
      if (!vp || !v) return;
      const w = vp.toWorld(x, y);
      const dansBarre = w.y >= L.barY;
      if (phase === 'start') {
        for (const z of zones) {
          if (w.x >= z.x && w.x <= z.x + z.w && w.y >= z.y && w.y <= z.y + z.h) return;
        }
        if (!meChef && !dansBarre) cible = cibleAt(w.x, w.y);
        return;
      }
      if (phase === 'move') {
        if (cible !== null && !dansBarre) cible = cibleAt(w.x, w.y) || cible;
        return;
      }
      // phase 'end'
      if (cible) {
        const k = cible;
        cible = null;
        const me = v.players[you];
        if (v.phase === 'mise' && me && !me.ok) {
          send.act('mise', { k, v: jeton });
          sfx.play('coin');
        }
        return;
      }
      for (const z of zones) {
        if (w.x >= z.x && w.x <= z.x + z.w && w.y >= z.y && w.y <= z.y + z.h) { z.fn(); return; }
      }
    },

    onEvents(evs) {
      for (const ev of evs) {
        if (ev.e === 'tour') {
          sfx.play('join');
        } else if (ev.e === 'rien') {
          sfx.play('whistle');
          sfx.startRoue();
          juice.floater(L.rx, L.ry - L.rr - 16, 'RIEN NE VA PLUS', { color: RED, size: 18 });
        } else if (ev.e === 'bille') {
          flash = 1;
          sfx.stopRoue();
          sfx.play('bille');
          if (ev.n === 0) sfx.play('klaxon');
          juice.floater(L.rx, L.ry - L.rr * 0.5, `${ev.n}`, { color: GOLD, size: 30 });
        } else if (ev.e === 'poignet') {
          juice.shake(6);
          sfx.play('steal');
          juice.floater(L.rx, L.ry, 'LE POIGNET DU CHEF !', { color: '#B14BFF', size: 16 });
        } else if (ev.e === 'jeton' && ev.pid === you) {
          sfx.play('coin');
        } else if (ev.e === 'refus' && ev.pid === you) {
          sfx.play('death');
          juice.floater(L.AW / 2, L.barY - 20, 'MAXIMUM DE LA TABLE', { color: RED, size: 14 });
        } else if (ev.e === 'rejoue' && ev.pid === you) {
          sfx.play('jetons');
          juice.floater(L.AW / 2, L.barY - 20, 'MÊMES MISES', { color: GOLD, size: 14 });
        } else if (ev.e === 'paie' && ev.pid === you) {
          sfx.play(ev.d > 0 ? 'bank' : 'steal');
          if (ev.d > 0) {
            juice.confetti(L.AW / 2, L.AH / 2, [GOLD, GREEN, CREAM], Math.min(70, 20 + ev.d));
            juice.floater(L.AW / 2, L.barY - 46, `+${ev.d} JETONS`, { color: GREEN, size: 22 });
          }
        } else if (ev.e === 'fin') {
          sfx.play(ev.r === 'banque' ? 'win' : 'go');
        }
      }
    },

    render(v0, dt, now) {
      v = v0.latest;
      const taille = helpers.size();
      L = taille.h / taille.w > 1.12 ? PORT : LAND;
      helpers.bg(ctx);
      vp = helpers.viewport(L.AW, L.AH, 6);
      ctx.save();
      vp.apply(ctx);
      zones.length = 0;

      if (!feutreCache || feutreCache.key !== `${L.portrait}|${L.AW}`) buildFeutre();
      ctx.drawImage(feutreCache.c, 0, 0, L.AW, L.AH);

      drawRoue(dt, now);
      drawGagnants();
      drawMises(now);
      drawCibleTapis();
      drawHistorique();
      drawBarre();
      drawHud();
      drawCibleNom();

      if (flash > 0) {
        flash = Math.max(0, flash - dt * 1.6);
        ctx.fillStyle = `rgba(255,201,60,${flash * 0.16})`;
        ctx.fillRect(0, 0, L.AW, L.AH);
      }
      if (lastRes !== v.res) { lastRes = v.res; }

      juice.drawWorld(ctx);
      ctx.restore();
    },

    destroy() {
      sfx.stopRoue();
      removeEventListener('keydown', onKey);
      zones.length = 0;
      feutreCache = null;
      roueCache = null;
    },
  };
}
