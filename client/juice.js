// Le « juice » : particules (pool), screenshake, textes flottants, flash.
// Tout se dessine par-dessus le rendu du jeu, dans le même canvas.

const REDUCED = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const MAX_PARTS = 512;
const parts = [];
const floaters = [];
const rings = [];
let shakePower = 0;
let flashColor = null;
let flashAlpha = 0;

export function reset() {
  parts.length = 0;
  floaters.length = 0;
  rings.length = 0;
  shakePower = 0;
  flashAlpha = 0;
}

// Onde de choc : cercle qui s'étend et s'estompe (coords monde).
export function ring(x, y, { color = '#FFC93C', maxR = 60, life = 0.4, width = 3 } = {}) {
  if (rings.length < 40) rings.push({ x, y, color, maxR, life, width, t: 0 });
}

export function shake(power = 6) {
  if (REDUCED) return;
  shakePower = Math.min(14, Math.max(shakePower, power));
}

export function flash(color = '#FFFFFF', alpha = 0.35) {
  flashColor = color;
  flashAlpha = alpha;
}

// Particules en coordonnées MONDE (le jeu fournit son propre repère).
export function burst(x, y, { n = 12, color = '#FFC93C', speed = 120, life = 0.6, size = 3, grav = 0, spread = Math.PI * 2, dir = 0 } = {}) {
  const count = REDUCED ? Math.ceil(n / 3) : n;
  for (let i = 0; i < count && parts.length < MAX_PARTS; i++) {
    const a = dir + (Math.random() - 0.5) * spread;
    const sp = speed * (0.4 + Math.random() * 0.8);
    parts.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: life * (0.6 + Math.random() * 0.6),
      t: 0,
      size: size * (0.6 + Math.random() * 0.8),
      color, grav,
    });
  }
}

export function confetti(x, y, colors, n = 40) {
  for (const c of colors) burst(x, y, { n: Math.ceil(n / colors.length), color: c, speed: 220, life: 1.2, size: 4, grav: 260 });
}

export function floater(x, y, text, { color = '#F5EFE6', size = 16 } = {}) {
  floaters.push({ x, y, text, color, size, t: 0, life: 1.1 });
}

export function update(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.t += dt;
    if (p.t >= p.life) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
    p.vy += p.grav * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.t += dt;
    if (f.t >= f.life) floaters.splice(i, 1);
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    rings[i].t += dt;
    if (rings[i].t >= rings[i].life) rings.splice(i, 1);
  }
  shakePower *= Math.pow(0.001, dt); // décroissance rapide
  if (shakePower < 0.3) shakePower = 0;
  flashAlpha = Math.max(0, flashAlpha - dt * 1.8);
}

// Décalage de screenshake à appliquer avant le rendu monde.
export function shakeOffset() {
  if (!shakePower) return { x: 0, y: 0 };
  return {
    x: (Math.random() - 0.5) * 2 * shakePower,
    y: (Math.random() - 0.5) * 2 * shakePower,
  };
}

// À appeler dans le repère MONDE du jeu.
export function drawWorld(ctx) {
  for (const r of rings) {
    const k = r.t / r.life;
    const ease = 1 - (1 - k) * (1 - k);
    ctx.globalAlpha = (1 - k) * 0.8;
    ctx.beginPath();
    ctx.arc(r.x, r.y, Math.max(1, r.maxR * ease), 0, Math.PI * 2);
    ctx.strokeStyle = r.color;
    ctx.lineWidth = r.width * (1 - k * 0.6);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const p of parts) {
    const a = 1 - p.t / p.life;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  for (const f of floaters) {
    const k = f.t / f.life;
    ctx.globalAlpha = 1 - k * k;
    ctx.font = `800 ${f.size}px Rubik, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = f.color;
    ctx.strokeStyle = 'rgba(20,10,38,.8)';
    ctx.lineWidth = 3;
    const y = f.y - 20 - k * 34;
    ctx.strokeText(f.text, f.x, y);
    ctx.fillText(f.text, f.x, y);
  }
  ctx.globalAlpha = 1;
}

// À appeler dans le repère ÉCRAN (pixels canvas), après le monde.
export function drawScreen(ctx, w, h) {
  if (flashAlpha > 0 && flashColor) {
    ctx.globalAlpha = flashAlpha;
    ctx.fillStyle = flashColor;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }
}
