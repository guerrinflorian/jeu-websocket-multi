// BLACKJACK : méta isomorphe (serveur + client). Données pures, JSON-able.

export default {
  id: 'blackjack',
  name: 'BLACKJACK',
  emoji: '🃏',
  color: '#B14BFF',
  tagline: 'Mise ce que tu veux. Tire, double, splitte.',
  genre: 'casino',
  pitch: 'Le vrai 21, table complète : tu mises le montant que TU veux, tu joues ta main contre le croupier, et tout le monde décide EN MÊME TEMPS. Tirer, rester, doubler, SPLITTER jusqu\'à 4 mains, s\'assurer contre l\'as, abandonner à temps. Blackjack payé 3 pour 2, sabot de 6 jeux, règles de la maison réglables. En 1 contre tous, un joueur devient la banque.',
  minPlayers: 2,
  maxPlayers: 8,
  // Tour par tour ou par phases : le jeu a ses propres chronos, aucun
  // pilote automatique d inactivite (sinon il confisquerait les tours).
  idleBot: false,
  arena: { w: 1000, h: 640 },
  caps: {
    ffa: true,
    teams: { min: 2, max: 4, uneven: true },
    asym: { solo: [1], roles: { solo: 'Le Croupier', crowd: 'Les Flambeurs' } },
  },
  // Tout se joue au doigt sur la table (mise libre, actions, choix des mains).
  controls: {
    move: 'tap',
    buttons: [],
  },
  settings: {
    hands: {
      label: 'Mains',
      values: [3, 8, 15, 30],
      labels: ['3 (rapide)', '8 mains', '15 mains', '30 (soirée)'],
      def: 8,
    },
    chips: {
      label: 'Tapis',
      values: [100, 500, 2000],
      labels: ['100 jetons', '500 jetons', '2000 jetons'],
      def: 500,
    },
    decks: {
      label: 'Sabot',
      values: [1, 2, 6],
      labels: ['1 jeu (comptable)', '2 jeux', '6 jeux (casino)'],
      def: 6,
    },
    soft17: {
      label: 'Banque',
      values: ['s17', 'h17'],
      labels: ['Reste à 17', 'Tire le 17 souple'],
      def: 's17',
    },
    payout: {
      label: 'Blackjack',
      values: ['3:2', '6:5'],
      labels: ['Payé 3 pour 2', 'Payé 6 pour 5'],
      def: '3:2',
    },
    surrender: {
      label: 'Abandon',
      values: ['on', 'off'],
      labels: ['Autorisé', 'Interdit'],
      def: 'on',
    },
    speed: {
      label: 'Rythme',
      values: [12, 18, 30],
      labels: ['Rapide', 'Normal', 'Tranquille'],
      def: 18,
    },
  },
  howto: [
    { icon: '🪙', text: 'MISE LIBRE : touche les jetons, glisse la réglette, ou TAPIS pour tout miser. Puis PRÊT.' },
    { icon: '🃏', text: 'Approche 21 sans dépasser. Figures = 10, As = 1 ou 11. Blackjack (21 en 2 cartes) payé 3 pour 2.' },
    { icon: '⚡', text: 'Tout le monde joue EN MÊME TEMPS : TIRER, RESTER, DOUBLER (une seule carte), ABANDON (moitié rendue).' },
    { icon: '✂️', text: 'Une PAIRE ? SPLIT : jusqu\'à 4 mains, chacune sa mise. Les As splittés reçoivent une seule carte.' },
    { icon: '🎩', text: 'La banque tire jusqu\'à 17. Le Croupier (1 contre tous) : TU es la banque, dès 14 tu fais ta loi.' },
  ],
};
