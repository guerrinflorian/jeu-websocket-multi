// Écrans DOM : accueil, lobby, résultats + modales, toasts, emotes.
// Rendu par templates HTML re-générés à chaque état (8 joueurs max : trivial).

import { t, formatLabel, EMOTES } from './strings.js';
import { avatarSvg, FACE_COUNT } from './avatars.js';
import * as sfx from './sfx.js';
import { PLAYER_COLORS, TEAM_SHAPES } from '/shared/const.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ── Toasts ─────────────────────────────────────────────────────────────

export function toast(text, kind = 'info') {
  const root = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.textContent = text;
  root.appendChild(el);
  setTimeout(() => el.classList.add('out'), 2600);
  setTimeout(() => el.remove(), 3100);
}

// ── Modale ─────────────────────────────────────────────────────────────

export function openModal(html, cls = '') {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-back"><div class="modal ${cls}">
    <button class="modal-close" aria-label="${t('misc.close')}">✕</button>
    ${html}
  </div></div>`;
  root.querySelector('.modal-back').addEventListener('pointerdown', (e) => {
    if (e.target.classList.contains('modal-back')) closeModal();
  });
  root.querySelector('.modal-close').addEventListener('click', closeModal);
  return root.querySelector('.modal');
}

export function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
}

// ── Règles d'un jeu (mini-tuto illustré + règles complètes) ────────────

export async function openRules(meta) {
  const cards = meta.howto.map((h) => `
    <div class="howto-card">
      <div class="howto-icon">${h.icon}</div>
      <div class="howto-text">${esc(h.text)}</div>
    </div>`).join('');
  const m = openModal(`
    <h2 class="modal-title" style="--neon:${meta.color || '#FF3D8A'}">${meta.emoji} ${esc(meta.name)}</h2>
    <p class="rules-pitch">${esc(meta.pitch)}</p>
    <div class="howto-row">${cards}</div>
    <div class="rules-full"><em>Chargement des règles…</em></div>
  `, 'modal-rules');
  try {
    const md = await (await fetch(`/games/${meta.id}/rules.md`)).text();
    const el = m.querySelector('.rules-full');
    if (el) el.innerHTML = mdLite(md);
  } catch { /* règles complètes optionnelles */ }
}

// Markdown minimal : titres, gras, listes, paragraphes.
function mdLite(md) {
  const lines = esc(md).split(/\r?\n/);
  let html = '', inList = false;
  for (const l of lines) {
    if (/^#{1,3} /.test(l)) {
      if (inList) { html += '</ul>'; inList = false; }
      const lvl = l.match(/^#+/)[0].length;
      html += `<h${lvl + 2}>${l.replace(/^#+ /, '')}</h${lvl + 2}>`;
    } else if (/^[-*] /.test(l)) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${l.slice(2)}</li>`;
    } else if (l.trim() === '') {
      if (inList) { html += '</ul>'; inList = false; }
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<p>${l}</p>`;
    }
  }
  if (inList) html += '</ul>';
  return html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

// ── Aperçus des jeux ───────────────────────────────────────────────────
// Chaque jeu peut fournir games/<id>/preview.js exportant drawPreview(ctx,
// w, h) : une vignette illustrée dessinée au Canvas. Sinon : fond + emoji.
// Les vignettes sont dessinées une fois puis recopiées : le lobby se
// rafraîchit souvent, hors de question de tout revectoriser à chaque fois.

const previewMods = new Map(); // id → Promise<module|null>
const thumbCache = new Map();  // id|w|h → canvas hors écran

function previewMod(id) {
  if (!previewMods.has(id)) {
    previewMods.set(id, import(`/games/${id}/preview.js`).catch(() => null));
  }
  return previewMods.get(id);
}

function fallbackThumb(ctx, w, h, emoji) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#241245');
  g.addColorStop(1, '#140A26');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.font = `${Math.round(h * 0.48)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji || '🎪', w / 2, h / 2 + 2);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
}

async function thumbFor(meta, w, h, dpr) {
  const key = `${meta.id}|${w}|${h}|${dpr}`;
  const hit = thumbCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  fallbackThumb(g, w, h, meta.emoji);
  const mod = await previewMod(meta.id);
  if (mod?.drawPreview) {
    try {
      g.save();
      mod.drawPreview(g, w, h);
      g.restore();
    } catch {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      fallbackThumb(g, w, h, meta.emoji);
    }
  }
  thumbCache.set(key, c);
  if (thumbCache.size > 90) thumbCache.delete(thumbCache.keys().next().value);
  return c;
}

export function paintThumbs(root, manifest) {
  root.querySelectorAll('canvas[data-thumb]').forEach(async (cv) => {
    const id = cv.dataset.thumb;
    const meta = manifest.find((m) => m.id === id) || { id, emoji: '🎪' };
    const rect = cv.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.max(120, Math.round(rect.width));
    const h = Math.max(68, Math.round(rect.height) || Math.round((w * 9) / 16));
    if (cv.dataset.painted === `${w}|${h}`) return;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fallbackThumb(ctx, w, h, meta.emoji);
    const spr = await thumbFor(meta, w, h, dpr);
    if (!cv.isConnected) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(spr, 0, 0);
    cv.dataset.painted = `${w}|${h}`;
  });
}

// ── Sélecteur de stands : recherche + familles ─────────────────────────
// Un seul composant, utilisé par l'accueil (galerie) et par le lobby
// (choix du jeu). Le filtrage se fait sur place, sans reconstruire le DOM :
// on tape, ça filtre, rien ne saute et rien ne perd le focus.

export const GENRES = [
  { id: 'tous', label: 'Tous', emoji: '🎪' },
  { id: 'plateau', label: 'Plateau', emoji: '🎯' },
  { id: 'cartes', label: 'Cartes', emoji: '🃏' },
  { id: 'des', label: 'Dés', emoji: '🎲' },
  { id: 'casino', label: 'Casino', emoji: '🎰' },
  { id: 'arcade', label: 'Arcade', emoji: '🕹️' },
  { id: 'adresse', label: 'Adresse', emoji: '🎳' },
  { id: 'mots', label: 'Mots', emoji: '🔤' },
];

// État des filtres, conservé entre deux rendus (accueil et lobby séparés).
export const picker = { home: { q: '', genre: 'tous' }, lobby: { q: '', genre: 'tous' } };

const norm = (s) => String(s ?? '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '');

function matches(meta, q, genre) {
  if (genre !== 'tous' && (meta.genre || 'plateau') !== genre) return false;
  if (!q) return true;
  const hay = norm(`${meta.name} ${meta.tagline} ${meta.pitch} ${meta.genre || ''}`);
  return q.split(/\s+/).filter(Boolean).every((mot) => hay.includes(mot));
}

// Barre recherche + familles présentes dans le manifest.
export function pickerBar(manifest, scope, placeholder) {
  const st = picker[scope];
  const presents = new Set(manifest.map((m) => m.genre || 'plateau'));
  const chips = GENRES.filter((g) => g.id === 'tous' || presents.has(g.id)).map((g) => `
    <button class="chip chip-genre ${g.id === st.genre ? 'sel' : ''}" data-genre="${g.id}">
      ${g.emoji} ${g.label}</button>`).join('');
  return `
    <div class="picker-bar">
      <div class="search-wrap">
        <span class="search-icon" aria-hidden="true">🔎</span>
        <input class="input input-search" type="search" data-search="${scope}"
               placeholder="${esc(placeholder)}" value="${esc(st.q)}"
               autocomplete="off" autocorrect="off" spellcheck="false">
        <button class="search-clear" data-clear="${scope}" aria-label="Effacer">✕</button>
      </div>
      <div class="chip-row genre-row">${chips}</div>
    </div>`;
}

// Applique le filtre courant aux cartes déjà présentes dans le DOM.
export function applyPicker(root, manifest, scope) {
  const st = picker[scope];
  const q = norm(st.q).trim();
  let visibles = 0;
  root.querySelectorAll('[data-stand], [data-card]').forEach((el) => {
    const id = el.dataset.stand || el.dataset.card;
    const meta = manifest.find((m) => m.id === id);
    const on = meta ? matches(meta, q, st.genre) : false;
    el.classList.toggle('hide', !on);
    if (on) visibles++;
  });
  const vide = root.querySelector('[data-empty]');
  if (vide) vide.classList.toggle('show', visibles === 0);
  const cnt = root.querySelector('[data-count]');
  if (cnt) cnt.textContent = visibles === manifest.length ? String(manifest.length) : `${visibles}/${manifest.length}`;
  const clr = root.querySelector(`[data-clear="${scope}"]`);
  if (clr) clr.classList.toggle('show', st.q.length > 0);
  paintThumbs(root, manifest);
}

// Branche la barre : frappe au clavier, familles, croix d'effacement.
export function wirePicker(root, manifest, scope) {
  const input = root.querySelector(`[data-search="${scope}"]`);
  if (input) {
    input.addEventListener('input', () => {
      picker[scope].q = input.value;
      applyPicker(root, manifest, scope);
    });
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { input.value = ''; picker[scope].q = ''; applyPicker(root, manifest, scope); }
    });
  }
  root.querySelector(`[data-clear="${scope}"]`)?.addEventListener('click', () => {
    picker[scope].q = '';
    if (input) { input.value = ''; input.focus(); }
    applyPicker(root, manifest, scope);
  });
  root.querySelectorAll('[data-genre]').forEach((b) => b.addEventListener('click', () => {
    picker[scope].genre = b.dataset.genre;
    root.querySelectorAll('[data-genre]').forEach((x) => x.classList.toggle('sel', x === b));
    sfx.play('click');
    applyPicker(root, manifest, scope);
  }));
  applyPicker(root, manifest, scope);
}

// Ligne « 2 à 8 joueurs · Cartes » sous le titre d'une carte de stand.
function standMeta(m) {
  const g = GENRES.find((x) => x.id === (m.genre || 'plateau'));
  const n = m.minPlayers === m.maxPlayers ? `${m.maxPlayers}` : `${m.minPlayers} à ${m.maxPlayers}`;
  return `${n} joueurs${g && g.id !== 'tous' ? ` · ${g.label}` : ''}`;
}

// Vignette d'un stand : image, nom, accroche, et le nombre de joueurs.
function standCard(m) {
  return `
    <button class="stand" data-stand="${m.id}" style="--neon:${m.color || '#FF3D8A'}">
      <span class="stand-shot">
        <canvas class="stand-thumb" data-thumb="${m.id}"></canvas>
        <span class="stand-help" aria-hidden="true">❓ règles</span>
      </span>
      <span class="stand-name">${m.emoji} ${esc(m.name)}</span>
      <span class="stand-tag">${esc(m.tagline || '')}</span>
      <span class="stand-meta">${standMeta(m)}</span>
    </button>`;
}

// ── Écran accueil ──────────────────────────────────────────────────────

export function renderHome(el, { profile, prefillCode, manifest = [], onCreate, onJoin, onProfile }) {
  const faces = Array.from({ length: FACE_COUNT }, (_, i) => `
    <button class="face-pick ${i === profile.face ? 'sel' : ''}" data-face="${i}">
      ${avatarSvg(i, PLAYER_COLORS[i % PLAYER_COLORS.length], 44)}
    </button>`).join('');
  el.innerHTML = `
    <div class="home-wrap">
      <div class="marquee">
        <div class="marquee-bulbs" aria-hidden="true">${'<i></i>'.repeat(14)}</div>
        <h1 class="marquee-title">${t('app.name')}</h1>
        <div class="marquee-bulbs" aria-hidden="true">${'<i></i>'.repeat(14)}</div>
      </div>
      <p class="tagline">${t('app.tagline')}</p>
      <div class="card home-card">
        <label class="field-label" for="name-input">${t('home.yourName')}</label>
        <input id="name-input" class="input" maxlength="16" placeholder="${t('home.namePlaceholder')}"
               value="${esc(profile.name || '')}" autocomplete="nickname">
        <div class="field-label">${t('home.pickFace')}</div>
        <div class="face-grid">${faces}</div>
      </div>
      <div class="card home-card home-actions">
        <button class="btn btn-primary btn-big" id="btn-create">🎪 ${t('btn.create')}</button>
        <div class="join-row">
          <input id="code-input" class="input input-code" maxlength="4" placeholder="${t('home.codePlaceholder')}"
                 value="${esc(prefillCode || '')}" autocapitalize="characters" autocomplete="off">
          <button class="btn btn-secondary" id="btn-join">${t('btn.join')}</button>
        </div>
      </div>
      ${manifest.length ? `
      <section class="stands">
        <h3 class="sec-title">${t('home.stands')} <span class="sec-count" data-count>${manifest.length}</span></h3>
        ${pickerBar(manifest, 'home', 'Chercher un stand…')}
        <div class="stand-grid">${manifest.map(standCard).join('')}</div>
        <p class="empty-note" data-empty>Aucun stand sous ce nom. Essaie « cartes », « dés », « mots »…</p>
        <p class="hint">${t('home.standsHint')}</p>
      </section>` : ''}
      <footer class="home-footer">
        <button class="btn-ghost" id="btn-mute">${sfx.isMuted() ? '🔇' : '🔊'}</button>
        <span>fait maison, zéro asset, 100 % WebSocket</span>
      </footer>
    </div>`;

  const nameInput = el.querySelector('#name-input');
  const codeInput = el.querySelector('#code-input');
  const syncProfile = () => onProfile(nameInput.value.trim(), Number(el.querySelector('.face-pick.sel')?.dataset.face || 0));
  nameInput.addEventListener('change', syncProfile);
  el.querySelectorAll('.face-pick').forEach((b) => b.addEventListener('click', () => {
    el.querySelectorAll('.face-pick').forEach((x) => x.classList.remove('sel'));
    b.classList.add('sel');
    sfx.play('click');
    syncProfile();
  }));
  el.querySelector('#btn-create').addEventListener('click', () => { syncProfile(); onCreate(); });
  el.querySelector('#btn-join').addEventListener('click', () => {
    syncProfile();
    const code = codeInput.value.trim().toUpperCase();
    if (code.length >= 4) onJoin(code);
    else codeInput.focus();
  });
  codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.querySelector('#btn-join').click(); });
  el.querySelector('#btn-mute').addEventListener('click', (e) => {
    e.target.textContent = sfx.toggleMute() ? '🔇' : '🔊';
  });
  el.querySelectorAll('[data-stand]').forEach((b) => b.addEventListener('click', () => {
    const meta = manifest.find((m) => m.id === b.dataset.stand);
    if (meta) { sfx.play('click'); openRules(meta); }
  }));
  wirePicker(el, manifest, 'home');
  if (prefillCode) codeInput.focus();
}

// ── Écran lobby ────────────────────────────────────────────────────────

export function renderLobby(el, room, { myPid, manifest, net, onLeave }) {
  // Rien n'a change dans la salle ? On ne touche pas au DOM : pas de
  // clignotement, pas de defilement perdu, pas de vignettes redessinees.
  const sig = JSON.stringify([room, myPid, picker.lobby]);
  if (el.dataset.sig === sig && el.childElementCount) return;
  el.dataset.sig = sig;
  const scroll = el.scrollTop;
  const act = document.activeElement;
  const focusSel = act && el.contains(act) && act.dataset.search
    ? `[data-search="${act.dataset.search}"]` : null;
  const caret = focusSel ? act.selectionStart : 0;

  const isHost = room.hostPid === myPid;
  const me = room.players.find((p) => p.pid === myPid);
  const fmt = room.formats.find((f) => f.id === room.formatId) || null;
  const meta = manifest.find((m) => m.id === room.gameId) || null;
  const showTeams = fmt && fmt.kind !== 'ffa';

  const playerPills = room.players.map((p) => {
    const color = PLAYER_COLORS[p.color % PLAYER_COLORS.length];
    const teamBadge = showTeams && p.team != null && !p.spectator
      ? `<span class="team-badge" style="--tc:${teamColor(p.team)}">${TEAM_SHAPES[p.team % TEAM_SHAPES.length]}</span>` : '';
    const flags = [
      p.pid === room.hostPid ? `<span class="pill-flag" title="${t('lobby.host')}">⭐</span>` : '',
      p.bot ? `<span class="pill-flag">🤖</span>` : '',
      p.spectator ? `<span class="pill-flag">👻</span>` : '',
      !p.connected && !p.bot ? `<span class="pill-flag off">📵</span>` : '',
    ].join('');
    const removeBtn = isHost && p.bot ? `<button class="pill-x" data-removebot="${p.pid}">✕</button>` : '';
    return `<div class="pill ${p.ready ? 'ready' : ''} ${!p.connected && !p.bot ? 'off' : ''}"
                 data-pid="${p.pid}" style="--pc:${color}">
      ${teamBadge}
      <span class="pill-avatar">${avatarSvg(p.face, color, 34)}</span>
      <span class="pill-name">${esc(p.name)}${p.pid === myPid ? ` <em>(${t('lobby.you')})</em>` : ''}</span>
      ${p.bot && p.tag ? `<span class="pill-tag">${esc(p.tag)}</span>` : ''}
      ${flags}${removeBtn}
      ${p.ready && !p.bot ? '<span class="pill-check">✔</span>' : ''}
    </div>`;
  }).join('');

  const gameCards = manifest.map((m) => `
    <div class="game-card ${m.id === room.gameId ? 'sel' : ''}" data-card="${m.id}"
         style="--neon:${m.color || '#FF3D8A'}">
      <button class="game-pick" data-game="${m.id}" ${isHost ? '' : 'disabled'}>
        <canvas class="game-thumb" data-thumb="${m.id}"></canvas>
        <span class="game-title"><span class="game-emoji">${m.emoji}</span><span class="game-name">${esc(m.name)}</span></span>
        <span class="game-pitch">${esc(m.tagline || '')}</span>
        <span class="game-meta">${standMeta(m)}</span>
      </button>
      <button class="game-help" data-help="${m.id}" aria-label="Règles : ${esc(m.name)}">❓</button>
      ${m.id === room.gameId ? '<span class="game-flag">AU PROGRAMME</span>' : ''}
    </div>`).join('');

  const fmtChips = room.formats.map((f) => `
    <button class="chip ${f.id === room.formatId ? 'sel' : ''} ${f.kind === 'asym' ? 'chip-asym' : ''}"
            data-format="${f.id}" ${isHost ? '' : 'disabled'}>${formatLabel(f)}</button>`).join('');

  const settingChips = meta ? Object.entries(meta.settings || {}).map(([key, spec]) => `
    <div class="setting">
      <span class="setting-label">${esc(spec.label)}</span>
      <button class="chip chip-setting" data-setting="${key}" ${isHost ? '' : 'disabled'}>
        ${esc(fmtSettingValue(room.settings[key], spec))}
      </button>
    </div>`).join('') : '';

  const startLabel = room.botsToAdd > 0 ? t('lobby.startBots', { n: room.botsToAdd }) : t('lobby.start');

  el.innerHTML = `
    <div class="lobby-wrap">
      <header class="lobby-head">
        <button class="btn-ghost" id="btn-leave">←</button>
        <div class="ticket" id="ticket" role="button" title="${t('lobby.copy')}">
          <span class="ticket-label">${t('lobby.code')}</span>
          <span class="ticket-code">${esc(room.code)}</span>
          <span class="ticket-copy">🔗</span>
        </div>
        <button class="btn-ghost" id="btn-mute">${sfx.isMuted() ? '🔇' : '🔊'}</button>
      </header>

      <section class="lobby-sec">
        <h3 class="sec-title">${t('lobby.players')} <span class="sec-count">${room.players.length}/8</span></h3>
        <div class="pill-list">${playerPills}</div>
        <div class="lobby-row">
          ${isHost ? `<button class="btn btn-secondary btn-sm" id="btn-addbot">🤖 ${t('lobby.addBot')}</button>` : ''}
          ${isHost && showTeams ? `<button class="btn btn-secondary btn-sm" id="btn-shuffle">${t('lobby.shuffle')}</button>` : ''}
        </div>
        ${isHost && showTeams ? `<p class="hint">${t('lobby.tapTeam')}</p>` : ''}
      </section>

      <section class="lobby-sec">
        <h3 class="sec-title">${t('lobby.game')} <span class="sec-count" data-count>${manifest.length}</span>
          ${meta ? `<button class="btn-ghost btn-rules" id="btn-rules">❓ ${t('lobby.rules')}</button>` : ''}
        </h3>
        ${meta ? `
        <div class="game-current" style="--neon:${meta.color || '#FF3D8A'}">
          <span class="cur-emoji">${meta.emoji}</span>
          <span class="cur-text">
            <span class="cur-name">${esc(meta.name)}</span>
            <span class="cur-tag">${esc(meta.tagline || '')}</span>
          </span>
          <span class="cur-meta">${standMeta(meta)}</span>
        </div>` : ''}
        ${pickerBar(manifest, 'lobby', 'Chercher un jeu…')}
        <div class="game-grid">${gameCards}</div>
        <p class="empty-note" data-empty>Aucun jeu sous ce nom.</p>
      </section>

      <section class="lobby-sec">
        <h3 class="sec-title">${t('lobby.format')}</h3>
        <div class="chip-row">${fmtChips}</div>
      </section>

      <section class="lobby-sec">
        <h3 class="sec-title">${t('lobby.settings')}</h3>
        <div class="chip-row settings-row">
          ${settingChips}
          <div class="setting">
            <span class="setting-label">${t('lobby.botSkill')}</span>
            <button class="chip chip-setting" data-setting="botSkill" ${isHost ? '' : 'disabled'}>
              ${t('lobby.botSkill.' + (room.settings.botSkill || 'normal'))}
            </button>
          </div>
        </div>
      </section>

      <footer class="lobby-cta">
        ${isHost
          ? `<button class="btn btn-primary btn-big" id="btn-start">🎉 ${startLabel}</button>`
          : me && !me.spectator
            ? `<button class="btn ${me.ready ? 'btn-secondary' : 'btn-primary'} btn-big" id="btn-ready">
                 ${me.ready ? '✔ ' + t('lobby.unready') : t('lobby.ready')}</button>
               <p class="hint">${t('lobby.waitHost')}</p>`
            : `<p class="hint">${t('lobby.waitHost')}</p>`}
      </footer>
    </div>`;

  // Événements
  el.querySelector('#btn-leave').addEventListener('click', () => {
    net.send({ t: 'leave' });
    onLeave?.();
  });
  el.querySelector('#ticket').addEventListener('click', async () => {
    const link = `${location.origin}/?r=${room.code}`;
    try {
      if (navigator.share) await navigator.share({ title: t('app.name'), text: t('misc.share', { code: room.code }), url: link });
      else { await navigator.clipboard.writeText(link); toast(t('lobby.copied'), 'ok'); }
    } catch { /* partage annulé */ }
  });
  el.querySelector('#btn-mute').addEventListener('click', (e) => {
    e.target.textContent = sfx.toggleMute() ? '🔇' : '🔊';
  });
  el.querySelector('#btn-addbot')?.addEventListener('click', () => { sfx.play('click'); net.send({ t: 'addBot' }); });
  el.querySelector('#btn-shuffle')?.addEventListener('click', () => { sfx.play('click'); net.send({ t: 'shuffle' }); });
  el.querySelector('#btn-rules')?.addEventListener('click', () => meta && openRules(meta));
  el.querySelector('#btn-start')?.addEventListener('click', () => net.send({ t: 'start' }));
  el.querySelector('#btn-ready')?.addEventListener('click', () => {
    sfx.play('ready');
    net.send({ t: 'ready', on: !me.ready });
  });
  el.querySelectorAll('[data-removebot]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    net.send({ t: 'removeBot', pid: b.dataset.removebot });
  }));
  el.querySelectorAll('[data-game]').forEach((b) => b.addEventListener('click', () => {
    sfx.play('click');
    net.send({ t: 'setGame', gameId: b.dataset.game });
  }));
  el.querySelectorAll('[data-help]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const m = manifest.find((x) => x.id === b.dataset.help);
    if (m) { sfx.play('click'); openRules(m); }
  }));
  el.querySelectorAll('[data-format]').forEach((b) => b.addEventListener('click', () => {
    sfx.play('click');
    net.send({ t: 'setFormat', formatId: b.dataset.format });
  }));
  el.querySelectorAll('[data-setting]').forEach((b) => b.addEventListener('click', () => {
    const key = b.dataset.setting;
    sfx.play('click');
    if (key === 'botSkill') {
      const order = ['facile', 'normal', 'costaud'];
      const next = order[(order.indexOf(room.settings.botSkill || 'normal') + 1) % order.length];
      net.send({ t: 'setSettings', patch: { botSkill: next } });
    } else {
      const spec = meta.settings[key];
      const i = spec.values.indexOf(room.settings[key]);
      net.send({ t: 'setSettings', patch: { [key]: spec.values[(i + 1) % spec.values.length] } });
    }
  }));
  if (isHost && showTeams) {
    el.querySelectorAll('.pill').forEach((pill) => pill.addEventListener('click', () => {
      const p = room.players.find((x) => x.pid === pill.dataset.pid);
      if (p && !p.spectator) { sfx.play('click'); net.send({ t: 'setTeam', pid: p.pid }); }
    }));
  }
  wirePicker(el, manifest, 'lobby');
  // Le lobby se re-rend a chaque message du serveur : on remet l'ecran la
  // ou il etait, sinon choisir un jeu renvoie le joueur en haut de page.
  el.scrollTop = scroll;
  if (focusSel) {
    const again = el.querySelector(focusSel);
    if (again) { again.focus(); try { again.setSelectionRange(caret, caret); } catch { /* pas un champ texte */ } }
  }
}

function fmtSettingValue(v, spec) {
  const i = spec.values.indexOf(v);
  return spec.labels?.[i] ?? String(v);
}

export function teamColor(teamIdx) {
  return ['#FF3D8A', '#29D9FF', '#FFC93C', '#3DFF8A'][teamIdx % 4];
}

// ── Écran résultats ────────────────────────────────────────────────────

export function renderResults(el, over, { myPid, manifest, net }) {
  const meta = manifest.find((m) => m.id === over.gameId);
  const isHost = over.hostPid === myPid;
  const players = over.players || {};
  const medals = ['🥇', '🥈', '🥉'];

  const winners = over.winners || [];
  const winnerNames = winners.map((pid) => players[pid]?.name).filter(Boolean);

  const rows = (over.ranking || []).map((r, i) => {
    const p = players[r.pid] || { name: '?', color: '#888' };
    return `<div class="rank-row ${winners.includes(r.pid) ? 'winner' : ''} ${r.pid === myPid ? 'me' : ''}">
      <span class="rank-pos">${medals[i] || i + 1}</span>
      <span class="rank-avatar">${avatarSvg(p.face ?? 0, p.color, 30)}</span>
      <span class="rank-name">${esc(p.name)}</span>
      <span class="rank-score">${esc(r.label ?? r.score)}</span>
    </div>`;
  }).join('');

  const titleCards = (over.titles || []).map((tt) => {
    const p = players[tt.pid] || { name: '?' };
    return `<div class="lot-card">
      <span class="lot-emoji">${tt.emoji || '🎁'}</span>
      <span class="lot-title">${esc(tt.text)}</span>
      <span class="lot-name" style="color:${p.color || '#F5EFE6'}">${esc(p.name)}</span>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="results-wrap">
      <h1 class="results-title">${t('results.title')}</h1>
      <p class="results-game">${meta ? `${meta.emoji} ${esc(meta.name)}` : ''}</p>
      <div class="results-winner">
        ${winnerNames.length
          ? `<span class="winner-label">${winnerNames.length > 1 ? t('results.winners') : t('results.winner')}</span>
             <span class="winner-names">${esc(winnerNames.join(' · '))}</span>`
          : `<span class="winner-names">${t('results.draw')}</span>`}
      </div>
      <div class="card results-card">${rows}</div>
      ${titleCards ? `<div class="lots-row">${titleCards}</div>` : ''}
      <footer class="results-cta">
        ${isHost
          ? `<button class="btn btn-primary btn-big" id="btn-again">🔁 ${t('results.again')}</button>
             <button class="btn btn-secondary" id="btn-tolobby">🎪 ${t('results.changeGame')}</button>`
          : `<p class="hint">${t('results.waitHost')}</p>`}
      </footer>
    </div>`;

  el.querySelector('#btn-again')?.addEventListener('click', () => net.send({ t: 'again' }));
  el.querySelector('#btn-tolobby')?.addEventListener('click', () => net.send({ t: 'toLobby' }));
}

// ── Emotes (feed en jeu + barre) ───────────────────────────────────────

export function renderEmoteBar(el, net) {
  el.innerHTML = EMOTES.map((e, i) => `<button class="emote-btn" data-e="${i}">${e}</button>`).join('');
  el.querySelectorAll('.emote-btn').forEach((b) => b.addEventListener('click', () => {
    net.send({ t: 'emote', e: Number(b.dataset.e) });
  }));
}

export function showEmote(feedEl, player, emoteIdx) {
  const el = document.createElement('div');
  el.className = 'emote-item';
  el.innerHTML = `${avatarSvg(player?.face ?? 0, player?.color ?? '#888', 26)}<span>${EMOTES[emoteIdx] || '❓'}</span>`;
  feedEl.appendChild(el);
  sfx.play('emote');
  setTimeout(() => el.classList.add('out'), 2200);
  setTimeout(() => el.remove(), 2700);
}
