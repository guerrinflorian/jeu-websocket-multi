# TODO — LA KERMESSE

## Phase 0 — Recherche
- [x] Render free tier / WebSocket 2026 vérifié (docs officielles)
- [x] Choix lib WS (`ws`) justifié
- [x] Patterns netcode (tick 20 Hz, interpolation 110 ms)
- [x] Contrôles tactiles / accessibilité
- [x] `docs/RESEARCH.md`

## Phase 1 — Conception
- [x] `docs/ARCHITECTURE.md` (stack, protocole exhaustif, contrat de jeu)
- [x] `docs/GAMES.md` (4 jeux : SERPENTIN, CARAMBOLE, INCOGNITO, MAGOT)
- [x] `docs/DESIGN.md` (DA « fête foraine électrique »)

## Phase 2 — Le cœur (testé avant tout jeu)
- [x] package.json, .gitignore, config serveur
- [x] `shared/formats.js` — moteur de formats d'équipes + tests
- [x] `shared/const.js` — couleurs, PRNG, helpers
- [x] Serveur HTTP statique + `/healthz` + SIGTERM propre
- [x] Serveur WS : hello/welcome, rate limiting, heartbeat, caps
- [x] Rooms : codes, lobby, machine à états, migration d'hôte, nettoyage
- [x] Reconnexion (token, grâce 60 s, autopilote)
- [x] Bots : noms de forains, personnalités, planificateur
- [x] `gameloader.js` + validation du contrat
- [x] Client : shell, net (reconnexion auto), écrans accueil/lobby/résultats
- [x] Design system CSS complet
- [x] Input tactile (joystick dynamique, boutons, moitiés d'écran) + clavier
- [x] SFX WebAudio + juice (shake, particules, texte flottant)
- [x] `client/strings.js` (i18n FR centralisé)
- [x] Harnais de test : 8 clients WS simulés, lobby complet, reconnexion, migration d'hôte

## Phase 3 — Les jeux (complets un par un)
- [ ] SERPENTIN (serveur + client + bots + rules + testé harnais)
- [ ] CARAMBOLE (idem)
- [ ] MAGOT (idem)
- [ ] INCOGNITO (idem)

## Phase 4 — Polish
- [ ] Écran d'accueil qui donne envie (enseigne animée)
- [ ] Transitions, countdown, ralenti de fin de manche
- [ ] Cas moches : déco en pleine partie, 1 joueur restant, égalité, AFK
- [ ] Emotes spectateur
- [ ] Titres de fin de partie sur les 4 jeux
- [ ] Passe zéro console.log / code mort

## Phase 5 — Déploiement
- [ ] `render.yaml`, variables d'env documentées
- [ ] `README.md` (local, Render pas à pas, guide « ajouter un jeu », archi)
- [ ] `CREDITS.md`
- [ ] Vérif build prod en local (NODE_ENV=production, harnais complet vert)
