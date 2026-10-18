import { offsetDistance, offsetNeighbors } from '../core/hex';
import { type AbilityDef, CREATURE_BY_ID, type Look, MONSTERS, STAR_MULT } from '../data/creatures';
import { ELEMENT_LIST, SYNERGIES, activeTier, typeMultiplier } from '../data/elements';
import type { Element } from '../data/types';

export const COLS = 7;
export const ROWS = 8;

export interface UnitSpec {
  key: string;
  monster: boolean;
  shiny?: boolean;
  // Multiplicateur de puissance (PV, attaque, sorts) : sert à régler la difficulté de chaque rencontre.
  mul?: number;
  star: number;
  col: number;
  row: number;
}

export interface CUnit {
  id: number;
  side: 0 | 1;
  key: string;
  name: string;
  element: Element;
  look: Look;
  star: number;
  scale: number;
  boss: boolean;
  maxHp: number;
  hp: number;
  atk: number;
  as: number;
  range: number;
  armor: number;
  maxMana: number;
  mana: number;
  ability: AbilityDef;
  abilityValue: number;
  col: number;
  row: number;
  move: { fc: number; fr: number; t: number; dur: number } | null;
  target: CUnit | null;
  atkTimer: number;
  stun: number;
  shield: number;
  shieldT: number;
  frenzy: number;
  frenzyT: number;
  slow: number;
  slowT: number;
  burnDps: number;
  burnT: number;
  dead: boolean;
  deathT: number;
  flash: number;
  lunge: number;
  facing: 1 | -1;
  dmgDealt: number;
  healDone: number;
  lifesteal: number;
  crit: number;
  dmgMul: number;
  dmgReduce: number;
  healMul: number;
  burnPower: number;
  lastEffText: number;
  castT: number;
  monster: boolean;
  shiny: boolean;
  wind: number;
}

export interface Projectile {
  from: CUnit;
  to: CUnit;
  t: number;
  dur: number;
  color: string;
  big: boolean;
  hit: () => void;
}

export type CombatEvent =
  | { kind: 'dmg'; unit: CUnit; amount: number; crit: boolean; spell: boolean }
  | { kind: 'heal'; unit: CUnit; amount: number }
  | { kind: 'shield'; unit: CUnit; amount: number }
  | { kind: 'cast'; unit: CUnit; name: string }
  | { kind: 'eff'; unit: CUnit; text: string; good: boolean }
  | { kind: 'death'; unit: CUnit }
  | { kind: 'ring'; unit: CUnit; radius: number; color: string }
  | { kind: 'stun'; unit: CUnit };

export interface CombatMods {
  atkMul: number;
  hpMul: number;
  relics: string[];
}

const ELEMENT_COLORS: Record<Element, string> = {
  feu: '#ff8a3d',
  eau: '#5ab8ff',
  plante: '#7aff8a',
  foudre: '#fff04a',
  roche: '#e0b880',
  ombre: '#b88aff',
};

export function synergyCounts(keys: string[]): Record<Element, number> {
  const counts = Object.fromEntries(ELEMENT_LIST.map((e) => [e, 0])) as Record<Element, number>;
  for (const k of new Set(keys)) {
    const c = CREATURE_BY_ID[k];
    if (c) counts[c.element]++;
  }
  return counts;
}

export class Combat {
  units: CUnit[] = [];
  projectiles: Projectile[] = [];
  events: CombatEvent[] = [];
  time = 0;
  over: null | 'win' | 'lose' = null;
  private nextId = 1;
  private eauHeal = 0;
  private eauTimer = 0;

  constructor(players: UnitSpec[], enemies: UnitSpec[], mods: CombatMods) {
    const counts = synergyCounts(players.map((p) => p.key));
    for (const p of players) this.units.push(this.make(p, 0, mods, counts));
    for (const e of enemies) this.units.push(this.make(e, 1, mods, counts));
    const eau = activeTier('eau', counts.eau);
    this.eauHeal = eau ? eau.value : 0;
    if (mods.relics.includes('amulette')) {
      for (const u of this.units) if (u.side === 1) { u.slow = 0.3; u.slowT = 6; }
    }
  }

  private make(spec: UnitSpec, side: 0 | 1, mods: CombatMods, counts: Record<Element, number>): CUnit {
    const r = mods.relics;
    let base;
    let name: string;
    let scale = 1;
    let boss = false;
    let mult = 1;
    if (spec.monster) {
      const m = MONSTERS[spec.key];
      base = m;
      name = m.name;
      scale = m.scale;
      boss = !!m.boss;
    } else {
      const c = CREATURE_BY_ID[spec.key];
      base = c;
      name = c.names[spec.star - 1];
      mult = STAR_MULT[spec.star - 1];
    }
    const u: CUnit = {
      id: this.nextId++, side, key: spec.key, name, element: base.element, look: base.look, star: spec.star, scale, boss,
      maxHp: base.hp * mult * (spec.mul ?? 1), hp: 0, atk: base.atk * mult * (spec.mul ?? 1), as: base.as, range: base.range, armor: base.armor,
      maxMana: base.mana, mana: base.startMana ?? 0, ability: base.ability,
      abilityValue: base.ability.values[Math.min(2, spec.star - 1)] * (spec.mul ?? 1),
      col: spec.col, row: spec.row, move: null, target: null, atkTimer: 0.2 + Math.random() * 0.4,
      stun: 0, shield: 0, shieldT: 0, frenzy: 0, frenzyT: 0, slow: 0, slowT: 0, burnDps: 0, burnT: 0,
      dead: false, deathT: 0, flash: 0, lunge: 0, facing: side === 0 ? 1 : -1,
      dmgDealt: 0, healDone: 0, lifesteal: 0, crit: 0, dmgMul: 1, dmgReduce: 0, healMul: 1, burnPower: 0,
      lastEffText: -9, castT: 0, monster: spec.monster, shiny: !!spec.shiny && !spec.monster, wind: 0,
    };
    if (u.shiny) {
      // Les créatures chromatiques sont plus robustes et frappent plus fort.
      u.maxHp *= 1.2;
      u.atk *= 1.2;
    }
    if (side === 0) {
      u.maxHp *= mods.hpMul;
      u.dmgMul *= mods.atkMul;
      const tier = activeTier(u.element, counts[u.element]);
      if (tier) {
        switch (u.element) {
          case 'feu': u.dmgMul += tier.value; u.burnPower = tier.count >= 4 ? 0.3 : 0.15; break;
          case 'plante': u.maxHp *= 1 + tier.value; break;
          case 'foudre': u.as *= 1 + tier.value; break;
          case 'roche': u.dmgReduce += tier.value; break;
          case 'ombre': u.lifesteal += tier.value; u.crit += tier.value; break;
          default: break;
        }
      }
      if (u.element === 'feu' && r.includes('cristalArdent')) u.dmgMul += 0.2;
      if (u.element === 'eau' && r.includes('ecaille')) u.healMul += 0.25;
      if (u.element === 'plante' && r.includes('totem')) u.maxHp *= 1.2;
      if (u.element === 'foudre' && r.includes('pierreTonnerre')) u.as *= 1.2;
      if (u.element === 'roche' && r.includes('coeurGolem')) u.dmgReduce += 0.1;
      if (u.element === 'ombre' && r.includes('lameSpectrale')) u.crit += 0.2;
      if (r.includes('potion')) u.mana = Math.max(u.mana, u.maxMana * 0.3);
    }
    u.hp = u.maxHp;
    return u;
  }

  alive(side?: 0 | 1) {
    return this.units.filter((u) => !u.dead && (side === undefined || u.side === side));
  }

  private occupied(col: number, row: number, except?: CUnit) {
    return this.units.some((u) => !u.dead && u !== except && u.col === col && u.row === row);
  }

  private dist(a: CUnit, b: CUnit) {
    return offsetDistance(a.col, a.row, b.col, b.row);
  }

  private nearestEnemy(u: CUnit): CUnit | null {
    let best: CUnit | null = null;
    let bd = Infinity;
    for (const o of this.units) {
      if (o.dead || o.side === u.side) continue;
      const d = this.dist(u, o) + o.id * 1e-4;
      if (d < bd) {
        bd = d;
        best = o;
      }
    }
    return best;
  }

  // Premier pas d'un plus court chemin vers une case à portée de la cible.
  private nextStep(u: CUnit, target: CUnit): { col: number; row: number } | null {
    const key = (c: number, r: number) => r * COLS + c;
    const start = key(u.col, u.row);
    const prev = new Map<number, number>([[start, -1]]);
    const queue: [number, number][] = [[u.col, u.row]];
    let goal: number | null = null;
    while (queue.length) {
      const [c, r] = queue.shift()!;
      if (offsetDistance(c, r, target.col, target.row) <= u.range && key(c, r) !== start) {
        goal = key(c, r);
        break;
      }
      for (const n of offsetNeighbors(c, r)) {
        if (n.col < 0 || n.col >= COLS || n.row < 0 || n.row >= ROWS) continue;
        const k = key(n.col, n.row);
        if (prev.has(k)) continue;
        if (this.occupied(n.col, n.row, u)) continue;
        prev.set(k, key(c, r));
        queue.push([n.col, n.row]);
      }
    }
    if (goal === null) {
      // Pas de chemin : on tente de se rapprocher.
      let best: { col: number; row: number } | null = null;
      let bd = offsetDistance(u.col, u.row, target.col, target.row);
      for (const n of offsetNeighbors(u.col, u.row)) {
        if (n.col < 0 || n.col >= COLS || n.row < 0 || n.row >= ROWS) continue;
        if (this.occupied(n.col, n.row, u)) continue;
        const d = offsetDistance(n.col, n.row, target.col, target.row);
        if (d < bd) {
          bd = d;
          best = n;
        }
      }
      return best;
    }
    let cur = goal;
    while (prev.get(cur) !== start) {
      const p = prev.get(cur);
      if (p === undefined || p === -1) break;
      cur = p;
    }
    return { col: cur % COLS, row: Math.floor(cur / COLS) };
  }

  private fury() {
    return this.time > 40 ? 1 + ((this.time - 40) / 10) * 0.5 : 1;
  }

  damage(src: CUnit, dst: CUnit, raw: number, spell: boolean) {
    if (dst.dead) return;
    const mult = typeMultiplier(src.element, dst.element);
    let dmg = raw * mult * this.fury() * src.dmgMul;
    let crit = false;
    if (!spell && src.crit > 0 && Math.random() < src.crit) {
      dmg *= 1.6;
      crit = true;
    }
    dmg *= 1 - Math.min(0.75, dst.armor + dst.dmgReduce);
    if (dst.shield > 0) {
      const ab = Math.min(dst.shield, dmg);
      dst.shield -= ab;
      dmg -= ab;
    }
    dmg = Math.max(0, dmg);
    dst.hp -= dmg;
    dst.flash = 1;
    dst.mana = Math.min(dst.maxMana, dst.mana + Math.min(12, dmg * 0.05));
    src.dmgDealt += dmg;
    if (src.lifesteal > 0) src.hp = Math.min(src.maxHp, src.hp + dmg * src.lifesteal);
    if (!spell && src.burnPower > 0) {
      dst.burnDps = src.atk * src.burnPower;
      dst.burnT = 3;
    }
    this.events.push({ kind: 'dmg', unit: dst, amount: dmg, crit, spell });
    if (mult !== 1 && this.time - dst.lastEffText > 2.5) {
      dst.lastEffText = this.time;
      this.events.push({ kind: 'eff', unit: dst, text: mult > 1 ? 'Super efficace !' : 'Peu efficace…', good: mult > 1 });
    }
    if (dst.hp <= 0) {
      dst.hp = 0;
      dst.dead = true;
      this.events.push({ kind: 'death', unit: dst });
    }
  }

  heal(src: CUnit, dst: CUnit, amount: number) {
    if (dst.dead) return;
    const v = Math.min(dst.maxHp - dst.hp, amount * src.healMul);
    if (v <= 0) return;
    dst.hp += v;
    src.healDone += v;
    this.events.push({ kind: 'heal', unit: dst, amount: v });
  }

  private shoot(from: CUnit, to: CUnit, big: boolean, hit: () => void) {
    const d = this.dist(from, to);
    this.projectiles.push({ from, to, t: 0, dur: 0.12 + d * 0.09, color: ELEMENT_COLORS[from.element], big, hit });
  }

  private cast(u: CUnit, target: CUnit) {
    const a = u.ability;
    const v = u.abilityValue;
    u.castT = 0.6;
    this.events.push({ kind: 'cast', unit: u, name: a.name });
    const enemies = this.alive(u.side === 0 ? 1 : 0);
    const allies = this.alive(u.side);
    switch (a.kind) {
      case 'nuke': {
        const bonus = u.key === 'faucheur' && target.hp < target.maxHp * 0.4 ? 2 : 1;
        if (u.range > 1) this.shoot(u, target, true, () => this.damage(u, target, v * bonus, true));
        else this.damage(u, target, v * bonus, true);
        break;
      }
      case 'drain': {
        const before = target.hp;
        this.damage(u, target, v, true);
        const dealt = Math.max(0, before - target.hp);
        this.heal(u, u, dealt);
        break;
      }
      case 'aoe': {
        const r = a.radius ?? 1;
        const hitAll = () => {
          this.events.push({ kind: 'ring', unit: target, radius: r, color: ELEMENT_COLORS[u.element] });
          for (const e of enemies) if (offsetDistance(e.col, e.row, target.col, target.row) <= r) this.damage(u, e, v, true);
        };
        if (u.range > 1) this.shoot(u, target, true, hitAll);
        else hitAll();
        break;
      }
      case 'slam': {
        const r = a.radius ?? 1;
        this.events.push({ kind: 'ring', unit: u, radius: r + 0.5, color: ELEMENT_COLORS[u.element] });
        for (const e of enemies) {
          if (offsetDistance(e.col, e.row, u.col, u.row) <= r) {
            this.damage(u, e, v, true);
            e.stun = Math.max(e.stun, a.duration ?? 1.5);
            this.events.push({ kind: 'stun', unit: e });
          }
        }
        break;
      }
      case 'stun': {
        this.damage(u, target, v, true);
        target.stun = Math.max(target.stun, a.duration ?? 1.5);
        this.events.push({ kind: 'stun', unit: target });
        break;
      }
      case 'heal': {
        const low = allies.reduce((m, x) => (x.hp / x.maxHp < m.hp / m.maxHp ? x : m), allies[0]);
        this.heal(u, low, v);
        this.events.push({ kind: 'ring', unit: low, radius: 0.6, color: '#7affc0' });
        break;
      }
      case 'teamheal':
        for (const al of allies) this.heal(u, al, v);
        this.events.push({ kind: 'ring', unit: u, radius: 2.5, color: '#7affc0' });
        break;
      case 'shield':
        u.shield = v;
        u.shieldT = 4;
        this.events.push({ kind: 'shield', unit: u, amount: v });
        break;
      case 'frenzy':
        u.frenzy = v / 100;
        u.frenzyT = 4;
        break;
      case 'multishot': {
        const targets = [...enemies].sort((x, y) => this.dist(u, x) - this.dist(u, y)).slice(0, a.count ?? 3);
        for (const tg of targets) this.shoot(u, tg, true, () => this.damage(u, tg, v, true));
        break;
      }
    }
  }

  step(dt: number) {
    if (this.over) return;
    this.time += dt;
    for (const p of this.projectiles) p.t += dt;
    const landed = this.projectiles.filter((p) => p.t >= p.dur);
    this.projectiles = this.projectiles.filter((p) => p.t < p.dur);
    for (const p of landed) if (!p.to.dead) p.hit();

    if (this.eauHeal > 0) {
      this.eauTimer += dt;
      if (this.eauTimer >= 3) {
        this.eauTimer = 0;
        const allies = this.alive(0);
        const healer = allies.find((x) => x.element === 'eau') ?? allies[0];
        if (healer) for (const al of allies) this.heal(healer, al, al.maxHp * this.eauHeal);
      }
    }

    for (const u of this.units) {
      u.flash = Math.max(0, u.flash - dt * 5);
      u.lunge = Math.max(0, u.lunge - dt * 5);
      u.castT = Math.max(0, u.castT - dt);
      if (u.dead) {
        u.deathT += dt;
        continue;
      }
      if (u.shieldT > 0 && (u.shieldT -= dt) <= 0) u.shield = 0;
      if (u.frenzyT > 0 && (u.frenzyT -= dt) <= 0) u.frenzy = 0;
      if (u.slowT > 0 && (u.slowT -= dt) <= 0) u.slow = 0;
      if (u.burnT > 0) {
        u.burnT -= dt;
        u.hp -= u.burnDps * dt;
        if (u.hp <= 0) {
          u.hp = 0;
          u.dead = true;
          this.events.push({ kind: 'death', unit: u });
          continue;
        }
      }
      if (u.stun > 0) {
        u.stun -= dt;
        continue;
      }
      const speed = 1 - u.slow;
      if (u.move) {
        u.move.t += dt * speed;
        if (u.move.t >= u.move.dur) u.move = null;
        else continue;
      }
      if (!u.target || u.target.dead) u.target = this.nearestEnemy(u);
      const tg = u.target;
      if (!tg) continue;
      // Retarget si un ennemi bien plus proche apparaît.
      const near = this.nearestEnemy(u);
      if (near && near !== tg && this.dist(u, near) + 1 < this.dist(u, tg)) u.target = near;
      const target = u.target!;
      const d = this.dist(u, target);
      const dx = target.col + (target.row & 1) * 0.5 - (u.col + (u.row & 1) * 0.5);
      if (Math.abs(dx) > 0.01) u.facing = dx > 0 ? 1 : -1;
      if (d <= u.range) {
        if (u.mana >= u.maxMana) {
          u.mana = 0;
          this.cast(u, target);
          u.atkTimer = Math.max(u.atkTimer, 0.35);
          continue;
        }
        u.atkTimer -= dt * speed;
        u.wind = Math.max(0, Math.min(1, 1 - u.atkTimer / 0.22));
        if (u.atkTimer <= 0) {
          u.wind = 0;
          u.atkTimer = 1 / (u.as * (1 + u.frenzy));
          u.lunge = 1;
          u.mana = Math.min(u.maxMana, u.mana + 10);
          if (u.range > 1) this.shoot(u, target, false, () => this.damage(u, target, u.atk, false));
          else this.damage(u, target, u.atk, false);
        }
      } else {
        u.wind = 0;
        const st = this.nextStep(u, target);
        if (st) {
          u.move = { fc: u.col, fr: u.row, t: 0, dur: 0.45 };
          u.col = st.col;
          u.row = st.row;
        }
      }
    }

    if (!this.alive(1).length) this.over = 'win';
    else if (!this.alive(0).length) this.over = 'lose';
    else if (this.time > 90) this.over = 'lose';
  }
}

export function synergySummary(keys: string[]) {
  const counts = synergyCounts(keys);
  return ELEMENT_LIST.map((e) => ({ el: e, count: counts[e], tier: activeTier(e, counts[e]), def: SYNERGIES[e] }))
    .filter((x) => x.count > 0)
    .sort((a, b) => (b.tier ? 1 : 0) - (a.tier ? 1 : 0) || b.count - a.count);
}
