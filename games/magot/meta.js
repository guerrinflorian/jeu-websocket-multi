// MAGOT — méta isomorphe (serveur + client). Données pures, JSON-able.

export default {
  id: 'magot',
  name: 'MAGOT',
  emoji: '💰',
  color: '#FFC93C',
  tagline: 'Ramasse. Porte. Trahis.',
  pitch: 'Un tas de jetons au centre, ta caisse au coin. Plus tu portes, plus tu es lent — et tout le monde a le droit de te tacler.',
  minPlayers: 2,
  maxPlayers: 8,
  arena: { w: 900, h: 560 },
  caps: {
    ffa: true,
    teams: { min: 2, max: 4, uneven: true },
    asym: { solo: [1], roles: { solo: 'Le Dragon', crowd: 'Les Pillards' } },
  },
  controls: {
    move: 'joystick',
    buttons: [{ id: 'tackle', label: 'TACLE' }],
  },
  settings: {
    duration: { label: 'Durée', values: [120, 150, 180], labels: ['2:00', '2:30', '3:00'], def: 150 },
  },
  howto: [
    { icon: '🪙', text: 'Le tas central est FINI. Ramasse vite — chaque jeton porté te RALENTIT.' },
    { icon: '🏦', text: 'Dépose à ta caisse pour sécuriser. TACLE un porteur : il lâche tout !' },
    { icon: '🌧️', text: 'Des PLUIES D’OR tombent dans des zones annoncées. Ruée générale. ★ = 5.' },
    { icon: '✨', text: '20 dernières secondes : HEURE DORÉE, les dépôts comptent ×2.' },
    { icon: '🐉', text: 'Siphonne les caisses ennemies. Le Dragon (1 vs tous) garde son trésor.' },
  ],
};
