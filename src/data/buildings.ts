import type { BuildingId, Feature, IconName, Res, Terrain } from './types';

export type BuildingCategory = 'eco' | 'combat' | 'core';

export interface BuildingDef {
  id: BuildingId;
  name: string;
  category: BuildingCategory;
  icon: IconName;
  desc: string;
  effect: string;
  cost: Res;
  work: number;
  jobs: number;
  terrains: Terrain[];
  max?: number;
  needsWater?: boolean;
  needsFeature?: Feature[];
}

const LAND: Terrain[] = ['plains', 'forest', 'grove', 'hills', 'beach'];

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  townhall: {
    id: 'townhall', name: 'Hôtel de ville', category: 'core', icon: 'crown',
    desc: 'Cœur de votre royaume.', effect: '+3 or, +2 nourriture, +1 bois, +1 pierre. Logement +4.',
    cost: {}, work: 0, jobs: 0, terrains: ['plains'], max: 1,
  },
  colosseum: {
    id: 'colosseum', name: 'Colisée', category: 'core', icon: 'sword',
    desc: 'L’arène où vos créatures affrontent les monstres.', effect: 'Accueille les combats d’arène.',
    cost: {}, work: 0, jobs: 0, terrains: ['plains', 'hills'], max: 1,
  },
  house: {
    id: 'house', name: 'Maison', category: 'eco', icon: 'house',
    desc: 'Loge de nouveaux villageois.', effect: 'Logement +2. +1 nourriture si adjacente à une ferme.',
    cost: { wood: 8 }, work: 2, jobs: 0, terrains: ['plains', 'hills', 'beach'],
  },
  farm: {
    id: 'farm', name: 'Ferme', category: 'eco', icon: 'food',
    desc: 'Champs de blé doré.', effect: '+3 nourriture. +1 par ferme adjacente (max +2), +1 près de l’eau.',
    cost: { wood: 6 }, work: 2, jobs: 1, terrains: ['plains'],
  },
  lumber: {
    id: 'lumber', name: 'Scierie', category: 'eco', icon: 'wood',
    desc: 'Bûcherons et scies.', effect: '+2 bois. +1 par forêt adjacente (max +3).',
    cost: { gold: 4, wood: 4 }, work: 2, jobs: 1, terrains: ['forest', 'grove'],
  },
  quarry: {
    id: 'quarry', name: 'Carrière', category: 'eco', icon: 'stone',
    desc: 'Taille de blocs de pierre.', effect: '+2 pierre. +1 par colline ou montagne adjacente (max +3).',
    cost: { gold: 4, wood: 6 }, work: 3, jobs: 1, terrains: ['hills', 'mountain'],
  },
  mine: {
    id: 'mine', name: 'Mine', category: 'eco', icon: 'gold',
    desc: 'Galeries creusées dans la roche.', effect: '+2 or. +3 sur filon d’or, +5 sur cristaux.',
    cost: { gold: 6, wood: 8, stone: 4 }, work: 3, jobs: 1, terrains: ['hills', 'mountain'],
  },
  port: {
    id: 'port', name: 'Port', category: 'eco', icon: 'flag',
    desc: 'Quais et navires marchands.', effect: '+2 or, +1 nourriture. +2 nourriture par banc de poissons adjacent.',
    cost: { gold: 6, wood: 12, stone: 4 }, work: 4, jobs: 1, terrains: ['beach', 'plains', 'forest', 'hills'], needsWater: true,
  },
  market: {
    id: 'market', name: 'Marché', category: 'eco', icon: 'coins',
    desc: 'Étals colorés et marchands.', effect: '+3 or. +1 par maison adjacente (max +3), +2 près de l’hôtel de ville.',
    cost: { gold: 10, wood: 10, stone: 6 }, work: 4, jobs: 1, terrains: ['plains', 'hills', 'beach'],
  },
  auction: {
    id: 'auction', name: 'Hôtel des ventes', category: 'eco', icon: 'gem',
    desc: 'Le grand commerce du royaume.', effect: '+4 or. +5 adjacent à un port, +2 adjacent à un marché.',
    cost: { gold: 20, wood: 10, stone: 12 }, work: 5, jobs: 1, terrains: ['plains', 'beach', 'hills'], max: 2,
  },
  tavern: {
    id: 'tavern', name: 'Taverne', category: 'combat', icon: 'refresh',
    desc: 'On y recrute des mercenaires… et on y boit.', effect: '+2 rafraîchissements gratuits en arène. +1 or.',
    cost: { gold: 8, wood: 12 }, work: 3, jobs: 0, terrains: ['plains', 'beach', 'hills'],
  },
  barracks: {
    id: 'barracks', name: 'Caserne', category: 'combat', icon: 'banner',
    desc: 'Entraîne de nouveaux escouades.', effect: '+1 créature sur le plateau d’arène (max 3 casernes).',
    cost: { gold: 12, wood: 10, stone: 6 }, work: 3, jobs: 0, terrains: ['plains', 'hills'], max: 3,
  },
  forge: {
    id: 'forge', name: 'Forge', category: 'combat', icon: 'anvil',
    desc: 'Armes et griffes affûtées.', effect: '+10% attaque des créatures. +5% si adjacente à une mine.',
    cost: { gold: 14, wood: 6, stone: 10 }, work: 4, jobs: 1, terrains: LAND,
  },
  shrine: {
    id: 'shrine', name: 'Sanctuaire', category: 'combat', icon: 'leaf',
    desc: 'Un monolithe vibrant d’énergie.', effect: '+12% PV des créatures. +8% sur ou près d’un bosquet lumineux.',
    cost: { gold: 14, wood: 8, stone: 8 }, work: 4, jobs: 0, terrains: LAND,
  },
  academy: {
    id: 'academy', name: 'Académie', category: 'combat', icon: 'tower',
    desc: 'Les érudits attirent des créatures rares.', effect: 'Améliore les chances de créatures rares en boutique.',
    cost: { gold: 18, wood: 12, stone: 10 }, work: 5, jobs: 1, terrains: ['plains', 'hills'], max: 2,
  },
  menagerie: {
    id: 'menagerie', name: 'Ménagerie', category: 'combat', icon: 'paw',
    desc: 'Enclos pour vos compagnons capturés.', effect: '+1 emplacement de compagnon (gratuit à chaque arène).',
    cost: { gold: 10, wood: 14, stone: 4 }, work: 4, jobs: 0, terrains: ['plains', 'forest', 'grove'], max: 2,
  },
};

export const BUILD_MENU: BuildingId[] = [
  'house', 'farm', 'lumber', 'quarry', 'mine', 'port', 'market', 'auction',
  'tavern', 'barracks', 'forge', 'shrine', 'academy', 'menagerie',
];
