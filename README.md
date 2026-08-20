# 🎪 LA KERMESSE

**La fête foraine multijoueur dans ton navigateur.** 1 à 8 joueurs, en équipes
libres (FFA, 1v1, 2v2, 4v4, 3v5, 1 contre tous…), des bots forains pour combler
les places, jouable au doigt sur téléphone comme au clavier. Un seul process
Node, zéro base de données, zéro asset sous licence (cartes, dés et boules
dessinés au Canvas).

**Les stands (13) :**

| Jeu | Genre | Le twist |
|---|---|---|
| 🎗️ **SERPENTIN** | Curve fever / Tron | Les traînées de tes coéquipiers sont traversables. Asym : « L'Anguille » |
| 🎪 **CARAMBOLE** | Sumo × auto-tamponneuses | Bonus forains (enclume, aimant, gant doré). Asym : « Le Taureau » |
| 💰 **MAGOT** | Butin & tacles (original) | Plus tu portes, plus tu es lent. Tacle = tout tombe. Asym : « Le Dragon » |
| 🥫 **CHAMBOULE** | Billard humain (original) | Visée SECRÈTE simultanée (10 s), envol général, plateforme qui rétrécit. Asym : « Le Quilleur » |
| 🔴 **LIGNE 4** | Puissance 4 | La grille grandit avec les camps ; en équipe on joue la même couleur en alternance. Asym : « Le Cerveau » |
| 🃏 **BLACKJACK** | Le vrai 21 | Mise LIBRE, SPLIT (4 mains), double, abandon, assurance, sabot 6 jeux, décisions SIMULTANÉES. Asym : « Le Croupier » (tu es la banque) |
| 🎲 **YAMS** | Le vrai Yam's | Feuille complète 13 lignes, bonus 63/+35, et tout le monde lance EN MÊME TEMPS. Asym : « Le Flambeur » (4 lancers) |
| 🚧 **BARRIÈRES** | Course & murs (original) | Camp bas vs camp haut, 15 barrières chacun, passage TOUJOURS garanti (BFS). Asym : « Le Contremaître » (2 actions) |
| 🐴 **PETITS CHEVAUX** | Ludo / petits chevaux | Piste circulaire qui s'adapte à 2-8 camps, un 6 pour sortir, captures cruelles. Asym : « Le Jockey » (relance son dé) |
| 🥌 **PÉTANQUE** | Pointer & tirer | Physique de boules, carreaux, mesure au cochonnet, vraie règle du point. Asym : « Le Tireur » (bras de mule) |
| 🚢 **BATAILLE NAVALE** | Touché-coulé | Salves SIMULTANÉES : tout le monde arme son tir, tout explose en même temps. Asym : « L'Amiral » (armada géante) |
| 🤥 **MENTEUR** | Bluff aux dés (Perudo) | Cinq dés cachés, on enchérit sur toute la table, les 1 sont jokers. MENTEUR ! ou PILE ! Asym : « Le Tricheur » |
| 🎴 **HUIT AMÉRICAIN** | L'ancêtre d'UNO | 8 joker, 7 qui fait piocher (cumulable), As demi-tour, Roi qui saute. Et le « CARTE SEULE ! » à ne pas oublier. Asym : « Le Requin » |

## Lancer en local

```bash
npm install
npm run dev        # → http://localhost:3000
```

C'est tout. Ouvre plusieurs onglets pour simuler plusieurs joueurs
(ou partage ton IP locale à tes potes sur le même Wi-Fi).

```bash
npm test                     # harnais : 8 clients WS réels jouent chaque jeu
node test/browser.smoke.js   # smoke test navigateur (Playwright, optionnel)
```

## Déployer sur Render (gratuit) : pas à pas

1. **Pousse ce repo sur GitHub** (ou GitLab) :
   ```bash
   git remote add origin https://github.com/<toi>/la-kermesse.git
   git push -u origin main
   ```
2. Va sur [dashboard.render.com](https://dashboard.render.com) → **New → Blueprint**.
3. Connecte ton repo : Render lit `render.yaml` et propose le service
   `la-kermesse` (plan **free**). Clique **Apply**.
4. Attends la fin du build (~1 min). Ton URL : `https://la-kermesse-XXXX.onrender.com`.
5. Ouvre l'URL, crée un stand, partage le lien 🎉

*Sans Blueprint* : **New → Web Service** → repo → runtime **Node** →
build `npm ci --omit=dev` → start `node server/index.js` → plan Free →
Health check path `/healthz`. Aucune variable d'env obligatoire
(`PORT` est fourni par Render ; `NODE_ENV=production` recommandé).

**À savoir (free tier)** : l'instance s'endort après 15 min sans trafic et met
~1 min à se réveiller au premier visiteur. Une partie active ne s'endort
jamais (les messages WebSocket comptent comme du trafic). L'état est en
mémoire : un redéploiement ferme les parties en cours, les clients se
reconnectent tout seuls au lobby.

## Ajouter un jeu (le guide qui compte)

Un jeu = **un dossier** dans `games/`. Le serveur et le client le découvrent
tout seuls, il n'y a **rien d'autre à modifier**.

```
games/mon-jeu/
  meta.js      → identité + capacités (données pures, isomorphe)
  server.js    → la simulation, autoritaire, 20 ticks/s
  client.js    → le rendu Canvas + contrôles
  rules.md     → les règles affichées en jeu (bouton « ? »)
  preview.js   → (optionnel) vignette du stand dessinée au Canvas (menus)
```

### 1. `meta.js`

```js
export default {
  id: 'mon-jeu',            // = nom du dossier
  name: 'MON JEU', emoji: '🎠', color: '#3DFF8A',
  tagline: 'Une phrase courte.', pitch: 'Le pitch complet.',
  minPlayers: 2, maxPlayers: 8,
  arena: { w: 800, h: 600 },      // libre (tes unités monde)
  caps: {                          // le moteur de formats fait le reste
    ffa: true,
    teams: { min: 2, max: 4, uneven: true },
    asym: { solo: [1], roles: { solo: 'Le Boss', crowd: 'Les Autres' } },
  },
  controls: {                      // l'UI tactile est générée pour toi
    move: 'joystick',              // 'joystick' | 'steer' | 'tap'
    buttons: [{ id: 'action', label: 'GO' }],
  },
  settings: { rounds: { label: 'Manches', values: [3, 5], def: 3 } },
  howto: [{ icon: '🕹️', text: 'Mini-tuto en 3-5 cartes illustrées.' }],
};
```

### 2. `server.js` : le contrat (7 fonctions)

```js
export function createState(cfg) { … }        // cfg: {teams, players, format, settings, rng, seed}
export function onInput(state, pid, d) { … }  // intention continue (joystick…) : VALIDE TOUT
export function onAction(state, pid, a, d) {} // action discrète (dash…) : VALIDE TOUT
export function tick(state, dt) { return evs } // 20 Hz, dt=0.05 : retourne les événements (juice)
export function isOver(state) { return bool }
export function view(state, pid) { return {} } // état sérialisable envoyé aux clients (par joueur si secrets)
export function results(state) { return { ranking, winners, titles } }
export function botAct(state, pid, mind, api) {} // api.input(d) / api.act(a) : même chemin que les humains
// Optionnel : fullView(state, pid) → snapshot complet à la (re)connexion
```

Règles d'or : l'état ne sort jamais du serveur sans passer par `view()` ;
les bots jouent via `api.input/act` donc ne peuvent pas tricher ; utilise
`cfg.rng` (seedé) pour que les parties soient reproductibles en test.

### 3. `client.js`

```js
export function createClient({ ctx, helpers, config, you, send, controls }) {
  return {
    render(view, dt) { … },     // view = {a, b, alpha, latest, tick} → interpole !
    onEvents(evs) { … },        // tes événements de tick → sfx + particules
    onTap(x, y, phase) { … },   // si move: 'tap'
    destroy() {},
  };
}
```

`helpers` fournit : `bg()` (fond foraine), `viewport(w,h)` (letterbox +
`toWorld`), `juice` (burst/shake/floater/flash), `sfx.play(nom)`, `lerp`,
`angleLerp`, `nameTag`, `t()` (i18n). `controls.setCooldown(id, frac)` pilote
l'affichage des boutons.

### 4. Teste

`npm test` joue automatiquement ton nouveau jeu de bout en bout (2 humains
simulés + bots, FFA **et** asymétrique) : si le harnais est vert, ton jeu
tourne.

## Architecture en bref

- **Un process Node** (`server/index.js`) : statique + WebSocket (`ws`) sur
  le même port (`process.env.PORT`), `/healthz`, arrêt propre SIGTERM.
- **Serveur autoritatif** à 20 Hz : les clients envoient des intentions,
  jamais des états. Snapshots JSON complets, interpolation client à −110 ms.
- **Rooms** : codes 4 lettres sans ambiguïté, hôte migrant, reconnexion 60 s
  par token (localStorage), autopilote pour les AFK/déconnectés, spectateurs
  pour les morts et les arrivants, nettoyage automatique.
- **Moteur de formats** (`shared/formats.js`) : FFA / équipes (in)égales /
  asymétrique généré depuis les `caps` de chaque jeu.
- **Bots** : 16 forains à personnalités (agressivité, précision, chaos),
  difficulté réglable au lobby.
- **Zéro build** : vanilla JS + Canvas, modules ES servis tels quels.

Docs détaillées : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) ·
[`docs/GAMES.md`](docs/GAMES.md) · [`docs/DESIGN.md`](docs/DESIGN.md) ·
[`docs/RESEARCH.md`](docs/RESEARCH.md) · [`CREDITS.md`](CREDITS.md)
