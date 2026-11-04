import { UnlockItemDef, GameState } from '../types';

export const UNLOCK_ITEMS: UnlockItemDef[] = [
  {
    k: 'net',
    n: '網',
    d: 'サギの気配で選べる。回避+30%',
    p: 400,
    kind: '永続',
    shop: '年度末',
    apply: (s: GameState) => {
      s.own.net = 1;
    },
  },
  {
    k: 'hide',
    n: 'わら束',
    d: '隠れ場所。常に回避+12%',
    p: 500,
    kind: '永続',
    shop: '年度末',
    apply: (s: GameState) => {
      s.own.hide = 1;
    },
  },
  {
    k: 'eye',
    n: '観察眼',
    d: '個体の回避率が見える',
    p: 600,
    kind: '永続',
    shop: '年度末',
    apply: (s: GameState) => {
      s.own.eye = 1;
    },
  },
  {
    k: 'seed',
    n: '良い稲の品種',
    d: '収穫+15%',
    p: 800,
    kind: '永続',
    shop: '年度末',
    apply: (s: GameState) => {
      s.own.seed = 1;
    },
  },
  {
    k: 'field',
    n: '田んぼを広げる',
    d: '飼える数が+1(いま上限匹)',
    p: (s: GameState) => 600 + 300 * (s.own.field || 0),
    kind: '永続',
    shop: '年度末',
    maxCount: 3,
    condition: (s: GameState) => (s.own.field || 0) < 3,
    apply: (s: GameState) => {
      s.own.field = (s.own.field || 0) + 1;
    },
  },
];

// 既存互換用配列（field以外）
export const SHOP = UNLOCK_ITEMS.filter((i) => i.k !== 'field');

// 解放アイテム購入共通処理
export function buyUnlockItem(
  k: string,
  s: GameState
): { success: boolean; item?: UnlockItemDef; message?: string } {
  const item = UNLOCK_ITEMS.find((i) => i.k === k);
  if (!item) return { success: false };
  const cost = typeof item.p === 'function' ? item.p(s) : item.p;
  if (s.money < cost) return { success: false, item };
  if (item.condition && !item.condition(s)) return { success: false, item };
  s.money -= cost;
  item.apply(s);
  return { success: true, item };
}
