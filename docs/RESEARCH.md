# Phase 0 : Recherche (août 2026)

Conclusions vérifiées avant d'écrire la moindre ligne de code.

## 1. Hébergement : Render free tier

Vérifié sur la doc officielle Render (août 2026) :

- **Le free tier existe toujours** : 750 heures d'instance gratuites / mois / workspace.
- **Spin-down après 15 minutes** sans trafic entrant. Les **messages WebSocket comptent comme du trafic** → une partie active ne s'endort jamais. Réveil ≈ 1 minute au premier accès.
- **WebSocket supporté sans timeout fixe** côté Render. Les connexions sont coupées uniquement au redéploiement (SIGTERM + 30 s de grâce).
- Render **recommande des ping/pong applicatifs** pour détecter les connexions mortes → on implémente un heartbeat des deux côtés.
- Tout le trafic public passe par **un seul port** (`process.env.PORT`, défaut 10000), host `0.0.0.0`. Le WS démarre en HTTP upgrade sur ce même port → **un seul process qui sert statique + WS** est exactement le modèle attendu.
- Toujours utiliser `wss://` en prod (Render répond 301 sur `ws://`). Côté client : dériver le protocole de `location.protocol`.
- Filesystem éphémère, pas de disque persistant → **état 100 % en mémoire, assumé** (contrainte du projet de toute façon).
- Pas de limite de connexions WS imposée par Render ; la limite est la RAM/CPU de l'instance free (~512 Mo). On met nos propres caps (connexions, rooms).

**Conséquences concrètes** : health check `/healthz`, arrêt propre sur SIGTERM (fermer les WS avec un code explicite pour que les clients re-connectent), heartbeat 25 s, reconnexion automatique côté client (couvre aussi les redéploiements).

## 2. Lib WebSocket Node

Comparatif 2026 (benchmarks AnyCable, PkgPulse, Velt) :

| Lib | Throughput | Poids/deps | Maintenance | Verdict |
|---|---|---|---|---|
| `ws` | Excellent (référence, ~85 M dl/sem) | Minuscule, 0 dépendance | Très active | ✅ **Choisi** |
| `socket.io` | ~40 % plus lent, overhead protocole | Lourd (fallbacks inutiles en 2026) | Active | Rooms/reconnexion intégrées mais on veut les contrôler nous-mêmes (reconnexion avec reprise d'état ≠ reconnexion transport) |
| `uWebSockets.js` | 5-10× `ws` | Binaire C++ (install fragile, pas sur npm officiel) | Active | Overkill : nos rooms font 8 joueurs, le goulot n'est pas le transport |

**Décision : `ws`**, seule dépendance runtime du projet. À notre échelle (dizaines de rooms de 8 joueurs, snapshots 20 Hz de ~2-6 Ko), `ws` est très loin de saturer. La reconnexion applicative (token + reprise de place en 60 s) doit être écrite maison de toute façon.

## 3. Netcode navigateur

Sources : Valve Developer Wiki (Source Multiplayer Networking), SnapNet (Netcode Architectures), geckos.io snapshot-interpolation, codersblock (client-side prediction).

Patterns retenus, adaptés à des party games (pas un FPS compétitif) :

- **Serveur autoritatif à tick fixe : 20 Hz** (dt = 50 ms). Suffisant pour des jeux d'arcade lisibles, économe en CPU/bande passante sur une instance free.
- **Snapshot complet à chaque tick** (pas de delta encoding) : à 8 joueurs, un snapshot JSON fait 1-6 Ko ; 20 Hz × 6 Ko × 8 clients ≈ 1 Mo/s max, trivial. La simplicité gagne.
- **Interpolation côté client : rendu à `t - 110 ms`** entre les deux snapshots qui encadrent, comme Source. Le jeu est fluide à 60 fps même avec du jitter.
- **Pas de client-side prediction complète** (rollback/replay) : trop coûteux à généraliser sur 4 jeux différents. À la place : **feedback d'input immédiat** (le client montre instantanément l'effet cosmétique : orientation du joystick, flash du dash, son) + interpolation courte. Pour des manches de 2-5 min entre potes, c'est le bon compromis latence/complexité, décision documentée et assumée.
- **Inputs** : le client envoie des intentions (vecteur de déplacement, virage, actions discrètes) à ≤ 30 Hz, avec numéro de séquence. Le serveur garde le dernier input par joueur et l'applique au tick. Toute validation (cooldown, portée, tour) est serveur.
- **Horloge** : le serveur timestampe chaque snapshot ; le client estime l'offset via ping/pong et cale son curseur d'interpolation dessus.

## 4. Contrôles tactiles & accessibilité

Sources : devlogs HTML5 touch controls (aaronbell.com), nippleJS/virtual-joystick patterns, Coherent Labs.

- **Joystick dynamique** (apparaît sous le pouce au `touchstart`, moitié gauche de l'écran) : le standard qui marche, pas de position à mémoriser.
- **Boutons d'action à droite**, gros (≥ 64 px), en pourcentage de l'écran, avec retour visuel + `navigator.vibrate` court quand disponible.
- **Multi-touch obligatoire** : bouger + agir en même temps (suivi par `touch.identifier`).
- `touch-action: none` sur le canvas, `user-select: none`, viewport `user-scalable=no`, gestion du safe-area iOS (`env(safe-area-inset-*)`).
- Jeux à 2 boutons quand c'est possible (SERPENTIN : moitié gauche / moitié droite de l'écran = pattern Curve Fever, imbattable au pouce).
- Accessibilité : ne jamais coder une info uniquement par la couleur (formes/icônes par équipe en plus de la couleur), texte ≥ 14 px, respecter `prefers-reduced-motion` (screenshake désactivable).

## 5. Divers vérifiés

- **WebAudio** : tout le son est synthétisé (oscillateurs + buffers de bruit). L'AudioContext doit être créé/réveillé **sur le premier geste utilisateur** (politique autoplay) → bouton d'entrée sur l'écran d'accueil.
- **Google Fonts** (Bungee, Rubik) : licence OFL, utilisable librement, crédité dans `CREDITS.md`. Fallback system-ui si offline.
- **Node 22 LTS** local confirmé ; Render supporte Node 22 (défini via `engines` dans package.json).

## Sources

- [Render - Deploy for Free](https://render.com/docs/free)
- [Render - WebSockets](https://render.com/docs/websocket)
- [AnyCable - Node.js WebSocket Server Comparison 2026](https://anycable.io/compare/nodejs-websocket/)
- [PkgPulse - Socket.IO vs ws vs uWebSockets.js 2026](https://www.pkgpulse.com/guides/socketio-vs-ws-vs-uwebsockets-websocket-servers-nodejs-2026)
- [Velt - Best WebSocket Libraries for Node.js (juillet 2026)](https://velt.dev/blog/best-nodejs-websocket-libraries)
- [Valve - Source Multiplayer Networking](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking)
- [SnapNet - Netcode Architectures Part 3: Snapshot Interpolation](https://snapnet.dev/blog/netcode-architectures-part-3-snapshot-interpolation/)
- [geckos.io - snapshot-interpolation](https://github.com/geckosio/snapshot-interpolation)
- [codersblock - Client-Side Prediction Revisited](https://codersblock.org/multiplayer-fps/part8/)
- [aaronbell.com - Mobile touch controls from scratch in HTML5](https://www.aaronbell.com/mobile-touch-controls-from-scratch/)
