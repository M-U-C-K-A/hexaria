// Profil du joueur, conservé d'une partie à l'autre : statistiques et hauts faits.
import { ACHIEVEMENT_BY_ID } from './data/achievements';
import type { GameState } from './game/state';

export interface Profile {
  runs: number;
  wins: number; // parties gagnées (Vermithrax vaincu)
  arenaWins: number;
  arenaLosses: number;
  built: number;
  events: number;
  shinies: number;
  hatched: number;
  bestPalier: number; // palier d'aventure le plus profond franchi
  unlocked: Record<string, number>; // id → date (ms)
}

const KEY = 'hexaria.profile.v1';
const EMPTY: Profile = { runs: 0, wins: 0, arenaWins: 0, arenaLosses: 0, built: 0, events: 0, shinies: 0, hatched: 0, bestPalier: 0, unlocked: {} };

function load(): Profile {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Profile>;
    return { ...EMPTY, ...p, unlocked: { ...(p.unlocked ?? {}) } };
  } catch {
    return { ...EMPTY, unlocked: {} };
  }
}

export const profile: Profile = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    /* stockage indisponible : on ignore */
  }
}

let notify: (id: string) => void = () => undefined;
// L'interface s'abonne ici pour afficher « Haut fait débloqué ».
export function onUnlock(fn: (id: string) => void) {
  notify = fn;
}

export function unlock(id: string) {
  if (profile.unlocked[id] || !ACHIEVEMENT_BY_ID[id]) return;
  profile.unlocked[id] = Date.now();
  save();
  notify(id);
}

export const unlockedCount = () => Object.keys(profile.unlocked).length;

export function resetProfile() {
  Object.assign(profile, EMPTY, { unlocked: {} });
  save();
}

const CORE = ['townhall', 'colosseum'];

// Hauts faits qui se déduisent de l'état du royaume : évalués après chaque action notable.
export function checkState(s: GameState) {
  const buildings = s.tiles.filter((t) => t.building && !CORE.includes(t.building.id));
  if (buildings.length) unlock('firstBuild');
  if (buildings.length >= 15) unlock('urbaniste');
  if (s.companions.length >= 3) unlock('dresseur');
  if (s.relics.length >= 5) unlock('collection');
  if (s.stats.events >= 10) unlock('events');
  if (s.companions.some((c) => c.star >= 3)) unlock('evolve3');
  if (s.companions.some((c) => c.shiny)) unlock('shiny');
}

export const meta = {
  runStart() {
    profile.runs++;
    save();
  },
  built(s: GameState, id: string) {
    profile.built++;
    save();
    if (id === 'auction' || id === 'port') {
      const other = id === 'auction' ? 'port' : 'auction';
      const placed = s.tiles.filter((t) => t.building?.id === id);
      const has = (q: number, r: number) => s.tiles.some((t) => t.q === q && t.r === r && t.building?.id === other);
      const dirs = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
      if (placed.some((t) => dirs.some(([dq, dr]) => has(t.q + dq, t.r + dr)))) unlock('voisinage');
    }
    checkState(s);
  },
  arena(s: GameState, won: boolean) {
    if (won) {
      profile.arenaWins++;
      unlock('firstWin');
      if (s.hearts === 1) unlock('comeback');
    } else profile.arenaLosses++;
    save();
    checkState(s);
  },
  boss(s: GameState) {
    profile.wins++;
    save();
    unlock('dragon');
    if (s.hearts === s.maxHearts) unlock('flawless');
    if (s.difficulty === 'legendaire') unlock('legend');
  },
  palier(cleared: number) {
    profile.bestPalier = Math.max(profile.bestPalier, cleared);
    save();
    if (cleared >= 3) unlock('adventurer');
    if (cleared >= 8) unlock('abyss');
  },
  event(s: GameState) {
    profile.events++;
    save();
    checkState(s);
  },
  shiny() {
    profile.shinies++;
    save();
    unlock('shiny');
  },
  hatch() {
    profile.hatched++;
    save();
    unlock('hatch');
  },
  evolve(star: number) {
    if (star >= 3) unlock('evolve3');
  },
  synergy(count: number) {
    if (count >= 4) unlock('synergy4');
  },
  tutorial() {
    unlock('tutorial');
  },
};
