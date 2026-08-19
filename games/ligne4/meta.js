// LIGNE 4 : méta isomorphe (serveur + client). Données pures, JSON-able.

export default {
  id: 'ligne4',
  name: 'LIGNE 4',
  emoji: '🔴',
  color: '#FF3D8A',
  tagline: 'Aligne 4 jetons. Bouche leurs trous.',
  pitch: 'Le puissance 4 de la fête foraine : chacun son tour, lâche un jeton dans la grille lumineuse. 4 alignés = manche gagnée. La grille grandit avec le nombre de camps, et en équipe les coéquipiers alternent : un cerveau à plusieurs têtes.',
  minPlayers: 2,
  maxPlayers: 8,
  arena: { w: 900, h: 640 },
  caps: {
    ffa: true,
    teams: { min: 2, max: 4, uneven: true },
    asym: { solo: [1], roles: { solo: 'Le Cerveau', crowd: 'La Commission' } },
  },
  controls: {
    move: 'tap',
    buttons: [],
  },
  settings: {
    rounds: { label: 'Manches', values: [1, 3, 5], def: 3 },
  },
  howto: [
    { icon: '🔴', text: 'À ton tour, TOUCHE une colonne : ton jeton tombe au plus bas.' },
    { icon: '4️⃣', text: '4 jetons de ton camp alignés (ligne, colonne, diagonale) = manche gagnée.' },
    { icon: '⏱️', text: '10 secondes par tour, sinon la grille joue pour toi.' },
    { icon: '👥', text: 'En équipe, vous jouez la même couleur à tour de rôle. Concertez-vous !' },
    { icon: '🧠', text: 'Le Cerveau (1 contre tous) : seul contre une Commission qui doit se coordonner.' },
  ],
};
