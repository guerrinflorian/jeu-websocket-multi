// BOMBER : méta isomorphe (serveur + client). Données pures, JSON-able.

export default {
  id: 'bomber',
  name: 'BOMBER',
  emoji: '💣',
  color: '#FF7A3D',
  tagline: 'Un mot, vite, avant que ça pète.',
  genre: 'mots',
  pitch: 'La bombe du stand tourne autour de la table avec une syllabe collée dessus : TRA, ON, BLE. Celui qui la tient doit taper un mot français qui contient ces lettres, et la refiler au suivant. La mèche brûle sans jamais s\'arrêter : quand ça explose, c\'est celui qui tient la bombe qui perd un cœur. Trois cœurs chacun, dernier debout gagne.',
  minPlayers: 2,
  maxPlayers: 8,
  // Tour par tour ou par phases : le jeu a ses propres chronos, aucun
  // pilote automatique d inactivite (sinon il confisquerait les tours).
  idleBot: false,
  arena: { w: 1000, h: 640 },
  caps: {
    ffa: true,
    teams: { min: 2, max: 4, uneven: true },
    asym: { solo: [1], roles: { solo: 'L\'Artificier', crowd: 'Les Démineurs' } },
  },
  // On tape au clavier (champ de saisie), le reste est décoratif.
  controls: {
    move: 'tap',
    buttons: [],
  },
  settings: {
    coeurs: {
      label: 'Cœurs',
      values: [1, 3, 5],
      labels: ['1 cœur (mort subite)', '3 cœurs', '5 cœurs (marathon)'],
      def: 3,
    },
    niveau: {
      label: 'Syllabes',
      values: ['facile', 'normal', 'costaud'],
      labels: ['Faciles', 'Normales', 'Costaudes'],
      def: 'normal',
    },
  },
  howto: [
    { icon: '💣', text: 'La bombe arrive chez toi avec une syllabe : tape un mot français qui la contient.' },
    { icon: '⌨️', text: 'Mot accepté, la bombe file au suivant avec une nouvelle syllabe. Refusé ? Retente, la mèche brûle.' },
    { icon: '🧨', text: 'La mèche ne s\'arrête jamais entre les joueurs. Celui qui tient la bombe quand ça pète perd un cœur.' },
    { icon: '🔤', text: 'Place toutes les lettres de l\'alphabet dans tes mots et tu regagnes un cœur.' },
    { icon: '🎩', text: 'L\'Artificier (1 contre tous) : un cœur de plus et des syllabes courtes, mais la bombe lui revient sans cesse.' },
  ],
};
