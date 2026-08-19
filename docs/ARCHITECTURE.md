# Architecture — LA KERMESSE

## Stack (et pourquoi)

| Brique | Choix | Justification en une ligne |
|---|---|---|
| Runtime | Node ≥ 20, ESM, **zéro build** | Un process, un `node server/index.js`, déployé tel quel sur Render |
| WebSocket | **`ws`** (seule dépendance runtime) | Léger, standard de fait, largement suffisant pour des rooms de 8 (voir RESEARCH.md) |
| Front | **Vanilla JS + Canvas 2D**, ES modules servis statiques | 60 fps sans framework ni bundler ; le DOM sert pour les menus, le Canvas pour les jeux |
| Rendu jeux | Canvas 2D pour les 4 jeux, DOM pour lobby/menus | Les 4 jeux sont spatiaux/temps réel → Canvas ; l'UI est du document → DOM |
| Son | WebAudio 100 % synthétisé | Zéro asset sous licence |
| Art | CSS + SVG + Canvas génératif | Idem |
| État | Mémoire process uniquement | Contrainte free tier assumée |

## Arborescence

```
server/           → cœur serveur (ne connaît AUCUN jeu)
  index.js        → HTTP statique + upgrade WS + /healthz + SIGTERM propre
  config.js       → toutes les constantes (caps, ticks, timeouts)
  wsserver.js     → connexions, hello/reprise, rate limiting, heartbeat
  room.js         → machine à états d'une room (lobby→countdown→playing→results)
  rooms.js        → registre, codes, nettoyage, migration d'hôte
  bots.js         → noms, personnalités, planificateur de réflexion des bots
  gameloader.js   → charge games/*/  (meta + server), valide le contrat
  statics.js      → serveur de fichiers statiques (bloque games/*/server.js)
shared/           → modules isomorphes (import serveur ET navigateur)
  formats.js      → moteur de formats d'équipes (la brique partagée)
  const.js        → couleurs joueurs, noms d'événements, helpers purs
games/<id>/       → un jeu = un dossier, voir « Contrat de jeu »
client/           → app navigateur (servie à la racine)
test/             → harnais 8 clients WS + tests unitaires du cœur
```

## Flux WebSocket

```
Navigateur                         Serveur (autoritatif)
   │  ws upgrade sur le port HTTP     │
   │──────── hello {token,…} ────────▶│  reprise si token en grâce (60 s)
   │◀─────── welcome {id,token} ──────│
   │──────── create / join ──────────▶│
   │◀─────── room {état lobby} ───────│  (rediffusé à chaque changement)
   │──────── start (hôte) ───────────▶│
   │◀─────── countdown / start ───────│
   │══ input ≤30 Hz / act ═══════════▶│  tick 20 Hz : valide, simule
   │◀══ snap {tick,t,state,ev} 20 Hz ═│  bots joués via le même chemin d'input
   │◀─────── over {résultats} ────────│
   │◀─────── room {retour lobby} ─────│
```

- Le client **n'envoie jamais d'état**, uniquement des intentions. Tout est validé serveur (cooldowns, murs, tours, formats).
- Rendu client : interpolation entre snapshots à `t − 110 ms`, feedback cosmétique immédiat sur input local.
- Heartbeat : ping applicatif client→serveur toutes les 5 s (sert aussi d'indicateur de latence) + `ws.ping` serveur toutes les 25 s.

## Protocole — liste exhaustive

Tous les messages sont du JSON `{t: "type", ...champs}`.

### Client → Serveur

| Type | Champs | Contexte |
|---|---|---|
| `hello` | `token?, name?, face?` | À la connexion. Token connu + grâce active → reprise de place |
| `create` | — | Crée une room, devient hôte |
| `join` | `code` | Rejoint par code (insensible à la casse) |
| `leave` | — | Quitte la room |
| `profile` | `name, face` | Pseudo (≤ 16 car.) + avatar (index de visage SVG) |
| `ready` | `on` | Prêt / pas prêt dans le lobby |
| `setGame` | `gameId` | Hôte uniquement |
| `setFormat` | `formatId` | Hôte ; formatId issu du moteur de formats |
| `setTeam` | `pid` | Hôte ; fait tourner le joueur vers l'équipe suivante |
| `shuffle` | — | Hôte ; redistribue les équipes du format courant |
| `setSettings` | `patch` | Hôte ; validé champ par champ contre le schéma du jeu |
| `addBot` / `removeBot` | — / `pid` | Hôte |
| `start` | — | Hôte ; refuse si format invalide ou joueurs pas prêts |
| `input` | `seq, d` | En jeu ; `d` dépend du schéma de contrôle du jeu |
| `act` | `a, d?` | Action discrète (dash, tir…) ; validée par le jeu |
| `emote` | `e` | Lobby, jeu, spectateur (index d'emote, rate-limité) |
| `again` | — | Hôte, écran résultats → relance même jeu/format |
| `toLobby` | — | Hôte, écran résultats → retour lobby |
| `ping` | `t` | Latence ; réponse `pong {t}` immédiate |

### Serveur → Client

| Type | Champs | Rôle |
|---|---|---|
| `welcome` | `pid, token, resumed?` | Identité + token à stocker en localStorage |
| `error` | `code` | `BAD_CODE, ROOM_FULL, SERVER_FULL, NOT_HOST, BAD_NAME, RATE, CANT_START…` — traduit côté client |
| `room` | état lobby complet | Joueurs (pseudo, visage, couleur, équipe, prêt, hôte, bot, connecté), jeu, format, formats valides, réglages, phase |
| `countdown` | `n` | 3, 2, 1 |
| `start` | `gameId, config, you` | Le client charge `/games/<id>/client.js` |
| `snap` | `tick, now, state, ev[]` | État complet + événements (juice/SFX) de ce tick |
| `over` | `ranking, titles, stats, teams` | Écran résultats |
| `pong` | `t` | Latence |
| `bye` | `reason` | Kick propre (room fermée, remplacé par reprise ailleurs) |

Le message `room` est **idempotent** (état complet, pas de diffs) : trivial à re-synchroniser après reconnexion.

## Modèle de room

- Code : 4 caractères de l'alphabet `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (ni 0/O, ni 1/I/L).
- Machine à états : `lobby → countdown(3 s) → playing → results → lobby`.
- **Hôte** : le plus ancien humain connecté. Migration automatique à la déconnexion.
- **Bots** : membres du lobby comme les autres (ajout/retrait par l'hôte, auto-prêts) ; ils passent par `onInput/onAction` comme un client normal → aucune triche possible par construction.
- **Reconnexion** : token UUID en localStorage ; à la déconnexion le joueur passe en grâce 60 s, son pion est piloté par un autopilote bot. Retour avec le même token → reprise instantanée (lobby ou partie en cours).
- **AFK** : 20 s sans input en partie → autopilote + badge « AFK » ; le moindre input rend la main.
- **Spectateur** : les morts et les arrivants en cours de partie reçoivent les snapshots normalement (+ infos bonus selon le jeu). Jamais d'écran noir.
- **Nettoyage** : room sans aucun humain connecté → détruite après 120 s ; room en lobby inactive 30 min → détruite ; caps `MAX_ROOMS=100`, `MAX_CONNS=400`, 8 joueurs/room.
- **Rate limiting** : token bucket par connexion — 40 msg/s pour `input`, 10/s pour le reste, déconnexion en cas d'abus répété.

## Moteur de formats d'équipes (`shared/formats.js`)

Brique partagée, aucun format codé en dur dans les jeux. Chaque jeu déclare ses **capacités** dans `meta.js` :

```js
caps: {
  ffa: true,                                  // chacun pour soi
  teams: { min: 2, max: 4, uneven: true },    // équipes, écarts autorisés
  asym:  { solo: [1, 2], roles: { solo: 'Le Taureau', crowd: 'Le Troupeau' } },
}
```

`computeFormats(caps, playerCount)` génère la liste exhaustive des formats valides :
FFA ; toutes les partitions à 2 équipes `[a, n−a]` (dont déséquilibrées si `uneven`) ; partitions équilibrées à 3-4 équipes ; formats asymétriques à rôles (`1vN`, `2vN`). Chaque format a un `id` stable (`ffa`, `t-4-4`, `t-2-3`, `asym-1-7`…), un label FR et un drapeau `asym`. L'hôte choisit dans cette liste, recalculée à chaque changement d'effectif.

## Contrat de jeu (le serveur ne connaît aucun jeu)

```
games/<game-id>/
  meta.js    → isomorphe : id, nom, emoji, pitch, joueurs min/max, caps,
               schéma de réglages, schéma de contrôles, howto[] (mini-tuto illustré)
  server.js  → createState(cfg) ; onInput(state,pid,d) ; onAction(state,pid,a,d)
               tick(state,dt) → ev[] ; isOver(state) ; results(state)
               botAct(state,pid,mind,api) — même chemin d'input que les humains
  client.js  → createClient({canvas,helpers,you,config}) → {render(view,dt), destroy()}
  rules.md   → règles complètes affichées en jeu (bouton « ? »)
```

- `gameloader.js` scanne `games/`, importe `meta.js` + `server.js`, **valide chaque export** au démarrage (fail fast).
- Le client charge `/games/<id>/client.js` en module ES à la volée. `server.js` est **bloqué** par le serveur statique.
- `helpers` fournis au client : interpolation, juice (screenshake, particules, texte flottant), SFX, chaînes FR, couleurs joueurs, dessin du fond foraine.
- `config` reçu par `createState` : `{ teams, players: {pid: {name, color, bot, face}}, format, settings, rng }` — `rng` est un PRNG seedé (parties reproductibles en test).
- Événements de tick (`ev[]`) : `{e:'boom', x, y, pid?…}` → le client les mappe sur SFX + particules. Le serveur reste muet sur le rendu.

**Ajouter un 5ᵉ jeu = créer le dossier, remplir le contrat.** Rien d'autre à toucher.

## Décisions notables (et assumées)

- **Pas de prédiction/rollback client** : feedback cosmétique immédiat + interpolation 110 ms. Bon compromis pour des party games ; documenté dans RESEARCH.md.
- **Snapshots complets JSON** (pas de delta/binaire) : à cette échelle la simplicité et la débuggabilité gagnent. Le contrat n'empêche pas d'optimiser plus tard.
- **Pas de 3D** : une DA 2D néon forte, cohérente et performante sur mobile bat un rendu 3D moyen sur tous les critères du brief (fun, lisibilité à 8, mobile-first, zéro asset).
- **i18n** : toutes les chaînes UI dans `client/strings.js` (clé → FR). Le serveur n'envoie que des codes.
