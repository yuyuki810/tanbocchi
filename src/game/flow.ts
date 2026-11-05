import { S, setPREV, setBusy, save, log, busy } from './state';
import { yo, R, sl, E } from './calc';
import { paint, party, RM, art } from '../view/scene';
import { ui, sheet, winterH, ask, toast, isChoosing, showWatchBanner } from '../view/ui';
import { plan, play, goalScene, planWatchEvents } from './scenes';
import { checkEvolution } from '../data/evolution';
import { initClockState, advanceClock, getDebugSpeedMultiplier, getSeasonInfo, POSITION_TO_RATIO_MAP } from './clock';
import { SEASON_SECONDS } from '../data/timing';
import { WATCH_EVENTS } from '../data/weatherEvents';
import { updateSeasonAmbient, pauseAmbient, resumeAmbient, playSfx } from '../audio/audio';
import { SeasonName } from '../types';

let autoSaveTimer = 0;
let isSceneActive = false;
let lastSeason: SeasonName | null = null;

export function isBusyPlaying(): boolean {
  return isSceneActive;
}

/**
 * 新しい半期を開始する
 */
export async function startHalf(): Promise<void> {
  if (busy || S.phase !== 'play') return;
  setBusy(true);
  setPREV(JSON.stringify(S));
  ui();

  const h = S.h;
  if (!h && !S.goal) {
    await goalScene();
  }

  // 1. 選ぶ場面の計画
  const pl = plan(h);

  // 2. 選ぶ場面の占有比率を抽出
  const occupiedRatios = Object.keys(pl).map((pos) => POSITION_TO_RATIO_MAP[Number(pos)] ?? 0.5);

  // 3. 眺める出来事のスケジューリング (春夏2回、秋冬2回)
  const watchEvts = planWatchEvents(h, occupiedRatios);

  // 時計の初期化 (開始時は動かす)
  S.clock = initClockState(h, pl, SEASON_SECONDS, false, S.clock?.speed || 1, watchEvts);
  syncWeekWithClock();

  // 環境音の初期化 (春または秋)
  const info = getSeasonInfo(h, S.clock.elapsedSec);
  lastSeason = info.season;
  updateSeasonAmbient(info.season);

  paint();
  ui();
  save();
  setBusy(false);
}

/**
 * 時計の進行に合わせて S.w (週番号 0..12) を同期する
 */
export function syncWeekWithClock(): void {
  if (!S.clock) return;
  const progress = S.clock.totalSec > 0 ? S.clock.elapsedSec / S.clock.totalSec : 0;
  if (S.h === 0) {
    S.w = Math.min(7, Math.floor(progress * 8));
  } else {
    S.w = Math.min(11, 8 + Math.floor(progress * 4));
  }
}

/**
 * 毎フレーム呼ばれる時計の進行ハンドラ
 */
export async function tickClock(dtMs: number): Promise<void> {
  if (S.phase !== 'play' || !S.clock || S.clock.paused || isSceneActive || isChoosing()) {
    return;
  }

  const debugMultiplier = getDebugSpeedMultiplier();
  const res = advanceClock(S.clock, S.h, dtMs, SEASON_SECONDS, debugMultiplier);

  syncWeekWithClock();

  // 季節が切り替わったら環境音をクロスフェード (約2秒)
  if (lastSeason !== res.season) {
    lastSeason = res.season;
    updateSeasonAmbient(res.season);
  }

  // 10秒ごとの定期自動セーブ
  autoSaveTimer += res.deltaSec;
  if (autoSaveTimer >= 10) {
    autoSaveTimer = 0;
    save();
  }

  // 出来事の発火チェック
  if (res.firedEvent) {
    if (res.firedEvent.isWatch) {
      // --- 眺める出来事 (時間を止めない) ---
      const watchDef = WATCH_EVENTS[res.firedEvent.id];
      if (watchDef) {
        watchDef.apply(S, () => Math.random());
        playSfx('watch');
        showWatchBanner(watchDef.title, watchDef.text);
        paint();
        ui();
      }
    } else {
      // --- 選ぶ場面 (時計を一時停止して選択ダイアログ) ---
      isSceneActive = true;
      save();
      try {
        await play(res.firedEvent.id);
      } finally {
        isSceneActive = false;
        if (S.clock) {
          S.clock.activeSceneId = undefined;
          S.clock.paused = false; // 場面解決後に再開
        }
        save();
        paint();
        ui();
      }
      return;
    }
  }

  // 半期末に到達した場合
  if (res.completed) {
    await finishHalf();
  }
}

/**
 * 半期の終了処理
 */
export async function finishHalf(): Promise<void> {
  if (busy || S.phase !== 'play') return;
  setBusy(true);

  // 環境音の停止
  pauseAmbient();

  const h = S.h;
  const to = h ? 12 : 8;
  S.w = to;
  S.water = 1;

  S.cr.forEach((c) => {
    c.age++;
    c.lv = Math.min(9, c.lv + 1);
  });

  // 進化ルール（変身）の適用チェック
  const transformedCreatures: typeof S.cr = [];
  for (const c of S.cr) {
    const evo = checkEvolution(c, '変身', S);
    if (evo) {
      if (evo.to) c.sp = evo.to;
      if (evo.apply) evo.apply(c, S);
      transformedCreatures.push(c);
    }
  }

  if (h) {
    harvest();
    S.phase = 'winter';
    paint();
    save();
    setBusy(false);
    ui();
    return sheet(winterH());
  }

  S.h = 1;
  // 秋冬用の時計を初期化 (停止中)
  const nextPl = plan(1);
  const nextOccupied = Object.keys(nextPl).map((pos) => POSITION_TO_RATIO_MAP[Number(pos)] ?? 0.5);
  const nextWatch = planWatchEvents(1, nextOccupied);
  S.clock = initClockState(1, nextPl, SEASON_SECONDS, true, S.clock?.speed || 1, nextWatch);

  paint();
  save();

  for (const c of transformedCreatures) {
    party();
    await ask(
      '<h2>' +
        E(c.n) +
        'が変身した!</h2><svg viewBox="-30 -18 60 36" style="width:140px;margin:0 auto">' +
        art(c) +
        '</svg><p>オタマジャクシから、立派なカエルになった。</p><button class="go" data-a="close">おめでとう</button>'
    );
  }

  log('夏が終わった。稲が実りはじめた。');
  toast('夏が終わった。稲が実りはじめた');
  setBusy(false);
  ui();
}

/**
 * 一時停止のトグル
 */
export function togglePause(): void {
  if (!S.clock || S.phase !== 'play' || isSceneActive) return;
  S.clock.paused = !S.clock.paused;
  if (S.clock.paused) {
    pauseAmbient();
  } else {
    resumeAmbient();
  }
  save();
  ui();
}

/**
 * 倍速の切り替え (1x / 2x)
 */
export function toggleSpeed(): void {
  if (!S.clock) return;
  S.clock.speed = S.clock.speed === 1 ? 2 : 1;
  ui();
}

/**
 * 半期の進行・再開
 */
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

  // 春夏用の時計を初期化 (停止中)
  const pl = plan(0);
  const occupied = Object.keys(pl).map((pos) => POSITION_TO_RATIO_MAP[Number(pos)] ?? 0.5);
  const watchEvts = planWatchEvents(0, occupied);
  S.clock = initClockState(0, pl, SEASON_SECONDS, true, S.clock?.speed || 1, watchEvts);

  log('春になった。新しい一年がはじまる。');
  save();
  paint();
  ui();
  toast('春になった。新しい一年');
}
