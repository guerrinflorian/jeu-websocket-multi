# Crédits & licences

Tout l'art de La Kermesse est généré (CSS, SVG inline, Canvas) : aucune
image embarquée. Les cartes à jouer, les dés, les jetons, les boules, les
cylindres et les chars sont dessinés procéduralement au Canvas
(`client/cardkit.js`, `client/juice.js` et les clients de jeux).

## Sons (`client/sfx/`, 47 fichiers, 450 Ko)

Échantillons de **Kenney Vleugels ([kenney.nl](https://kenney.nl))**, publiés
en **CC0 1.0 (domaine public)** : utilisables librement, y compris
commercialement, sans attribution obligatoire. On le fait quand même, c'est
la moindre des choses.

| Banque | Ce qu'on en tire |
|---|---|
| Casino Audio | jetons posés, piles remuées, cartes qui glissent, mélange du sabot, dés secoués et jetés |
| Interface Sounds | clics, confirmations, retours, erreurs, tic-tac |
| Digital Audio | départ, victoire, défaite, réussite, chute, accélération |
| Impact Sounds | coups, ricochets métalliques, pions posés, bille dans sa case |
| Sci-Fi Sounds | canon des chars, explosions |

Le moteur (`client/sfx.js`) tire **une variante au hasard parmi 2 ou 3** pour
chaque action, avec un léger décalage de hauteur : dix jetons posés d'affilée
ne sonnent pas comme une mitraillette. Si le navigateur ne lit pas l'Ogg
Vorbis, ou si un fichier manque, **chaque son retombe sur sa version
synthétisée en WebAudio** : le jeu n'est jamais muet. Le roulement du
cylindre de la roulette et la nappe d'orgue du lobby restent synthétisés,
faute d'échantillon qui boucle proprement.

## Polices (chargées depuis Google Fonts, non embarquées)

- **Bungee** : David Jonathan Ross. SIL Open Font License 1.1.
- **Rubik** : Hubert & Fischer, Meir Sadan, Cyreal. SIL Open Font License 1.1.

L'application reste fonctionnelle sans réseau vers Google Fonts
(repli `system-ui`).

## Dépendances

- **ws** (MIT) : serveur WebSocket Node.
- **playwright** (Apache-2.0) : dev uniquement, smoke test navigateur.
