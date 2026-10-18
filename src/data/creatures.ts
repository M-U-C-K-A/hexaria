import type { Element } from './types';

export type AbilityKind = 'nuke' | 'aoe' | 'heal' | 'shield' | 'stun' | 'frenzy' | 'multishot' | 'drain' | 'teamheal' | 'slam';

export interface AbilityDef {
  kind: AbilityKind;
  name: string;
  desc: string;
  values: [number, number, number];
  radius?: number;
  count?: number;
  duration?: number;
}

export type BodyShape = 'blob' | 'quad' | 'biped' | 'bird' | 'serpent' | 'golem' | 'mushroom' | 'crab' | 'spider' | 'dragon' | 'wisp';

export type Part =
  | 'flame' | 'leaves' | 'fins' | 'horns' | 'crystals' | 'wings' | 'ears' | 'tail' | 'spikes'
  | 'sprout' | 'mane' | 'antenna' | 'bolt' | 'shell' | 'hood' | 'scythe' | 'halo' | 'heads';

export interface Look {
  body: BodyShape;
  c1: string;
  c2: string;
  c3: string;
  parts: Part[];
  eye: 'cute' | 'fierce' | 'glow';
  // Pièces gagnées en évoluant (★2 puis ★3), pour une vraie métamorphose à la Pokémon.
  evo?: [Part[], Part[]];
}

export interface CreatureDef {
  id: string;
  names: [string, string, string];
  tier: 1 | 2 | 3 | 4;
  element: Element;
  hp: number;
  atk: number;
  as: number;
  range: number;
  armor: number;
  mana: number;
  startMana?: number;
  ability: AbilityDef;
  look: Look;
}

export const STAR_MULT = [1, 1.8, 3.24];

export const TIER_COST = [0, 3, 6, 9, 12];

export const CREATURES: CreatureDef[] = [
  // ——— Tier 1 ———
  {
    id: 'flammeche', names: ['Flammèche', 'Pyrolis', 'Infernyx'], tier: 1, element: 'feu',
    hp: 480, atk: 46, as: 0.75, range: 3, armor: 0.05, mana: 60,
    ability: { kind: 'nuke', name: 'Boule de feu', desc: 'Projette une boule de feu infligeant {v} dégâts.', values: [190, 320, 560] },
    look: { body: 'blob', c1: '#ff8a3d', c2: '#ffd08a', c3: '#ffef9a', parts: ['flame', 'tail'], eye: 'cute', evo: [['ears'], ['wings', 'horns']] },
  },
  {
    id: 'bourgeon', names: ['Bourgeon', 'Sylvanor', 'Ancestrel'], tier: 1, element: 'plante',
    hp: 720, atk: 40, as: 0.6, range: 1, armor: 0.2, mana: 70, startMana: 20,
    ability: { kind: 'shield', name: 'Écorce', desc: 'Se couvre d’un bouclier de {v} PV pendant 4 s.', values: [260, 440, 780] },
    look: { body: 'quad', c1: '#4fae5c', c2: '#b9e48d', c3: '#e9ff9a', parts: ['sprout', 'leaves'], eye: 'cute', evo: [['spikes'], ['mane', 'horns']] },
  },
  {
    id: 'goutelle', names: ['Goutelle', 'Marélis', 'Léviathys'], tier: 1, element: 'eau',
    hp: 500, atk: 36, as: 0.7, range: 3, armor: 0.05, mana: 70,
    ability: { kind: 'heal', name: 'Onde de soin', desc: 'Soigne l’allié le plus blessé de {v} PV.', values: [200, 340, 600] },
    look: { body: 'blob', c1: '#3fa2f0', c2: '#bfe8ff', c3: '#e0f7ff', parts: ['fins', 'antenna'], eye: 'cute', evo: [['tail'], ['spikes', 'halo']] },
  },
  {
    id: 'galet', names: ['Galet', 'Rochard', 'Titanor'], tier: 1, element: 'roche',
    hp: 780, atk: 44, as: 0.55, range: 1, armor: 0.3, mana: 80, startMana: 30,
    ability: { kind: 'stun', name: 'Coup de boutoir', desc: 'Inflige {v} dégâts et étourdit 1,5 s.', values: [130, 220, 380], duration: 1.5 },
    look: { body: 'golem', c1: '#9b8366', c2: '#c9b18e', c3: '#ffd9a0', parts: ['spikes'], eye: 'cute', evo: [['crystals'], ['horns']] },
  },
  {
    id: 'etincelle', names: ['Étincelle', 'Voltigeur', 'Fulgurion'], tier: 1, element: 'foudre',
    hp: 520, atk: 50, as: 0.85, range: 1, armor: 0.1, mana: 50,
    ability: { kind: 'frenzy', name: 'Survoltage', desc: '+{v}% vitesse d’attaque pendant 4 s.', values: [60, 85, 130] },
    look: { body: 'quad', c1: '#f5cf3a', c2: '#fff1b0', c3: '#fffbe0', parts: ['ears', 'bolt', 'tail'], eye: 'cute', evo: [['mane'], ['wings']] },
  },
  // ——— Tier 2 ———
  {
    id: 'ombrelin', names: ['Ombrelin', 'Spectreval', 'Nécrombre'], tier: 2, element: 'ombre',
    hp: 640, atk: 60, as: 0.8, range: 1, armor: 0.1, mana: 60,
    ability: { kind: 'drain', name: 'Morsure d’ombre', desc: 'Inflige {v} dégâts et se soigne d’autant.', values: [210, 360, 640] },
    look: { body: 'wisp', c1: '#6a4bc4', c2: '#b9a1ff', c3: '#e2d5ff', parts: ['hood', 'tail'], eye: 'glow', evo: [['horns'], ['wings']] },
  },
  {
    id: 'mycelor', names: ['Mycelor', 'Sporifère', 'Myconide-roi'], tier: 2, element: 'plante',
    hp: 620, atk: 48, as: 0.65, range: 3, armor: 0.1, mana: 70,
    ability: { kind: 'aoe', name: 'Nuage de spores', desc: 'Inflige {v} dégâts autour de la cible.', values: [160, 280, 500], radius: 1 },
    look: { body: 'mushroom', c1: '#2fd3a0', c2: '#e8f5e0', c3: '#9dffd9', parts: [], eye: 'cute', evo: [['leaves'], ['halo']] },
  },
  {
    id: 'carapix', names: ['Carapix', 'Carapace', 'Bastiodon'], tier: 2, element: 'eau',
    hp: 920, atk: 46, as: 0.55, range: 1, armor: 0.35, mana: 90, startMana: 40,
    ability: { kind: 'shield', name: 'Carapace', desc: 'Se couvre d’un bouclier de {v} PV pendant 4 s.', values: [420, 720, 1250] },
    look: { body: 'crab', c1: '#2f7fb8', c2: '#9fd2f0', c3: '#d0f0ff', parts: ['shell'], eye: 'cute', evo: [['spikes'], ['crystals']] },
  },
  {
    id: 'salamandre', names: ['Salamandre', 'Pyroscail', 'Drakéon'], tier: 2, element: 'feu',
    hp: 700, atk: 58, as: 0.7, range: 1, armor: 0.15, mana: 70,
    ability: { kind: 'aoe', name: 'Tourbillon ardent', desc: 'Inflige {v} dégâts autour de la cible.', values: [170, 300, 520], radius: 1 },
    look: { body: 'serpent', c1: '#e0532b', c2: '#ffb071', c3: '#ffe08a', parts: ['flame', 'spikes'], eye: 'fierce', evo: [['horns'], ['wings']] },
  },
  // ——— Tier 3 ———
  {
    id: 'cristallon', names: ['Cristallon', 'Golem de quartz', 'Colosse prismatique'], tier: 3, element: 'roche',
    hp: 1150, atk: 68, as: 0.6, range: 1, armor: 0.35, mana: 100, startMana: 40,
    ability: { kind: 'slam', name: 'Séisme', desc: 'Frappe le sol : {v} dégâts et étourdit les ennemis proches 1,5 s.', values: [220, 380, 700], radius: 1, duration: 1.5 },
    look: { body: 'golem', c1: '#7f6fa8', c2: '#c8b9f0', c3: '#ffe9a8', parts: ['crystals'], eye: 'glow', evo: [['spikes'], ['halo']] },
  },
  {
    id: 'griffon', names: ['Griffonerre', 'Tonnegriffe', 'Roi-tempête'], tier: 3, element: 'foudre',
    hp: 780, atk: 70, as: 0.8, range: 3, armor: 0.1, mana: 70,
    ability: { kind: 'multishot', name: 'Chaîne d’éclairs', desc: 'Foudroie 3 ennemis pour {v} dégâts.', values: [190, 330, 620], count: 3 },
    look: { body: 'bird', c1: '#e8c234', c2: '#fff4c2', c3: '#fffbe0', parts: ['wings', 'bolt', 'mane'], eye: 'fierce', evo: [['horns'], ['halo']] },
  },
  {
    id: 'faucheur', names: ['Faucheur', 'Sombrelame', 'Moissonneur'], tier: 3, element: 'ombre',
    hp: 820, atk: 88, as: 0.75, range: 1, armor: 0.15, mana: 60,
    ability: { kind: 'nuke', name: 'Exécution', desc: 'Frappe la cible pour {v} dégâts (x2 sous 40% PV).', values: [300, 520, 960] },
    look: { body: 'biped', c1: '#3b2c66', c2: '#8b72d6', c3: '#d8c8ff', parts: ['hood', 'scythe'], eye: 'glow', evo: [['wings'], ['halo']] },
  },
  // ——— Tier 4 ———
  {
    id: 'phenix', names: ['Phénix', 'Phénix ardent', 'Phénix solaire'], tier: 4, element: 'feu',
    hp: 920, atk: 84, as: 0.75, range: 3, armor: 0.15, mana: 80,
    ability: { kind: 'aoe', name: 'Pluie de cendres', desc: 'Inflige {v} dégâts dans une large zone.', values: [330, 580, 1150], radius: 2 },
    look: { body: 'bird', c1: '#ff6a2a', c2: '#ffd36b', c3: '#fff3b0', parts: ['wings', 'flame', 'tail', 'halo'], eye: 'fierce', evo: [['horns'], ['mane']] },
  },
  {
    id: 'hydrelle', names: ['Hydrelle', 'Hydre', 'Hydre des abysses'], tier: 4, element: 'eau',
    hp: 1350, atk: 78, as: 0.65, range: 2, armor: 0.25, mana: 90,
    ability: { kind: 'aoe', name: 'Raz-de-marée', desc: 'Inflige {v} dégâts dans une large zone.', values: [290, 500, 980], radius: 2 },
    look: { body: 'serpent', c1: '#1f6fa8', c2: '#8fd0f0', c3: '#c8f2ff', parts: ['fins', 'heads', 'spikes'], eye: 'fierce', evo: [['horns'], ['crystals']] },
  },
  {
    id: 'dryade', names: ['Dryade', 'Dryade sylvestre', 'Reine des bois'], tier: 4, element: 'plante',
    hp: 1050, atk: 58, as: 0.7, range: 3, armor: 0.15, mana: 80,
    ability: { kind: 'teamheal', name: 'Floraison', desc: 'Soigne toute l’équipe de {v} PV.', values: [210, 360, 720] },
    look: { body: 'biped', c1: '#3f9a5a', c2: '#d6f0b0', c3: '#f0ffb0', parts: ['leaves', 'halo', 'mane'], eye: 'cute', evo: [['sprout'], ['wings']] },
  },
];

export const CREATURE_BY_ID: Record<string, CreatureDef> = Object.fromEntries(CREATURES.map((c) => [c.id, c]));

// ——— Monstres des arènes ———
export interface MonsterDef extends Omit<CreatureDef, 'names' | 'tier'> {
  name: string;
  scale: number;
  boss?: boolean;
}

export const MONSTERS: Record<string, MonsterDef> = {
  loup: {
    id: 'loup', name: 'Loup d’ombre', element: 'ombre', scale: 1.35,
    hp: 860, atk: 40, as: 0.9, range: 1, armor: 0.15, mana: 60,
    ability: { kind: 'drain', name: 'Croc vorace', desc: 'Inflige {v} dégâts et se soigne.', values: [170, 170, 170] },
    look: { body: 'quad', c1: '#2a2440', c2: '#5c4f8a', c3: '#ff4d6d', parts: ['ears', 'spikes', 'tail', 'mane'], eye: 'fierce' },
  },
  champi: {
    id: 'champi', name: 'Champignon vénéneux', element: 'plante', scale: 1.4,
    hp: 1050, atk: 36, as: 0.6, range: 3, armor: 0.1, mana: 70,
    ability: { kind: 'aoe', name: 'Spores toxiques', desc: 'Inflige {v} dégâts autour de la cible.', values: [140, 140, 140], radius: 1 },
    look: { body: 'mushroom', c1: '#9a3fd0', c2: '#e6d6c0', c3: '#ff9af0', parts: [], eye: 'fierce' },
  },
  golem: {
    id: 'golem', name: 'Golem de cristal', element: 'roche', scale: 1.8,
    hp: 2900, atk: 62, as: 0.5, range: 1, armor: 0.35, mana: 100, startMana: 30,
    ability: { kind: 'slam', name: 'Écrasement', desc: '{v} dégâts et étourdit autour de lui.', values: [230, 230, 230], radius: 1, duration: 1.5 },
    look: { body: 'golem', c1: '#4a4466', c2: '#8f84b8', c3: '#ffcf5a', parts: ['crystals', 'spikes'], eye: 'glow' },
  },
  araignee: {
    id: 'araignee', name: 'Araignée-éclair', element: 'foudre', scale: 1.35,
    hp: 1150, atk: 46, as: 0.95, range: 2, armor: 0.1, mana: 60,
    ability: { kind: 'multishot', name: 'Toile électrique', desc: 'Frappe 2 ennemis pour {v} dégâts.', values: [160, 160, 160], count: 2 },
    look: { body: 'spider', c1: '#2b2a1a', c2: '#6b6330', c3: '#fff04a', parts: ['bolt'], eye: 'glow' },
  },
  hydre: {
    id: 'hydre', name: 'Hydre des marées', element: 'eau', scale: 1.9,
    hp: 7000, atk: 110, as: 0.6, range: 2, armor: 0.25, mana: 90,
    ability: { kind: 'aoe', name: 'Lame de fond', desc: 'Inflige {v} dégâts dans une large zone.', values: [310, 310, 310], radius: 2 },
    look: { body: 'serpent', c1: '#163a52', c2: '#3f8aa8', c3: '#7affe0', parts: ['fins', 'heads', 'spikes'], eye: 'glow' },
  },
  crabe: {
    id: 'crabe', name: 'Crabe-titan', element: 'eau', scale: 1.55,
    hp: 3800, atk: 80, as: 0.55, range: 1, armor: 0.45, mana: 100,
    ability: { kind: 'shield', name: 'Carapace d’acier', desc: 'Bouclier de {v} PV.', values: [800, 800, 800] },
    look: { body: 'crab', c1: '#5a2a2a', c2: '#b86a5a', c3: '#ffb070', parts: ['shell', 'spikes'], eye: 'fierce' },
  },
  dragonnet: {
    id: 'dragonnet', name: 'Dragonnet des cendres', element: 'feu', scale: 1.45,
    hp: 3600, atk: 95, as: 0.8, range: 2, armor: 0.2, mana: 70,
    ability: { kind: 'nuke', name: 'Crachat de braise', desc: 'Inflige {v} dégâts.', values: [240, 240, 240] },
    look: { body: 'dragon', c1: '#6a2418', c2: '#d8743a', c3: '#ffcf5a', parts: ['wings', 'horns', 'spikes'], eye: 'glow' },
  },
  dragon: {
    id: 'dragon', name: 'Vermithrax, Dragon des marais', element: 'ombre', scale: 2.6, boss: true,
    hp: 24000, atk: 165, as: 0.6, range: 2, armor: 0.3, mana: 100, startMana: 50,
    ability: { kind: 'aoe', name: 'Souffle putride', desc: 'Inflige {v} dégâts dans une large zone.', values: [420, 420, 420], radius: 2 },
    look: { body: 'dragon', c1: '#1f3a2a', c2: '#4f8a5a', c3: '#b4ff5a', parts: ['wings', 'horns', 'spikes', 'tail'], eye: 'glow' },
  },
};

export interface Encounter {
  name: string;
  desc: string;
  reward: number;
  // Réglage fin de la difficulté (voir scripts/balance2.ts) : multiplie PV, attaque et sorts des monstres.
  power: number;
  enemies: { id: string; col: number; row: number }[];
}

export const ENCOUNTERS: Encounter[] = [
  {
    name: 'Les Crocs de la Lisière', reward: 15, power: 1.04,
    desc: 'Une meute de loups d’ombre protégée par un champignon vénéneux.',
    enemies: [
      { id: 'loup', col: 2, row: 2 },
      { id: 'loup', col: 4, row: 2 },
      { id: 'champi', col: 3, row: 1 },
    ],
  },
  {
    name: 'Le Nid de Cristal', reward: 25, power: 0.86,
    desc: 'Un golem colossal et ses araignées crépitantes.',
    enemies: [
      { id: 'golem', col: 3, row: 2 },
      { id: 'araignee', col: 1, row: 1 },
      { id: 'araignee', col: 5, row: 1 },
    ],
  },
  {
    name: 'Les Marées Noires', reward: 35, power: 0.8,
    desc: 'L’hydre des marées, gardée par deux crabes-titans.',
    enemies: [
      { id: 'hydre', col: 3, row: 1 },
      { id: 'crabe', col: 2, row: 3 },
      { id: 'crabe', col: 4, row: 3 },
    ],
  },
  {
    name: 'Vermithrax', reward: 0, power: 0.66,
    desc: 'Le dragon des marais et sa couvée. Le combat final.',
    enemies: [
      { id: 'dragon', col: 3, row: 1 },
      { id: 'dragonnet', col: 1, row: 2 },
      { id: 'dragonnet', col: 5, row: 2 },
    ],
  },
];

// Probabilités de tier en boutique selon le niveau (arène + académies).
export const SHOP_ODDS: number[][] = [
  [80, 20, 0, 0],
  [62, 32, 6, 0],
  [48, 35, 15, 2],
  [36, 34, 22, 8],
  [26, 32, 28, 14],
  [18, 28, 32, 22],
];
