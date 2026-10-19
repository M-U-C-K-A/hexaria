import { type Scene, app } from '../app';
import { audio } from '../audio';
import { saveSettings, settings } from '../settings';
import { SQRT3, hexCorners, pointInPoly, tracePoly } from '../core/hex';
import { RNG } from '../core/rng';
import { BASE_ARENAS, encounterAt, enemyPower, isAdventureArena, paliers } from '../data/adventure';
import { CREATURES, CREATURE_BY_ID, type CreatureDef, MONSTERS, SHOP_ODDS, STAR_MULT, TIER_COST } from '../data/creatures';
import { ELEMENTS, SYNERGIES, typeMultiplier, weakAgainst } from '../data/elements';
import type { Element } from '../data/types';
import { type CombatBonus, combatBonuses } from '../game/economy';
import { COLS, Combat, type CUnit, ROWS, synergySummary } from '../game/combat';
import { type GameState, shinyChance } from '../game/state';
import { type Backdrop, buildBackdrop, drawBackdropFx, themeForArena } from '../render/arenaBackdrop';
import { ensureSprite, type Sprite } from '../render/sprites';
import { type UnitRef, creaturePortrait, drawUnit, unitHeight } from '../render/creatureArt';
import { type Ctx, ellipse, glow, mix, poly, rgba, shade } from '../render/draw';
import { FX } from '../render/fx';
import { bindTip, mount, stars, toast, tooltip } from '../ui/common';
import { meta } from '../meta';
import { icon } from '../ui/icons';
import { startTour, stopTutorial } from '../ui/tutorial';
import { arenaChapter } from '../ui/tutorialChapters';

type Place = { kind: 'board'; col: number; row: number } | { kind: 'bench'; i: number };

interface PlanUnit {
  uid: number;
  key: string;
  star: number;
  companion: boolean;
  shiny: boolean;
  at: Place;
}

const BENCH = 9;
const PLAYER_ROW0 = 4;
const SQUASH = 0.6;
const REROLL = 2;

export class ArenaScene implements Scene {
  private enc;
  private bonus: CombatBonus;
  private gold: number;
  private freeRerolls: number;
  private shop: (CreatureDef | null)[] = [];
  private units: PlanUnit[] = [];
  private phase: 'plan' | 'fight' | 'end' = 'plan';
  private timer: number;
  private combat: Combat | null = null;
  private speed: number = settings.speed;
  private fx = new FX();
  private t = 0;
  private drag: { u: PlanUnit; x: number; y: number } | null = null;
  private hoverCell: { col: number; row: number } | null = null;
  private hoverBench = -1;
  private bg: Backdrop | null = null;
  private paintedBg: Sprite | null = null;
  private bgL = { cx: 0, cy: 0, hs: 1 };
  private zoomK = 1;
  private rebuildAt = 0;
  private pops = new Map<number, number>();
  private shopShiny: boolean[] = [];
  private L = { cx: 0, cy: 0, hs: 38, sc: 1 };
  private ui: Record<string, HTMLElement> = {};
  private rng: RNG;
  private nextUid = 1;
  private endT = 0;
  private meterT = 0;
  private result: 'win' | 'lose' = 'lose';
  private mouse = { x: 0, y: 0 };
  private timerEl: HTMLElement | null = null;

  constructor(private s: GameState, private idx: number, private onDone: (r: 'win' | 'lose') => void) {
    this.enc = encounterAt(s, idx);
    this.bonus = combatBonuses(s);
    this.gold = s.res.gold + this.bonus.bonusGold;
    this.freeRerolls = this.bonus.freeRerolls;
    this.timer = this.bonus.prepTime;
    this.rng = new RNG((s.rng || s.seed) ^ (idx * 7919));
    s.companions.slice(0, this.bonus.companionSlots).forEach((c, i) => {
      this.units.push({ uid: this.nextUid++, key: c.id, star: c.star, companion: true, shiny: !!c.shiny, at: { kind: 'bench', i } });
    });
    this.rollShop();
  }

  // ——— Géométrie ———
  private layout() {
    const W = app.w;
    const H = app.h;
    // La taille des cases s'adapte à la fenêtre ; la molette ajoute un zoom manuel.
    const fit = Math.min((H - 290) / 9.2, (W - 540) / 11.8);
    const hs = Math.max(30, Math.min(84, fit)) * this.zoomK;
    this.L = { cx: W / 2, cy: 92 + 3.8 * hs, hs, sc: Math.max(0.6, Math.min(1.7, hs / 50)) };
  }

  private rowScale(row: number) {
    return 0.8 + 0.24 * (row / (ROWS - 1));
  }

  private rowY(row: number) {
    const { cy, hs } = this.L;
    let y = cy - 3.5 * hs * 1.5 * SQUASH * 0.92;
    for (let r = 0; r < row; r++) y += hs * 1.5 * SQUASH * ((this.rowScale(r) + this.rowScale(r + 1)) / 2);
    return y;
  }

  cell(col: number, row: number) {
    const rs = this.rowScale(row);
    return { x: this.L.cx + (col + (row & 1) * 0.5 - 3.25) * SQRT3 * this.L.hs * rs, y: this.rowY(row), rs };
  }

  private benchPos(i: number) {
    const y = this.rowY(ROWS - 1) + this.L.hs * 1.9;
    return { x: this.L.cx + (i - (BENCH - 1) / 2) * this.L.hs * 1.95, y, rs: 0.95 };
  }

  private placePos(p: Place) {
    return p.kind === 'board' ? this.cell(p.col, p.row) : this.benchPos(p.i);
  }

  private cellAt(x: number, y: number) {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const c = this.cell(col, row);
        if (Math.abs(x - c.x) > this.L.hs * 1.2 || Math.abs(y - c.y) > this.L.hs) continue;
        if (pointInPoly(x, y, hexCorners(c.x, c.y, this.L.hs * c.rs, SQUASH))) return { col, row };
      }
    }
    return null;
  }

  private benchAt(x: number, y: number) {
    for (let i = 0; i < BENCH; i++) {
      const b = this.benchPos(i);
      if (Math.abs(x - b.x) < this.L.hs * 0.9 && Math.abs(y - b.y) < this.L.hs * 0.75) return i;
    }
    return -1;
  }

  // ——— Boutique / banc ———
  private rollShop() {
    const odds = SHOP_ODDS[Math.min(SHOP_ODDS.length - 1, this.bonus.oddsLevel)];
    this.shop = Array.from({ length: 5 }, () => {
      const tier = this.rng.weighted([1, 2, 3, 4], (t) => odds[t - 1]);
      return this.rng.pick(CREATURES.filter((c) => c.tier === tier));
    });
    // Petite surprise : une créature de la boutique peut être chromatique (rare, plus puissante).
    this.shopShiny = this.shop.map(() => this.rng.chance(shinyChance(this.s, 0.06)));
  }

  private boardUnits() {
    return this.units.filter((u) => u.at.kind === 'board');
  }

  private freeBench(): number {
    for (let i = 0; i < BENCH; i++) if (!this.units.some((u) => u.at.kind === 'bench' && u.at.i === i)) return i;
    return -1;
  }

  private unitAt(p: Place) {
    return this.units.find((u) =>
      p.kind === 'board' ? u.at.kind === 'board' && u.at.col === p.col && u.at.row === p.row : u.at.kind === 'bench' && u.at.i === p.i,
    );
  }

  private sellValue(u: PlanUnit) {
    return TIER_COST[CREATURE_BY_ID[u.key].tier] * Math.pow(3, u.star - 1);
  }

  private buy(slot: number) {
    if (this.phase !== 'plan') return;
    const c = this.shop[slot];
    if (!c) return;
    const cost = TIER_COST[c.tier];
    if (this.gold < cost) {
      toast('Pas assez d’or', 'bad');
      return;
    }
    let i = this.freeBench();
    const pairs = this.units.filter((u) => u.key === c.id && u.star === 1).length;
    if (i < 0 && pairs < 2) {
      toast('Banc plein — vendez ou placez des créatures', 'bad');
      return;
    }
    this.gold -= cost;
    audio.play('coin');
    this.shop[slot] = null;
    const shiny = this.shopShiny[slot];
    const u: PlanUnit = { uid: this.nextUid++, key: c.id, star: 1, companion: false, shiny, at: { kind: 'bench', i: i < 0 ? -1 : i } };
    this.units.push(u);
    if (shiny) {
      meta.shiny();
      const p = this.placePos(u.at.kind === 'bench' && u.at.i < 0 ? { kind: 'bench', i: 0 } : u.at);
      this.fx.spark(p.x, p.y - this.L.hs, '#fff6b0', 26, 150);
      this.fx.text(p.x, p.y - this.L.hs * 1.8, '✦ Chromatique !', '#fff0a0', 22);
      audio.play('evolve');
    }
    this.tryCombine(c.id, 1);
    if (u.at.kind === 'bench' && u.at.i === -1 && this.units.includes(u)) {
      i = this.freeBench();
      if (i >= 0) u.at = { kind: 'bench', i };
    }
    this.refreshUI();
  }

  private tryCombine(key: string, star: number) {
    if (star >= 3) return;
    const same = this.units.filter((u) => u.key === key && u.star === star);
    if (same.length < 3) return;
    same.sort((a, b) => (a.at.kind === 'board' ? 0 : 1) - (b.at.kind === 'board' ? 0 : 1) || (a.at.kind === 'bench' && a.at.i < 0 ? 1 : 0));
    const keep = same[0];
    const gone = same.slice(1, 3);
    keep.star++;
    keep.companion = keep.companion || gone.some((g) => g.companion);
    keep.shiny = keep.shiny || gone.some((g) => g.shiny);
    this.pops.set(keep.uid, 1);
    this.units = this.units.filter((u) => !gone.includes(u));
    if (keep.at.kind === 'bench' && keep.at.i < 0) {
      const i = this.freeBench();
      keep.at = { kind: 'bench', i: i < 0 ? 0 : i };
    }
    const p = this.placePos(keep.at);
    const def = CREATURE_BY_ID[key];
    this.fx.ring(p.x, p.y, '#ffd25a', this.L.hs * 1.4);
    this.fx.spark(p.x, p.y - this.L.hs * 0.6, '#ffd25a', 22, 140);
    this.fx.text(p.x, p.y - this.L.hs * 1.6, 'Évolution !', '#ffd25a', 22);
    audio.play('evolve');
    toast(`${def.names[star - 1]} évolue en ${def.names[star]} ${stars(star + 1)} !`, 'good');
    meta.evolve(star + 1);
    this.tryCombine(key, star + 1);
  }

  private sell(u: PlanUnit) {
    if (u.companion) {
      toast('Les compagnons ne peuvent pas être vendus', 'bad');
      return;
    }
    this.gold += this.sellValue(u);
    audio.play('sell');
    this.units = this.units.filter((x) => x !== u);
    const p = this.placePos(u.at);
    this.fx.spark(p.x, p.y - 10, '#f2c14e', 10, 80);
    this.refreshUI();
  }

  private reroll() {
    if (this.phase !== 'plan') return;
    if (this.freeRerolls > 0) this.freeRerolls--;
    else if (this.gold >= REROLL) this.gold -= REROLL;
    else {
      toast('Pas assez d’or', 'bad');
      return;
    }
    audio.play('reroll');
    this.rollShop();
    this.refreshUI();
  }

  private moveUnit(u: PlanUnit, to: Place) {
    const other = this.unitAt(to);
    if (other === u) return;
    if (to.kind === 'board' && u.at.kind === 'bench' && !other && this.boardUnits().length >= this.bonus.boardSlots) {
      toast(`Plateau complet (${this.bonus.boardSlots} max) — construisez des casernes`, 'bad');
      return;
    }
    if (other) other.at = u.at;
    u.at = to;
  }

  // ——— Combat ———
  private startFight() {
    if (this.phase !== 'plan') return;
    // Remplit automatiquement le plateau depuis le banc (comme dans un auto-battler).
    const bench = this.units.filter((u) => u.at.kind === 'bench').sort((a, b) => b.star * 10 + CREATURE_BY_ID[b.key].tier - (a.star * 10 + CREATURE_BY_ID[a.key].tier));
    const order: [number, number][] = [];
    for (const row of [4, 5, 6, 7]) for (const col of [3, 2, 4, 1, 5, 0, 6]) order.push([col, row]);
    for (const u of bench) {
      if (this.boardUnits().length >= this.bonus.boardSlots) break;
      const spot = order.find(([c, r]) => !this.unitAt({ kind: 'board', col: c, row: r }));
      if (spot) u.at = { kind: 'board', col: spot[0], row: spot[1] };
    }
    const players = this.boardUnits().map((u) => ({ key: u.key, monster: false, shiny: u.shiny, star: u.star, col: (u.at as { col: number }).col, row: (u.at as { row: number }).row }));
    if (!players.length) {
      toast('Achetez au moins une créature !', 'bad');
      return;
    }
    for (const x of synergySummary(players.map((p) => p.key))) meta.synergy(x.count);
    const enemies = this.enc.enemies.map((e) => ({ key: e.id, monster: true, star: 1, col: e.col, row: e.row, mul: enemyPower(this.s, this.enc) }));
    this.combat = new Combat(players, enemies, { atkMul: this.bonus.atkMul, hpMul: this.bonus.hpMul, relics: this.s.relics });
    this.phase = 'fight';
    audio.play('horn');
    this.drag = null;
    tooltip.hide();
    this.banner('COMBAT !', '#ffd98a', 1200);
    this.refreshUI();
  }

  private banner(text: string, color: string, ms: number) {
    const b = mount(`<div class="banner" style="color:${color}">${text}</div>`);
    setTimeout(() => b.remove(), ms);
  }

  // ——— Cycle de vie ———
  enter() {
    audio.setMood('arena');
    this.layout();
    this.buildBg();
    // Fond d'arène peint (art/arena_<ambiance>.png) : chargé à la demande, remplace le décor procédural.
    ensureSprite(`arena/${themeForArena(this.idx)}`).then((sp) => {
      if (sp) {
        this.paintedBg = sp;
        this.buildBg();
      }
    });
    this.buildUI();
    this.refreshUI();
    this.banner(this.enc.name.toUpperCase(), '#ffd98a', 1600);
    if (!document.body.classList.contains('shot')) {
      startTour('arena', arenaChapter({
        playRect: () => this.playRect(),
        unitsOwned: () => this.units.length,
        boardCount: () => this.boardUnits().length,
        inFight: () => this.phase !== 'plan',
      }));
    }
  }

  // Votre moitié du plateau et le banc : zone mise en avant par le tutoriel.
  private playRect() {
    const hs = this.L.hs;
    const a = this.cell(0, PLAYER_ROW0);
    const b = this.cell(COLS - 1, ROWS - 1);
    const bench = this.benchPos(BENCH - 1);
    const left = Math.min(a.x, b.x, this.benchPos(0).x) - hs;
    const right = Math.max(a.x, b.x, bench.x) + hs;
    const top = Math.min(a.y, b.y) - hs * 0.9;
    const bottom = bench.y + hs * 0.9;
    return { x: left, y: top, w: right - left, h: bottom - top };
  }

  exit() {
    tooltip.hide();
    stopTutorial();
  }

  resize() {
    this.layout();
    this.buildBg();
  }

  wheel(_x: number, _y: number, dy: number) {
    this.zoomK = Math.max(0.7, Math.min(1.4, this.zoomK * Math.exp(-dy * 0.0012)));
    this.layout();
    this.rebuildAt = performance.now() + 160;
  }

  update(dt: number) {
    this.t += dt;
    for (const [id, v] of this.pops) {
      if (v - dt * 2.2 <= 0) this.pops.delete(id);
      else this.pops.set(id, v - dt * 2.2);
    }
    if (this.rebuildAt && performance.now() >= this.rebuildAt) {
      this.rebuildAt = 0;
      this.buildBg();
    }
    if (this.phase === 'plan') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = 0;
        this.startFight();
      }
      if (this.timerEl) {
        this.timerEl.textContent = this.fmtTime();
        this.timerEl.classList.toggle('low', this.timer < 10);
      }
    } else if (this.phase === 'fight' && this.combat) {
      const steps = this.speed;
      for (let i = 0; i < steps; i++) {
        this.combat.step(dt);
        this.consumeEvents();
        this.fx.update(dt);
        if (this.combat.over) break;
      }
      this.meterT += dt;
      if (this.meterT > 0.25) {
        this.meterT = 0;
        this.refreshMeter();
      }
      if (this.combat.over) {
        this.phase = 'end';
        this.result = this.combat.over;
        this.endT = 0;
        this.refreshMeter();
        this.banner(this.result === 'win' ? 'VICTOIRE' : 'DÉFAITE', this.result === 'win' ? '#ffd98a' : '#ff6b6b', 2600);
        audio.play(this.result === 'win' ? 'victory' : 'defeat');
      }
      return;
    } else if (this.phase === 'end') {
      this.endT += dt;
      if (this.endT > 2.8) {
        this.phase = 'plan';
        this.onDone(this.result);
        return;
      }
    }
    this.fx.update(dt);
  }

  private fmtTime() {
    const t = Math.ceil(this.timer);
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  }

  private unitScreen(u: CUnit) {
    const to = this.cell(u.col, u.row);
    if (!u.move) return to;
    const from = this.cell(u.move.fc, u.move.fr);
    const k = Math.min(1, u.move.t / u.move.dur);
    const e = k * k * (3 - 2 * k);
    return { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e - Math.sin(k * Math.PI) * 6, rs: from.rs + (to.rs - from.rs) * e };
  }

  private unitSize(rs: number, scale = 1) {
    return this.L.hs * 1.05 * rs * scale;
  }

  private consumeEvents() {
    const c = this.combat!;
    for (const ev of c.events) {
      const p = this.unitScreen(ev.unit);
      const S = this.unitSize(p.rs, ev.unit.scale);
      const top = p.y - S * 1.05;
      switch (ev.kind) {
        case 'dmg': {
          const col = ev.crit ? '#ffd84a' : ev.unit.side === 0 ? '#ff7a7a' : ev.spell ? '#a8d8ff' : '#ffffff';
          if (settings.floatText) this.fx.text(p.x, top, `${Math.round(ev.amount)}${ev.crit ? '!' : ''}`, col, ev.crit ? 24 : ev.spell ? 20 : 17);
          this.fx.spark(p.x, p.y - S * 0.5, ELEMENTS[ev.unit.element].glow, ev.spell ? 7 : 3, 70);
          audio.play(ev.crit ? 'crit' : 'hit');
          break;
        }
        case 'heal':
          if (ev.amount >= 8 && settings.floatText) this.fx.text(p.x, top, `+${Math.round(ev.amount)}`, '#7aff8a', 17);
          if (ev.amount >= 30) audio.play('heal');
          break;
        case 'shield':
          this.fx.text(p.x, top - 6, 'Bouclier', '#d6f0ff', 16);
          this.fx.ring(p.x, p.y, '#d6f0ff', S * 0.8);
          break;
        case 'cast':
          this.fx.text(p.x, top - 16, ev.name, '#ffd98a', 15);
          audio.play('cast');
          this.fx.ring(p.x, p.y, ELEMENTS[ev.unit.element].color, S * 0.9);
          break;
        case 'eff':
          this.fx.text(p.x, top - 26, ev.text, ev.good ? '#ffe46a' : '#a0a8b0', 15);
          break;
        case 'death':
          this.fx.spark(p.x, p.y - S * 0.5, ELEMENTS[ev.unit.element].color, 26, 160);
          audio.play('death');
          this.fx.ring(p.x, p.y, '#ffffff', S);
          break;
        case 'ring':
          this.fx.ring(p.x, p.y, ev.color, this.L.hs * (ev.radius + 0.5) * 1.6);
          this.fx.spark(p.x, p.y - S * 0.3, ev.color, 16, 160);
          break;
        case 'stun':
          this.fx.text(p.x, top - 8, 'Étourdi', '#fff3a0', 14);
          break;
      }
    }
    c.events.length = 0;
  }

  // ——— Rendu ———
  private buildBg() {
    this.bg = buildBackdrop(themeForArena(this.idx), app.w, app.h, app.dpr, this.L, this.paintedBg);
    this.bgL = { cx: this.L.cx, cy: this.L.cy, hs: this.L.hs };
  }

  render(ctx: Ctx, W: number, H: number) {
    if (this.bg) {
      ctx.fillStyle = this.bg.pal.skyTop;
      ctx.fillRect(0, 0, W, H);
      const k = this.L.hs / this.bgL.hs;
      ctx.save();
      ctx.translate(this.L.cx, this.L.cy);
      ctx.scale(k, k);
      ctx.translate(-this.bgL.cx, -this.bgL.cy);
      ctx.drawImage(this.bg.img, 0, 0, W, H);
      ctx.restore();
      if (settings.ambient) drawBackdropFx(ctx, this.bg, this.t);
    }
    this.drawGrid(ctx);
    this.drawBench(ctx);

    type Item = { y: number; draw: () => void };
    const items: Item[] = [];
    if (this.phase === 'plan' || !this.combat) {
      for (const e of this.enc.enemies) {
        const m = MONSTERS[e.id];
        const p = this.cell(e.col, e.row);
        const ref: UnitRef = { key: e.id, monster: true, star: 1, look: m.look };
        items.push({ y: p.y, draw: () => this.drawUnitAt(ctx, p.x, p.y, p.rs, ref, m.scale, e.col < 3.5 ? 1 : -1, { hp: 1, mana: (m.startMana ?? 0) / m.mana, enemy: true, name: m.boss ? m.name : undefined }) });
      }
      for (const u of this.units) {
        if (u === this.drag?.u) continue;
        const p = this.placePos(u.at);
        const d = CREATURE_BY_ID[u.key];
        const ref: UnitRef = { key: u.key, monster: false, star: u.star, look: d.look };
        items.push({ y: p.y, draw: () => this.drawUnitAt(ctx, p.x, p.y, p.rs, ref, 1, 1, { hp: 1, mana: (d.startMana ?? 0) / d.mana, enemy: false, companion: u.companion, bench: u.at.kind === 'bench', shiny: u.shiny, pop: this.pops.get(u.uid) ?? 0 }) });
      }
    } else {
      for (const u of this.units.filter((x) => x.at.kind === 'bench')) {
        const p = this.placePos(u.at);
        const d = CREATURE_BY_ID[u.key];
        const ref: UnitRef = { key: u.key, monster: false, star: u.star, look: d.look };
        items.push({ y: p.y, draw: () => this.drawUnitAt(ctx, p.x, p.y, p.rs, ref, 1, 1, { hp: 1, mana: 0, enemy: false, bench: true, dim: true, shiny: u.shiny }) });
      }
      for (const u of this.combat.units) {
        if (u.dead && u.deathT > 0.6) continue;
        const p = this.unitScreen(u);
        items.push({ y: p.y, draw: () => this.drawCombatUnit(ctx, u, p) });
      }
    }
    items.sort((a, b) => a.y - b.y).forEach((i) => i.draw());

    if (this.combat && this.phase !== 'plan') this.drawProjectiles(ctx);
    this.fx.draw(ctx);
    this.fx.drawTexts(ctx);

    if (this.drag) {
      const d = CREATURE_BY_ID[this.drag.u.key];
      ctx.save();
      ctx.globalAlpha = 0.9;
      drawUnit(ctx, { key: this.drag.u.key, monster: false, star: this.drag.u.star, look: d.look }, this.drag.x, this.drag.y + this.L.hs * 0.4, this.unitSize(1.05), { t: this.t, facing: 1, shiny: this.drag.u.shiny, pop: 0.15 });
      ctx.restore();
    }
  }

  private drawGrid(ctx: Ctx) {
    const planning = this.phase === 'plan';
    const base = this.bg?.pal.floor ?? '#4a5459';
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const c = this.cell(col, row);
        const R = this.L.hs * c.rs * 0.95;
        const pts = hexCorners(c.x, c.y, R, SQUASH);
        const mine = row >= PLAYER_ROW0;
        const th = R * 0.2;
        const seed = (col * 17 + row * 31) % 11;
        // épaisseur de la dalle
        poly(ctx, [pts[3].x, pts[3].y, pts[2].x, pts[2].y, pts[2].x, pts[2].y + th, pts[3].x, pts[3].y + th], shade(base, -0.5));
        poly(ctx, [pts[2].x, pts[2].y, pts[1].x, pts[1].y, pts[1].x, pts[1].y + th, pts[2].x, pts[2].y + th], shade(base, -0.68));
        // face supérieure
        const tint = mine ? mix(base, '#2f7a52', 0.3) : mix(base, '#7a3d3d', 0.28);
        const g = ctx.createLinearGradient(0, c.y - R * SQUASH, 0, c.y + R * SQUASH);
        g.addColorStop(0, shade(tint, 0.12 + (seed % 3) * 0.015));
        g.addColorStop(1, shade(tint, -0.14 - (seed % 4) * 0.01));
        tracePoly(ctx, pts);
        ctx.fillStyle = g;
        ctx.fill();
        // fissures et mousse, déterministes par case
        if (seed % 4 === 0) {
          ctx.strokeStyle = 'rgba(0,0,0,0.38)';
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(c.x - R * 0.35, c.y - R * 0.12);
          ctx.lineTo(c.x - R * 0.1, c.y + R * 0.05);
          ctx.lineTo(c.x + R * 0.12, c.y - R * 0.04);
          ctx.lineTo(c.x + R * 0.38, c.y + R * 0.16);
          ctx.stroke();
        }
        if (seed % 5 === 1) {
          ctx.fillStyle = 'rgba(80,150,70,0.4)';
          ctx.beginPath();
          ctx.ellipse(pts[seed % 2 ? 4 : 0].x * 0.82 + c.x * 0.18, pts[seed % 2 ? 4 : 0].y * 0.82 + c.y * 0.18, R * 0.22, R * 0.09, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = 'rgba(6,10,12,0.75)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.16)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(pts[3].x, pts[3].y);
        ctx.lineTo(pts[4].x, pts[4].y);
        ctx.lineTo(pts[5].x, pts[5].y);
        ctx.lineTo(pts[0].x, pts[0].y);
        ctx.stroke();
        const hover = planning && this.drag && this.hoverCell && this.hoverCell.col === col && this.hoverCell.row === row;
        if (hover && mine) {
          tracePoly(ctx, pts);
          ctx.fillStyle = 'rgba(255,217,138,0.3)';
          ctx.fill();
        }
        if (mine) {
          const inner = hexCorners(c.x, c.y, R * 0.88, SQUASH);
          tracePoly(ctx, inner);
          ctx.strokeStyle = planning ? `rgba(190,235,120,${this.drag ? 0.85 : 0.45})` : 'rgba(160,200,110,0.25)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          const inner = hexCorners(c.x, c.y, R * 0.88, SQUASH);
          tracePoly(ctx, inner);
          ctx.strokeStyle = 'rgba(220,120,100,0.22)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }
    }
  }

  private drawBench(ctx: Ctx) {
    const hs = this.L.hs;
    const b0 = this.benchPos(0);
    const b1 = this.benchPos(BENCH - 1);
    const x0 = b0.x - hs * 1.3;
    const w = b1.x - b0.x + hs * 2.6;
    const y0 = b0.y - hs * 0.62;
    const h = hs * 1.28;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(x0 + 5, y0 + h * 0.78, w, h * 0.4, 8);
    ctx.fill();
    const g = ctx.createLinearGradient(0, y0, 0, y0 + h);
    g.addColorStop(0, '#7a5530');
    g.addColorStop(0.5, '#5a3c20');
    g.addColorStop(1, '#2e1c0e');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x0, y0, w, h, 9);
    ctx.fill();
    ctx.strokeStyle = 'rgba(10,6,2,0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    const step = (b1.x - b0.x) / (BENCH - 1);
    for (let i = -1; i <= BENCH - 1; i++) {
      const x = b0.x + (i + 0.5) * step;
      ctx.beginPath();
      ctx.moveTo(x, y0 + 3);
      ctx.lineTo(x, y0 + h - 3);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,214,150,0.22)';
    ctx.fillRect(x0 + 6, y0 + 3, w - 12, 2);
    for (const px of [x0 + 4, x0 + w - 4]) {
      ctx.fillStyle = '#2a1a0c';
      ctx.fillRect(px - 5, y0 - hs * 0.22, 10, h + hs * 0.3);
      ctx.fillStyle = '#7a5530';
      ctx.fillRect(px - 6, y0 - hs * 0.26, 12, 5);
    }
    for (let i = 0; i < BENCH; i++) {
      const b = this.benchPos(i);
      const pts = hexCorners(b.x, b.y, hs * 0.82, SQUASH);
      tracePoly(ctx, pts);
      ctx.fillStyle = this.drag && this.hoverBench === i ? 'rgba(255,217,138,0.35)' : 'rgba(8,14,12,0.5)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(224,181,94,0.6)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.font = `700 ${Math.round(12 * this.L.sc)}px Cinzel, serif`;
    ctx.fillStyle = 'rgba(255,220,150,0.85)';
    ctx.textAlign = 'right';
    ctx.fillText('BANC', x0 - 8, b0.y + 4);
    ctx.textAlign = 'left';
  }

  private drawUnitAt(
    ctx: Ctx, x: number, y: number, rs: number, ref: UnitRef, scale: number, facing: 1 | -1,
    o: { hp: number; mana: number; enemy: boolean; companion?: boolean; bench?: boolean; dim?: boolean; name?: string; shiny?: boolean; pop?: number },
  ) {
    const S = this.unitSize(rs, scale);
    if (o.companion) glow(ctx, x, y - S * 0.2, S * 0.8, '#7affc0', 0.18);
    drawUnit(ctx, ref, x, y + this.L.hs * 0.12 * rs, S, { t: this.t, facing, star: ref.star, alpha: o.dim ? 0.45 : 1, phase: x * 0.01, shiny: o.shiny, pop: o.pop });
    if (!o.bench || !o.dim) this.bars(ctx, x, y - unitHeight(ref, S) - 12, rs, o.hp, o.mana, 0, o.enemy, ref.star, scale, o.name, 0, !!o.shiny);
  }

  private bars(ctx: Ctx, x: number, y: number, rs: number, hp: number, mana: number, shield: number, enemy: boolean, star: number, scale: number, name?: string, maxHp = 0, shiny = false) {
    const w = this.L.hs * 1.25 * rs * (scale > 1.5 ? 1.5 : 1);
    const h = Math.max(4, 5.5 * this.L.sc);
    const x0 = x - w / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(x0 - 1, y - 1, w + 2, h + 5);
    ctx.fillStyle = enemy ? '#d84848' : '#5fd35f';
    ctx.fillRect(x0, y, w * Math.max(0, hp), h);
    if (shield > 0) {
      ctx.fillStyle = 'rgba(230,240,255,0.85)';
      ctx.fillRect(x0 + w * Math.max(0, hp), y, Math.min(w * (1 - hp), w * shield), h);
    }
    if (maxHp > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      const step = maxHp > 4000 ? 1000 : 300;
      for (let v = step; v < maxHp; v += step) ctx.fillRect(x0 + (w * v) / maxHp, y, 1, h);
    }
    ctx.fillStyle = '#4aa8ff';
    ctx.fillRect(x0, y + h + 1, w * Math.min(1, mana), 3);
    if (!enemy && star > 0) {
      ctx.font = `800 ${Math.round(11 * this.L.sc)}px "Alegreya Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = star === 3 ? '#ffe46a' : star === 2 ? '#d8dde4' : '#c08a50';
      ctx.strokeStyle = 'rgba(0,0,0,0.9)';
      ctx.lineWidth = 3;
      const label = (shiny ? '✦' : '') + stars(star);
      ctx.strokeText(label, x, y - 3);
      ctx.fillText(label, x, y - 3);
    }
    if (name) {
      ctx.font = `700 ${Math.round(12 * this.L.sc)}px Cinzel, serif`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.9)';
      ctx.lineWidth = 3;
      ctx.strokeText(name, x, y - 5);
      ctx.fillStyle = '#ffb0a0';
      ctx.fillText(name, x, y - 5);
    }
    ctx.textAlign = 'left';
  }

  private drawCombatUnit(ctx: Ctx, u: CUnit, p: { x: number; y: number; rs: number }) {
    const S = this.unitSize(p.rs, u.scale);
    const alpha = u.dead ? Math.max(0, 1 - u.deathT / 0.6) : 1;
    if (u.castT > 0) glow(ctx, p.x, p.y - S * 0.5, S * 1.2, ELEMENTS[u.element].glow, u.castT * 0.6);
    if (u.shield > 0) {
      ctx.strokeStyle = `rgba(214,240,255,${0.5 + 0.2 * Math.sin(this.t * 8)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - S * 0.45, S * 0.6, S * 0.65, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (u.burnT > 0 && Math.random() < 0.3) this.fx.ember(p.x + (Math.random() - 0.5) * S * 0.5, p.y - S * 0.5, '#ff8a3d');
    const ref: UnitRef = { key: u.key, monster: u.monster, star: u.star, look: u.look };
    drawUnit(ctx, ref, p.x, p.y + this.L.hs * 0.12 * p.rs, S, {
      t: this.t * (u.stun > 0 ? 0.2 : 1), facing: u.facing, star: u.star, flash: u.flash, alpha: u.dead ? undefined : alpha, lunge: u.lunge, phase: u.id,
      wind: u.wind, cast: u.castT, stun: u.stun > 0, moving: u.move ? Math.min(1, u.move.t / u.move.dur) : undefined,
      dead: u.dead ? Math.min(1, u.deathT / 0.6) : 0, shiny: u.shiny,
    });
    if (u.stun > 0 && !u.dead) {
      for (let i = 0; i < 3; i++) {
        const a = this.t * 5 + (i * Math.PI * 2) / 3;
        ctx.fillStyle = '#fff3a0';
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(a) * S * 0.3, p.y - S * 1.15 + Math.sin(a) * S * 0.08, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (!u.dead) {
      this.bars(ctx, p.x, p.y - unitHeight(ref, S) - 12, p.rs, u.hp / u.maxHp, u.mana / u.maxMana, u.shield / u.maxHp, u.side === 1, u.side === 0 ? u.star : 0, u.scale, u.boss ? u.name : undefined, u.maxHp, u.shiny);
    }
  }

  private drawProjectiles(ctx: Ctx) {
    for (const pr of this.combat!.projectiles) {
      const a = this.unitScreen(pr.from);
      const b = this.unitScreen(pr.to);
      const k = Math.min(1, pr.t / pr.dur);
      const Sa = this.unitSize(a.rs, pr.from.scale);
      const Sb = this.unitSize(b.rs, pr.to.scale);
      const x = a.x + (b.x - a.x) * k;
      const y = a.y - Sa * 0.55 + (b.y - Sb * 0.5 - (a.y - Sa * 0.55)) * k - Math.sin(k * Math.PI) * (pr.big ? 30 : 12);
      const r = pr.big ? 7 : 4;
      glow(ctx, x, y, r * 4, pr.color, 0.7);
      ellipse(ctx, x, y, r, r, '#ffffff');
      if (pr.big && Math.random() < 0.6) this.fx.ember(x, y, pr.color);
    }
  }

  // ——— Entrées ———
  private hitUnit(x: number, y: number): PlanUnit | null {
    const bi = this.benchAt(x, y);
    if (bi >= 0) return this.unitAt({ kind: 'bench', i: bi }) ?? null;
    const c = this.cellAt(x, y);
    if (c) return this.unitAt({ kind: 'board', col: c.col, row: c.row }) ?? null;
    return null;
  }

  pointerDown(x: number, y: number, e: PointerEvent) {
    if (this.phase !== 'plan') return;
    const u = this.hitUnit(x, y);
    if (!u) return;
    if (e.button === 2) {
      this.sell(u);
      return;
    }
    this.drag = { u, x, y };
    tooltip.hide();
  }

  pointerMove(x: number, y: number, e: PointerEvent) {
    this.mouse = { x: e.clientX, y: e.clientY };
    this.hoverCell = this.cellAt(x, y);
    this.hoverBench = this.benchAt(x, y);
    if (this.drag) {
      this.drag.x = x;
      this.drag.y = y;
      const overShop = this.overShop(e.clientX, e.clientY);
      this.ui.shop?.classList.toggle('sell-hover', overShop);
      return;
    }
    const tip = this.unitTip(x, y);
    if (tip) tooltip.show(tip, e.clientX, e.clientY);
    else tooltip.hide();
  }

  private overShop(cx: number, cy: number) {
    const r = this.ui.shop?.getBoundingClientRect();
    return !!r && cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
  }

  pointerUp(x: number, y: number, e: PointerEvent) {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    this.ui.shop?.classList.remove('sell-hover');
    if (this.overShop(e.clientX, e.clientY)) {
      this.sell(d.u);
      return;
    }
    const bi = this.benchAt(x, y);
    if (bi >= 0) this.moveUnit(d.u, { kind: 'bench', i: bi });
    else {
      const c = this.cellAt(x, y);
      if (c && c.row >= PLAYER_ROW0) this.moveUnit(d.u, { kind: 'board', col: c.col, row: c.row });
      else if (c) toast('Placez vos créatures sur votre moitié du plateau', 'bad');
    }
    this.refreshUI();
  }

  key(e: KeyboardEvent, down: boolean) {
    if (!down || this.phase !== 'plan') return;
    const k = e.key.toLowerCase();
    if (k === 'd') this.reroll();
    if (k === ' ' || k === 'enter') {
      e.preventDefault();
      this.startFight();
    }
    if (k === 'e') {
      const r = app.canvas.getBoundingClientRect();
      const u = this.hitUnit(this.mouse.x - r.left, this.mouse.y - r.top);
      if (u) this.sell(u);
    }
  }

  private unitTip(x: number, y: number): string | null {
    if (this.phase === 'plan') {
      const u = this.hitUnit(x, y);
      if (u) return this.creatureTip(CREATURE_BY_ID[u.key], u.star, u.companion);
      const c = this.cellAt(x, y);
      if (c) {
        const e = this.enc.enemies.find((en) => en.col === c.col && en.row === c.row);
        if (e) return this.monsterTip(e.id);
      }
      return null;
    }
    if (!this.combat) return null;
    const c = this.cellAt(x, y);
    if (!c) return null;
    const u = this.combat.units.find((cu) => !cu.dead && cu.col === c.col && cu.row === c.row);
    if (!u) return null;
    return `<b class="t">${u.name}</b><span class="chip">${icon(u.element, 14)}${ELEMENTS[u.element].name}</span>
      <div class="unit-tip"><div class="stats"><span>PV ${Math.round(u.hp)}/${Math.round(u.maxHp)}</span><span>Dégâts infligés ${Math.round(u.dmgDealt)}</span></div></div>`;
  }

  private enemyElements(): Element[] {
    return [...new Set(this.enc.enemies.map((e) => MONSTERS[e.id].element))];
  }

  private creatureTip(d: CreatureDef, star: number, companion = false) {
    const m = STAR_MULT[star - 1];
    const vs = this.enemyElements()
      .map((el) => {
        const k = typeMultiplier(d.element, el);
        return k === 1 ? '' : `<div class="${k > 1 ? 'good' : 'bad'}">${k > 1 ? 'Super efficace' : 'Peu efficace'} contre ${ELEMENTS[el].name} (×${k})</div>`;
      })
      .join('');
    return `<div class="unit-tip"><b class="t">${d.names[star - 1]} ${stars(star)}</b>
      <span class="chip">${icon(d.element, 14)}${ELEMENTS[d.element].name}</span> <span class="chip">Tier ${d.tier} · ${TIER_COST[d.tier]} or</span>${companion ? ' <span class="chip good">Compagnon</span>' : ''}
      <div class="stats">
        <span>PV ${Math.round(d.hp * m * this.bonus.hpMul)}</span><span>Attaque ${Math.round(d.atk * m * this.bonus.atkMul)}</span>
        <span>Vit. att. ${d.as.toFixed(2)}</span><span>Portée ${d.range}</span>
        <span>Armure ${Math.round(d.armor * 100)}%</span><span>Mana ${d.mana}</span>
      </div>
      <div><b class="goldtxt">${d.ability.name}</b> — ${d.ability.desc.replace('{v}', String(d.ability.values[star - 1]))}</div>
      <div class="muted" style="margin-top:4px">Évolution : ${d.names.join(' → ')}</div>${vs}</div>`;
  }

  private monsterTip(id: string) {
    const m = MONSTERS[id];
    const weak = weakAgainst(m.element).map((e) => `<span class="chip">${icon(e, 14)}${ELEMENTS[e].name}</span>`).join('');
    return `<div class="unit-tip"><b class="t">${m.name}</b><span class="chip">${icon(m.element, 14)}${ELEMENTS[m.element].name}</span>
      <div class="stats"><span>PV ${m.hp}</span><span>Attaque ${m.atk}</span><span>Vit. att. ${m.as}</span><span>Portée ${m.range}</span></div>
      <div><b class="goldtxt">${m.ability.name}</b> — ${m.ability.desc.replace('{v}', String(m.ability.values[0]))}</div>
      ${weak ? `<div style="margin-top:6px">Faible contre : <span class="typechips">${weak}</span></div>` : ''}</div>`;
  }

  // ——— Interface ———
  private buildUI() {
    this.ui.top = mount(`<div class="panel arena-top"></div>`);
    this.ui.syn = mount(`<div class="panel synergies"></div>`);
    this.ui.right = mount(`<div class="panel enemy-info"></div>`);
    this.ui.info = mount(`<div class="panel board-info"></div>`);
    this.ui.shop = mount(`<div class="panel shop"></div>`);
  }

  private refreshUI() {
    this.refreshTop();
    this.refreshSyn();
    this.refreshRight();
    this.refreshShop();
    const n = this.boardUnits().length;
    this.ui.info.innerHTML =
      this.phase === 'plan'
        ? `Plateau <b class="${n > this.bonus.boardSlots ? 'bad' : 'goldtxt'}">${n} / ${this.bonus.boardSlots}</b> · Glissez vos créatures sur les hexagones · <span class="muted">Clic droit : vendre</span>`
        : `<span class="muted">Le combat se déroule automatiquement…</span>`;
  }

  private refreshTop() {
    const fight = this.phase !== 'plan';
    this.ui.top.innerHTML = `
      <div class="goldbig">${icon('gold', 26)}<span>${this.gold}</span></div>
      <div><div class="timer">${fight ? '⚔' : this.fmtTime()}</div><div class="phase">${fight ? 'Combat' : 'Préparation'}</div></div>
      <div style="text-align:left"><div class="title" style="font-size:15px">${this.enc.name}</div><div class="phase">${isAdventureArena(this.idx) ? `Aventure · palier ${paliers(this.idx)}` : `Arène ${this.idx + 1} / ${BASE_ARENAS}`}</div></div>
      ${fight ? `<div class="speed" style="position:static;display:flex;gap:4px">${[1, 2, 3].map((v) => `<button class="btn ${this.speed === v ? 'on' : ''}" data-v="${v}">×${v}</button>`).join('')}</div>` : ''}`;
    this.timerEl = fight ? null : (this.ui.top.querySelector('.timer') as HTMLElement);
    this.ui.top.querySelectorAll<HTMLButtonElement>('[data-v]').forEach((b) =>
      b.addEventListener('click', () => {
        this.speed = +b.dataset.v!;
        settings.speed = this.speed as 1 | 2 | 3;
        saveSettings();
        this.refreshTop();
      }),
    );
  }

  private refreshSyn() {
    const keys = this.boardUnits().map((u) => u.key);
    const list = synergySummary(keys);
    const rows = list.length
      ? list
          .map((x) => {
            const next = x.def.tiers.find((t) => t.count > x.count);
            return `<div class="syn ${x.tier ? 'on' : ''}" data-e="${x.el}"><div class="badge">${icon(x.el, 18)}</div>
              <div><div class="sn">${x.def.title} <span class="muted" style="font-family:var(--body);font-weight:400">(${ELEMENTS[x.el].name})</span></div>
              <div><span class="cnt">${x.count}</span> <span class="muted">/ ${next ? next.count : x.def.tiers[x.def.tiers.length - 1].count}</span></div></div></div>`;
          })
          .join('')
      : '<div class="muted" style="font-size:13px">Placez des créatures du même type pour activer des synergies.</div>';
    this.ui.syn.innerHTML = `<div class="title" style="font-size:13px">Synergies</div>${rows}`;
    this.ui.syn.querySelectorAll<HTMLElement>('.syn').forEach((n) => {
      const el = n.dataset.e as Element;
      bindTip(n, () => `<b class="t">${SYNERGIES[el].title} (${ELEMENTS[el].name})</b>${SYNERGIES[el].tiers.map((t) => `<div>(${t.count}) ${t.desc}</div>`).join('')}<div class="muted" style="margin-top:4px">Compte les créatures différentes sur le plateau.</div>`);
    });
  }

  private refreshRight() {
    if (this.phase !== 'plan') {
      this.ui.right.className = 'panel dmg';
      this.refreshMeter();
      return;
    }
    this.ui.right.className = 'panel enemy-info';
    const seen = new Set<string>();
    const rows = this.enc.enemies
      .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
      .map((e) => {
        const m = MONSTERS[e.id];
        const n = this.enc.enemies.filter((x) => x.id === e.id).length;
        const weak = weakAgainst(m.element).map((w) => `<span class="chip">${icon(w, 13)}${ELEMENTS[w].name}</span>`).join('');
        return `<div class="enemy" data-m="${e.id}"><img src="${creaturePortrait('m-' + e.id, m.look, 1, 88)}"/>
          <div><div><b>${m.name}</b>${n > 1 ? ` ×${n}` : ''}</div>
          <div class="typechips"><span class="chip">${icon(m.element, 13)}${ELEMENTS[m.element].name}</span><span class="muted" style="font-size:11px">${m.hp} PV</span></div>
          ${weak ? `<div class="typechips"><span class="muted" style="font-size:11px">Faible :</span>${weak}</div>` : ''}</div></div>`;
      })
      .join('');
    const lines = this.bonus.lines.length ? this.bonus.lines.map((l) => `<div>${l}</div>`).join('') : '<div class="muted">Aucun bonus de bâtiment</div>';
    this.ui.right.innerHTML = `<div class="title" style="font-size:13px;margin-bottom:4px">Adversaires</div>${rows}
      <div style="font-size:12.5px;margin-top:8px">${lines}</div>`;
    this.ui.right.querySelectorAll<HTMLElement>('.enemy').forEach((n) => bindTip(n, () => this.monsterTip(n.dataset.m!)));
  }

  private refreshMeter() {
    if (!this.combat || this.phase === 'plan') return;
    const mine = this.combat.units.filter((u) => u.side === 0).sort((a, b) => b.dmgDealt - a.dmgDealt);
    const max = Math.max(1, ...mine.map((u) => u.dmgDealt));
    const foes = this.combat.units.filter((u) => u.side === 1);
    const foeHp = foes.reduce((s, u) => s + u.hp, 0);
    const foeMax = foes.reduce((s, u) => s + u.maxHp, 0);
    this.ui.right.innerHTML = `<div class="title" style="font-size:13px">Dégâts infligés</div>
      ${mine
        .map(
          (u) => `<div class="row" style="opacity:${u.dead ? 0.45 : 1}"><img src="${creaturePortrait(u.key, u.look, u.star, 64)}"/>
          <div style="flex:1"><div class="num">${Math.round(u.dmgDealt).toLocaleString('fr-FR')}</div><div class="bar"><i style="width:${(u.dmgDealt / max) * 100}%"></i></div></div></div>`,
        )
        .join('')}
      <div style="margin-top:10px;font-size:12px" class="muted">Monstres : ${Math.round(foeHp).toLocaleString('fr-FR')} / ${Math.round(foeMax).toLocaleString('fr-FR')} PV</div>
      <div class="bar" style="height:6px;background:rgba(255,255,255,.08);position:relative"><i style="position:absolute;inset:0 auto 0 0;width:${(foeHp / Math.max(1, foeMax)) * 100}%;background:#d84848"></i></div>`;
  }

  private refreshShop() {
    const fight = this.phase !== 'plan';
    const foes = this.enemyElements();
    const owned = (key: string) => this.units.filter((u) => u.key === key && u.star === 1).length;
    const cards = this.shop
      .map((c, i) => {
        if (!c) return `<div class="ccard empty"></div>`;
        const cost = TIER_COST[c.tier];
        const best = Math.max(...foes.map((f) => typeMultiplier(c.element, f)));
        const worst = Math.min(...foes.map((f) => typeMultiplier(c.element, f)));
        const eff = best > 1 ? `<span class="eff">×${best}</span>` : worst < 1 && foes.every((f) => typeMultiplier(c.element, f) <= 1) ? `<span class="eff weak">×${worst}</span>` : '';
        return `<div class="ccard t${c.tier} ${this.gold < cost ? 'poor' : ''} ${owned(c.id) === 2 ? 'pair' : ''}" data-i="${i}">
          <div class="portrait" style="background:radial-gradient(circle at 50% 60%, ${rgba(ELEMENTS[c.element].color, 0.35)}, transparent 70%)">
            <img src="${creaturePortrait(c.id, c.look, 1, 96, this.shopShiny[i])}"/>${eff}${this.shopShiny[i] ? '<span class="shiny-tag">✦ chromatique</span>' : ''}</div>
          <div class="nm"><span>${c.names[0]}</span><span style="display:flex;align-items:center;gap:2px">${icon('gold', 13)}${cost}</span></div>
          <div class="meta">${icon(c.element, 13)}${ELEMENTS[c.element].name} · ${c.range > 1 ? 'Distance' : 'Mêlée'}${owned(c.id) ? ` · <span class="goldtxt">${owned(c.id)}/3</span>` : ''}</div>
        </div>`;
      })
      .join('');
    const rerollLbl = this.freeRerolls > 0 ? `Gratuit ×${this.freeRerolls}` : `${REROLL} or`;
    this.ui.shop.innerHTML = `${cards}
      <div class="side-btns">
        <button class="btn reroll" data-a="reroll" ${fight ? 'disabled' : ''}><span>${icon('refresh', 16)} Relancer</span><span class="muted" style="font-size:11px;font-family:var(--body)">${rerollLbl} · touche D</span></button>
        <button class="btn primary" data-a="fight" ${fight ? 'disabled' : ''}>${icon('sword', 16)} Combat !</button>
      </div>`;
    this.ui.shop.style.opacity = fight ? '0.55' : '1';
    this.ui.shop.querySelectorAll<HTMLElement>('.ccard[data-i]').forEach((n) => {
      const i = +n.dataset.i!;
      n.addEventListener('click', () => this.buy(i));
      bindTip(n, () => this.creatureTip(this.shop[i]!, 1));
    });
    this.ui.shop.querySelector('[data-a="reroll"]')?.addEventListener('click', () => this.reroll());
    this.ui.shop.querySelector('[data-a="fight"]')?.addEventListener('click', () => this.startFight());
  }
}
