// Mode aventure : une fois Vermithrax vaincu, la partie peut continuer avec des arènes générées,
// de plus en plus peuplées (jusqu'à 8 monstres), et un Gardien tous les quatre paliers.
import { RNG } from '../core/rng';
import type { Element } from './types';
import type { GameState, TrackNode } from '../game/state';
import { ENCOUNTERS, type Encounter, MONSTERS } from './creatures';
import { DIFFICULTY_BY_ID } from './difficulty';

export const BASE_ARENAS = ENCOUNTERS.length;

export const encounterAt = (s: GameState, idx: number): Encounter => (idx < BASE_ARENAS ? ENCOUNTERS[idx] : s.encounters![idx - BASE_ARENAS]);

// Coefficient final appliqué aux monstres : réglage de la rencontre × niveau de difficulté.
export const enemyPower = (s: GameState, enc: Encounter) => enc.power * DIFFICULTY_BY_ID[s.difficulty ?? 'normal'].power;

export const rewardOf = (s: GameState, enc: Encounter) => Math.round(enc.reward * DIFFICULTY_BY_ID[s.difficulty ?? 'normal'].reward);

export const isAdventureArena = (idx: number) => idx >= BASE_ARENAS;

const POOL = ['loup', 'champi', 'golem', 'araignee', 'hydre', 'crabe', 'dragonnet', 'harpie', 'treant', 'elementaire', 'liche'];
const FRONT: [number, number][] = [[3, 3], [2, 3], [4, 3], [1, 3], [5, 3], [3, 2], [2, 2], [4, 2]];
const BACK: [number, number][] = [[3, 1], [2, 1], [4, 1], [1, 1], [5, 1], [3, 0], [2, 0], [4, 0]];

const strength = (id: string) => Math.sqrt(MONSTERS[id].hp * MONSTERS[id].atk);

// Force totale visée au palier d (somme de racine(PV × attaque) des monstres, avant difficulté) : croissance régulière.
export const ADV = { base: 2000, growth: 1.085 }; // réglé avec scripts/balance2.ts --adventure
export const targetStrength = (depth: number) => ADV.base * ADV.growth ** depth;

const NOUNS = ['La Horde', 'Le Cercle', 'La Meute', 'L’Assaut', 'La Marche', 'Le Conclave'];
const PLACES: Record<Element, string> = {
  feu: 'des Braises', eau: 'des Marées', plante: 'de la Sylve', foudre: 'de l’Orage', roche: 'du Roc', ombre: 'des Ténèbres',
};
const GUARDIANS: Record<Element, string> = {
  feu: 'Brasier-roi', eau: 'Léviathan des tempêtes', plante: 'Aïeul des bois', foudre: 'Tonnerre incarné', roche: 'Colosse de granit', ombre: 'Seigneur des ombres',
};

export function adventureSize(depth: number) {
  return Math.min(8, 4 + Math.floor(depth / 2) + (depth % 4 === 3 ? 1 : 0));
}

export function makeAdventureEncounter(seed: number, depth: number): Encounter {
  const rng = new RNG((seed ^ 0x5a17) + depth * 7919 + 13);
  const guardian = depth % 4 === 3;
  const n = adventureSize(depth);
  const theme = rng.pick(['feu', 'eau', 'plante', 'foudre', 'roche', 'ombre'] as Element[]);
  const ids: string[] = [];
  // au moins un monstre de mêlée en première ligne
  const melee = POOL.filter((id) => MONSTERS[id].range === 1);
  ids.push(rng.pick(melee.filter((id) => MONSTERS[id].element === theme).concat(melee)));
  for (let guard = 0; ids.length < n && guard < 300; guard++) {
    const id = rng.weighted(POOL, (m) => (MONSTERS[m].element === theme ? 3 : 1) / (1 + ids.filter((x) => x === m).length * 1.4));
    // pas plus de deux très gros monstres avant le palier 5
    const big = ids.filter((x) => MONSTERS[x].hp > 2500).length;
    if (MONSTERS[id].hp > 2500 && big >= 2 + Math.floor(depth / 3)) continue;
    ids.push(id);
  }
  while (ids.length < n) ids.push('loup');
  if (guardian) {
    // le Gardien remplace le monstre de tête par un champion du type dominant
    const champ = ids.find((id) => MONSTERS[id].element === theme && MONSTERS[id].hp > 2500) ?? ids[0];
    ids[0] = champ;
  }
  const total = ids.reduce((a, id) => a + strength(id), 0);
  const power = (targetStrength(depth) * (guardian ? 1.12 : 1)) / total;
  const front = ids.filter((id) => MONSTERS[id].range <= 1);
  const back = ids.filter((id) => MONSTERS[id].range > 1);
  const enemies = [
    ...front.map((id, i) => ({ id, col: (FRONT[i] ?? BACK[i])[0], row: (FRONT[i] ?? BACK[i])[1] })),
    ...back.map((id, i) => ({ id, col: BACK[i][0], row: BACK[i][1] })),
  ];
  const seen = new Set<string>();
  const kinds = ids.filter((id) => !seen.has(id) && !!seen.add(id)).map((id) => MONSTERS[id].name);
  const palier = depth + 1;
  return {
    name: guardian ? `Gardien : ${GUARDIANS[theme]}` : `${rng.pick(NOUNS)} ${PLACES[theme]}`,
    desc: `Palier ${palier} de l’aventure : ${kinds.slice(0, 3).join(', ')}${kinds.length > 3 ? '…' : ''}. ${n} monstres${guardian ? ' menés par un Gardien' : ''}.`,
    reward: Math.round((30 + 6 * depth) * (guardian ? 1.6 : 1)),
    power: Math.round(power * 1000) / 1000,
    enemies,
  };
}

// Ajoute à la piste un nouveau palier (quelques tours puis une arène) et génère sa rencontre.
export function extendTrack(s: GameState) {
  s.adventure ??= { depth: 0, cleared: 0 };
  s.encounters ??= [];
  const depth = s.adventure.depth;
  s.encounters[depth] = makeAdventureEncounter(s.seed, depth);
  const act = 5 + depth;
  const guardian = depth % 4 === 3;
  const nodes: TrackNode[] = [
    { kind: 'turn', act }, { kind: 'turn', act }, { kind: 'event', act }, { kind: 'turn', act },
    { kind: guardian ? 'boss' : 'arena', act, arena: BASE_ARENAS + depth },
  ];
  s.track.push(...nodes);
  s.adventure.depth++;
}

// Numéro de palier d'une arène d'aventure (1 pour la première après le boss).
export const paliers = (idx: number) => idx - BASE_ARENAS + 1;
