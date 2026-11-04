import { describe, it, expect, beforeEach } from 'vitest';
import { checkEvolution, EVO_RULES } from '../src/data/evolution';
import { fresh, S } from '../src/game/state';
import { Creature, EvoRule } from '../src/types';

describe('evolution (進化・成長ルール)', () => {
  beforeEach(() => {
    fresh();
  });

  const makeCreature = (overrides?: Partial<Creature>): Creature => ({
    id: 1,
    n: 'ピョン',
    sp: 'カエル',
    age: 0,
    g: [],
    b: ['目立つ', 0, 0, ''],
    lv: 0,
    db: 0,
    yb: 0,
    yrs: 0,
    ...overrides,
  });

  it('変身判定: age=0 (オタマ) は変身せず、age=1 で変身ルールに合致する', () => {
    const otama = makeCreature({ sp: 'カエル', age: 0 });
    expect(checkEvolution(otama, '変身', S)).toBeUndefined();

    const frog = makeCreature({ sp: 'カエル', age: 1 });
    const rule = checkEvolution(frog, '変身', S);
    expect(rule).toBeDefined();
    expect(rule?.id).toBe('frog_metamorphosis');
    expect(rule?.to).toBe('カエル');
  });

  it('年明け成長判定: 手入れ寄り (tc >= wc) の場合は収穫力(yb)UPルール', () => {
    S.tc = 2;
    S.wc = 1;
    const c = makeCreature();
    const rule = checkEvolution(c, '年明け', S);
    expect(rule).toBeDefined();
    expect(rule?.id).toBe('yearly_growth_care');

    const initialYb = c.yb;
    rule?.apply?.(c, S);
    expect(c.yb).toBe(initialYb + 1);
  });

  it('年明け成長判定: 野生寄り (wc > tc) の場合は回避力(db)UPルール', () => {
    S.tc = 1;
    S.wc = 2;
    const c = makeCreature();
    const rule = checkEvolution(c, '年明け', S);
    expect(rule).toBeDefined();
    expect(rule?.id).toBe('yearly_growth_wild');

    const initialDb = c.db;
    rule?.apply?.(c, S);
    expect(c.db).toBe(initialDb + 3);
  });

  it('優先度順序の検証: 隠し(hidden) → 通常(normal) → 既定(default) の順で最初に合致したものが採用される', () => {
    const c = makeCreature({ sp: 'カエル', age: 1 });

    const hiddenRule: EvoRule = {
      id: 'hidden_rule',
      from: 'カエル',
      at: '変身',
      priority: 'hidden',
      cond: [(cr) => cr.age >= 1],
      to: 'カエル',
    };

    const normalRule: EvoRule = {
      id: 'normal_rule',
      from: 'カエル',
      at: '変身',
      priority: 'normal',
      cond: [(cr) => cr.age >= 1],
      to: 'カエル',
    };

    EVO_RULES.unshift(normalRule);
    EVO_RULES.unshift(hiddenRule);

    try {
      const match = checkEvolution(c, '変身', S);
      expect(match?.id).toBe('hidden_rule');
    } finally {
      EVO_RULES.shift();
      EVO_RULES.shift();
    }
  });

  it('既定ルールへのフォールバック: 条件に合致しない特殊ルールを無視して既定に落ちる', () => {
    const c = makeCreature({ sp: 'カエル', age: 1 });

    const strictRule: EvoRule = {
      id: 'strict_rule',
      from: 'カエル',
      at: '変身',
      priority: 'hidden',
      cond: [() => false],
      to: 'カエル',
    };

    EVO_RULES.unshift(strictRule);
    try {
      const match = checkEvolution(c, '変身', S);
      expect(match?.id).toBe('frog_metamorphosis');
    } finally {
      EVO_RULES.shift();
    }
  });
});
