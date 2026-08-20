// HUIT AMÉRICAIN : méta isomorphe (serveur + client). Données pures, JSON-able.

export default {
  id: 'huit',
  name: 'HUIT AMÉRICAIN',
  emoji: '🎴',
  color: '#FF7A3D',
  tagline: 'Pose, cumule les 7, crie CARTE SEULE.',
  pitch: 'Le crazy eights, ancêtre de toutes les batailles de famille : pose une carte de la même couleur ou du même rang, dégaine un 8 pour changer la couleur, empile les 7 pour faire piocher le voisin, et surtout : quand il ne te reste qu\'UNE carte, annonce-la. Sinon la table te dénonce et tu repioches.',
  minPlayers: 2,
  maxPlayers: 8,
  // Tour par tour ou par phases : le jeu a ses propres chronos, aucun
  // pilote automatique d inactivite (sinon il confisquerait les tours).
  idleBot: false,
  arena: { w: 1000, h: 660 },
  caps: {
    ffa: true,
    teams: { min: 2, max: 4, uneven: true },
    asym: { solo: [1], roles: { solo: 'Le Requin', crowd: 'Les Pigeons' } },
  },
  // Tout se joue au doigt : ta main, la pioche, les pastilles de couleur.
  controls: {
    move: 'tap',
    buttons: [],
  },
  settings: {
    manches: {
      label: 'Manches',
      values: [1, 3, 5],
      labels: ['1 manche (rapide)', '3 manches', '5 manches'],
      def: 3,
    },
  },
  howto: [
    { icon: '🎴', text: 'Pose une carte de la même COULEUR ou du même RANG que celle du dessus. Sinon, PIOCHE.' },
    { icon: '8️⃣', text: 'Le 8 se pose sur tout et TU choisis la couleur demandée. L\'arme fatale.' },
    { icon: '7️⃣', text: 'Le 7 fait piocher 2 cartes au suivant. Il a un 7 ? Il le pose et ça monte : 4, 6, 8…' },
    { icon: '🔔', text: 'Plus qu\'UNE carte ? Annonce CARTE SEULE en 4 s, sinon on te dénonce et tu prends 2 cartes.' },
    { icon: '🦈', text: 'As = change de sens, Roi = saute le suivant. Le Requin (1 contre tous) part avec 2 cartes de moins.' },
  ],
};
