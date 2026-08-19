// Les forains de la Kermesse : noms, personnalités, esprits de bots.
// Personnalité : aggro (goût du contact), skill (précision), chaos (erreurs
// volontaires), pace (multiplicateur du rythme de réflexion, 1 = normal).

import { makeRng } from '../shared/const.js';

export const BOT_ROSTER = [
  { name: 'Jacky Churros',    face: 2,  tag: 'Vend des churros depuis 1987',  p: { aggro: 0.75, skill: 0.60, chaos: 0.30, pace: 1.0 } },
  { name: 'Mamie Pétard',     face: 7,  tag: 'Ne la sous-estimez pas',        p: { aggro: 0.95, skill: 0.70, chaos: 0.25, pace: 0.9 } },
  { name: 'Kéké Barbapapa',   face: 4,  tag: 'Colle aux doigts',              p: { aggro: 0.40, skill: 0.45, chaos: 0.55, pace: 1.2 } },
  { name: 'Gégé Tirelire',    face: 9,  tag: 'Compte chaque jeton',           p: { aggro: 0.30, skill: 0.70, chaos: 0.15, pace: 1.0 } },
  { name: 'Josiane Turbo',    face: 1,  tag: 'Scooter débridé',               p: { aggro: 0.80, skill: 0.55, chaos: 0.40, pace: 0.7 } },
  { name: 'Bernard Bretzel',  face: 6,  tag: 'Prudent mais salé',             p: { aggro: 0.25, skill: 0.65, chaos: 0.20, pace: 1.1 } },
  { name: 'Cindy Paillettes', face: 3,  tag: 'Brille plus que toi',           p: { aggro: 0.60, skill: 0.60, chaos: 0.35, pace: 0.9 } },
  { name: 'Marcel Mollo',     face: 10, tag: 'Arrive… doucement',             p: { aggro: 0.35, skill: 0.50, chaos: 0.30, pace: 1.5 } },
  { name: 'Paulette Piranha', face: 8,  tag: 'Souriante. Dangereuse.',        p: { aggro: 0.90, skill: 0.75, chaos: 0.20, pace: 0.85 } },
  { name: 'Dédé Ventouse',    face: 5,  tag: 'Impossible à décrocher',        p: { aggro: 0.70, skill: 0.55, chaos: 0.30, pace: 1.0 } },
  { name: 'Samir Chamboule',  face: 0,  tag: 'Vise très bien. Parfois.',      p: { aggro: 0.65, skill: 0.80, chaos: 0.45, pace: 1.0 } },
  { name: 'Monique Nitro',    face: 11, tag: 'Interdite de karting',          p: { aggro: 0.85, skill: 0.50, chaos: 0.50, pace: 0.75 } },
  { name: 'Francis Flipper',  face: 4,  tag: 'TILT',                          p: { aggro: 0.55, skill: 0.40, chaos: 0.70, pace: 1.1 } },
  { name: 'Nadège Vertige',   face: 1,  tag: 'Adore la grande roue',          p: { aggro: 0.45, skill: 0.60, chaos: 0.40, pace: 1.0 } },
  { name: 'Roger Pompon',     face: 6,  tag: 'Attrape tout ce qui passe',     p: { aggro: 0.50, skill: 0.65, chaos: 0.25, pace: 1.0 } },
  { name: 'Brigitte Piston',  face: 9,  tag: 'Connaît le proprio',            p: { aggro: 0.60, skill: 0.70, chaos: 0.20, pace: 0.95 } },
];

const SKILL_BY_DIFF = { facile: 0.55, normal: 0.8, costaud: 1.05 };

// Choisit un forain pas encore présent dans la room.
export function pickBot(usedNames, rng) {
  const free = BOT_ROSTER.filter((b) => !usedNames.has(b.name));
  return rng.pick(free.length ? free : BOT_ROSTER);
}

// Esprit persistant d'un bot pour une partie : personnalité modulée par la
// difficulté + RNG dédié + mémoire libre pour le jeu.
export function makeBotMind(bot, difficulty, seed) {
  const mult = SKILL_BY_DIFF[difficulty] ?? SKILL_BY_DIFF.normal;
  return {
    p: { ...bot.p, skill: Math.min(1, bot.p.skill * mult) },
    rng: makeRng(seed),
    mem: {},
  };
}

// Esprit neutre pour l'autopilote (joueur déconnecté ou AFK).
export function makeAutopilotMind(seed) {
  return {
    p: { aggro: 0.5, skill: 0.5, chaos: 0.3, pace: 1.0 },
    rng: makeRng(seed),
    mem: {},
  };
}
