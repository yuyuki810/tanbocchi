import { describe, it, expect, beforeEach } from 'vitest';
import {
  setSoundEnabled,
  isSoundEnabled,
  unlockAudio,
  playSfx,
  updateSeasonAmbient,
  pauseAmbient,
  resumeAmbient,
} from '../src/audio/audio';

describe('audio (音の管理)', () => {
  beforeEach(() => {
    setSoundEnabled(true);
  });

  it('初期状態はサウンドが有効 (true) になっている', () => {
    expect(isSoundEnabled()).toBe(true);
  });

  it('ミュートの切り替えと保持ができる', () => {
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);

    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
  });

  it('Web Audio API 未解禁・環境非対応の環境でもエラーでクラッシュしない', () => {
    expect(() => {
      unlockAudio();
      playSfx('scene');
      playSfx('choice');
      playSfx('watch');
      updateSeasonAmbient('春');
      updateSeasonAmbient('夏');
      pauseAmbient();
      resumeAmbient();
    }).not.toThrow();
  });

  it('サウンド無効時は playSfx が何も再生しない', () => {
    setSoundEnabled(false);
    expect(() => playSfx('scene')).not.toThrow();
  });
});
