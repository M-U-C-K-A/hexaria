import type { Res } from './types';

export type Difficulty = 'apprenti' | 'normal' | 'legendaire';

export interface DifficultyDef {
  id: Difficulty;
  name: string;
  tag: string;
  desc: string;
  hearts: number;
  res: Res & { gold: number; wood: number; stone: number; food: number };
  villagers: number;
  power: number; // multiplie PV, attaque et sorts des monstres
  reward: number; // multiplie l'or de victoire d'arène
}

export const DIFFICULTIES: DifficultyDef[] = [
  {
    id: 'apprenti', name: 'Apprenti', tag: 'Pour découvrir',
    desc: '4 cœurs, un royaume mieux doté au départ, monstres plus fragiles (−15 %) et récompenses +25 %.',
    hearts: 4, res: { gold: 25, wood: 28, stone: 12, food: 14 }, villagers: 4, power: 0.85, reward: 1.25,
  },
  {
    id: 'normal', name: 'Chevalier', tag: 'L’expérience prévue',
    desc: '3 cœurs et des arènes calibrées pour une difficulté qui monte régulièrement.',
    hearts: 3, res: { gold: 15, wood: 20, stone: 8, food: 10 }, villagers: 3, power: 1, reward: 1,
  },
  {
    id: 'legendaire', name: 'Légendaire', tag: 'Pour les stratèges',
    desc: '2 cœurs seulement, départ modeste, monstres plus redoutables (+18 %) et récompenses −10 %.',
    hearts: 2, res: { gold: 12, wood: 16, stone: 6, food: 8 }, villagers: 3, power: 1.18, reward: 0.9,
  },
];

export const DIFFICULTY_BY_ID: Record<Difficulty, DifficultyDef> = Object.fromEntries(DIFFICULTIES.map((d) => [d.id, d])) as Record<Difficulty, DifficultyDef>;
