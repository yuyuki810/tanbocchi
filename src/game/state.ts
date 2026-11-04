import { GameState, SpeciesName, Rng } from '../types';
import { GOOD, BAD, NM } from '../data/traits';
import { pick, random } from './calc';

export const SAVE_KEY = 'tanbocchi';
export const CURRENT_SCHEMA_VERSION = 2;
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
 * 2. このファイルの migrations オブジェクトに移行関数を追加する (例: 2: (v2) => ({ ...v2, schemaVersion: 3, newProp: 'default' }))
 * 3. CURRENT_SCHEMA_VERSION を 1 増やす (例: 3)
 * 4. tests/save.test.ts に移行テストを追加する
 */
type MigrationFn = (oldData: any) => any;

export const migrations: Record<number, MigrationFn> = {
  // v1 (ベータ3) -> v2 (ベータ4 フェーズ1)
  1: (v1: any): any => {
    return {
      ...v1,
      schemaVersion: 2,
      ver: 2,
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
  };
  add('メダカ');
  add('カエル');
  log('春になった。2つの命が生まれた。');
  return S;
}

export function initState(): void {
  S = load() || fresh();
}
