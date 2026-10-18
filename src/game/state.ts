import type { BuildingId, Feature, ResKey, Terrain } from '../data/types';
import { hkey } from '../core/hex';

export interface PlacedBuilding {
  id: BuildingId;
  progress: number;
  done: boolean;
  paused: boolean;
  order: number;
}

export interface Tile {
  q: number;
  r: number;
  terrain: Terrain;
  feature: Feature | null;
  variant: number;
  explored: boolean;
  building: PlacedBuilding | null;
}

export type NodeKind = 'turn' | 'event' | 'arena' | 'boss';

export interface TrackNode {
  kind: NodeKind;
  act: number;
  arena?: number;
}

export interface Companion {
  id: string;
  star: number;
  shiny?: boolean;
}

// Œuf mystérieux : éclot au bout de quelques tours en une créature (parfois chromatique).
export interface Egg {
  turns: number;
  minTier: number;
  maxTier: number;
}

export interface GameState {
  version: 1;
  seed: number;
  rng: number;
  step: number;
  track: TrackNode[];
  radius: number;
  tiles: Tile[];
  res: Record<ResKey, number>;
  villagers: number;
  builders: number;
  hearts: number;
  maxHearts: number;
  relics: string[];
  companions: Companion[];
  eggs: Egg[];
  arenaIndex: number;
  nextOrder: number;
  seen: string[];
  stats: { wins: number; losses: number; goldEarned: number; built: number; events: number };
  over: null | 'win' | 'lose';
}

const SAVE_KEY = 'hexaria.save.v1';

export function buildTrack(): TrackNode[] {
  const t: TrackNode[] = [];
  const push = (kind: NodeKind, act: number, arena?: number) => t.push({ kind, act, arena });
  // Acte I
  push('turn', 1); push('turn', 1); push('event', 1); push('turn', 1); push('turn', 1); push('arena', 1, 0);
  // Acte II
  push('turn', 2); push('event', 2); push('turn', 2); push('turn', 2); push('event', 2); push('arena', 2, 1);
  // Acte III
  push('turn', 3); push('event', 3); push('turn', 3); push('event', 3); push('turn', 3); push('arena', 3, 2);
  // Final
  push('turn', 4); push('event', 4); push('turn', 4); push('boss', 4, 3);
  return t;
}

// Index de tuiles mis en cache par état (non sérialisé).
const indexCache = new WeakMap<GameState, Map<string, Tile>>();

export function tileIndex(s: GameState): Map<string, Tile> {
  let m = indexCache.get(s);
  if (!m || m.size !== s.tiles.length) {
    m = new Map(s.tiles.map((t) => [hkey(t.q, t.r), t]));
    indexCache.set(s, m);
  }
  return m;
}

export function getTile(s: GameState, q: number, r: number): Tile | undefined {
  return tileIndex(s).get(hkey(q, r));
}

// Pont vers le lanceur macOS natif (WKWebView) : la sauvegarde y est stockée dans UserDefaults.
type NativeHandler = { postMessage(v: unknown): void };
type NativeWindow = Window & {
  webkit?: { messageHandlers?: Record<string, NativeHandler | undefined> };
  __HEXARIA_SAVE__?: string | null;
};
const nativeWin = window as NativeWindow;

export function saveGame(s: GameState) {
  const json = JSON.stringify(s);
  try {
    localStorage.setItem(SAVE_KEY, json);
  } catch {
    /* stockage indisponible : on ignore */
  }
  nativeWin.webkit?.messageHandlers?.hexariaSave?.postMessage(json);
  if (nativeWin.__HEXARIA_SAVE__ !== undefined) nativeWin.__HEXARIA_SAVE__ = json;
}

export function loadGame(): GameState | null {
  try {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(SAVE_KEY);
    } catch {
      raw = null;
    }
    raw ??= nativeWin.__HEXARIA_SAVE__ ?? null;
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    s.eggs ??= [];
    s.seen ??= [];
    return s.version === 1 && !s.over ? s : null;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* rien */
  }
  nativeWin.webkit?.messageHandlers?.hexariaClear?.postMessage(null);
  if (nativeWin.__HEXARIA_SAVE__ !== undefined) nativeWin.__HEXARIA_SAVE__ = null;
}

export function hasRelic(s: GameState, id: string) {
  return s.relics.includes(id);
}
