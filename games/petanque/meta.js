// PÉTANQUE : méta isomorphe (serveur + client). Données pures, JSON-able.

export default {
  id: 'petanque',
  name: 'PÉTANQUE',
  emoji: '🥌',
  color: '#63D6C4',
  tagline: 'Pointe, tire, et gare à Fanny.',
  pitch: 'Le boulodrome du champ de foire, sous les lampions : lance tes boules au plus près du cochonnet, ou dégomme celles des autres d\'un tir sec. À la fin de la mène, chaque boule mieux placée que la meilleure boule adverse rapporte un point. Le carreau fait lever la foule, la Fanny fait rire tout le monde.',
  minPlayers: 2,
  maxPlayers: 8,
  // Tour par tour ou par phases : le jeu a ses propres chronos, aucun
  // pilote automatique d inactivite (sinon il confisquerait les tours).
  idleBot: false,
  arena: { w: 560, h: 900 },
  geo: {
    field: [30, 40, 530, 860],   // terrain jouable [x0, y0, x1, y1]
    circle: [280, 810, 26],      // cercle de lancer [x, y, r]
    ballR: 13,
    jackR: 6.5,
  },
  caps: {
    ffa: true,
    teams: { min: 2, max: 4, uneven: true },
    asym: { solo: [1], roles: { solo: 'Le Tireur', crowd: 'Les Pointeurs' } },
  },
  controls: {
    move: 'tap',
    buttons: [{ id: 'throw', label: '🥌 LANCER' }],
  },
  settings: {
    menes: { label: 'Mènes', values: [2, 4, 6], labels: ['2 mènes', '4 mènes', '6 mènes'], def: 4 },
  },
  howto: [
    { icon: '👆', text: 'À ton tour : GLISSE pour viser (direction + longueur = puissance), relâche pour lancer.' },
    { icon: '🎯', text: 'Approche ta boule au plus près du cochonnet jaune. Ou dégomme la boule adverse qui tient le point !' },
    { icon: '📏', text: 'Fin de mène : 1 point par boule MIEUX placée que la meilleure boule adverse.' },
    { icon: '🔁', text: 'Le camp qui n\'a PAS le point rejoue. Garde des boules pour la fin, c\'est là que tout se joue.' },
    { icon: '💪', text: 'Le Tireur (1 contre tous) : 4 boules et un bras de mule contre la meute des Pointeurs.' },
  ],
};
