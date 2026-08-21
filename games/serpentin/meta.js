// SERPENTIN : méta isomorphe (serveur + client). Données pures, JSON-able.

export default {
  id: 'serpentin',
  name: 'SERPENTIN',
  emoji: '🎗️',
  color: '#29D9FF',
  tagline: 'Trace, coupe, survis.',
  genre: 'arcade',
  pitch: 'Trace ton serpentin lumineux et coupe la route des autres. Les traînées de tes coéquipiers sont des portes pour toi, et des murs pour eux.',
  minPlayers: 2,
  maxPlayers: 8,
  // Temps reel : un joueur inactif est remplace par un forain apres 20 s.
  idleBot: true,
  arena: { w: 1000, h: 620 },
  caps: {
    ffa: true,
    teams: { min: 2, max: 4, uneven: true },
    asym: { solo: [1], roles: { solo: "L'Anguille", crowd: 'Les Chasseurs' } },
  },
  controls: {
    move: 'steer',
    buttons: [{ id: 'boost', label: 'BOOST' }],
  },
  settings: {
    rounds: { label: 'Manches', values: [3, 5, 7], def: 5 },
  },
  howto: [
    { icon: '🌀', text: 'Tu avances tout seul. Tourne avec ◀ ▶ (moitiés de l’écran) ou les flèches.' },
    { icon: '💥', text: 'Mur, traînée ennemie… ou la tienne = ÉLIMINÉ.' },
    { icon: '🤝', text: 'Les traînées de tes coéquipiers sont traversables. Tissez des pièges !' },
    { icon: '🚀', text: 'BOOST (espace) pour percer un encerclement. Recharge 4,5 s.' },
    { icon: '🐍', text: 'L’Anguille (1 contre tous) : plus rapide, traînée fugace : survis 40 s.' },
  ],
};
