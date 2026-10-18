import { RNG, makeNoise } from '../core/rng';
import { axialToWorld, hexDistance, neighbors } from '../core/hex';
import type { Terrain } from '../data/types';
import { TERRAINS } from '../data/terrain';
import { type GameState, type Tile, buildTrack, getTile, tileIndex } from './state';
import { updateExploration } from './economy';

export function newGame(seed: number): GameState {
  const rng = new RNG(seed);
  const radius = 10;
  const elevN = makeNoise(seed * 7 + 1);
  const moistN = makeNoise(seed * 13 + 5);
  const tiles: Tile[] = [];

  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      const d = hexDistance({ q, r }, { q: 0, r: 0 });
      const w = axialToWorld(q, r, 1);
      const nx = w.x * 0.17;
      const ny = w.y * 0.17;
      const falloff = Math.pow(d / radius, 2.2);
      const e = elevN(nx + 3.1, ny - 7.3, 4) * 0.9 + 0.42 - falloff * 1.05;
      const m = moistN(nx * 1.3 - 2, ny * 1.3 + 4, 3);
      let terrain: Terrain;
      if (d >= radius) terrain = 'ocean';
      else if (e < 0.02) terrain = 'ocean';
      else if (e < 0.1) terrain = 'beach';
      else if (e > 0.62) terrain = 'mountain';
      else if (e > 0.46) terrain = 'hills';
      else if (m > 0.32) terrain = 'grove';
      else if (m > 0.04) terrain = 'forest';
      else terrain = 'plains';
      tiles.push({ q, r, terrain, feature: null, variant: rng.int(0, 999), explored: false, building: null });
    }
  }

  const s: GameState = {
    version: 1,
    seed,
    rng: 0,
    step: 0,
    track: buildTrack(),
    radius,
    tiles,
    res: { gold: 15, wood: 20, stone: 8, food: 10 },
    villagers: 3,
    builders: 1,
    hearts: 3,
    maxHearts: 3,
    relics: [],
    companions: [],
    eggs: [],
    arenaIndex: 0,
    nextOrder: 1,
    seen: [],
    stats: { wins: 0, losses: 0, goldEarned: 0, built: 0, events: 0 },
    over: null,
  };
  tileIndex(s);

  const at = (q: number, r: number) => getTile(s, q, r);
  const isLand = (t: Tile | undefined) => !!t && TERRAINS[t.terrain].land;

  // Zone de départ : prairie au centre, et de quoi démarrer à proximité.
  for (const t of tiles) {
    const d = hexDistance(t, { q: 0, r: 0 });
    if (d <= 1) t.terrain = 'plains';
    else if (d === 2 && !isLand(t)) t.terrain = 'plains';
  }
  const ring = (dist: number) => tiles.filter((t) => hexDistance(t, { q: 0, r: 0 }) === dist);
  const ensure = (terrain: Terrain, maxDist: number, dist: number) => {
    if (tiles.some((t) => t.terrain === terrain && hexDistance(t, { q: 0, r: 0 }) <= maxDist)) return;
    const cand = ring(dist).filter((t) => isLand(t));
    const t = rng.pick(cand);
    t.terrain = terrain;
    return t;
  };
  ensure('forest', 2, 2);
  ensure('hills', 3, 3);
  ensure('mountain', 4, 4);
  ensure('grove', 5, 4);

  // Les cases d'océan au contact de la terre deviennent du littoral.
  for (const t of tiles) {
    if (t.terrain !== 'ocean') continue;
    if (neighbors(t).some((n) => isLand(at(n.q, n.r)))) t.terrain = 'shallow';
  }
  // Aucune grève isolée de l'eau : on la transforme en prairie.
  for (const t of tiles) {
    if (t.terrain !== 'beach') continue;
    const wet = neighbors(t).some((n) => {
      const nt = at(n.q, n.r);
      return !nt || !TERRAINS[nt.terrain].land;
    });
    if (!wet) t.terrain = 'plains';
  }

  // Ressources et points d'intérêt.
  const far = (t: Tile, min: number) => hexDistance(t, { q: 0, r: 0 }) >= min;
  for (const t of tiles) {
    if (t.terrain === 'mountain' && rng.chance(0.35)) t.feature = 'goldVein';
    else if (t.terrain === 'hills' && rng.chance(0.12)) t.feature = 'goldVein';
    else if (t.terrain === 'shallow' && rng.chance(0.28)) t.feature = 'fish';
  }
  const highs = rng.shuffle(tiles.filter((t) => (t.terrain === 'hills' || t.terrain === 'mountain') && !t.feature && far(t, 3)));
  highs.slice(0, 3).forEach((t) => (t.feature = 'crystals'));
  const nearMountain = tiles.find((t) => t.terrain === 'mountain' && hexDistance(t, { q: 0, r: 0 }) <= 4);
  if (nearMountain && !nearMountain.feature) nearMountain.feature = 'goldVein';
  // Points d'intérêt espacés les uns des autres.
  const spread = (cands: Tile[], n: number, feature: 'ruins' | 'lair', gap: number) => {
    const chosen: Tile[] = [];
    for (const t of rng.shuffle(cands)) {
      if (chosen.length >= n) break;
      if (t.feature) continue;
      if (tiles.some((o) => (o.feature === 'ruins' || o.feature === 'lair') && hexDistance(o, t) < gap)) continue;
      t.feature = feature;
      chosen.push(t);
    }
  };
  spread(tiles.filter((t) => isLand(t) && t.terrain !== 'mountain' && far(t, 3)), 4, 'ruins', 4);
  spread(tiles.filter((t) => (t.terrain === 'forest' || t.terrain === 'grove' || t.terrain === 'hills') && far(t, 4)), 4, 'lair', 3);

  // Hôtel de ville au centre, colisée à côté.
  const center = at(0, 0)!;
  center.feature = null;
  center.building = { id: 'townhall', progress: 0, done: true, paused: false, order: s.nextOrder++ };
  const colSpot = neighbors(center)
    .map((n) => at(n.q, n.r)!)
    .find((t) => t.terrain === 'plains')!;
  colSpot.feature = null;
  colSpot.building = { id: 'colosseum', progress: 0, done: true, paused: false, order: s.nextOrder++ };

  s.rng = rng.state;
  updateExploration(s);
  return s;
}
