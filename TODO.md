# TODO — LA KERMESSE

## Phase 0 — Recherche
- [x] Render free tier / WebSocket 2026 vérifié (docs officielles)
- [x] Choix lib WS (`ws`) justifié
- [x] Patterns netcode (tick 20 Hz, interpolation 110 ms)
- [x] Contrôles tactiles / accessibilité
- [x] `docs/RESEARCH.md`

## Phase 1 — Conception
- [x] `docs/ARCHITECTURE.md` (stack, protocole exhaustif, contrat de jeu)
- [x] `docs/GAMES.md`
- [x] `docs/DESIGN.md` (DA « fête foraine électrique »)

## Phase 2 — Le cœur (testé avant tout jeu)
- [x] Moteur de formats d'équipes + PRNG + helpers partagés
- [x] Serveur : statique + /healthz + WS (rate limit, heartbeat, caps)
- [x] Rooms : codes, lobby, machine à états, migration d'hôte, nettoyage
- [x] Reconnexion (token, grâce 60 s, autopilote AFK)
- [x] Bots forains (16 personnalités) + gameloader (contrat validé)
- [x] Client : design system, écrans, net auto-reconnexion, input tactile,
      SFX WebAudio, juice, i18n FR centralisé
- [x] Harnais : 8 clients WS réels (lobby, reconnexion, migration, flood)

## Phase 3 — Les jeux (complets un par un)
- [x] SERPENTIN (serveur + client + bots + rules + testé)
- [x] CARAMBOLE (idem)
- [x] MAGOT (idem)
- [x] ~~INCOGNITO~~ — coupé du périmètre (conçu dans docs/GAMES.md,
      ajoutable plus tard via le contrat de jeu)

## Phase 4 — Polish
- [x] Écran d'accueil (enseigne néon animée, avatars)
- [x] Countdown, emotes, toasts, bannières réseau/spectateur
- [x] Cas moches : déco en pleine partie, AFK, égalité, room zombie
- [x] Titres de fin de partie sur les 3 jeux
- [x] Passe zéro console.log / code mort
- [x] Smoke test navigateur (Playwright) : zéro erreur console + captures

## Phase 5 — Déploiement
- [x] `render.yaml` (blueprint free tier, healthcheck)
- [x] `README.md` (local, Render pas à pas, guide « ajouter un jeu »)
- [x] `CREDITS.md`
- [x] Harnais complet vert avant remise
