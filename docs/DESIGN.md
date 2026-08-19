# Direction artistique : LA KERMESSE

## Le concept : « fête foraine électrique, la nuit »

Une fête foraine française vue de nuit : ciel violet profond, enseignes néon qui bourdonnent, guirlandes d'ampoules, tickets de manège. Chaque jeu est **un stand**. Les bots sont **les forains**. Les titres de fin de partie sont **les lots** qu'on gagne (ou pas).

C'est chaleureux, saturé, un peu kitsch, totalement assumé. Pas de gris Bootstrap : si un élément n'a pas l'air de venir d'une fête foraine la nuit, il est faux.

## Palette (tokens CSS, `client/style.css`)

| Token | Valeur | Usage |
|---|---|---|
| `--nuit` | `#140A26` | Fond global (ciel de nuit) |
| `--nuit-2` | `#1E1038` | Cartes, panneaux |
| `--nuit-3` | `#2A1A4A` | Surfaces surélevées, bordures |
| `--craie` | `#F5EFE6` | Texte principal (blanc chaud, jamais #FFF pur) |
| `--craie-2` | `#B9A8D0` | Texte secondaire |
| `--rose` | `#FF3D8A` | Accent principal, CTA, enseigne |
| `--jaune` | `#FFC93C` | Ampoules, highlights, or |
| `--cyan` | `#29D9FF` | Liens, infos, ping |
| `--vert` | `#3DFF8A` | Succès, prêt, victoire |
| `--rouge` | `#FF4757` | Danger, mort, erreurs |

**Couleurs joueurs (8, dans l'ordre des slots)** : rose `#FF3D8A`, cyan `#29D9FF`, jaune `#FFC93C`, vert `#3DFF8A`, orange `#FF7A3D`, violet `#B14BFF`, bleu `#4D7CFF`, craie `#F0EEE6`. Choisies pour rester distinctes sur fond nuit et pour les daltoniens on double toujours la couleur d'une **forme** (avatar) et d'un **nom**.

## Typographie

- **Display / enseignes : « Bungee »** (Google Fonts, OFL) : dessinée pour la signalétique verticale de fête foraine. Titres, logos de jeux, gros scores. Toujours en capitales, souvent avec glow néon.
- **UI / texte : « Rubik »** (OFL) : ronde, lisible, sympathique. 400/600/800.
- Échelle : `12 / 14 / 16 / 20 / 26 / 36 / 52 px` (tokens `--fs-*`). Base 16, jamais en dessous de 14 pour du texte utile.
- Fallback : `system-ui` (l'app reste utilisable sans réseau vers Google Fonts).

## Spacing & composants

- Échelle d'espacement : `4 / 8 / 12 / 16 / 24 / 32 / 48 px` (tokens `--sp-*`).
- Rayons : `10px` (boutons), `16px` (cartes), `999px` (pills).
- **Enseigne** : titre Bungee + double text-shadow néon + guirlande d'ampoules animées (CSS, `radial-gradient`).
- **Carte-stand** : panneau `--nuit-2`, bordure 2px `--nuit-3`, liseré néon de la couleur du jeu au survol/selection, coin « ticket » perforé (mask CSS).
- **Bouton** : Bungee, fond néon plein, ombre portée dure (`0 4px 0` teinte sombre), enfoncement au clic (`translateY(3px)` + ombre réduite). Variantes : rose (primaire), nuit-3 (secondaire), rouge (danger).
- **Pill joueur** : avatar SVG + pseudo + badge équipe (forme + couleur), état prêt = liseré vert pulsant.
- **Code de room** : affiché comme un ticket de manège (dents de scie CSS), énorme, copiable en un tap.

## Avatars

Génératifs, zéro asset : un jeton rond de la couleur du joueur + un **visage SVG** choisi parmi 12 (combinaisons yeux/bouche/accessoire dessinées à la main en SVG inline). Reconnaissables à 24 px, drôles à 96 px.

## Principes d'animation (le « juice »)

1. **Chaque action a un feedback** dans les 16 ms : visuel + sonore. Sans exception.
2. **Screenshake** : petites doses (3-6 px, 100-200 ms), réservé aux impacts (mort, dash réussi, explosion). Désactivé si `prefers-reduced-motion`.
3. **Particules Canvas** : étincelles (mort), confettis (victoire), poussière (dash), pièces (magot). Pool d'objets, jamais d'allocation par frame.
4. **Texte flottant** : « +5 », « ÉLIMINÉ ! », monte et s'estompe, en Bungee.
5. **Transitions d'écrans** : rideau de fête foraine (balayage de guirlande) entre lobby → jeu → résultats, 300 ms max.
6. **Countdown** : 3-2-1 plein écran, Bungee géant, pop élastique (`scale 1.4 → 1`), note montante.
7. Les manches doivent **claquer** au démarrage et à la fin : flash, fanfare courte, ralenti de 300 ms sur le dernier mort (dilatation du temps côté rendu uniquement).

## Son (WebAudio, 100 % synthèse)

- **SFX courts** (< 300 ms) : oscillateurs (square/triangle) + bruit filtré. Nommés : `click, join, ready, countdown, go, death, dash, boost, pickup, coin, bank, shot, klaxon, win, lose, emote, tick`.
- **Ambiance** : nappe discrète d'orgue de foire (2 oscillateurs détunés + LFO) en lobby, coupée en jeu pour la lisibilité sonore.
- Volume maître + mute persistés en localStorage. AudioContext démarré au premier geste (politique autoplay).

## Lisibilité à 8 joueurs (règles dures)

- Couleur + forme + pseudo au-dessus du pion (pseudo masquable dans INCOGNITO, évidemment).
- Le joueur local a toujours un **anneau blanc pulsant** sous son pion.
- Les ennemis directs > 8 px de rayon minimum à l'écran ; le terrain scale avec `devicePixelRatio`.
- HUD minimal : score/timer en haut, ping discret en coin, contrôles tactiles en bas.
