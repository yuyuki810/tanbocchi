import { ClockState, ScheduledEvent, SeasonName } from '../types';
import { SEASON_SECONDS, MAX_FRAME_MS } from '../data/timing';

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
 */
export function createScheduledEvents(
  h: number,
  planMap: Record<number, string>,
  watchEvents: Array<{ id: string; ratio: number }> = []
): ScheduledEvent[] {
  const positions = Object.keys(planMap)
    .map(Number)
    .sort((a, b) => a - b);

  const choiceEvents: ScheduledEvent[] = positions.map((pos) => ({
    id: planMap[pos],
    ratio: POSITION_TO_RATIO_MAP[pos] ?? 0.5,
    triggered: false,
    isWatch: false,
  }));

  const watchList: ScheduledEvent[] = watchEvents.map((w) => ({
    id: w.id,
    ratio: w.ratio,
    triggered: false,
    isWatch: true,
  }));

  // すべての出来事を発生時刻 (ratio) 順にソート
  return [...choiceEvents, ...watchList].sort((a, b) => a.ratio - b.ratio);
}

/**
 * 半期開始時の新しい ClockState を作成する
 */
export function initClockState(
  h: number,
  planMap: Record<number, string>,
  seasonSec: Record<SeasonName, number> = SEASON_SECONDS,
  paused = false,
  speed = 1,
  watchEvents: Array<{ id: string; ratio: number }> = []
): ClockState {
  return {
    elapsedSec: 0,
    totalSec: getHalfTotalSec(h, seasonSec),
    paused,
    speed,
    events: createScheduledEvents(h, planMap, watchEvents),
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
      if (!evt.isWatch) {
        // 選ぶ場面のみ時計を一時停止する (眺める出来事は時間を止めない)
        clock.paused = true;
      }
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
