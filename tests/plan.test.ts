import { describe, it, expect, beforeEach } from 'vitest';
import { plan, executeScene } from '../src/game/scenes';
import { fresh, S } from '../src/game/state';
import { SceneDef } from '../src/types';

describe('plan (場面の計画)', () => {
  beforeEach(() => {
    fresh();
  });

  it('春夏 (h=0) では位置 [2, 5, 7]、秋冬 (h=1) では位置 [9, 11] に配置される', () => {
    const springPlan = plan(0);
    expect(Object.keys(springPlan).map(Number).sort((a, b) => a - b)).toEqual([2, 5, 7]);
    expect(springPlan[5]).toBe('sign');

    const autumnPlan = plan(1);
    expect(Object.keys(autumnPlan).map(Number).sort((a, b) => a - b)).toEqual([9, 11]);
    expect(autumnPlan[9]).toBe('sign');
  });

  it('飼育上限 (cap) に達している場合、出会い (meet) は候補プールに入らない', () => {
    S.cr.push({
      id: 99,
      n: 'テスト',
      sp: 'ドジョウ',
      age: 1,
      g: [],
      b: ['目立つ', 0, 0, ''],
      lv: 0,
      db: 0,
      yb: 0,
      yrs: 0,
    });
    expect(S.cr.length).toBe(3); // cap = 3

    for (let i = 0; i < 20; i++) {
      const p = plan(0);
      expect(Object.values(p)).not.toContain('meet');
    }
  });

  it('めあて「増やす」の場合、春夏 (h=0) で空き枠があれば meet が最優先配置される', () => {
    S.goal = '増やす';
    const p = plan(0);
    expect(p[2]).toBe('meet');
  });

  it('同じシード（固定乱数）でまったく同じ並びが再現されること', () => {
    const mockRng1 = () => 0.42;
    const mockRng2 = () => 0.42;
    const p1 = plan(0, mockRng1);
    const p2 = plan(0, mockRng2);
    expect(p1).toEqual(p2);
  });
});

describe('SceneDef: 選択肢が空 (choices: []) の眺める出来事の動作確認', () => {
  it('choices: [] の場面を実行すると、選択UIを出さずに onWatch コールバックが自動適用される', async () => {
    fresh();
    let watched = false;
    let watchedRngValue = 0;

    const watchingScene: SceneDef = {
      id: 'watch_event_test',
      title: 'ホタルの夜',
      description: '無数の光が水面を舞う。',
      seasons: ['春夏'],
      when: () => true,
      weight: 1,
      choices: [],
      onWatch: async (state, rng) => {
        watched = true;
        watchedRngValue = rng();
        state.nut += 3;
      },
    };

    const initialNut = S.nut;
    await executeScene(watchingScene, () => 0.77);

    expect(watched).toBe(true);
    expect(watchedRngValue).toBe(0.77);
    expect(S.nut).toBe(initialNut + 3);
  });
});
