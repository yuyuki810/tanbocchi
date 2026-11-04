import { describe, it, expect } from 'vitest';
import goldenData from './goldenMasterData.json';
import { setRng, dodge, yo, cap, pick, R } from '../src/game/calc';
import { checkEvolution } from '../src/data/evolution';
import { SP } from '../src/data/species';
import { GOOD, BAD, NM } from '../src/data/traits';
import { GameState, SpeciesName } from '../src/types';
import { setS } from '../src/game/state';

function createMulberry32(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('golden master (挙動の基準記録との完全一致)', () => {
  it('固定シード(42)で20半期シミュレートした結果が変更前と100%一致する', () => {
    const rng = createMulberry32(42);
    setRng(rng);

    let state: GameState = {
      schemaVersion: 2,
      ver: 2,
      y: 1,
      h: 0,
      w: 0,
      money: 0,
      nut: 0,
      water: 1,
      own: {},
      cr: [],
      log: [],
      dead: [],
      memo: [],
      dex: ['メダカ', 'カエル'],
      tc: 0,
      wc: 0,
      hm: 0,
      goal: null,
      startN: 2,
      id: 0,
      phase: 'play',
      last: null,
      seen: 1,
    };
    // cap() や surf() が参照する S に state をバインド
    setS(state);

    function addCreature(sp: SpeciesName, rare?: boolean) {
      state.cr.push({
        id: ++state.id,
        n: pick(NM, rng),
        sp,
        age: 0,
        g: rare ? [...GOOD].sort(() => rng() - 0.5).slice(0, 2) : [pick(GOOD, rng)],
        b: pick(BAD, rng),
        lv: 0,
        db: 0,
        yb: 0,
        yrs: 0,
      });
    }

    addCreature('メダカ');
    addCreature('カエル');

    for (let halfIdx = 0; halfIdx < 20; halfIdx++) {
      const expectedRecord = goldenData[halfIdx];
      const h = state.h;
      if (!h && !state.goal) {
        state.goal = '守る';
      }

      const pos = h ? [9, 11] : [2, 5, 7];
      const n = pos.length;
      const pool = ['wx', 'wish'];
      if (state.cr.length < cap()) pool.push('meet');
      if (!h && state.goal === '増やす' && state.cr.length < cap()) pool.unshift('meet');

      const rest = [...new Set(pool)].sort(() => rng() - 0.5);
      if (!h && state.goal === '増やす' && rest.includes('meet')) {
        rest.splice(rest.indexOf('meet'), 1);
        rest.unshift('meet');
      }
      const L = [];
      L.push(...rest.slice(0, n - 1));
      while (L.length < n - 1) L.push('wx');
      const seq = h ? ['sign', ...L] : [L[0], 'sign', ...L.slice(1)];
      const planMap = {};
      pos.forEach((p, i) => (planMap[p] = seq[i]));

      expect(planMap).toEqual(expectedRecord.plan);

      const sceneEvents = [];
      for (const week of (h ? [9, 11] : [2, 5, 7])) {
        const sceneId = planMap[week];
        let choiceResult = '';

        if (sceneId === 'sign') {
          const c = pick(state.cr, rng);
          if (c) {
            state.wc++;
            const caught = rng() * 100 > dodge(c);
            if (caught) {
              state.cr = state.cr.filter((x) => x !== c);
              state.nut += 5 + c.lv;
              state.dead.push({ n: c.n, sp: c.sp, lv: c.lv });
              choiceResult = 'caught:' + c.n;
            } else {
              c.lv = Math.min(9, c.lv + 1);
              c.db += 3;
              choiceResult = 'dodged:' + c.n;
            }
          }
        } else if (sceneId === 'meet') {
          if (state.cr.length < cap()) {
            state.wc++;
            const ks = Object.keys(SP);
            const sp = pick(ks.filter((s) => !state.dex.includes(s)).concat(ks), rng);
            addCreature(sp, state.wc > state.tc);
            if (!state.dex.includes(sp)) state.dex.push(sp);
            choiceResult = 'joined:' + sp;
          }
        } else if (sceneId === 'wx') {
          const d = rng() < 0.5;
          state.tc++;
          choiceResult = d ? 'wx:drought_adjusted' : 'wx:rain_adjusted';
        } else if (sceneId === 'wish') {
          const c = pick(state.cr, rng);
          if (c) {
            state.tc++;
            c.lv = Math.min(9, c.lv + 2);
            choiceResult = 'wish_stay:' + c.n;
          }
        }
        sceneEvents.push({ week, sceneId, result: choiceResult });
      }

      expect(sceneEvents).toEqual(expectedRecord.sceneEvents);

      state.cr.forEach((c) => {
        c.age++;
        c.lv = Math.min(9, c.lv + 1);
      });

      const metamorphosed = [];
      for (const c of state.cr) {
        const evo = checkEvolution(c, '変身', state);
        if (evo) {
          if (evo.to) c.sp = evo.to;
          if (evo.apply) evo.apply(c, state);
          metamorphosed.push(c.n);
        }
      }
      expect(metamorphosed).toEqual(expectedRecord.metamorphosed);

      if (h) {
        const k = new Set(state.cr.map((c) => c.sp)).size;
        const a = state.cr.reduce((s, c) => s + yo(c), 0) * 3;
        const b = Math.floor(state.nut / 2);
        const c5 = k * 5;
        let r = 30 + a + b + c5;
        r *= (1 + state.hm) * (state.own.seed ? 1.15 : 1) * (state.goal === '稼ぐ' ? 1.15 : 1);
        const v = state.wc > state.tc ? 0.3 : 0.05;
        const f = 1 + R(-v, v, rng);
        r = Math.round(r * f);
        state.money += r * 10;
        if (state.goal === '守る' && !state.dead.length) state.money += 300;
        if (state.goal === '増やす' && state.cr.length > state.startN) state.money += 300;

        expect({
          r,
          a,
          b,
          c: c5,
          money: state.money,
        }).toEqual(expectedRecord.harvest);

        state.cr.forEach((c) => {
          c.yrs++;
          const evo = checkEvolution(c, '年明け', state);
          if (evo && evo.apply) {
            evo.apply(c, state);
          }
        });
        state.y++;
        state.h = 0;
        state.w = 0;
        state.nut = Math.floor(state.nut / 2);
        state.dead = [];
        state.tc = 0;
        state.wc = 0;
        state.hm = 0;
        state.goal = null;
        state.startN = state.cr.length;
        state.water = 1;
      } else {
        state.h = 1;
      }

      const creatureStatuses = state.cr.map((c) => ({
        id: c.id,
        n: c.n,
        sp: c.sp,
        age: c.age,
        yrs: c.yrs,
        lv: c.lv,
        yb: c.yb,
        db: c.db,
        dodge: dodge(c),
      }));
      expect(creatureStatuses).toEqual(expectedRecord.creatures);
    }
  });
});
