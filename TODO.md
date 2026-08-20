# TODO : LA KERMESSE

## Phase 0 : Recherche
- [x] Render free tier / WebSocket 2026 vérifié (docs officielles)
- [x] Choix lib WS (`ws`) justifié
- [x] Patterns netcode (tick 20 Hz, interpolation 110 ms)
- [x] Contrôles tactiles / accessibilité
- [x] `docs/RESEARCH.md`

## Phase 1 : Conception
- [x] `docs/ARCHITECTURE.md` (stack, protocole exhaustif, contrat de jeu)
- [x] `docs/GAMES.md`
- [x] `docs/DESIGN.md` (DA « fête foraine électrique »)

## Phase 2 : Le cœur (testé avant tout jeu)
- [x] Moteur de formats d'équipes + PRNG + helpers partagés
- [x] Serveur : statique + /healthz + WS (rate limit, heartbeat, caps)
- [x] Rooms : codes, lobby, machine à états, migration d'hôte, nettoyage
- [x] Reconnexion (token, grâce 60 s, autopilote AFK)
- [x] Bots forains (16 personnalités) + gameloader (contrat validé)
- [x] Client : design system, écrans, net auto-reconnexion, input tactile,
      SFX WebAudio, juice, i18n FR centralisé
- [x] Harnais : 8 clients WS réels (lobby, reconnexion, migration, flood)

## Phase 3 : Les jeux (complets un par un)
- [x] SERPENTIN (serveur + client + bots + rules + testé)
- [x] CARAMBOLE (idem)
- [x] MAGOT (idem)
- [x] ~~INCOGNITO~~ : coupé du périmètre (conçu dans docs/GAMES.md,
      ajoutable plus tard via le contrat de jeu)

## Phase 4 : Polish
- [x] Écran d'accueil (enseigne néon animée, avatars)
- [x] Countdown, emotes, toasts, bannières réseau/spectateur
- [x] Cas moches : déco en pleine partie, AFK, égalité, room zombie
- [x] Titres de fin de partie sur les 3 jeux
- [x] Passe zéro console.log / code mort
- [x] Smoke test navigateur (Playwright) : zéro erreur console + captures

## Phase 5 : Déploiement
- [x] `render.yaml` (blueprint free tier, healthcheck)
- [x] `README.md` (local, Render pas à pas, guide « ajouter un jeu »)
- [x] `CREDITS.md`
- [x] Harnais complet vert avant remise

## Phase 6 : Six nouveaux stands (août 2026)
- [x] Purge des em-dashes sur tout le projet
- [x] `client/cardkit.js` : cartes françaises, dés et jetons 100 % Canvas
- [x] `shared/cards.js` + `shared/dice.js` (données isomorphes)
- [x] LIGNE 4 (puissance 4 à 2-8 camps, grille adaptative, menaces)
- [x] BLACKJACK (mains simultanées, banque jouable en asym)
- [x] ~~7 FAMILLES~~ : retiré en Phase 7 à la demande
- [x] YAMS (tours simultanés, feuille express/complète, aperçu des points)
- [x] BARRIÈRES (Quoridor par camps, passage garanti BFS, 15 murs/joueur,
      1v1 2v2 3v3 5v3 1v2… ; Contremaître à 2 actions)
- [x] ~~CANARDS~~ : remplacé par la PÉTANQUE en Phase 7
- [x] Simulation headless 8 bots (FFA/asym/équipes) sur les 6 jeux
- [x] Smoke test Playwright par jeu : zéro erreur console + captures
- [x] Docs à jour (README, GAMES.md, ARCHITECTURE inchangée : même contrat)

## Phase 7 : Complétude, beauté, 3 nouveaux stands (août 2026)
- [x] `client/cardkit.js` v2 : cartes réalistes (enseignes vectorielles,
      index fins, pips inversés, figures à double tête, as de pique orné)
- [x] Système d'aperçus : `games/<id>/preview.js` (vignette Canvas), galerie
      « Les stands » sur l'accueil (vignette + nom + règles au tap),
      vignettes dans le sélecteur de jeu du lobby
- [x] YAMS refondu : vraie feuille 13 lignes (section haute + bonus 63/+35,
      petite/grande suite), layouts portrait/paysage, confirmation de zéro,
      bot stratège (bonus, full, suites)
- [x] BLACKJACK refondu : mise en jetons (5/10/25/50), SPLIT, double après
      split, assurance contre l'as, table redessinée portrait/paysage,
      bot stratégie de base
- [x] Retrait de CANARDS (remplacé) et de 7 FAMILLES (à la demande)
- [x] PÉTANQUE (nouveau stand : physique de boules, vraie règle du point,
      carreau, mènes ; asym « Le Tireur »)
- [x] PETITS CHEVAUX (nouveau stand : piste circulaire 2-8 camps, 6 pour
      sortir, captures, échelles ; asym « Le Jockey » qui relance)
- [x] BATAILLE NAVALE (nouveau stand : salves simultanées, grilles secrètes
      par vue, flottes d'équipe ; asym « L'Amiral » multi-tirs)
- [x] Polish des 7 stands existants (lisibilité, juice, HUD, mobile,
      règles complètes, vignettes)
- [x] Simulation headless : 11 jeux × 3 formats (FFA, équipes, asym) verts
- [x] Harnais `npm test` complet vert
- [x] Smoke test Playwright (zéro erreur console) + captures par jeu

## Phase 8 : Blackjack de casino et correctifs (août 2026)
- [x] BLACKJACK refondu de fond en comble : mise LIBRE (jetons 1/5/25/100/500,
      réglette, MIN/×2/RELANCE/TAPIS), SPLIT jusqu'à 4 mains (as splittés à une
      carte, pas de resplit), DOUBLE y compris après split, ABANDON tardif,
      ASSURANCE et argent comptant, peek du croupier, sabot 1/2/6 jeux avec
      carte de coupe, banque à 17 ou 17 souple, blackjack 3:2 ou 6:5
- [x] 7 réglages de table (mains 3 à 30 pour les soirées, tapis, sabot, banque,
      paiement, abandon, rythme)
- [x] Client refait : table de casino (feutre, rail, mention dorée en arc),
      cartes en volume avec tranche et retournement de la carte cachée,
      jetons cylindriques empilés, barres contextuelles, portrait et paysage,
      raccourcis clavier
- [x] Bot à vraie stratégie de base (splits, doubles, abandons, assurance rare)
- [x] 130 vérifications dédiées (règles, paiements, secret des vues, invariants
      de tapis, tous les réglages, fuzz)
- [x] Correctif : le pilote automatique d'inactivité confisquait les tours dans
      les jeux au tour par tour (un joueur qui attendait son tour était pris
      pour un absent). Réservé désormais aux jeux temps réel via meta.idleBot ;
      un joueur déconnecté reste remplacé par un forain partout
- [x] Correctif : la pétanque dépassait le budget de temps du harnais
      (convergence deux fois plus rapide, sous-pas de physique, garde-fous durs)

## Phase 9 : Deux classiques de plus (août 2026)
- [x] MENTEUR (bluff aux dés façon Perudo : dés secrets par joueur,
      enchères, jokers, MENTEUR ! et PILE !, élimination dé par dé ;
      asym « Le Tricheur » à 6 dés avec relance secrète)
- [x] HUIT AMÉRICAIN (l'ancêtre d'UNO : 8 joker, 7 cumulable, As demi-tour,
      Roi qui saute, fenêtre CARTE SEULE ! avec dénonciation ;
      asym « Le Requin »)
- [x] Test d'interaction réelle du blackjack (vrais événements pointeur et
      clavier) : jetons, réglette, boutons contextuels, raccourcis
- [x] Correctif : deux taps rapides sur un jeton ne comptaient que pour un
      (mise locale optimiste, confirmée par le serveur)
