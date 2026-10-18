# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; versions [SemVer](https://semver.org/lang/fr/).

## [0.2.0] — 2026-10-18

### Ajouté
- **Sprites peints animés** (créatures, monstres, bâtiments, props, textures de terrain, fonds d'arène, illustrations d'événements, écran titre) avec un moteur d'animation « marionnette » et repli procédural.
- **Pipeline d'images** : `art/prompts.html` (72 fiches de prompts prêtes à copier), `npm run art` (détourage, découpe de planches, WebP, manifeste), dépôt direct sur la page en développement.
- **Codex** (touche `C`, bouton 📖, menu principal) : Bestiaire, Monstres & arènes, Types & ascendants (matrice 23 × 23 et comparateur), Bâtiments, Reliques, Règles & glossaire, avec encarts « Comment lire ce tableau ».
- **Options** : volumes, son, vitesse de combat par défaut, effets d'ambiance, chiffres de dégâts, info-bulles, effacement de la sauvegarde.
- **La petite surprise** : œufs mystérieux qui éclosent après 2-3 tours et créatures **chromatiques** ✦ (+20 % PV et attaque).
- **Décor d'arène** en couches pour les quatre ambiances, plateau en relief, banc de réserve en bois.
- **Zoom** : carte jusqu'à ×4,2 (rendu direct net), arène plus grande avec zoom à la molette.
- **Outils** : `npm run shots` (captures d'écran), simulateur d'équilibrage `scripts/balance2.ts`, SVG animés du README, figure Hairline.
- Application macOS **universelle** (Apple silicon + Intel).

### Modifié
- **Équilibrage** : coefficient `power` par rencontre calibré par simulation ; difficulté plus régulière d'une arène à l'autre.
- Les œufs éclosent toujours : remplacer un compagnon ou vendre le nouveau-né à l'éleveur (+12 or).

### Corrigé
- Détourage : les aplats sombres à l'intérieur d'un corps (écorce, ombres) ne sont plus pris pour des lignes de sol.

## [0.1.0] — prototype

- Carte hexagonale isométrique, bâtiments et adjacences, villageois, événements, arènes d'auto-battler, évolutions, reliques, sauvegarde, lanceur macOS natif.
