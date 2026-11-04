import { Scene, GoalType, Rng, SceneDef } from '../types';
import { S } from './state';
import { cap, random, sl } from './calc';
import { SCENE_DEFS } from '../data/scenes';
import { choose, toast, closeSheet } from '../view/ui';

export { SCENE_DEFS };

/**
 * 場面を実行する共通処理。
 * choices: [] の「眺める出来事」にも対応。
 */
export async function executeScene(
  def: SceneDef,
  rng: Rng = random
): Promise<void> {
  const target = def.selectTarget ? def.selectTarget(S, rng) : undefined;
  if (def.selectTarget && !target && def.when(S)) {
    return;
  }

  // 天候（wx）場面用の事前フラグ設定（既存互換）
  if (def.id === 'wx') {
    (S as any)._wxIsDrought = rng() < 0.5;
  }

  const title = typeof def.title === 'function' ? def.title(S, target) : def.title;
  const description =
    typeof def.description === 'function' ? def.description(S, target) : def.description;

  // 選択肢が空の場合: 眺める出来事（自動適用）
  if (!def.choices || def.choices.length === 0) {
    if (def.onWatch) {
      await def.onWatch(S, rng);
    }
    return;
  }

  const sc: Scene = {
    t: title,
    x: description,
    c: target,
    o: def.choices.map((ch) => ({
      l: ch.label,
      h: ch.preview ?? '',
      k: ch.kind === 'care' ? 't' : 'w',
      dis: ch.disabled ? ch.disabled(S) : false,
      run: async () => {
        const result = ch.resolve(S, rng, target);
        if (result instanceof Promise) {
          await result;
        } else if (result && typeof result === 'object' && 'effect' in result && result.effect) {
          const eff = result.effect(S, rng);
          if (eff instanceof Promise) await eff;
        }
      },
    })),
  };

  const choiceIdx = await choose(sc);
  const choice = def.choices[choiceIdx];
  if (choice.kind === 'care') {
    S.tc++;
  } else {
    S.wc++;
  }
  closeSheet();

  const opt = sc.o[choiceIdx];
  if (opt.run) {
    await opt.run();
  }
}

export async function play(id: string, rng: Rng = random): Promise<void> {
  const def = SCENE_DEFS[id];
  if (!def) return;
  if (!def.when(S)) return;
  await executeScene(def, rng);
}

export function plan(h: number, rng: Rng = random): Record<number, string> {
  const pos = h ? [9, 11] : [2, 5, 7];
  const n = pos.length;
  const pool = ['wx', 'wish'];
  if (S.cr.length < cap()) pool.push('meet');
  if (!h && S.goal === '増やす' && S.cr.length < cap()) pool.unshift('meet');

  // 未使用変数 ids は完全に削除済み
  const rest = [...new Set(pool)].sort(() => rng() - 0.5);
  if (!h && S.goal === '増やす' && rest.includes('meet')) {
    rest.splice(rest.indexOf('meet'), 1);
    rest.unshift('meet');
  }
  const L: string[] = [];
  L.push(...rest.slice(0, n - 1));
  while (L.length < n - 1) L.push('wx');
  const seq = h ? ['sign', ...L] : [L[0], 'sign', ...L.slice(1)];
  const m: Record<number, string> = {};
  pos.forEach((p, i) => (m[p] = seq[i]));
  return m;
}

export async function goalScene(): Promise<void> {
  const i = await choose({
    t: '今年のめあて',
    x: 'この一年、なにを大切にしますか?',
    o: [
      { l: '守る', h: '回避+8%・誰も失わなければ+300円', k: 't' },
      { l: '増やす', h: '出会いが必ず1回・仲間が増えれば+300円', k: 'w' },
      { l: '稼ぐ', h: '収穫+15%', k: 'w' },
    ],
  });
  S.goal = (['守る', '増やす', '稼ぐ'] as GoalType[])[i];
  closeSheet();
  toast('今年のめあて:' + S.goal);
  await sl(1100);
}
