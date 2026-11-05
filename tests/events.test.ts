import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WEATHER_CHOICE_EVENTS, WATCH_EVENTS } from '../src/data/weatherEvents';
import { plan, planWatchEvents } from '../src/game/scenes';
import { GameState } from '../src/types';
import { fresh, setS, S } from '../src/game/state';

// 演出待ち (sl) を即時解決してテストを高速化
vi.mock('../src/game/calc', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/game/calc')>();
  return {
    ...actual,
    sl: () => Promise.resolve(),
  };
});

describe('events (天気・季節イベント 10個)', () => {
  beforeEach(() => {
    fresh();
  });

  it('選ぶ出来事5個と眺める出来事5個の計10個が揃っている', () => {
    expect(Object.keys(WEATHER_CHOICE_EVENTS).length).toBe(5);
    expect(Object.keys(WATCH_EVENTS).length).toBe(5);

    expect(WEATHER_CHOICE_EVENTS.wx_spring_rain).toBeDefined();
    expect(WEATHER_CHOICE_EVENTS.wx_spring_frost).toBeDefined();
    expect(WEATHER_CHOICE_EVENTS.wx_summer_heat).toBeDefined();
    expect(WEATHER_CHOICE_EVENTS.wx_autumn_rain).toBeDefined();
    expect(WEATHER_CHOICE_EVENTS.wx_winter_ice).toBeDefined();

    expect(WATCH_EVENTS.watch_petals).toBeDefined();
    expect(WATCH_EVENTS.watch_shower).toBeDefined();
    expect(WATCH_EVENTS.watch_firefly).toBeDefined();
    expect(WATCH_EVENTS.watch_mist).toBeDefined();
    expect(WATCH_EVENTS.watch_first_snow).toBeDefined();
  });

  it('季節の指定どおりにしか出ない (例: 猛暑は夏だけ、初雪は冬だけ)', () => {
    expect(WEATHER_CHOICE_EVENTS.wx_spring_rain.seasons).toEqual(['春']);
    expect(WEATHER_CHOICE_EVENTS.wx_spring_frost.seasons).toEqual(['春']);
    expect(WEATHER_CHOICE_EVENTS.wx_summer_heat.seasons).toEqual(['夏']);
    expect(WEATHER_CHOICE_EVENTS.wx_autumn_rain.seasons).toEqual(['秋']);
    expect(WEATHER_CHOICE_EVENTS.wx_winter_ice.seasons).toEqual(['冬']);

    expect(WATCH_EVENTS.watch_petals.season).toBe('春');
    expect(WATCH_EVENTS.watch_shower.season).toBe('夏');
    expect(WATCH_EVENTS.watch_firefly.season).toBe('夏');
    expect(WATCH_EVENTS.watch_mist.season).toBe('秋');
    expect(WATCH_EVENTS.watch_first_snow.season).toBe('冬');
  });

  it('安全性: すべての選ぶ出来事・眺める出来事で個体が死なない・減らない', async () => {
    const makeState = (): GameState => {
      const s = fresh();
      s.cr = [
        { id: 1, n: 'タロウ', sp: 'メダカ', age: 1, g: [], b: ['目立つ', 0, 0, ''], lv: 0, db: 0, yb: 0, yrs: 0 },
        { id: 2, n: 'ケロ', sp: 'カエル', age: 1, g: [], b: ['目立つ', 0, 0, ''], lv: 0, db: 0, yb: 0, yrs: 0 },
      ];
      setS(s);
      return s;
    };

    for (const evt of Object.values(WEATHER_CHOICE_EVENTS)) {
      for (const choice of evt.choices) {
        const s = makeState();
        const initialCount = s.cr.length;
        await choice.resolve(s, () => 0.1);
        expect(s.cr.length).toBe(initialCount);

        const s2 = makeState();
        await choice.resolve(s2, () => 0.9);
        expect(s2.cr.length).toBe(initialCount);
      }
    }

    for (const watchEvt of Object.values(WATCH_EVENTS)) {
      const s = makeState();
      const initialCount = s.cr.length;
      watchEvt.apply(s, () => 0.5);
      expect(s.cr.length).toBe(initialCount);
    }
  });

  it('配分: 20年分シミュレーションで、選ぶ場面が年4〜6回、眺める出来事が3〜5回に収まる', () => {
    let rngSeed = 12345;
    const mockRng = () => {
      rngSeed = (rngSeed * 9301 + 49297) % 233280;
      return rngSeed / 233280;
    };

    let totalChoiceEvents = 0;
    let totalWatchEvents = 0;
    const years = 20;

    for (let y = 0; y < years; y++) {
      const plSpring = plan(0, mockRng, 'with_weather');
      const choiceSpringCount = Object.keys(plSpring).length;
      const occSpring = Object.keys(plSpring).map(Number);
      const watchSpring = planWatchEvents(0, occSpring, mockRng);

      const plAutumn = plan(1, mockRng, 'with_weather');
      const choiceAutumnCount = Object.keys(plAutumn).length;
      const occAutumn = Object.keys(plAutumn).map(Number);
      const watchAutumn = planWatchEvents(1, occAutumn, mockRng);

      const yearChoiceCount = choiceSpringCount + choiceAutumnCount;
      const yearWatchCount = watchSpring.length + watchAutumn.length;

      expect(yearChoiceCount).toBeGreaterThanOrEqual(4);
      expect(yearChoiceCount).toBeLessThanOrEqual(6);

      expect(yearWatchCount).toBeGreaterThanOrEqual(3);
      expect(yearWatchCount).toBeLessThanOrEqual(5);

      totalChoiceEvents += yearChoiceCount;
      totalWatchEvents += yearWatchCount;
    }

    expect(totalChoiceEvents / years).toBe(5);
    expect(totalWatchEvents / years).toBe(4);
  });
});
