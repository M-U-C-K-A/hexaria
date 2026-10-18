import type { Feature, Terrain } from './types';

export interface TerrainInfo {
  name: string;
  elev: number;
  top: string;
  top2: string;
  side: string;
  land: boolean;
  desc: string;
}

export const TERRAINS: Record<Terrain, TerrainInfo> = {
  ocean: { name: 'Océan', elev: 0, top: '#0b2f3a', top2: '#082430', side: '#051a22', land: false, desc: 'Eaux profondes et sombres.' },
  shallow: { name: 'Littoral', elev: 0.25, top: '#17565a', top2: '#124a4f', side: '#0b3236', land: false, desc: 'Eaux peu profondes. Un port peut s’y adosser.' },
  beach: { name: 'Grève', elev: 0.7, top: '#6f6a4a', top2: '#5d5a3e', side: '#3b3a28', land: true, desc: 'Sable pâle et galets.' },
  plains: { name: 'Prairie', elev: 1, top: '#2f6a42', top2: '#285c39', side: '#1b3a28', land: true, desc: 'Terres fertiles : fermes, maisons, marchés.' },
  forest: { name: 'Forêt', elev: 1.05, top: '#1f4d35', top2: '#1a432e', side: '#12301f', land: true, desc: 'Bois abondant pour les scieries.' },
  grove: { name: 'Bosquet lumineux', elev: 1.05, top: '#1c4a44', top2: '#173f3a', side: '#0f2d29', land: true, desc: 'Champignons luminescents. Renforce les sanctuaires.' },
  hills: { name: 'Collines', elev: 1.7, top: '#4d6440', top2: '#435937', side: '#2c3a25', land: true, desc: 'Pierre et parfois de l’or.' },
  mountain: { name: 'Montagne', elev: 2.6, top: '#4f5866', top2: '#444c59', side: '#2b313b', land: true, desc: 'Roche dure. Les mines y prospèrent.' },
};

export const FEATURES: Record<Feature, { name: string; desc: string }> = {
  goldVein: { name: 'Filon d’or', desc: 'Une mine ici rapporte +3 or.' },
  crystals: { name: 'Cristaux d’ambre', desc: 'Une mine ici rapporte +5 or.' },
  fish: { name: 'Banc de poissons', desc: 'Un port adjacent gagne +2 nourriture.' },
  ruins: { name: 'Ruines anciennes', desc: 'Explorez-les pour un événement.' },
  lair: { name: 'Repaire sauvage', desc: 'Une créature rôde. Tentez de la capturer.' },
};
