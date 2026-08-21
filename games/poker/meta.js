// POKER : méta isomorphe (serveur + client). Données pures, JSON-able.

export default {
  id: 'poker',
  name: 'POKER',
  emoji: '♠️',
  color: '#2FA95F',
  tagline: 'Texas Hold\'em. Les uns contre les autres.',
  genre: 'cartes',
  pitch: 'Le vrai Texas Hold\'em du tripot forain : deux cartes fermées, cinq cartes communes, quatre tours d\'enchères. Ici on ne joue pas contre la banque, on joue contre les autres. Suivre, relancer, coucher, TAPIS. Le bluff coûte cher et rapporte gros. En 1 contre tous, Le Requin a le tapis double et un coup d\'oeil dans ton jeu.',
  minPlayers: 2,
  maxPlayers: 8,
  // Tour par tour ou par phases : le jeu a ses propres chronos, aucun
  // pilote automatique d inactivite (sinon il confisquerait les tours).
  idleBot: false,
  arena: { w: 1000, h: 700 },
  caps: {
    ffa: true,
    teams: { min: 2, max: 4, uneven: true },
    asym: { solo: [1], roles: { solo: 'Le Requin', crowd: 'Les Pigeons' } },
  },
  // Tout se joue au doigt sur le tapis (actions, réglette de relance).
  controls: {
    move: 'tap',
    buttons: [],
  },
  settings: {
    mains: {
      label: 'Mains',
      values: [4, 10, 20],
      labels: ['4 (rapide)', '10 mains', '20 (soirée)'],
      def: 10,
    },
    tapis: {
      label: 'Tapis',
      values: [200, 1000, 5000],
      labels: ['200 jetons', '1000 jetons', '5000 jetons'],
      def: 1000,
    },
    rythme: {
      label: 'Rythme',
      values: [12, 20, 30],
      labels: ['Rapide', 'Normal', 'Tranquille'],
      def: 20,
    },
  },
  howto: [
    { icon: '🂠', text: 'Deux cartes rien qu\'à toi, cinq cartes communes au centre. La meilleure main de 5 cartes gagne le pot.' },
    { icon: '💰', text: 'Quatre tours d\'enchères : CHECKER, SUIVRE, RELANCER (montant libre) ou SE COUCHER.' },
    { icon: '🔥', text: 'TAPIS : tu mises tout. Si tu es à tapis pour moins, un pot secondaire se crée : tu ne peux gagner que ta part.' },
    { icon: '🎭', text: 'Personne ne voit tes cartes avant l\'abattage. Le bluff est autorisé, et fortement conseillé.' },
    { icon: '🙈', text: 'CACHER retourne tes cartes face contre table : pratique à plusieurs autour du même écran. Maintiens le bouton pour jeter un oeil, ou appuie sur H.' },
    { icon: '🦈', text: 'Le Requin (1 contre tous) : tapis double, et un coup d\'oeil par main dans le jeu d\'un adversaire (annoncé à tous).' },
  ],
};
