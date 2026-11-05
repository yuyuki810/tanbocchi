import { SceneDef, WatchEventDef, GameState, Rng } from '../types';
import { toast } from '../view/ui';
import { paint } from '../view/scene';
import { sl } from '../game/calc';

/**
 * 選ぶ出来事 (5個)
 * 手入れ(care)は安全、野生(wild)は賭け(個体は失わない)
 */
export const WEATHER_CHOICE_EVENTS: Record<string, SceneDef> = {
  wx_spring_rain: {
    id: 'wx_spring_rain',
    title: '菜種梅雨',
    description: 'しとしと雨が続いて、田んぼの水が増えてきた。',
    seasons: ['春'],
    when: () => true,
    weight: 1,
    tags: ['weather', 'season'],
    choices: [
      {
        id: 'drain',
        kind: 'care',
        label: '水口を開けて、水を逃がす',
        preview: '安全',
        resolve: async (s: GameState) => {
          s.water = 1;
          paint();
          toast('水口を整えた。水加減はちょうどいい');
          await sl(1200);
        },
      },
      {
        id: 'leave',
        kind: 'wild',
        label: '雨に任せる',
        preview: '賭け・恵みか増水か',
        resolve: async (s: GameState, rng: Rng) => {
          if (rng() < 0.6) {
            s.nut += 2;
            toast('雨が養分を運んできた。養分+2');
          } else {
            s.water = 2;
            paint();
            toast('水が深くなった');
          }
          await sl(1400);
        },
      },
    ],
  },

  wx_spring_frost: {
    id: 'wx_spring_frost',
    title: '遅霜',
    description: '思いがけない霜が降りた。朝の田んぼが、白く光っている。',
    seasons: ['春'],
    when: () => true,
    weight: 1,
    tags: ['weather', 'season'],
    choices: [
      {
        id: 'straw',
        kind: 'care',
        label: 'わらをかけて覆う',
        preview: '安全',
        resolve: async (s: GameState) => {
          s.cr.forEach((c) => {
            c.lv = Math.min(9, c.lv + 1);
          });
          toast('わらで覆った。みんな温かそう。なつき+1');
          await sl(1200);
        },
      },
      {
        id: 'nature',
        kind: 'wild',
        label: '自然のままに任せる',
        preview: '賭け・耐えるか冷えるか',
        resolve: async (s: GameState, rng: Rng) => {
          if (rng() < 0.5) {
            s.cr.forEach((c) => {
              c.db += 1;
            });
            toast('寒さを乗り越えてたくましくなった!回避+1%');
          } else {
            s.hm -= 0.02;
            toast('少し冷え込んだ。稲が寒さに耐えている。収穫-2%');
          }
          await sl(1400);
        },
      },
    ],
  },

  wx_summer_heat: {
    id: 'wx_summer_heat',
    title: '猛暑',
    description: '照りつける日差しで、水がぬるくなってきた。',
    seasons: ['夏'],
    when: () => true,
    weight: 1,
    tags: ['weather', 'season'],
    choices: [
      {
        id: 'cool',
        kind: 'care',
        label: '水を足して冷ます',
        preview: '安全',
        resolve: async (s: GameState) => {
          s.water = 1;
          s.cr.forEach((c) => {
            c.lv = Math.min(9, c.lv + 1);
          });
          paint();
          toast('冷たい水を足した。生き物たちは気持ちよさそう');
          await sl(1200);
        },
      },
      {
        id: 'shade',
        kind: 'wild',
        label: '日陰に任せる',
        preview: '賭け・たくましさか水温上昇か',
        resolve: async (s: GameState, rng: Rng) => {
          if (rng() < 0.6) {
            s.cr.forEach((c) => {
              c.yb += 1;
            });
            toast('日差しを浴びて稲が育つ!収穫力+1');
          } else {
            s.water = 0;
            paint();
            toast('水が減ってきた。水深が浅くなった');
          }
          await sl(1400);
        },
      },
    ],
  },

  wx_autumn_rain: {
    id: 'wx_autumn_rain',
    title: '秋雨',
    description: '長い秋の雨。水路があふれそうだ。',
    seasons: ['秋'],
    when: () => true,
    weight: 1,
    tags: ['weather', 'season'],
    choices: [
      {
        id: 'clear',
        kind: 'care',
        label: '水路を整える',
        preview: '安全',
        resolve: async (s: GameState) => {
          s.water = 1;
          paint();
          toast('水路の泥をかき出した。水がさらさら流れる');
          await sl(1200);
        },
      },
      {
        id: 'rain',
        kind: 'wild',
        label: '雨に任せる',
        preview: '賭け・潤いか濁りか',
        resolve: async (s: GameState, rng: Rng) => {
          if (rng() < 0.55) {
            s.nut += 2;
            toast('秋の恵みの雨。養分+2');
          } else {
            s.water = 2;
            paint();
            toast('水路の水があふれそうになった。水が深くなった');
          }
          await sl(1400);
        },
      },
    ],
  },

  wx_winter_ice: {
    id: 'wx_winter_ice',
    title: '霜と氷',
    description: '朝、田んぼの隅に薄い氷が張っていた。',
    seasons: ['冬'],
    when: () => true,
    weight: 1,
    tags: ['weather', 'season'],
    choices: [
      {
        id: 'break',
        kind: 'care',
        label: '氷を割って、空気を入れる',
        preview: '安全',
        resolve: async (s: GameState) => {
          s.cr.forEach((c) => {
            c.lv = Math.min(9, c.lv + 1);
          });
          toast('氷を割って空気を通した。みんな安心している');
          await sl(1200);
        },
      },
      {
        id: 'watch',
        kind: 'wild',
        label: 'そっと見守る',
        preview: '賭け・じっと耐えるか',
        resolve: async (s: GameState, rng: Rng) => {
          if (rng() < 0.6) {
            s.cr.forEach((c) => {
              c.db += 1;
            });
            toast('氷の下で静かに冬を過ごしている。回避+1%');
          } else {
            s.nut = Math.max(0, s.nut - 1);
            toast('冬の寒さがしみる。養分-1');
          }
          await sl(1400);
        },
      },
    ],
  },
};

/**
 * 眺める出来事 (5個)
 * 選択肢なし、時間は止めず画面通知で自動適用
 */
export const WATCH_EVENTS: Record<string, WatchEventDef> = {
  watch_petals: {
    id: 'watch_petals',
    title: '花びらが水面に',
    text: '桜の花びらが、水面をゆっくり流れていく。',
    season: '春',
    apply: (s: GameState) => {
      s.cr.forEach((c) => {
        c.lv = Math.min(9, c.lv + 1);
      });
    },
  },

  watch_shower: {
    id: 'watch_shower',
    title: '夕立',
    text: 'ぱらぱらと夕立。水面に、小さな輪がいくつも広がった。',
    season: '夏',
    apply: (s: GameState) => {
      s.water = Math.min(2, s.water + 1);
      s.nut += 1;
    },
  },

  watch_firefly: {
    id: 'watch_firefly',
    title: 'ホタルの夜',
    text: '夜の畦道に、ふわり、ふわりと光が灯った。',
    season: '夏',
    apply: (s: GameState) => {
      s.cr.forEach((c) => {
        c.lv = Math.min(9, c.lv + 1);
      });
    },
  },

  watch_mist: {
    id: 'watch_mist',
    title: '朝霧と黄金の稲穂',
    text: '朝霧の向こうで、稲穂が金色に揺れている。',
    season: '秋',
    apply: (s: GameState) => {
      s.cr.forEach((c) => {
        c.lv = Math.min(9, c.lv + 1);
      });
    },
  },

  watch_first_snow: {
    id: 'watch_first_snow',
    title: '初雪',
    text: '初雪が、静かな田んぼに降りはじめた。',
    season: '冬',
    apply: () => {
      // 効果なし（静けさ）
    },
  },
};
