import { describe, it, expect, beforeEach } from 'vitest';
import { dodge } from '../src/game/calc';
import { Creature, GameState } from '../src/types';
import { setS, fresh } from '../src/game/state';

describe('dodge (回避率計算)', () => {
  let s: GameState;

  beforeEach(() => {
    s = fresh();
    setS(s);
  });

  const makeCreature = (overrides?: Partial<Creature>): Creature => ({
    id: 1,
    n: 'テスト',
    sp: 'メダカ',
    age: 1,
    g: [],
    b: ['目立つ', 0, 0, ''],
    lv: 0,
    db: 0,
    yb: 0,
    yrs: 0,
    ...overrides,
  });

  it('基本式: メダカの基礎回避率 (55%) と水深普通 (water=1, 補正0)', () => {
    const c = makeCreature({ sp: 'メダカ' });
    s.water = 1;
    // 基礎55 + db0 + traits0 + hide0 + water0 + goal0 = 55
    expect(dodge(c)).toBe(55);
  });

  it('各補正の加算: 特性、わら束、水位、めあて「守る」', () => {
    const c = makeCreature({
      sp: 'メダカ',
      db: 5,
      g: [['俊敏', 20, 0, '']], // +20
      b: ['目立つ', -14, 0, ''], // -14
    });
    s.own.hide = 1; // +12
    s.water = 2; // 水深深め: +8
    s.goal = '守る'; // +8
    // 55 + 5 + (20 - 14) + 12 + 8 + 8 = 94
    expect(dodge(c)).toBe(94);
  });

  it('オタマジャクシ (カエルでage < 1) のペナルティ (-10%)', () => {
    const tadpole = makeCreature({
      sp: 'カエル',
      age: 0,
    });
    s.water = 1;
    // カエル基礎45 - 10 = 35
    expect(dodge(tadpole)).toBe(35);

    // 成体カエル (age >= 1)
    const frog = makeCreature({
      sp: 'カエル',
      age: 1,
    });
    expect(dodge(frog)).toBe(45);
  });

  it('上限95%でキャップされること', () => {
    const c = makeCreature({
      sp: 'ドジョウ', // 基礎60
      db: 50,
      g: [['俊敏', 20, 0, '']],
    });
    s.own.hide = 1; // +12
    s.water = 2; // +8
    // 合計: 60 + 50 + 20 + 12 + 8 = 150 -> 95
    expect(dodge(c)).toBe(95);
  });

  it('下限5%で底上げされること', () => {
    const c = makeCreature({
      sp: 'カエル', // 基礎45
      age: 0, // -10 (オタマ)
      db: -40,
      b: ['目立つ', -20, 0, ''],
    });
    s.water = 0; // 水深浅め: -8
    // 合計: 45 - 10 - 40 - 20 - 8 = -33 -> 5
    expect(dodge(c)).toBe(5);
  });
});
