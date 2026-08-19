// Avatars génératifs : un jeton rond coloré + un visage SVG parmi 12.
// Zéro asset : tout est dessiné ici.

const FACES = [
  // [yeux, bouche] — petits chemins SVG centrés dans un viewBox 100×100.
  { eyes: 'dots', mouth: 'smile' },
  { eyes: 'happy', mouth: 'open' },
  { eyes: 'wink', mouth: 'tongue' },
  { eyes: 'stars', mouth: 'smile' },
  { eyes: 'sleepy', mouth: 'flat' },
  { eyes: 'angry', mouth: 'grr' },
  { eyes: 'dots', mouth: 'o' },
  { eyes: 'glasses', mouth: 'smile' },
  { eyes: 'angry', mouth: 'open' },
  { eyes: 'happy', mouth: 'money' },
  { eyes: 'sleepy', mouth: 'o' },
  { eyes: 'wink', mouth: 'smile' },
];

const EYES = {
  dots: '<circle cx="35" cy="42" r="6" fill="#140A26"/><circle cx="65" cy="42" r="6" fill="#140A26"/>',
  happy: '<path d="M27 44 Q35 34 43 44" stroke="#140A26" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M57 44 Q65 34 73 44" stroke="#140A26" stroke-width="6" fill="none" stroke-linecap="round"/>',
  wink: '<circle cx="35" cy="42" r="6" fill="#140A26"/><path d="M57 42 L73 42" stroke="#140A26" stroke-width="6" stroke-linecap="round"/>',
  stars: '<text x="35" y="50" font-size="24" text-anchor="middle" fill="#140A26">★</text><text x="65" y="50" font-size="24" text-anchor="middle" fill="#140A26">★</text>',
  sleepy: '<path d="M27 42 Q35 48 43 42" stroke="#140A26" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M57 42 Q65 48 73 42" stroke="#140A26" stroke-width="6" fill="none" stroke-linecap="round"/>',
  angry: '<path d="M26 34 L44 42" stroke="#140A26" stroke-width="6" stroke-linecap="round"/><path d="M74 34 L56 42" stroke="#140A26" stroke-width="6" stroke-linecap="round"/><circle cx="35" cy="48" r="5" fill="#140A26"/><circle cx="65" cy="48" r="5" fill="#140A26"/>',
  glasses: '<circle cx="35" cy="42" r="11" fill="none" stroke="#140A26" stroke-width="5"/><circle cx="65" cy="42" r="11" fill="none" stroke="#140A26" stroke-width="5"/><path d="M46 42 L54 42" stroke="#140A26" stroke-width="5"/><circle cx="35" cy="42" r="4" fill="#140A26"/><circle cx="65" cy="42" r="4" fill="#140A26"/>',
};

const MOUTHS = {
  smile: '<path d="M35 62 Q50 76 65 62" stroke="#140A26" stroke-width="6" fill="none" stroke-linecap="round"/>',
  open: '<ellipse cx="50" cy="68" rx="11" ry="13" fill="#140A26"/>',
  tongue: '<path d="M35 62 Q50 76 65 62" stroke="#140A26" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M50 69 Q56 80 62 69" fill="#FF3D8A"/>',
  flat: '<path d="M38 66 L62 66" stroke="#140A26" stroke-width="6" stroke-linecap="round"/>',
  grr: '<path d="M36 68 L44 62 L52 68 L60 62 L66 68" stroke="#140A26" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  o: '<circle cx="50" cy="66" r="8" fill="#140A26"/>',
  money: '<text x="50" y="76" font-size="26" text-anchor="middle" fill="#140A26" font-weight="bold">$</text>',
};

export const FACE_COUNT = FACES.length;

export function avatarSvg(faceIdx, color, size = 48) {
  const f = FACES[((faceIdx % FACES.length) + FACES.length) % FACES.length];
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="46" fill="${color}"/>
    <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(20,10,38,.35)" stroke-width="5"/>
    ${EYES[f.eyes]}${MOUTHS[f.mouth]}
  </svg>`;
}
