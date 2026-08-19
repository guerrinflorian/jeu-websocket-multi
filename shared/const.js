// Constantes et helpers isomorphes (serveur Node + navigateur).

export const MAX_PLAYERS = 8;

// Couleurs joueurs, distinctes sur fond nuit (voir docs/DESIGN.md).
export const PLAYER_COLORS = [
  '#FF3D8A', '#29D9FF', '#FFC93C', '#3DFF8A',
  '#FF7A3D', '#B14BFF', '#4D7CFF', '#F0EEE6',
];

// Formes d'équipes (doublage de la couleur pour les daltoniens).
export const TEAM_SHAPES = ['●', '▲', '■', '◆'];

// Alphabet des codes de room : ni 0/O, ni 1/I/L.
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export const TAU = Math.PI * 2;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;

export function dist2(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}
export const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));

// Interpolation d'angle par le plus court chemin.
export function angleLerp(a, b, t) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}

// PRNG seedé (mulberry32) : parties reproductibles côté serveur et en test.
export function makeRng(seed) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (a, b) => a + next() * (b - a),
    int: (a, b) => Math.floor(a + next() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
  };
}

// Interpolation générique d'entités entre deux snapshots.
// prev/next : tableaux d'objets avec `id` et des champs numériques.
// angKeys : champs à interpoler comme des angles.
export function interpEnts(prev, next, alpha, angKeys = ['a']) {
  if (!prev) return next || [];
  if (!next) return prev;
  const byId = new Map();
  for (const p of prev) byId.set(p.id, p);
  return next.map((n) => {
    const p = byId.get(n.id);
    if (!p) return n;
    const out = { ...n };
    for (const k of Object.keys(n)) {
      if (typeof n[k] !== 'number' || typeof p[k] !== 'number') continue;
      out[k] = angKeys.includes(k) ? angleLerp(p[k], n[k], alpha) : lerp(p[k], n[k], alpha);
    }
    return out;
  });
}
