// YAMS : méta isomorphe (serveur + client). Données pures, JSON-able.

export default {
  id: 'yams',
  name: 'YAMS',
  emoji: '🎲',
  color: '#4D7CFF',
  tagline: 'Cinq dés, trois lancers, zéro pitié.',
  pitch: 'Le yams de comptoir, mais tout le monde lance EN MÊME TEMPS : garde tes dés, relance le reste, case ton score au bon endroit. Tu vois les dés des autres trembler en direct. Brelan, full, carré, suite, et le YAMS qui fait hurler la table.',
  minPlayers: 2,
  maxPlayers: 8,
  arena: { w: 900, h: 640 },
  caps: {
    ffa: true,
    teams: { min: 2, max: 4, uneven: true },
    asym: { solo: [1], roles: { solo: 'Le Flambeur', crowd: 'La Tablée' } },
  },
  controls: {
    move: 'tap',
    buttons: [{ id: 'roll', label: '🎲 LANCER' }],
  },
  settings: {
    sheet: { label: 'Feuille', values: ['express', 'complet'], labels: ['Express (6 tours)', 'Complète (12 tours)'], def: 'express' },
  },
  howto: [
    { icon: '🎲', text: 'Chaque tour : 3 lancers max. TOUCHE un dé pour le garder, LANCER pour relancer le reste.' },
    { icon: '📋', text: 'Puis case ton résultat dans une ligne LIBRE de ta feuille. Une ligne = une fois.' },
    { icon: '⚡', text: 'Tout le monde joue EN MÊME TEMPS (25 s). Les dés des autres tremblent en direct.' },
    { icon: '⭐', text: 'YAMS (5 identiques) = 50 points et une standing ovation.' },
    { icon: '🎩', text: 'Le Flambeur (1 contre tous) : 4 lancers au lieu de 3. La chance se travaille.' },
  ],
};
