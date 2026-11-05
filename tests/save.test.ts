import { describe, it, expect } from 'vitest';
import { migrate } from '../src/game/state';

describe('save migration (セーブ移行 v1 -> v2 -> v3 -> v4)', () => {
  it('ベータ3 (v1) の見本データから正常に移行され、v4形式 (settings.sound付属) に引き継がれる', () => {
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
    expect(migrated?.schemaVersion).toBe(4);
    expect(migrated?.ver).toBe(4);

    expect(migrated?.y).toBe(3);
    expect(migrated?.h).toBe(1);
    expect(migrated?.money).toBe(1250);
    expect(migrated?.own).toEqual({ net: 1, hide: 1 });
    expect(migrated?.cr.length).toBe(1);
    expect(migrated?.cr[0].n).toBe('たろう');
    expect(migrated?.dead).toEqual([{ n: 'ひなた', sp: 'カエル', lv: 1 }]);

    expect(migrated?.clock).toBeDefined();
    expect(migrated?.clock?.paused).toBe(true);
    expect(migrated?.settings).toEqual({ sound: true });
  });

  it('v3形式のセーブデータからv4へ移行できる (settingsなしv3データ)', () => {
    const v3Data = {
      schemaVersion: 3,
      ver: 3,
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
      clock: {
        elapsedSec: 100,
        totalSec: 450,
        paused: false,
        speed: 1,
        events: [],
      },
    };

    const migrated = migrate(v3Data);
    expect(migrated).not.toBeNull();
    expect(migrated?.schemaVersion).toBe(4);
    expect(migrated?.ver).toBe(4);
    expect(migrated?.settings).toEqual({ sound: true });
  });

  it('既存の設定 (settings.sound = false) が保持される', () => {
    const v3MutedData = {
      schemaVersion: 3,
      ver: 3,
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
      settings: { sound: false },
    };

    const migrated = migrate(v3MutedData);
    expect(migrated?.settings?.sound).toBe(false);
  });

  it('眺める出来事を含む予定リストで再開時、未消化フラグが維持され二重適用がない', () => {
    const v4Data = {
      schemaVersion: 4,
      ver: 4,
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
        paused: false,
        speed: 1,
        events: [
          { id: 'watch_petals', ratio: 0.15, triggered: true, isWatch: true },
          { id: 'sign', ratio: 0.25, triggered: false, isWatch: false },
        ],
      },
      settings: { sound: true },
    };

    const migrated = migrate(v4Data);
    expect(migrated).not.toBeNull();
    expect(migrated?.clock?.paused).toBe(true);
    expect(migrated?.clock?.events[0].triggered).toBe(true);
    expect(migrated?.clock?.events[1].triggered).toBe(false);
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
