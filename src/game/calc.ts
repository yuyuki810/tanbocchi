import { Creature, Trait } from '../types';
import { SP } from '../data/species';
import { S } from './state';

export const tr = (c: Creature): Trait[] => [...c.g, c.b];
export const tad = (c: Creature): boolean => c.sp === 'カエル' && c.age < 1;
export const surf = (): number => [175, 145, 115][S.water];
export const cap = (): number => 3 + (S.own.field || 0);

export const dodge = (c: Creature): number =>
  Math.max(
    5,
    Math.min(
      95,
      SP[c.sp].d +
        c.db +
        tr(c).reduce((a, t) => a + t[1], 0) +
        (S.own.hide ? 12 : 0) +
        [-8, 0, 8][S.water] +
        (S.goal === '守る' ? 8 : 0) -
        (tad(c) ? 10 : 0)
    )
  );

export const yo = (c: Creature): number =>
  SP[c.sp].y + c.yb + tr(c).reduce((a, t) => a + t[2], 0);

export const R = (a: number, b: number): number => a + Math.random() * (b - a);
export const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
export const sl = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
export const E = (s: any): string =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));
