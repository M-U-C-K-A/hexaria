export type Element = 'feu' | 'eau' | 'plante' | 'foudre' | 'roche' | 'ombre';

export type Terrain = 'ocean' | 'shallow' | 'beach' | 'plains' | 'forest' | 'grove' | 'hills' | 'mountain';

export type Feature = 'goldVein' | 'crystals' | 'fish' | 'ruins' | 'lair';

export type ResKey = 'gold' | 'wood' | 'stone' | 'food';

export type Res = Partial<Record<ResKey, number>>;

export type BuildingId =
  | 'townhall'
  | 'colosseum'
  | 'house'
  | 'farm'
  | 'lumber'
  | 'quarry'
  | 'mine'
  | 'port'
  | 'market'
  | 'auction'
  | 'tavern'
  | 'barracks'
  | 'forge'
  | 'shrine'
  | 'academy'
  | 'menagerie';

export type IconName =
  | 'gold' | 'wood' | 'stone' | 'food' | 'pop' | 'hammer' | 'heart' | 'sword' | 'shield' | 'skull'
  | 'question' | 'feu' | 'eau' | 'plante' | 'foudre' | 'roche' | 'ombre' | 'gem' | 'die' | 'egg'
  | 'banner' | 'snow' | 'scroll' | 'crown' | 'eye' | 'potion' | 'star' | 'house' | 'flag' | 'clock'
  | 'refresh' | 'lock' | 'paw' | 'anvil' | 'tower' | 'coins' | 'leaf' | 'boot' | 'moon' | 'sun' | 'turn';
