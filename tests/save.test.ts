import { describe, it, expect } from 'vitest';
import { migrate } from '../src/game/state';

describe('save migration (セーブ移行 v1 -> v2)', () => {
  it('ベータ3 (v1) の見本データから正常に移行され、全項目が欠落なく引き継がれる', () => {
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
    expect(migrated?.schemaVersion).toBe(2);
    expect(migrated?.ver).toBe(2);

    expect(migrated?.y).toBe(3);
    expect(migrated?.h).toBe(1);
    expect(migrated?.w).toBe(8);
    expect(migrated?.money).toBe(1250);
    expect(migrated?.nut).toBe(14);
    expect(migrated?.water).toBe(2);
    expect(migrated?.own).toEqual({ net: 1, hide: 1 });
    expect(migrated?.cr.length).toBe(1);
    expect(migrated?.cr[0].n).toBe('たろう');
    expect(migrated?.dead).toEqual([{ n: 'ひなた', sp: 'カエル', lv: 1 }]);
    expect(migrated?.memo).toEqual(['ひなた']);
    expect(migrated?.dex).toEqual(['メダカ', 'カエル']);
    expect(migrated?.goal).toBe('守る');
  });

  it('将来の未知の項目やカスタム項目があっても壊れずに保持される', () => {
    const dataWithUnknown = {
      ver: 1,
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
