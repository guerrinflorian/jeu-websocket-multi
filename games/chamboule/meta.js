// CHAMBOULE : méta isomorphe (serveur + client). Données pures, JSON-able.

export default {
  id: 'chamboule',
  name: 'CHAMBOULE',
  emoji: '🥫',
  color: '#3DFF8A',
  tagline: 'Vise en secret. Boum général.',
  genre: 'adresse',
  pitch: 'Billard humain au-dessus du vide : chacun choisit en secret sa direction et sa puissance (10 s max), puis tout le monde part EN MÊME TEMPS. Ça carambole, ça propulse, ça tombe.',
  minPlayers: 2,
  maxPlayers: 8,
  // Tour par tour ou par phases : le jeu a ses propres chronos, aucun
  // pilote automatique d inactivite (sinon il confisquerait les tours).
  idleBot: false,
  arena: { w: 640, h: 640 },
  caps: {
    ffa: true,
    teams: { min: 2, max: 4, uneven: true },
    asym: { solo: [1], roles: { solo: 'Le Quilleur', crowd: 'Les Quilles' } },
  },
  controls: {
    move: 'tap',
    buttons: [],
  },
  settings: {
    rounds: { label: 'Manches', values: [3, 5, 7], def: 5 },
  },
  howto: [
    { icon: '🎯', text: 'GLISSE ton doigt (de n’importe où) : direction + longueur = puissance.' },
    { icon: '⏱️', text: '10 secondes pour choisir. Personne ne voit ta visée, juste que tu es prêt.' },
    { icon: '💥', text: 'Tout le monde part EN MÊME TEMPS. Les chocs propulsent selon la vitesse.' },
    { icon: '🕳️', text: 'Hors de la plateforme = le vide. Elle rétrécit à chaque salve !' },
    { icon: '🎳', text: 'Le Quilleur (1 contre tous) : lourd, surpuissant, 2 vies. Strike ou ridicule.' },
  ],
};
