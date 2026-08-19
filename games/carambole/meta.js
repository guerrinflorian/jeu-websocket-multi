// CARAMBOLE — méta isomorphe (serveur + client). Données pures, JSON-able.

export default {
  id: 'carambole',
  name: 'CARAMBOLE',
  emoji: '🎪',
  color: '#FF7A3D',
  tagline: 'Éjecte tout le monde de la piste.',
  pitch: 'Des auto-tamponneuses sur une piste qui rétrécit. Percute, éjecte, survis — et méfie-toi des bonus qui tombent du ciel.',
  minPlayers: 2,
  maxPlayers: 8,
  arena: { w: 640, h: 640 },
  caps: {
    ffa: true,
    teams: { min: 2, max: 4, uneven: true },
    asym: { solo: [1], roles: { solo: 'Le Taureau', crowd: 'Le Troupeau' } },
  },
  controls: {
    move: 'joystick',
    buttons: [{ id: 'dash', label: 'DASH' }],
  },
  settings: {
    rounds: { label: 'Manches', values: [3, 5, 7], def: 5 },
  },
  howto: [
    { icon: '🕹️', text: 'Joystick pour rouler, DASH (espace) pour le coup de bélier.' },
    { icon: '🌀', text: 'La piste rétrécit. Tombé = éliminé.' },
    { icon: '🎁', text: 'Bonus : 🐘 masse ×2 · 🧲 aspire les ennemis · 🥊 dash surpuissant.' },
    { icon: '🐂', text: 'Le Taureau (1 contre tous) : énorme, 3 vies. Faites-le basculer ensemble !' },
  ],
};
