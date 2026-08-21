// NAVALE : méta isomorphe (serveur + client). Données pures, JSON-able.

export default {
  id: 'navale',
  name: 'BATAILLE NAVALE',
  emoji: '🚢',
  color: '#29D9FF',
  tagline: 'Touché. Coulé. En même temps.',
  genre: 'plateau',
  pitch: 'La bataille navale du bassin forain : chacun arme son tir en secret, et tout part EN MÊME TEMPS. Zéro attente, que des klaxons. Touché, coulé, flotte anéantie : dernier camp à flot rafle la mise. En 1 contre tous, l\'Amiral aligne une armada géante et tire en rafale.',
  minPlayers: 2,
  maxPlayers: 8,
  // Tour par tour ou par phases : le jeu a ses propres chronos, aucun
  // pilote automatique d inactivite (sinon il confisquerait les tours).
  idleBot: false,
  arena: { w: 960, h: 600 },
  caps: {
    ffa: true,
    teams: { min: 2, max: 4, uneven: true },
    asym: { solo: [1], roles: { solo: 'L\'Amiral', crowd: 'La Flottille' } },
  },
  controls: {
    move: 'tap',
    buttons: [{ id: 'shuffle', label: '🔀 MÉLANGER' }],
  },
  settings: {
    flotte: { label: 'Flotte', values: ['courte', 'complete'], labels: ['Escadre (3 navires)', 'Armada (4 navires)'], def: 'complete' },
  },
  howto: [
    { icon: '🚢', text: 'Chaque camp cache une flotte sur sa grille. Pendant le placement, MÉLANGER la repositionne.' },
    { icon: '🎯', text: 'Salves SIMULTANÉES : touche une grille ennemie puis une case pour armer ton tir. Tout part au signal.' },
    { icon: '💥', text: 'Touché, coulé, manqué : tout est annoncé. Flotte entièrement coulée = camp éliminé.' },
    { icon: '🤝', text: 'En équipe : une grille commune, mais CHAQUE coéquipier tire une case par salve.' },
    { icon: '⚓', text: 'L\'Amiral (1 contre tous) : grille géante, flotte double, et plusieurs tirs par salve.' },
  ],
};
