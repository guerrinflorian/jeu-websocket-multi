// CANARDS : méta isomorphe (serveur + client). Données pures, JSON-able.

export default {
  id: 'canards',
  name: 'CANARDS',
  emoji: '🦆',
  color: '#FFE45E',
  tagline: 'Pêche-les. Planque leur prix. Splash les voleurs.',
  pitch: 'La pêche aux canards, version guerre des épuisettes : les canards défilent dans le courant, leur valeur est CACHÉE sous le ventre. Pêche, découvre en secret, ramène au comptoir… ou rejette les minables. Un SPLASH bien placé fait tout lâcher aux autres.',
  minPlayers: 2,
  maxPlayers: 8,
  arena: { w: 900, h: 600 },
  caps: {
    ffa: true,
    teams: { min: 2, max: 4, uneven: true },
    asym: { solo: [1], roles: { solo: 'Le Héron', crowd: 'Les Pêcheurs' } },
  },
  controls: {
    move: 'joystick',
    buttons: [
      { id: 'dip', label: 'PLONGER' },
      { id: 'splash', label: '💦 SPLASH' },
    ],
  },
  settings: {
    duration: { label: 'Durée', values: [90, 120, 150], labels: ['1:30', '2:00', '2:30'], def: 120 },
  },
  howto: [
    { icon: '🎣', text: 'PLONGE ton épuisette sur un canard : sa valeur (cachée) n\'apparaît que pour TOI.' },
    { icon: '🛖', text: 'Ramène-le à TON comptoir pour encaisser. Un canard nul ? RE-PLONGE pour le rejeter.' },
    { icon: '💦', text: 'SPLASH : les porteurs proches lâchent leur canard, valeur révélée à tous. Cruel.' },
    { icon: '⭐', text: 'Le canard DORÉ vaut 10. Quand il apparaît, c\'est l\'émeute. Gare aux 💣 !' },
    { icon: '🦩', text: 'Le Héron (1 contre tous) : il GOBE sur place, pas besoin de comptoir. Les canards le fuient.' },
  ],
};
