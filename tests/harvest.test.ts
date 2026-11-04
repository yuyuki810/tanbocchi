import { describe, it, expect, beforeEach } from 'vitest';
import { harvest } from '../src/game/flow';
import { setS, fresh, S } from '../src/game/state';
import { setRng } from '../src/game/calc';

describe('harvest (収穫計算)', () => {
  beforeEach(() => {
    fresh();
    // 特性の補正によるブレを排除するため、収穫補正0の特性に固定
    S.cr = [
      {
        id: 1,
        n: 'メダカ1',
        sp: 'メダカ',
        age: 1,
        g: [['俊敏', 20, 0, '']],
        b: ['目立つ', -14, 0, ''],
        lv: 0,
        db: 0,
        yb: 0,
        yrs: 0,
      },
      {
        id: 2,
        n: 'カエル1',
        sp: 'カエル',
        age: 1,
        g: [['隠れ上手', 14, 0, '']],
        b: ['目立つ', -14, 0, ''],
        lv: 0,
        db: 0,
        yb: 0,
        yrs: 0,
      },
    ];
    // 乱数のブレを0 (中央値) に固定: R(-v, v) = -v + 0.5 * 2v = 0
    setRng(() => 0.5);
  });

  it('基本式: 基本30 + 生き物の力(a) + 養分半分(b) + 種類ボーナス(c5)', () => {
    // メダカ (yo=3), カエル (yo=6) -> a = (3 + 6) * 3 = 27
    // S.nut = 10 -> b = floor(10 / 2) = 5
    // 種類 = 2種 -> c5 = 2 * 5 = 10
    // 基本計 = 30 + 27 + 5 + 10 = 72
    // 手入れ寄り (tc=0, wc=0 -> v=0.05), R(-0.05, 0.05) で rng()=0.5 のとき f = 1 + 0 = 1
    // r = round(72 * 1) = 72
    S.nut = 10;
    S.money = 0;
    harvest();
    expect(S.last).not.toBeNull();
    expect(S.last?.a).toBe(27);
    expect(S.last?.b).toBe(5);
    expect(S.last?.c).toBe(10);
    expect(S.last?.r).toBe(72);
    expect(S.money).toBe(720);
  });

  it('補正倍率: 品種解放(seed)と「稼ぐ」めあての積算', () => {
    // 基礎72 * 1.15(seed) * 1.15(稼ぐ) = 72 * 1.3225 = 95.22 -> roundで95
    S.nut = 10;
    S.own.seed = 1;
    S.goal = '稼ぐ';
    S.money = 0;
    harvest();
    expect(S.last?.r).toBe(95);
    expect(S.money).toBe(950);
  });

  it('めあて達成ボーナス: 「守る」で死者0匹の場合 +300円', () => {
    S.goal = '守る';
    S.dead = [];
    S.money = 100;
    harvest();
    const expected = 100 + S.last!.r * 10 + 300;
    expect(S.money).toBe(expected);
    expect(S.last?.gm).toContain('めあて「守る」達成!誰も失わなかった。+300円');
  });

  it('端数処理: 四捨五入が正しく行われること', () => {
    setRng(() => 0.75);
    harvest();
    expect(Number.isInteger(S.last?.r)).toBe(true);
  });
});
