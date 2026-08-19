// BARRIÈRES : méta isomorphe (serveur + client). Données pures, JSON-able.

export default {
  id: 'barrieres',
  name: 'BARRIÈRES',
  emoji: '🚧',
  color: '#FF4757',
  tagline: 'Avance. Ou mure-les vivants.',
  pitch: 'Deux camps face à face, en bas et en haut. À ton tour : avance d\'une case, ou pose une barrière pour faire faire le grand tour à l\'ennemi. Interdit d\'emmurer complètement : il reste TOUJOURS un passage. Le premier pion qui touche la base adverse gagne.',
  minPlayers: 2,
  maxPlayers: 8,
  arena: { w: 900, h: 640 },
  caps: {
    ffa: true,
    teams: { min: 2, max: 2, uneven: true },
    asym: { solo: [1, 2, 3], roles: { solo: 'Le Contremaître', crowd: 'Les Ouvriers' } },
  },
  controls: {
    move: 'tap',
    buttons: [{ id: 'wallmode', label: '🚧 BARRIÈRE' }],
  },
  settings: {
    rounds: { label: 'Manches', values: [1, 3], def: 1 },
  },
  howto: [
    { icon: '🎯', text: 'Ton but : atteindre la ligne de base ADVERSE avec ton pion.' },
    { icon: '👣', text: 'À ton tour : avance d\'1 case (pas de diagonale). Saute par-dessus un pion collé à toi.' },
    { icon: '🚧', text: 'Ou pose une barrière (15 max par joueur) : touche le bouton, puis une rainure, retouche pour valider.' },
    { icon: '🛡️', text: 'Impossible d\'emmurer quelqu\'un : le stand refuse toute barrière qui coupe le dernier passage.' },
    { icon: '⛑️', text: 'Le Contremaître (1 contre tous) : 2 actions par tour. Ça pose vite, ça avance vite.' },
  ],
};
