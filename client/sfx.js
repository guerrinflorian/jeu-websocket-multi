// Moteur sonore : de vrais échantillons (Kenney, CC0) avec repli intégral
// sur la synthèse WebAudio, plus quelques nappes et boucles synthétisées.
// L'AudioContext démarre au premier geste utilisateur (politique autoplay).

let ctx = null;
let master = null;
let noiseBuf = null;
let ambientNodes = null;

let muted = localStorage.getItem('kermesse.mute') === '1';

export function isMuted() { return muted; }

export function toggleMute() {
  muted = !muted;
  localStorage.setItem('kermesse.mute', muted ? '1' : '0');
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

export function boot() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(ctx.destination);
  // Buffer de bruit blanc réutilisé partout.
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  precharge();
}

function osc(freq, dur, { type = 'square', vol = 0.2, slide = 0, delay = 0, attack = 0.005 } = {}) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(dur, { vol = 0.2, freq = 1200, q = 1, delay = 0, type = 'bandpass', slide = 0 } = {}) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t0);
  if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0, Math.random() * 0.5, dur + 0.05);
}

// Recettes nommées. Courtes (< 400 ms), percussives, foraine-friendly.
const RECIPES = {
  click:   () => osc(700, 0.05, { type: 'triangle', vol: 0.15 }),
  join:    () => { osc(523, 0.09, { type: 'triangle' }); osc(784, 0.12, { type: 'triangle', delay: 0.07 }); },
  leave:   () => { osc(784, 0.09, { type: 'triangle' }); osc(523, 0.12, { type: 'triangle', delay: 0.07 }); },
  ready:   () => { osc(660, 0.08, { type: 'square', vol: 0.12 }); osc(990, 0.1, { delay: 0.06, type: 'square', vol: 0.12 }); },
  count:   () => osc(440, 0.12, { type: 'square', vol: 0.25 }),
  go:      () => { osc(880, 0.25, { type: 'square', vol: 0.3 }); osc(1320, 0.3, { type: 'square', vol: 0.15, delay: 0.05 }); },
  death:   () => { osc(300, 0.3, { type: 'sawtooth', vol: 0.25, slide: -260 }); noise(0.25, { freq: 400, vol: 0.2 }); },
  fall:    () => osc(600, 0.5, { type: 'sine', vol: 0.25, slide: -520 }),
  dash:    () => noise(0.15, { freq: 2000, vol: 0.25, slide: -1500 }),
  boost:   () => { osc(220, 0.2, { type: 'sawtooth', vol: 0.2, slide: 400 }); noise(0.15, { freq: 3000, vol: 0.12 }); },
  hit:     () => { noise(0.08, { freq: 900, vol: 0.3, q: 2 }); osc(150, 0.1, { type: 'square', vol: 0.2 }); },
  pickup:  () => osc(880, 0.07, { type: 'triangle', vol: 0.15, slide: 300 }),
  coin:    () => { osc(988, 0.06, { type: 'square', vol: 0.12 }); osc(1319, 0.12, { type: 'square', vol: 0.12, delay: 0.05 }); },
  bank:    () => { osc(659, 0.08, { type: 'triangle' }); osc(880, 0.08, { delay: 0.06, type: 'triangle' }); osc(1319, 0.14, { delay: 0.12, type: 'triangle' }); },
  steal:   () => osc(500, 0.15, { type: 'sawtooth', vol: 0.15, slide: -200 }),
  shot:    () => { noise(0.12, { freq: 1500, vol: 0.35, slide: -1200 }); osc(180, 0.1, { type: 'square', vol: 0.25, slide: -100 }); },
  klaxon:  () => { osc(415, 0.18, { type: 'sawtooth', vol: 0.3 }); osc(311, 0.3, { type: 'sawtooth', vol: 0.3, delay: 0.16 }); },
  mission: () => { osc(587, 0.09, { type: 'triangle' }); osc(880, 0.09, { delay: 0.08, type: 'triangle' }); osc(1175, 0.16, { delay: 0.16, type: 'triangle' }); },
  win:     () => { [523, 659, 784, 1047].forEach((f, i) => osc(f, 0.18, { type: 'square', vol: 0.18, delay: i * 0.12 })); },
  lose:    () => { [392, 370, 349, 330].forEach((f, i) => osc(f, 0.2, { type: 'sawtooth', vol: 0.15, delay: i * 0.14 })); },
  emote:   () => osc(1200, 0.06, { type: 'triangle', vol: 0.12, slide: 200 }),
  tickup:  () => osc(1000, 0.03, { type: 'square', vol: 0.08 }),
  whistle: () => osc(2000, 0.25, { type: 'sine', vol: 0.15, slide: 800 }),
};

// ── Banque d'échantillons ──────────────────────────────────────────────
// Vrais sons (Kenney, CC0) dans client/sfx/. Plusieurs variantes par action :
// on en tire une au hasard, avec un léger décalage de hauteur, pour que dix
// jetons posés d'affilée ne sonnent pas comme une mitraillette.
// Si le navigateur ne sait pas lire l'Ogg, ou si un fichier manque, on
// retombe sur le son de synthèse : le jeu ne devient jamais muet.

const BANQUE = {
  click:    ['click1', 'click2', 'click3'],
  join:     ['join'],
  leave:    ['leave'],
  ready:    ['ready'],
  count:    ['count'],
  go:       ['go'],
  win:      ['win'],
  lose:     ['lose'],
  mission:  ['mission'],
  pickup:   ['pickup'],
  whistle:  ['whistle'],
  fall:     ['fall'],
  boost:    ['boost'],
  dash:     ['dash'],
  steal:    ['steal'],
  klaxon:   ['klaxon'],
  emote:    ['emote'],
  tickup:   ['tickup'],
  coin:     ['coin1', 'coin2', 'coin3'],
  bank:     ['bank'],
  jetons:   ['jetons'],
  hit:      ['hit1', 'hit2'],
  death:    ['death'],
  shot:     ['shot1', 'shot2', 'shot3'],
  boum:     ['boum1', 'boum2'],
  ricochet: ['ricochet1', 'ricochet2', 'ricochet3'],
  carte:    ['carte1', 'carte2', 'carte3'],
  melange:  ['melange'],
  des:      ['des1', 'des2'],
  deshake:  ['deshake'],
  bille:    ['bille'],
  pion:     ['pion'],
  boite:    ['boite1', 'boite2'],
};

// Volume par action : les échantillons ne sortent pas tous au même niveau.
const NIVEAUX = {
  click: 0.45, tickup: 0.3, emote: 0.5, coin: 0.7, jetons: 0.55, carte: 0.6,
  melange: 0.5, des: 0.7, deshake: 0.5, ricochet: 0.5, hit: 0.6, pion: 0.55,
  shot: 0.45, boum: 0.7, death: 0.7, bille: 0.7, klaxon: 0.5, steal: 0.45,
  boite: 0.6,
  win: 0.8, lose: 0.7, go: 0.8, count: 0.7, ready: 0.6, join: 0.6, leave: 0.5,
};

const buffers = new Map();     // nom de fichier -> AudioBuffer
let chargement = null;
let voix = 0;                  // sons en cours, pour ne pas saturer

function litOgg() {
  try {
    const a = document.createElement('audio');
    return !!a.canPlayType && a.canPlayType('audio/ogg; codecs="vorbis"') !== '';
  } catch { return false; }
}

async function charge(nom) {
  const rep = await fetch(`/sfx/${nom}.ogg`);
  if (!rep.ok) throw new Error(nom);
  const brut = await rep.arrayBuffer();
  const buf = await new Promise((ok, ko) => {
    const p = ctx.decodeAudioData(brut, ok, ko);
    if (p && p.then) p.then(ok, ko);
  });
  buffers.set(nom, buf);
}

// Préchargement au premier geste : rien ne bloque, chaque son apparaît
// quand il est prêt et la synthèse assure l'intérim.
function precharge() {
  if (chargement || !ctx || !litOgg()) return;
  const noms = [...new Set(Object.values(BANQUE).flat())];
  chargement = Promise.all(noms.map((n) => charge(n).catch(() => { /* on garde la synthèse */ })));
}

function joueBuffer(buf, vol) {
  if (voix > 14) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = 0.95 + Math.random() * 0.1;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(g).connect(master);
  voix++;
  src.onended = () => { voix--; };
  src.start();
}

export function play(name) {
  if (!ctx || muted) return;
  const variantes = BANQUE[name];
  if (variantes) {
    const buf = buffers.get(variantes[(Math.random() * variantes.length) | 0]);
    if (buf) {
      try { joueBuffer(buf, NIVEAUX[name] ?? 0.7); return; } catch { /* on retombe sur la synthèse */ }
    }
  }
  if (!RECIPES[name]) return;
  try { RECIPES[name](); } catch { /* audio non critique */ }
}

// ── Boucle du cylindre (roulette) ──────────────────────────────────────
// Aucun échantillon ne boucle proprement pour ça : le roulement de la
// bille sur la piste est synthétisé, il tourne tant qu'on le laisse.
let roueNodes = null;

export function startRoue() {
  if (!ctx || roueNodes || muted) return;
  const g = ctx.createGain();
  g.gain.value = 0;
  g.gain.linearRampToValueAtTime(0.13, ctx.currentTime + 0.25);
  g.connect(master);

  // Bruit filtré : le grondement de la piste.
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 900;
  f.Q.value = 1.6;
  src.connect(f).connect(g);

  // Modulation : la bille passe devant l'oreille à chaque tour.
  const lfo = ctx.createOscillator();
  const lfoG = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = 7;
  lfoG.gain.value = 420;
  lfo.connect(lfoG).connect(f.frequency);
  // Elle ralentit : la modulation aussi.
  lfo.frequency.exponentialRampToValueAtTime(2.2, ctx.currentTime + 3.4);

  src.start();
  lfo.start();
  roueNodes = { g, src, lfo };
}

export function stopRoue() {
  if (!roueNodes) return;
  const { g, src, lfo } = roueNodes;
  roueNodes = null;
  try {
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
  } catch { /* contexte déjà fermé */ }
  setTimeout(() => {
    try { src.stop(); lfo.stop(); g.disconnect(); } catch { /* déjà arrêté */ }
  }, 320);
}

// Nappe d'orgue de foire discrète pour le lobby.
export function startAmbient() {
  if (!ctx || ambientNodes || muted) return;
  const g = ctx.createGain();
  g.gain.value = 0;
  g.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 2);
  g.connect(master);
  const freqs = [130.81, 164.81, 196.0];
  const oscs = freqs.map((f, i) => {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    o.detune.value = i * 4 - 4;
    o.connect(g);
    o.start();
    return o;
  });
  const lfo = ctx.createOscillator();
  const lfoG = ctx.createGain();
  lfo.frequency.value = 0.4;
  lfoG.gain.value = 0.012;
  lfo.connect(lfoG).connect(g.gain);
  lfo.start();
  ambientNodes = { g, oscs, lfo };
}

export function stopAmbient() {
  if (!ambientNodes) return;
  const { g, oscs, lfo } = ambientNodes;
  ambientNodes = null;
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
  setTimeout(() => { oscs.forEach((o) => o.stop()); lfo.stop(); g.disconnect(); }, 900);
}
