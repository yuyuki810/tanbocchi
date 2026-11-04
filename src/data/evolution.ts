import { EvoRule, Creature, GameState } from '../types';

export const EVO_RULES: EvoRule[] = [
  // 1. 変身 (オタマジャクシ -> カエル成体)
  {
    id: 'frog_metamorphosis',
    from: 'カエル',
    at: '変身',
    priority: 'default',
    cond: [(c: Creature) => c.sp === 'カエル' && c.age === 1],
    to: 'カエル',
    message: 'オタマジャクシから、立派なカエルになった。',
  },
  // 2. 年次成長 (手入れ寄り: 収穫力UP)
  {
    id: 'yearly_growth_care',
    from: '*',
    at: '年明け',
    priority: 'default',
    cond: [(_c: Creature, s: GameState) => s.tc >= s.wc],
    apply: (c: Creature) => {
      c.yb++;
    },
    message: '手入れ寄りの一年。みんなの収穫力が少し伸びた。',
  },
  // 3. 年次成長 (野生寄り: 回避力UP)
  {
    id: 'yearly_growth_wild',
    from: '*',
    at: '年明け',
    priority: 'default',
    cond: [(_c: Creature, s: GameState) => s.wc > s.tc],
    apply: (c: Creature) => {
      c.db += 3;
    },
    message: '野生寄りの一年。みんなの回避力が少し伸びた。',
  },
];

/**
 * 判定順: 隠し(hidden) → 通常(normal) → 既定(default)
 * 条件を満たす最初のルールを返す
 */
export function checkEvolution(
  c: Creature,
  at: '変身' | '年明け',
  s: GameState
): EvoRule | undefined {
  const candidates = EVO_RULES.filter(
    (r) => r.at === at && (r.from === '*' || r.from === c.sp)
  );

  const priorityOrder = { hidden: 0, normal: 1, default: 2 };
  const sorted = [...candidates].sort(
    (a, b) => priorityOrder[a.priority ?? 'normal'] - priorityOrder[b.priority ?? 'normal']
  );

  return sorted.find((r) => r.cond.every((fn) => fn(c, s)));
}
