import { type Scene, app } from '../app';
import { audio } from '../audio';
import { settings } from '../settings';
import { ISO, axialToWorld, hexCorners, hkey, pointInPoly, tracePoly } from '../core/hex';
import { RNG } from '../core/rng';
import { BUILDINGS, BUILD_MENU } from '../data/buildings';
import { BASE_ARENAS, encounterAt, extendTrack, isAdventureArena, rewardOf } from '../data/adventure';
import { DIFFICULTY_BY_ID } from '../data/difficulty';
import { meta } from '../meta';
import { MONSTERS } from '../data/creatures';
import { ELEMENTS } from '../data/elements';
import { companionFull, hatchEvent, lairEvent, pickEvent, victoryEvent, type GameEvent } from '../data/events';
import { FEATURES, TERRAINS } from '../data/terrain';
import type { BuildingId, Res } from '../data/types';
import { RELIC_BY_ID } from '../data/relics';
import { CREATURE_BY_ID } from '../data/creatures';
import {
  RES_NAMES, buildPoints, buildingYield, canBuild, cancelBuilding, combatBonuses, endTurnEconomy, growthCost,
  isWater, jobBuildings, placeBuilding, popCap, staffedSet, territory, turnIncome, workers,
} from '../game/economy';
import { type GameState, type Tile, clearSave, difficultyOf, getTile, hasRelic, saveGame } from '../game/state';
import { CHIMNEYS, buildingIcon, drawBuilding } from '../render/buildingArt';
import { creaturePortrait } from '../render/creatureArt';
import { type Ctx, glow, rgba } from '../render/draw';
import { FX } from '../render/fx';
import { BASE_DEPTH, drawBorder, drawTileBase, drawTileDecor, tileElev } from '../render/terrainArt';
import { RES_ORDER, bindTip, costHtml, mount, resInline, showEvent, stars, toast, tooltip } from '../ui/common';
import { icon } from '../ui/icons';
import { startTour, stopTutorial, tutorialOn } from '../ui/tutorial';
import { postArenaChapter, worldChapter } from '../ui/tutorialChapters';
import { ArenaScene } from './arenaScene';
import { TitleScene } from './titleScene';

const HEX = 46;
const LS = 2;
const EDGE_DIRS = [
  [1, 0],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [0, -1],
  [1, -1],
];
const DOCK_PREF = [1, 2, 0, 3, 5, 4];

const RES_COLORS: Record<string, string> = { gold: '#f2c14e', wood: '#c08a50', stone: '#b8bec4', food: '#9be06a' };

export interface ArenaOutcome {
  idx: number;
  result: 'win' | 'lose';
}

export class WorldScene implements Scene {
  s: GameState;
  cam = { x: 0, y: 0, zoom: 1 };
  private layer: HTMLCanvasElement | null = null;
  private bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  private dirty = true;
  private layerStale = true;
  private terr = new Set<string>();
  private docks = new Map<Tile, Tile>();
  private sorted: Tile[] = [];
  private pos = new Map<Tile, { x: number; y: number }>();
  private hover: Tile | null = null;
  private selected: Tile | null = null;
  private buildSel: BuildingId | null = null;
  private validCache: Map<Tile, Res> | null = null;
  private fx = new FX();
  private drag = { down: false, sx: 0, sy: 0, cx: 0, cy: 0, moved: false };
  private keys = new Set<string>();
  private busy = false;
  private t = 0;
  private smokeT = 0;
  private moteT = 0;
  private tab: 'eco' | 'combat' = 'eco';
  private ui: Record<string, HTMLElement> = {};
  private mouse = { x: 0, y: 0 };

  constructor(state: GameState, private outcome?: ArenaOutcome, private demo = false) {
    this.s = state;
  }

  // ——— Géométrie ———
  private tilePos(t: Tile) {
    let p = this.pos.get(t);
    if (!p) {
      const w = axialToWorld(t.q, t.r, HEX);
      p = { x: w.x, y: w.y * ISO - tileElev(t.terrain) };
      this.pos.set(t, p);
    }
    return p;
  }

  private toScreen(x: number, y: number) {
    return { x: (x - this.cam.x) * this.cam.zoom + app.w / 2, y: (y - this.cam.y) * this.cam.zoom + app.h / 2 };
  }

  private toWorld(x: number, y: number) {
    return { x: (x - app.w / 2) / this.cam.zoom + this.cam.x, y: (y - app.h / 2) / this.cam.zoom + this.cam.y };
  }

  private pick(sx: number, sy: number): Tile | null {
    const w = this.toWorld(sx, sy);
    for (let i = this.sorted.length - 1; i >= 0; i--) {
      const t = this.sorted[i];
      const p = this.tilePos(t);
      if (Math.abs(w.x - p.x) > HEX || Math.abs(w.y - p.y) > HEX) continue;
      if (pointInPoly(w.x, w.y, hexCorners(p.x, p.y, HEX))) return t;
    }
    return null;
  }

  private waterDir(t: Tile) {
    for (const i of DOCK_PREF) {
      const n = getTile(this.s, t.q + EDGE_DIRS[i][0], t.r + EDGE_DIRS[i][1]);
      if (isWater(n)) return i;
    }
    return 1;
  }

  // ——— Cycle de vie ———
  enter() {
    this.sorted = [...this.s.tiles].sort((a, b) => a.r - b.r || a.q - b.q);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const t of this.sorted) {
      const p = this.tilePos(t);
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    this.bounds = { minX: minX - HEX * 1.4, maxX: maxX + HEX * 1.4, minY: minY - HEX * 2.8, maxY: maxY + HEX + BASE_DEPTH + 40 };
    const th = this.s.tiles.find((t) => t.building?.id === 'townhall')!;
    const p = this.tilePos(th);
    this.cam.x = p.x;
    this.cam.y = p.y + 20;
    this.cam.zoom = Math.min(1.25, Math.max(0.8, app.w / 1500));
    audio.setMood('world');
    if (this.demo) {
      this.cam.zoom = Math.max(0.75, app.w / 1700);
      return;
    }
    this.buildUI();
    this.refresh();
    if (this.outcome) {
      const o = this.outcome;
      this.outcome = undefined;
      setTimeout(() => this.resolveArena(o), 50);
    } else this.guide();
  }

  // Zone d'écran autour de l'hôtel de ville (pour le tutoriel).
  private townRect() {
    const th = this.s.tiles.find((t) => t.building?.id === 'townhall');
    if (!th) return null;
    const p = this.toScreen(this.tilePos(th).x, this.tilePos(th).y);
    const r = HEX * 2.6 * this.cam.zoom;
    return { x: p.x - r, y: p.y - r * 0.8, w: r * 2, h: r * 1.5 };
  }

  // Tutoriel guidé : chapitre « carte » au tout premier tour, bilan après le premier combat.
  private guide() {
    if (document.body.classList.contains('shot')) return;
    const s = this.s;
    if (s.step === 0 && tutorialOn('world')) startTour('world', worldChapter({ s, townRect: () => this.townRect() }));
    else if (s.stats.wins + s.stats.losses >= 1 && tutorialOn('postarena')) startTour('postarena', postArenaChapter());
  }

  exit() {
    tooltip.hide();
    stopTutorial();
  }

  resize() {
    this.dirty = true;
  }

  // ——— Rendu de la couche statique ———
  // Territoire et quais : recalculés quand la carte change.
  private prepMeta() {
    this.terr = territory(this.s);
    this.docks = new Map<Tile, Tile>();
    for (const t of this.s.tiles) {
      if (t.building?.id !== 'port') continue;
      const d = this.waterDir(t);
      const w = getTile(this.s, t.q + EDGE_DIRS[d][0], t.r + EDGE_DIRS[d][1]);
      if (w) this.docks.set(w, t);
    }
  }

  private drawTile(ctx: Ctx, t: Tile) {
    const p = this.tilePos(t);
    const water = !TERRAINS[t.terrain].land;
    const foam = EDGE_DIRS.map(([dq, dr]) => {
      if (!water) return false;
      const n = getTile(this.s, t.q + dq, t.r + dr);
      return !!n && TERRAINS[n.terrain].land;
    });
    drawTileBase(ctx, p.x, p.y, HEX, t, foam);
    if (t.explored && this.terr.has(hkey(t.q, t.r))) {
      const edges = EDGE_DIRS.map(([dq, dr]) => !this.terr.has(hkey(t.q + dq, t.r + dr)));
      if (edges.some(Boolean)) drawBorder(ctx, p.x, p.y, HEX, edges);
    }
    drawTileDecor(ctx, p.x, p.y, HEX, t, !!t.building);
    const portT = this.docks.get(t);
    if (portT) {
      const pp = this.tilePos(portT);
      drawBuilding(ctx, 'port', pp.x, pp.y, HEX, { done: portT.building!.done, waterDir: this.waterDir(portT), part: 'dock', progress: 1 });
    }
    if (t.building) {
      const b = t.building;
      drawBuilding(ctx, b.id, p.x, p.y, HEX, {
        done: b.done,
        progress: b.progress / Math.max(1, BUILDINGS[b.id].work),
        waterDir: b.id === 'port' ? this.waterDir(t) : undefined,
        part: b.id === 'port' ? 'house' : 'all',
      });
    }
  }

  // Image pré-calculée de toute l'île (rapide à dessiner quand on est dézoomé).
  private renderLayer() {
    const { minX, minY, maxX, maxY } = this.bounds;
    const W = Math.ceil((maxX - minX) * LS);
    const H = Math.ceil((maxY - minY) * LS);
    if (!this.layer || this.layer.width !== W || this.layer.height !== H) {
      this.layer = document.createElement('canvas');
      this.layer.width = W;
      this.layer.height = H;
    }
    const ctx = this.layer.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.setTransform(LS, 0, 0, LS, -minX * LS, -minY * LS);
    for (const t of this.sorted) this.drawTile(ctx, t);
  }

  // ——— Boucle ———
  update(dt: number) {
    this.t += dt;
    if (this.demo) {
      const th = this.tilePos(this.s.tiles.find((t) => t.building?.id === 'townhall')!);
      this.cam.x = th.x + Math.sin(this.t * 0.05) * 260;
      this.cam.y = th.y + Math.cos(this.t * 0.04) * 90;
    }
    const sp = (620 * dt) / this.cam.zoom;
    if (this.keys.has('a') || this.keys.has('arrowleft') || this.keys.has('q')) this.cam.x -= sp;
    if (this.keys.has('d') || this.keys.has('arrowright')) this.cam.x += sp;
    if (this.keys.has('w') || this.keys.has('arrowup') || this.keys.has('z')) this.cam.y -= sp;
    if (this.keys.has('s') || this.keys.has('arrowdown')) this.cam.y += sp;
    this.clampCam();

    // Particules d'ambiance
    this.smokeT += dt;
    if (this.smokeT > 0.3 && settings.ambient) {
      this.smokeT = 0;
      for (const t of this.s.tiles) {
        const b = t.building;
        if (!b?.done) continue;
        const ch = CHIMNEYS[b.id];
        if (!ch) continue;
        const p = this.tilePos(t);
        for (const [dx, dy] of ch) if (Math.random() < 0.6) this.fx.smoke(p.x + dx * HEX, p.y + dy * HEX);
      }
    }
    this.moteT += dt;
    if (this.moteT > 0.08 && settings.ambient) {
      this.moteT = 0;
      const cand = this.s.tiles.filter((t) => t.explored && (t.terrain === 'grove' || t.terrain === 'forest'));
      if (cand.length) {
        const t = cand[Math.floor(Math.random() * cand.length)];
        const p = this.tilePos(t);
        this.fx.ember(p.x + (Math.random() - 0.5) * HEX, p.y - Math.random() * HEX * 0.6, t.terrain === 'grove' ? '#9dffd9' : '#d8ff9a');
      }
      const lit = this.s.tiles.filter((t) => t.building?.id === 'forge' && t.building.done);
      for (const t of lit) {
        const p = this.tilePos(t);
        if (Math.random() < 0.4) this.fx.ember(p.x + HEX * 0.1, p.y, '#ffa040');
      }
    }
    this.fx.update(dt);
  }

  private clampCam() {
    const { minX, maxX, minY, maxY } = this.bounds;
    this.cam.x = Math.max(minX + 100, Math.min(maxX - 100, this.cam.x));
    this.cam.y = Math.max(minY + 100, Math.min(maxY - 60, this.cam.y));
  }

  render(ctx: Ctx, W: number, H: number) {
    if (this.dirty) {
      this.prepMeta();
      this.layerStale = true;
      this.dirty = false;
    }
    const direct = this.cam.zoom > 1.7;
    if (!direct && this.layerStale) {
      this.renderLayer();
      this.layerStale = false;
    }
    const bg = ctx.createRadialGradient(W / 2, H * 0.45, 50, W / 2, H / 2, Math.max(W, H) * 0.8);
    bg.addColorStop(0, '#0d2624');
    bg.addColorStop(1, '#030807');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(this.cam.zoom, this.cam.zoom);
    ctx.translate(-this.cam.x, -this.cam.y);
    const { minX, minY, maxX, maxY } = this.bounds;
    if (direct) {
      // Très zoomé : on dessine directement les cases visibles, en pleine netteté.
      for (const t of this.sorted) {
        const p = this.tilePos(t);
        if (this.inView(p, HEX * 2.6)) this.drawTile(ctx, t);
      }
    } else if (this.layer) ctx.drawImage(this.layer, minX, minY, maxX - minX, maxY - minY);
    this.renderDynamic(ctx);
    this.fx.draw(ctx);
    this.fx.drawTexts(ctx);
    ctx.restore();

    this.renderAtmosphere(ctx, W, H);
  }

  private inView(p: { x: number; y: number }, margin = 80) {
    const s = this.toScreen(p.x, p.y);
    const m = margin * this.cam.zoom;
    return s.x > -m && s.x < app.w + m && s.y > -m && s.y < app.h + m * 1.4;
  }

  private renderDynamic(ctx: Ctx) {
    const t = this.t;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const tile of this.sorted) {
      if (!tile.explored) continue;
      const p = this.tilePos(tile);
      if (!this.inView(p)) continue;
      if (!TERRAINS[tile.terrain].land) {
        const ph = tile.variant * 0.01;
        for (let k = 0; k < 2; k++) {
          const off = Math.sin(t * 0.7 + ph * 6 + k * 2.1) * HEX * 0.28;
          const yy = p.y + (k - 0.5) * HEX * 0.3;
          const a = 0.06 + 0.05 * Math.sin(t * 1.3 + ph * 9 + k);
          ctx.strokeStyle = `rgba(150,240,230,${Math.max(0, a)})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p.x + off - HEX * 0.18, yy);
          ctx.lineTo(p.x + off + HEX * 0.18, yy);
          ctx.stroke();
        }
        if (tile.feature === 'fish') {
          const fx = p.x + Math.cos(t * 0.9 + ph * 10) * HEX * 0.3;
          const fy = p.y + Math.sin(t * 0.9 + ph * 10) * HEX * 0.12;
          ctx.fillStyle = 'rgba(170,240,255,0.35)';
          ctx.beginPath();
          ctx.ellipse(fx, fy, 5, 2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (tile.feature === 'crystals' || (tile.feature === 'goldVein' && !tile.building)) {
        glow(ctx, p.x, p.y - HEX * 0.1, HEX * 0.8, '#ffc04a', 0.12 + 0.08 * Math.sin(t * 2 + tile.variant));
      }
      if (tile.terrain === 'grove') glow(ctx, p.x, p.y - HEX * 0.25, HEX * 0.9, '#5affc8', 0.08 + 0.04 * Math.sin(t * 1.5 + tile.variant));
      if (tile.building?.done && tile.building.id === 'shrine') glow(ctx, p.x, p.y - HEX * 0.5, HEX * 1.2, '#7affc0', 0.15 + 0.08 * Math.sin(t * 2));
      if (tile.building?.done && tile.building.id === 'academy') glow(ctx, p.x + HEX * 0.14, p.y - HEX * 1.55, HEX * 0.6, '#6ab8ff', 0.2 + 0.12 * Math.sin(t * 3));
    }
    ctx.restore();

    // Mode construction : cases valides + rendement prévu.
    if (this.buildSel) {
      const valid = this.validTiles();
      for (const [tile, res] of valid) {
        const p = this.tilePos(tile);
        const pts = hexCorners(p.x, p.y, HEX * 0.92);
        tracePoly(ctx, pts);
        ctx.fillStyle = `rgba(122,255,192,${0.1 + 0.05 * Math.sin(this.t * 4)})`;
        ctx.fill();
        ctx.strokeStyle = 'rgba(122,255,192,0.55)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        this.yieldBadge(ctx, p.x, p.y - HEX * 0.15, res);
      }
    }

    const h = this.hover;
    if (h) {
      const p = this.tilePos(h);
      const pts = hexCorners(p.x, p.y, HEX * 0.97);
      let col = '#ffd98a';
      if (this.buildSel) col = this.validTiles().has(h) ? '#7affc0' : '#ff6b6b';
      tracePoly(ctx, pts);
      ctx.fillStyle = rgba(col, 0.12);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      if (this.buildSel && this.validTiles().has(h)) {
        ctx.save();
        ctx.globalAlpha = 0.85;
        drawBuilding(ctx, this.buildSel, p.x, p.y, HEX, { done: true, waterDir: this.waterDir(h), t: this.t });
        ctx.restore();
      }
    }
    const sel = this.selected;
    if (sel) {
      const p = this.tilePos(sel);
      const pts = hexCorners(p.x, p.y, HEX * 0.97);
      tracePoly(ctx, pts);
      ctx.strokeStyle = `rgba(255,217,138,${0.7 + 0.3 * Math.sin(this.t * 5)})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  private yieldBadge(ctx: Ctx, x: number, y: number, res: Res) {
    const keys = RES_ORDER.filter((k) => res[k]);
    if (!keys.length) return;
    ctx.save();
    ctx.font = '800 13px "Alegreya Sans", sans-serif';
    const parts = keys.map((k) => ({ k, txt: `+${res[k]}` }));
    const w = parts.reduce((s, p) => s + ctx.measureText(p.txt).width + 16, 6);
    ctx.fillStyle = 'rgba(5,12,10,0.85)';
    ctx.strokeStyle = 'rgba(255,217,138,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - 10, w, 20, 10);
    ctx.fill();
    ctx.stroke();
    let cx = x - w / 2 + 6;
    for (const p of parts) {
      ctx.fillStyle = RES_COLORS[p.k];
      ctx.beginPath();
      ctx.arc(cx + 5, y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f4ecd8';
      ctx.fillText(p.txt, cx + 12, y + 4.5);
      cx += ctx.measureText(p.txt).width + 16;
    }
    ctx.restore();
  }

  private renderAtmosphere(ctx: Ctx, W: number, H: number) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const x = ((i * 0.27 + 0.1) * W + Math.sin(this.t * 0.08 + i * 2) * 60) % (W + 200);
      const w = 70 + i * 25;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(160,255,220,0.05)');
      g.addColorStop(1, 'rgba(160,255,220,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x, -10);
      ctx.lineTo(x + w, -10);
      ctx.lineTo(x + w + 260, H);
      ctx.lineTo(x + 160, H);
      ctx.fill();
    }
    ctx.restore();
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  private validTiles(): Map<Tile, Res> {
    if (this.validCache) return this.validCache;
    const m = new Map<Tile, Res>();
    if (this.buildSel) {
      const terr = territory(this.s);
      for (const t of this.s.tiles) {
        if (canBuild(this.s, t, this.buildSel, terr).ok) m.set(t, buildingYield(this.s, t, this.buildSel).res);
      }
    }
    this.validCache = m;
    return m;
  }

  // ——— Entrées ———
  pointerDown(x: number, y: number, e: PointerEvent) {
    if (this.busy || this.demo) return;
    if (e.button === 2) {
      if (this.buildSel) this.setBuild(null);
      else this.select(null);
      return;
    }
    this.drag = { down: true, sx: x, sy: y, cx: this.cam.x, cy: this.cam.y, moved: false };
  }

  pointerMove(x: number, y: number, e: PointerEvent) {
    if (this.demo) return;
    this.mouse = { x: e.clientX, y: e.clientY };
    if (this.drag.down) {
      const dx = x - this.drag.sx;
      const dy = y - this.drag.sy;
      if (Math.hypot(dx, dy) > 6) this.drag.moved = true;
      if (this.drag.moved) {
        this.cam.x = this.drag.cx - dx / this.cam.zoom;
        this.cam.y = this.drag.cy - dy / this.cam.zoom;
        tooltip.hide();
        return;
      }
    }
    const t = this.pick(x, y);
    this.hover = t;
    if (t && !this.busy) tooltip.show(this.tileTip(t), e.clientX, e.clientY);
    else tooltip.hide();
  }

  pointerUp(x: number, y: number) {
    const was = this.drag;
    this.drag = { ...this.drag, down: false };
    if (!was.down || was.moved || this.busy) return;
    const t = this.pick(x, y);
    if (!t) {
      this.select(null);
      return;
    }
    if (this.buildSel) {
      const r = canBuild(this.s, t, this.buildSel);
      if (r.ok) {
        placeBuilding(this.s, t, this.buildSel);
        meta.built(this.s, this.buildSel);
        audio.play('build');
        toast(`Chantier lancé : ${BUILDINGS[this.buildSel].name}`, 'info');
        this.fx.ring(this.tilePos(t).x, this.tilePos(t).y, '#ffd98a', HEX);
        this.dirty = true;
        this.validCache = null;
        if (!this.canAffordSel()) this.setBuild(null);
        this.select(t);
        this.refresh();
        saveGame(this.s);
      } else toast(r.reason ?? 'Impossible', 'bad');
      return;
    }
    this.select(t);
  }

  wheel(x: number, y: number, dy: number) {
    if (this.demo) return;
    const before = this.toWorld(x, y);
    this.cam.zoom = Math.max(0.5, Math.min(4.2, this.cam.zoom * Math.exp(-dy * 0.0016)));
    const after = this.toWorld(x, y);
    this.cam.x += before.x - after.x;
    this.cam.y += before.y - after.y;
  }

  key(e: KeyboardEvent, down: boolean) {
    if (this.demo) return;
    const k = e.key.toLowerCase();
    if (down) this.keys.add(k);
    else this.keys.delete(k);
    if (!down || this.busy) return;
    if (k === 'escape') {
      if (this.buildSel) this.setBuild(null);
      else this.select(null);
    }
    if (k === 'enter' || k === ' ') {
      e.preventDefault();
      this.endTurn();
    }
    if (/^[1-9]$/.test(k)) {
      const ids = BUILD_MENU.filter((b) => BUILDINGS[b].category === this.tab);
      const id = ids[+k - 1];
      if (id) this.setBuild(this.buildSel === id ? null : id);
    }
    if (k === 'tab') {
      e.preventDefault();
      this.tab = this.tab === 'eco' ? 'combat' : 'eco';
      this.refreshBuildBar();
    }
  }

  private canAffordSel() {
    if (!this.buildSel) return false;
    const c = BUILDINGS[this.buildSel].cost;
    return RES_ORDER.every((k) => (c[k] ?? 0) <= this.s.res[k]);
  }

  private setBuild(id: BuildingId | null) {
    this.buildSel = id;
    this.validCache = null;
    if (id) this.select(null);
    this.refreshBuildBar();
  }

  private select(t: Tile | null) {
    this.selected = t;
    this.refreshSide();
  }

  // ——— Info-bulles ———
  private tileTip(t: Tile) {
    if (!t.explored) return `<b class="t">Terres inconnues</b><span class="muted">Étendez votre territoire pour explorer.</span>`;
    const info = TERRAINS[t.terrain];
    let html = `<b class="t">${t.building ? BUILDINGS[t.building.id].name : info.name}</b>`;
    if (t.building) html += `<div class="muted">${info.name}</div>`;
    else html += `<div class="muted">${info.desc}</div>`;
    if (t.feature) html += `<div class="goldtxt" style="margin-top:4px">◆ ${FEATURES[t.feature].name}</div><div class="muted">${FEATURES[t.feature].desc}</div>`;
    if (this.buildSel) {
      const r = canBuild(this.s, t, this.buildSel);
      if (r.ok) {
        const y = buildingYield(this.s, t, this.buildSel);
        html += `<div style="margin-top:6px"><b>${BUILDINGS[this.buildSel].name}</b> ici :</div>`;
        for (const l of y.lines) html += `<div class="yl"><span>${l.label}</span><span>${resInline(l.res)}</span></div>`;
        if (!y.lines.length) html += `<div class="muted">${BUILDINGS[this.buildSel].effect}</div>`;
      } else html += `<div class="bad" style="margin-top:6px">${r.reason}</div>`;
    } else if (t.building?.done) {
      const y = buildingYield(this.s, t, t.building.id);
      if (Object.keys(y.res).length) html += `<div style="margin-top:6px">${resInline(y.res)} / tour</div>`;
    } else if (t.building) {
      html += `<div style="margin-top:4px">Construction : ${t.building.progress}/${BUILDINGS[t.building.id].work}</div>`;
    }
    return html;
  }

  // ——— Interface ———
  private buildUI() {
    this.ui.res = mount(`<div class="panel resbar"></div>`);
    this.ui.track = mount(`<div class="panel track"></div>`);
    this.ui.relics = mount(`<div class="panel relics"></div>`);
    this.ui.side = mount(`<div class="panel side scroll-thin" style="display:none"></div>`);
    this.ui.build = mount(`<div class="panel buildbar"><div class="tabs"></div><div class="cards scroll-thin"></div></div>`);
    this.ui.end = mount(`<div class="panel endturn"></div>`);
  }

  refresh() {
    this.refreshRes();
    this.refreshTrack();
    this.refreshRelics();
    this.refreshBuildBar();
    this.refreshEnd();
    this.refreshSide();
  }

  private refreshRes() {
    const s = this.s;
    const inc = turnIncome(s);
    const net = { ...inc.res, food: inc.res.food - inc.upkeep };
    const jobs = jobBuildings(s).filter((b) => !b.paused).reduce((n, b) => n + BUILDINGS[b.id].jobs, 0);
    const sites = s.tiles.filter((t) => t.building && !t.building.done).length;
    const rows = RES_ORDER.map((k) => {
      const d = net[k];
      return `<div class="resrow" data-k="${k}">${icon(k, 20)}<span class="val">${s.res[k]}</span><span class="muted" style="font-size:13px">${RES_NAMES[k]}</span><span class="delta ${d > 0 ? 'good' : d < 0 ? 'bad' : 'muted'}">${d > 0 ? '+' : ''}${d}/t</span></div>`;
    }).join('');
    this.ui.res.innerHTML = `${rows}
      <div class="resrow sep" data-k="pop">${icon('pop', 20)}<span>Villageois</span><b style="margin-left:auto">${s.villagers}/${popCap(s)}</b></div>
      <div class="resrow" data-k="builders">${icon('hammer', 20)}<span>Bâtisseurs</span>
        <span class="stepper"><button class="btn" data-a="-">−</button><b>${s.builders}</b><button class="btn" data-a="+">+</button></span></div>
      <div class="resrow" data-k="workers">${icon('anvil', 20)}<span>Ouvriers</span><b style="margin-left:auto" class="${workers(s) < jobs ? 'bad' : ''}">${workers(s)} / ${jobs} postes</b></div>
      <div class="muted" style="font-size:12px;margin-top:2px">${sites ? `${sites} chantier(s) · ${buildPoints(s)} pt/tour` : 'Aucun chantier'}</div>`;
    this.ui.res.querySelectorAll<HTMLButtonElement>('.stepper button').forEach((b) =>
      b.addEventListener('click', () => {
        const d = b.dataset.a === '+' ? 1 : -1;
        s.builders = Math.max(0, Math.min(s.villagers, s.builders + d));
        this.refresh();
      }),
    );
    const tips: Record<string, () => string> = {
      gold: () => `<b class="t">Or</b>Sert à construire… et devient votre budget d’arène pour recruter des créatures. Vous le récupérez intégralement après chaque combat.${inc.goldBonus ? `<div class="good">Bourse sans fond : +${inc.goldBonus}</div>` : ''}`,
      wood: () => `<b class="t">Bois</b>Produit par les scieries en forêt.`,
      stone: () => `<b class="t">Pierre</b>Produite par les carrières sur collines et montagnes.`,
      food: () => `<b class="t">Nourriture</b>Chaque villageois mange 1/tour. Production : +${inc.res.food}, consommation : −${inc.upkeep}.<br>Croissance à ${growthCost(s)} nourriture (si logement libre).`,
      pop: () => `<b class="t">Villageois</b>Répartis entre bâtisseurs (chantiers) et ouvriers (bâtiments productifs). Les maisons augmentent le logement.`,
      builders: () => `<b class="t">Bâtisseurs</b>Chaque bâtisseur apporte ${hasRelic(s, 'marteau') ? 2 : 1} point de construction par tour. Les autres villageois travaillent dans les bâtiments.`,
      workers: () => `<b class="t">Ouvriers</b>Les bâtiments productifs (fermes, mines, ports…) ont besoin d’un ouvrier pour produire. Sans ouvrier, ils sont à l’arrêt.`,
    };
    this.ui.res.querySelectorAll<HTMLElement>('.resrow').forEach((r) => {
      const f = tips[r.dataset.k ?? ''];
      if (f) bindTip(r, f);
    });
  }

  private refreshTrack() {
    const s = this.s;
    // en aventure la piste s'allonge sans fin : on n'affiche que le palier en cours
    const from = s.adventure ? Math.max(0, s.track.findIndex((n) => n.act === s.track[s.step].act)) : 0;
    const nodes = s.track
      .slice(from)
      .map((n, k) => {
        const i = k + from;
        const cls = i < s.step ? 'done' : i === s.step ? 'cur' : i === s.step + 1 ? 'next' : '';
        const ic = n.kind === 'event' ? icon('question', 18) : n.kind === 'arena' ? icon('sword', 18) : n.kind === 'boss' ? icon('skull', 20) : `<svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 0l5 5-5 5-5-5z" fill="#9aa69f"/></svg>`;
        const sep = i > 0 && s.track[i - 1].act !== n.act ? '<div class="act-sep"></div>' : '';
        return `${sep}<div class="node ${cls}" data-i="${i}">${ic}</div>`;
      })
      .join('');
    const hearts = Array.from({ length: s.maxHearts }, (_, i) => icon('heart', 20, i < s.hearts ? '' : 'lost')).join('');
    this.ui.track.innerHTML = `<div class="stat">${icon('turn', 20)}<span>${s.adventure ? 'Aventure · ' : ''}Tour ${s.step + 1}</span></div><div class="nodes">${nodes}</div><div class="stat hearts">${hearts}</div>`;
    this.ui.track.querySelectorAll<HTMLElement>('.node').forEach((n) => {
      const node = s.track[+n.dataset.i!];
      bindTip(n, () => {
        const act = `<div class="muted">Acte ${node.act}</div>`;
        if (node.kind === 'event') return `<b class="t">Événement</b>${act}Une rencontre inattendue à la fin du tour.`;
        if (node.kind === 'arena' || node.kind === 'boss') {
          const enc = encounterAt(s, node.arena!);
          return `<b class="t">${node.kind === 'boss' ? 'Boss : ' : 'Arène : '}${enc.name}</b>${act}${enc.desc}${this.enemyChips(node.arena!)}`;
        }
        return `<b class="t">Tour de gestion</b>${act}Construisez et développez votre royaume.`;
      });
    });
    const hb = this.ui.track.querySelector('.hearts') as HTMLElement;
    bindTip(hb, () => `<b class="t">Cœurs</b>Chaque défaite en arène coûte un cœur. À zéro, la partie est perdue.`);
  }

  private enemyChips(idx: number) {
    const enc = encounterAt(this.s, idx);
    const seen = new Set<string>();
    const chips = enc.enemies
      .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
      .map((e) => {
        const m = MONSTERS[e.id];
        return `<span class="chip">${icon(m.element, 14)}${m.name}</span>`;
      })
      .join('');
    return `<div class="typechips" style="margin-top:6px">${chips}</div>`;
  }

  private refreshRelics() {
    const s = this.s;
    const bonus = combatBonuses(s);
    const relics = s.relics.map((id) => `<div class="relic" data-r="${id}">${icon(RELIC_BY_ID[id].icon, 20)}</div>`).join('');
    const comps = s.companions
      .map((c, i) => `<div class="companion" data-c="${i}"><img src="${creaturePortrait(c.id, CREATURE_BY_ID[c.id].look, c.star, 68, !!c.shiny)}"/><div class="stars">${stars(c.star)}</div></div>`)
      .join('');
    const eggs = s.eggs
      .map((e, i) => `<div class="relic egg-ico" data-egg="${i}">${icon('egg', 22)}<span class="egg-turns">${Math.max(0, e.turns)}</span></div>`)
      .join('');
    const slots = Math.max(0, bonus.companionSlots - s.companions.length);
    const empty = Array.from({ length: slots }, () => `<div class="companion" style="opacity:.35;display:grid;place-items:center">${icon('paw', 16)}</div>`).join('');
    this.ui.relics.innerHTML = `${relics || '<span class="muted" style="font-size:12px;padding:0 4px">Aucune relique</span>'}<div class="act-sep" style="width:1px;height:26px;background:var(--line)"></div>${comps}${empty}${eggs}`;
    this.ui.relics.querySelectorAll<HTMLElement>('.relic').forEach((n) => {
      const r = RELIC_BY_ID[n.dataset.r!];
      bindTip(n, () => `<b class="t">${r.name}</b>${r.desc}`);
    });
    this.ui.relics.querySelectorAll<HTMLElement>('.egg-ico').forEach((n) => {
      const e = s.eggs[+n.dataset.egg!];
      bindTip(n, () => `<b class="t">Œuf mystérieux</b>Éclot dans <b>${Math.max(0, e.turns)}</b> tour(s) en une créature de tier ${e.minTier}-${e.maxTier}.<div class="goldtxt" style="margin-top:4px">1 chance sur 8 qu’elle soit chromatique ✦</div>${companionFull(s) ? '<div class="muted" style="margin-top:4px">Ménagerie pleine : vous devrez remplacer un compagnon ou confier la créature à un éleveur.</div>' : ''}`);
    });
    this.ui.relics.querySelectorAll<HTMLElement>('.companion[data-c]').forEach((n) => {
      const c = s.companions[+n.dataset.c!];
      const d = CREATURE_BY_ID[c.id];
      bindTip(n, () => `<b class="t">${c.shiny ? '✦ ' : ''}${d.names[c.star - 1]} ${stars(c.star)}</b>${c.shiny ? '<div class="goldtxt">Chromatique : +20 % PV et attaque</div>' : ''}<span class="chip">${icon(d.element, 14)}${ELEMENTS[d.element].name}</span><div style="margin-top:4px">Compagnon : rejoint gratuitement votre banc à chaque arène.</div><div class="muted">${d.ability.name} — ${d.ability.desc.replace('{v}', String(d.ability.values[c.star - 1]))}</div>`);
    });
  }

  private refreshBuildBar() {
    const s = this.s;
    const tabs = this.ui.build.querySelector('.tabs') as HTMLElement;
    tabs.innerHTML = `<button class="tab ${this.tab === 'eco' ? 'on' : ''}" data-t="eco">Économie</button><button class="tab ${this.tab === 'combat' ? 'on' : ''}" data-t="combat">Combat</button><span class="muted" style="font-size:12px;margin-left:8px">Touches 1-9 · Tab : changer d’onglet · Clic droit / Échap : annuler</span>`;
    tabs.querySelectorAll<HTMLButtonElement>('.tab').forEach((b) =>
      b.addEventListener('click', () => {
        this.tab = b.dataset.t as 'eco' | 'combat';
        this.refreshBuildBar();
      }),
    );
    const cards = this.ui.build.querySelector('.cards') as HTMLElement;
    cards.innerHTML = '';
    for (const id of BUILD_MENU.filter((b) => BUILDINGS[b].category === this.tab)) {
      const d = BUILDINGS[id];
      const afford = RES_ORDER.every((k) => (d.cost[k] ?? 0) <= s.res[k]);
      const card = mount(
        `<div class="bcard ${this.buildSel === id ? 'sel' : ''} ${afford ? '' : 'poor'}" data-b="${id}">
          <img src="${buildingIcon(id)}" alt=""/>
          <div class="nm">${d.name}</div>
          <div class="cost">${costHtml(d.cost, s) || '<span class="muted">Gratuit</span>'}</div>
        </div>`,
        cards,
      );
      card.addEventListener('click', () => this.setBuild(this.buildSel === id ? null : id));
      bindTip(card, () => {
        const terr = d.terrains.map((t) => TERRAINS[t].name).join(', ');
        return `<b class="t">${d.name}</b><div class="muted">${d.desc}</div><div style="margin:6px 0">${d.effect}</div>
          <div class="yl"><span>Coût</span><span class="cost" style="display:flex;gap:6px">${costHtml(d.cost, s)}</span></div>
          <div class="yl"><span>Chantier</span><span>${d.work} pts</span></div>
          <div class="yl"><span>Ouvriers</span><span>${d.jobs}</span></div>
          <div class="muted" style="margin-top:4px">Terrain : ${terr}${d.needsWater ? ' (au bord de l’eau)' : ''}</div>`;
      });
    }
  }

  private refreshEnd() {
    const s = this.s;
    const node = s.track[s.step];
    const bonus = combatBonuses(s);
    let next = '';
    if (node.kind === 'event') next = `Fin du tour → ${icon('question', 16)} <b>Événement</b>`;
    else if (node.kind === 'arena' || node.kind === 'boss') next = `Fin du tour → ${icon(node.kind === 'boss' ? 'skull' : 'sword', 16)} <b class="goldtxt">${node.kind === 'boss' ? 'BOSS' : 'ARÈNE'}</b>`;
    else next = 'Fin du tour → gestion';
    const ai = s.track.findIndex((n, i) => i >= s.step && (n.kind === 'arena' || n.kind === 'boss'));
    let arena = '';
    if (ai >= 0) {
      const enc = encounterAt(s, s.track[ai].arena!);
      const inTurns = ai - s.step;
      arena = `<div style="font-size:13px;border-top:1px solid var(--line-soft);padding-top:6px">
        <div>${icon('sword', 14)} <b>${enc.name}</b> <span class="muted">${inTurns === 0 ? '— ce tour !' : `dans ${inTurns} tour(s)`}</span></div>
        ${this.enemyChips(s.track[ai].arena!)}
        <div class="muted" style="margin-top:4px">Budget : ${icon('gold', 13)} ${s.res.gold + bonus.bonusGold} · ${bonus.boardSlots} créatures max</div>
      </div>`;
    }
    this.ui.end.innerHTML = `<div class="next">${next}</div>${arena}<button class="btn primary big">Terminer le tour <span class="kbd">Espace</span></button>`;
    this.ui.end.querySelector('button')!.addEventListener('click', () => this.endTurn());
    const box = this.ui.end.querySelector('div[style]') as HTMLElement | null;
    if (box) bindTip(box, () => `<b class="t">Préparation au combat</b>${bonus.lines.length ? bonus.lines.join('<br>') : 'Construisez des bâtiments de combat (Caserne, Forge, Sanctuaire…) pour renforcer vos créatures.'}`);
  }

  private refreshSide() {
    const t = this.selected;
    const side = this.ui.side;
    if (!t || !t.explored) {
      side.style.display = 'none';
      return;
    }
    side.style.display = 'block';
    const s = this.s;
    const info = TERRAINS[t.terrain];
    const terr = territory(s);
    const owned = terr.has(hkey(t.q, t.r));
    let html = '';
    const b = t.building;
    if (b) {
      const d = BUILDINGS[b.id];
      html += `<h3 class="title">${d.name}</h3><div class="terrain">${info.name}${t.feature ? ` · ${FEATURES[t.feature].name}` : ''}</div><div style="font-size:14px">${d.effect}</div>`;
      if (!b.done) {
        html += `<div class="section"><div class="line">${icon('hammer', 16)} Construction <span class="r"><b>${b.progress}/${d.work}</b></span></div>
          <div class="muted" style="font-size:13px">${s.builders ? `${buildPoints(s)} point(s) par tour (chantiers traités dans l’ordre).` : '<span class="bad">Aucun bâtisseur ! Ajoutez-en dans le panneau de gauche.</span>'}</div>
          <div class="actions"><button class="btn danger" data-a="cancel">Annuler (remboursé)</button></div></div>`;
      } else {
        const y = buildingYield(s, t, b.id);
        const needs = d.jobs > 0;
        const staffed = staffedSet(s).has(b);
        if (y.lines.length) {
          html += `<div class="section">${y.lines.map((l) => `<div class="line"><span>${l.label}</span><span class="r">${resInline(l.res)}</span></div>`).join('')}</div>`;
        }
        if (needs) {
          html += `<div class="section"><div class="line">${icon('anvil', 16)} Ouvrier <span class="r ${staffed ? 'good' : 'bad'}">${b.paused ? 'En pause' : staffed ? 'Au travail' : 'Manque de main-d’œuvre'}</span></div>
            <div class="actions"><button class="btn" data-a="pause">${b.paused ? 'Reprendre' : 'Mettre en pause'}</button></div></div>`;
        }
        if (b.id === 'colosseum') {
          const ai = s.track.findIndex((n, i) => i >= s.step && (n.kind === 'arena' || n.kind === 'boss'));
          if (ai >= 0) {
            const enc = encounterAt(s, s.track[ai].arena!);
            html += `<div class="section"><b>Prochain combat : ${enc.name}</b><div class="muted" style="font-size:13px">${enc.desc}</div>${this.enemyChips(s.track[ai].arena!)}
              <div style="margin-top:8px;font-size:13px">${combatBonuses(s).lines.join('<br>') || '<span class="muted">Aucun bonus de combat pour l’instant.</span>'}</div></div>`;
          }
        }
      }
    } else {
      html += `<h3 class="title">${info.name}</h3><div class="terrain">${info.desc}</div>`;
      if (t.feature) html += `<div class="goldtxt">◆ ${FEATURES[t.feature].name}</div><div class="muted" style="font-size:13px">${FEATURES[t.feature].desc}</div>`;
      if (!owned) html += `<div class="section muted">Hors de votre territoire. Construisez à proximité pour l’étendre.</div>`;
      else if (t.feature === 'ruins' || t.feature === 'lair') {
        html += `<div class="section"><button class="btn primary" data-a="explore">${icon(t.feature === 'lair' ? 'paw' : 'question', 18)} ${t.feature === 'lair' ? 'Approcher la créature' : 'Explorer les ruines'}</button></div>`;
      } else if (info.land) {
        const opts = BUILD_MENU.filter((id) => BUILDINGS[id].terrains.includes(t.terrain));
        const rows = opts
          .map((id) => {
            const r = canBuild(s, t, id, terr);
            const y = buildingYield(s, t, id).res;
            return `<button class="choice ${r.ok ? '' : 'locked'}" data-b="${id}" style="padding:6px 8px;gap:8px">
              <img src="${buildingIcon(id, 64)}" width="38" height="38"/>
              <div class="ct"><div class="cl" style="font-size:13px">${BUILDINGS[id].name}</div>
              <div class="cd" style="font-size:12px">${Object.keys(y).length ? resInline(y) : BUILDINGS[id].effect.split('.')[0]}</div>
              ${r.ok ? '' : `<div class="why" style="font-size:11px">${r.reason}</div>`}</div>
              <div class="cost" style="display:flex;gap:4px;font-size:12px;font-weight:700">${costHtml(BUILDINGS[id].cost, s)}</div>
            </button>`;
          })
          .join('');
        html += `<div class="section"><div class="muted" style="font-size:12px;margin-bottom:6px">Construire ici :</div><div class="choices" style="gap:6px">${rows}</div></div>`;
      }
    }
    side.innerHTML = html;
    side.querySelector('[data-a="cancel"]')?.addEventListener('click', () => {
      cancelBuilding(s, t);
      this.dirty = true;
      this.validCache = null;
      this.refresh();
    });
    side.querySelector('[data-a="pause"]')?.addEventListener('click', () => {
      if (t.building) t.building.paused = !t.building.paused;
      this.refresh();
    });
    side.querySelector('[data-a="explore"]')?.addEventListener('click', () => this.explore(t));
    side.querySelectorAll<HTMLButtonElement>('[data-b]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const id = btn.dataset.b as BuildingId;
        if (!canBuild(s, t, id).ok) return;
        placeBuilding(s, t, id);
        meta.built(s, id);
        audio.play('build');
        toast(`Chantier lancé : ${BUILDINGS[id].name}`, 'info');
        this.dirty = true;
        this.validCache = null;
        saveGame(s);
        this.refresh();
      }),
    );
  }

  // ——— Actions de jeu ———
  private rng() {
    return new RNG(this.s.rng || this.s.seed);
  }

  private runEvent(ev: GameEvent, done: () => void) {
    this.busy = true;
    tooltip.hide();
    showEvent(ev, this.s, () => {
      this.busy = false;
      this.dirty = true;
      this.validCache = null;
      done();
      this.refresh();
      saveGame(this.s);
    });
  }

  private explore(t: Tile) {
    const rng = this.rng();
    const ev = t.feature === 'lair' ? lairEvent(this.s, rng) : pickEvent(this.s, rng, 'ruins', this.s.seen);
    this.s.rng = rng.state;
    if (ev.id !== 'lair') this.s.seen.push(ev.id);
    this.runEvent(ev, () => {
      t.feature = null;
    });
  }

  endTurn() {
    if (this.busy) return;
    const s = this.s;
    const node = s.track[s.step];
    this.popYields();
    for (const egg of s.eggs) egg.turns -= hasRelic(s, 'sablier') ? 2 : 1;
    const notes = endTurnEconomy(s);
    audio.play('turn');
    notes.forEach((n) => toast(n.text, n.kind));
    this.dirty = true;
    this.validCache = null;
    this.setBuild(null);
    if (node.kind === 'event') {
      const rng = this.rng();
      const ev = pickEvent(s, rng, 'track', s.seen);
      s.rng = rng.state;
      s.seen.push(ev.id);
      this.refresh();
      this.runEvent(ev, () => this.advance());
    } else if (node.kind === 'arena' || node.kind === 'boss') {
      this.busy = true;
      saveGame(s);
      const idx = node.arena!;
      app.setScene(new ArenaScene(s, idx, (result) => app.setScene(new WorldScene(s, { idx, result }))));
    } else {
      this.advance();
    }
  }

  // Rendements flottants au-dessus des bâtiments productifs (avant résolution du tour).
  private popYields() {
    const staffed = staffedSet(this.s);
    for (const t of this.s.tiles) {
      const b = t.building;
      if (!b?.done || (BUILDINGS[b.id].jobs > 0 && !staffed.has(b))) continue;
      const res = buildingYield(this.s, t, b.id).res;
      const p = this.tilePos(t);
      let k = 0;
      for (const key of RES_ORDER) {
        if (!res[key]) continue;
        this.fx.texts.push({ x: p.x, y: p.y - HEX * 0.7 - k * 16, text: `+${res[key]}`, color: RES_COLORS[key], life: -k * 0.12, max: 1.4, size: 16, vy: -30 });
        k++;
      }
    }
  }

  // Les œufs prêts éclosent un par un (si la ménagerie a de la place), avant de passer au tour suivant.
  private hatchThen(next: () => void) {
    const s = this.s;
    const egg = s.eggs.find((e) => e.turns <= 0);
    if (!egg) {
      next();
      return;
    }
    s.eggs.splice(s.eggs.indexOf(egg), 1);
    const rng = this.rng();
    const ev = hatchEvent(s, rng, egg);
    s.rng = rng.state;
    this.runEvent(ev, () => this.hatchThen(next));
  }

  private advance() {
    this.hatchThen(() => this.advanceNow());
  }

  private advanceNow() {
    this.s.step = Math.min(this.s.track.length - 1, this.s.step + 1);
    saveGame(this.s);
    this.refresh();
    if (this.s.stats.wins + this.s.stats.losses >= 1) this.guide();
  }

  private resolveArena(o: ArenaOutcome) {
    const s = this.s;
    const enc = encounterAt(s, o.idx);
    const adv = isAdventureArena(o.idx);
    const isBoss = s.track[s.step].kind === 'boss';
    const final = isBoss && !adv; // Vermithrax : fin de la partie… ou début de l'aventure
    meta.arena(s, o.result === 'win');
    if (o.result === 'win') {
      s.stats.wins++;
      if (final) {
        meta.boss(s);
        this.victoryChoice();
        return;
      }
      const reward = rewardOf(s, enc) + (hasRelic(s, 'couronne') ? 15 : 0);
      s.res.gold += reward;
      s.arenaIndex = Math.max(s.arenaIndex, o.idx + 1);
      if (adv) {
        s.adventure!.cleared++;
        meta.palier(s.adventure!.cleared);
        extendTrack(s);
      }
      toast(`Victoire ! +${reward} or`, 'good');
      const rng = this.rng();
      const ev = victoryEvent(s, rng, enc.name);
      s.rng = rng.state;
      this.runEvent(ev, () => this.advance());
    } else {
      s.stats.losses++;
      s.hearts--;
      if (s.hearts <= 0) {
        s.over = 'lose';
        clearSave();
        this.endScreen(false);
        return;
      }
      s.res.gold += 5;
      this.busy = true;
      const retry = isBoss && !adv;
      const ev: GameEvent = {
        id: 'defeat', title: 'Défaite…', art: 'defeat', source: 'any',
        text: `Vos créatures ont été balayées par « ${enc.name} ». Vous perdez un cœur, mais le royaume tient bon.${retry ? ' Le dragon vous attend toujours : préparez-vous et retentez l’assaut au prochain tour.' : ''}`,
        choices: [{ label: 'Panser ses plaies', icon: 'heart', desc: '+5 or de consolation. Reprendre la gestion du royaume.', apply: () => 'Vos dresseurs analysent la défaite. La prochaine fois sera la bonne.' }],
      };
      this.runEvent(ev, () => {
        if (retry) {
          saveGame(s);
          this.refresh();
        } else {
          s.arenaIndex = Math.max(s.arenaIndex, o.idx + 1);
          if (adv) extendTrack(s);
          this.advance();
        }
      });
    }
  }

  // Vermithrax est vaincu : on peut clore la partie sur cette victoire, ou poursuivre en mode aventure.
  private victoryChoice() {
    this.busy = true;
    const s = this.s;
    const back = mount(`<div class="modal-back"></div>`);
    const box = mount(
      `<div class="panel howto" style="text-align:center;max-width:640px">
        <h2 class="title" style="font-size:40px;margin-bottom:6px">Victoire !</h2>
        <div class="muted" style="margin-bottom:16px">Vermithrax est vaincu. Votre royaume entre dans la légende… mais le monde est vaste.</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px">
          <div>${icon('sword', 22)}<br><b>${s.stats.wins}</b> victoire(s)</div>
          <div>${icon('house', 22)}<br><b>${s.stats.built}</b> bâtiment(s)</div>
          <div>${icon('heart', 22)}<br><b>${s.hearts}</b> / ${s.maxHearts} cœur(s)</div>
        </div>
        <div class="adv-pitch"><b class="goldtxt">Mode aventure</b> : poursuivez avec des arènes générées, de plus en plus peuplées (jusqu’à 8 monstres), un <b>Gardien</b> tous les 4 paliers et des récompenses croissantes. Votre royaume, vos créatures et vos reliques restent. Vous regagnez <b>1 cœur</b>.</div>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:16px;flex-wrap:wrap">
          <button class="btn big" data-a="end">Terminer ici</button>
          <button class="btn primary big" data-a="go">Poursuivre l’aventure</button>
        </div>
      </div>`,
      back,
    );
    box.querySelector('[data-a="end"]')!.addEventListener('click', () => {
      back.remove();
      s.over = 'win';
      clearSave();
      this.endScreen(true);
    });
    box.querySelector('[data-a="go"]')!.addEventListener('click', () => {
      back.remove();
      s.adventure = { depth: 0, cleared: 0 };
      s.hearts = Math.min(s.maxHearts, s.hearts + 1);
      extendTrack(s);
      s.arenaIndex = Math.max(s.arenaIndex, BASE_ARENAS);
      toast('L’aventure continue : palier 1 en vue !', 'good');
      this.busy = false;
      this.advance();
    });
  }

  private endScreen(win: boolean) {
    this.busy = true;
    const s = this.s;
    const adv = s.adventure;
    const title = adv ? 'Fin de l’aventure' : win ? 'Victoire !' : 'Le royaume est tombé';
    const sub = adv
      ? `Vous avez franchi <b>${adv.cleared}</b> palier(s) après Vermithrax. Le monde se souviendra de votre royaume.`
      : win ? 'Vermithrax est vaincu. Votre royaume entre dans la légende.' : 'Vos cœurs sont épuisés. Une nouvelle dynastie se lèvera.';
    const back = mount(`<div class="modal-back"></div>`);
    mount(
      `<div class="panel howto" style="text-align:center">
        <h2 class="title" style="font-size:40px;margin-bottom:6px">${title}</h2>
        <div class="muted" style="margin-bottom:16px">${sub}</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px">
          <div>${icon('sword', 22)}<br><b>${s.stats.wins}</b> victoire(s)</div>
          <div>${icon('house', 22)}<br><b>${s.stats.built}</b> bâtiment(s)</div>
          <div>${icon('gold', 22)}<br><b>${s.stats.goldEarned}</b> or produit</div>
        </div>
        <div class="muted" style="font-size:13px;margin-bottom:14px">Graine du royaume : <b>${s.seed}</b> · ${DIFFICULTY_BY_ID[difficultyOf(s)].name}</div>
        <button class="btn primary big">Retour au menu</button>
      </div>`,
      back,
    ).querySelector('button')!.addEventListener('click', () => app.setScene(new TitleScene()));
  }
}
