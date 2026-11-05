import { describe, it, expect, beforeEach } from 'vitest';
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

  it('4倍速 (speed=4) では4倍速く進む', () => {
    const clock: ClockState = {
      elapsedSec: 0,
      totalSec: 200,
      paused: false,
      speed: 4,
      events: [],
    };

    const res = advanceClock(clock, 0, 100, customSeasonSec);
    expect(clock.elapsedSec).toBeCloseTo(0.4, 5);
    expect(res.deltaSec).toBeCloseTo(0.4, 5);
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
