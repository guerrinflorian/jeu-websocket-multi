// Cartes et dés : données pures, isomorphes (serveur + client).
// Un jeu de 52 cartes français : couleurs ♠♥♦♣, rangs A 2-10 V D R.
// Une carte voyage sur le réseau sous forme d'entier : id = s * 13 + (r - 1).

export const SUITS = ['♠', '♥', '♦', '♣'];
export const SUIT_NAMES = ['pique', 'cœur', 'carreau', 'trèfle'];
export const RANK_LABELS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'V', 'D', 'R'];

export const isRed = (s) => s === 1 || s === 2;

export const cardId = (s, r) => s * 13 + (r - 1);
export const cardOf = (id) => ({ s: Math.floor(id / 13) % 4, r: (id % 13) + 1 });

// Un sabot de nDecks jeux de 52, non mélangé (utiliser rng.shuffle).
export function makeShoe(nDecks = 1) {
  const shoe = [];
  for (let d = 0; d < nDecks; d++) {
    for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) shoe.push(cardId(s, r));
  }
  return shoe;
}

// Total blackjack d'une main (ids) : les as valent 1 ou 11, figures 10.
export function handTotal(ids) {
  let total = 0, aces = 0;
  for (const id of ids) {
    const r = (id % 13) + 1;
    if (r === 1) { aces++; total += 1; } else total += Math.min(r, 10);
  }
  let soft = false;
  if (aces > 0 && total + 10 <= 21) { total += 10; soft = true; }
  return { total, soft };
}

// ── 7 Familles : les stands de la Kermesse ─────────────────────────────
// Une carte famille : id = fam * 6 + mem (fam 0-6, mem 0-5).

export const FAMILIES = [
  { name: 'Barbe à Papa', emoji: '🍬', color: '#FF3D8A' },
  { name: 'Churros', emoji: '🥐', color: '#FFC93C' },
  { name: 'Grande Roue', emoji: '🎡', color: '#29D9FF' },
  { name: 'Train Fantôme', emoji: '👻', color: '#B14BFF' },
  { name: 'Chamboule-Tout', emoji: '🥫', color: '#3DFF8A' },
  { name: 'Tamponneuses', emoji: '🚗', color: '#FF7A3D' },
  { name: 'Canards', emoji: '🦆', color: '#4D7CFF' },
];

export const MEMBERS = [
  { name: 'Papi', emoji: '👴' },
  { name: 'Mamie', emoji: '👵' },
  { name: 'Papa', emoji: '👨' },
  { name: 'Maman', emoji: '👩' },
  { name: 'Fiston', emoji: '👦' },
  { name: 'Fillette', emoji: '👧' },
];

export const famId = (fam, mem) => fam * 6 + mem;
export const famOf = (id) => ({ fam: Math.floor(id / 6), mem: id % 6 });

export function makeFamilyDeck() {
  const deck = [];
  for (let f = 0; f < FAMILIES.length; f++) for (let m = 0; m < 6; m++) deck.push(famId(f, m));
  return deck;
}
