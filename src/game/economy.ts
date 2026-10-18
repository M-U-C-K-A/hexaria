import { hexDistance, hkey, neighbors } from '../core/hex';
import { BUILDINGS } from '../data/buildings';
import { TERRAINS } from '../data/terrain';
import type { BuildingId, Res, ResKey } from '../data/types';
import { type GameState, type PlacedBuilding, type Tile, getTile, hasRelic } from './state';

export const RES_KEYS: ResKey[] = ['gold', 'wood', 'stone', 'food'];

export const RES_NAMES: Record<ResKey, string> = { gold: 'Or', wood: 'Bois', stone: 'Pierre', food: 'Nourriture' };

export function adjTiles(s: GameState, t: { q: number; r: number }): Tile[] {
  return neighbors(t)
    .map((n) => getTile(s, n.q, n.r))
    .filter((x): x is Tile => !!x);
}

export function isWater(t: Tile | undefined) {
  return !t || !TERRAINS[t.terrain].land;
}

export function townhall(s: GameState): Tile {
  return s.tiles.find((t) => t.building?.id === 'townhall')!;
}

export function territory(s: GameState): Set<string> {
  const set = new Set<string>();
  const th = townhall(s);
  for (const t of s.tiles) {
    if (hexDistance(t, th) <= 2) set.add(hkey(t.q, t.r));
  }
  for (const t of s.tiles) {
    if (!t.building) continue;
    set.add(hkey(t.q, t.r));
    for (const n of neighbors(t)) set.add(hkey(n.q, n.r));
  }
  return set;
}

export function updateExploration(s: GameState) {
  const terr = territory(s);
  const owned = s.tiles.filter((t) => terr.has(hkey(t.q, t.r)));
  for (const t of s.tiles) {
    if (t.explored) continue;
    if (owned.some((o) => hexDistance(o, t) <= 2)) t.explored = true;
  }
}

export function countBuildings(s: GameState, id: BuildingId, doneOnly = false) {
  return s.tiles.filter((t) => t.building?.id === id && (!doneOnly || t.building.done)).length;
}

export function popCap(s: GameState) {
  let cap = 0;
  for (const t of s.tiles) {
    if (!t.building?.done) continue;
    if (t.building.id === 'townhall') cap += 4;
    if (t.building.id === 'house') cap += 2;
  }
  return cap;
}

export function jobBuildings(s: GameState): PlacedBuilding[] {
  return s.tiles
    .map((t) => t.building)
    .filter((b): b is PlacedBuilding => !!b && b.done && BUILDINGS[b.id].jobs > 0)
    .sort((a, b) => a.order - b.order);
}

export function workers(s: GameState) {
  return Math.max(0, s.villagers - s.builders);
}

export function staffedSet(s: GameState): Set<PlacedBuilding> {
  const set = new Set<PlacedBuilding>();
  let free = workers(s);
  for (const b of jobBuildings(s)) {
    if (b.paused) continue;
    if (free >= BUILDINGS[b.id].jobs) {
      free -= BUILDINGS[b.id].jobs;
      set.add(b);
    }
  }
  return set;
}

export interface YieldLine {
  label: string;
  res: Res;
}

export interface Yield {
  res: Res;
  lines: YieldLine[];
}

function addRes(a: Res, b: Res) {
  for (const k of RES_KEYS) if (b[k]) a[k] = (a[k] ?? 0) + b[k]!;
}

// Production d'un bâtiment (réel ou hypothétique) sur une tuile, avec le détail des bonus d'adjacence.
export function buildingYield(s: GameState, t: Tile, id: BuildingId): Yield {
  const lines: YieldLine[] = [];
  const adj = adjTiles(s, t);
  const adjB = (bid: BuildingId) => adj.filter((n) => n.building?.id === bid).length;
  const L = (label: string, res: Res) => lines.push({ label, res });

  switch (id) {
    case 'townhall':
      L('Base', { gold: 3, food: 2, wood: 1, stone: 1 });
      break;
    case 'house':
      if (adjB('farm') > 0) L('Ferme adjacente', { food: 1 });
      break;
    case 'farm': {
      L('Base', { food: 3 });
      const f = Math.min(2, adjB('farm'));
      if (f) L(`${f} ferme(s) adjacente(s)`, { food: f });
      if (adj.some((n) => isWater(n))) L('Près de l’eau', { food: 1 });
      if (hasRelic(s, 'corne')) L('Corne d’abondance', { food: 1 });
      break;
    }
    case 'lumber': {
      L('Base', { wood: 2 });
      const f = Math.min(3, adj.filter((n) => n.terrain === 'forest' || n.terrain === 'grove').length);
      if (f) L(`${f} forêt(s) adjacente(s)`, { wood: f });
      break;
    }
    case 'quarry': {
      L('Base', { stone: 2 });
      const h = Math.min(3, adj.filter((n) => n.terrain === 'hills' || n.terrain === 'mountain').length);
      if (h) L(`${h} relief(s) adjacent(s)`, { stone: h });
      break;
    }
    case 'mine':
      L('Base', { gold: 2 });
      if (t.feature === 'goldVein') L('Filon d’or', { gold: 3 });
      if (t.feature === 'crystals') L('Cristaux d’ambre', { gold: 5 });
      break;
    case 'port': {
      L('Base', { gold: 2, food: 1 });
      const fish = adj.filter((n) => n.feature === 'fish').length;
      if (fish) L(`${fish} banc(s) de poissons`, { food: 2 * fish });
      break;
    }
    case 'market': {
      L('Base', { gold: 3 });
      const h = Math.min(3, adjB('house'));
      if (h) L(`${h} maison(s) adjacente(s)`, { gold: h });
      if (adjB('townhall')) L('Près de l’hôtel de ville', { gold: 2 });
      break;
    }
    case 'auction':
      L('Base', { gold: 4 });
      if (adjB('port')) L('Adjacent à un port', { gold: 5 });
      if (adjB('market')) L('Adjacent à un marché', { gold: 2 });
      break;
    case 'tavern':
      L('Base', { gold: 1 });
      break;
    default:
      break;
  }
  const res: Res = {};
  for (const l of lines) addRes(res, l.res);
  return { res, lines };
}

export interface Income {
  res: Record<ResKey, number>;
  upkeep: number;
  goldBonus: number;
}

export function turnIncome(s: GameState): Income {
  const staffed = staffedSet(s);
  const res: Record<ResKey, number> = { gold: 0, wood: 0, stone: 0, food: 0 };
  for (const t of s.tiles) {
    const b = t.building;
    if (!b || !b.done) continue;
    if (BUILDINGS[b.id].jobs > 0 && !staffed.has(b)) continue;
    const y = buildingYield(s, t, b.id).res;
    for (const k of RES_KEYS) res[k] += y[k] ?? 0;
  }
  let goldBonus = 0;
  if (hasRelic(s, 'bourse')) {
    goldBonus = Math.round(res.gold * 0.2);
    res.gold += goldBonus;
  }
  const upkeep = s.villagers;
  return { res, upkeep, goldBonus };
}

export function growthCost(s: GameState) {
  return 6 + 2 * s.villagers;
}

export function buildPoints(s: GameState) {
  return s.builders * (hasRelic(s, 'marteau') ? 2 : 1);
}

export function canAfford(s: GameState, cost: Res) {
  return RES_KEYS.every((k) => (cost[k] ?? 0) <= s.res[k]);
}

export function canBuild(s: GameState, t: Tile, id: BuildingId, terr?: Set<string>): { ok: boolean; reason?: string } {
  const def = BUILDINGS[id];
  terr ??= territory(s);
  if (!t.explored) return { ok: false, reason: 'Zone inexplorée' };
  if (!terr.has(hkey(t.q, t.r))) return { ok: false, reason: 'Hors de votre territoire' };
  if (t.building) return { ok: false, reason: 'Case occupée' };
  if (t.feature === 'ruins' || t.feature === 'lair') return { ok: false, reason: 'Explorez d’abord ce lieu' };
  if (!def.terrains.includes(t.terrain)) return { ok: false, reason: `Terrain inadapté (${TERRAINS[t.terrain].name})` };
  if (def.needsWater && !adjTiles(s, t).some((n) => isWater(n))) return { ok: false, reason: 'Doit être au bord de l’eau' };
  if (def.max && countBuildings(s, id) >= def.max) return { ok: false, reason: `Maximum ${def.max}` };
  if (!canAfford(s, def.cost)) return { ok: false, reason: 'Ressources insuffisantes' };
  return { ok: true };
}

export function placeBuilding(s: GameState, t: Tile, id: BuildingId) {
  const def = BUILDINGS[id];
  for (const k of RES_KEYS) s.res[k] -= def.cost[k] ?? 0;
  t.building = { id, progress: 0, done: false, paused: false, order: s.nextOrder++ };
  updateExploration(s);
}

export function cancelBuilding(s: GameState, t: Tile) {
  const b = t.building;
  if (!b || b.done) return;
  const def = BUILDINGS[b.id];
  for (const k of RES_KEYS) s.res[k] += def.cost[k] ?? 0;
  t.building = null;
}

export interface Notice {
  text: string;
  kind: 'good' | 'bad' | 'info';
}

// Résolution économique d'une fin de tour : production, chantiers, nourriture et croissance.
export function endTurnEconomy(s: GameState): Notice[] {
  const notes: Notice[] = [];
  const inc = turnIncome(s);
  s.res.gold += inc.res.gold;
  s.res.wood += inc.res.wood;
  s.res.stone += inc.res.stone;
  s.res.food += inc.res.food - inc.upkeep;
  s.stats.goldEarned += inc.res.gold;

  let pts = buildPoints(s);
  const sites = s.tiles
    .filter((t) => t.building && !t.building.done)
    .sort((a, b) => a.building!.order - b.building!.order);
  for (const t of sites) {
    if (pts <= 0) break;
    const b = t.building!;
    const need = BUILDINGS[b.id].work - b.progress;
    const use = Math.min(need, pts);
    b.progress += use;
    pts -= use;
    if (b.progress >= BUILDINGS[b.id].work) {
      b.done = true;
      s.stats.built++;
      notes.push({ text: `${BUILDINGS[b.id].name} terminé(e) !`, kind: 'good' });
    }
  }

  if (s.res.food < 0) {
    s.res.food = 0;
    if (s.villagers > 1) {
      s.villagers--;
      notes.push({ text: 'Famine ! Un villageois quitte le royaume.', kind: 'bad' });
    }
  } else if (s.villagers < popCap(s) && s.res.food >= growthCost(s)) {
    s.res.food -= growthCost(s);
    s.villagers++;
    notes.push({ text: 'Un nouveau villageois rejoint le royaume.', kind: 'good' });
  }
  s.builders = Math.min(s.builders, s.villagers);
  updateExploration(s);
  return notes;
}

export interface CombatBonus {
  boardSlots: number;
  atkMul: number;
  hpMul: number;
  oddsLevel: number;
  freeRerolls: number;
  companionSlots: number;
  prepTime: number;
  bonusGold: number;
  lines: string[];
}

export function combatBonuses(s: GameState): CombatBonus {
  const staffed = staffedSet(s);
  const lines: string[] = [];
  let barracks = 0;
  let atk = 0;
  let hp = 0;
  let academies = 0;
  let taverns = 0;
  let menageries = 0;
  for (const t of s.tiles) {
    const b = t.building;
    if (!b?.done) continue;
    const worked = BUILDINGS[b.id].jobs === 0 || staffed.has(b);
    if (!worked) continue;
    const adj = adjTiles(s, t);
    switch (b.id) {
      case 'barracks': barracks++; break;
      case 'forge': atk += 0.1 + (adj.some((n) => n.building?.id === 'mine') ? 0.05 : 0); break;
      case 'shrine': hp += 0.12 + (t.terrain === 'grove' || adj.some((n) => n.terrain === 'grove') ? 0.08 : 0); break;
      case 'academy': academies++; break;
      case 'tavern': taverns++; break;
      case 'menagerie': menageries++; break;
      default: break;
    }
  }
  const boardSlots = 4 + Math.min(3, barracks) + (hasRelic(s, 'banniere') ? 1 : 0);
  const oddsLevel = Math.min(5, s.arenaIndex + academies + (hasRelic(s, 'parchemin') ? 1 : 0));
  const freeRerolls = taverns * 2 + (hasRelic(s, 'de') ? 3 : 0);
  if (barracks) lines.push(`Casernes : +${Math.min(3, barracks)} place(s)`);
  if (atk) lines.push(`Forges : +${Math.round(atk * 100)}% attaque`);
  if (hp) lines.push(`Sanctuaires : +${Math.round(hp * 100)}% PV`);
  if (academies) lines.push(`Académies : boutique niveau +${academies}`);
  if (taverns) lines.push(`Tavernes : +${taverns * 2} relances gratuites`);
  if (menageries) lines.push(`Ménageries : +${menageries} compagnon(s)`);
  return {
    boardSlots,
    atkMul: 1 + atk,
    hpMul: 1 + hp,
    oddsLevel,
    freeRerolls,
    companionSlots: 1 + menageries,
    prepTime: 90 + (hasRelic(s, 'oeil') ? 30 : 0),
    bonusGold: hasRelic(s, 'oeil') ? 8 : 0,
    lines,
  };
}
