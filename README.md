<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/hero-dark.svg">
  <img alt="Hexaria — Royaumes & Arènes" src="docs/assets/hero-light.svg" width="100%">
</picture>

[![Version](https://img.shields.io/github/v/release/M-U-C-K-A/hexaria?style=flat-square&color=d39a2c&label=version)](https://github.com/M-U-C-K-A/hexaria/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/M-U-C-K-A/hexaria/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/M-U-C-K-A/hexaria/actions)
![Plateforme](https://img.shields.io/badge/macOS-12%2B%20·%20Apple%20silicon%20%26%20Intel-1b2823?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-Canvas%202D-3178c6?style=flat-square)
[![Licence](https://img.shields.io/badge/licence-MIT-0b8a73?style=flat-square)](LICENSE)

**[Télécharger](https://github.com/M-U-C-K-A/hexaria/releases/latest)** · **[Jouer en 3 commandes](#-lancer-le-jeu)** · **[Boucle de jeu](#-la-boucle-de-jeu)** · **[Créatures & types](#-créatures-types-et-évolutions)** · **[Images & prompts](#-images--générer-avec-sa-propre-ia)** · [English](README.en.md)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/divider-dark.svg">
  <img alt="" src="docs/assets/divider-light.svg" width="100%">
</picture>

</div>

**Hexaria** est un roguelike solo pour macOS à mi-chemin entre trois mondes :

- **Civilization** : une île hexagonale à bâtir, des bâtiments posés selon le terrain, des bonus d'adjacence, des villageois bâtisseurs et ouvriers ;
- **Pokémon** : des créatures à types élémentaires, des évolutions, des captures et même des œufs et des variantes chromatiques ;
- **TFT / Dota Auto Chess** : des arènes en auto-battler, avec boutique, relances, placement sur les hexagones et combats automatiques.

Tout est dessiné en 2D isométrique, dans une ambiance sombre et luminescente (références : Bastion, Hades). Les personnages,
monstres, bâtiments et décors sont des **sprites peints** animés par le moteur ; le rendu procédural d'origine sert de filet de
sécurité pour tout ce qui n'a pas encore d'illustration.

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/features-dark.svg">
  <img alt="Bâtissez, combattez, capturez, dominez les types" src="docs/assets/features-light.svg" width="100%">
</picture>

</div>

## 📸 Aperçu

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/title.jpg" alt="Écran titre"><br><sub><b>Écran titre</b> : Continuer, Nouvelle partie, Bestiaire, Types & ascendants, Options…</sub></td>
    <td width="50%"><img src="docs/screenshots/world.jpg" alt="Le royaume"><br><sub><b>Le royaume</b> : bâtiments posés selon le terrain, piste de progression en haut, budget et menu de construction.</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/worldzoom.jpg" alt="Zoom sur la ville"><br><sub><b>Zoom ×3</b> : bâtiments peints, fumées, lanternes et filons de cristal.</sub></td>
    <td><img src="docs/screenshots/arena.jpg" alt="Phase de préparation en arène"><br><sub><b>Arène, préparation</b> : boutique de 5 cartes, banc de réserve et placement des créatures.</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/fight.jpg" alt="Combat automatique"><br><sub><b>Combat automatique</b> : synergies actives à gauche, dégâts infligés à droite, créature chromatique ✦ dans la boutique.</sub></td>
    <td><img src="docs/screenshots/boss.jpg" alt="Combat de boss"><br><sub><b>Vermithrax</b>, le dragon des marais, et sa couvée.</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/event.jpg" alt="Événement"><br><sub><b>Événements</b> : illustration à gauche, trois choix à droite, à la manière d'un roguelike.</sub></td>
    <td><img src="docs/screenshots/hatch.jpg" alt="Éclosion d'un œuf"><br><sub><b>Éclosion</b> : un œuf mystérieux révèle sa créature (peut-être chromatique !).</sub></td>
  </tr>
</table>

## 🚀 Lancer le jeu

### Application macOS (recommandé)

1. Téléchargez **`Hexaria-0.2.0-macOS.zip`** depuis la [dernière release](https://github.com/M-U-C-K-A/hexaria/releases/latest) (binaire universel : Apple silicon et Intel, macOS 12+).
2. Décompressez, puis glissez `Hexaria.app` dans `Applications`.
3. L'app n'est pas notariée par Apple (signature ad hoc). Au premier lancement : **clic droit › Ouvrir**, ou dans un terminal :

   ```bash
   xattr -dr com.apple.quarantine /Applications/Hexaria.app
   ```

La sauvegarde est stockée dans les préférences de l'app (`UserDefaults`), à l'abri du navigateur.

### Depuis les sources

```bash
git clone https://github.com/M-U-C-K-A/hexaria.git
cd hexaria
npm install
npm run dev          # http://localhost:5173 dans le navigateur
npm run mac          # construit build/Hexaria.app (universelle, ≈ 12 Mo)
```

Le build web (`npm run build`, dossier `dist/`) est aussi publié dans chaque release : `Hexaria-0.2.0-web.zip` se sert avec n'importe quel serveur statique.

<details>
<summary><b>Toutes les commandes</b></summary>

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement Vite |
| `npm run check` | Vérification TypeScript |
| `npm run build` | Build web de production dans `dist/` |
| `npm run mac` | Construit `build/Hexaria.app` (lanceur Swift + WKWebView, universel) |
| `npx tsx scripts/balance2.ts [n]` | Robot acheteur : taux de victoire par arène et par budget d'or (`--tune` règle la puissance des rencontres) |
| `npm run balance` | Ancien simulateur de combats |
| `npm run art` | Détoure et intègre les images de `art/raw/`, régénère `art/prompts.html` |
| `npm run shots` | Régénère les captures du README (Chrome headless) |
| `node scripts/readme/svgs.mjs` | Régénère les SVG animés du README |
| `node scripts/readme/hairline-svg.mjs` | Régénère la figure Hairline animée |

Pages de développement (avec `npm run dev`) : `/?gallery` montre toutes les créatures (★1 → ★3), monstres et bâtiments ; `/?icon` régénère l'icône ; `/?shot=<scène>` met le jeu en scène pour les captures.

</details>

## 🔁 La boucle de jeu

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/loop-dark.svg">
  <img alt="Tour de gestion, événement, arène, récompense, boss" src="docs/assets/loop-light.svg" width="100%">
</picture>

</div>

Une partie dure **22 tours répartis en 4 actes** : des tours de gestion, des événements `?`, trois arènes `⚔` et le boss final `☠`.
Vous avez **3 cœurs** ; une défaite en arène en coûte un.

1. **Royaume (carte hexagonale).** Placez des bâtiments selon le terrain : ferme en prairie, scierie en forêt, mine en montagne,
   port au bord de l'eau… Les **adjacences** comptent (voir plus bas).
2. **Villageois.** Ils se répartissent entre **bâtisseurs** (points de construction) et **ouvriers** (un bâtiment productif sans
   ouvrier est à l'arrêt). La nourriture fait croître la population.
3. **Événements.** Un texte, une illustration, trois choix : un pari, un échange, une capture, une relique… Certains coûtent un cœur.
4. **Arène (auto-battler).** Votre or devient votre budget : environ **1 min 30** pour acheter des créatures (boutique de 5, relance
   à 2 or), les placer sur votre moitié du plateau, puis le combat se déroule seul. **Tout l'or dépensé vous est rendu**
   après le combat, plus la récompense de victoire : acheter n'est jamais un sacrifice, seulement un pari sur sa composition.
5. **Récompenses.** Reliques, compagnons capturés et **œufs mystérieux**.
6. **Boss.** Vermithrax, le dragon des marais, ferme la partie.

### Bâtir un royaume : bâtiments et adjacences

Seize bâtiments, chacun limité à certains terrains. Les bonus d'adjacence récompensent un plan de ville réfléchi :

| Famille | Bâtiment | Effet |
| --- | --- | --- |
| Cœur | **Hôtel de ville** | +3 or, +2 nourriture, +1 bois, +1 pierre ; logement +4 |
| Cœur | **Colisée** | accueille les combats d'arène |
| Économie | **Maison** | logement +2 ; +1 nourriture près d'une ferme |
| Économie | **Ferme** | +3 nourriture ; +1 par ferme voisine (max +2), +1 près de l'eau |
| Économie | **Scierie** | +2 bois ; +1 par forêt voisine (max +3) |
| Économie | **Carrière** | +2 pierre ; +1 par colline ou montagne voisine (max +3) |
| Économie | **Mine** | +2 or ; +3 sur filon d'or, +5 sur cristaux |
| Économie | **Port** | +2 or, +1 nourriture ; +2 nourriture par banc de poissons voisin |
| Économie | **Marché** | +3 or ; +1 par maison voisine (max +3), +2 près de l'hôtel de ville |
| Économie | **Hôtel des ventes** | +4 or ; **+5 à côté d'un port**, +2 à côté d'un marché |
| Combat | **Taverne** | +2 relances gratuites en arène, +1 or |
| Combat | **Caserne** | +1 créature sur le plateau (max 3) |
| Combat | **Forge** | +10 % d'attaque ; +5 % à côté d'une mine |
| Combat | **Sanctuaire** | +12 % de PV ; +8 % sur ou près d'un bosquet lumineux |
| Combat | **Académie** | de meilleures chances de créatures rares en boutique |
| Combat | **Ménagerie** | +1 emplacement de compagnon |

Les bâtiments de combat s'achètent **avant** l'arène : c'est la tension du jeu entre développer l'économie et se préparer à frapper.

## 🐾 Créatures, types et évolutions

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/types-dark.svg">
  <img alt="Cycle des types élémentaires" src="docs/assets/types-light.svg" width="100%">
</picture>

</div>

Six éléments, un cycle d'ascendants façon Pokémon. Une attaque **super efficace** inflige **×1,5**, une attaque **peu efficace** **×0,7**.

| Attaquant | Domine | Synergie d'équipe (2 / 4 créatures distinctes) |
| --- | --- | --- |
| 🔥 **Feu** | Plante | **Brasier** : +15 % / +35 % de dégâts, les attaques brûlent |
| 💧 **Eau** | Feu, Roche | **Marée** : soigne l'équipe de 4 % / 8 % des PV max toutes les 3 s |
| 🌿 **Plante** | Eau, Roche | **Sylve** : +20 % / +45 % de PV max |
| ⚡ **Foudre** | Eau | **Orage** : +20 % / +45 % de vitesse d'attaque |
| 🪨 **Roche** | Feu, Foudre | **Rempart** : 15 % / 30 % de réduction de dégâts |
| 🌑 **Ombre** | Ombre | **Crépuscule** : vol de vie et critique de 15 % / 30 % |

Il y a **15 lignées de créatures** de trois formes chacune (de Tier 1 à 4 selon la rareté en boutique), **8 monstres** pour les
arènes et le boss, **16 reliques** et **15 événements**. Trois exemplaires identiques fusionnent en une forme évoluée (**×1,8**
de stats en ★2, **×3,24** en ★3).

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/evolution-dark.svg">
  <img alt="Lignées Flammèche et Goutelle avec leur variante chromatique" src="docs/assets/evolution-light.svg" width="100%">
</picture>

</div>

### La petite surprise : œufs et chromatiques ✦

- Des **œufs mystérieux** (récompense de victoire ou événement) éclosent après 2 à 3 tours. L'éclosion a toujours lieu : on remplace un
  compagnon, ou on vend le nouveau-né à l'éleveur (+12 or).
- Des créatures **chromatiques** aux couleurs alternatives, avec **+20 % de PV et d'attaque** : 1 chance sur 8 à l'éclosion, 6 % en
  boutique d'arène, 10 % à la capture dans un repaire.

## ⚔️ L'arène

L'arène est un plateau hexagonal en deux moitiés : à vous les hexagones du bas. Le décor change d'une arène à l'autre (marais
violet, grotte de cristal, bord de mer, antre du dragon) ; la molette zoome sur les détails.

- **Boutique** de 5 cartes, relance à 2 or (gratuite avec la Taverne), vente d'une créature au clic droit ou avec `E`.
- **Banc** de réserve : les créatures y attendent, le plateau n'accueille que ce que la Caserne autorise.
- **Compagnons** : capturés dans les repaires ou par événements, ils rejoignent votre banc **gratuitement** à chaque arène.
- **Sorts** : chaque créature a sa capacité (soin, zone, bouclier, étourdissement…), détaillée dans le Codex.

| Arène | Rencontre | Récompense |
| --- | --- | --- |
| 1 | **Les Crocs de la Lisière** : meute de loups d'ombre et champignon vénéneux | 15 or |
| 2 | **Le Nid de Cristal** : golem colossal et araignées crépitantes | 25 or |
| 3 | **Les Marées Noires** : hydre des marées et deux crabes-titans | 35 or |
| 4 | **Vermithrax** : dragon des marais et sa couvée, combat final | — |

### Équilibrage mesuré, pas deviné

Chaque rencontre a un coefficient de puissance (`power`, dans `src/data/creatures.ts`) calibré avec un **robot acheteur**
(`scripts/balance2.ts`) qui joue la boutique avec trois budgets d'or. Objectif : une courbe de difficulté régulière plutôt qu'une
arène facile suivie d'un mur.

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/balance-dark.svg">
  <img alt="Taux de victoire du robot par arène et par budget d'or" src="docs/assets/balance-light.svg" width="100%">
</picture>

</div>

## 📖 Codex et options

Le menu principal ouvre le **Codex**, accessible aussi en jeu avec la touche `C` ou le bouton 📖.

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/codex.jpg" alt="Bestiaire"><br><sub><b>Bestiaire</b> : stats par étoile, groupe, rôle, sort, forces et faiblesses.</sub></td>
    <td width="50%"><img src="docs/screenshots/codexmonsters.jpg" alt="Monstres et arènes"><br><sub><b>Monstres & arènes</b> : qui les domine, quels compagnons les affrontent le mieux, or conseillé.</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/codextypes.jpg" alt="Types et ascendants"><br><sub><b>Types & ascendants</b> : matrice des types, groupes et synergies.</sub></td>
    <td><img src="docs/screenshots/codexcross.jpg" alt="Matrice complète"><br><sub><b>Matrice complète</b> 23 × 23 : qui a l'ascendant sur qui, créature par créature.</sub></td>
  </tr>
</table>

Chaque tableau a son encart « Comment lire ce tableau ». Les onglets **Bâtiments**, **Reliques** et **Règles & glossaire** complètent
le Codex. Les **Options** règlent les volumes, le son, la vitesse de combat par défaut, les effets d'ambiance, les chiffres de
dégâts et les info-bulles, et permettent d'effacer la sauvegarde.

## 🎨 Images : générer avec sa propre IA

Aucune image n'est figée : le jeu est conçu pour être **illustré avec n'importe quelle IA d'images**.

<p align="center"><img src="docs/screenshots/prompts.jpg" alt="Page des prompts" width="86%"></p>

Ouvrez [`art/prompts.html`](art/prompts.html) (double-clic, ou [aperçu en ligne](https://htmlpreview.github.io/?https://github.com/M-U-C-K-A/hexaria/blob/main/art/prompts.html))
: **72 fiches** avec le prompt prêt à copier, le format, la taille conseillée et le nom de fichier exact pour chaque personnage,
monstre, bâtiment, planche de décor, texture de terrain, fond d'arène, illustration d'événement et écran titre.

```
prompt (art/prompts.html)  →  IA d'images  →  art/raw/<nom>.png
        ↓ npm run art : détourage du fond blanc, suppression des lignes de sol, découpe des planches, WebP
src/assets/art/**  +  manifest.json  →  src/render/sprites.ts  →  sprites animés dans le jeu
```

Le moteur d'animation « marionnette » (`src/render/sprites.ts`) découpe chaque sprite en 18 bandes horizontales pour obtenir :
respiration, balancement, bond à la marche, recul d'élan puis fente à l'attaque, flash blanc au coup, sort, étourdissement, mort.
Tout ce qui manque garde le rendu procédural. La source unique des prompts est `scripts/art/promptData.ts`.

> Les illustrations fournies avec le dépôt ont été **générées par IA** puis détourées par le pipeline ci-dessus.
> Les images brutes (≈ 120 Mo) ne sont pas versionnées : seul le résultat est dans `src/assets/art/`.

## ✒️ Figure Hairline

Un clin d'œil de l'auteur : le royaume de Hexaria redessiné en **figure Hairline** (moteur
[`@lucasmarkes/hairline`](https://hairline.lucasmarkes.com), licence MIT) : une tuile hexagonale avec sa tour de l'horloge, son
colisée et son obélisque de cristal, dessinés d'un seul trait. Dans la version interactive, le pointeur choisit une bâtisse, qui
s'élève pendant que les autres s'écartent.

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/hairline-realm-dark.svg">
  <img alt="Figure Hairline : un royaume sur sa tuile, une bâtisse s'élève pendant que les autres s'écartent" src="docs/assets/hairline-realm-light.svg" width="620">
</picture>

**[▶ Essayer la figure interactive](https://htmlpreview.github.io/?https://github.com/M-U-C-K-A/hexaria/blob/main/docs/hairline/hairline-realm.html)**

</div>

La source de la figure est dans [`docs/hairline/realm.js`](docs/hairline/realm.js) ; `scripts/readme/hairline-svg.mjs` en tire le SVG animé ci-dessus.

## 🎮 Commandes

| Carte | Arène |
| --- | --- |
| Glisser : déplacer la caméra | Clic sur une carte : acheter |
| Molette : zoom (jusqu'à ×4,2) | Glisser : placer une créature · molette : zoom |
| `1`–`9` : choisir un bâtiment · `Tab` : changer d'onglet | Clic droit / `E` : vendre |
| Clic droit / `Échap` : annuler | `D` : relancer la boutique |
| `Espace` : terminer le tour | `Espace` : lancer le combat |
| `M` : couper le son · `C` : Codex | ×1 ×2 ×3 : vitesse du combat |

## 🧱 Architecture

```
src/
  app.ts               boucle, scènes, entrées
  audio.ts             effets et musique générative (WebAudio, aucun fichier audio)
  settings.ts          options persistées
  core/                maths hexagonales, projection isométrique, RNG déterministe
  data/                contenu pur : terrains, bâtiments, créatures, monstres, arènes, reliques, événements, types
  game/                logique sans rendu : état et sauvegarde, génération de carte, économie, simulation de combat
  render/              tuiles, bâtiments, créatures, sprites peints, décors d'arène, particules
  scenes/              titre, carte du monde, arène
  ui/                  Codex, modales d'événement, icônes, styles
  dev/shots.ts         mise en scène pour les captures (développement uniquement)
mac/HexariaApp.swift   lanceur natif Cocoa + WKWebView, schéma hexaria://, sauvegarde UserDefaults
scripts/               build macOS, simulateur d'équilibrage, pipeline d'images, génération du README
art/prompts.html       page des prompts d'images (générée)
docs/                  captures d'écran, SVG animés, figure Hairline
```

Le contenu est piloté par les données : ajouter une créature, une arène ou un événement dans `src/data/` ne demande pas de toucher au
moteur. La logique de combat est indépendante du rendu, ce qui permet de la simuler en Node pour l'équilibrage.

## 🗺️ Pistes pour la suite

- **Mode aventure** : des rencontres plus longues avec davantage de monstres (`ENCOUNTERS` accepte déjà un nombre quelconque
  d'ennemis) et une carte du monde plus grande.
- Objets à équiper sur les créatures, traits de classe (gardien, assassin…) en plus des types.
- Âges et technologies façon Civ qui débloquent bâtiments et créatures.
- Villageois animés sur la carte, cycle jour/nuit, météo.
- Musique et sons composés, et sprites pour les monstres et bâtiments restants (voir la page des prompts).

Voir le [journal des modifications](CHANGELOG.md) pour l'historique.

## Licence

Code sous licence [MIT](LICENSE). Les illustrations ont été générées par IA pour ce projet.
