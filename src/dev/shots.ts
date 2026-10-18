// Mode « captures d'écran » (développement uniquement) : met le jeu en scène pour `npm run shots` (voir scripts/shots.mjs).
// Utilisation : http://localhost:5173/?shot=<scène>&seed=<nombre>
import { app } from '../app';
import { CREATURE_BY_ID } from '../data/creatures';
import { EVENTS, hatchEvent } from '../data/events';
import { RNG } from '../core/rng';
import type { BuildingId } from '../data/types';
import { canBuild, placeBuilding, townhall } from '../game/economy';
import { newGame } from '../game/mapgen';
import type { GameState } from '../game/state';
import { hexDistance } from '../core/hex';
import { getSprite } from '../render/sprites';
import { ArenaScene } from '../scenes/arenaScene';
import { WorldScene } from '../scenes/worldScene';
import { TitleScene } from '../scenes/titleScene';
import { openCodex } from '../ui/codex';
import { showEvent } from '../ui/common';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function kingdom(seed: number): GameState {
  const s = newGame(seed);
  const th = townhall(s);
  for (const t of s.tiles) if (hexDistance(t, th) <= 7) t.explored = true;
  s.res = { gold: 46, wood: 38, stone: 22, food: 31 };
  s.villagers = 7;
  s.builders = 1;
  s.step = 8;
  s.hearts = 3;
  s.relics = ['cristalArdent', 'bourse', 'corne'];
  s.companions = [{ id: 'flammeche', star: 2 }, { id: 'goutelle', star: 1, shiny: true }];
  s.eggs = [{ turns: 2, minTier: 2, maxTier: 3 }];
  const saved = { ...s.res };
  s.res = { gold: 999, wood: 999, stone: 999, food: 999 };
  const plan: BuildingId[] = ['house', 'farm', 'farm', 'house', 'lumber', 'quarry', 'mine', 'port', 'market', 'house', 'auction', 'tavern', 'barracks', 'forge', 'shrine', 'academy', 'menagerie', 'farm', 'house'];
  for (const id of plan) {
    const cands = s.tiles.filter((t) => canBuild(s, t, id).ok).sort((a, b) => hexDistance(a, th) - hexDistance(b, th));
    // on évite de tout coller : on prend l'une des trois premières cases valides
    const t = cands[Math.min(cands.length - 1, id === 'house' || id === 'farm' ? 1 : 0)];
    if (!t) continue;
    placeBuilding(s, t, id);
    t.building!.done = true;
  }
  s.res = saved;
  return s;
}

const PAINTED = ['flammeche', 'bourgeon', 'goutelle', 'galet', 'carapix'];

function paintedUnits(a: Any, shinyOne = true) {
  a.units.length = 0;
  const add = (key: string, star: number, col: number, row: number, shiny = false) =>
    a.units.push({ uid: a.nextUid++, key, star, companion: false, shiny, at: { kind: 'board', col, row } });
  add('galet', 3, 3, 4);
  add('carapix', 2, 1, 5);
  add('flammeche', 2, 4, 5);
  add('goutelle', 1, 2, 6, shinyOne);
  add('bourgeon', 2, 5, 6);
  a.units.push({ uid: a.nextUid++, key: 'flammeche', star: 1, companion: false, shiny: false, at: { kind: 'bench', i: 1 } });
  a.units.push({ uid: a.nextUid++, key: 'galet', star: 1, companion: false, shiny: false, at: { kind: 'bench', i: 3 } });
  a.bonus.boardSlots = 5;
}

function shopOf(a: Any, ids: string[]) {
  a.shop = ids.map((id) => CREATURE_BY_ID[id]);
  a.shopShiny = ids.map((_, i) => i === 1);
  a.gold = 14;
  a.refreshUI();
}

export async function runShot(name: string) {
  const q = new URLSearchParams(location.search);
  const seed = Number(q.get('seed') ?? 20241018);
  document.body.classList.add('shot');
  const done = () => {
    (window as Any).__shot = 'ready';
  };

  if (name === 'title') {
    app.setScene(new TitleScene());
    await wait(1500);
    return done();
  }

  if (name === 'world' || name === 'worldzoom') {
    const s = kingdom(seed);
    const sc = new WorldScene(s);
    app.setScene(sc);
    await wait(500);
    const th = (sc as Any).tilePos(townhall(s));
    const sa = sc as Any;
    if (name === 'world') {
      sa.cam.zoom = Math.max(1.0, app.w / 1500) * 1.25;
      sa.cam.x = th.x + 20;
      sa.cam.y = th.y + 10;
    } else {
      sa.cam.zoom = 3.1;
      const col = s.tiles.find((t) => t.building?.id === 'colosseum')!;
      const p = sa.tilePos(col);
      sa.cam.x = (p.x + th.x) / 2;
      sa.cam.y = (p.y + th.y) / 2 - 10;
    }
    sa.refresh();
    await wait(900);
    return done();
  }

  if (name === 'arena' || name === 'fight' || name === 'boss') {
    const s = kingdom(seed);
    const idx = name === 'boss' ? 3 : name === 'fight' ? 2 : 0;
    const sc = new ArenaScene(s, idx, () => undefined);
    app.setScene(sc);
    const a = sc as Any;
    await wait(1200);
    paintedUnits(a);
    shopOf(a, ['bourgeon', 'goutelle', 'galet', 'flammeche', 'carapix']);
    if (name !== 'arena') {
      a.startFight();
      const steps = name === 'boss' ? 150 : 170;
      for (let i = 0; i < steps; i++) {
        a.combat.step(1 / 30);
        a.consumeEvents();
        a.fx.update(1 / 30);
        a.t += 1 / 30;
      }
      a.refreshMeter();
      a.refreshUI();
    }
    await wait(500);
    return done();
  }

  if (name === 'event' || name === 'hatch') {
    const s = kingdom(seed);
    const sc = new WorldScene(s);
    app.setScene(sc);
    await wait(500);
    if (name === 'event') {
      showEvent(EVENTS.find((e) => e.id === 'fairyRing')!, s, () => undefined);
    } else {
      const rng = new RNG(7);
      let ev = hatchEvent(s, rng, { minTier: 1, maxTier: 2 });
      for (let i = 0; i < 200 && !(ev.creature && PAINTED.includes(ev.creature) && getSprite(`creatures/${ev.creature}_1`)); i++) ev = hatchEvent(s, rng, { minTier: 1, maxTier: 2 });
      showEvent(ev, s, () => undefined);
    }
    await wait(1200);
    return done();
  }

  if (name.startsWith('codex')) {
    app.setScene(new TitleScene());
    await wait(500);
    const tab = name === 'codex' ? 'bestiary' : name === 'codextypes' || name === 'codexcross' ? 'types' : 'monsters';
    openCodex(tab);
    await wait(500);
    const body = document.querySelector('.cx-body') as HTMLElement;
    document.querySelector('.cx-explain')?.removeAttribute('open');
    if (name === 'codexcross') {
      const t = document.querySelector('#cx-cross') as HTMLElement;
      body.scrollTop = t.closest('.cx-scroll')!.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - 60;
    }
    if (name === 'codextypes') {
      document.querySelectorAll('.cx-explain').forEach((d) => d.removeAttribute('open'));
    }
    await wait(500);
    return done();
  }

  done();
}
