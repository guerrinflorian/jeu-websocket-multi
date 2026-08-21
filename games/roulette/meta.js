// ROULETTE : méta isomorphe (serveur + client). Données pures, JSON-able.

export default {
  id: 'roulette',
  name: 'ROULETTE',
  emoji: '🎰',
  color: '#FF4757',
  tagline: 'Faites vos jeux. Rien ne va plus.',
  genre: 'casino',
  pitch: 'La vraie roulette française, à un seul zéro : pleins, chevaux, transversales, carrés, sixains, colonnes, douzaines, rouge, noir, pair, impair, manque, passe. Tu poses tes jetons où tu veux et autant que tu veux, dans la limite du maximum de la table. Douze secondes pour miser, le cylindre part avant la fin, « rien ne va plus », la bille tombe. Bouton REJOUER pour remettre exactement les mêmes mises que le tour d\'avant. En 1 contre tous, un joueur tient la banque et a le poignet qui tremble.',
  minPlayers: 2,
  maxPlayers: 8,
  // Jeu par phases avec ses propres chronos : pas de pilote automatique.
  idleBot: false,
  arena: { w: 1000, h: 700 },
  caps: {
    ffa: true,
    teams: { min: 2, max: 4, uneven: true },
    asym: { solo: [1], roles: { solo: 'Le Chef de Table', crowd: 'Les Joueurs' } },
  },
  // Tout se joue au doigt sur le tapis.
  controls: {
    move: 'tap',
    buttons: [],
  },
  settings: {
    tours: {
      label: 'Tours',
      values: [5, 10, 20, 40],
      labels: ['5 (éclair)', '10 tours', '20 tours', '40 (soirée)'],
      def: 10,
    },
    tapis: {
      label: 'Tapis',
      values: [200, 500, 2000],
      labels: ['200 jetons', '500 jetons', '2000 jetons'],
      def: 500,
    },
    max: {
      label: 'Maximum',
      values: [100, 350, 1000],
      labels: ['Petite table (100)', 'Table normale (350)', 'Grande table (1000)'],
      def: 350,
    },
    zero: {
      label: 'Le zéro',
      values: ['partage', 'prison', 'perdu'],
      labels: ['Le partage (moitié rendue)', 'En prison (rejouée)', 'Tout perdu'],
      def: 'partage',
    },
    rythme: {
      label: 'Rythme',
      values: [8, 12, 20],
      labels: ['Nerveux (8 s)', 'Normal (12 s)', 'Tranquille (20 s)'],
      def: 12,
    },
  },
  howto: [
    { icon: '🪙', text: 'Choisis un jeton (1, 5, 25, 100) puis pose-le sur le tapis. Autant de mises que tu veux.' },
    { icon: '🎯', text: 'Sur un numéro : PLEIN, payé 35. Sur une ligne entre deux cases : CHEVAL, payé 17. Sur un coin : CARRÉ, payé 8.' },
    { icon: '🔴', text: 'Rouge, noir, pair, impair, manque, passe : payés 1 pour 1. Douzaines et colonnes : 2 pour 1.' },
    { icon: '⏱️', text: '12 secondes pour miser. Le cylindre part avant la fin, puis RIEN NE VA PLUS et la bille tombe.' },
    { icon: '🔁', text: 'REJOUER remet exactement les mises du tour d\'avant. ×2 les double, ANNULER retire le dernier jeton.' },
  ],
};
