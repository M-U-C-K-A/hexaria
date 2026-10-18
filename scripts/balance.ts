// Simulation headless des arènes pour équilibrer les monstres : npx tsx scripts/balance.ts
import { Combat, type UnitSpec } from '../src/game/combat';
import { ENCOUNTERS } from '../src/data/creatures';

type Comp = { name: string; units: [string, number][]; atk: number; hp: number };

const SPOTS: [number, number][] = [[3, 4], [2, 4], [4, 4], [1, 5], [5, 5], [3, 5], [2, 6], [4, 6]];
const RANGED = new Set(['flammeche', 'goutelle', 'mycelor', 'griffon', 'phenix', 'dryade', 'hydrelle']);

function place(units: [string, number][]): UnitSpec[] {
  const melee = units.filter(([k]) => !RANGED.has(k));
  const ranged = units.filter(([k]) => RANGED.has(k));
  const front: [number, number][] = [[3, 4], [2, 4], [4, 4], [1, 4], [5, 4], [0, 4], [6, 4]];
  const back: [number, number][] = [[3, 6], [2, 6], [4, 6], [1, 6], [5, 6], [3, 5], [2, 5]];
  const out: UnitSpec[] = [];
  melee.forEach(([k, s], i) => out.push({ key: k, star: s, monster: false, col: front[i][0], row: front[i][1] }));
  ranged.forEach(([k, s], i) => out.push({ key: k, star: s, monster: false, col: back[i][0], row: back[i][1] }));
  return out;
}
void SPOTS;

function run(idx: number, comp: Comp, n = 60) {
  const enc = ENCOUNTERS[idx];
  let wins = 0;
  let time = 0;
  let foeLeft = 0;
  let mineLeft = 0;
  for (let i = 0; i < n; i++) {
    const c = new Combat(place(comp.units), enc.enemies.map((e) => ({ key: e.id, monster: true, star: 1, col: e.col, row: e.row })), { atkMul: comp.atk, hpMul: comp.hp, relics: [] });
    while (!c.over) { c.step(1 / 30); c.events.length = 0; }
    if (c.over === 'win') wins++;
    time += c.time;
    const foes = c.units.filter((u) => u.side === 1);
    foeLeft += foes.reduce((s, u) => s + u.hp, 0) / foes.reduce((s, u) => s + u.maxHp, 0);
    const mine = c.units.filter((u) => u.side === 0);
    mineLeft += mine.reduce((s, u) => s + u.hp, 0) / mine.reduce((s, u) => s + u.maxHp, 0);
  }
  console.log(`  ${comp.name.padEnd(34)} win ${(wins / n * 100).toFixed(0).padStart(3)}%  t=${(time / n).toFixed(1)}s  foe ${(foeLeft / n * 100).toFixed(0)}%  mine ${(mineLeft / n * 100).toFixed(0)}%`);
}

const plan: Record<number, Comp[]> = {
  0: [
    { name: '4×T1 ★1 (eau/plante/roche)', units: [['goutelle', 1], ['goutelle', 1], ['bourgeon', 1], ['galet', 1]], atk: 1, hp: 1 },
    { name: '4×T1 ★1 feu/foudre', units: [['flammeche', 1], ['etincelle', 1], ['galet', 1], ['bourgeon', 1]], atk: 1, hp: 1 },
    { name: '1★2 + 3★1', units: [['flammeche', 2], ['etincelle', 1], ['galet', 1], ['bourgeon', 1]], atk: 1, hp: 1 },
    { name: '5 slots 1★2 + 4★1', units: [['flammeche', 2], ['flammeche', 1], ['etincelle', 1], ['galet', 1], ['bourgeon', 1]], atk: 1, hp: 1 },
  ],
  1: [
    { name: '5: 1★2 + T2s', units: [['flammeche', 2], ['salamandre', 1], ['galet', 1], ['bourgeon', 1], ['mycelor', 1]], atk: 1, hp: 1 },
    { name: '5: 2★2 eau/plante (+forge)', units: [['goutelle', 2], ['bourgeon', 2], ['carapix', 1], ['mycelor', 1], ['galet', 1]], atk: 1.1, hp: 1 },
    { name: '6: 2★2 mixed (+forge,+shrine)', units: [['flammeche', 2], ['galet', 2], ['carapix', 1], ['mycelor', 1], ['etincelle', 1], ['ombrelin', 1]], atk: 1.1, hp: 1.12 },
  ],
  2: [
    { name: '6: 2★2 + T3', units: [['etincelle', 2], ['bourgeon', 2], ['griffon', 1], ['mycelor', 1], ['galet', 1], ['flammeche', 1]], atk: 1.1, hp: 1.12 },
    { name: '6: 3★2 plante/foudre (+bonus)', units: [['etincelle', 2], ['bourgeon', 2], ['mycelor', 2], ['griffon', 1], ['dryade', 1], ['galet', 1]], atk: 1.15, hp: 1.2 },
    { name: '7: 3★2 + T3/T4', units: [['etincelle', 2], ['bourgeon', 2], ['mycelor', 2], ['griffon', 1], ['dryade', 1], ['cristallon', 1], ['salamandre', 1]], atk: 1.2, hp: 1.25 },
  ],
  3: [
    { name: '7: 3★2 + T3/T4', units: [['galet', 2], ['carapix', 2], ['goutelle', 2], ['hydrelle', 1], ['cristallon', 1], ['griffon', 1], ['ombrelin', 1]], atk: 1.2, hp: 1.25 },
    { name: '7: 4★2 + ★3 (+bonus)', units: [['galet', 3], ['carapix', 2], ['goutelle', 2], ['hydrelle', 1], ['cristallon', 2], ['faucheur', 1], ['ombrelin', 2]], atk: 1.25, hp: 1.3 },
    { name: '8: strong', units: [['galet', 3], ['carapix', 2], ['goutelle', 2], ['hydrelle', 2], ['cristallon', 2], ['faucheur', 2], ['ombrelin', 2], ['griffon', 1]], atk: 1.3, hp: 1.35 },
  ],
};

for (const [idx, comps] of Object.entries(plan)) {
  console.log(`Arène ${+idx + 1} — ${ENCOUNTERS[+idx].name}`);
  for (const c of comps) run(+idx, c);
}
