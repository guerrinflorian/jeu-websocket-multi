// PETITS CHEVAUX : méta isomorphe (serveur + client). Données pures, JSON-able.

export default {
  id: 'chevaux',
  name: 'PETITS CHEVAUX',
  emoji: '🐴',
  color: '#FF9F43',
  tagline: 'Un 6 pour sortir, zéro pitié sur la piste.',
  pitch: 'Les petits chevaux de la Kermesse : sors tes chevaux avec un 6, fais le tour de la piste lumineuse, capture tout ce qui traîne et monte ton échelle vers le centre. Le premier camp qui rentre tous ses chevaux gagne (et le droit de parader).',
  minPlayers: 2,
  maxPlayers: 8,
  // Tour par tour ou par phases : le jeu a ses propres chronos, aucun
  // pilote automatique d inactivite (sinon il confisquerait les tours).
  idleBot: false,
  arena: { w: 800, h: 800 },
  caps: {
    ffa: true,
    teams: { min: 2, max: 4, uneven: true },
    asym: { solo: [1], roles: { solo: 'Le Jockey', crowd: 'L\'Écurie' } },
  },
  controls: {
    move: 'tap',
    buttons: [
      { id: 'roll', label: '🎲 LANCER' },
      { id: 'keep', label: '✅ GARDER' },
      { id: 'reroll', label: '🔁 RELANCER' },
    ],
  },
  settings: {
    chevaux: { label: 'Chevaux', values: [2, 3, 4], labels: ['2 chevaux (rapide)', '3 chevaux', '4 chevaux (classique)'], def: 2 },
  },
  howto: [
    { icon: '🎲', text: 'À ton tour : LANCE le dé. Un 6 sort un cheval de l\'écurie et fait REJOUER (2 fois max).' },
    { icon: '🐴', text: 'Touche un cheval surligné pour le jouer. Atterrir sur un ennemi le CAPTURE : retour à l\'écurie !' },
    { icon: '🪜', text: 'Après un tour complet, ton cheval monte son échelle vers le centre. Tous arrivés : victoire !' },
    { icon: '⏱️', text: '10 s par tour, sinon le stand joue le meilleur coup pour toi. En équipe, on alterne les tours.' },
    { icon: '🏇', text: 'Le Jockey (1 contre tous) : il peut relancer son dé une fois par tour. L\'avantage du métier.' },
  ],
};
