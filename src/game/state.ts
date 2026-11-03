import { GameState, SpeciesName } from '../types';
import { GOOD, BAD, NM } from '../data/traits';
import { pick } from './calc';

export const SAVE_KEY = 'tanbocchi';
export const SAVE_VERSION = 1;

export let S: GameState;
export let PREV = '';
export let busy = false;
export let rsf = false;

export function setS(newS: GameState): void {
  S = newS;
}

export function setPREV(val: string): void {
  PREV = val;
}

export function setBusy(val: boolean): void {
  busy = val;
}

export function setRsf(val: boolean): void {
  rsf = val;
}

export function migrate(raw: any): GameState | null {
  if (raw && typeof raw === 'object' && raw.ver === SAVE_VERSION && Array.isArray(raw.cr)) {
    return raw as GameState;
  }
  return null;
}

export function load(): GameState | null {
  try {
    const j = localStorage.getItem(SAVE_KEY);
    if (j) {
      const parsed = JSON.parse(j);
      return migrate(parsed);
    }
  } catch (e) {}
  return null;
}

export function save(): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
  } catch (e) {}
}

export function add(sp: SpeciesName, rare?: boolean): void {
  S.cr.push({
    id: ++S.id,
    n: pick(NM),
    sp,
    age: 0,
    g: rare ? [...GOOD].sort(() => Math.random() - 0.5).slice(0, 2) : [pick(GOOD)],
    b: pick(BAD),
    lv: 0,
    db: 0,
    yb: 0,
    yrs: 0,
  });
}

export function log(t: string): void {
  S.log.unshift(t);
  S.log = S.log.slice(0, 30);
}

export function fresh(): GameState {
  S = {
    ver: SAVE_VERSION,
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
    seen: 0,
  };
  add('メダカ');
  add('カエル');
  log('春になった。2つの命が生まれた。');
  return S;
}

export function initState(): void {
  S = load() || fresh();
}
