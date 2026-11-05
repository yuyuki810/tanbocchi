import { Scene, GoalType, Rng, SceneDef } from '../types';
import { S } from './state';
import { cap, random, sl } from './calc';
import { SCENE_DEFS } from '../data/scenes';
import { choose, toast, closeSheet } from '../view/ui';
import { playSfx } from '../audio/audio';

export { SCENE_DEFS };

export const WATCH_EVENT_COUNTS = {
  春夏: 2,
  秋冬: 2,
};

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

  // 場面出現音
  playSfx('scene');

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
        // 選択決定音
        playSfx('choice');
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

/**
 * 選ぶ場面の計画
 * poolMode: 'classic' は既存ゴールデンマスター互換 (新天気イベントを含まない)
 * poolMode: 'with_weather' は新天気イベントを含む (通常ゲームプレイ)
 */
export function plan(
  h: number,
  rng: Rng = random,
  poolMode: 'classic' | 'with_weather' = 'with_weather'
): Record<number, string> {
  const pos = h ? [9, 11] : [2, 5, 7];
  const n = pos.length;
  const pool = ['wx', 'wish'];

  if (poolMode === 'with_weather') {
    if (!h) {
      // 春夏
      pool.push('wx_spring_rain', 'wx_spring_frost', 'wx_summer_heat');
    } else {
      // 秋冬
      pool.push('wx_autumn_rain', 'wx_winter_ice');
    }
  }

  if (S.cr.length < cap()) pool.push('meet');
  if (!h && S.goal === '増やす' && S.cr.length < cap()) pool.unshift('meet');

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

/**
 * 眺める出来事のスケジューリング (春夏2回、秋冬2回)
 * 他の出来事と 0.08 以上離す
 */
export function planWatchEvents(
  h: number,
  occupiedRatios: number[],
  rng: Rng = random
): Array<{ id: string; ratio: number }> {
  const results: Array<{ id: string; ratio: number }> = [];

  function pickSafeRatio(minR: number, maxR: number, defaultR: number): number {
    for (let attempts = 0; attempts < 15; attempts++) {
      const candidate = minR + rng() * (maxR - minR);
      const isFarEnough =
        occupiedRatios.every((r) => Math.abs(r - candidate) >= 0.08) &&
        results.every((r) => Math.abs(r.ratio - candidate) >= 0.08);
      if (isFarEnough) {
        return Math.round(candidate * 1000) / 1000;
      }
    }
    return defaultR;
  }

  if (!h) {
    // 春夏: 春1回、夏1回
    const rSpring = pickSafeRatio(0.06, 0.44, 0.15);
    results.push({ id: 'watch_petals', ratio: rSpring });

    const summerEvents = ['watch_shower', 'watch_firefly'];
    const chosenSummer = summerEvents[Math.floor(rng() * summerEvents.length)];
    const rSummer = pickSafeRatio(0.56, 0.94, 0.75);
    results.push({ id: chosenSummer, ratio: rSummer });
  } else {
    // 秋冬: 秋1回、冬1回
    const rAutumn = pickSafeRatio(0.06, 0.44, 0.15);
    results.push({ id: 'watch_mist', ratio: rAutumn });

    const rWinter = pickSafeRatio(0.56, 0.94, 0.75);
    results.push({ id: 'watch_first_snow', ratio: rWinter });
  }

  return results;
}

export async function goalScene(): Promise<void> {
  playSfx('scene');
  const i = await choose({
    t: '今年のめあて',
    x: 'この一年、なにを大切にしますか?',
    o: [
      { l: '守る', h: '回避+8%・誰も失わなければ+300円', k: 't' },
      { l: '増やす', h: '出会いが必ず1回・仲間が増えれば+300円', k: 'w' },
      { l: '稼ぐ', h: '収穫+15%', k: 'w' },
    ],
  });
  playSfx('choice');
  S.goal = (['守る', '増やす', '稼ぐ'] as GoalType[])[i];
  closeSheet();
  toast('今年のめあて:' + S.goal);
  await sl(1100);
}
