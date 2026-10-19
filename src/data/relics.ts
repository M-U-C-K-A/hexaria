import type { IconName } from './types';

export interface RelicDef {
  id: string;
  name: string;
  desc: string;
  icon: IconName;
  rarity: 1 | 2 | 3;
}

export const RELICS: RelicDef[] = [
  { id: 'bourse', name: 'Bourse sans fond', desc: '+20% d’or produit par vos bâtiments.', icon: 'coins', rarity: 2 },
  { id: 'corne', name: 'Corne d’abondance', desc: 'Chaque ferme produit +1 nourriture.', icon: 'food', rarity: 1 },
  { id: 'marteau', name: 'Marteau du maître', desc: 'Chaque bâtisseur fournit +1 point de construction.', icon: 'hammer', rarity: 2 },
  { id: 'cristalArdent', name: 'Cristal ardent', desc: 'Créatures Feu : +20% dégâts.', icon: 'feu', rarity: 1 },
  { id: 'ecaille', name: 'Écaille de léviathan', desc: 'Créatures Eau : +25% soins prodigués.', icon: 'eau', rarity: 1 },
  { id: 'totem', name: 'Totem de mousse', desc: 'Créatures Plante : +20% PV.', icon: 'plante', rarity: 1 },
  { id: 'pierreTonnerre', name: 'Pierre-tonnerre', desc: 'Créatures Foudre : +20% vitesse d’attaque.', icon: 'foudre', rarity: 1 },
  { id: 'coeurGolem', name: 'Cœur de golem', desc: 'Créatures Roche : +10% réduction de dégâts.', icon: 'roche', rarity: 1 },
  { id: 'lameSpectrale', name: 'Lame spectrale', desc: 'Créatures Ombre : +20% critique.', icon: 'ombre', rarity: 1 },
  { id: 'banniere', name: 'Bannière de guerre', desc: '+1 créature sur le plateau d’arène.', icon: 'banner', rarity: 3 },
  { id: 'de', name: 'Dé du destin', desc: '+3 rafraîchissements gratuits par arène.', icon: 'die', rarity: 1 },
  { id: 'amulette', name: 'Amulette de givre', desc: 'Les ennemis sont ralentis de 30% pendant les 6 premières secondes.', icon: 'snow', rarity: 2 },
  { id: 'parchemin', name: 'Parchemin d’érudit', desc: 'Boutique d’arène : chances de créatures rares améliorées.', icon: 'scroll', rarity: 2 },
  { id: 'couronne', name: 'Couronne du conquérant', desc: '+15 or de récompense à chaque victoire d’arène.', icon: 'crown', rarity: 2 },
  { id: 'potion', name: 'Élixir de vigueur', desc: 'Vos créatures commencent le combat avec 30% de mana.', icon: 'potion', rarity: 2 },
  { id: 'oeil', name: 'Œil du stratège', desc: '+30 secondes de préparation en arène et +8 or d’arène.', icon: 'eye', rarity: 1 },
  { id: 'sablier', name: 'Sablier de bronze', desc: 'Les œufs éclosent deux fois plus vite.', icon: 'clock', rarity: 2 },
  { id: 'graine', name: 'Graine d’Yggdrasil', desc: 'Les chances de créature chromatique ✦ sont doublées (œufs, boutique, repaires).', icon: 'leaf', rarity: 3 },
  { id: 'epee', name: 'Épée du dresseur', desc: '+1 emplacement de compagnon.', icon: 'sword', rarity: 3 },
  { id: 'bouclierAube', name: 'Bouclier de l’aube', desc: 'Vos créatures commencent le combat avec un bouclier de 12 % de leurs PV max.', icon: 'shield', rarity: 2 },
  { id: 'compas', name: 'Compas des cartographes', desc: 'Votre territoire révèle les terres jusqu’à 3 cases au lieu de 2.', icon: 'flag', rarity: 1 },
  { id: 'sceauVampire', name: 'Sceau du vampire', desc: 'Vos créatures volent 8 % des dégâts infligés en PV.', icon: 'moon', rarity: 2 },
];

export const RELIC_BY_ID: Record<string, RelicDef> = Object.fromEntries(RELICS.map((r) => [r.id, r]));
