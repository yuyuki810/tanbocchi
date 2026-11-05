import { SkyPalette, SeasonName } from '../types';

export const SKY: SkyPalette[] = [
  ['#bfe3ee', '#f1f1dc'], // 0: 春
  ['#8fd0ee', '#e9f4e0'], // 1: 夏
  ['#f2c98f', '#f7e8c4'], // 2: 秋
  ['#b9c6cc', '#e4e8e6'], // 3: 冬
];

const SEASON_INDEX: Record<SeasonName, number> = {
  春: 0,
  夏: 1,
  秋: 2,
  冬: 3,
};

function parseHex(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  return [
    parseInt(c.substring(0, 2), 16),
    parseInt(c.substring(2, 4), 16),
    parseInt(c.substring(4, 6), 16),
  ];
}

function toHex(rgb: [number, number, number]): string {
  return '#' + rgb.map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');
}

export function lerpColor(c1: string, c2: string, t: number): string {
  const clampedT = Math.max(0, Math.min(1, t));
  const a = parseHex(c1);
  const b = parseHex(c2);
  const r = a[0] + (b[0] - a[0]) * clampedT;
  const g = a[1] + (b[1] - a[1]) * clampedT;
  const bl = a[2] + (b[2] - a[2]) * clampedT;
  return toHex([r, g, bl]);
}

/**
 * 季節名と季節内の進捗率 (0〜1) から滑らかにブレンドされた空色パレットを計算する
 */
export function getInterpolatedSky(season: SeasonName, progress: number): SkyPalette {
  const currentIdx = SEASON_INDEX[season];
  const nextIdx = (currentIdx + 1) % 4;
  const currentPalette = SKY[currentIdx];
  const nextPalette = SKY[nextIdx];

  const s1 = lerpColor(currentPalette[0], nextPalette[0], progress);
  const s2 = lerpColor(currentPalette[1], nextPalette[1], progress);
  return [s1, s2];
}
