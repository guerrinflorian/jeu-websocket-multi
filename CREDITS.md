# Crédits & licences

Tout l'art de La Kermesse est généré (CSS, SVG inline, Canvas) et tout le
son est synthétisé en WebAudio. Aucun asset binaire embarqué. Les cartes à
jouer, les dés, les jetons et les boules sont dessinés procéduralement au
Canvas (`client/cardkit.js` et les clients de jeux), sans sprite externe.

## Polices (chargées depuis Google Fonts, non embarquées)

- **Bungee** : David Jonathan Ross. SIL Open Font License 1.1.
- **Rubik** : Hubert & Fischer, Meir Sadan, Cyreal. SIL Open Font License 1.1.

L'application reste fonctionnelle sans réseau vers Google Fonts
(repli `system-ui`).

## Dépendances

- **ws** (MIT) : serveur WebSocket Node.
- **playwright** (Apache-2.0) : dev uniquement, smoke test navigateur.
