declare global {
  const __BUILD_DATE__: string;
}

export type SpeciesName = 'メダカ' | 'カエル' | 'ドジョウ';

export interface SpeciesData {
  y: number; // 基礎収穫力
  d: number; // 基礎回避率
}

// [特性名, 回避補正, 収穫補正, 説明]
export type Trait = [string, number, number, string];

export interface Creature {
  id: number;
  n: string;
  sp: SpeciesName;
  age: number;
  g: Trait[];
  b: Trait;
  lv: number;
  db: number;
  yb: number;
  yrs: number;
}

export interface ShopItem {
  k: string;
  n: string;
  d: string;
  p: number;
}

export type SkyPalette = [string, string];

export type GoalType = '守る' | '増やす' | '稼ぐ';

export type GamePhase = 'play' | 'winter';

export interface DeadRecord {
  n: string;
  sp: SpeciesName;
  lv: number;
}

export interface HarvestResult {
  r: number;
  g: '大豊作' | '不作' | '平年作';
  a: number;
  b: number;
  c: number;
  gm: string;
}

export interface OwnItems {
  field?: number;
  net?: number;
  hide?: number;
  eye?: number;
  seed?: number;
  [key: string]: number | undefined;
}

export interface GameState {
  ver: number;
  y: number;
  h: number;
  w: number;
  money: number;
  nut: number;
  water: number;
  own: OwnItems;
  cr: Creature[];
  log: string[];
  dead: DeadRecord[];
  memo: string[];
  dex: SpeciesName[];
  tc: number;
  wc: number;
  hm: number;
  goal: GoalType | null;
  startN: number;
  id: number;
  phase: GamePhase;
  last: HarvestResult | null;
  seen: number;
}

export interface Option {
  l: string;
  h: string;
  k: 't' | 'w';
  dis?: boolean;
  run?: () => Promise<void>;
}

export interface Scene {
  t: string;
  x: string;
  c?: Creature;
  o: Option[];
}

export interface CreatureMove {
  x: number;
  y: number;
  tx: number;
  ty: number;
  d: number;
}
