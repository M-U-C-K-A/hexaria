import type { IconName } from './types';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: IconName;
  secret?: boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'tutorial', name: 'Bon élève', desc: 'Terminer le tutoriel guidé.', icon: 'scroll' },
  { id: 'firstBuild', name: 'Premier coup de pioche', desc: 'Poser un bâtiment.', icon: 'hammer' },
  { id: 'urbaniste', name: 'Urbaniste', desc: 'Avoir 15 bâtiments dans un même royaume.', icon: 'house' },
  { id: 'voisinage', name: 'Le bon voisinage', desc: 'Poser un Hôtel des ventes à côté d’un Port.', icon: 'coins' },
  { id: 'firstWin', name: 'Baptême du feu', desc: 'Gagner une arène.', icon: 'sword' },
  { id: 'comeback', name: 'Sur le fil', desc: 'Gagner une arène avec un seul cœur restant.', icon: 'heart' },
  { id: 'dresseur', name: 'Dresseur', desc: 'Avoir 3 compagnons capturés en même temps.', icon: 'paw' },
  { id: 'collection', name: 'Collectionneur', desc: 'Posséder 5 reliques.', icon: 'crown' },
  { id: 'events', name: 'Baroudeur', desc: 'Résoudre 10 événements en une partie.', icon: 'question' },
  { id: 'hatch', name: 'Éclosion !', desc: 'Faire éclore un œuf mystérieux.', icon: 'egg' },
  { id: 'shiny', name: 'Une lueur dorée', desc: 'Obtenir une créature chromatique ✦.', icon: 'star' },
  { id: 'evolve3', name: 'Forme ultime', desc: 'Faire évoluer une créature jusqu’à ★★★.', icon: 'gem' },
  { id: 'synergy4', name: 'Puissance collective', desc: 'Lancer un combat avec une synergie à 4 créatures.', icon: 'shield' },
  { id: 'dragon', name: 'Tueur de dragon', desc: 'Vaincre Vermithrax.', icon: 'skull' },
  { id: 'flawless', name: 'Sans une égratignure', desc: 'Vaincre Vermithrax sans perdre un seul cœur.', icon: 'sun' },
  { id: 'legend', name: 'Légende vivante', desc: 'Vaincre Vermithrax en difficulté Légendaire.', icon: 'crown' },
  { id: 'adventurer', name: 'Au-delà de la légende', desc: 'Franchir 3 paliers du mode aventure.', icon: 'boot' },
  { id: 'abyss', name: 'Plus profond', desc: 'Franchir 8 paliers du mode aventure.', icon: 'moon', secret: true },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
