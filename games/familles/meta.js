// 7 FAMILLES : méta isomorphe (serveur + client). Données pures, JSON-able.

export default {
  id: 'familles',
  name: '7 FAMILLES',
  emoji: '👪',
  color: '#F0EEE6',
  tagline: 'Dans la famille Churros, je demande… le Papi.',
  pitch: 'Le jeu des 7 familles, version stands de la Kermesse : Barbe à Papa, Churros, Train Fantôme… Demande la bonne carte à la bonne personne, retiens qui cache quoi, et complète plus de familles que les autres. Bonne pioche !',
  minPlayers: 2,
  maxPlayers: 8,
  arena: { w: 900, h: 640 },
  caps: {
    ffa: true,
    teams: { min: 2, max: 4, uneven: true },
    asym: { solo: [1], roles: { solo: 'Le Collectionneur', crowd: 'La Ribambelle' } },
  },
  controls: {
    move: 'tap',
    buttons: [],
  },
  settings: {
    turnTime: { label: 'Réflexion', values: [10, 15], labels: ['10 s', '15 s'], def: 10 },
  },
  howto: [
    { icon: '🗣️', text: 'À ton tour : choisis une famille de TA main, un membre qui te manque, et un joueur.' },
    { icon: '🎁', text: 'Il a la carte ? Il te la donne et tu REJOUES. Sinon : pioche !' },
    { icon: '🍀', text: 'Bonne pioche (tu tires exactement la carte demandée) : tu rejoues aussi.' },
    { icon: '🧠', text: 'Toutes les demandes sont PUBLIQUES. Retiens qui cherche quoi, qui a reçu quoi.' },
    { icon: '🏆', text: '6 membres réunis = famille posée. Le plus de familles à la fin gagne.' },
  ],
};
