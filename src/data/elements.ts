import type { Element } from './types';

export interface ElementInfo {
  name: string;
  color: string;
  glow: string;
  dark: string;
}

export const ELEMENTS: Record<Element, ElementInfo> = {
  feu: { name: 'Feu', color: '#ff7a3d', glow: '#ffb35c', dark: '#7a2410' },
  eau: { name: 'Eau', color: '#3fa9f5', glow: '#8fd8ff', dark: '#123f6b' },
  plante: { name: 'Plante', color: '#5ad16a', glow: '#a6ff8a', dark: '#1d5a2a' },
  foudre: { name: 'Foudre', color: '#f5d33f', glow: '#fff3a0', dark: '#6b5410' },
  roche: { name: 'Roche', color: '#c49a6c', glow: '#f0d2a8', dark: '#5a4128' },
  ombre: { name: 'Ombre', color: '#a070ff', glow: '#d2b8ff', dark: '#33195e' },
};

export const ELEMENT_LIST: Element[] = ['feu', 'eau', 'plante', 'foudre', 'roche', 'ombre'];

// Table des types façon Pokémon : attaquant -> défenseurs contre lesquels il est super efficace.
const STRONG: Record<Element, Element[]> = {
  feu: ['plante'],
  eau: ['feu', 'roche'],
  plante: ['eau', 'roche'],
  foudre: ['eau'],
  roche: ['feu', 'foudre'],
  ombre: ['ombre'],
};

export const SUPER = 1.5;
export const WEAK = 0.7;

export function typeMultiplier(att: Element, def: Element): number {
  if (STRONG[att].includes(def)) return SUPER;
  if (STRONG[def].includes(att) && att !== def) return WEAK;
  return 1;
}

export function strongAgainst(att: Element): Element[] {
  return STRONG[att];
}

export function weakAgainst(def: Element): Element[] {
  return ELEMENT_LIST.filter((e) => STRONG[e].includes(def));
}

// Synergies d'équipe (comptées sur les créatures distinctes posées sur le plateau).
export interface SynergyTier {
  count: number;
  desc: string;
  value: number;
}

export const SYNERGIES: Record<Element, { title: string; tiers: SynergyTier[] }> = {
  feu: {
    title: 'Brasier',
    tiers: [
      { count: 2, desc: '+15% dégâts, les attaques brûlent', value: 0.15 },
      { count: 4, desc: '+35% dégâts, brûlure renforcée', value: 0.35 },
    ],
  },
  eau: {
    title: 'Marée',
    tiers: [
      { count: 2, desc: 'Soigne l’équipe de 4% PV max toutes les 3 s', value: 0.04 },
      { count: 4, desc: 'Soigne l’équipe de 8% PV max toutes les 3 s', value: 0.08 },
    ],
  },
  plante: {
    title: 'Sylve',
    tiers: [
      { count: 2, desc: '+20% PV max', value: 0.2 },
      { count: 4, desc: '+45% PV max', value: 0.45 },
    ],
  },
  foudre: {
    title: 'Orage',
    tiers: [
      { count: 2, desc: '+20% vitesse d’attaque', value: 0.2 },
      { count: 4, desc: '+45% vitesse d’attaque', value: 0.45 },
    ],
  },
  roche: {
    title: 'Rempart',
    tiers: [
      { count: 2, desc: '+15% réduction de dégâts', value: 0.15 },
      { count: 4, desc: '+30% réduction de dégâts', value: 0.3 },
    ],
  },
  ombre: {
    title: 'Crépuscule',
    tiers: [
      { count: 2, desc: '15% vol de vie, 15% critique', value: 0.15 },
      { count: 4, desc: '30% vol de vie, 30% critique', value: 0.3 },
    ],
  },
};

export function activeTier(el: Element, count: number): SynergyTier | null {
  const tiers = SYNERGIES[el].tiers;
  let best: SynergyTier | null = null;
  for (const t of tiers) if (count >= t.count) best = t;
  return best;
}
