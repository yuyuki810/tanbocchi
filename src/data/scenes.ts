import { SceneDef, GameState, Creature, SpeciesName, Rng } from '../types';
import { cap, pick, sl, E } from '../game/calc';
import { SP } from './species';
import { add, log } from '../game/state';
import { strike, party, paint } from '../view/scene';
import { toast, ask } from '../view/ui';
import { WEATHER_CHOICE_EVENTS } from './weatherEvents';

export const BASE_SCENE_DEFS: Record<string, SceneDef> = {
  sign: {
    id: 'sign',
    title: 'サギの気配',
    description: (_s: GameState, c?: Creature) =>
      '水辺に白い影。' + (c ? c.n : '') + 'の近くをねらっているようだ。',
    seasons: ['春夏', '秋冬'],
    when: (s: GameState) => s.cr.length > 0,
    weight: 1,
    tags: ['predator'],
    selectTarget: (s: GameState, rng: Rng) => pick(s.cr, rng),
    choices: [
      {
        id: 'net',
        kind: 'care',
        label: '網を張る',
        preview: '安全',
        disabled: (s: GameState) => !s.own.net,
        disabledReason: '網を解放すると選べる',
        resolve: async (_s: GameState, _rng: Rng, c?: Creature) => {
          if (c) await strike(c, 30);
        },
      },
      {
        id: 'hide',
        kind: 'care',
        label: '隠れ場所へ誘う',
        preview: 'やや安全',
        resolve: async (_s: GameState, _rng: Rng, c?: Creature) => {
          if (c) await strike(c, 15);
        },
      },
      {
        id: 'watch',
        kind: 'wild',
        label: '見守る',
        preview: '賭け・守れたら成長',
        resolve: async (_s: GameState, _rng: Rng, c?: Creature) => {
          if (c) await strike(c, 0, 1);
        },
      },
    ],
  },

  meet: {
    id: 'meet',
    title: '出会い',
    description: (s: GameState) => {
      const rare = s.wc > s.tc;
      return (
        '見知らぬ' +
        (rare ? '珍しい' : '') +
        '卵が流れ着いた。迎えますか?(いま' +
        s.cr.length +
        '/' +
        cap() +
        '匹)'
      );
    },
    seasons: ['春夏', '秋冬'],
    when: (s: GameState) => s.cr.length < cap(),
    weight: 1,
    tags: ['encounter'],
    choices: [
      {
        id: 'welcome',
        kind: 'wild',
        label: '迎える',
        preview: '仲間が増える',
        resolve: async (s: GameState, rng: Rng) => {
          const rare = s.wc > s.tc;
          const ks = Object.keys(SP) as SpeciesName[];
          const sp = pick(ks.filter((name) => !s.dex.includes(name)).concat(ks), rng);
          add(sp, rare, rng);
          const n = s.cr[s.cr.length - 1];
          const nw = !s.dex.includes(sp);
          if (nw) s.dex.push(sp);
          log(n.n + '(' + sp + ')が仲間になった。');
          party();
          toast(n.n + 'が仲間になった!' + (nw ? '図鑑に' + sp + 'が加わった' : ''));
          await sl(1800);
        },
      },
      {
        id: 'pass',
        kind: 'care',
        label: 'そっとしておく',
        preview: 'いまの仲間に集中',
        resolve: async () => {
          toast('そっと見送った');
          await sl(900);
        },
      },
    ],
  },

  wx: {
    id: 'wx',
    title: (s: GameState) => ((s as any)._wxIsDrought ? '日照り' : '大雨'),
    description: (s: GameState) =>
      (s as any)._wxIsDrought
        ? '水が減り、稲の根が乾いてきた。'
        : '雨が続き、水があふれそうだ。',
    seasons: ['春夏', '秋冬'],
    when: () => true,
    weight: 1,
    tags: ['weather'],
    choices: [
      {
        id: 'adjust',
        kind: 'care',
        label: '水位を調整する',
        preview: '安全',
        resolve: async () => {
          toast('水位を整えた。稲は無事');
          await sl(1200);
        },
      },
      {
        id: 'natural',
        kind: 'wild',
        label: '自然に任せる',
        preview: '賭け・恵みか不作か',
        resolve: async (s: GameState, rng: Rng) => {
          const d = Boolean((s as any)._wxIsDrought);
          if (rng() < 0.55) {
            s.nut += 8;
            toast('恵みの' + (d ? '水' : '雨') + '。養分+8');
          } else {
            s.hm -= 0.08;
            s.water = d ? 0 : 2;
            toast('稲に負担がかかった。収穫-8%');
          }
          paint();
          await sl(1700);
        },
      },
    ],
  },

  wish: {
    id: 'wish',
    title: (_s: GameState, c?: Creature) => (c ? c.n : '') + 'の願い',
    description: (_s: GameState, c?: Creature) =>
      (c ? c.n : '') + 'が、遠くへ行きたそうに水面を見ている。',
    seasons: ['春夏', '秋冬'],
    when: (s: GameState) => s.cr.length > 0,
    weight: 1,
    tags: ['creature'],
    selectTarget: (s: GameState, rng: Rng) => pick(s.cr, rng),
    choices: [
      {
        id: 'send',
        kind: 'wild',
        label: '送り出す',
        preview: '賭け・帰らないかも',
        resolve: async (s: GameState, rng: Rng, c?: Creature) => {
          if (!c) return;
          if (rng() < 0.65) {
            c.db += 3;
            c.lv = Math.min(9, c.lv + 1);
            s.money += 120;
            log(c.n + 'が宝物を持って帰ってきた。');
            party();
            toast(c.n + 'が帰ってきた!宝物+120円・回避力アップ');
            await sl(1900);
          } else {
            s.cr = s.cr.filter((x) => x !== c);
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
        id: 'stay',
        kind: 'care',
        label: '一緒にいる',
        preview: '安全・なつき度+2',
        resolve: async (_s: GameState, _rng: Rng, c?: Creature) => {
          if (!c) return;
          c.lv = Math.min(9, c.lv + 2);
          toast(c.n + 'はうれしそう。なつき度+2');
          await sl(1400);
        },
      },
      {
        id: 'stop',
        kind: 'care',
        label: '止める',
        preview: '安全・収穫力+1',
        resolve: async (_s: GameState, _rng: Rng, c?: Creature) => {
          if (!c) return;
          c.yb += 1;
          toast(c.n + 'は稲のそばで落ち着いた。収穫力+1');
          await sl(1400);
        },
      },
    ],
  },
};

// 新しい天気・季節の選ぶ出来事 (5個) をマージ
export const SCENE_DEFS: Record<string, SceneDef> = {
  ...BASE_SCENE_DEFS,
  ...WEATHER_CHOICE_EVENTS,
};
