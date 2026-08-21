// MENTEUR : méta isomorphe (serveur + client). Données pures, JSON-able.

export default {
  id: 'menteur',
  name: 'MENTEUR',
  emoji: '🤥',
  color: '#FF6B9D',
  tagline: 'Bluffe, compte, et ne cligne pas.',
  genre: 'des',
  pitch: 'Le bluff aux dés du bistrot forain : cinq dés chacun, cachés sous ton gobelet. On enchérit sur ce que cache TOUTE la table (« quatre 3 ! »), les 1 comptent comme des jokers. Tu penses qu\'il exagère ? MENTEUR ! On lève les gobelets, on compte, et le perdant jette un dé. Plus de dés, plus de joueur.',
  minPlayers: 2,
  maxPlayers: 8,
  // Tour par tour ou par phases : le jeu a ses propres chronos, aucun
  // pilote automatique d inactivite (sinon il confisquerait les tours).
  idleBot: false,
  arena: { w: 1000, h: 640 },
  caps: {
    ffa: true,
    teams: { min: 2, max: 4, uneven: true },
    asym: { solo: [1], roles: { solo: 'Le Tricheur', crowd: 'Les Honnêtes' } },
  },
  // Tout se joue au doigt sur le tapis (enchère, MENTEUR, PILE).
  controls: {
    move: 'tap',
    buttons: [],
  },
  settings: {
    des: {
      label: 'Dés',
      values: [3, 5],
      labels: ['3 dés (rapide)', '5 dés (classique)'],
      def: 5,
    },
    rythme: {
      label: 'Rythme',
      values: [10, 15, 22],
      labels: ['Rapide', 'Normal', 'Tranquille'],
      def: 15,
    },
  },
  howto: [
    { icon: '🥤', text: 'Cinq dés sous ton gobelet, connus de toi seul. Tout le monde relance à chaque manche.' },
    { icon: '📣', text: 'À ton tour, enchéris sur TOUTE la table : « quatre 3 » = au moins quatre 3 sous les gobelets.' },
    { icon: '🃏', text: 'Les 1 sont des JOKERS : ils comptent comme n\'importe quelle valeur. On n\'enchérit jamais sur les 1.' },
    { icon: '🤥', text: 'Tu ne le crois pas ? MENTEUR ! On lève tout et on compte. Celui qui a tort perd un dé.' },
    { icon: '🎯', text: 'PILE ! : tu paries que le compte est EXACT. Gagné, tu récupères un dé. Perdu, tu en jettes un.' },
  ],
};
