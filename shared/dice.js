// Yams : catégories et calcul des scores. Isomorphe (serveur + client,
// le client s'en sert pour prévisualiser les points d'une combinaison).

export const CATS = {
  un: { label: 'Les 1', short: '1️⃣', upper: 1 },
  deux: { label: 'Les 2', short: '2️⃣', upper: 2 },
  trois: { label: 'Les 3', short: '3️⃣', upper: 3 },
  quatre: { label: 'Les 4', short: '4️⃣', upper: 4 },
  cinq: { label: 'Les 5', short: '5️⃣', upper: 5 },
  six: { label: 'Les 6', short: '6️⃣', upper: 6 },
  brelan: { label: 'Brelan', short: '🎲×3' },
  full: { label: 'Full', short: '🏠' },
  carre: { label: 'Carré', short: '🎲×4' },
  suite: { label: 'Suite', short: '📶' },
  yams: { label: 'YAMS', short: '⭐' },
  chance: { label: 'Chance', short: '🍀' },
};

export const SHEET_EXPRESS = ['brelan', 'full', 'carre', 'suite', 'yams', 'chance'];
export const SHEET_FULL = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', ...SHEET_EXPRESS];

export const UPPER_BONUS = 35;   // si la section haute atteint 63
export const UPPER_TARGET = 63;

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
      if (counts[has3] >= 5) return 25;
      return counts.some((c, v) => c >= 2 && v !== has3 && v > 0) ? 25 : 0;
    }
    case 'suite': {
      let run = 0, best = 0;
      for (let v = 1; v <= 6; v++) {
        run = counts[v] > 0 ? run + 1 : 0;
        best = Math.max(best, run);
      }
      return best >= 5 ? 40 : best >= 4 ? 30 : 0;
    }
    case 'yams': return maxCount >= 5 ? 50 : 0;
    case 'chance': return sum;
    default: return 0;
  }
}

// Total d'une feuille (bonus de section haute compris).
export function sheetTotal(sheet, catList) {
  let total = 0, upper = 0;
  for (const [cat, sc] of Object.entries(sheet)) {
    total += sc;
    if (CATS[cat]?.upper) upper += sc;
  }
  const hasUpper = catList.some((c) => CATS[c]?.upper);
  if (hasUpper && upper >= UPPER_TARGET) total += UPPER_BONUS;
  return total;
}
