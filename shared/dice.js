// Yams : catégories et calcul des scores. Isomorphe (serveur + client,
// le client s'en sert pour prévisualiser les points d'une combinaison).
// Feuille complète (13 lignes, le vrai Yam's) : section haute 1 à 6 avec
// bonus +35 à partir de 63 points, puis brelan, carré, full, petite suite,
// grande suite, YAMS et chance.

export const CATS = {
  un: { label: 'Les 1', short: '1', upper: 1, hint: 'somme des 1' },
  deux: { label: 'Les 2', short: '2', upper: 2, hint: 'somme des 2' },
  trois: { label: 'Les 3', short: '3', upper: 3, hint: 'somme des 3' },
  quatre: { label: 'Les 4', short: '4', upper: 4, hint: 'somme des 4' },
  cinq: { label: 'Les 5', short: '5', upper: 5, hint: 'somme des 5' },
  six: { label: 'Les 6', short: '6', upper: 6, hint: 'somme des 6' },
  brelan: { label: 'Brelan', short: '×3', hint: '3 pareils : somme' },
  carre: { label: 'Carré', short: '×4', hint: '4 pareils : somme' },
  full: { label: 'Full', short: '3+2', hint: '25 pts' },
  psuite: { label: 'Petite suite', short: '4↗', hint: '4 qui se suivent : 30' },
  gsuite: { label: 'Grande suite', short: '5↗', hint: '5 qui se suivent : 40' },
  yams: { label: 'YAMS', short: '★', hint: '5 pareils : 50' },
  chance: { label: 'Chance', short: '?', hint: 'somme des 5 dés' },
};

export const SHEET_EXPRESS = ['brelan', 'full', 'carre', 'psuite', 'gsuite', 'yams', 'chance'];
export const SHEET_FULL = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', ...SHEET_EXPRESS];

export const UPPER_BONUS = 35;   // si la section haute atteint 63
export const UPPER_TARGET = 63;

// Longueur de la meilleure suite de valeurs consécutives présentes.
function bestRun(counts) {
  let run = 0, best = 0;
  for (let v = 1; v <= 6; v++) {
    run = counts[v] > 0 ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

export function scoreCat(cat, dice) {
  const sum = dice.reduce((a, b) => a + b, 0);
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dice) counts[d]++;
  const maxCount = Math.max(...counts);
  const spec = CATS[cat];
  if (!spec) return 0;
  if (spec.upper) return counts[spec.upper] * spec.upper;
  switch (cat) {
    case 'brelan': return maxCount >= 3 ? sum : 0;
    case 'carre': return maxCount >= 4 ? sum : 0;
    case 'full': {
      const has3 = counts.findIndex((c) => c >= 3);
      if (has3 < 0) return 0;
      if (counts[has3] >= 5) return 25; // un yams compte comme un full
      return counts.some((c, v) => c >= 2 && v !== has3 && v > 0) ? 25 : 0;
    }
    case 'psuite': return bestRun(counts) >= 4 ? 30 : 0;
    case 'gsuite': return bestRun(counts) >= 5 ? 40 : 0;
    case 'yams': return maxCount >= 5 ? 50 : 0;
    case 'chance': return sum;
    default: return 0;
  }
}

// Somme de la section haute d'une feuille (pour la jauge de bonus).
export function upperTotal(sheet) {
  let upper = 0;
  for (const [cat, sc] of Object.entries(sheet)) {
    if (CATS[cat]?.upper) upper += sc;
  }
  return upper;
}

// Total d'une feuille (bonus de section haute compris).
export function sheetTotal(sheet, catList) {
  let total = 0;
  for (const sc of Object.values(sheet)) total += sc;
  const hasUpper = catList.some((c) => CATS[c]?.upper);
  if (hasUpper && upperTotal(sheet) >= UPPER_TARGET) total += UPPER_BONUS;
  return total;
}
