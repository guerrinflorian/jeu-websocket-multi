// Moteur de formats d'équipes : brique partagée (serveur + client).
// Aucun format n'est codé en dur dans les jeux : chaque jeu déclare ses
// capacités (caps) dans meta.js, ce module génère les formats valides.
//
// caps = {
//   ffa: true,
//   teams: { min: 2, max: 4, uneven: true },
//   asym: { solo: [1, 2], roles: { solo: 'Le Taureau', crowd: 'Le Troupeau' } },
// }
//
// Un format : { id, kind: 'ffa'|'teams'|'asym', sizes: [n…]|null, roles? }
// Convention : sizes trié décroissant, sauf asym où sizes = [solo, foule].

export function computeFormats(caps, n) {
  const out = [];
  if (caps.ffa && n >= 2) {
    out.push({ id: 'ffa', kind: 'ffa', sizes: null });
  }
  if (caps.teams && n >= 4) {
    // 2 équipes : toutes les partitions [grosse, petite] avec petite ≥ 2.
    const maxSmall = Math.floor(n / 2);
    for (let small = maxSmall; small >= 2; small--) {
      const big = n - small;
      if (big !== small && !caps.teams.uneven) continue;
      out.push(mkTeams([big, small]));
    }
    // 3-4 équipes : partitions équilibrées (écart ≤ 1), chaque équipe ≥ 2.
    const maxK = Math.min(caps.teams.max ?? 4, 4, Math.floor(n / 2));
    for (let k = Math.max(3, caps.teams.min ?? 2); k <= maxK; k++) {
      const base = Math.floor(n / k);
      const rem = n % k;
      if (base < 2) continue;
      if (rem !== 0 && !caps.teams.uneven) continue;
      const sizes = [];
      for (let i = 0; i < k; i++) sizes.push(i < rem ? base + 1 : base);
      out.push(mkTeams(sizes));
    }
  }
  if (caps.asym) {
    for (const s of caps.asym.solo) {
      const crowd = n - s;
      if (crowd < 2 || crowd <= s) continue;
      out.push({
        id: `asym-${s}-${crowd}`,
        kind: 'asym',
        sizes: [s, crowd],
        roles: caps.asym.roles,
      });
    }
  }
  return out;
}

function mkTeams(sizes) {
  return { id: `t-${sizes.join('-')}`, kind: 'teams', sizes };
}

export function findFormat(caps, n, formatId) {
  return computeFormats(caps, n).find((f) => f.id === formatId) || null;
}

// Répartit les joueurs (pids) dans les équipes du format.
// Retourne un tableau d'équipes : [[pid…], …]. En FFA : une équipe par joueur.
// En asym : l'équipe 0 est le rôle solo.
export function assignTeams(format, pids, rng) {
  const pool = [...pids];
  if (rng) rng.shuffle(pool);
  if (!format || format.kind === 'ffa') return pool.map((p) => [p]);
  const teams = format.sizes.map(() => []);
  let i = 0;
  format.sizes.forEach((size, t) => {
    for (let k = 0; k < size; k++) teams[t].push(pool[i++]);
  });
  return teams;
}

// Index d'équipe d'un joueur dans un tableau d'équipes (-1 si absent).
export function teamOf(teams, pid) {
  for (let t = 0; t < teams.length; t++) if (teams[t].includes(pid)) return t;
  return -1;
}
