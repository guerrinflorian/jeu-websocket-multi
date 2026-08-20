// YAMS : méta isomorphe (serveur + client). Données pures, JSON-able.

export default {
  id: 'yams',
  name: 'YAMS',
  emoji: '🎲',
  color: '#4D7CFF',
  tagline: 'Cinq dés, trois lancers, zéro pitié.',
  pitch: 'Le vrai Yam\'s, feuille complète : section haute avec bonus, brelan, carré, full, suites, et le YAMS qui fait hurler la table. Tout le monde lance EN MÊME TEMPS : garde tes dés, relance le reste, case ton score au bon endroit. Tu vois les dés des autres trembler en direct.',
  minPlayers: 2,
  maxPlayers: 8,
  // Tour par tour ou par phases : le jeu a ses propres chronos, aucun
  // pilote automatique d inactivite (sinon il confisquerait les tours).
  idleBot: false,
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
    sheet: { label: 'Feuille', values: ['express', 'complet'], labels: ['Express (7 tours)', 'Complète (13 tours)'], def: 'complet' },
  },
  howto: [
    { icon: '🎲', text: 'Chaque tour : 3 lancers max. TOUCHE un dé pour le garder, LANCER pour relancer le reste.' },
    { icon: '📋', text: 'Puis case ton résultat dans une ligne LIBRE de ta feuille. Une ligne = une seule fois.' },
    { icon: '🎯', text: 'Section haute (les 1 à 6) : 63 points ou plus = BONUS +35. Vise-le tôt.' },
    { icon: '⚡', text: 'Tout le monde joue EN MÊME TEMPS (25 s). Les dés des autres tremblent en direct.' },
    { icon: '⭐', text: 'YAMS (5 identiques) = 50 points. Le Flambeur (1 contre tous) a 4 lancers au lieu de 3.' },
  ],
};
