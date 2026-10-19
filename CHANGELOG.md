# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; versions [SemVer](https://semver.org/lang/fr/).

## [0.3.0] — 2026-10-19

### Ajouté
- **Tutoriel guidé** : bulles lumineuses et étapes « à vous de jouer » qui avancent quand l'action est faite. Chapitres carte (12 étapes), événement, arène (9 étapes) et bilan du premier combat ; se rejoue depuis le menu ou les Options.
- **Nouvelle partie** : trois **difficultés** (Apprenti, Chevalier, Légendaire : cœurs, ressources de départ, puissance des monstres, récompenses), **graine** du royaume (nombre ou mot, « Graine du jour »).
- **Mode aventure** : après Vermithrax, on peut poursuivre avec des paliers générés (de 4 à 8 monstres, un Gardien tous les 4 paliers, puissance +8,5 % par palier), sans fin.
- **Hauts faits** (18, dont un secret) et annales persistantes, notification 🏆, nouvel onglet du Codex.
- **Contenu** : 3 lignées de créatures (Roccotin, Nimbulle, Corbelune), 4 monstres (Harpie de tempête, Tréant ancestral, Élémentaire de braise, Liche des marais), 2 bâtiments (Entrepôt, Observatoire), 6 reliques (Sablier de bronze, Graine d'Yggdrasil, Épée du dresseur, Bouclier de l'aube, Compas des cartographes, Sceau du vampire) et 8 événements (Marché noir, Tempête de foudre, Sanctuaire des éléments, Enfants des bois, Défi du champion, Oracle des marais, Fossile géant, Graines rares).
- Bouton ⚙ en jeu (options, tutoriel, retour au menu principal) ; règles « Difficultés » et « Mode aventure » dans le Codex.
- `scripts/balance2.ts --adventure` mesure la courbe des paliers ; nouvelles fiches dans `art/prompts.html` (81 au total).

### Documentation
- **README refondu** (français et anglais) : guide de première partie, boucle de jeu acte par acte, adjacences, économie de l'arène, 15 lignées, FAQ, tableau des versions et feuille de route.
- **Clips de jeu animés** (`docs/media/*.webp`) enregistrés image par image avec une horloge simulée : évolution en chaîne et combat, survol du royaume (`scripts/readme/clips.mjs`, scènes `?shot=combatlive` et `?shot=worldlive`).
- **Nouveaux SVG animés** clair/sombre à fond transparent, en français et en anglais : bannière, chiffres clés, adjacences, économie de l'arène, défilé du bestiaire, pipeline d'images, architecture, feuille de route, boutons de téléchargement.
- **Trois nouvelles figures Hairline** (plateau d'arène, œuf mystérieux, Codex) en plus du royaume, converties en SVG animés par un convertisseur générique (`scripts/readme/hairline-svg.mjs`).

### Modifié
- Équilibrage des arènes 2, 3 et 4 recalibré avec les nouvelles créatures (taux de victoire du robot « normal » : 92 / 76 / 71 / 64 %).
- La page des prompts et le README (FR/EN) décrivent les nouveautés ; l'écran titre affiche la version.

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
