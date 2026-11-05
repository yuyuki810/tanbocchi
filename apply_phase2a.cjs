// apply_phase2a.cjs
const fs = require('fs');
const path = require('path');

const targetDir = path.basename(process.cwd()) === 'tanbocchi'
  ? process.cwd()
  : path.join(process.cwd(), 'tanbocchi');

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeFile(relPath, content) {
  const fullPath = path.join(targetDir, relPath);
  ensureDir(fullPath);
  fs.writeFileSync(fullPath, content.trimStart(), 'utf8');
  console.log('Updated: ' + relPath);
}

console.log('Writing Phase 2A files into: ' + targetDir);

const files = {
  "src/data/timing.ts": `export const SEASON_SECONDS = {
  春: 225,
  夏: 225,
  秋: 225,
  冬: 225,
}; // 1年=900秒(15分)

export const SPEEDS = [1, 2] as const;
export const MAX_FRAME_MS = 250;
`,

  "src/data/sky.ts": `import { SkyPalette, SeasonName } from '../types';

export const SKY: SkyPalette[] = [
  ['#bfe3ee', '#f1f1dc'], // 0: 春
  ['#8fd0ee', '#e9f4e0'], // 1: 夏
  ['#f2c98f', '#f7e8c4'], // 2: 秋
  ['#b9c6cc', '#e4e8e6'], // 3: 冬
];

const SEASON_INDEX: Record<SeasonName, number> = {
  春: 0,
  夏: 1,
  秋: 2,
  冬: 3,
};

function parseHex(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  return [
    parseInt(c.substring(0, 2), 16),
    parseInt(c.substring(2, 4), 16),
    parseInt(c.substring(4, 6), 16),
  ];
}

function toHex(rgb: [number, number, number]): string {
  return '#' + rgb.map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');
}

export function lerpColor(c1: string, c2: string, t: number): string {
  const clampedT = Math.max(0, Math.min(1, t));
  const a = parseHex(c1);
  const b = parseHex(c2);
  const r = a[0] + (b[0] - a[0]) * clampedT;
  const g = a[1] + (b[1] - a[1]) * clampedT;
  const bl = a[2] + (b[2] - a[2]) * clampedT;
  return toHex([r, g, bl]);
}

/**
 * 季節名と季節内の進捗率 (0〜1) から滑らかにブレンドされた空色パレットを計算する
 */
export function getInterpolatedSky(season: SeasonName, progress: number): SkyPalette {
  const currentIdx = SEASON_INDEX[season];
  const nextIdx = (currentIdx + 1) % 4;
  const currentPalette = SKY[currentIdx];
  const nextPalette = SKY[nextIdx];

  const s1 = lerpColor(currentPalette[0], nextPalette[0], progress);
  const s2 = lerpColor(currentPalette[1], nextPalette[1], progress);
  return [s1, s2];
}
`,

  "src/types.ts": `declare global {
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

// 時計・時間駆動用型（フェーズ2A追加）
export type SeasonName = '春' | '夏' | '秋' | '冬';

export interface ScheduledEvent {
  id: string;         // 場面ID
  ratio: number;      // 半期内の発生時刻の割合 (0〜1)
  triggered: boolean; // 発火済みか
}

export interface ClockState {
  elapsedSec: number;        // 現在の半期内の経過秒
  totalSec: number;          // 現在の半期の合計秒
  paused: boolean;           // 一時停止中か
  speed: number;             // 倍速 (1 or 2)
  events: ScheduledEvent[];  // 予定場面リスト
  activeSceneId?: string;    // 場面実行中の場合の場面ID
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
  clock?: ClockState; // フェーズ2Aで追加 (セーブv3)
  [key: string]: any; // 未知の項目を保持
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

// 場面定義の型（指示書 3.1 準拠）
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
  seasons: Season[];
  when: (s: GameState) => boolean;
  weight: number | ((s: GameState) => number);
  tags?: string[]; // 例: 'predator', 'weather', 'disease' (ベータ5用余地)
  selectTarget?: (s: GameState, rng: Rng) => Creature | undefined;
  choices: ChoiceDef[];
  // 選択肢が空（choices: []）の眺める場面用のコールバック
  onWatch?: (s: GameState, rng: Rng) => Promise<void> | void;
}

// 進化定義の型（指示書 3.3 準拠）
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
`,

  "src/game/clock.ts": `import { ClockState, ScheduledEvent, SeasonName, GameState } from '../types';
import { SEASON_SECONDS, MAX_FRAME_MS } from '../data/timing';
import { plan } from './scenes';

/**
 * URLクエリパラメータからデバッグ倍速 (?speed=N) を取得する (1〜20)
 * セーブデータには保存しない
 */
export function getDebugSpeedMultiplier(): number {
  if (typeof window !== 'undefined' && window.location && window.location.search) {
    try {
      const params = new URLSearchParams(window.location.search);
      const val = parseInt(params.get('speed') || '', 10);
      if (!isNaN(val) && val >= 1 && val <= 20) {
        return val;
      }
    } catch {}
  }
  return 1;
}

/**
 * 現在の半期の合計秒数を取得する
 * 春夏 (h=0): 春 + 夏
 * 秋冬 (h=1): 秋 + 冬
 */
export function getHalfTotalSec(
  h: number,
  seasonSec: Record<SeasonName, number> = SEASON_SECONDS
): number {
  return h === 0 ? seasonSec.春 + seasonSec.夏 : seasonSec.秋 + seasonSec.冬;
}

/**
 * 旧位置 [2, 5, 7] または [9, 11] から半期内の時刻割合 (0〜1) への対応表
 * 春夏 (h=0, 全8週): 2->0.25, 5->0.625, 7->0.875
 * 秋冬 (h=1, 全4週): 9->0.25, 11->0.75
 */
export const POSITION_TO_RATIO_MAP: Record<number, number> = {
  2: 0.25,
  5: 0.625,
  7: 0.875,
  9: 0.25,
  11: 0.75,
};

/**
 * 半期の開始時に予定場面リストを生成する
 * 乱数消費順は既存の plan(h) と完全に同一
 */
export function createScheduledEvents(
  h: number,
  planMap: Record<number, string>
): ScheduledEvent[] {
  const positions = Object.keys(planMap)
    .map(Number)
    .sort((a, b) => a - b);

  return positions.map((pos) => ({
    id: planMap[pos],
    ratio: POSITION_TO_RATIO_MAP[pos] ?? 0.5,
    triggered: false,
  }));
}

/**
 * 半期開始時の新しい ClockState を作成する
 */
export function initClockState(
  h: number,
  planMap: Record<number, string>,
  seasonSec: Record<SeasonName, number> = SEASON_SECONDS,
  paused = false,
  speed = 1
): ClockState {
  return {
    elapsedSec: 0,
    totalSec: getHalfTotalSec(h, seasonSec),
    paused,
    speed,
    events: createScheduledEvents(h, planMap),
  };
}

/**
 * 現在の季節名と進行割合を計算する
 */
export function getSeasonInfo(
  h: number,
  elapsedSec: number,
  seasonSec: Record<SeasonName, number> = SEASON_SECONDS
): {
  season: SeasonName;
  seasonProgress: number; // 0〜1
  halfProgress: number;   // 0〜1
} {
  const total = getHalfTotalSec(h, seasonSec);
  const clampedElapsed = Math.max(0, Math.min(elapsedSec, total));
  const halfProgress = total > 0 ? clampedElapsed / total : 0;

  if (h === 0) {
    // 春夏
    const springSec = seasonSec.春;
    if (clampedElapsed < springSec) {
      return {
        season: '春',
        seasonProgress: springSec > 0 ? clampedElapsed / springSec : 0,
        halfProgress,
      };
    } else {
      const summerElapsed = clampedElapsed - springSec;
      const summerSec = seasonSec.夏;
      return {
        season: '夏',
        seasonProgress: summerSec > 0 ? Math.min(1, summerElapsed / summerSec) : 1,
        halfProgress,
      };
    }
  } else {
    // 秋冬
    const autumnSec = seasonSec.秋;
    if (clampedElapsed < autumnSec) {
      return {
        season: '秋',
        seasonProgress: autumnSec > 0 ? clampedElapsed / autumnSec : 0,
        halfProgress,
      };
    } else {
      const winterElapsed = clampedElapsed - autumnSec;
      const winterSec = seasonSec.冬;
      return {
        season: '冬',
        seasonProgress: winterSec > 0 ? Math.min(1, winterElapsed / winterSec) : 1,
        halfProgress,
      };
    }
  }
}

export interface AdvanceResult {
  deltaSec: number;
  firedEvent?: ScheduledEvent;
  completed: boolean;
  season: SeasonName;
  seasonProgress: number;
  halfProgress: number;
}

/**
 * 時計を進める（純粋関数的ロジック）
 * 画面フレームやテストから呼ばれる
 */
export function advanceClock(
  clock: ClockState,
  h: number,
  dtMs: number,
  seasonSec: Record<SeasonName, number> = SEASON_SECONDS,
  debugMultiplier = 1
): AdvanceResult {
  // 一時停止中なら進まない
  if (clock.paused) {
    const info = getSeasonInfo(h, clock.elapsedSec, seasonSec);
    return {
      deltaSec: 0,
      completed: clock.elapsedSec >= clock.totalSec,
      ...info,
    };
  }

  // 最大フレーム幅に切り詰め (巨大な時間差の無視)
  const clampedDtMs = Math.max(0, Math.min(dtMs, MAX_FRAME_MS));
  const effectiveSpeed = clock.speed * Math.max(1, debugMultiplier);
  const deltaSec = (clampedDtMs / 1000) * effectiveSpeed;

  clock.elapsedSec = Math.min(clock.totalSec, clock.elapsedSec + deltaSec);
  const info = getSeasonInfo(h, clock.elapsedSec, seasonSec);

  // 場面の発火チェック (未発火かつ発生時刻に達したもの)
  let firedEvent: ScheduledEvent | undefined;
  for (const evt of clock.events) {
    if (!evt.triggered && info.halfProgress >= evt.ratio) {
      evt.triggered = true;
      clock.paused = true; // 場面発生で時計を一時停止
      firedEvent = evt;
      clock.activeSceneId = evt.id;
      break; // 1回に進める場面は1つ
    }
  }

  const completed = clock.elapsedSec >= clock.totalSec;
  if (completed) {
    clock.paused = true;
  }

  return {
    deltaSec,
    firedEvent,
    completed,
    ...info,
  };
}
`,

  "src/game/state.ts": `import { GameState, SpeciesName, Rng, ClockState } from '../types';
import { GOOD, BAD, NM } from '../data/traits';
import { pick, random } from './calc';
import { SEASON_SECONDS } from '../data/timing';
import { getHalfTotalSec } from './clock';

export const SAVE_KEY = 'tanbocchi';
export const CURRENT_SCHEMA_VERSION = 3;
export const SAVE_VERSION = CURRENT_SCHEMA_VERSION;

export let S: GameState;
export let PREV = '';
export let busy = false;
export let rsf = false;

export function setS(newS: GameState): void {
  S = newS;
}

export function setPREV(val: string): void {
  PREV = val;
}

export function setBusy(val: boolean): void {
  busy = val;
}

export function setRsf(val: boolean): void {
  rsf = val;
}

/**
 * 新しいセーブ項目を足す手順:
 * 1. src/types.ts の GameState 型に新項目を追加する（オプショナル、または既定値を用意）
 * 2. このファイルの migrations オブジェクトに移行関数を追加する
 * 3. CURRENT_SCHEMA_VERSION を 1 増やす
 * 4. tests/save.test.ts に移行テストを追加する
 */
type MigrationFn = (oldData: any) => any;

export const migrations: Record<number, MigrationFn> = {
  // v1 (ベータ3) -> v2 (ベータ4 フェーズ1: データ駆動化)
  1: (v1: any): any => {
    return {
      ...v1,
      schemaVersion: 2,
      ver: 2,
    };
  },
  // v2 -> v3 (ベータ4 フェーズ2A: 時間駆動・時計)
  2: (v2: any): any => {
    const h = v2.h ?? 0;
    const totalSec = getHalfTotalSec(h, SEASON_SECONDS);
    return {
      ...v2,
      schemaVersion: 3,
      ver: 3,
      clock: v2.clock ?? {
        elapsedSec: 0,
        totalSec,
        paused: true, // 読み込み時は一時停止から再開
        speed: 1,
        events: [],
      },
    };
  },
};

export function migrate(raw: any): GameState | null {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.cr)) {
    return null;
  }

  let data = { ...raw };
  let currentVer = data.schemaVersion ?? data.ver ?? 1;

  if (typeof currentVer !== 'number' || currentVer < 1) {
    return null;
  }

  // バージョンごとの変換の連鎖
  while (currentVer < CURRENT_SCHEMA_VERSION) {
    const migrationFn = migrations[currentVer];
    if (!migrationFn) {
      return null;
    }
    try {
      data = migrationFn(data);
      currentVer = data.schemaVersion ?? data.ver ?? currentVer + 1;
    } catch {
      return null;
    }
  }

  // 最低限の必須項目の健全性チェック
  if (!Array.isArray(data.cr) || typeof data.y !== 'number') {
    return null;
  }

  // 復帰時は常に一時停止の状態で読み込む (指示書 3.4)
  if (data.clock) {
    data.clock.paused = true;
  }

  return data as GameState;
}

export function load(): GameState | null {
  try {
    const j = localStorage.getItem(SAVE_KEY);
    if (j) {
      const parsed = JSON.parse(j);
      return migrate(parsed);
    }
  } catch (e) {}
  return null;
}

export function save(): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
  } catch (e) {}
}

export function add(sp: SpeciesName, rare?: boolean, rng: Rng = random): void {
  S.cr.push({
    id: ++S.id,
    n: pick(NM, rng),
    sp,
    age: 0,
    g: rare ? [...GOOD].sort(() => rng() - 0.5).slice(0, 2) : [pick(GOOD, rng)],
    b: pick(BAD, rng),
    lv: 0,
    db: 0,
    yb: 0,
    yrs: 0,
  });
}

export function log(t: string): void {
  S.log.unshift(t);
  S.log = S.log.slice(0, 30);
}

export function fresh(): GameState {
  const totalSec = getHalfTotalSec(0, SEASON_SECONDS);
  S = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    ver: SAVE_VERSION,
    y: 1,
    h: 0,
    w: 0,
    money: 0,
    nut: 0,
    water: 1,
    own: {},
    cr: [],
    log: [],
    dead: [],
    memo: [],
    dex: ['メダカ', 'カエル'],
    tc: 0,
    wc: 0,
    hm: 0,
    goal: null,
    startN: 2,
    id: 0,
    phase: 'play',
    last: null,
    seen: 0,
    clock: {
      elapsedSec: 0,
      totalSec,
      paused: true,
      speed: 1,
      events: [],
    },
  };
  add('メダカ');
  add('カエル');
  log('春になった。2つの命が生まれた。');
  return S;
}

export function initState(): void {
  S = load() || fresh();
}
`,

  "src/game/flow.ts": `import { S, setPREV, setBusy, save, log, busy } from './state';
import { yo, R, sl, E } from './calc';
import { paint, party, RM, art } from '../view/scene';
import { ui, sheet, winterH, ask, toast, isChoosing } from '../view/ui';
import { plan, play, goalScene } from './scenes';
import { checkEvolution } from '../data/evolution';
import { initClockState, advanceClock, getDebugSpeedMultiplier, getSeasonInfo } from './clock';
import { SEASON_SECONDS } from '../data/timing';

let autoSaveTimer = 0;
let isSceneActive = false;

export function isBusyPlaying(): boolean {
  return isSceneActive;
}

/**
 * 新しい半期を開始する
 */
export async function startHalf(): Promise<void> {
  if (busy || S.phase !== 'play') return;
  setBusy(true);
  setPREV(JSON.stringify(S));
  ui();

  const h = S.h;
  if (!h && !S.goal) {
    await goalScene();
  }

  // 場面計画: 乱数消費順は変更前と完全に同一
  const pl = plan(h);

  // 時計の初期化 (開始時は動かす)
  S.clock = initClockState(h, pl, SEASON_SECONDS, false, S.clock?.speed || 1);
  syncWeekWithClock();
  paint();
  ui();
  save();
  setBusy(false);
}

/**
 * 時計の進行に合わせて S.w (週番号 0..12) を同期する (稲の成長や既存描画のため)
 */
export function syncWeekWithClock(): void {
  if (!S.clock) return;
  const progress = S.clock.totalSec > 0 ? S.clock.elapsedSec / S.clock.totalSec : 0;
  if (S.h === 0) {
    // 春夏: 0〜7週
    S.w = Math.min(7, Math.floor(progress * 8));
  } else {
    // 秋冬: 8〜11週
    S.w = Math.min(11, 8 + Math.floor(progress * 4));
  }
}

/**
 * 毎フレーム呼ばれる時計の進行ハンドラ
 */
export async function tickClock(dtMs: number): Promise<void> {
  if (S.phase !== 'play' || !S.clock || S.clock.paused || isSceneActive || isChoosing()) {
    return;
  }

  const debugMultiplier = getDebugSpeedMultiplier();
  const res = advanceClock(S.clock, S.h, dtMs, SEASON_SECONDS, debugMultiplier);

  syncWeekWithClock();

  // 10秒ごとの定期自動セーブ
  autoSaveTimer += res.deltaSec;
  if (autoSaveTimer >= 10) {
    autoSaveTimer = 0;
    save();
  }

  // 場面が発火した場合
  if (res.firedEvent) {
    isSceneActive = true;
    save();
    try {
      await play(res.firedEvent.id);
    } finally {
      isSceneActive = false;
      if (S.clock) {
        S.clock.activeSceneId = undefined;
        // 場面解決後は時計を再開する (指示書 3.2)
        S.clock.paused = false;
      }
      save();
      paint();
      ui();
    }
    return;
  }

  // 半期末に到達した場合
  if (res.completed) {
    await finishHalf();
  }
}

/**
 * 半期の終了処理
 */
export async function finishHalf(): Promise<void> {
  if (busy || S.phase !== 'play') return;
  setBusy(true);

  const h = S.h;
  const to = h ? 12 : 8;
  S.w = to;
  S.water = 1;

  S.cr.forEach((c) => {
    c.age++;
    c.lv = Math.min(9, c.lv + 1);
  });

  // 進化ルール（変身）の適用チェック
  const transformedCreatures: typeof S.cr = [];
  for (const c of S.cr) {
    const evo = checkEvolution(c, '変身', S);
    if (evo) {
      if (evo.to) c.sp = evo.to;
      if (evo.apply) evo.apply(c, S);
      transformedCreatures.push(c);
    }
  }

  if (h) {
    harvest();
    S.phase = 'winter';
    paint();
    save();
    setBusy(false);
    ui();
    return sheet(winterH());
  }

  S.h = 1;
  // 秋冬用の時計を初期化 (停止中)
  const nextPl = plan(1);
  S.clock = initClockState(1, nextPl, SEASON_SECONDS, true, S.clock?.speed || 1);
  paint();
  save();

  for (const c of transformedCreatures) {
    party();
    await ask(
      '<h2>' +
        E(c.n) +
        'が変身した!</h2><svg viewBox="-30 -18 60 36" style="width:140px;margin:0 auto">' +
        art(c) +
        '</svg><p>オタマジャクシから、立派なカエルになった。</p><button class="go" data-a="close">おめでとう</button>'
    );
  }

  log('夏が終わった。稲が実りはじめた。');
  toast('夏が終わった。稲が実りはじめた');
  setBusy(false);
  ui();
}

/**
 * 一時停止のトグル
 */
export function togglePause(): void {
  if (!S.clock || S.phase !== 'play' || isSceneActive) return;
  S.clock.paused = !S.clock.paused;
  save();
  ui();
}

/**
 * 倍速の切り替え (1x / 2x)
 */
export function toggleSpeed(): void {
  if (!S.clock) return;
  S.clock.speed = S.clock.speed === 1 ? 2 : 1;
  ui();
}

/**
 * 既存の half() 互換エントリポイント
 */
export async function half(): Promise<void> {
  if (!S.clock || S.clock.events.length === 0 || S.clock.elapsedSec >= S.clock.totalSec) {
    await startHalf();
  } else if (S.clock.paused) {
    togglePause();
  }
}

export function harvest(): void {
  const k = new Set(S.cr.map((c) => c.sp)).size;
  const a = S.cr.reduce((s, c) => s + yo(c), 0) * 3;
  const b = Math.floor(S.nut / 2);
  const c5 = k * 5;
  let r = 30 + a + b + c5;
  r *= (1 + S.hm) * (S.own.seed ? 1.15 : 1) * (S.goal === '稼ぐ' ? 1.15 : 1);
  const v = S.wc > S.tc ? 0.3 : 0.05;
  const f = 1 + R(-v, v);
  r = Math.round(r * f);
  let gm = '';
  S.money += r * 10;
  if (S.goal === '守る' && !S.dead.length) {
    S.money += 300;
    gm = 'めあて「守る」達成!誰も失わなかった。+300円';
  }
  if (S.goal === '増やす' && S.cr.length > S.startN) {
    S.money += 300;
    gm = 'めあて「増やす」達成!仲間が増えた。+300円';
  }
  if (S.goal === '稼ぐ') gm = 'めあて「稼ぐ」:収穫+15%が効いた';
  S.last = { r, g: f > 1.15 ? '大豊作' : f < 0.85 ? '不作' : '平年作', a, b, c: c5, gm };
  log('収穫:米' + r + 'kg(' + S.last.g + ')→' + r * 10 + '円');
}

export function spring(): void {
  setPREV(JSON.stringify(S));
  const tend = S.tc >= S.wc;

  // 年次進化（成長）ルールの適用
  S.cr.forEach((c) => {
    c.yrs++;
    const evo = checkEvolution(c, '年明け', S);
    if (evo && evo.apply) {
      evo.apply(c, S);
    } else {
      tend ? c.yb++ : (c.db += 3);
    }
  });

  if (S.cr.length)
    log(
      tend
        ? '手入れ寄りの一年。みんなの収穫力が少し伸びた。'
        : '野生寄りの一年。みんなの回避力が少し伸びた。'
    );
  S.y++;
  S.h = 0;
  S.w = 0;
  S.nut = Math.floor(S.nut / 2);
  S.dead = [];
  S.tc = 0;
  S.wc = 0;
  S.hm = 0;
  S.goal = null;
  S.startN = S.cr.length;
  S.water = 1;
  S.phase = 'play';

  // 春夏用の時計を初期化 (停止中)
  const pl = plan(0);
  S.clock = initClockState(0, pl, SEASON_SECONDS, true, S.clock?.speed || 1);

  log('春になった。新しい一年がはじまる。');
  save();
  paint();
  ui();
  toast('春になった。新しい一年');
}
`,

  "src/view/scene.ts": `import { Creature, CreatureMove, Rng } from '../types';
import { S, log } from '../game/state';
import { dodge, surf, tad, R, sl, E, random } from '../game/calc';
import { SKY, getInterpolatedSky } from '../data/sky';
import { toast, ask } from './ui';
import { getSeasonInfo } from '../game/clock';
import { tickClock } from '../game/flow';

const NS = 'http://www.w3.org/2000/svg';
export const RM = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-reduced-motion:reduce)').matches : false;

export const G: Record<number, SVGGElement> = {};
export const MV: Record<number, CreatureMove> = {};

let lastFrameTime = 0;

function getEl<T extends HTMLElement | SVGElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(\`Element #\${id} not found\`);
  return el as unknown as T;
}

export function art(c: Creature): string {
  if (c.sp === 'メダカ')
    return '<path d="M-17-5L-8 0-17 5Z" fill="#e9d69a"/><ellipse rx="10" ry="4.6" fill="#f3e5b0"/><circle cx="6" cy="-1" r="1.3" fill="#222"/><path d="M-2 3q3 3 6 1" stroke="#d6bf7a" fill="none"/>';
  if (c.sp === 'ドジョウ')
    return '<ellipse rx="17" ry="3.6" fill="#8c7458"/><path d="M-16 0L-25-4V4Z" fill="#7a644a"/><circle cx="12" cy="-1" r="1.2" fill="#222"/><path d="M17 1l5 3M17 2l5 0" stroke="#6b5640"/>';
  if (tad(c))
    return '<path d="M-4 0Q-12-5-17 0Q-12 5-4 0Z" fill="#55684a"/><circle r="5.2" fill="#40513a"/><circle cx="2" cy="-2" r="1.2" fill="#fff"/>';
  return '<path d="M-8 4Q-17 9-11 12M-2 6l-4 6" stroke="#4d8a3a" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse rx="11" ry="7" fill="#62a84c"/><circle cx="6" cy="-6" r="3.4" fill="#62a84c"/><circle cx="7" cy="-6.4" r="1.5" fill="#fff"/><circle cx="7.4" cy="-6.4" r=".7" fill="#222"/>';
}

export function paint(): void {
  const s = Math.min(S.w >> 2, 3);
  const wi = S.w % 4;
  const A = [26, 80, 112, 124];

  // 空色の滑らかな変化 (フェーズ2A: getInterpolatedSky)
  if (S.clock && S.phase === 'play') {
    const info = getSeasonInfo(S.h, S.clock.elapsedSec);
    const [c1, c2] = getInterpolatedSky(info.season, info.seasonProgress);
    getEl<SVGStopElement>('s1').setAttribute('stop-color', c1);
    getEl<SVGStopElement>('s2').setAttribute('stop-color', c2);
  } else {
    getEl<SVGStopElement>('s1').setAttribute('stop-color', SKY[s][0]);
    getEl<SVGStopElement>('s2').setAttribute('stop-color', SKY[s][1]);
  }

  const h0 = S.phase === 'winter' ? 12 : A[s] + ((A[Math.min(s + 1, 3)] - A[s]) * wi) / 4;
  const col = ['#8fc55b', '#58a63c', '#d6b84a', '#8b7a58'][s];
  let r = '';

  for (let i = 0; i < 36; i++) {
    const bk = i >= 18;
    const k = i % 18;
    const x = 8 + k * 20 + ((k * 7) % 9) + (bk ? 9 : 0);
    const h = h0 * (bk ? 0.72 : 1) * (0.85 + ((k * 13) % 7) / 22);
    const l = ((k * 5) % 9) - 4;
    r +=
      '<path d="M' +
      x +
      ' 262Q' +
      (x + l) +
      ' ' +
      (262 - h / 2) +
      ' ' +
      (x + l * 2) +
      ' ' +
      (262 - h) +
      '" stroke="' +
      col +
      '" stroke-width="' +
      (bk ? 1.8 : 2.6) +
      '" fill="none" stroke-linecap="round" opacity="' +
      (bk ? 0.7 : 1) +
      '"/>';
    if (s === 2 && !bk && S.phase !== 'winter') {
      r +=
        '<ellipse cx="' +
        (x + l * 2 + 3) +
        '" cy="' +
        (268 - h) +
        '" rx="2.4" ry="7" fill="#e3c35a" transform="rotate(-20 ' +
        (x + l * 2) +
        ' ' +
        (262 - h) +
        ')"/>';
    }
  }

  getEl<SVGGElement>('rice').innerHTML = r;
  const y = surf();
  getEl<SVGRectElement>('wtr').setAttribute('y', String(y));
  getEl<SVGRectElement>('wtr').setAttribute('height', String(262 - y));
  getEl<SVGPathElement>('wl').setAttribute(
    'd',
    'M0 ' + y + 'Q45 ' + (y - 3) + ' 90 ' + y + 'T180 ' + y + 'T270 ' + y + 'T360 ' + y
  );

  getEl<SVGPathElement>('hay').style.display = S.own.hide ? '' : 'none';
  getEl<SVGGElement>('bug').style.display = (s === 1 || s === 2) && S.phase === 'play' ? '' : 'none';

  getEl<SVGGElement>('tags').innerHTML = S.memo
    .slice(-6)
    .map(
      (n, i) =>
        '<g transform="translate(' +
        (30 + i * 54) +
        ' 279)"><rect x="-15" y="-9" width="30" height="14" rx="2" fill="#d9c08a"/><text y="2" font-size="8" text-anchor="middle" fill="#3b2f1c">' +
        E(n.slice(0, 3)) +
        '</text></g>'
    )
    .join('');

  sync();
}

export function sync(): void {
  for (const id in G) {
    if (!S.cr.find((c) => c.id === Number(id))) {
      G[id].remove();
      delete G[id];
      delete MV[id];
    }
  }

  S.cr.forEach((c) => {
    let g = G[c.id];
    if (!g) {
      g = document.createElementNS(NS, 'g') as SVGGElement;
      g.setAttribute('class', 'cr');
      g.dataset.id = String(c.id);
      getEl<SVGGElement>('crs').appendChild(g);
      G[c.id] = g;
    }
    const k = c.sp + String(tad(c));
    if (g.dataset.k !== k) {
      g.dataset.k = k;
      g.innerHTML = '<circle r="18" fill="transparent"/>' + art(c);
    }
  });
}

export function zn(c: Creature): [number, number] {
  const a = surf() + 16;
  const b = 252;
  return c.sp === 'ドジョウ' ? [b - 18, b] : c.sp === 'メダカ' ? [a, a + Math.max(18, (b - a) * 0.45)] : [a + 10, b - 24];
}

export function loop(t: number): void {
  if (!lastFrameTime) lastFrameTime = t;
  const dtMs = t - lastFrameTime;
  lastFrameTime = t;

  // 時間駆動の時計進行
  tickClock(dtMs);

  // 生き物の泳ぎアニメーション (一時停止中も止めない)
  for (const c of S.cr) {
    const g = G[c.id];
    if (!g) continue;
    const z = zn(c);
    let m = MV[c.id];
    if (!m) {
      m = MV[c.id] = { x: R(30, 330), y: R(z[0], z[1]), tx: R(30, 330), ty: R(z[0], z[1]), d: 1 };
    }
    m.ty = Math.min(Math.max(m.ty, z[0]), z[1]);
    if (m.y < z[0]) m.y += 0.6;
    if (m.y > z[1]) m.y -= 0.6;
    const dx = m.tx - m.x;
    const dy = m.ty - m.y;
    const d = Math.hypot(dx, dy);

    if (d < 5) {
      m.tx = R(24, 336);
      m.ty = R(z[0], z[1]);
    } else if (!RM) {
      const s = c.sp === 'ドジョウ' ? 0.16 : c.sp === 'メダカ' ? 0.45 : 0.28;
      m.x += (dx / d) * s;
      m.y += (dy / d) * s * 0.7;
      if (Math.abs(dx) > 8) m.d = dx > 0 ? 1 : -1;
    }
    g.setAttribute(
      'transform',
      'translate(' +
        m.x.toFixed(1) +
        ' ' +
        (m.y + (RM ? 0 : Math.sin(t / 500 + c.id) * 1.5)).toFixed(1) +
        ') scale(' +
        m.d +
        ' 1)'
    );
  }
  requestAnimationFrame(loop);
}

export function fall(x: number, y: number, n: number, col: string, sp: number): void {
  for (let i = 0; i < n; i++) {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', String(x + R(-sp, sp)));
    c.setAttribute('cy', String(y));
    c.setAttribute('r', String(R(1.8, 3.4)));
    c.setAttribute('fill', col);
    getEl<SVGGElement>('rp').appendChild(c);
    c.animate(
      [
        { transform: 'translateY(0)', opacity: 1 },
        { transform: 'translateY(' + (262 - y - R(0, 10)) + 'px)', opacity: 0 },
      ],
      { duration: R(1100, 1900), easing: 'ease-in' }
    ).onfinish = () => c.remove();
  }
}

export const party = (): void => {
  ['#f6e27a', '#f08a6a', '#7fd0a8', '#8fb8f0'].forEach((c) => fall(R(60, 300), 16, 6, c, 50));
};

export function ripple(x: number, y: number): void {
  const c = document.createElementNS(NS, 'circle');
  c.setAttribute('cx', String(x));
  c.setAttribute('cy', String(y));
  c.setAttribute('r', '20');
  c.setAttribute('fill', 'none');
  c.setAttribute('stroke', '#fff');
  c.setAttribute('stroke-width', '1.5');
  c.style.transformBox = 'fill-box';
  c.style.transformOrigin = 'center';
  getEl<SVGGElement>('rp').appendChild(c);
  c.animate(
    [
      { transform: 'scale(.2)', opacity: 0.9 },
      { transform: 'scale(1)', opacity: 0 },
    ],
    { duration: 700, easing: 'ease-out' }
  ).onfinish = () => c.remove();
}

export async function heron(c: Creature, caught: boolean): Promise<void> {
  const m = MV[c.id] || { x: 180, y: 200, tx: 180, ty: 200, d: 1 };
  const h = getEl<SVGGElement>('hn');
  const hi = getEl<SVGGElement>('hi');
  const nk = getEl<SVGGElement>('nk');
  const g = G[c.id];

  h.setAttribute('transform', 'translate(' + Math.min(300, m.x + 36) + ' ' + (surf() - 4) + ')');
  h.style.display = '';

  await hi.animate(
    [
      { transform: 'translateX(120px)', opacity: 0 },
      { transform: 'translateX(0)', opacity: 1 },
    ],
    { duration: 650, easing: 'ease-out', fill: 'forwards' }
  ).finished;

  await nk.animate(
    [
      { transform: 'rotate(0)' },
      { transform: 'rotate(-108deg)' },
      { transform: 'rotate(-108deg)' },
      { transform: caught ? 'rotate(0)' : 'rotate(-30deg)' },
    ],
    { duration: 900, fill: 'forwards' }
  ).finished;

  if (caught) {
    if (g) g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
    fall(m.x, m.y, 8, '#f6e27a', 14);
  } else {
    m.tx = m.x < 180 ? R(230, 330) : R(30, 130);
  }

  await hi.animate(
    [
      { transform: 'translateX(0)', opacity: 1 },
      { transform: 'translateX(130px)', opacity: 0 },
    ],
    { duration: 600, fill: 'forwards' }
  ).finished;

  [hi, nk].forEach((e) => e.getAnimations().forEach((a) => a.cancel()));
  h.style.display = 'none';
}

export async function strike(c: Creature, addVal: number, w?: number, rng: Rng = random): Promise<void> {
  const caught = rng() * 100 > dodge(c) + addVal;
  await heron(c, caught);
  if (caught) {
    S.cr = S.cr.filter((x) => x !== c);
    S.nut += 5 + c.lv;
    S.dead.push({ n: c.n, sp: c.sp, lv: c.lv });
    S.memo.push(c.n);
    log('サギが' + c.n + '(' + c.sp + '・♥' + c.lv + ')を食べた。');
    paint();
    await ask(
      '<h2>サギに食べられてしまった…</h2><p>' +
        E(c.n) +
        '(' +
        c.sp +
        ')。なつき度♥' +
        c.lv +
        'の分も合わせて、養分が' +
        (5 + c.lv) +
        '増えた。</p><p class="mu">名前は稲穂の札になって、田んぼに残る。</p><button class="go" data-a="close">見守る</button>'
    );
  } else {
    c.lv = Math.min(9, c.lv + 1);
    if (w) c.db += 3;
    log(c.n + 'をサギから守った!');
    party();
    toast('守れた!' + c.n + 'は無事。' + (w ? '経験で回避力アップ' : 'なつき度+1'));
    await sl(1700);
  }
}
`,

  "src/view/ui.ts": `import { Creature, Scene } from '../types';
import { S, PREV, busy, rsf } from '../game/state';
import { dodge, E, cap, tad } from '../game/calc';
import { art, paint } from './scene';
import { SHOP } from '../data/shop';
import { getSeasonInfo } from '../game/clock';

let SR: (() => void) | null = null;
let CH: ((idx: number) => void) | null = null;
let tt: any;

function getEl<T extends HTMLElement | SVGElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(\`Element #\${id} not found\`);
  return el as unknown as T;
}

export function isChoosing(): boolean {
  return CH !== null;
}

export function resolveChoose(idx: number): void {
  if (CH) {
    const r = CH;
    CH = null;
    r(idx);
  }
}

export function toast(m: string): void {
  const t = getEl<HTMLElement>('toast');
  t.textContent = m;
  t.classList.add('on');
  clearTimeout(tt);
  tt = setTimeout(() => t.classList.remove('on'), 2600);
}

export function sheet(h: string): void {
  getEl<HTMLElement>('sh').innerHTML = '<div class="sc">' + h + '</div>';
  getEl<HTMLElement>('sb').classList.add('on');
}

export function closeSheet(): void {
  getEl<HTMLElement>('sb').classList.remove('on');
  if (SR) {
    const r = SR;
    SR = null;
    r();
  }
}

export const ask = (h: string): Promise<void> =>
  new Promise((r) => {
    SR = r;
    sheet(h);
  });

export const choose = (sc: Scene): Promise<number> =>
  new Promise((r) => {
    CH = r;
    sheet(
      '<h2>' +
        E(sc.t) +
        '</h2>' +
        (sc.c
          ? '<svg viewBox="-30 -18 60 36" style="width:96px;margin:0 auto">' + art(sc.c) + '</svg>'
          : '') +
        '<p>' +
        E(sc.x) +
        '</p>' +
        sc.o
          .map(
            (o, i) =>
              '<button class="opt ' +
              o.k +
              '" data-o="' +
              i +
              '" ' +
              (o.dis ? 'disabled' : '') +
              '><b>' +
              E(o.l) +
              '</b><br><span class="t">' +
              (o.k === 't' ? '手入れ' : '野生') +
              '・' +
              E(o.dis ? '網を解放すると選べる' : o.h) +
              '</span></button>'
          )
          .join('')
    );
  });

export function crH(c: Creature): string {
  return (
    '<h2>' +
    E(c.n) +
    '</h2><svg viewBox="-30 -18 60 36" style="width:120px;margin:0 auto">' +
    art(c) +
    '</svg><p><input data-n="' +
    c.id +
    '" value="' +
    E(c.n) +
    '" maxlength="8" aria-label="名前" style="width:100%;padding:8px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx)"></p>' +
    '<p>' +
    c.sp +
    (tad(c) ? '(オタマ)' : '') +
    ' / ' +
    c.yrs +
    '歳 / なつき度♥' +
    c.lv +
    '</p><p class="g">長所:' +
    c.g.map((t) => t[0] + '(' + t[3] + ')').join('、') +
    '</p><p class="b">短所:' +
    c.b[0] +
    '(' +
    c.b[3] +
    ')</p>' +
    (S.own.eye
      ? '<p>いまの回避率:' + dodge(c) + '%</p>'
      : '<p class="mu">冬に「観察眼」を解放すると回避率が見えます。</p>') +
    '<p class="mu">半年をともに過ごすと、なつき度が上がります。なつくほど、食べられたときの養分が増えます。</p><button class="go" data-a="close">閉じる</button>'
  );
}

export const guideH =
  '<h2>はじめかた</h2><p>1. 「半年を進める」を押すと、時間が流れます。</p><p>2. 途中で判断の場面が2〜3回。選択肢の「手入れ」「野生」と予告を見て選びます。</p><p>3. 守れたら大きく祝い、食べられたら稲穂の札になります。生き物をタップすると長所と短所が見えます。</p><button class="go" data-a="close">はじめる</button>';

export function ui(): void {
  const n = S.tc + S.wc;
  const wp = n ? Math.round((S.wc / n) * 100) : 50;

  // 季節と進行度 (フェーズ2A: 時計連動)
  let seasonLabel = S.phase === 'winter' ? '冬' : S.h ? '秋冬' : '春夏';
  let progressPct = 0;
  let isClockPaused = false;
  let clockSpeed = 1;

  if (S.clock && S.phase === 'play') {
    const info = getSeasonInfo(S.h, S.clock.elapsedSec);
    seasonLabel = info.season;
    progressPct = Math.round(info.halfProgress * 100);
    isClockPaused = S.clock.paused;
    clockSpeed = S.clock.speed;
  }

  getEl<HTMLElement>('hud').innerHTML =
    '<span class="pill">' +
    S.y +
    '年目・' +
    seasonLabel +
    (isClockPaused && S.clock && S.clock.elapsedSec > 0 && S.clock.elapsedSec < S.clock.totalSec
      ? '<span class="pause-indicator">一時停止中</span>'
      : '') +
    '</span><div class="dots">' +
    Array.from({ length: 12 }, (_, i) => '<i class="' + (i < S.w ? 'd' : '') + '"></i>').join('') +
    '</div><span class="mu">' +
    S.money +
    '円 / 養分' +
    S.nut +
    '</span>' +
    (S.clock && S.phase === 'play' && S.clock.totalSec > 0
      ? '<div class="season-bar" style="width:100%"><div class="season-bar-fill" style="width:' +
        progressPct +
        '%"></div></div>'
      : '');

  getEl<HTMLElement>('chips').innerHTML =
    S.cr
      .map(
        (c) =>
          '<button class="chip" data-i="' +
          c.id +
          '"><svg viewBox="-28 -16 56 32">' +
          art(c) +
          '</svg><b>' +
          E(c.n) +
          '</b><span class="mu">♥' +
          c.lv +
          '</span></button>'
      )
      .join('') || '<span class="mu">生き物はいません。</span>';

  getEl<HTMLElement>('info').innerHTML =
    '<div class="card"><h3>今年のスタイル' +
    (S.goal ? '(めあて:' + S.goal + ')' : '') +
    '</h3><div class="bar"><i style="left:calc(' +
    wp +
    '% - 2px)"></i></div><div class="mu" style="display:flex;justify-content:space-between"><span>手入れ ' +
    S.tc +
    '</span><span>野生 ' +
    S.wc +
    '</span></div><p>' +
    (n
      ? S.tc >= S.wc
        ? '手入れ寄り:収穫は安定し、年明けに収穫力が伸びます。'
        : '野生寄り:収穫は大きくブレる反面、年明けに回避力が伸び、珍しい出会いもあります。'
      : '場面での選択が、この田んぼのスタイルをつくります。') +
    '</p></div>';

  // ドックのレンダリング (半期開始前か時間進行中かで安全に切り替え)
  if (S.phase === 'winter') {
    getEl<HTMLElement>('dock').innerHTML =
      '<button class="go" data-a="winter">冬のじかんを開く</button>';
  } else if (!S.clock || S.clock.events.length === 0 || S.clock.elapsedSec >= S.clock.totalSec) {
    getEl<HTMLElement>('dock').innerHTML =
      '<button class="go" data-a="half" ' +
      (busy ? 'disabled' : '') +
      '>半年を進める(' +
      (S.h ? '秋冬' : '春夏') +
      ')</button>';
  } else {
    getEl<HTMLElement>('dock').innerHTML =
      '<div class="clock-dock">' +
      '<button class="go clock-btn" data-a="toggle-pause">' +
      (isClockPaused ? '▶ 再開' : '⏸ 一時停止') +
      '</button>' +
      '<button class="speed-btn" data-a="toggle-speed">' +
      (clockSpeed === 2 ? '×2' : '×1') +
      '</button>' +
      '</div>';
  }
}

export function refresh(): void {
  paint();
  ui();
}

export function winterH(): string {
  const L = S.last;
  if (!L) return '';
  return (
    '<h2>冬のじかん</h2><p>収穫は米' +
    L.r +
    'kg(<b>' +
    L.g +
    '</b>)で' +
    L.r * 10 +
    '円。</p><p class="mu">内訳:基本30+生き物の力' +
    L.a +
    '+養分' +
    L.b +
    '+種類のボーナス' +
    L.c +
    '。' +
    (S.wc > S.tc ? '野生寄りで結果は大きくブレた。' : '手入れ寄りで結果は安定。') +
    '</p>' +
    (L.gm ? '<p class="g">' + L.gm + '</p>' : '') +
    (S.dead.length
      ? '<p class="b">今年、食べられた子:' +
        S.dead.map((d) => E(d.n) + '(' + d.sp + '・♥' + d.lv + ')').join('、') +
        '。名前は稲穂の札として残る。</p>'
      : '<p class="g">今年は誰も食べられなかった。</p>') +
    '<h2 style="margin-top:14px">解放する(所持' +
    S.money +
    '円)</h2>' +
    SHOP.map(
      (i) => {
        const cost = typeof i.p === 'function' ? i.p(S) : i.p;
        return (
          '<div class="shop"><div><b>' +
          i.n +
          '</b><br><span class="mu">' +
          i.d +
          '</span></div><button data-b="' +
          i.k +
          '" ' +
          (S.own[i.k] || S.money < cost ? 'disabled' : '') +
          '>' +
          (S.own[i.k] ? '解放済み' : cost + '円') +
          '</button></div>'
        );
      }
    ).join('') +
    '<div class="shop"><div><b>田んぼを広げる</b><br><span class="mu">飼える数が+1(いま上限' +
    cap() +
    '匹)</span></div><button data-b="field" ' +
    ((S.own.field || 0) >= 3 || S.money < 600 + 300 * (S.own.field || 0) ? 'disabled' : '') +
    '>' +
    ((S.own.field || 0) >= 3 ? '最大' : 600 + 300 * (S.own.field || 0) + '円') +
    '</button></div>' +
    '<div style="margin:14px 0 6px;display:flex;gap:8px">' +
    '<button data-a="feedback" style="flex:1">感想を送る</button>' +
    '<button data-a="code" style="flex:1">状況コードをコピー</button>' +
    '</div>' +
    '<button class="go" data-a="spring">春へ進む</button>'
  );
}

export function logH(): string {
  const buildDate = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : 'dev';
  return (
    '<h2>きろく</h2>' +
    S.log
      .slice(0, 14)
      .map((l) => '<p class="mu">' + E(l) + '</p>')
      .join('') +
    '<div style="margin:10px 0;display:flex;gap:8px">' +
    '<button data-a="feedback" style="flex:1">感想を送る</button>' +
    '<button data-a="code" style="flex:1">状況コードをコピー</button>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-bottom:10px">' +
    '<button data-a="undo" style="flex:1" ' +
    (PREV && !busy ? '' : 'disabled') +
    '>直前の半年を戻す</button> ' +
    '<button data-a="reset" style="flex:1">' +
    (rsf ? 'もう一度押すと最初から' : '最初からやり直す') +
    '</button>' +
    '</div>' +
    '<button class="go" data-a="close">閉じる</button>' +
    '<p class="mu" style="text-align:center;font-size:11px;margin-top:12px">β4-0 (' +
    buildDate +
    ')</p>'
  );
}
`,

  "src/style.css": `:root{--bg:#e6efe9;--card:#fbfdfb;--tx:#1d3330;--mu:#5b736d;--ac:#2c7a68;--on:#fff;--bd:#c3d5cd;--bad:#b0483a;--wd:#a07b45;--sh:rgba(20,50,45,.14);box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#111a17;--card:#1b2724;--tx:#e3eeea;--mu:#93aaa4;--ac:#6fc4ae;--on:#0f1c19;--bd:#2e3f3a;--bad:#e5897b;--wd:#c9a36a;--sh:rgba(0,0,0,.4)}}
:root[data-theme="dark"]{--bg:#111a17;--card:#1b2724;--tx:#e3eeea;--mu:#93aaa4;--ac:#6fc4ae;--on:#0f1c19;--bd:#2e3f3a;--bad:#e5897b;--wd:#c9a36a;--sh:rgba(0,0,0,.4)}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--tx);font:15px/1.55 -apple-system,"Hiragino Sans","Noto Sans JP",sans-serif;-webkit-user-select:none;user-select:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
input{-webkit-user-select:text;user-select:text;font:inherit}
#app{max-width:520px;margin:0 auto;padding:10px 12px 120px}
.hud{display:flex;align-items:center;gap:10px;padding:4px 2px 10px;flex-wrap:wrap}
.pill{background:var(--ac);color:var(--on);border-radius:999px;padding:3px 12px;font-weight:700;white-space:nowrap;display:inline-flex;align-items:center}
.dots{flex:1;display:flex;gap:3px}.dots i{flex:1;height:6px;border-radius:3px;background:var(--bd)}.dots i.d{background:var(--ac)}
.mu{color:var(--mu);font-size:13px}
.stage{position:relative;border-radius:18px;overflow:hidden;box-shadow:0 3px 14px var(--sh)}
svg{display:block;width:100%;height:auto}
.toast{position:absolute;top:10px;left:50%;transform:translate(-50%,-8px);background:rgba(18,38,34,.92);color:#fff;padding:7px 14px;border-radius:999px;font-size:13px;opacity:0;transition:.2s;pointer-events:none;max-width:94%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.toast.on{opacity:1;transform:translate(-50%,0)}
.ov{position:absolute;right:8px;bottom:8px;display:flex;gap:6px}
.ov button{min-height:34px;padding:4px 10px;font-size:12px;background:rgba(251,253,251,.9);color:#1d3330;border-color:transparent}
button{font:inherit;color:var(--tx);background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:8px 10px;min-height:48px;transition:transform .08s}
button:active{transform:scale(.96)}button:focus-visible{outline:2px solid var(--ac);outline-offset:2px}
button.go{background:var(--tx);color:var(--bg);font-weight:700}button:disabled{opacity:.45}
button small{display:block;font-size:12px;opacity:.85;line-height:1.3}
.chips{display:flex;gap:8px;overflow-x:auto;padding:12px 2px 4px}
.chip{flex:0 0 auto;min-width:80px;min-height:0;padding:6px 8px;text-align:center}
.chip svg{width:56px;height:30px}.chip b{display:block;font-size:13px}
.card{background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:12px;margin-top:10px}
.card h3{margin:0 0 6px;font-size:14px}.card p{margin:6px 0 0;font-size:13px;color:var(--mu)}
.bar{height:8px;border-radius:4px;background:linear-gradient(90deg,var(--ac),var(--wd));position:relative;margin:10px 0 2px}.bar i{position:absolute;top:-3px;width:5px;height:14px;background:var(--tx);border-radius:3px;transition:left .3s}
#dock{position:fixed;left:0;right:0;bottom:0;background:var(--card);border-top:1px solid var(--bd);padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px));z-index:10}
#dock>button{display:block;width:100%;max-width:520px;margin:0 auto;min-height:54px;font-size:16px}
#sb{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:.2s;z-index:20}
#sb.on{opacity:1;pointer-events:auto}#sh{width:100%;max-width:520px}
.sc{background:var(--card);border-radius:18px 18px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px));max-height:86vh;overflow:auto;transform:translateY(24px);transition:.2s}
#sb.on .sc{transform:none}
.sc h2{margin:0 0 6px;font-size:17px}.sc p{margin:6px 0}.sc .go{width:100%;margin-top:10px}
.opt{width:100%;text-align:left;margin-top:8px;border-left:6px solid var(--ac)}.opt.w{border-left-color:var(--wd)}
.opt b{font-size:16px}.opt .t{font-size:12px;color:var(--mu)}
.shop{display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px dashed var(--bd)}.shop>div{flex:1}
.g{color:var(--ac)}.b{color:var(--bad)}
.cl{animation:cl 70s linear infinite}.bug{animation:fly 18s ease-in-out infinite}
@keyframes cl{from{transform:translateX(-90px)}to{transform:translateX(430px)}}
@keyframes fly{0%,100%{transform:translate(40px,80px)}33%{transform:translate(180px,52px)}66%{transform:translate(310px,92px)}}
@media(prefers-reduced-motion:reduce){.cl,.bug{animation:none}}
#nk{transform-origin:-8px -44px}

/* フェーズ2A: 時間駆動・時計UI */
.season-bar{height:6px;background:var(--bd);border-radius:3px;overflow:hidden;margin:6px 0 2px}
.season-bar-fill{height:100%;background:var(--ac);transition:width .2s linear}
.clock-dock{display:flex;gap:10px;align-items:center;max-width:520px;margin:0 auto}
.clock-btn{flex:1;min-height:50px;font-size:16px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px}
.speed-btn{flex:0 0 76px;min-height:50px;font-size:15px;font-weight:700}
.pause-indicator{font-size:12px;color:var(--bad);font-weight:700;display:inline-block;margin-left:6px}
`,

  "src/main.ts": `import './style.css';
import { SP } from './data/species';
import { buyUnlockItem } from './data/shop';
import { cap } from './game/calc';
import { S, PREV, busy, rsf, setS, setPREV, setRsf, save, log, fresh, initState } from './game/state';
import { paint, loop, G, MV, ripple } from './view/scene';
import { ui, refresh, sheet, closeSheet, toast, crH, winterH, guideH, logH, isChoosing, resolveChoose } from './view/ui';
import { half, spring, togglePause, toggleSpeed, startHalf } from './game/flow';
import { openFeedback, copySituationCode } from './feedback';

// 状態初期化
initState();

// タブが隠れたら一時停止する（戻ったときは一時停止のまま）
document.addEventListener('visibilitychange', () => {
  if (document.hidden && S.clock && !S.clock.paused && S.phase === 'play') {
    S.clock.paused = true;
    save();
    ui();
  }
});

// イベント登録
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.id === 'sb') return isChoosing() ? undefined : closeSheet();

  const cr = target.closest('.cr') as HTMLElement | null;
  if (cr && !busy) {
    const c = S.cr.find((x) => x.id === Number(cr.dataset.id));
    if (c) return sheet(crH(c));
  }

  const b = target.closest('[data-a],[data-b],[data-i],[data-o]') as HTMLElement | null;
  if (!b) return;
  const d = b.dataset;
  if (navigator.vibrate) {
    try {
      navigator.vibrate(8);
    } catch (x) {}
  }

  if (d.o != null && isChoosing()) {
    return resolveChoose(+d.o);
  }

  if (d.i) {
    const c = S.cr.find((x) => x.id === Number(d.i));
    if (c) return sheet(crH(c));
  }

  if (d.b) {
    const result = buyUnlockItem(d.b, S);
    if (result.success && result.item) {
      if (result.item.k === 'field') {
        log('田んぼを広げた。');
        toast('田んぼが広がった。上限' + cap() + '匹');
      } else {
        log(result.item.n + 'を解放した。');
        toast(result.item.n + 'を解放した');
      }
    }
    save();
    refresh();
    return sheet(winterH());
  }

  if (d.a === 'half') {
    return half();
  }
  if (d.a === 'toggle-pause') {
    togglePause();
    return;
  }
  if (d.a === 'toggle-speed') {
    toggleSpeed();
    return;
  }
  if (d.a === 'winter') return sheet(winterH());
  if (d.a === 'spring') {
    closeSheet();
    return spring();
  }
  if (d.a === 'close') return closeSheet();
  if (d.a === 'dex') {
    return sheet(
      '<h2>図鑑</h2>' +
        Object.keys(SP)
          .map(
            (s) =>
              '<p>' +
              (S.dex.includes(s as any)
                ? '<b>' + s + '</b> 出会えた'
                : '<span class="mu">? 未発見(出会いの場面で見つかるかも)</span>') +
              '</p>'
          )
          .join('') +
        '<button class="go" data-a="close">閉じる</button>'
    );
  }
  if (d.a === 'log') {
    return sheet(logH());
  }
  if (d.a === 'feedback') {
    return openFeedback();
  }
  if (d.a === 'code') {
    return copySituationCode(S);
  }
  if (d.a === 'undo') {
    if (PREV && !busy) {
      setS(JSON.parse(PREV));
      setPREV('');
      save();
      closeSheet();
      refresh();
      toast('直前の半年を戻した');
    }
    return;
  }
  if (d.a === 'reset') {
    if (!rsf) {
      setRsf(true);
      b.textContent = 'もう一度押すと最初から';
      return;
    }
    setRsf(false);
    fresh();
    for (const key in G) {
      G[key].remove();
      delete G[key];
    }
    const crsEl = document.getElementById('crs');
    if (crsEl) crsEl.innerHTML = '';
    for (const key in MV) {
      delete MV[key];
    }
    closeSheet();
    save();
    refresh();
  }
});

document.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  const i = target.dataset && target.dataset.n;
  if (i) {
    const c = S.cr.find((x) => x.id === Number(i));
    if (c) {
      c.n = target.value.trim().slice(0, 8) || c.n;
      save();
      ui();
    }
  }
});

const sv = document.getElementById('sv');
if (sv) {
  sv.addEventListener('pointerdown', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.cr')) return;
    const r = sv.getBoundingClientRect();
    ripple(((e.clientX - r.left) / r.width) * 360, ((e.clientY - r.top) / r.height) * 300);
  });
}

refresh();
requestAnimationFrame(loop);
if (!S.seen) {
  S.seen = 1;
  save();
  sheet(guideH);
}
`,

  "tests/clock.test.ts": `import { describe, it, expect, beforeEach } from 'vitest';
import {
  advanceClock,
  initClockState,
  getSeasonInfo,
  getHalfTotalSec,
  POSITION_TO_RATIO_MAP,
} from '../src/game/clock';
import { ClockState, SeasonName } from '../src/types';

describe('clock (時計ロジック)', () => {
  const customSeasonSec: Record<SeasonName, number> = {
    春: 100,
    夏: 100,
    秋: 100,
    冬: 100,
  };

  it('半期の合計秒数の計算が季節データ通りになる', () => {
    expect(getHalfTotalSec(0, customSeasonSec)).toBe(200); // 春夏 = 100 + 100
    expect(getHalfTotalSec(1, customSeasonSec)).toBe(200); // 秋冬 = 100 + 100
  });

  it('時計の進み方: dtMs に応じて正確に進む', () => {
    const clock: ClockState = {
      elapsedSec: 0,
      totalSec: 200,
      paused: false,
      speed: 1,
      events: [],
    };

    // 100ms 進める -> 0.1秒進む
    const res = advanceClock(clock, 0, 100, customSeasonSec);
    expect(clock.elapsedSec).toBeCloseTo(0.1, 5);
    expect(res.deltaSec).toBeCloseTo(0.1, 5);
  });

  it('一時停止中は時間が進まない', () => {
    const clock: ClockState = {
      elapsedSec: 10,
      totalSec: 200,
      paused: true,
      speed: 1,
      events: [],
    };

    const res = advanceClock(clock, 0, 100, customSeasonSec);
    expect(clock.elapsedSec).toBe(10);
    expect(res.deltaSec).toBe(0);
  });

  it('倍速 (speed=2) では2倍速く進む', () => {
    const clock: ClockState = {
      elapsedSec: 0,
      totalSec: 200,
      paused: false,
      speed: 2,
      events: [],
    };

    const res = advanceClock(clock, 0, 100, customSeasonSec);
    expect(clock.elapsedSec).toBeCloseTo(0.2, 5);
    expect(res.deltaSec).toBeCloseTo(0.2, 5);
  });

  it('巨大な時間差 (MAX_FRAME_MS=250ms 以上) は250msに切り詰められる', () => {
    const clock: ClockState = {
      elapsedSec: 0,
      totalSec: 200,
      paused: false,
      speed: 1,
      events: [],
    };

    // 10000ms (10秒) の巨大な差分を渡しても 250ms に切り詰められる
    const res = advanceClock(clock, 0, 10000, customSeasonSec);
    expect(clock.elapsedSec).toBeCloseTo(0.25, 5);
    expect(res.deltaSec).toBeCloseTo(0.25, 5);
  });

  it('季節の切り替わり: 春(0〜100秒)から夏(100〜200秒)へ正しく遷移する', () => {
    // 50秒経過 -> 春 (進捗 50%, 半期進捗 25%)
    const springInfo = getSeasonInfo(0, 50, customSeasonSec);
    expect(springInfo.season).toBe('春');
    expect(springInfo.seasonProgress).toBeCloseTo(0.5, 5);
    expect(springInfo.halfProgress).toBeCloseTo(0.25, 5);

    // 150秒経過 -> 夏 (進捗 50%, 半期進捗 75%)
    const summerInfo = getSeasonInfo(0, 150, customSeasonSec);
    expect(summerInfo.season).toBe('夏');
    expect(summerInfo.seasonProgress).toBeCloseTo(0.5, 5);
    expect(summerInfo.halfProgress).toBeCloseTo(0.75, 5);
  });

  it('場面が時刻順に発火し、発火時に時計が自動停止する', () => {
    const planMap = { 2: 'sceneA', 5: 'sceneB' };
    const clock = initClockState(0, planMap, customSeasonSec, false, 1);

    // 40秒進める (200ms x 200回) -> 40秒。まだ発火しない
    for (let i = 0; i < 200; i++) {
      advanceClock(clock, 0, 200, customSeasonSec);
    }
    expect(clock.paused).toBe(false);
    expect(clock.events[0].triggered).toBe(false);

    // さらに15秒進める -> 55秒。ratio 0.25 (50秒) を超えるので発火
    let fired = false;
    for (let i = 0; i < 75; i++) {
      const res = advanceClock(clock, 0, 200, customSeasonSec);
      if (res.firedEvent) {
        fired = true;
        expect(res.firedEvent.id).toBe('sceneA');
        expect(clock.paused).toBe(true); // 発火で自動停止
        break;
      }
    }
    expect(fired).toBe(true);
    expect(clock.events[0].triggered).toBe(true);
    expect(clock.events[1].triggered).toBe(false); // 次の場面はまだ
  });

  it('半期末 (totalSec 到達) で completed=true となり時計が停止する', () => {
    const clock: ClockState = {
      elapsedSec: 199.9,
      totalSec: 200,
      paused: false,
      speed: 1,
      events: [],
    };

    const res = advanceClock(clock, 0, 200, customSeasonSec);
    expect(clock.elapsedSec).toBe(200);
    expect(res.completed).toBe(true);
    expect(clock.paused).toBe(true);
  });
});
`,

  "tests/save.test.ts": `import { describe, it, expect } from 'vitest';
import { migrate } from '../src/game/state';

describe('save migration (セーブ移行 v1 -> v2 -> v3)', () => {
  it('ベータ3 (v1) の見本データから正常に移行され、v3形式 (clock付属) に引き継がれる', () => {
    const v1Sample = {
      ver: 1,
      y: 3,
      h: 1,
      w: 8,
      money: 1250,
      nut: 14,
      water: 2,
      own: { net: 1, hide: 1 },
      cr: [
        {
          id: 1,
          n: 'たろう',
          sp: 'メダカ',
          age: 4,
          g: [['俊敏', 20, 0, '逃げ足が速い。回避+20%']],
          b: ['目立つ', -14, 0, '見つかりやすい。回避-14%'],
          lv: 3,
          db: 3,
          yb: 1,
          yrs: 2,
        },
      ],
      log: ['春になった。2つの命が生まれた。'],
      dead: [{ n: 'ひなた', sp: 'カエル', lv: 1 }],
      memo: ['ひなた'],
      dex: ['メダカ', 'カエル'],
      tc: 2,
      wc: 3,
      hm: -0.08,
      goal: '守る',
      startN: 2,
      id: 2,
      phase: 'play',
      last: { r: 65, g: '平年作', a: 24, b: 7, c: 10, gm: '' },
      seen: 1,
    };

    const migrated = migrate(v1Sample);
    expect(migrated).not.toBeNull();
    expect(migrated?.schemaVersion).toBe(3);
    expect(migrated?.ver).toBe(3);

    // 各項目の完全保持を確認
    expect(migrated?.y).toBe(3);
    expect(migrated?.h).toBe(1);
    expect(migrated?.money).toBe(1250);
    expect(migrated?.own).toEqual({ net: 1, hide: 1 });
    expect(migrated?.cr.length).toBe(1);
    expect(migrated?.cr[0].n).toBe('たろう');
    expect(migrated?.dead).toEqual([{ n: 'ひなた', sp: 'カエル', lv: 1 }]);

    // clock オブジェクトが自動補完され、読み込み時は一時停止であること
    expect(migrated?.clock).toBeDefined();
    expect(migrated?.clock?.paused).toBe(true);
    expect(migrated?.clock?.totalSec).toBe(450); // 秋冬: 225+225=450
  });

  it('v2形式のセーブデータからv3へ移行できる (clockなしv2データ)', () => {
    const v2Data = {
      schemaVersion: 2,
      ver: 2,
      y: 2,
      h: 0,
      w: 2,
      money: 500,
      nut: 5,
      water: 1,
      own: {},
      cr: [],
      log: [],
      dead: [],
      memo: [],
      dex: ['メダカ'],
      tc: 1,
      wc: 1,
      hm: 0,
      goal: '増やす',
      startN: 2,
      id: 2,
      phase: 'play',
      last: null,
      seen: 1,
    };

    const migrated = migrate(v2Data);
    expect(migrated).not.toBeNull();
    expect(migrated?.schemaVersion).toBe(3);
    expect(migrated?.ver).toBe(3);
    expect(migrated?.clock).toBeDefined();
    expect(migrated?.clock?.paused).toBe(true);
    expect(migrated?.clock?.totalSec).toBe(450); // 春夏: 225+225=450
  });

  it('場面の直前で保存されたセーブデータから再開した際、読み込み時は一時停止のままである', () => {
    const v3Data = {
      schemaVersion: 3,
      ver: 3,
      y: 1,
      h: 0,
      w: 2,
      money: 0,
      nut: 0,
      water: 1,
      own: {},
      cr: [],
      log: [],
      dead: [],
      memo: [],
      dex: ['メダカ'],
      tc: 0,
      wc: 0,
      hm: 0,
      goal: null,
      startN: 2,
      id: 0,
      phase: 'play',
      last: null,
      seen: 1,
      clock: {
        elapsedSec: 110,
        totalSec: 450,
        paused: false, // 保存時は動いていたとしても
        speed: 1,
        events: [
          { id: 'sign', ratio: 0.25, triggered: false }, // まだ消化されていない
        ],
      },
    };

    const migrated = migrate(v3Data);
    expect(migrated).not.toBeNull();
    // 復帰後は常に一時停止状態になること (指示書 3.4)
    expect(migrated?.clock?.paused).toBe(true);
    // 未消化のイベントがそのまま維持されること (二重適用・取りこぼし防止)
    expect(migrated?.clock?.events[0].triggered).toBe(false);
  });

  it('将来の未知の項目やカスタム項目があっても壊れずに保持される', () => {
    const dataWithUnknown = {
      schemaVersion: 2,
      ver: 2,
      y: 1,
      h: 0,
      w: 0,
      money: 0,
      nut: 0,
      water: 1,
      own: {},
      cr: [],
      log: [],
      dead: [],
      memo: [],
      dex: ['メダカ'],
      tc: 0,
      wc: 0,
      hm: 0,
      goal: null,
      startN: 0,
      id: 0,
      phase: 'play',
      last: null,
      seen: 1,
      futureFieldWeather: 'sunny',
      futureFieldTemp: 24,
    };

    const migrated = migrate(dataWithUnknown);
    expect(migrated).not.toBeNull();
    expect((migrated as any).futureFieldWeather).toBe('sunny');
    expect((migrated as any).futureFieldTemp).toBe(24);
  });

  it('壊れたデータ・空データの場合、null を返して新規開始にフォールバックできる', () => {
    expect(migrate(null)).toBeNull();
    expect(migrate(undefined)).toBeNull();
    expect(migrate('')).toBeNull();
    expect(migrate({})).toBeNull();
    expect(migrate({ ver: 1 })).toBeNull();
    expect(migrate({ ver: 1, cr: 'invalid' })).toBeNull();
    expect(migrate({ ver: -1, cr: [] })).toBeNull();
  });
});
`,

  "CODEMAP.md": `# CODEMAP
最終更新:フェーズ2A / 2026-11-04

## 概要
田んぼの生き物を個体で育てる箱庭シミュレーションゲーム。
半年（春夏・秋冬）の進行が時間駆動（1年=約15分、1季節=225秒）となり、時計が自動で進む。
途中で判断場面や農作業の節目で停止し、収穫・解放を行う。

## ファイル一覧
- \`index.html\` — アプリ全体のHTMLシェル / SVGステージ / UIコンテナ
- \`vite.config.ts\` — Vite設定 / __BUILD_DATE__ 注入
- \`package.json\` — 依存・スクリプト定義 / vitest
- \`tsconfig.json\` — TypeScript厳格設定 (strict: true)
- \`src/main.ts\` — エントリポイント / イベント委譲 / visibilitychange監視 / initState
- \`src/style.css\` — 全体スタイル / 季節バー / 時計操作ボタングループ / アニメーション
- \`src/types.ts\` — 全データ型定義 / ClockState, ScheduledEvent, SeasonName, GameState(v3)
- \`src/feedback.ts\` — フィードバックURL / 状況コード生成・クリップボード
- \`src/data/timing.ts\` — 季節の秒数設定 (SEASON_SECONDS) / 倍速 (SPEEDS) / MAX_FRAME_MS
- \`src/data/sky.ts\` — 季節ごとの空色パレット (SKY) / 滑らかな空色ブレンド (getInterpolatedSky)
- \`src/data/species.ts\` — 種の基礎パラメータ (SP: メダカ, カエル, ドジョウ)
- \`src/data/traits.ts\` — 特性データ (GOOD, BAD) / 生き物の名前リスト (NM)
- \`src/data/shop.ts\` — 解放アイテム定義 (UNLOCK_ITEMS, SHOP) / buyUnlockItem
- \`src/data/scenes.ts\` — 場面データ定義 (SCENE_DEFS: sign, meet, wx, wish)
- \`src/data/evolution.ts\` — 進化・成長ルール定義 (EVO_RULES) / 判定関数 checkEvolution
- \`src/game/calc.ts\` — 数値計算 (dodge, yo, surf, cap) / 乱数管理 (setRng, getRng, random)
- \`src/game/clock.ts\` — 時計ロジック (advanceClock, initClockState, getSeasonInfo, 割合マッピング)
- \`src/game/state.ts\` — 状態変数管理 (S, PREV, busy) / セーブv3 (migrations[2]: clock対応)
- \`src/game/scenes.ts\` — 場面共通実行 (executeScene, play) / 年次計画 (plan) / めあて (goalScene)
- \`src/game/flow.ts\` — 時間駆動半期進行 (startHalf, tickClock, finishHalf) / 一時停止・倍速 / 収穫 / 年明け
- \`src/view/scene.ts\` — SVGステージ描画 (paint: 空色補間) / アニメーションループ (loop: tickClock連携)
- \`src/view/ui.ts\` — UI生成 (季節バー, 一時停止/再開, 倍速ボタン, winterH, logH) / モーダル
- \`tests/clock.test.ts\` — 時計ロジック・時間駆動・発火・一時停止・巨大差分切り詰めの単体テスト
- \`tests/dodge.test.ts\` — 回避率計算 (dodge) の単体テスト
- \`tests/harvest.test.ts\` — 収穫計算 (harvest) の単体テスト
- \`tests/plan.test.ts\` — 場面計画 (plan) および choices: [] 場面の単体テスト
- \`tests/evolution.test.ts\` — 進化判定 (checkEvolution) の単体テスト
- \`tests/save.test.ts\` — セーブデータv3マイグレーション、clock補完、再開時二重適用防止の単体テスト
- \`tests/goldenMaster.test.ts\` — フェーズ1基準データとの挙動完全一致検証テスト
- \`tests/goldenMasterData.json\` — ゴールデンマスター基準データ (20半期分)

## データの流れ
1. **生成**: \`src/game/state.ts\` の \`fresh()\` または \`load()\` で \`S\` (GameState v3, clock含む) を生成。
2. **時間進行**: \`src/view/scene.ts\` の \`loop()\` から毎フレーム \`tickClock(dtMs)\` を呼び出し、\`clock.ts\` の \`advanceClock\` で経過秒を進める。
3. **場面発火**: 予定時刻割合に達すると時計が自動停止し、\`executeScene\` で場面を実行。解決後に時計再開。
4. **半期終了**: 半期合計秒に達すると \`finishHalf\` で変身チェックや収穫（秋冬）を行い、停止。
5. **描画**: \`loop\` 内で生き物の泳ぎを描画。\`paint\` で空色の滑らかな変化や稲を描画、\`ui\` で季節バーやコントローラーを描画。
6. **セーブ**: 半期開始時、場面解決後、一時停止時、タブ非表示時、10秒ごとに \`save()\` で localStorage に保存。

## 定義データの場所と足し方
- **時間の秒数・速度**: \`src/data/timing.ts\` の \`SEASON_SECONDS\` や \`SPEEDS\` を変更。
- **場面**: \`src/data/scenes.ts\` の \`SCENE_DEFS\` に \`SceneDef\` を1件追加。
- **解放アイテム**: \`src/data/shop.ts\` の \`UNLOCK_ITEMS\` に \`UnlockItemDef\` を1件追加。
- **進化・成長**: \`src/data/evolution.ts\` の \`EVO_RULES\` に \`EvoRule\` を1件追加。
- **種**: \`src/data/species.ts\` の \`SP\` に追加。

## セーブデータ
- スキーマバージョン: v3 (\`schemaVersion: 3\`, \`ver: 3\`)
- 移行処理: \`src/game/state.ts\` の \`migrations[2]\`。v2（clockなし）から clock 構造を安全に自動補完。
- 再開仕様: 読み込み後は常に \`paused: true\` で復帰。未消化イベントは保持され二重適用なし。

## テスト
- テスト実行: \`npm test\` (Vitest, 全7ファイル・32テスト)
  - \`clock.test.ts\`: 時計進行、一時停止、倍速、MAX_FRAME_MS切り詰め、場面自動発火、完了停止
  - \`dodge.test.ts\`: 回避率計算の上下限、各補正加算
  - \`harvest.test.ts\`: 収穫基本式、品種倍率、目標ボーナス、端数処理
  - \`plan.test.ts\`: 季節ごとの配置、条件外場面の除外、増やすめあて優先、choices: [] 動作
  - \`evolution.test.ts\`: 変身・年次成長、隠し→通常→既定の優先順位
  - \`save.test.ts\`: v1→v2→v3移行、clock補完、再開安全性、破損データ保護
  - \`goldenMaster.test.ts\`: 固定シード(42)による20半期シミュレーションの完全一致

## 既知の注意点・将来の余地
- **フェーズ2B以降の余地**:
  - 場面に季節（春/夏/秋/冬）を個別指定する余地: \`src/types.ts\` の \`SceneDef.seasons\` に \`SeasonName\` を許容可能。
  - 眺める出来事 (\`choices: []\`) の時間駆動への差し込み余地: \`src/data/scenes.ts\` および \`src/game/scenes.ts\` の \`executeScene\` が既に対応済み。
- prefers-reduced-motion 時の挙動や旅立ち個体の記録の拡張はフェーズ4・6で対応予定。
`
};

for (const [relPath, content] of Object.entries(files)) {
  writeFile(relPath, content);
}

console.log('ALL PHASE 2A FILES UPDATED SUCCESSFULLY!');