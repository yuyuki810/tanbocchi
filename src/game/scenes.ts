import { Scene, SpeciesName, GoalType } from '../types';
import { S, add, log } from './state';
import { cap, pick, sl, E } from './calc';
import { SP } from '../data/species';
import { strike, party, paint } from '../view/scene';
import { choose, toast, ask, closeSheet } from '../view/ui';

export const SC = {
  sign(): Scene | undefined {
    const c = pick(S.cr);
    if (!c) return;
    return {
      t: 'サギの気配',
      x: '水辺に白い影。' + c.n + 'の近くをねらっているようだ。',
      c,
      o: [
        { l: '網を張る', h: '安全', k: 't', dis: !S.own.net, run: () => strike(c, 30) },
        { l: '隠れ場所へ誘う', h: 'やや安全', k: 't', run: () => strike(c, 15) },
        { l: '見守る', h: '賭け・守れたら成長', k: 'w', run: () => strike(c, 0, 1) },
      ],
    };
  },
  meet(): Scene | undefined {
    if (S.cr.length >= cap()) return;
    const rare = S.wc > S.tc;
    return {
      t: '出会い',
      x:
        '見知らぬ' +
        (rare ? '珍しい' : '') +
        '卵が流れ着いた。迎えますか?(いま' +
        S.cr.length +
        '/' +
        cap() +
        '匹)',
      o: [
        {
          l: '迎える',
          h: '仲間が増える',
          k: 'w',
          run: async () => {
            const ks = Object.keys(SP) as SpeciesName[];
            const sp = pick(ks.filter((s) => !S.dex.includes(s)).concat(ks));
            add(sp, rare);
            const n = S.cr[S.cr.length - 1];
            const nw = !S.dex.includes(sp);
            if (nw) S.dex.push(sp);
            log(n.n + '(' + sp + ')が仲間になった。');
            party();
            toast(n.n + 'が仲間になった!' + (nw ? '図鑑に' + sp + 'が加わった' : ''));
            await sl(1800);
          },
        },
        {
          l: 'そっとしておく',
          h: 'いまの仲間に集中',
          k: 't',
          run: async () => {
            toast('そっと見送った');
            await sl(900);
          },
        },
      ],
    };
  },
  wx(): Scene {
    const d = Math.random() < 0.5;
    return {
      t: d ? '日照り' : '大雨',
      x: d ? '水が減り、稲の根が乾いてきた。' : '雨が続き、水があふれそうだ。',
      o: [
        {
          l: '水位を調整する',
          h: '安全',
          k: 't',
          run: async () => {
            toast('水位を整えた。稲は無事');
            await sl(1200);
          },
        },
        {
          l: '自然に任せる',
          h: '賭け・恵みか不作か',
          k: 'w',
          run: async () => {
            if (Math.random() < 0.55) {
              S.nut += 8;
              toast('恵みの' + (d ? '水' : '雨') + '。養分+8');
            } else {
              S.hm -= 0.08;
              S.water = d ? 0 : 2;
              toast('稲に負担がかかった。収穫-8%');
            }
            paint();
            await sl(1700);
          },
        },
      ],
    };
  },
  wish(): Scene | undefined {
    const c = pick(S.cr);
    if (!c) return;
    return {
      t: c.n + 'の願い',
      x: c.n + 'が、遠くへ行きたそうに水面を見ている。',
      c,
      o: [
        {
          l: '送り出す',
          h: '賭け・帰らないかも',
          k: 'w',
          run: async () => {
            if (Math.random() < 0.65) {
              c.db += 3;
              c.lv = Math.min(9, c.lv + 1);
              S.money += 120;
              log(c.n + 'が宝物を持って帰ってきた。');
              party();
              toast(c.n + 'が帰ってきた!宝物+120円・回避力アップ');
              await sl(1900);
            } else {
              S.cr = S.cr.filter((x) => x !== c);
              log(c.n + 'は旅立ったまま帰らなかった。');
              paint();
              await ask(
                '<h2>' +
                  E(c.n) +
                  'は旅立った</h2><p>遠くへ行ったまま、帰ってこなかった。</p><p class="mu">いつか、どこかの田んぼで会えるかもしれない。</p><button class="go" data-a="close">見送る</button>'
              );
            }
          },
        },
        {
          l: '一緒にいる',
          h: '安全・なつき度+2',
          k: 't',
          run: async () => {
            c.lv = Math.min(9, c.lv + 2);
            toast(c.n + 'はうれしそう。なつき度+2');
            await sl(1400);
          },
        },
        {
          l: '止める',
          h: '安全・収穫力+1',
          k: 't',
          run: async () => {
            c.yb += 1;
            toast(c.n + 'は稲のそばで落ち着いた。収穫力+1');
            await sl(1400);
          },
        },
      ],
    };
  },
};

export async function play(id: string): Promise<void> {
  const scFunc = SC[id as keyof typeof SC];
  if (!scFunc) return;
  const sc = scFunc();
  if (!sc) return;
  const i = await choose(sc);
  const o = sc.o[i];
  o.k === 't' ? S.tc++ : S.wc++;
  closeSheet();
  if (o.run) await o.run();
}

export function plan(h: number): Record<number, string> {
  const pos = h ? [9, 11] : [2, 5, 7];
  const n = pos.length;
  const pool = ['wx', 'wish'];
  if (S.cr.length < cap()) pool.push('meet');
  if (!h && S.goal === '増やす' && S.cr.length < cap()) pool.unshift('meet');

  const rest = [...new Set(pool)].sort(() => Math.random() - 0.5);
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
