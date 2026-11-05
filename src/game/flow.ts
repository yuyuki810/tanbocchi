import { S, setPREV, setBusy, save, log, busy } from './state';
import { yo, R, sl, E } from './calc';
import { paint, party, RM, art } from '../view/scene';
import { ui, sheet, winterH, ask, toast } from '../view/ui';
import { plan, play, goalScene } from './scenes';
import { checkEvolution } from '../data/evolution';

export async function half(): Promise<void> {
  if (!S.clock || S.clock.events.length === 0 || S.clock.elapsedSec >= S.clock.totalSec) {
    await startHalf();
  } else if (S.clock.paused) {
    togglePause();
  }
}

export function harvest(): void {
  const k = new Set(S.cr.map((c) => c.sp)).size;
  const a = S.cr.reduce((s, c) => s + yo(c), 0) * 3;
  const b = Math.floor(S.nut / 2);
  const c5 = k * 5;
  let r = 30 + a + b + c5;
  r *= (1 + S.hm) * (S.own.seed ? 1.15 : 1) * (S.goal === '稼ぐ' ? 1.15 : 1);
  const v = S.wc > S.tc ? 0.3 : 0.05;
  const f = 1 + R(-v, v);
  r = Math.round(r * f);
  let gm = '';
  S.money += r * 10;
  if (S.goal === '守る' && !S.dead.length) {
    S.money += 300;
    gm = 'めあて「守る」達成!誰も失わなかった。+300円';
  }
  if (S.goal === '増やす' && S.cr.length > S.startN) {
    S.money += 300;
    gm = 'めあて「増やす」達成!仲間が増えた。+300円';
  }
  if (S.goal === '稼ぐ') gm = 'めあて「稼ぐ」:収穫+15%が効いた';
  S.last = { r, g: f > 1.15 ? '大豊作' : f < 0.85 ? '不作' : '平年作', a, b, c: c5, gm };
  log('収穫:米' + r + 'kg(' + S.last.g + ')→' + r * 10 + '円');
}

export function spring(): void {
  setPREV(JSON.stringify(S));
  const tend = S.tc >= S.wc;

  // 年次進化（成長）ルールの適用
  S.cr.forEach((c) => {
    c.yrs++;
    const evo = checkEvolution(c, '年明け', S);
    if (evo && evo.apply) {
      evo.apply(c, S);
    } else {
      tend ? c.yb++ : (c.db += 3);
    }
  });

  if (S.cr.length)
    log(
      tend
        ? '手入れ寄りの一年。みんなの収穫力が少し伸びた。'
        : '野生寄りの一年。みんなの回避力が少し伸びた。'
    );
  S.y++;
  S.h = 0;
  S.w = 0;
  S.nut = Math.floor(S.nut / 2);
  S.dead = [];
  S.tc = 0;
  S.wc = 0;
  S.hm = 0;
  S.goal = null;
  S.startN = S.cr.length;
  S.water = 1;
  S.phase = 'play';
  log('春になった。新しい一年がはじまる。');
  save();
  paint();
  ui();
  toast('春になった。新しい一年');
}
