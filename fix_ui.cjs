// fix_ui.js
const fs = require('fs');

const content = `import { Creature, Scene } from '../types';
import { S, PREV, busy, rsf } from '../game/state';
import { dodge, E, cap, tad } from '../game/calc';
import { art, paint } from './scene';
import { SHOP } from '../data/shop';
import { getSeasonInfo } from '../game/clock';

let SR: (() => void) | null = null;
let CH: ((idx: number) => void) | null = null;
let tt: any;

function getEl<T extends HTMLElement | SVGElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(\`Element #\${id} not found\`);
  return el as unknown as T;
}

export function isChoosing(): boolean {
  return CH !== null;
}

export function resolveChoose(idx: number): void {
  if (CH) {
    const r = CH;
    CH = null;
    r(idx);
  }
}

export function toast(m: string): void {
  const t = getEl<HTMLElement>('toast');
  t.textContent = m;
  t.classList.add('on');
  clearTimeout(tt);
  tt = setTimeout(() => t.classList.remove('on'), 2600);
}

export function sheet(h: string): void {
  getEl<HTMLElement>('sh').innerHTML = '<div class="sc">' + h + '</div>';
  getEl<HTMLElement>('sb').classList.add('on');
}

export function closeSheet(): void {
  getEl<HTMLElement>('sb').classList.remove('on');
  if (SR) {
    const r = SR;
    SR = null;
    r();
  }
}

export const ask = (h: string): Promise<void> =>
  new Promise((r) => {
    SR = r;
    sheet(h);
  });

export const choose = (sc: Scene): Promise<number> =>
  new Promise((r) => {
    CH = r;
    sheet(
      '<h2>' +
        E(sc.t) +
        '</h2>' +
        (sc.c
          ? '<svg viewBox="-30 -18 60 36" style="width:96px;margin:0 auto">' + art(sc.c) + '</svg>'
          : '') +
        '<p>' +
        E(sc.x) +
        '</p>' +
        sc.o
          .map(
            (o, i) =>
              '<button class="opt ' +
              o.k +
              '" data-o="' +
              i +
              '" ' +
              (o.dis ? 'disabled' : '') +
              '><b>' +
              E(o.l) +
              '</b><br><span class="t">' +
              (o.k === 't' ? '手入れ' : '野生') +
              '・' +
              E(o.dis ? '網を解放すると選べる' : o.h) +
              '</span></button>'
          )
          .join('')
    );
  });

export function crH(c: Creature): string {
  return (
    '<h2>' +
    E(c.n) +
    '</h2><svg viewBox="-30 -18 60 36" style="width:120px;margin:0 auto">' +
    art(c) +
    '</svg><p><input data-n="' +
    c.id +
    '" value="' +
    E(c.n) +
    '" maxlength="8" aria-label="名前" style="width:100%;padding:8px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx)"></p>' +
    '<p>' +
    c.sp +
    (tad(c) ? '(オタマ)' : '') +
    ' / ' +
    c.yrs +
    '歳 / なつき度♥' +
    c.lv +
    '</p><p class="g">長所:' +
    c.g.map((t) => t[0] + '(' + t[3] + ')').join('、') +
    '</p><p class="b">短所:' +
    c.b[0] +
    '(' +
    c.b[3] +
    ')</p>' +
    (S.own.eye
      ? '<p>いまの回避率:' + dodge(c) + '%</p>'
      : '<p class="mu">冬に「観察眼」を解放すると回避率が見えます。</p>') +
    '<p class="mu">半年をともに過ごすと、なつき度が上がります。なつくほど、食べられたときの養分が増えます。</p><button class="go" data-a="close">閉じる</button>'
  );
}

export const guideH =
  '<h2>はじめかた</h2><p>1. 「半年を進める」を押すと、時間が流れます。</p><p>2. 途中で判断の場面が2〜3回。選択肢の「手入れ」「野生」と予告を見て選びます。</p><p>3. 守れたら大きく祝い、食べられたら稲穂の札になります。生き物をタップすると長所と短所が見えます。</p><button class="go" data-a="close">はじめる</button>';

export function ui(): void {
  const n = S.tc + S.wc;
  const wp = n ? Math.round((S.wc / n) * 100) : 50;

  // 季節と進行度 (フェーズ2A: 時計連動)
  let seasonLabel = S.phase === 'winter' ? '冬' : S.h ? '秋冬' : '春夏';
  let progressPct = 0;
  let isClockPaused = false;
  let clockSpeed = 1;

  if (S.clock && S.phase === 'play') {
    const info = getSeasonInfo(S.h, S.clock.elapsedSec);
    seasonLabel = info.season;
    progressPct = Math.round(info.halfProgress * 100);
    isClockPaused = S.clock.paused;
    clockSpeed = S.clock.speed;
  }

  getEl<HTMLElement>('hud').innerHTML =
    '<span class="pill">' +
    S.y +
    '年目・' +
    seasonLabel +
    (isClockPaused && S.clock && S.clock.elapsedSec > 0 && S.clock.elapsedSec < S.clock.totalSec
      ? '<span class="pause-indicator">一時停止中</span>'
      : '') +
    '</span><div class="dots">' +
    Array.from({ length: 12 }, (_, i) => '<i class="' + (i < S.w ? 'd' : '') + '"></i>').join('') +
    '</div><span class="mu">' +
    S.money +
    '円 / 養分' +
    S.nut +
    '</span>' +
    (S.clock && S.phase === 'play' && S.clock.totalSec > 0
      ? '<div class="season-bar" style="width:100%"><div class="season-bar-fill" style="width:' +
        progressPct +
        '%"></div></div>'
      : '');

  getEl<HTMLElement>('chips').innerHTML =
    S.cr
      .map(
        (c) =>
          '<button class="chip" data-i="' +
          c.id +
          '"><svg viewBox="-28 -16 56 32">' +
          art(c) +
          '</svg><b>' +
          E(c.n) +
          '</b><span class="mu">♥' +
          c.lv +
          '</span></button>'
      )
      .join('') || '<span class="mu">生き物はいません。</span>';

  getEl<HTMLElement>('info').innerHTML =
    '<div class="card"><h3>今年のスタイル' +
    (S.goal ? '(めあて:' + S.goal + ')' : '') +
    '</h3><div class="bar"><i style="left:calc(' +
    wp +
    '% - 2px)"></i></div><div class="mu" style="display:flex;justify-content:space-between"><span>手入れ ' +
    S.tc +
    '</span><span>野生 ' +
    S.wc +
    '</span></div><p>' +
    (n
      ? S.tc >= S.wc
        ? '手入れ寄り:収穫は安定し、年明けに収穫力が伸びます。'
        : '野生寄り:収穫は大きくブレる反面、年明けに回避力が伸び、珍しい出会いもあります。'
      : '場面での選択が、この田んぼのスタイルをつくります。') +
    '</p></div>';

  // ドックのレンダリング (半期開始前か時間進行中かで安全に切り替え)
  if (S.phase === 'winter') {
    getEl<HTMLElement>('dock').innerHTML =
      '<button class="go" data-a="winter">冬のじかんを開く</button>';
  } else if (!S.clock || S.clock.events.length === 0 || S.clock.elapsedSec >= S.clock.totalSec) {
    getEl<HTMLElement>('dock').innerHTML =
      '<button class="go" data-a="half" ' +
      (busy ? 'disabled' : '') +
      '>半年を進める(' +
      (S.h ? '秋冬' : '春夏') +
      ')</button>';
  } else {
    getEl<HTMLElement>('dock').innerHTML =
      '<div class="clock-dock">' +
      '<button class="go clock-btn" data-a="toggle-pause">' +
      (isClockPaused ? '▶ 再開' : '⏸ 一時停止') +
      '</button>' +
      '<button class="speed-btn" data-a="toggle-speed">' +
      (clockSpeed === 2 ? '×2' : '×1') +
      '</button>' +
      '</div>';
  }
}

export function refresh(): void {
  paint();
  ui();
}

export function winterH(): string {
  const L = S.last;
  if (!L) return '';
  return (
    '<h2>冬のじかん</h2><p>収穫は米' +
    L.r +
    'kg(<b>' +
    L.g +
    '</b>)で' +
    L.r * 10 +
    '円。</p><p class="mu">内訳:基本30+生き物の力' +
    L.a +
    '+養分' +
    L.b +
    '+種類のボーナス' +
    L.c +
    '。' +
    (S.wc > S.tc ? '野生寄りで結果は大きくブレた。' : '手入れ寄りで結果は安定。') +
    '</p>' +
    (L.gm ? '<p class="g">' + L.gm + '</p>' : '') +
    (S.dead.length
      ? '<p class="b">今年、食べられた子:' +
        S.dead.map((d) => E(d.n) + '(' + d.sp + '・♥' + d.lv + ')').join('、') +
        '。名前は稲穂の札として残る。</p>'
      : '<p class="g">今年は誰も食べられなかった。</p>') +
    '<h2 style="margin-top:14px">解放する(所持' +
    S.money +
    '円)</h2>' +
    SHOP.map(
      (i) => {
        const cost = typeof i.p === 'function' ? i.p(S) : i.p;
        return (
          '<div class="shop"><div><b>' +
          i.n +
          '</b><br><span class="mu">' +
          i.d +
          '</span></div><button data-b="' +
          i.k +
          '" ' +
          (S.own[i.k] || S.money < cost ? 'disabled' : '') +
          '>' +
          (S.own[i.k] ? '解放済み' : cost + '円') +
          '</button></div>'
        );
      }
    ).join('') +
    '<div class="shop"><div><b>田んぼを広げる</b><br><span class="mu">飼える数が+1(いま上限' +
    cap() +
    '匹)</span></div><button data-b="field" ' +
    ((S.own.field || 0) >= 3 || S.money < 600 + 300 * (S.own.field || 0) ? 'disabled' : '') +
    '>' +
    ((S.own.field || 0) >= 3 ? '最大' : 600 + 300 * (S.own.field || 0) + '円') +
    '</button></div>' +
    '<div style="margin:14px 0 6px;display:flex;gap:8px">' +
    '<button data-a="feedback" style="flex:1">感想を送る</button>' +
    '<button data-a="code" style="flex:1">状況コードをコピー</button>' +
    '</div>' +
    '<button class="go" data-a="spring">春へ進む</button>'
  );
}

export function logH(): string {
  const buildDate = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : 'dev';
  return (
    '<h2>きろく</h2>' +
    S.log
      .slice(0, 14)
      .map((l) => '<p class="mu">' + E(l) + '</p>')
      .join('') +
    '<div style="margin:10px 0;display:flex;gap:8px">' +
    '<button data-a="feedback" style="flex:1">感想を送る</button>' +
    '<button data-a="code" style="flex:1">状況コードをコピー</button>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-bottom:10px">' +
    '<button data-a="undo" style="flex:1" ' +
    (PREV && !busy ? '' : 'disabled') +
    '>直前の半年を戻す</button> ' +
    '<button data-a="reset" style="flex:1">' +
    (rsf ? 'もう一度押すと最初から' : '最初からやり直す') +
    '</button>' +
    '</div>' +
    '<button class="go" data-a="close">閉じる</button>' +
    '<p class="mu" style="text-align:center;font-size:11px;margin-top:12px">β4-0 (' +
    buildDate +
    ')</p>'
  );
}
`;

fs.writeFileSync('src/view/ui.ts', content, 'utf8');
console.log('src/view/ui.ts repaired successfully!');