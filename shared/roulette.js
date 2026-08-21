// Roulette francaise : la table de mises, isomorphe (serveur + navigateur).
// Le cylindre est a un seul zero (roulette europeenne dite « francaise »),
// avec l'ordre reel des cases. Toutes les mises possibles sont enumerees ici
// une fois pour toutes : le serveur valide contre cette table, le client
// dessine et vise contre la meme.

// Ordre reel des cases sur le cylindre, dans le sens des aiguilles.
export const ORDRE = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23,
  10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

export const ROUGES = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const couleur = (n) => (n === 0 ? 'vert' : ROUGES.has(n) ? 'rouge' : 'noir');

// Place d'un numero sur le tapis : 12 transversales de 3 numeros.
export const rangee = (n) => Math.ceil(n / 3);          // 1..12
export const colonne = (n) => ((n - 1) % 3) + 1;        // 1 (bas) .. 3 (haut)

const suite = (a, b, pas = 1) => {
  const out = [];
  for (let i = a; i <= b; i += pas) out.push(i);
  return out;
};

// Rapports officiels (« X pour 1 », la mise etant rendue en plus).
export const RAPPORTS = {
  plein: 35, cheval: 17, transversale: 11, carre: 8, premiers: 8,
  sixain: 5, colonne: 2, douzaine: 2, simple: 1,
};

// ── Toutes les mises possibles ────────────────────────────────────────
// cle canonique -> { kind, ns, pay, nom }
export const MISES = new Map();

function ajoute(cle, kind, ns, nom) {
  MISES.set(cle, { cle, kind, ns, pay: RAPPORTS[kind], nom });
}

// Pleins (0 compris).
for (let n = 0; n <= 36; n++) ajoute(`p:${n}`, 'plein', [n], `PLEIN ${n}`);

// Chevaux : deux numeros voisins sur le tapis, plus les chevaux du zero.
for (let n = 1; n <= 36; n++) {
  if (n % 3 !== 0) ajoute(`c:${n}-${n + 1}`, 'cheval', [n, n + 1], `CHEVAL ${n}/${n + 1}`);
  if (n <= 33) ajoute(`c:${n}-${n + 3}`, 'cheval', [n, n + 3], `CHEVAL ${n}/${n + 3}`);
}
for (const n of [1, 2, 3]) ajoute(`c:0-${n}`, 'cheval', [0, n], `CHEVAL 0/${n}`);

// Transversales pleines : les 12 rangees de 3.
for (let r = 1; r <= 12; r++) {
  const a = r * 3 - 2;
  ajoute(`t:${a}`, 'transversale', [a, a + 1, a + 2], `TRANSVERSALE ${a} à ${a + 2}`);
}

// Carres : quatre numeros en bloc.
for (let a = 1; a <= 32; a++) {
  if (a % 3 === 0) continue;
  ajoute(`q:${a}`, 'carre', [a, a + 1, a + 3, a + 4], `CARRÉ ${a}·${a + 1}·${a + 3}·${a + 4}`);
}

// Sixains : deux rangees voisines.
for (let r = 1; r <= 11; r++) {
  const a = r * 3 - 2;
  ajoute(`s:${a}`, 'sixain', suite(a, a + 5), `SIXAIN ${a} à ${a + 5}`);
}

// Les quatre premiers : la mise a cheval sur le zero et la premiere rangee.
ajoute('pr', 'premiers', [0, 1, 2, 3], 'LES QUATRE PREMIERS');

// Colonnes et douzaines.
for (let c = 1; c <= 3; c++) {
  ajoute(`col:${c}`, 'colonne', suite(c, 34 + (c - 1), 3).filter((n) => n <= 36 && colonne(n) === c),
    ['COLONNE DU BAS', 'COLONNE DU MILIEU', 'COLONNE DU HAUT'][c - 1]);
  ajoute(`dz:${c}`, 'douzaine', suite((c - 1) * 12 + 1, c * 12),
    ['1RE DOUZAINE (1-12)', '2E DOUZAINE (13-24)', '3E DOUZAINE (25-36)'][c - 1]);
}

// Chances simples.
ajoute('rouge', 'simple', [...ROUGES].sort((a, b) => a - b), 'ROUGE');
ajoute('noir', 'simple', suite(1, 36).filter((n) => !ROUGES.has(n)), 'NOIR');
ajoute('pair', 'simple', suite(2, 36, 2), 'PAIR');
ajoute('impair', 'simple', suite(1, 35, 2), 'IMPAIR');
ajoute('manque', 'simple', suite(1, 18), 'MANQUE (1-18)');
ajoute('passe', 'simple', suite(19, 36), 'PASSE (19-36)');

export const CHANCES_SIMPLES = new Set(['rouge', 'noir', 'pair', 'impair', 'manque', 'passe']);

export function mise(cle) {
  return typeof cle === 'string' ? MISES.get(cle) || null : null;
}

// Maximum autorise sur une mise : la regle des tables francaises veut que
// le gain maximal soit le meme partout. Le maximum aux chances simples est
// donc divise par le rapport pour les autres mises.
export function maximum(cle, maxSimple) {
  const m = mise(cle);
  if (!m) return 0;
  return Math.max(1, Math.floor(maxSimple / m.pay));
}

// Les jetons du stand.
export const JETONS = [1, 5, 25, 100];
