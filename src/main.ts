import './style.css';
import { SP } from './data/species';
import { buyUnlockItem } from './data/shop';
import { cap } from './game/calc';
import { S, PREV, busy, rsf, setS, setPREV, setRsf, save, log, fresh, initState } from './game/state';
import { paint, loop, G, MV, ripple } from './view/scene';
import { ui, refresh, sheet, closeSheet, toast, crH, winterH, guideH, logH, isChoosing, resolveChoose } from './view/ui';
import { half, spring, togglePause, toggleSpeed, startHalf } from './game/flow';
import { openFeedback, copySituationCode } from './feedback';

// 状態初期化
initState();

// タブが隠れたら一時停止する（戻ったときは一時停止のまま）
document.addEventListener('visibilitychange', () => {
  if (document.hidden && S.clock && !S.clock.paused && S.phase === 'play') {
    S.clock.paused = true;
    save();
    ui();
  }
});

// イベント登録
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.id === 'sb') return isChoosing() ? undefined : closeSheet();

  const cr = target.closest('.cr') as HTMLElement | null;
  if (cr && !busy) {
    const c = S.cr.find((x) => x.id === Number(cr.dataset.id));
    if (c) return sheet(crH(c));
  }

  const b = target.closest('[data-a],[data-b],[data-i],[data-o]') as HTMLElement | null;
  if (!b) return;
  const d = b.dataset;
  if (navigator.vibrate) {
    try {
      navigator.vibrate(8);
    } catch (x) {}
  }

  if (d.o != null && isChoosing()) {
    return resolveChoose(+d.o);
  }

  if (d.i) {
    const c = S.cr.find((x) => x.id === Number(d.i));
    if (c) return sheet(crH(c));
  }

  if (d.b) {
    const result = buyUnlockItem(d.b, S);
    if (result.success && result.item) {
      if (result.item.k === 'field') {
        log('田んぼを広げた。');
        toast('田んぼが広がった。上限' + cap() + '匹');
      } else {
        log(result.item.n + 'を解放した。');
        toast(result.item.n + 'を解放した');
      }
    }
    save();
    refresh();
    return sheet(winterH());
  }

  if (d.a === 'half') {
    return half();
  }
  if (d.a === 'toggle-pause') {
    togglePause();
    return;
  }
  if (d.a === 'toggle-speed') {
    toggleSpeed();
    return;
  }
  if (d.a === 'winter') return sheet(winterH());
  if (d.a === 'spring') {
    closeSheet();
    return spring();
  }
  if (d.a === 'close') return closeSheet();
  if (d.a === 'dex') {
    return sheet(
      '<h2>図鑑</h2>' +
        Object.keys(SP)
          .map(
            (s) =>
              '<p>' +
              (S.dex.includes(s as any)
                ? '<b>' + s + '</b> 出会えた'
                : '<span class="mu">? 未発見(出会いの場面で見つかるかも)</span>') +
              '</p>'
          )
          .join('') +
        '<button class="go" data-a="close">閉じる</button>'
    );
  }
  if (d.a === 'log') {
    return sheet(logH());
  }
  if (d.a === 'feedback') {
    return openFeedback();
  }
  if (d.a === 'code') {
    return copySituationCode(S);
  }
  if (d.a === 'undo') {
    if (PREV && !busy) {
      setS(JSON.parse(PREV));
      setPREV('');
      save();
      closeSheet();
      refresh();
      toast('直前の半年を戻した');
    }
    return;
  }
  if (d.a === 'reset') {
    if (!rsf) {
      setRsf(true);
      b.textContent = 'もう一度押すと最初から';
      return;
    }
    setRsf(false);
    fresh();
    for (const key in G) {
      G[key].remove();
      delete G[key];
    }
    const crsEl = document.getElementById('crs');
    if (crsEl) crsEl.innerHTML = '';
    for (const key in MV) {
      delete MV[key];
    }
    closeSheet();
    save();
    refresh();
  }
});

document.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  const i = target.dataset && target.dataset.n;
  if (i) {
    const c = S.cr.find((x) => x.id === Number(i));
    if (c) {
      c.n = target.value.trim().slice(0, 8) || c.n;
      save();
      ui();
    }
  }
});

const sv = document.getElementById('sv');
if (sv) {
  sv.addEventListener('pointerdown', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.cr')) return;
    const r = sv.getBoundingClientRect();
    ripple(((e.clientX - r.left) / r.width) * 360, ((e.clientY - r.top) / r.height) * 300);
  });
}

refresh();
requestAnimationFrame(loop);
if (!S.seen) {
  S.seen = 1;
  save();
  sheet(guideH);
}
