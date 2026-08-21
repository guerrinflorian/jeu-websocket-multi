// TANKS : les terrains, isomorphes (serveur + navigateur). Une grille de
// 11 x 9 cases de 64 unites : 704 x 576. « # » un mur, « . » du sol.
// Le serveur simule dessus, le client dessine exactement la meme chose.

export const CASE = 64;
export const COLS = 11;
export const LIGNES = 9;
export const MONDE_W = COLS * CASE;
export const MONDE_H = LIGNES * CASE;

export const CARTES = [
  {
    id: 'arene',
    nom: "L'ARÈNE",
    pitch: 'Grande ouverte, quelques piliers. Duels francs.',
    grille: [
      '###########',
      '#.........#',
      '#..#...#..#',
      '#.........#',
      '#..#.#.#..#',
      '#.........#',
      '#..#...#..#',
      '#.........#',
      '###########',
    ],
    departs: [[1, 1], [9, 7], [9, 1], [1, 7], [5, 1], [5, 7], [1, 4], [9, 4]],
  },
  {
    id: 'labyrinthe',
    nom: 'LE LABYRINTHE',
    pitch: 'Des couloirs partout : le rebond est roi.',
    grille: [
      '###########',
      '#....#....#',
      '#.##.#.##.#',
      '#.#.....#.#',
      '#...#.#...#',
      '#.#.....#.#',
      '#.##.#.##.#',
      '#....#....#',
      '###########',
    ],
    departs: [[1, 1], [9, 7], [9, 1], [1, 7], [3, 3], [7, 5], [7, 3], [3, 5]],
  },
  {
    id: 'bastion',
    nom: 'LE BASTION',
    pitch: 'Une cour centrale, quatre portes, un anneau autour.',
    grille: [
      '###########',
      '#.........#',
      '#.###.###.#',
      '#.#.....#.#',
      '#...#.#...#',
      '#.#.....#.#',
      '#.###.###.#',
      '#.........#',
      '###########',
    ],
    departs: [[1, 1], [9, 7], [9, 1], [1, 7], [5, 4], [3, 3], [7, 5], [5, 1]],
  },
];

export const carte = (id) => CARTES.find((c) => c.id === id) || CARTES[0];

// Terrain tire au sort, symetrique (donc equitable), toujours praticable.
export function carteHasard(rng) {
  for (let essai = 0; essai < 40; essai++) {
    const g = [];
    for (let y = 0; y < LIGNES; y++) {
      const ligne = [];
      for (let x = 0; x < COLS; x++) {
        const bord = x === 0 || y === 0 || x === COLS - 1 || y === LIGNES - 1;
        ligne.push(bord ? '#' : '.');
      }
      g.push(ligne);
    }
    // On perce des murs sur une moitie, on recopie en miroir.
    const demi = Math.floor(COLS / 2);
    for (let y = 2; y < LIGNES - 2; y++) {
      for (let x = 1; x <= demi; x++) {
        if (rng.chance(0.24)) {
          g[y][x] = '#';
          g[y][COLS - 1 - x] = '#';
        }
      }
    }
    // Les coins de depart restent degages.
    for (const [cx, cy] of [[1, 1], [9, 1], [1, 7], [9, 7], [5, 4]]) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const x = cx + dx, y = cy + dy;
          if (x > 0 && y > 0 && x < COLS - 1 && y < LIGNES - 1) g[y][x] = '.';
        }
      }
    }
    const grille = g.map((l) => l.join(''));
    if (connexe(grille)) {
      return {
        id: 'hasard', nom: 'TERRAIN TIRÉ AU SORT',
        pitch: 'Un plan different a chaque partie.',
        grille,
        departs: [[1, 1], [9, 7], [9, 1], [1, 7], [5, 4], [5, 1], [5, 7], [1, 4]],
      };
    }
  }
  return CARTES[0];
}

// Toutes les cases de sol communiquent-elles ?
export function connexe(grille) {
  const sol = [];
  for (let y = 0; y < grille.length; y++) {
    for (let x = 0; x < grille[y].length; x++) if (grille[y][x] !== '#') sol.push([x, y]);
  }
  if (!sol.length) return false;
  const vus = new Set([`${sol[0][0]},${sol[0][1]}`]);
  const file = [sol[0]];
  while (file.length) {
    const [x, y] = file.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      const cle = `${nx},${ny}`;
      if (vus.has(cle)) continue;
      if (ny < 0 || ny >= grille.length || nx < 0 || nx >= grille[ny].length) continue;
      if (grille[ny][nx] === '#') continue;
      vus.add(cle);
      file.push([nx, ny]);
    }
  }
  return vus.size === sol.length;
}

export const estMur = (grille, cx, cy) => (
  cy < 0 || cy >= LIGNES || cx < 0 || cx >= COLS || grille[cy][cx] === '#'
);
