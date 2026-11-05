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

// 乱数関数型 (0以上1未満を返す)
export type Rng = () => number;

// 解放アイテムの種別・売る場所（将来の拡張用）
export type ItemType = '消耗' | '期限付き' | '永続';
export type ShopType = '常設' | '年度末';

export interface UnlockItemDef {
  k: string;
  n: string;
  d: string;
  p: number | ((s: GameState) => number);
  kind?: ItemType;
  shop?: ShopType;
  years?: number;
  condition?: (s: GameState) => boolean;
  maxCount?: number;
  apply: (s: GameState) => void;
}

// 既存互換型エイリアス
export type ShopItem = UnlockItemDef;

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

// 時計・時間駆動用型
export type SeasonName = '春' | '夏' | '秋' | '冬';

export interface ScheduledEvent {
  id: string;         // 場面ID または 出来事ID
  ratio: number;      // 半期内の発生時刻の割合 (0〜1)
  triggered: boolean; // 発火済みか
  isWatch?: boolean;  // 眺める出来事か (時間を止めない)
}

export interface ClockState {
  elapsedSec: number;        // 現在の半期内の経過秒
  totalSec: number;          // 現在の半期の合計秒
  paused: boolean;           // 一時停止中か
  speed: number;             // 倍速 (1 or 2)
  events: ScheduledEvent[];  // 予定場面・出来事リスト
  activeSceneId?: string;    // 場面実行中の場合の場面ID
}

// 設定 (フェーズ2B追加: 音設定)
export interface SettingsState {
  sound: boolean;
}

export interface GameState {
  schemaVersion: number;
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
  clock?: ClockState;
  settings?: SettingsState; // フェーズ2Bで追加 (セーブv4)
  [key: string]: any;       // 未知の項目を保持
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

// 場面定義の型
export type Season = '春夏' | '秋冬';

export type Outcome = {
  text?: string;
  effect?: (s: GameState, rng: Rng) => void | Promise<void>;
};

export interface ChoiceDef {
  id: string;
  kind: 'care' | 'wild' | 'other';
  label: string;
  preview?: string;
  disabled?: (s: GameState) => boolean;
  disabledReason?: string;
  resolve: (s: GameState, rng: Rng, target?: Creature) => Outcome | Promise<void> | void;
}

export interface SceneDef {
  id: string;
  title: string | ((s: GameState, target?: Creature) => string);
  description: string | ((s: GameState, target?: Creature) => string);
  seasons: Season[] | SeasonName[]; // 季節名での個別指定も許容
  when: (s: GameState) => boolean;
  weight: number | ((s: GameState) => number);
  tags?: string[];
  selectTarget?: (s: GameState, rng: Rng) => Creature | undefined;
  choices: ChoiceDef[];
  onWatch?: (s: GameState, rng: Rng) => Promise<void> | void;
  sound?: string; // 任意の効果音キー
}

// 眺める出来事の型 (フェーズ2B追加)
export interface WatchEventDef {
  id: string;
  title: string;
  text: string;
  season: SeasonName;
  apply: (s: GameState, rng: Rng) => void;
  sound?: string;
}

// 進化定義の型
export type EvoTiming = '変身' | '年明け';

export type EvoCondition = (c: Creature, s: GameState) => boolean;

export interface EvoRule {
  id: string;
  from: SpeciesName | '*';
  at: EvoTiming;
  cond: EvoCondition[];
  to?: SpeciesName;
  priority?: 'hidden' | 'normal' | 'default';
  apply?: (c: Creature, s: GameState) => void;
  message?: string;
  hidden?: boolean;
  hint?: string;
}
