// BLACKJACK : méta isomorphe (serveur + client). Données pures, JSON-able.

export default {
  id: 'blackjack',
  name: 'BLACKJACK',
  emoji: '🃏',
  color: '#B14BFF',
  tagline: 'Vise 21. Pas plus. La banque te regarde.',
  pitch: 'Le 21 du tripot forain : chacun sa main contre le croupier, tout le monde décide EN MÊME TEMPS. Tire, reste, double. Blackjack payé 3 pour 2. Et en 1 contre tous, un joueur devient la banque et empoche vos larmes.',
  minPlayers: 2,
  maxPlayers: 8,
  arena: { w: 900, h: 620 },
  caps: {
    ffa: true,
    teams: { min: 2, max: 4, uneven: true },
    asym: { solo: [1], roles: { solo: 'Le Croupier', crowd: 'Les Flambeurs' } },
  },
  controls: {
    move: 'tap',
    buttons: [
      { id: 'hit', label: 'TIRER' },
      { id: 'stand', label: 'RESTER' },
      { id: 'double', label: '×2' },
    ],
  },
  settings: {
    hands: { label: 'Mains', values: [3, 5, 8], def: 5 },
  },
  howto: [
    { icon: '🃏', text: 'Approche-toi de 21 sans le dépasser. Figures = 10, As = 1 ou 11.' },
    { icon: '⚡', text: 'Tout le monde joue EN MÊME TEMPS : TIRER, RESTER, ou ×2 (double la mise, une seule carte).' },
    { icon: '🏦', text: 'La banque tire jusqu\'à 17. Bats-la : mise doublée. Blackjack : payé 3 pour 2.' },
    { icon: '🪙', text: 'Mise de 10 jetons par main, 100 au départ. Ruiné ? Le forain te prête (et s\'en souvient).' },
    { icon: '🎩', text: 'Le Croupier (1 contre tous) : TU es la banque. Leurs pertes remplissent ta caisse.' },
  ],
};
