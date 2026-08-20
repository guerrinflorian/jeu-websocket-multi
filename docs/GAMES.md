# Les jeux : LA KERMESSE

Onze stands de fête foraine : quatre jeux d'arcade (dont deux originaux), six classiques de société revisités (Ligne 4, Blackjack, Yams, Petits Chevaux, Pétanque, Bataille Navale) et un original au tour par tour (Barrières).
Tous : 1-8 joueurs (bots en complément), >= 3 formats dont un asymétrique, manches courtes, règles en jeu (`rules.md` + mini-tuto), vignette d'aperçu (`preview.js`) dans les menus, titres rigolos en fin de partie.

---

## 🎗️ SERPENTIN : classique revisité (Curve Fever / Tron)

**Pitch** : trace ton serpentin lumineux, coupe la route des autres, mais les traînées de TES coéquipiers sont des portes pour toi et des murs pour eux.

- **Boucle** : mouvement continu qui s'incurve (2 contrôles : gauche/droite). La traînée reste toute la manche, avec des trous périodiques. Toucher un mur ou une traînée ennemie = mort. Dernière équipe en vie gagne la manche ; première à N manches gagne.
- **Le twist** : les traînées **alliées sont traversables**. À 4v4 on tisse des filets pour son équipe, on enferme les ennemis dans SA toile. + **Boost** (bouton) : accélération brève, cooldown.
- **Asymétrique : « L'Anguille »** : 1 (ou 2) contre tous. Plus rapide, traînée plus courte ; elle gagne la manche en survivant 45 s, les chasseurs en l'éliminant.
- **Contrôles** : moitié gauche / moitié droite de l'écran (mobile), flèches (clavier). Boost = bouton / espace.

## 🎪 CARAMBOLE : classique revisité (sumo × auto-tamponneuses)

**Pitch** : des auto-tamponneuses sur une piste ronde qui rétrécit. Éjecte tout le monde, reste dessus.

- **Boucle** : physique de palets (masse, rebond, friction). Joystick pour pousser, **Dash** (cooldown 3 s). La piste rétrécit par paliers. Tombé = éliminé (et spectateur-emoteur). Dernière équipe sur la piste gagne la manche.
- **Le twist** : des **bonus forains** tombent du ciel : aimant (piège), enclume (masse ×2), gant doré. Les collisions transfèrent l'élan : un dash raté te propulse toi.
- **Asymétrique : « Le Taureau »** : masse ×2,2, dash renforcé, 3 vies ; chaque mort du Taureau fait rétrécir la piste.
- **Contrôles** : joystick + bouton Dash. Flèches/WASD + espace au clavier.

## 💰 MAGOT : original (avarice & tacles)

**Pitch** : un tas de jetons au centre, ta caisse au coin. Plus tu portes, plus tu es lent, et tout le monde a le droit de te tacler.

- **Boucle (150 s)** : tas central FINI (premier arrivé, premier servi), dépôt en caisse pour sécuriser, **chaque jeton porté ralentit** (jusqu'à -60 %). **Tacle** : le porteur percuté lâche tout. **Siphon** des caisses ennemies, **pluies d'or** annoncées, **heure dorée** (20 dernières secondes : dépôts ×2).
- **Asymétrique : « Le Dragon »** : le trésor central lui appartient ; il gagne s'il en garde au moins la moitié.
- **Contrôles** : joystick + bouton Tacle.

## 🥫 CHAMBOULE : original (visée secrète & carambolages)

**Pitch** : billard humain au-dessus du vide. Chacun vise en secret, tout le monde part en même temps.

- **Boucle (par salve)** : 10 s pour choisir en secret direction + puissance (glisser = fronde), puis **envol simultané** : physique de palets, tombé = éliminé, la plateforme rétrécit à chaque salve.
- **Asymétrique : « Le Quilleur »** : masse ×2,5, lancer surpuissant, 2 vies.
- **Contrôles** : glisser (direction + longueur = puissance), re-visée autorisée tant que le chrono tourne. Clavier : flèches.

---

## 🔴 LIGNE 4 : classique revisité (puissance 4)

**Pitch** : la grille lumineuse du stand forain. Chacun son tour, lâche un jeton ; 4 alignés = manche gagnée.

- **Boucle** : tour par tour strict entre camps, 10 s par tour (sinon la grille joue un coup propre). La grille **grandit avec le nombre de camps** : 7×6 en duel, jusqu'à 15×10 à 8 couleurs. Grille pleine : la manche va au camp qui a le plus d'alignements de 3.
- **Le twist** : en équipe, les coéquipiers jouent la **même couleur en alternance** : le puissance 4 devient un jeu de communication.
- **Asymétrique : « Le Cerveau »** : un joueur seul contre une Commission qui doit se coordonner.
- **Contrôles** : tap sur une colonne, ghost de visée.

## 🃏 BLACKJACK : classique revisité (le vrai 21, sans attente)

**Pitch** : le vrai blackjack de casino, mise libre comprise, mais tout le monde décide en même temps : zéro attente.

- **Boucle (par main)** : **mise libre** (jetons 1/5/25/100/500, réglette, MIN, ×2, RELANCE, TAPIS : de 1 jeton à tout le tapis), donne, puis décisions **simultanées** : TIRER / RESTER / **DOUBLER** (une seule carte, aussi après split) / **SPLIT** (jusqu à 4 mains ; as splittés : une carte, pas de resplit) / **ABANDON** (moitié de la mise rendue). **Assurance** et **argent comptant** quand la banque montre un as, avec peek du croupier : blackjack de la banque = main réglée aussitôt. La banque tire jusqu à 17. Blackjack payé 3:2 (ou 6:5).
- **Le twist** : cartes réalistes dessinées au Canvas (enseignes vectorielles, figures à double tête, tranche), jetons cylindriques empilés, sabot de 1 à 6 jeux avec carte de coupe visible (comptage possible en sabot simple), table portrait et paysage.
- **Réglages** : mains (3 à 30, pour une vraie soirée), tapis (100/500/2000), sabot (1/2/6 jeux), banque à 17 ou 17 souple, blackjack 3:2 ou 6:5, abandon autorisé ou non, rythme (12/18/30 s).
- **Asymétrique : « Le Croupier »** : le joueur solo EST la banque : il encaisse les pertes, paie les gains, et choisit lui-même de tirer ou rester (libre dès 14). Sa caisse est son score.
- **Contrôles** : tout au doigt sur la table (mise, actions), raccourcis clavier sur PC (Espace tirer, R rester, D doubler, P split, A abandon).

## 🎲 YAMS : classique revisité (le vrai Yam's, simultané)

**Pitch** : le vrai Yam's, feuille complète, mais tout le monde lance en même temps et on voit les dés des autres trembler en direct.

- **Boucle (par tour, 25 s)** : 3 lancers max, touche un dé pour le garder, puis case ton score dans une ligne libre. **Feuille complète (13 tours)** : les 1 à 6 (**bonus +35** à 63 points), brelan, carré, full 25, petite suite 30, grande suite 40, YAMS 50, chance. Feuille express (7 tours) pour les parties rapides.
- **Le twist** : zéro attente, aperçu des points sur chaque ligne libre, jauge de bonus, confirmation avant de caser un zéro, les mini-panneaux des autres tremblent à chaque relance.
- **Asymétrique : « Le Flambeur »** : 4 lancers au lieu de 3. En équipe, on compare les **moyennes** (équipes inégales comparables).
- **Contrôles** : tap sur les dés, bouton LANCER, tap sur la feuille.

## 🚧 BARRIÈRES : original (course et murs, façon Quoridor)

**Pitch** : deux camps face à face. Avance d'une case, ou pose une barrière pour faire faire le grand tour à l'ennemi. Interdit d'emmurer : il reste TOUJOURS un passage.

- **Boucle** : tour par tour entre camps (12 s). Une action : avancer d'1 case (saut par-dessus un pion collé), ou poser une barrière de 2 cases (15 max par joueur). Chaque pose est validée par un **BFS serveur**. Premier pion sur la ligne adverse = camp gagnant.
- **Asymétrique : « Le Contremaître »** : il joue **2 actions par tour**.
- **Contrôles** : tap sur une case surlignée ; bouton BARRIÈRE puis tap sur une rainure, retap pour valider.

## 🐴 PETITS CHEVAUX : classique (Ludo de la Kermesse)

**Pitch** : sors tes chevaux avec un 6, fais le tour de la piste lumineuse, capture tout ce qui traîne, monte ton échelle vers le centre.

- **Boucle** : tour par tour entre camps (10 s) : lance le dé, touche le cheval surligné à jouer. Premier cheval déjà en piste (départ rapide), **6 pour sortir** les suivants, un 6 fait **rejouer** (2 fois max), atterrir sur un ennemi le **capture** (retour à l'écurie), interdit d'atterrir sur soi. Après un tour complet : échelle d'arrivée de 4 cases (les points en trop sont perdus). Premier camp avec tous ses chevaux arrivés gagne.
- **Le twist** : la piste circulaire **s'adapte à 2-8 camps** ; 2 à 4 chevaux par camp au choix du stand.
- **Asymétrique : « Le Jockey »** : à chaque lancer, il peut GARDER son dé ou le RELANCER une fois.
- **Contrôles** : bouton LANCER (ou tap sur le dé), tap sur le cheval à jouer.

## 🥌 PÉTANQUE : classique (pointer, tirer, mesurer)

**Pitch** : le boulodrome sous les lampions. Lance tes boules au plus près du cochonnet, ou dégomme celles des autres d'un tir sec.

- **Boucle (par mène)** : cochonnet en haut du terrain, lancers depuis le cercle. **Glisse pour viser** (direction + longueur = puissance), relâche pour lancer (12 s). Physique complète : roulement, chocs, **carreau**, cochonnet bousculable, boule sortie = morte. C'est toujours le camp qui **n'a pas le point** qui rejoue. Fin de mène : **1 point par boule mieux placée que la meilleure boule adverse**.
- **Le twist** : 3 boules chacun en petit comité, 2 à 4+, 6 par équipe ; cercles de mesure animés au décompte ; la **Fanny** (zéro point) est consignée dans les titres.
- **Asymétrique : « Le Tireur »** : 4 boules et un bras 25 % plus puissant contre la meute des Pointeurs (8 boules).
- **Contrôles** : glisser + bouton LANCER. Flèches + espace au clavier.

## 🚢 BATAILLE NAVALE : classique (salves simultanées)

**Pitch** : chaque camp cache une flotte ; tout le monde arme son tir en secret, tout part en même temps.

- **Boucle** : placement 15 s (auto + bouton MÉLANGER), puis **salves simultanées de 8 s** : touche la mini-grille d'un ennemi, puis une case pour armer ton tir. Au signal, tous les tirs partent : touché / manqué / coulé annoncés. Flotte coulée = camp éliminé (ses joueurs voient alors toutes les flottes). Dernier camp à flot gagne (36 salves max, sinon le moins abîmé).
- **Le twist** : **secret par vue serveur** (chaque joueur ne voit des grilles ennemies que les cases tirées) ; en équipe, une grille commune mais **chaque coéquipier tire une case par salve** ; score individuel aux touches et navires coulés.
- **Asymétrique : « L'Amiral »** : grille 10×10, flotte double, plusieurs tirs par salve.
- **Contrôles** : tap (grille, puis case). Tir auto intelligent au chrono.

## Stands retirés

- **7 FAMILLES** : retiré à la demande (le dossier peut revenir via le contrat de jeu).
- **CANARDS** : remplacé par la PÉTANQUE (même esprit forain, gameplay plus lisible et plus drôle).

## Idée en réserve pour un 12ᵉ stand

**🎭 INCOGNITO** (bluff & paranoïa) : fonds-toi dans une foule de figurants PNJ pendant que des tireurs au réticule essaient de te démasquer. Conçu, non implémenté : le contrat de jeu permet de l'ajouter en créant simplement `games/incognito/`.

## Commun aux jeux

- **Bots** : les forains de la Kermesse (Jacky Churros, Mamie Pétard, Gégé Tirelire…), personnalités différentes (agressivité, précision, temps de réaction), corrects mais faillibles, difficulté réglable dans le lobby.
- **Fin de partie** : classement + stats rigolotes + **titres** décernés (« Le Carreau d'or », « Trop gourmand », « Endormi en selle », « Chair à canon »…).
- **Règles en jeu** : bouton « ? » : mini-tuto illustré (`meta.howto`) + règles complètes (`rules.md`). Les mêmes règles s'ouvrent depuis la galerie de l'accueil.
- **Aperçus** : chaque stand fournit `preview.js` (vignette Canvas 16:9) affichée dans la galerie de l'accueil et le sélecteur du lobby.
- **Spectateurs** : les morts et les arrivants en cours de partie voient tout et peuvent lancer des emotes.
- **Réglages rapides lobby** : durée / manches / variantes par jeu, difficulté des bots.
