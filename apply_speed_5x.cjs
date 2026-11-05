// apply_speed_5x.cjs
const fs = require('fs');

// 1. timing.ts の秒数設定を5倍速 (各45秒) に変更、4倍速を追加
const timing = `export const SEASON_SECONDS = {
  春: 45,
  夏: 45,
  秋: 45,
  冬: 45,
}; // 基本速度5倍: 1季節45秒、1半期90秒、1年180秒(3分)

export const SPEEDS = [1, 2, 4] as const;
export const MAX_FRAME_MS = 250;
`;
fs.writeFileSync('src/data/timing.ts', timing, 'utf8');
console.log('Updated: src/data/timing.ts');

// 2. flow.ts の toggleSpeed に4倍速ローテーションを追加
let flow = fs.readFileSync('src/game/flow.ts', 'utf8');
flow = flow.replace(
  'S.clock.speed = S.clock.speed === 1 ? 2 : 1;',
  'S.clock.speed = S.clock.speed === 1 ? 2 : S.clock.speed === 2 ? 4 : 1;'
);
fs.writeFileSync('src/game/flow.ts', flow, 'utf8');
console.log('Updated: src/game/flow.ts');

// 3. ui.ts の倍速ボタン表示を「×1」「×2」「×4」に対応
let ui = fs.readFileSync('src/view/ui.ts', 'utf8');
ui = ui.replace(
  "(clockSpeed === 2 ? '×2' : '×1')",
  "(clockSpeed === 4 ? '×4' : clockSpeed === 2 ? '×2' : '×1')"
);
fs.writeFileSync('src/view/ui.ts', ui, 'utf8');
console.log('Updated: src/view/ui.ts');

// 4. save.test.ts の半期秒数期待値を更新 (450秒 -> 90秒)
let saveTest = fs.readFileSync('tests/save.test.ts', 'utf8');
saveTest = saveTest.replaceAll('expect(migrated?.clock?.totalSec).toBe(450);', 'expect(migrated?.clock?.totalSec).toBe(90);');
fs.writeFileSync('tests/save.test.ts', saveTest, 'utf8');
console.log('Updated: tests/save.test.ts');

// 5. clock.test.ts に4倍速テストを追加
let clockTest = fs.readFileSync('tests/clock.test.ts', 'utf8');
if (!clockTest.includes('speed=4')) {
  clockTest = clockTest.replace(
    "  it('倍速 (speed=2) では2倍速く進む', () => {",
    `  it('4倍速 (speed=4) では4倍速く進む', () => {
    const clock: ClockState = {
      elapsedSec: 0,
      totalSec: 200,
      paused: false,
      speed: 4,
      events: [],
    };

    const res = advanceClock(clock, 0, 100, customSeasonSec);
    expect(clock.elapsedSec).toBeCloseTo(0.4, 5);
    expect(res.deltaSec).toBeCloseTo(0.4, 5);
  });

  it('倍速 (speed=2) では2倍速く進む', () => {`
  );
  fs.writeFileSync('tests/clock.test.ts', clockTest, 'utf8');
}
console.log('Updated: tests/clock.test.ts');

console.log('5x speed and 4x button applied successfully!');