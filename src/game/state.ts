import { GameState, SpeciesName, Rng } from '../types';
import { GOOD, BAD, NM } from '../data/traits';
import { pick, random } from './calc';
import { SEASON_SECONDS } from '../data/timing';
import { getHalfTotalSec } from './clock';
import { setSoundEnabled } from '../audio/audio';

export const SAVE_KEY = 'tanbocchi';
export const CURRENT_SCHEMA_VERSION = 4;
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
 * 1. src/types.ts の GameState 型に新項目を追加する
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
        paused: true,
        speed: 1,
        events: [],
      },
    };
  },
  // v3 -> v4 (ベータ4 フェーズ2B: 音設定)
  3: (v3: any): any => {
    return {
      ...v3,
      schemaVersion: 4,
      ver: 4,
      settings: v3.settings ?? {
        sound: true,
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
      const s = migrate(parsed);
      if (s) {
        setSoundEnabled(s.settings?.sound ?? true);
        return s;
      }
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
    settings: {
      sound: true,
    },
  };
  setSoundEnabled(true);
  add('メダカ');
  add('カエル');
  log('春になった。2つの命が生まれた。');
  return S;
}

export function initState(): void {
  S = load() || fresh();
}
