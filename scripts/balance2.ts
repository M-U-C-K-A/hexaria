// Équilibrage des arènes : un robot dépense un budget dans la boutique puis combat chaque arène.
// Usage : npx tsx scripts/balance2.ts [essais]
import { RNG } from '../src/core/rng';
import { CREATURES, CREATURE_BY_ID, ENCOUNTERS, SHOP_ODDS, STAR_MULT, TIER_COST } from '../src/data/creatures';
import { Combat, type UnitSpec } from '../src/game/combat';

interface Owned {
  key: string;
  star: number;
}

const RANGED = new Set(CREATURES.filter((c) => c.range > 1).map((c) => c.id));

function power(u: Owned) {
  const d = CREATURE_BY_ID[u.key];
  return (d.hp * d.atk) ** 0.5 * STAR_MULT[u.star - 1] * (1 + d.tier * 0.12);
}

function merge(units: Owned[]) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const star of [1, 2]) {
      const keys = new Set(units.filter((u) => u.star === star).map((u) => u.key));
      for (const k of keys) {
        const same = units.filter((u) => u.key === k && u.star === star);
        if (same.length >= 3) {
          for (let i = 0; i < 3; i++) units.splice(units.indexOf(same[i]), 1);
          units.push({ key: k, star: star + 1 });
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }
}

// Robot de boutique : achète d'abord ce qui fait évoluer, puis ce qui renforce une synergie, puis le plus haut palier.
function shopBot(budget: number, oddsLevel: number, slots: number, rng: RNG): Owned[] {
  const odds = SHOP_ODDS[Math.min(SHOP_ODDS.length - 1, oddsLevel)];
  let gold = budget;
  const units: Owned[] = [];
  for (let guard = 0; guard < 80 && gold >= 2; guard++) {
    const shop = Array.from({ length: 5 }, () => {
      const tier = rng.weighted([1, 2, 3, 4], (t) => odds[t - 1]);
      return rng.pick(CREATURES.filter((c) => c.tier === tier));
    });
    const elems = new Map<string, number>();
    for (const u of units) {
      const e = CREATURE_BY_ID[u.key].element;
      elems.set(e, (elems.get(e) ?? 0) + 1);
    }
    const score = (c: (typeof CREATURES)[number]) => {
      const same1 = units.filter((u) => u.key === c.id && u.star === 1).length;
      const same2 = units.filter((u) => u.key === c.id && u.star === 2).length;
      let sc = c.tier * 2;
      if (same1 === 2) sc += 30;
      else if (same1 === 1) sc += 12;
      if (same2 === 2) sc += 40;
      sc += (elems.get(c.element) ?? 0) * 1.5;
      // le banc est limité : on évite d'acheter des unités faibles quand on est plein
      const distinct = new Set(units.map((u) => u.key)).size;
      if (distinct >= slots + 2 && same1 === 0 && same2 === 0) sc -= 8;
      return sc;
    };
    const order = [...shop].sort((a, b) => score(b) - score(a));
    let bought = false;
    for (const c of order) {
      const cost = TIER_COST[c.tier];
      if (gold >= cost && score(c) >= 4 && units.length < 12) {
        gold -= cost;
        units.push({ key: c.id, star: 1 });
        merge(units);
        bought = true;
      }
    }
    if (!bought) {
      if (gold >= 2 + 3) gold -= 2;
      else break;
    }
  }
  return units.sort((a, b) => power(b) - power(a)).slice(0, slots);
}

function place(units: Owned[]): UnitSpec[] {
  const melee = units.filter((u) => !RANGED.has(u.key));
  const ranged = units.filter((u) => RANGED.has(u.key));
  const front: [number, number][] = [[3, 4], [2, 4], [4, 4], [1, 4], [5, 4], [0, 4], [6, 4]];
  const back: [number, number][] = [[3, 6], [2, 6], [4, 6], [1, 6], [5, 6], [3, 5], [2, 5], [4, 5]];
  const out: UnitSpec[] = [];
  melee.forEach((u, i) => out.push({ key: u.key, star: u.star, monster: false, col: (front[i] ?? back[i])[0], row: (front[i] ?? back[i])[1] }));
  ranged.forEach((u, i) => out.push({ key: u.key, star: u.star, monster: false, col: back[i][0], row: back[i][1] }));
  return out;
}

interface Setup {
  slots: number;
  atk: number;
  hp: number;
  odds: number;
}

// Hypothèses sur un royaume « normal » à l'arrivée de chaque arène (casernes, forges, sanctuaires, académies).
const SETUP: Setup[] = [
  { slots: 4, atk: 1.0, hp: 1.0, odds: 0 },
  { slots: 5, atk: 1.06, hp: 1.1, odds: 1 },
  { slots: 6, atk: 1.12, hp: 1.18, odds: 2 },
  { slots: 7, atk: 1.2, hp: 1.28, odds: 3 },
];

// Or typique disponible en arène (après avoir construit) : faible / normal / confortable.
const BUDGETS: number[][] = [
  [18, 30, 45],
  [35, 55, 80],
  [55, 85, 120],
  [80, 120, 170],
];

const trials = Number(process.argv[2] ?? 24);
const TUNE = process.argv.includes('--tune');
const POWERS = [0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 1, 1.15, 1.3];

function winRate(a: number, budget: number, power: number, n = trials) {
  const su = SETUP[a];
  let wins = 0;
  let total = 0;
  for (let t = 0; t < n; t++) {
    const rng = new RNG(1000 + a * 97 + t * 13 + budget);
    const squad = shopBot(budget, su.odds, su.slots, rng);
    for (let k = 0; k < 3; k++) {
      const c = new Combat(place(squad), ENCOUNTERS[a].enemies.map((e) => ({ key: e.id, monster: true, star: 1, col: e.col, row: e.row, mul: power })), { atkMul: su.atk, hpMul: su.hp, relics: [] });
      while (!c.over) {
        c.step(1 / 30);
        c.events.length = 0;
      }
      total++;
      if (c.over === 'win') wins++;
    }
  }
  return wins / total;
}

if (TUNE) {
  for (let a = 0; a < ENCOUNTERS.length; a++) {
    const line = POWERS.map((p) => `×${p}: ${String(Math.round(winRate(a, BUDGETS[a][1], p) * 100)).padStart(3)}%`).join('  ');
    console.log(`Arène ${a + 1} (budget normal ${BUDGETS[a][1]}) ${line}`);
  }
  process.exit(0);
}
const rows: string[] = [];
// (le calcul détaillé ci-dessous utilise la puissance définie dans les données)
for (let a = 0; a < ENCOUNTERS.length; a++) {
  const su = SETUP[a];
  const cells: string[] = [];
  for (const budget of BUDGETS[a]) {
    let wins = 0;
    let n = 0;
    let left = 0;
    for (let t = 0; t < trials; t++) {
      const rng = new RNG(1000 + a * 97 + t * 13 + budget);
      const squad = shopBot(budget, su.odds, su.slots, rng);
      for (let k = 0; k < 3; k++) {
        const c = new Combat(place(squad), ENCOUNTERS[a].enemies.map((e) => ({ key: e.id, monster: true, star: 1, col: e.col, row: e.row, mul: ENCOUNTERS[a].power })), { atkMul: su.atk, hpMul: su.hp, relics: [] });
        while (!c.over) {
          c.step(1 / 30);
          c.events.length = 0;
        }
        n++;
        if (c.over === 'win') wins++;
        const mine = c.units.filter((u) => u.side === 0);
        left += mine.reduce((s, u) => s + u.hp, 0) / mine.reduce((s, u) => s + u.maxHp, 0);
      }
    }
    cells.push(`${String(budget).padStart(3)}or → ${String(Math.round((wins / n) * 100)).padStart(3)}% (pv ${Math.round((left / n) * 100)}%)`);
  }
  rows.push(`Arène ${a + 1} ${ENCOUNTERS[a].name.padEnd(24)} ${cells.join('   ')}`);
}
console.log('Taux de victoire du robot selon le budget (faible / normal / confortable) :');
console.log(rows.join('\n'));
