import { meta } from '../meta';
import type { RNG } from '../core/rng';
import { combatBonuses, popCap } from '../game/economy';
import { type GameState, shinyChance } from '../game/state';
import { BASE_ARENAS, encounterAt } from './adventure';
import { CREATURES, CREATURE_BY_ID, MONSTERS, type CreatureDef } from './creatures';
import { ELEMENTS, weakAgainst } from './elements';
import { RELICS, RELIC_BY_ID } from './relics';
import type { IconName } from './types';

export type ArtTheme =
  | 'mushrooms' | 'caravan' | 'shipwreck' | 'egg' | 'stars' | 'altar' | 'village' | 'camp' | 'ruins' | 'lair' | 'victory' | 'defeat';

export interface EventChoice {
  label: string;
  desc: string;
  icon: IconName;
  check?: (s: GameState) => string | null;
  apply: (s: GameState, rng: RNG) => string;
}

export interface GameEvent {
  id: string;
  title: string;
  text: string;
  art: ArtTheme;
  source: 'track' | 'ruins' | 'any';
  choices: EventChoice[];
  creature?: string;
  shiny?: boolean;
}

// ——— Aides partagées (événements et récompenses) ———

export function grantRelic(s: GameState, rng: RNG, filter?: (id: string) => boolean): string {
  const pool = RELICS.filter((r) => !s.relics.includes(r.id) && (!filter || filter(r.id)));
  if (!pool.length) {
    s.res.gold += 15;
    return 'Vous possédez déjà toutes ces reliques : +15 or à la place.';
  }
  const r = rng.weighted(pool, (x) => 4 - x.rarity);
  s.relics.push(r.id);
  return `Relique obtenue : ${r.name} — ${r.desc}`;
}

export function giveRelic(s: GameState, id: string, rng: RNG): string {
  if (s.relics.includes(id)) return grantRelic(s, rng);
  s.relics.push(id);
  const r = RELIC_BY_ID[id];
  return `Relique obtenue : ${r.name} — ${r.desc}`;
}

export function companionFull(s: GameState): string | null {
  return s.companions.length >= combatBonuses(s).companionSlots ? 'Ménagerie pleine (construisez une Ménagerie)' : null;
}

export function addCompanion(s: GameState, id: string, star = 1, shiny = false): string {
  s.companions.push({ id, star, shiny });
  if (shiny) meta.shiny();
  const c = CREATURE_BY_ID[id];
  return `${shiny ? '✦ Chromatique ! ' : ''}${c.names[star - 1]} (${ELEMENTS[c.element].name}) rejoint vos compagnons ! Il vous accompagnera gratuitement dans chaque arène.`;
}

// Œuf mystérieux : éclot dans quelques tours (voir hatchEvent).
export function addEgg(s: GameState, minTier: number, maxTier: number, turns = 3): string {
  s.eggs.push({ turns, minTier, maxTier });
  return `Un œuf tiède et veiné de lueurs rejoint votre ménagerie. Il éclora dans ${turns} tours… Qui sait ce qui en sortira ?`;
}

export function hatchEvent(s: GameState, rng: RNG, egg: { minTier: number; maxTier: number }): GameEvent {
  const c = randomCreature(rng, egg.maxTier, egg.minTier);
  const shiny = rng.chance(shinyChance(s, 0.125));
  meta.hatch();
  return {
    id: 'hatch', title: shiny ? '✦ L’œuf était chromatique !' : 'L’œuf éclot !', art: 'egg', source: 'any', creature: c.id, shiny,
    text: shiny
      ? `La coquille se fend dans un éclat doré… Un ${c.names[0]} aux couleurs inouïes vous regarde de ses grands yeux. Les créatures chromatiques sont rarissimes : plus robuste et plus puissant, il fera la fierté de votre ménagerie.`
      : `La coquille se fend dans un craquement joyeux. Un ${c.names[0]} (type ${ELEMENTS[c.element].name}) pointe le museau et vous observe avec curiosité.`,
    choices: [
      ...(companionFull(s)
        ? s.companions.map((comp, i) => ({
            label: `Remplacer ${CREATURE_BY_ID[comp.id].names[comp.star - 1]}${comp.shiny ? ' ✦' : ''}`,
            icon: 'paw' as IconName,
            desc: `Ménagerie pleine : ${c.names[0]} prend sa place parmi vos compagnons.`,
            apply: (st: GameState) => {
              st.companions.splice(i, 1);
              return addCompanion(st, c.id, 1, shiny);
            },
          }))
        : [{ label: `Accueillir ${c.names[0]}`, icon: 'egg' as IconName, desc: 'Il rejoint vos compagnons et vous suivra gratuitement dans chaque arène.', apply: (st: GameState) => addCompanion(st, c.id, 1, shiny) }]),
      { label: 'Le confier à un éleveur', icon: 'coins', desc: '+12 or. Un éleveur prendra soin de la créature.', apply: (st) => { st.res.gold += 12; return 'Un éleveur ravi vous remet 12 or et emporte la créature avec lui.'; } },
    ],
  };
}

export function randomCreature(rng: RNG, maxTier: number, minTier = 1): CreatureDef {
  const pool = CREATURES.filter((c) => c.tier <= maxTier && c.tier >= minTier);
  return rng.pick(pool);
}

const needGold = (n: number) => (s: GameState) => (s.res.gold >= n ? null : `Il faut ${n} or`);
const needWood = (n: number) => (s: GameState) => (s.res.wood >= n ? null : `Il faut ${n} bois`);
const needFood = (n: number) => (s: GameState) => (s.res.food >= n ? null : `Il faut ${n} nourriture`);
const needStone = (n: number) => (s: GameState) => (s.res.stone >= n ? null : `Il faut ${n} pierre`);
const needCompanion = (s: GameState) => (s.companions.length ? null : 'Aucun compagnon');

const ELEMENT_RELIC: Record<string, string> = { feu: 'cristalArdent', eau: 'ecaille', plante: 'totem', foudre: 'pierreTonnerre', roche: 'coeurGolem', ombre: 'lameSpectrale' };


// Choix du Sanctuaire des éléments : trois éléments tirés parmi six, chacun donnant sa relique contre 10 or.
function ELEMENT_LIST_FOR_SHRINE(): EventChoice[] {
  const els = ['feu', 'eau', 'plante', 'foudre', 'roche', 'ombre'] as const;
  return els.map((el) => ({
    label: `Offrande ${ELEMENTS[el].name === 'Ombre' ? 'à l’Ombre' : `au ${ELEMENTS[el].name}`}`,
    icon: el as IconName,
    desc: `Payer 10 or pour la relique ${RELIC_BY_ID[ELEMENT_RELIC[el]].name} (${RELIC_BY_ID[ELEMENT_RELIC[el]].desc}).`,
    check: (s: GameState) => needGold(10)(s) ?? (s.relics.includes(ELEMENT_RELIC[el]) ? 'Déjà possédée' : null),
    apply: (s: GameState, rng: RNG) => { s.res.gold -= 10; return giveRelic(s, ELEMENT_RELIC[el], rng); },
  }));
}

// Vision de l'Oracle : les monstres de la prochaine arène et ce qui les domine.
function oracleText(s: GameState): string {
  const ai = s.track.findIndex((n, i) => i >= s.step && (n.kind === 'arena' || n.kind === 'boss'));
  const idx = ai >= 0 ? s.track[ai].arena ?? BASE_ARENAS - 1 : s.arenaIndex;
  const enc = encounterAt(s, Math.min(idx, BASE_ARENAS - 1 + (s.encounters?.length ?? 0)));
  const names = [...new Set(enc.enemies.map((e) => MONSTERS[e.id].name))];
  const types = [...new Set(enc.enemies.map((e) => MONSTERS[e.id].element))];
  const weak = [...new Set(types.flatMap((t) => weakAgainst(t)))].map((t) => ELEMENTS[t].name);
  return `« ${enc.name} t’attend : ${names.join(', ')}. Ils craignent le ${weak.join(', ') || 'rien'}. »`;
}

export const EVENTS: GameEvent[] = [
  {
    id: 'fairyRing', title: 'Le Cercle des fées', art: 'mushrooms', source: 'any',
    text: 'Vos éclaireurs découvrent dans une clairière un cercle de champignons qui palpitent doucement. Chacun est grand comme un ours ; des spores tombent de leurs chapeaux comme une houle verte. Au centre, une faille étroite flotte au-dessus d’un amas de trésors.',
    choices: [
      { label: 'Prudence', icon: 'leaf', desc: 'Récolter quelques champignons en bordure : +6 nourriture, +4 bois.', apply: (s) => { s.res.food += 6; s.res.wood += 4; return 'Vos éclaireurs reviennent les bras chargés de champignons comestibles.'; } },
      { label: 'Chercher des objets', icon: 'snow', desc: 'Obtenir l’Amulette de givre. Un villageois succombe aux spores (-1 villageois).', check: (s) => (s.villagers > 1 ? null : 'Pas assez de villageois'), apply: (s, rng) => { s.villagers--; s.builders = Math.min(s.builders, s.villagers); return giveRelic(s, 'amulette', rng); } },
      { label: 'Chercher des restes', icon: 'paw', desc: 'Capturer un Mycelor comme compagnon. Coûte 8 or.', check: (s) => needGold(8)(s) ?? companionFull(s), apply: (s) => { s.res.gold -= 8; return addCompanion(s, 'mycelor'); } },
    ],
  },
  {
    id: 'caravan', title: 'La Caravane du Couchant', art: 'caravan', source: 'track',
    text: 'Une caravane de marchands aux lanternes ambrées fait halte près de vos murs. Leurs chariots croulent sous les étoffes, les épices… et quelques objets dont ils refusent de révéler l’origine.',
    choices: [
      { label: 'Acheter un trésor', icon: 'gem', desc: 'Payer 20 or pour une relique au hasard.', check: needGold(20), apply: (s, rng) => { s.res.gold -= 20; return grantRelic(s, rng); } },
      { label: 'Commercer', icon: 'coins', desc: 'Échanger 10 bois contre 14 or.', check: needWood(10), apply: (s) => { s.res.wood -= 10; s.res.gold += 14; return 'Marché conclu : vos réserves de bois partent vers l’ouest.'; } },
      { label: 'Les escorter', icon: 'pop', desc: 'Un voyageur s’installe chez vous (+1 villageois si un logement est libre, sinon +6 or).', apply: (s) => { if (s.villagers < popCap(s)) { s.villagers++; return 'Un voyageur décide de rester dans votre royaume.'; } s.res.gold += 6; return 'Faute de logement, le voyageur vous remercie de quelques pièces.'; } },
    ],
  },
  {
    id: 'shipwreck', title: 'Épave sur la grève', art: 'shipwreck', source: 'any',
    text: 'La marée de la nuit a rejeté la carcasse d’un navire marchand. Sa coque éventrée gémit sous le ressac, et des caisses scellées dépassent encore de la cale.',
    choices: [
      { label: 'Récupérer les planches', icon: 'wood', desc: '+14 bois.', apply: (s) => { s.res.wood += 14; return 'Le bois du navire servira à vos chantiers.'; } },
      { label: 'Fouiller la cale', icon: 'question', desc: '60% : +25 or. 40% : quelques rats et 3 pièces.', apply: (s, rng) => { if (rng.chance(0.6)) { s.res.gold += 25; return 'Un coffre rempli de pièces ! +25 or.'; } s.res.gold += 3; return 'Rien que des rats… et 3 pièces oubliées.'; } },
      { label: 'Sauver les naufragés', icon: 'heart', desc: '+1 villageois.', apply: (s) => { s.villagers++; return 'Un marin reconnaissant rejoint votre royaume.'; } },
    ],
  },
  {
    id: 'egg', title: 'L’Œuf mystérieux', art: 'egg', source: 'any',
    text: 'Au creux d’un nid de branches tressées repose un œuf tiède, veiné de lueurs changeantes. Quelque chose bouge à l’intérieur.',
    choices: [
      { label: 'Le couver', icon: 'egg', desc: 'L’œuf éclora dans 2 tours en une créature rare (tier 2-3)… peut-être chromatique !', apply: (s) => addEgg(s, 2, 3, 2) },
      { label: 'Le vendre', icon: 'coins', desc: '+18 or.', apply: (s) => { s.res.gold += 18; return 'Un collectionneur vous en offre un bon prix.'; } },
    ],
  },
  {
    id: 'stars', title: 'Pluie d’étoiles', art: 'stars', source: 'track',
    text: 'Cette nuit, le ciel se déchire en mille traînées d’or. Au matin, des éclats d’ambre fument encore dans les champs.',
    choices: [
      { label: 'Ramasser les éclats', icon: 'gold', desc: '+10 or, +6 pierre.', apply: (s) => { s.res.gold += 10; s.res.stone += 6; return 'Les éclats sont fondus et taillés.'; } },
      { label: 'Faire un vœu', icon: 'star', desc: 'Recevoir une relique commune au hasard.', apply: (s, rng) => grantRelic(s, rng, (id) => RELIC_BY_ID[id].rarity === 1) },
    ],
  },
  {
    id: 'altar', title: 'L’Autel d’ombre', art: 'altar', source: 'any',
    text: 'Une pierre noire, gravée de runes qui saignent une lueur violette. Une voix sans bouche murmure qu’elle accorde la puissance à qui sait payer.',
    choices: [
      { label: 'Offrir son sang', icon: 'heart', desc: 'Perdre 1 cœur. Recevoir une relique rare.', check: (s) => (s.hearts > 1 ? null : 'Trop risqué'), apply: (s, rng) => { s.hearts--; return grantRelic(s, rng, (id) => RELIC_BY_ID[id].rarity >= 2); } },
      { label: 'Offrir de l’or', icon: 'gold', desc: 'Payer 15 or pour regagner 1 cœur.', check: (s) => needGold(15)(s) ?? (s.hearts < s.maxHearts ? null : 'Cœurs déjà pleins'), apply: (s) => { s.res.gold -= 15; s.hearts++; return 'Une chaleur étrange vous envahit. +1 cœur.'; } },
      { label: 'Passer son chemin', icon: 'boot', desc: 'Ne rien faire.', apply: () => 'Vous vous éloignez. Le murmure se tait.' },
    ],
  },
  {
    id: 'harvest', title: 'La Fête des moissons', art: 'village', source: 'track',
    text: 'Les greniers débordent. Les villageois réclament une fête sous les lanternes, tandis que les marchands lorgnent sur vos surplus.',
    choices: [
      { label: 'Grand banquet', icon: 'pop', desc: '-8 nourriture : +1 villageois.', check: needFood(8), apply: (s) => { s.res.food -= 8; s.villagers++; return 'La fête attire une nouvelle famille.'; } },
      { label: 'Vendre le surplus', icon: 'coins', desc: '-8 nourriture : +12 or.', check: needFood(8), apply: (s) => { s.res.food -= 8; s.res.gold += 12; return 'Les marchands repartent satisfaits.'; } },
      { label: 'Tout stocker', icon: 'food', desc: '+6 nourriture.', apply: (s) => { s.res.food += 6; return 'Les greniers sont pleins.'; } },
    ],
  },
  {
    id: 'smith', title: 'Le Forgeron itinérant', art: 'camp', source: 'track',
    text: 'Un nain bourru installe son enclume portative près de la route. Il propose ses services… à condition d’être payé d’avance.',
    choices: [
      { label: 'Armes élémentaires', icon: 'anvil', desc: 'Payer 12 or : une relique élémentaire.', check: needGold(12), apply: (s, rng) => { s.res.gold -= 12; return grantRelic(s, rng, (id) => ['cristalArdent', 'ecaille', 'totem', 'pierreTonnerre', 'coeurGolem', 'lameSpectrale'].includes(id)); } },
      { label: 'Réparer les outils', icon: 'hammer', desc: '+8 pierre, +4 bois.', apply: (s) => { s.res.stone += 8; s.res.wood += 4; return 'Vos outils sont comme neufs.'; } },
    ],
  },
  {
    id: 'trainer', title: 'Le Dresseur errant', art: 'camp', source: 'track',
    text: 'Une silhouette encapuchonnée, entourée de créatures dociles, vous salue. « Vos bêtes ont du potentiel. Je peux les faire évoluer… ou vous apprendre à lire le combat. »',
    choices: [
      { label: 'Faire évoluer', icon: 'star', desc: 'Votre premier compagnon gagne une étoile (max ★3).', check: (s) => (s.companions.some((c) => c.star < 3) ? null : 'Aucun compagnon à faire évoluer'), apply: (s) => { const c = s.companions.find((x) => x.star < 3)!; c.star++; meta.evolve(c.star); return `Votre compagnon évolue en ${CREATURE_BY_ID[c.id].names[c.star - 1]} !`; } },
      { label: 'Leçon de stratégie', icon: 'eye', desc: 'Obtenir l’Œil du stratège.', apply: (s, rng) => giveRelic(s, 'oeil', rng) },
      { label: 'Recevoir un élève', icon: 'paw', desc: 'Un compagnon de tier 1 au hasard.', check: companionFull, apply: (s, rng) => addCompanion(s, randomCreature(rng, 1).id) },
    ],
  },
  {
    id: 'spring', title: 'La Source de jouvence', art: 'mushrooms', source: 'any',
    text: 'Sous un dôme de mousse lumineuse, une source scintille d’un vert irréel. L’eau semble chanter.',
    choices: [
      { label: 'Boire', icon: 'heart', desc: 'Regagner 1 cœur.', check: (s) => (s.hearts < s.maxHearts ? null : 'Cœurs déjà pleins'), apply: (s) => { s.hearts++; return 'Vous vous sentez revigoré. +1 cœur.'; } },
      { label: 'Remplir des fioles', icon: 'potion', desc: 'Obtenir l’Élixir de vigueur.', apply: (s, rng) => giveRelic(s, 'potion', rng) },
    ],
  },
  {
    id: 'library', title: 'La Bibliothèque engloutie', art: 'ruins', source: 'ruins',
    text: 'Sous les colonnes effondrées, un escalier mène à une salle où des grimoires flottent dans une lumière de lune.',
    choices: [
      { label: 'Étudier les grimoires', icon: 'scroll', desc: 'Obtenir le Parchemin d’érudit.', apply: (s, rng) => giveRelic(s, 'parchemin', rng) },
      { label: 'Piller l’or', icon: 'gold', desc: '+20 or.', apply: (s) => { s.res.gold += 20; return 'Les reliures dorées valent une petite fortune.'; } },
    ],
  },
  {
    id: 'tomb', title: 'Le Tombeau scellé', art: 'ruins', source: 'ruins',
    text: 'Une porte de pierre couverte de mises en garde. Derrière, on devine l’éclat de l’or… et un souffle froid.',
    choices: [
      { label: 'Forcer la porte', icon: 'skull', desc: '50% : +30 or et une relique. 50% : perdre 1 cœur.', apply: (s, rng) => { if (rng.chance(0.5)) { s.res.gold += 30; return `+30 or ! ${grantRelic(s, rng)}`; } s.hearts = Math.max(1, s.hearts - 1); return 'Une malédiction s’abat sur vous. -1 cœur.'; } },
      { label: 'Récupérer les pierres', icon: 'stone', desc: '+10 pierre.', apply: (s) => { s.res.stone += 10; return 'Les blocs taillés serviront à vos chantiers.'; } },
    ],
  },
  {
    id: 'oldCamp', title: 'Le Campement abandonné', art: 'ruins', source: 'ruins',
    text: 'Des tentes déchirées, un feu éteint depuis des lunes. Quelqu’un est parti en hâte, laissant derrière lui ses provisions.',
    choices: [
      { label: 'Prendre les vivres', icon: 'food', desc: '+10 nourriture.', apply: (s) => { s.res.food += 10; return 'Des provisions encore bonnes.'; } },
      { label: 'Suivre les traces', icon: 'boot', desc: 'Trouver des pièces : +12 or.', apply: (s) => { s.res.gold += 12; return 'Une bourse tombée dans la boue. +12 or.'; } },
    ],
  },
  // ——— Extension 0.3 : nouvelles rencontres ———
  {
    id: 'blackMarket', title: 'Le Marché noir', art: 'caravan', source: 'track',
    text: 'À la nuit tombée, un homme encapuchonné étale sur un drap des objets qui murmurent dans l’obscurité. « Rien n’est volé, murmure-t-il. Presque. » Il lorgne vos compagnons avec un intérêt un peu trop vif.',
    choices: [
      { label: 'Une relique rare', icon: 'gem', desc: 'Payer 32 or pour une relique de rareté 2 ou plus.', check: needGold(32), apply: (s, rng) => { s.res.gold -= 32; return grantRelic(s, rng, (id) => RELIC_BY_ID[id].rarity >= 2); } },
      { label: 'Vendre un compagnon', icon: 'coins', desc: 'Obtenir 28 or, mais perdre votre premier compagnon.', check: needCompanion, apply: (s) => { const c = s.companions.shift()!; s.res.gold += 28; return `${CREATURE_BY_ID[c.id].names[c.star - 1]} change de mains contre 28 or. Il vous regarde partir sans comprendre.`; } },
      { label: 'Jouer aux dés', icon: 'die', desc: 'Miser 10 or : 45 % de chances de gagner 25 or.', check: needGold(10), apply: (s, rng) => { s.res.gold -= 10; if (rng.chance(0.45)) { s.res.gold += 25; return 'Les dés roulent en votre faveur. +25 or !'; } return 'Les dés étaient pipés, évidemment. -10 or.'; } },
    ],
  },
  {
    id: 'thunderstorm', title: 'La Tempête de foudre', art: 'stars', source: 'track',
    text: 'Le ciel s’embrase : des éclairs violets frappent la crête, à quelques portées de flèche de vos murs. Les villageois se terrent, mais l’air entier sent le métal chaud et l’énergie à saisir.',
    choices: [
      { label: 'Dresser un paratonnerre', icon: 'foudre', desc: 'Dépenser 8 pierre pour recevoir la Pierre-tonnerre (ou +12 or si vous l’avez déjà).', check: needStone(8), apply: (s, rng) => { s.res.stone -= 8; return s.relics.includes('pierreTonnerre') ? ((s.res.gold += 12), 'La foudre fond la pierre en une masse luisante : +12 or de métal précieux.') : giveRelic(s, 'pierreTonnerre', rng); } },
      { label: 'Ramasser les éclats', icon: 'stone', desc: '+8 pierre et +6 or de fulgurites.', apply: (s) => { s.res.stone += 8; s.res.gold += 6; return 'Le sol est jonché de verre noir et de pierres fondues.'; } },
      { label: 'Défier l’orage', icon: 'skull', desc: '50 % : +1 relique au hasard. 50 % : un villageois est foudroyé.', check: (s) => (s.villagers > 1 ? null : 'Pas assez de villageois'), apply: (s, rng) => { if (rng.chance(0.5)) return grantRelic(s, rng); s.villagers--; s.builders = Math.min(s.builders, s.villagers); return 'Un éclair frappe le groupe… Un villageois ne se relèvera pas.'; } },
    ],
  },
  {
    id: 'elementShrine', title: 'Le Sanctuaire des éléments', art: 'altar', source: 'any',
    text: 'Six pierres levées forment un cercle, chacune gravée du signe d’un élément. Quand vous approchez, trois d’entre elles s’éclairent doucement : le sanctuaire est prêt à vous accorder sa faveur, contre une offrande.',
    choices: ELEMENT_LIST_FOR_SHRINE(),
  },
  {
    id: 'orphans', title: 'Les Enfants des bois', art: 'camp', source: 'track',
    text: 'Deux enfants en haillons sortent d’un fourré, un panier d’œufs tachetés entre eux. Ils prétendent les avoir trouvés « à la lisière, là où ça brille ». Ils ont faim, et ils ont l’air de savoir se débrouiller.',
    choices: [
      { label: 'Les adopter', icon: 'house', desc: '+2 villageois si le logement le permet (sinon +1).', apply: (s) => { const free = popCap(s) - s.villagers; const n = Math.max(0, Math.min(2, free)); if (n) { s.villagers += n; return `${n} villageois rejoignent le royaume, et sourient pour la première fois depuis longtemps.`; } s.res.food += 6; return 'Plus de place : vous leur donnez des vivres (+6 nourriture) en promettant de revenir.'; } },
      { label: 'Échanger contre un œuf', icon: 'egg', desc: 'Donner 8 nourriture : ils vous confient un œuf mystérieux.', check: needFood(8), apply: (s) => { s.res.food -= 8; return addEgg(s, 1, 3, 3); } },
      { label: 'Les nourrir', icon: 'food', desc: 'Donner 5 nourriture. Ils vous laissent un petit trésor : +10 or.', check: needFood(5), apply: (s) => { s.res.food -= 5; s.res.gold += 10; return 'Ils dévorent tout, puis déposent dans votre main une poignée de pièces rouillées.'; } },
    ],
  },
  {
    id: 'champion', title: 'Le Défi du champion', art: 'camp', source: 'track',
    text: 'Un guerrier en armure bosselée plante son épée devant votre porte : « On dit que vos bêtes sont les meilleures. J’en doute. Un combat, un seul. Si vous gagnez, je paie. »',
    choices: [
      { label: 'Relever le défi', icon: 'sword', desc: 'Votre premier compagnon combat : 60 % de victoire (+25 or, et ★ gagnée à 25 % si possible). Sinon, -10 or.', check: needCompanion, apply: (s, rng) => { const c = s.companions[0]; const d = CREATURE_BY_ID[c.id]; if (rng.chance(0.6)) { s.res.gold += 25; if (c.star < 3 && rng.chance(0.25)) { c.star++; meta.evolve(c.star); return `${d.names[c.star - 2]} écrase le champion et évolue en ${d.names[c.star - 1]} ! +25 or.`; } return `${d.names[c.star - 1]} l’emporte haut la main. +25 or.`; } s.res.gold = Math.max(0, s.res.gold - 10); return `${d.names[c.star - 1]} est vaincu de justesse. Vous payez le défi : -10 or.`; } },
      { label: 'Négocier', icon: 'coins', desc: 'Lui offrir 6 or contre un conseil de combat : +1 relance gratuite à la prochaine arène (une relique de rareté 1 si vous avez de la chance).', check: needGold(6), apply: (s, rng) => { s.res.gold -= 6; if (rng.chance(0.3)) return grantRelic(s, rng, (id) => RELIC_BY_ID[id].rarity <= 1); s.res.gold += 3; return 'Il empoche vos pièces, hausse les épaules et vous rend 3 or avec un clin d’œil.'; } },
      { label: 'Refuser poliment', icon: 'shield', desc: 'Aucun effet.', apply: () => 'Le guerrier crache par terre, reprend son épée et s’éloigne dans la poussière.' },
    ],
  },
  {
    id: 'oracle', title: 'L’Oracle des marais', art: 'stars', source: 'any',
    text: 'Dans une mare couverte de brume flotte une femme sans âge, les yeux voilés de nacre. Elle sourit : « Je vois le prochain adversaire qui t’attend, voyageur. Pour quelques pièces, je te dirai ce qu’il redoute. »',
    choices: [
      { label: 'Consulter l’oracle', icon: 'eye', desc: 'Payer 6 or : découvrir les monstres de la prochaine arène et leurs faiblesses.', check: needGold(6), apply: (s) => { s.res.gold -= 6; return oracleText(s); } },
      { label: 'Lui offrir des vivres', icon: 'food', desc: 'Donner 8 nourriture : la même vision, mais aussi +8 or de remerciement.', check: needFood(8), apply: (s) => { s.res.food -= 8; s.res.gold += 8; return `${oracleText(s)} Elle glisse 8 pièces dans votre main.`; } },
      { label: 'Ne pas la déranger', icon: 'leaf', desc: 'Aucun effet.', apply: () => 'Vous laissez la mare à ses secrets. La brume se referme derrière vous.' },
    ],
  },
  {
    id: 'fossil', title: 'Le Fossile géant', art: 'ruins', source: 'ruins',
    text: 'Sous une dalle fendue, vos éclaireurs ont mis au jour une côte longue comme un mât de navire, incrustée de cristaux. Un peu plus loin, quelque chose de rond et de très, très ancien repose dans la roche.',
    choices: [
      { label: 'Dégager l’œuf fossile', icon: 'egg', desc: 'Dépenser 12 pierre : un œuf de grande taille éclora dans 3 tours (palier 2 à 3).', check: needStone(12), apply: (s) => { s.res.stone -= 12; return addEgg(s, 2, 3, 3); } },
      { label: 'Vendre les cristaux', icon: 'gem', desc: '+22 or.', apply: (s) => { s.res.gold += 22; return 'Un joaillier de passage vous paie 22 or pour les cristaux détachés.'; } },
      { label: 'Étudier les os', icon: 'scroll', desc: 'Votre premier compagnon gagne une étoile s’il peut (max ★3), sinon +12 or.', check: needCompanion, apply: (s) => { const c = s.companions.find((x) => x.star < 3); if (c) { c.star++; meta.evolve(c.star); return `${CREATURE_BY_ID[c.id].names[c.star - 1]} renifle l’os et sent la puissance de ses ancêtres : il évolue !`; } s.res.gold += 12; return 'Vos compagnons sont déjà au sommet : les savants vous paient leurs notes (+12 or).'; } },
    ],
  },
  {
    id: 'seeds', title: 'Les Graines rares', art: 'village', source: 'track',
    text: 'Un vieux jardinier vous tend une bourse en toile : des graines de toutes les couleurs, sans étiquette. « Plantées au bon endroit, elles donnent des merveilles. Plantées au mauvais… eh bien, ça donne des histoires. »',
    choices: [
      { label: 'Semer au potager', icon: 'food', desc: '+14 nourriture et +2 bois.', apply: (s) => { s.res.food += 14; s.res.wood += 2; return 'Une récolte démesurée sort de terre en trois jours.'; } },
      { label: 'Semer près du sanctuaire', icon: 'leaf', desc: 'Obtenir le Totem de mousse (ou +10 or si vous l’avez déjà).', apply: (s, rng) => (s.relics.includes('totem') ? ((s.res.gold += 10), 'Des fleurs d’or poussent : +10 or une fois fanées.') : giveRelic(s, 'totem', rng)) },
      { label: 'Les vendre', icon: 'coins', desc: '+14 or.', apply: (s) => { s.res.gold += 14; return 'Le marché les emporte comme des petits pains.'; } },
    ],
  },
];

export function pickEvent(s: GameState, rng: RNG, source: 'track' | 'ruins', seen: string[]): GameEvent {
  const pool = EVENTS.filter((e) => (e.source === source || e.source === 'any') && !seen.includes(e.id));
  const list = pool.length ? pool : EVENTS.filter((e) => e.source === source || e.source === 'any');
  const ev = rng.pick(list);
  // le Sanctuaire n'éclaire que trois de ses six pierres
  if (ev.id === 'elementShrine') {
    const left = [...ev.choices];
    const three: EventChoice[] = [];
    while (three.length < 3) three.push(left.splice(Math.floor(rng.next() * left.length), 1)[0]);
    return { ...ev, choices: three };
  }
  return ev;
}

export function lairEvent(s: GameState, rng: RNG): GameEvent {
  const maxTier = Math.min(3, 1 + s.arenaIndex);
  const c = randomCreature(rng, maxTier);
  const cost = 4 + c.tier * 4;
  const el = ELEMENTS[c.element].name;
  return {
    id: 'lair', title: `Un ${c.names[0]} sauvage !`, art: 'lair', source: 'any', creature: c.id,
    text: `Au fond d’une tanière, deux yeux brillent dans la pénombre. Un ${c.names[0]} sauvage (type ${el}) vous observe, méfiant. Les créatures capturées vous accompagnent gratuitement dans chaque arène.`,
    choices: [
      { label: 'Capturer', icon: 'paw', desc: `Payer ${cost} or en appâts : ${c.names[0]} devient votre compagnon.`, check: (st) => needGold(cost)(st) ?? companionFull(st), apply: (st, rng) => { st.res.gold -= cost; return addCompanion(st, c.id, 1, rng.chance(shinyChance(st, 0.1))); } },
      { label: 'Apprivoiser', icon: 'food', desc: `Offrir 10 nourriture : même résultat, plus lentement.`, check: (st) => needFood(10)(st) ?? companionFull(st), apply: (st) => { st.res.food -= 10; return addCompanion(st, c.id); } },
      { label: 'Le chasser', icon: 'sword', desc: '+8 nourriture.', apply: (st) => { st.res.food += 8; return 'La créature s’enfuit dans les bois. Le repaire est vide.'; } },
    ],
  };
}

// Récompense après une victoire d'arène : 2 reliques ou une capture.
export function victoryEvent(s: GameState, rng: RNG, arenaName: string): GameEvent {
  const pool = RELICS.filter((r) => !s.relics.includes(r.id));
  rng.shuffle(pool);
  const choices: EventChoice[] = pool.slice(0, 2).map((r) => ({
    label: r.name, icon: r.icon, desc: r.desc,
    apply: (st: GameState) => { st.relics.push(r.id); return `Relique obtenue : ${r.name}.`; },
  }));
  const eggMin = Math.min(3, 1 + s.arenaIndex);
  const eggMax = Math.min(4, 2 + s.arenaIndex);
  const c = randomCreature(rng, Math.min(4, 2 + s.arenaIndex), Math.min(3, 1 + s.arenaIndex));
  choices.push({
    label: `Capturer ${c.names[0]}`, icon: 'paw',
    desc: `Une créature de tier ${c.tier} (${ELEMENTS[c.element].name}) rejoint vos compagnons.`,
    check: companionFull,
    apply: (st) => addCompanion(st, c.id),
  });
  choices.push({
    label: 'Œuf mystérieux', icon: 'egg',
    desc: `Éclot dans 3 tours en une créature de tier ${eggMin}-${eggMax}. Une chance sur huit qu’elle soit chromatique !`,
    apply: (st) => addEgg(st, eggMin, eggMax, 3),
  });
  return {
    id: 'victory', title: 'Victoire !', art: 'victory', source: 'any',
    text: `Les monstres de « ${arenaName} » sont tombés. La foule du colisée scande le nom de votre royaume. Choisissez votre récompense.`,
    choices,
  };
}
