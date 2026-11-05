import { Creature, CreatureMove, Rng } from '../types';
import { S, log } from '../game/state';
import { dodge, surf, tad, R, sl, E, random } from '../game/calc';
import { SKY, getInterpolatedSky } from '../data/sky';
import { toast, ask } from './ui';
import { getSeasonInfo } from '../game/clock';
import { tickClock } from '../game/flow';

const NS = 'http://www.w3.org/2000/svg';
export const RM = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-reduced-motion:reduce)').matches : false;

export const G: Record<number, SVGGElement> = {};
export const MV: Record<number, CreatureMove> = {};

let lastFrameTime = 0;

function getEl<T extends HTMLElement | SVGElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el as unknown as T;
}

export function art(c: Creature): string {
  if (c.sp === 'メダカ')
    return '<path d="M-17-5L-8 0-17 5Z" fill="#e9d69a"/><ellipse rx="10" ry="4.6" fill="#f3e5b0"/><circle cx="6" cy="-1" r="1.3" fill="#222"/><path d="M-2 3q3 3 6 1" stroke="#d6bf7a" fill="none"/>';
  if (c.sp === 'ドジョウ')
    return '<ellipse rx="17" ry="3.6" fill="#8c7458"/><path d="M-16 0L-25-4V4Z" fill="#7a644a"/><circle cx="12" cy="-1" r="1.2" fill="#222"/><path d="M17 1l5 3M17 2l5 0" stroke="#6b5640"/>';
  if (tad(c))
    return '<path d="M-4 0Q-12-5-17 0Q-12 5-4 0Z" fill="#55684a"/><circle r="5.2" fill="#40513a"/><circle cx="2" cy="-2" r="1.2" fill="#fff"/>';
  return '<path d="M-8 4Q-17 9-11 12M-2 6l-4 6" stroke="#4d8a3a" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse rx="11" ry="7" fill="#62a84c"/><circle cx="6" cy="-6" r="3.4" fill="#62a84c"/><circle cx="7" cy="-6.4" r="1.5" fill="#fff"/><circle cx="7.4" cy="-6.4" r=".7" fill="#222"/>';
}

export function paint(): void {
  if (typeof document === 'undefined') return;
  const s = Math.min(S.w >> 2, 3);
  const wi = S.w % 4;
  const A = [26, 80, 112, 124];

  // 空色の滑らかな変化 (フェーズ2A: getInterpolatedSky)
  if (S.clock && S.phase === 'play') {
    const info = getSeasonInfo(S.h, S.clock.elapsedSec);
    const [c1, c2] = getInterpolatedSky(info.season, info.seasonProgress);
    getEl<SVGStopElement>('s1').setAttribute('stop-color', c1);
    getEl<SVGStopElement>('s2').setAttribute('stop-color', c2);
  } else {
    getEl<SVGStopElement>('s1').setAttribute('stop-color', SKY[s][0]);
    getEl<SVGStopElement>('s2').setAttribute('stop-color', SKY[s][1]);
  }

  const h0 = S.phase === 'winter' ? 12 : A[s] + ((A[Math.min(s + 1, 3)] - A[s]) * wi) / 4;
  const col = ['#8fc55b', '#58a63c', '#d6b84a', '#8b7a58'][s];
  let r = '';

  for (let i = 0; i < 36; i++) {
    const bk = i >= 18;
    const k = i % 18;
    const x = 8 + k * 20 + ((k * 7) % 9) + (bk ? 9 : 0);
    const h = h0 * (bk ? 0.72 : 1) * (0.85 + ((k * 13) % 7) / 22);
    const l = ((k * 5) % 9) - 4;
    r +=
      '<path d="M' +
      x +
      ' 262Q' +
      (x + l) +
      ' ' +
      (262 - h / 2) +
      ' ' +
      (x + l * 2) +
      ' ' +
      (262 - h) +
      '" stroke="' +
      col +
      '" stroke-width="' +
      (bk ? 1.8 : 2.6) +
      '" fill="none" stroke-linecap="round" opacity="' +
      (bk ? 0.7 : 1) +
      '"/>';
    if (s === 2 && !bk && S.phase !== 'winter') {
      r +=
        '<ellipse cx="' +
        (x + l * 2 + 3) +
        '" cy="' +
        (268 - h) +
        '" rx="2.4" ry="7" fill="#e3c35a" transform="rotate(-20 ' +
        (x + l * 2) +
        ' ' +
        (262 - h) +
        ')"/>';
    }
  }

  getEl<SVGGElement>('rice').innerHTML = r;
  const y = surf();
  getEl<SVGRectElement>('wtr').setAttribute('y', String(y));
  getEl<SVGRectElement>('wtr').setAttribute('height', String(262 - y));
  getEl<SVGPathElement>('wl').setAttribute(
    'd',
    'M0 ' + y + 'Q45 ' + (y - 3) + ' 90 ' + y + 'T180 ' + y + 'T270 ' + y + 'T360 ' + y
  );

  getEl<SVGPathElement>('hay').style.display = S.own.hide ? '' : 'none';
  getEl<SVGGElement>('bug').style.display = (s === 1 || s === 2) && S.phase === 'play' ? '' : 'none';

  getEl<SVGGElement>('tags').innerHTML = S.memo
    .slice(-6)
    .map(
      (n, i) =>
        '<g transform="translate(' +
        (30 + i * 54) +
        ' 279)"><rect x="-15" y="-9" width="30" height="14" rx="2" fill="#d9c08a"/><text y="2" font-size="8" text-anchor="middle" fill="#3b2f1c">' +
        E(n.slice(0, 3)) +
        '</text></g>'
    )
    .join('');

  sync();
}

export function sync(): void {
  for (const id in G) {
    if (!S.cr.find((c) => c.id === Number(id))) {
      G[id].remove();
      delete G[id];
      delete MV[id];
    }
  }

  S.cr.forEach((c) => {
    let g = G[c.id];
    if (!g) {
      g = document.createElementNS(NS, 'g') as SVGGElement;
      g.setAttribute('class', 'cr');
      g.dataset.id = String(c.id);
      getEl<SVGGElement>('crs').appendChild(g);
      G[c.id] = g;
    }
    const k = c.sp + String(tad(c));
    if (g.dataset.k !== k) {
      g.dataset.k = k;
      g.innerHTML = '<circle r="18" fill="transparent"/>' + art(c);
    }
  });
}

export function zn(c: Creature): [number, number] {
  const a = surf() + 16;
  const b = 252;
  return c.sp === 'ドジョウ' ? [b - 18, b] : c.sp === 'メダカ' ? [a, a + Math.max(18, (b - a) * 0.45)] : [a + 10, b - 24];
}

export function loop(t: number): void {
  if (!lastFrameTime) lastFrameTime = t;
  const dtMs = t - lastFrameTime;
  lastFrameTime = t;

  // 時間駆動の時計進行
  tickClock(dtMs);

  // 生き物の泳ぎアニメーション (一時停止中も止めない)
  for (const c of S.cr) {
    const g = G[c.id];
    if (!g) continue;
    const z = zn(c);
    let m = MV[c.id];
    if (!m) {
      m = MV[c.id] = { x: R(30, 330), y: R(z[0], z[1]), tx: R(30, 330), ty: R(z[0], z[1]), d: 1 };
    }
    m.ty = Math.min(Math.max(m.ty, z[0]), z[1]);
    if (m.y < z[0]) m.y += 0.6;
    if (m.y > z[1]) m.y -= 0.6;
    const dx = m.tx - m.x;
    const dy = m.ty - m.y;
    const d = Math.hypot(dx, dy);

    if (d < 5) {
      m.tx = R(24, 336);
      m.ty = R(z[0], z[1]);
    } else if (!RM) {
      const s = c.sp === 'ドジョウ' ? 0.16 : c.sp === 'メダカ' ? 0.45 : 0.28;
      m.x += (dx / d) * s;
      m.y += (dy / d) * s * 0.7;
      if (Math.abs(dx) > 8) m.d = dx > 0 ? 1 : -1;
    }
    g.setAttribute(
      'transform',
      'translate(' +
        m.x.toFixed(1) +
        ' ' +
        (m.y + (RM ? 0 : Math.sin(t / 500 + c.id) * 1.5)).toFixed(1) +
        ') scale(' +
        m.d +
        ' 1)'
    );
  }
  requestAnimationFrame(loop);
}

export function fall(x: number, y: number, n: number, col: string, sp: number): void {
  for (let i = 0; i < n; i++) {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', String(x + R(-sp, sp)));
    c.setAttribute('cy', String(y));
    c.setAttribute('r', String(R(1.8, 3.4)));
    c.setAttribute('fill', col);
    getEl<SVGGElement>('rp').appendChild(c);
    c.animate(
      [
        { transform: 'translateY(0)', opacity: 1 },
        { transform: 'translateY(' + (262 - y - R(0, 10)) + 'px)', opacity: 0 },
      ],
      { duration: R(1100, 1900), easing: 'ease-in' }
    ).onfinish = () => c.remove();
  }
}

export const party = (): void => {
  ['#f6e27a', '#f08a6a', '#7fd0a8', '#8fb8f0'].forEach((c) => fall(R(60, 300), 16, 6, c, 50));
};

export function ripple(x: number, y: number): void {
  const c = document.createElementNS(NS, 'circle');
  c.setAttribute('cx', String(x));
  c.setAttribute('cy', String(y));
  c.setAttribute('r', '20');
  c.setAttribute('fill', 'none');
  c.setAttribute('stroke', '#fff');
  c.setAttribute('stroke-width', '1.5');
  c.style.transformBox = 'fill-box';
  c.style.transformOrigin = 'center';
  getEl<SVGGElement>('rp').appendChild(c);
  c.animate(
    [
      { transform: 'scale(.2)', opacity: 0.9 },
      { transform: 'scale(1)', opacity: 0 },
    ],
    { duration: 700, easing: 'ease-out' }
  ).onfinish = () => c.remove();
}

export async function heron(c: Creature, caught: boolean): Promise<void> {
  const m = MV[c.id] || { x: 180, y: 200, tx: 180, ty: 200, d: 1 };
  const h = getEl<SVGGElement>('hn');
  const hi = getEl<SVGGElement>('hi');
  const nk = getEl<SVGGElement>('nk');
  const g = G[c.id];

  h.setAttribute('transform', 'translate(' + Math.min(300, m.x + 36) + ' ' + (surf() - 4) + ')');
  h.style.display = '';

  await hi.animate(
    [
      { transform: 'translateX(120px)', opacity: 0 },
      { transform: 'translateX(0)', opacity: 1 },
    ],
    { duration: 650, easing: 'ease-out', fill: 'forwards' }
  ).finished;

  await nk.animate(
    [
      { transform: 'rotate(0)' },
      { transform: 'rotate(-108deg)' },
      { transform: 'rotate(-108deg)' },
      { transform: caught ? 'rotate(0)' : 'rotate(-30deg)' },
    ],
    { duration: 900, fill: 'forwards' }
  ).finished;

  if (caught) {
    if (g) g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
    fall(m.x, m.y, 8, '#f6e27a', 14);
  } else {
    m.tx = m.x < 180 ? R(230, 330) : R(30, 130);
  }

  await hi.animate(
    [
      { transform: 'translateX(0)', opacity: 1 },
      { transform: 'translateX(130px)', opacity: 0 },
    ],
    { duration: 600, fill: 'forwards' }
  ).finished;

  [hi, nk].forEach((e) => e.getAnimations().forEach((a) => a.cancel()));
  h.style.display = 'none';
}

export async function strike(c: Creature, addVal: number, w?: number, rng: Rng = random): Promise<void> {
  const caught = rng() * 100 > dodge(c) + addVal;
  await heron(c, caught);
  if (caught) {
    S.cr = S.cr.filter((x) => x !== c);
    S.nut += 5 + c.lv;
    S.dead.push({ n: c.n, sp: c.sp, lv: c.lv });
    S.memo.push(c.n);
    log('サギが' + c.n + '(' + c.sp + '・♥' + c.lv + ')を食べた。');
    paint();
    await ask(
      '<h2>サギに食べられてしまった…</h2><p>' +
        E(c.n) +
        '(' +
        c.sp +
        ')。なつき度♥' +
        c.lv +
        'の分も合わせて、養分が' +
        (5 + c.lv) +
        '増えた。</p><p class="mu">名前は稲穂の札になって、田んぼに残る。</p><button class="go" data-a="close">見守る</button>'
    );
  } else {
    c.lv = Math.min(9, c.lv + 1);
    if (w) c.db += 3;
    log(c.n + 'をサギから守った!');
    party();
    toast('守れた!' + c.n + 'は無事。' + (w ? '経験で回避力アップ' : 'なつき度+1'));
    await sl(1700);
  }
}
