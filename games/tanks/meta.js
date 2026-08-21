// TANKS : méta isomorphe (serveur + client). Données pures, JSON-able.

export default {
  id: 'tanks',
  name: 'TANKS',
  emoji: '🚜',
  color: '#3DFF8A',
  tagline: 'Vise le mur. Le mur fait le reste.',
  genre: 'arcade',
  pitch: 'Des blindés vus du dessus dans une arène à murs. Les obus REBONDISSENT : le tir qui gagne la partie est celui que personne n\'a vu venir. Trois vies, un obus toutes les deux secondes, et une ligne de visée qui te montre où ta bille va rebondir. En équipe, tes obus traversent tes coéquipiers. Trois terrains au choix, plus un tiré au sort.',
  minPlayers: 2,
  maxPlayers: 8,
  arena: { w: 704, h: 576 },
  caps: {
    ffa: true,
    teams: { min: 2, max: 4, uneven: true },
    asym: { solo: [1], roles: { solo: 'Le Char Lourd', crowd: 'La Meute' } },
  },
  controls: {
    move: 'joystick',
    buttons: [{ id: 'fire', label: 'TIRER' }],
  },
  settings: {
    carte: {
      label: 'Terrain',
      values: ['arene', 'labyrinthe', 'bastion', 'hasard'],
      labels: ["L'Arène", 'Le Labyrinthe', 'Le Bastion', 'Tiré au sort'],
      def: 'arene',
    },
    vies: {
      label: 'Vies',
      values: [1, 3, 5],
      labels: ['1 (mort subite)', '3 vies', '5 vies'],
      def: 3,
    },
    duree: {
      label: 'Durée',
      values: [90, 150, 240],
      labels: ['1 min 30', '2 min 30', '4 min'],
      def: 150,
    },
    recharge: {
      label: 'Recharge',
      values: [0.7, 1.1, 1.8],
      labels: ['Mitraille (0,7 s)', 'Nerveuse (1,1 s)', 'Lourde (1,8 s)'],
      def: 1.1,
    },
    rebonds: {
      label: 'Rebonds',
      values: [1, 2, 4],
      labels: ['1 rebond', '2 rebonds', '4 rebonds'],
      def: 1,
    },
  },
  howto: [
    { icon: '🕹️', text: 'Le joystick déplace le char. La tourelle regarde toujours là où tu vas. Au clavier : ZQSD ou les flèches.' },
    { icon: '💥', text: 'TIRER envoie un obus (Espace au clavier). Une recharge entre deux tirs : chaque obus compte.' },
    { icon: '🪞', text: 'Les obus rebondissent sur les murs. La ligne de visée te montre le trajet et les rebonds.' },
    { icon: '❤️', text: 'Trois vies, en haut à droite. Trois obus reçus et tu quittes le terrain.' },
    { icon: '🤝', text: 'En équipe, tes obus traversent tes coéquipiers. Mais ton propre obus qui a rebondi peut te revenir dessus.' },
  ],
};
