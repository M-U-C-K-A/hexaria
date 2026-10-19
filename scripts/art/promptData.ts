// Source unique de tous les prompts d'images : alimente la page art/prompts.html ET scripts/art/jobs.json
// (détourage). Pour ajouter une image : ajouter une entrée ici puis lancer `npm run art`.

export type Cat = 'creature' | 'monster' | 'building' | 'prop' | 'terrain' | 'arena' | 'event' | 'title';

export interface Variant {
  label: string;
  file: string;
  prompt: string;
}

export interface Item {
  id: string;
  cat: Cat;
  title: string;
  note: string;
  file: string;
  ratio: string;
  size: string;
  bg: 'white' | 'full';
  prompt: string;
  variants?: Variant[];
  // cartes d'aperçu : fichiers WebP déjà traités (chemins relatifs à src/assets/art/)
  previews: string[];
  chips?: string[];
  // consigne de traitement (écrite dans jobs.json)
  job: {
    kind: 'row' | 'single' | 'objects' | 'background' | 'texture';
    dir: string;
    names: string[];
    maxH?: number;
    maxW?: number;
    gap?: number;
  };
}

// ——— Blocs de style communs ———
export const STYLE =
  'Hand-painted 2D video-game illustration in the style of Hades and Bastion (Supergiant Games): bold dark ink outlines, painterly cel shading with visible brush texture, rich saturated jewel colors, warm amber rim light against cool teal shadows. Original design, dark-fantasy mood with glowing bioluminescent accents.';
export const WHITE = 'Plain pure white background (#FFFFFF), no ground, no ground line, no floor line, no horizon line, no cast shadow, no text, no labels, no watermark, no UI.';
const CREATURE_VIEW =
  'Original creature designs for a Pokémon-like monster collecting game. Three-quarter isometric angle, facing right, full body with feet visible, all standing at the same ground level (do NOT draw any line under them), with wide empty space between the forms.';

// ——— Créatures : 15 lignées de 3 formes ———
interface Line {
  id: string; // id de la créature dans le jeu (= préfixe des sprites)
  file: string; // line_<file>.png
  element: string;
  stages: [string, string, string];
  desc: [string, string, string];
  note: string;
}

export const LINES: Line[] = [
  { id: 'flammeche', file: 'feu', element: 'fire', stages: ['Flammèche', 'Pyrolis', 'Infernyx'], note: 'Renardeau de feu qui devient renard-dragon ailé.',
    desc: ['a small round orange fire-cub with a tiny flame on its tail, big cute eyes', 'a taller fox-like creature with pointed ears and a long flaming tail', 'a large majestic horned fox-dragon with a blazing mane and ember wings'] },
  { id: 'bourgeon', file: 'plante', element: 'plant', stages: ['Bourgeon', 'Sylvanor', 'Ancestrel'], note: 'Faon à pousse qui devient cerf-arbre ancestral.',
    desc: ['a small moss-green sprout fawn with a leaf sprout on its head, big cute eyes', 'a taller forest stag with small leafy antlers, vines along its flanks and little flowers', 'a huge ancient tree-stag with a massive crown of mossy antlers bearing glowing amber blossoms, bark armor and root-like hooves'] },
  { id: 'goutelle', file: 'eau', element: 'water', stages: ['Goutelle', 'Marélis', 'Léviathys'], note: 'Esprit des eaux qui devient léviathan à halo. (Le premier prompt avait été bloqué à tort par un filtre : celui-ci est reformulé.)',
    desc: ['a small round blue water-spirit creature with tiny fins and a glowing pearl on a short stalk, big cute eyes', 'a sleek sea-serpent with flowing translucent fins and a pearl on its forehead', 'a majestic armored leviathan with a long body, huge crest fins, glowing cyan markings and a floating halo ring of water above its head'] },
  { id: 'galet', file: 'roche', element: 'rock', stages: ['Galet', 'Rochard', 'Titanor'], note: 'Golem-caillou qui devient titan de pierre et d\'ambre.',
    desc: ['a small grey-brown pebble golem with a round body, a tuft of moss on its head, stubby arms, big cute eyes', 'a boulder golem with broad shoulders and glowing amber crystal veins', 'a towering titan of stacked stone and large amber crystals, glowing eyes, mossy shoulders'] },
  { id: 'etincelle', file: 'foudre', element: 'electric', stages: ['Étincelle', 'Voltigeur', 'Fulgurion'], note: 'Chacal-électrique qui devient lion-tonnerre.',
    desc: ['a small yellow jackal-cub with big ears and a lightning-bolt shaped tail, big cute eyes', 'a sleek electric hound with a white mane crackling with small lightning arcs', 'a great thunder-lion with a storm-cloud mane, blazing lightning crackling around its body, sharp claws'] },
  { id: 'ombrelin', file: 'ombre', element: 'shadow', stages: ['Ombrelin', 'Spectreval', 'Nécrombre'], note: 'Petit spectre à capuche qui devient spectre ailé.',
    desc: ['a small hooded purple ghost wisp with glowing white eyes and a wispy tail instead of legs', 'a taller spectral phantom with a flowing tattered cloak, small horns and glowing violet eyes', 'a great wraith with huge bat-like spectral wings, a cloak made of starry void, glowing eyes and floating shadow flames'] },
  { id: 'mycelor', file: 'champi', element: 'mushroom', stages: ['Mycelor', 'Sporifère', 'Myconide-roi'], note: 'Champignon lumineux qui devient roi-champignon couronné.',
    desc: ['a small teal glowing mushroom creature with a spotted cap, a white stem, tiny feet and big cute eyes', 'a taller mushroom creature with leaf-like arms, several glowing spotted caps and floating spores', 'a mushroom king with a huge glowing cap like a crown, hanging bioluminescent spores, a mossy beard and glowing eyes'] },
  { id: 'carapix', file: 'carapix', element: 'water crab-turtle', stages: ['Carapix', 'Carapace', 'Bastiodon'], note: 'Crabe-tortue bleu qui devient forteresse à cristaux.',
    desc: ['a small blue crab-turtle with a round shell, tiny claws and big cute eyes', 'an armored crab-turtle with a spiked shell and larger claws', 'a fortress-shell titan crab-turtle with glowing cyan crystal spires on its shell, heavy armored claws'] },
  { id: 'salamandre', file: 'salamandre', element: 'fire salamander', stages: ['Salamandre', 'Pyroscail', 'Drakéon'], note: 'Salamandre de feu qui devient drake ailé.',
    desc: ['a small orange fire salamander with a flame at the tip of its tail, big cute eyes, on four short legs', 'a longer salamander with small horns and spikes along its back and flames on its shoulders', 'a winged fire drake with a flaming mane, big horns, ember wings and glowing eyes'] },
  { id: 'cristallon', file: 'cristal', element: 'crystal golem', stages: ['Cristallon', 'Golem de quartz', 'Colosse prismatique'], note: 'Golem de cristal violet qui devient colosse prismatique.',
    desc: ['a small purple crystal golem with quartz spikes on its back, stubby limbs and big cute glowing eyes', 'a bigger quartz golem with glowing golden cracks and sharp crystal shoulders', 'a prismatic colossus with a halo of floating crystals, rainbow light refracting through its body, towering and imposing'] },
  { id: 'griffon', file: 'griffon', element: 'electric griffin', stages: ['Griffonerre', 'Tonnegriffe', 'Roi-tempête'], note: 'Oisillon-griffon qui devient roi de la tempête.',
    desc: ['a young yellow griffin chick with small wings, a lightning bolt marking on its chest and big cute eyes', 'a griffin with curved horns, bigger wings and crackling electricity along its feathers', 'a storm-king griffin with huge outspread wings, a crown-like halo of lightning, sharp talons and glowing eyes'] },
  { id: 'faucheur', file: 'faucheur', element: 'shadow reaper', stages: ['Faucheur', 'Sombrelame', 'Moissonneur'], note: 'Petit faucheur d\'ombre qui devient moissonneur ailé.',
    desc: ['a small hooded shadow imp with glowing eyes carrying a tiny scythe, big cute eyes', 'a taller reaper with a tattered cloak and a bigger curved scythe', 'a grim harvester with bat-like wings, a huge glowing scythe, a halo of dark violet light and glowing eyes'] },
  { id: 'phenix', file: 'phenix', element: 'fire bird', stages: ['Phénix', 'Phénix ardent', 'Phénix solaire'], note: 'Poussin de braise qui devient phénix solaire.',
    desc: ['a small round fire chick with ember feathers, a tiny flame crest and big cute eyes', 'a graceful fire bird with long flaming tail feathers and blazing wings', 'a majestic solar phoenix with enormous outspread wings of golden fire, a burning sun-halo behind its head and glowing eyes'] },
  { id: 'hydrelle', file: 'hydre', element: 'water hydra', stages: ['Hydrelle', 'Hydre', 'Hydre des abysses'], note: 'Serpent des mers à 1, 2 puis 3 têtes.',
    desc: ['a small blue sea-serpent with ONE head, little fins and big cute eyes', 'a bigger serpent with TWO heads and flowing fins', 'a huge abyssal hydra with THREE heads, glowing teal eyes, crystal spikes along its back and armored scales'] },
  { id: 'dryade', file: 'dryade', element: 'plant dryad', stages: ['Dryade', 'Dryade sylvestre', 'Reine des bois'], note: 'Petite dryade qui devient reine des bois.',
    desc: ['a small green forest sprite girl with leaf hair and big cute eyes, bare feet', 'a taller dryad in a bark dress with flowers in her hair and vines wrapped around her arms', 'a queen of the woods with a crown of living branches and glowing blossoms, wings made of leaves, a staff, glowing eyes'] },
  { id: 'roccotin', file: 'roccotin', element: 'rock boar', stages: ['Roccotin', 'Sanglocher', 'Mastodonte de granit'], note: 'Marcassin de pierre qui devient mastodonte de granit.',
    desc: ['a small grey-brown stone piglet with a round body, tiny tusks, mossy back and big cute eyes, on four stubby legs', 'a sturdy rock boar with granite plates on its back, curved tusks and glowing amber cracks', 'a huge granite mastodon-boar with a mountain-like back of stacked rock and crystal spikes, massive tusks, glowing amber eyes'] },
  { id: 'nimbulle', file: 'nimbulle', element: 'storm cloud spirit', stages: ['Nimbulle', 'Orageon', 'Tonnerrion'], note: 'Petit nuage d\'orage qui devient esprit-tempête couronné.',
    desc: ['a small round fluffy grey storm-cloud spirit with a tiny lightning bolt, sparks and big cute eyes, no legs', 'a bigger dark storm-cloud spirit with crackling lightning arcs, small horns and glowing yellow eyes', 'a majestic thunder spirit made of a swirling storm-cloud with a halo of lightning, a mane of electric arcs, glowing white eyes'] },
  { id: 'corbelune', file: 'corbelune', element: 'shadow raven', stages: ['Corbelune', 'Corbeau nocturne', 'Seigneur des corbeaux'], note: 'Corbeau-lune qui devient seigneur des corbeaux ailé de ténèbres.',
    desc: ['a small round dark-purple raven chick with a crescent-moon mark on its forehead and big cute glowing eyes', 'a sleek night raven with long tail feathers, violet-edged wings and glowing white eyes', 'a lord of ravens with enormous spectral wings made of starry void, a moon-like halo, long tail feathers, glowing eyes'] },
];

// ——— Monstres d'arène ———
interface Mon {
  id: string;
  title: string;
  note: string;
  desc: string;
  ratio?: string;
  maxH?: number;
}

export const MONSTERS: Mon[] = [
  { id: 'loup', title: 'Loup d\'ombre', note: 'Arène 1 · type Ombre', desc: 'a sinister wolf made of shadow, spiked mane, glowing red eyes, snarling, prowling pose' },
  { id: 'champi', title: 'Champignon vénéneux', note: 'Arène 1 · type Plante', desc: 'a poisonous purple mushroom monster with an angry face, toxic pink spores and a mean squat stance' },
  { id: 'golem', title: 'Golem de cristal', note: 'Arène 2 · type Roche', desc: 'a huge crystal golem of dark violet stone with golden crystal growths on its shoulders and back, glowing eyes, heavy fists' },
  { id: 'araignee', title: 'Araignée-éclair', note: 'Arène 2 · type Foudre', desc: 'a giant electric spider with yellow lightning markings on its abdomen, glowing yellow eyes, long sharp legs' },
  { id: 'hydre', title: 'Hydre des marées', note: 'Arène 3 · type Eau', desc: 'a tidal hydra with three heads, dark midnight-blue scales, glowing turquoise eyes, fin crests, coiled body' },
  { id: 'crabe', title: 'Crabe-titan', note: 'Arène 3 · type Eau', desc: 'a massive armored crab with a red-brown spiked shell, huge claws, barnacles and glowing orange eyes' },
  { id: 'dragonnet', title: 'Dragonnet des cendres', note: 'Arène 4 · type Feu', desc: 'a small ember dragon with dark red scales, glowing ember wings, curved horns and smoke from its nostrils' },
  { id: 'harpie', title: 'Harpie de tempête', note: 'Mode aventure · type Foudre', desc: 'a fierce storm harpy, half woman half bird with blue-grey feathered wings crackling with yellow lightning, sharp talons and glowing eyes' },
  { id: 'treant', title: 'Tréant ancestral', note: 'Mode aventure · type Plante', desc: 'an ancient treant, a walking tree with a face in its bark, twisted branches with glowing green leaves, mossy roots as legs, glowing green eyes' },
  { id: 'elementaire', title: 'Élémentaire de braise', note: 'Mode aventure · type Feu', desc: 'an ember elemental, a floating humanoid body of glowing orange magma and flames, cracks of white-hot light, no legs, glowing eyes' },
  { id: 'liche', title: 'Liche des marais', note: 'Mode aventure · type Ombre', desc: 'a swamp lich, a skeletal sorcerer in a tattered dark-green hooded robe, glowing acid-green eyes, a gnarled staff topped with a skull, floating slime' },
  { id: 'dragon', title: 'Vermithrax, Dragon des marais', note: 'Boss final · type Ombre — format 16:9 conseillé', ratio: '16:9', maxH: 900,
    desc: 'a gigantic swamp dragon boss with mossy green-black scales, glowing acid-green eyes, huge tattered wings, long curved horns, a spiked tail and dripping slime, imposing and terrifying' },
];

// ——— Bâtiments ———
interface Bld {
  id: string;
  title: string;
  desc: string;
  note?: string;
}

export const BUILDINGS: Bld[] = [
  { id: 'townhall', title: 'Hôtel de ville', desc: 'a grand town hall of a dark-fantasy kingdom, a stone and timber hall with a tall slender clock tower topped by a teal-tiled spire, glowing amber lanterns and warm lit windows, a golden banner and small stone steps' },
  { id: 'colosseum', title: 'Colisée', desc: 'a round stone arena colosseum with tiers of arches, red banners on poles, and glowing green sand visible inside' },
  { id: 'house', title: 'Maison', desc: 'a cozy cottage with a red clay roof, warm lit windows, a chimney with a thin curl of smoke and a flower box' },
  { id: 'farm', title: 'Ferme', desc: 'a small farm: a square field of golden wheat in rows, a little red barn, a haystack and a scarecrow' },
  { id: 'lumber', title: 'Scierie', desc: 'a lumber mill: a timber shed with a big saw, stacks of cut logs, a log pile and an axe in a stump' },
  { id: 'quarry', title: 'Carrière', desc: 'a stone quarry: a pit cut into grey rock, a wooden crane with a pulley, neatly cut stone blocks and a wheelbarrow' },
  { id: 'mine', title: 'Mine', desc: 'a mine entrance in a rocky hillside, timber supports, a mine cart full of glowing amber ore, a hanging lantern and rails' },
  { id: 'port', title: 'Port', note: 'Le ponton doit s\'avancer vers la DROITE (le jeu retourne l\'image selon le côté de l\'eau).', desc: 'a harbor: a wooden pier extending to the right side, a small warehouse, crates and barrels, a lantern, and a small sailing ship moored at the end of the pier' },
  { id: 'market', title: 'Marché', desc: 'a market with three colorful striped-awning stalls, crates of fruit and fabrics, hanging lanterns and a small signpost' },
  { id: 'auction', title: 'Hôtel des ventes', desc: 'a grand auction house with a golden dome, marble columns, a gavel sign, treasure chests at the entrance and rich banners' },
  { id: 'tavern', title: 'Taverne', desc: 'a tavern with a hanging mug sign, warm glowing windows, barrels by the door, a timber frame and a steep tiled roof' },
  { id: 'barracks', title: 'Caserne', desc: 'a military barracks with a stone watchtower, red banners, a weapon rack and a straw training dummy' },
  { id: 'forge', title: 'Forge', desc: 'a blacksmith forge with a glowing orange furnace, a tall chimney throwing sparks, an anvil, a hammer and a water barrel' },
  { id: 'shrine', title: 'Sanctuaire', desc: 'an ancient mossy stone shrine: a tall glowing green crystal obelisk surrounded by a circle of standing stones, a pillar of light rising from it' },
  { id: 'academy', title: 'Académie', desc: 'a wizard academy: a tall round tower with arched windows, a glowing blue orb on its spire, stacks of books and a banner' },
  { id: 'menagerie', title: 'Ménagerie', desc: 'a wooden creature pen: a fenced enclosure with hay, feeding troughs, a small tent and hanging lanterns' },
  { id: 'warehouse', title: 'Entrepôt', desc: 'a big timber warehouse with a broad gabled roof, wide double doors, stacked crates and sacks, barrels at the side and a hanging lantern' },
  { id: 'observatory', title: 'Observatoire', desc: 'a stone observatory tower on a rocky base with a rotating copper dome, an open slit and a long brass telescope pointing at the sky, glowing blue windows' },
];

// ——— Décor : planches de plusieurs objets (détourés puis découpés automatiquement) ———
interface Sheet {
  id: string;
  title: string;
  note: string;
  ratio: string;
  names: string[];
  list: string;
}

export const PROPS: Sheet[] = [
  { id: 'trees', title: 'Arbres', note: '6 arbres pour les forêts (3 conifères, 3 feuillus).', ratio: '16:9', names: ['tree_1', 'tree_2', 'tree_3', 'tree_4', 'tree_5', 'tree_6'],
    list: 'six different trees: three tall dark pine trees with teal-green needles and glowing moss, and three round broadleaf trees with purple-teal foliage and twisted trunks' },
  { id: 'mushrooms', title: 'Champignons géants', note: '6 champignons lumineux pour les bosquets.', ratio: '16:9', names: ['mushroom_1', 'mushroom_2', 'mushroom_3', 'mushroom_4', 'mushroom_5', 'mushroom_6'],
    list: 'six giant bioluminescent mushrooms of different heights and shapes (teal, green and violet glowing caps with spots), the last one being a small cluster of three' },
  { id: 'crystals', title: 'Cristaux et roches', note: '3 amas de cristaux d\'ambre, 2 rochers, 1 filon d\'or.', ratio: '16:9', names: ['crystal_1', 'crystal_2', 'crystal_3', 'rock_1', 'rock_2', 'ore_1'],
    list: 'six objects: three clusters of glowing amber crystals of different sizes, two mossy grey boulders, and one dark rock with veins of shining gold ore' },
  { id: 'mountains', title: 'Montagnes', note: '4 pics rocheux (l\'un avec un sommet enneigé).', ratio: '16:9', names: ['mountain_1', 'mountain_2', 'mountain_3', 'mountain_4'],
    list: 'four different rocky mountain peaks in blue-grey stone with sharp ridges, two of them with snowy tops, tiny glints of gold ore' },
  { id: 'hills', title: 'Collines', note: '3 collines herbeuses.', ratio: '16:9', names: ['hill_1', 'hill_2', 'hill_3'],
    list: 'three rolling grassy hills with tufts of grass, small flowers and a few embedded stones, seen as low rounded mounds' },
  { id: 'flora', title: 'Buissons et fleurs', note: '3 buissons, 2 parterres de fleurs pour les prairies.', ratio: '16:9', names: ['bush_1', 'bush_2', 'bush_3', 'flowers_1', 'flowers_2'],
    list: 'five small vegetation props: three leafy bushes of different shapes, and two patches of small blue and yellow wildflowers' },
  { id: 'ruins', title: 'Ruines, repaire, menhirs', note: '2 ruines (colonnes, arche), 1 entrée de repaire, 1 cercle de menhirs.', ratio: '16:9', names: ['ruins_1', 'ruins_2', 'lair_1', 'stones_1'],
    list: 'four objects: two ancient ruins (a few broken marble columns overgrown with moss; a half-collapsed arch), one dark cave mouth in a mossy rock with a faint red glow inside, and a small circle of standing stones' },
];

// ——— Textures de terrain ———
interface Tex {
  id: string;
  title: string;
  note: string;
  desc: string;
}

export const TERRAINS: Tex[] = [
  { id: 'plains', title: 'Prairie', note: 'Herbe vive, fleurs minuscules.', desc: 'lush deep-green meadow grass with tiny blue and yellow flowers and darker brush strokes' },
  { id: 'forest', title: 'Forêt', note: 'Sous-bois sombre.', desc: 'dark forest floor with fallen pine needles, moss patches and tiny roots, deep green and brown' },
  { id: 'grove', title: 'Bosquet lumineux', note: 'Mousse luminescente.', desc: 'glowing teal bioluminescent moss with scattered luminous spores and tiny mushrooms' },
  { id: 'hills', title: 'Collines', note: 'Herbe sèche et cailloux.', desc: 'grassy earth with dry olive-green grass, pebbles and small patches of bare soil' },
  { id: 'mountain', title: 'Montagne', note: 'Roche bleu-gris.', desc: 'cracked blue-grey mountain rock with lighter ridges, faint frost and a few tiny gold glints' },
  { id: 'beach', title: 'Grève', note: 'Sable pâle et galets.', desc: 'pale sand with scattered pebbles, shell fragments and soft ripple marks' },
  { id: 'shallow', title: 'Eaux peu profondes', note: 'Eau turquoise, caustiques.', desc: 'turquoise shallow water with luminous caustic light patterns and a sandy bottom showing through' },
  { id: 'ocean', title: 'Océan', note: 'Eau profonde sombre.', desc: 'deep dark teal ocean water with subtle wave highlights and faint foam streaks' },
];

// ——— Fonds d'arène ———
interface Arena {
  id: string;
  title: string;
  note: string;
  desc: string;
}

export const ARENAS: Arena[] = [
  { id: 'marsh', title: 'Marais violet (arène 1)', note: 'Crépuscule, arbres violets, lanternes orange.',
    desc: 'an ancient ruined stone courtyard at twilight: crumbling stone walls with arches in the back, giant twisted trees with glowing purple-magenta foliage framing the left and right, warm orange lanterns on posts, glowing teal mushrooms and amber crystals around the edges, hanging red banners, drifting fog and soft god rays' },
  { id: 'cave', title: 'Grotte de cristal (arène 2)', note: 'Voûte rocheuse, cristaux ambre et violets.',
    desc: 'a vast underground crystal cavern: a rocky vaulted ceiling with stalactites, large glowing amber and violet crystal formations around the edges, faint violet mist, small glowing mushrooms and warm lanterns' },
  { id: 'sea', title: 'Falaise marine (arène 3)', note: 'Nuit, mer et lune, torches turquoise.',
    desc: 'a stone arena on a seaside cliff at night: a moonlit ocean with gentle waves in the back, broken marble pillars, pine trees on the sides, glowing cyan crystals and turquoise torches, sea mist' },
  { id: 'lair', title: 'Antre du dragon (arène 4)', note: 'Marais sombre, lave et squelette.',
    desc: 'a dragon\'s swamp lair: dead black trees, a green-black foggy swamp in the back with a red-orange glow on the horizon, a gigantic skeleton rib cage on one side, cracks of glowing lava, bones and eerie lime-green mist' },
];

// ——— Illustrations d'événements ———
interface Ev {
  id: string;
  title: string;
  note: string;
  desc: string;
}

export const EVENTS: Ev[] = [
  { id: 'mushrooms', title: 'Le Cercle des fées', note: 'Événement « Cercle des fées » et « Source de jouvence ».', desc: 'a clearing in a dark forest with a ring of giant glowing teal mushrooms each as tall as a bear, green spores drifting like a glowing tide; in the center a narrow glowing crack in the ground floating above a hoard of amber gems, with a tall glowing crystal spike on the left' },
  { id: 'caravan', title: 'Caravane du Couchant', note: 'Marchands.', desc: 'a merchant caravan camped at dusk next to a stone road: wagons with striped awnings, amber lanterns, crates and fabrics, a campfire and mysterious artifacts on display' },
  { id: 'shipwreck', title: 'Épave sur la grève', note: 'Naufrage.', desc: 'a broken merchant ship washed up on a moonlit beach, torn sails, crates spilling from the hull, foamy waves and glowing jellyfish lights in the water' },
  { id: 'egg', title: 'L\'Œuf mystérieux', note: 'Un nid et un œuf.', desc: 'a woven nest of branches in a mossy hollow holding a large warm egg veined with shifting glowing patterns, with tiny cracks, fireflies and soft light' },
  { id: 'hatch', title: 'Éclosion', note: 'Fond de l\'éclosion : nid VIDE avec coquille brisée (la créature est dessinée par-dessus par le jeu).', desc: 'the same mossy nest after hatching: a broken eggshell in pieces, the center of the nest EMPTY and bathed in a warm golden-green light, floating sparkles and fireflies (leave the center free: a creature will be drawn there by the game)' },
  { id: 'stars', title: 'Pluie d\'étoiles', note: 'Météores.', desc: 'a night sky torn by golden shooting stars, with amber meteor fragments glowing in a dark field below, a feeling of wonder' },
  { id: 'altar', title: 'Autel d\'ombre', note: 'Pierre noire, runes violettes.', desc: 'a black stone altar carved with glowing violet runes in a dark chamber, a violet flame above it, twisted roots and an ominous whispering atmosphere' },
  { id: 'village', title: 'Fête des moissons', note: 'Village en fête.', desc: 'a cozy hex-kingdom village during a harvest festival at dusk: lanterns strung between timber houses, long tables of food, villagers in silhouette dancing, warm light' },
  { id: 'camp', title: 'Forgeron itinérant / Dresseur', note: 'Campement.', desc: 'a travelling dwarf blacksmith\'s camp beside a road: a portable anvil, a glowing forge, a campfire, hammers, a squat bearded smith in silhouette and a weapon rack' },
  { id: 'ruins', title: 'Ruines englouties', note: 'Bibliothèque, tombeau, campement abandonné.', desc: 'sunken ancient library ruins: broken columns, a mossy arch, floating glowing books in beams of moonlight, vines and mist' },
  { id: 'lair', title: 'Repaire de créature', note: 'Entrée de grotte VIDE (la créature est dessinée par-dessus par le jeu).', desc: 'a shadowy cave mouth in a forest with a faint red-orange glow inside, pine trees on both sides, the dark cave entrance in the center left EMPTY so a creature can be drawn in front of it by the game' },
  { id: 'victory', title: 'Victoire', note: 'Foule en liesse.', desc: 'a packed arena crowd cheering with red banners and torches, golden light streaming onto the empty sand in the center where a cluster of amber crystals glows' },
  { id: 'defeat', title: 'Défaite', note: 'Bannières tombées sous la pluie.', desc: 'a fallen banner and broken weapons on arena sand in the rain, torn red banners, a dim ember glow and a melancholy mood' },
];

// ——— Construction des fiches ———
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function buildItems(): Item[] {
  const items: Item[] = [];

  for (const l of LINES) {
    const sheet = `Game asset sheet: the three-stage evolution line of an original ${l.element} creature, drawn left to right with wide empty space between the three forms. Stage 1 '${l.stages[0]}': ${l.desc[0]}. Stage 2 '${l.stages[1]}': ${l.desc[1]}. Stage 3 '${l.stages[2]}': ${l.desc[2]}. ${STYLE} ${CREATURE_VIEW} ${WHITE}`;
    const variants: Variant[] = l.stages.map((name, i) => {
      const prev = i > 0 ? ` It is the evolution of '${l.stages[i - 1]}' (${l.desc[i - 1]}); keep the same colors and design language, but ${i === 1 ? 'taller and more elegant' : 'much larger and more imposing'}.` : '';
      return {
        label: `Forme ${i + 1} — ${name}`,
        file: `creature_${l.id}_${i + 1}.png`,
        prompt: `Game character sprite: '${name}', stage ${i + 1} of 3 of an original ${l.element} creature line: ${l.desc[i]}.${prev} ${STYLE} Original creature design for a Pokémon-like monster collecting game. Three-quarter isometric angle, facing right, full body with feet visible, centered with generous empty margin. ${WHITE}`,
      };
    });
    items.push({
      id: `line_${l.file}`, cat: 'creature', title: `${l.stages.join(' → ')}`, note: l.note, file: `line_${l.file}.png`, ratio: '3:1', size: '2880 × 960 (largeur ≥ 2000 px)', bg: 'white',
      prompt: sheet, variants, previews: [1, 2, 3].map((i) => `creatures/${l.id}_${i}.webp`), chips: [cap(l.element)],
      job: { kind: 'row', dir: 'creatures', names: [1, 2, 3].map((i) => `${l.id}_${i}`), maxH: 560 },
    });
  }

  for (const m of MONSTERS) {
    items.push({
      id: `monster_${m.id}`, cat: 'monster', title: m.title, note: m.note, file: `monster_${m.id}.png`, ratio: m.ratio ?? '1:1', size: m.ratio === '16:9' ? '2048 × 1152' : '2048 × 2048', bg: 'white',
      prompt: `Game enemy sprite for a dark-fantasy auto-battler: ${m.desc}. Menacing silhouette, three-quarter isometric angle, facing right, full body with feet visible, centered with generous empty margin. ${STYLE} ${WHITE}`,
      previews: [`monsters/${m.id}.webp`],
      job: { kind: 'single', dir: 'monsters', names: [m.id], maxH: m.maxH ?? 640 },
    });
  }

  for (const b of BUILDINGS) {
    items.push({
      id: `building_${b.id}`, cat: 'building', title: b.title, note: b.note ?? 'Se pose sur une case hexagonale.', file: `building_${b.id}.png`, ratio: '1:1', size: '2048 × 2048', bg: 'white',
      prompt: `Isometric game building asset: ${b.desc}, sitting on a small flat stone base about the size of one hexagonal tile. ${STYLE} Seen from a high three-quarter isometric angle (about 35° elevation, like the buildings in Hades and Bastion), centered, the whole building fits in the frame with generous empty margin. ${WHITE}`,
      previews: [`buildings/${b.id}.webp`],
      job: { kind: 'single', dir: 'buildings', names: [b.id], maxH: 720 },
    });
  }

  for (const p of PROPS) {
    items.push({
      id: `props_${p.id}`, cat: 'prop', title: p.title, note: `${p.note} Découpage automatique : les objets doivent être bien séparés par du blanc.`, file: `props_${p.id}.png`, ratio: p.ratio, size: '2880 × 1620', bg: 'white',
      prompt: `Game asset sheet of ${p.names.length} separate environment props for an isometric hex-tile strategy game, arranged in a loose row with wide empty white space between every object so they can be cut out: ${p.list}. All seen from the same high three-quarter isometric angle, each standing on its own tiny patch of ground, similar scale. ${STYLE} ${WHITE}`,
      previews: p.names.map((n) => `props/${n}.webp`), chips: [`${p.names.length} objets`],
      job: { kind: 'objects', dir: 'props', names: p.names, maxH: 420, gap: 40 },
    });
  }

  for (const t of TERRAINS) {
    items.push({
      id: `terrain_${t.id}`, cat: 'terrain', title: t.title, note: t.note, file: `terrain_${t.id}.png`, ratio: '1:1', size: '1024 × 1024', bg: 'full',
      prompt: `Seamless-style top-down hand-painted ground texture for a video game: ${t.desc}. Flat top-down view filling the whole square image edge to edge, no horizon, no perspective, no objects larger than a pebble, no characters, no text. ${STYLE}`,
      previews: [`terrain/${t.id}.webp`],
      job: { kind: 'texture', dir: 'terrain', names: [t.id], maxW: 768 },
    });
  }

  for (const a of ARENAS) {
    items.push({
      id: `arena_${a.id}`, cat: 'arena', title: a.title, note: a.note, file: `arena_${a.id}.png`, ratio: '16:9', size: '2560 × 1440', bg: 'full',
      prompt: `Environment concept painting for an auto-battler arena: ${a.desc}. High three-quarter isometric camera (about 45° from above). In the CENTER, a large completely EMPTY flat circular stone-paved arena floor occupying roughly the middle 60% of the image width (no characters, no objects, no UI on the floor). The surrounding decor frames the edges and the top. ${STYLE} Full-bleed image, no text, no UI, no watermark.`,
      previews: [`arena/${a.id}.webp`],
      job: { kind: 'background', dir: 'arena', names: [a.id], maxW: 2048 },
    });
  }

  for (const e of EVENTS) {
    items.push({
      id: `event_${e.id}`, cat: 'event', title: e.title, note: e.note, file: `event_${e.id}.png`, ratio: '3:2', size: '1800 × 1200', bg: 'full',
      prompt: `Painterly illustration for a story event card in a dark-fantasy strategy game: ${e.desc}. Wide 3:2 composition, atmospheric, strong focal point, soft vignette, no text, no UI, no watermark. ${STYLE}`,
      previews: [`events/${e.id}.webp`],
      job: { kind: 'background', dir: 'events', names: [e.id], maxW: 1400 },
    });
  }

  items.push({
    id: 'title_bg', cat: 'title', title: 'Illustration de l\'écran titre', note: 'Remplace l\'île de démonstration derrière le logo (laisser le centre un peu dégagé).', file: 'title_bg.png', ratio: '16:9', size: '2560 × 1440', bg: 'full',
    prompt: `Key art for the title screen of a dark-fantasy hex-kingdom strategy game: a floating hexagonal island kingdom at dusk, tiny timber houses and a tall clock tower, a glowing bioluminescent mushroom forest, amber crystal outcrops, a distant round colosseum, small silhouettes of fantastical creatures flying in the sky, fog and god rays. Wide cinematic 16:9 composition with a calmer, darker area in the center where a logo will be placed. ${STYLE} No text, no logo, no UI, no watermark.`,
    previews: ['title/bg.webp'], job: { kind: 'background', dir: 'title', names: ['bg'], maxW: 2048 },
  });

  return items;
}

export const CAT_LABELS: Record<Cat, string> = {
  creature: 'Créatures (lignées à 3 formes)',
  monster: 'Monstres d\'arène',
  building: 'Bâtiments',
  prop: 'Décor (planches d\'objets)',
  terrain: 'Textures de terrain',
  arena: 'Fonds d\'arène',
  event: 'Illustrations d\'événements',
  title: 'Écran titre',
};
