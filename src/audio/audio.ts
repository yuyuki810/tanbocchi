import { SeasonName } from '../types';

let audioCtx: AudioContext | null = null;
let soundEnabled = true;
let isUnlocked = false;

// 環境音用のゲインノード
let masterGain: GainNode | null = null;
let ambientGain: GainNode | null = null;
let currentSeason: SeasonName | null = null;

// 環境音の生成器
let ambientSources: { stop: () => void }[] = [];

/**
 * AudioContext を安全に取得・初期化
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtxClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(soundEnabled ? 0.25 : 0, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);

      ambientGain = audioCtx.createGain();
      ambientGain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      ambientGain.connect(masterGain);
    }
  }
  return audioCtx;
}

/**
 * ユーザー操作（最初のタップ）で音声を解禁する
 */
export function unlockAudio(): void {
  if (isUnlocked) return;
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().then(() => {
      isUnlocked = true;
    }).catch(() => {});
  } else if (ctx) {
    isUnlocked = true;
  }
}

/**
 * 音声の有効/無効を設定する
 */
export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  const ctx = getAudioContext();
  if (ctx && masterGain) {
    const t = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(t);
    masterGain.gain.setValueAtTime(masterGain.gain.value, t);
    masterGain.gain.linearRampToValueAtTime(enabled ? 0.25 : 0, t + 0.1);
  }
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

/**
 * ノイズバッファの作成ヘルパー (風・水などのベース)
 */
function createNoiseNode(ctx: AudioContext): AudioNode {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    // ピンクノイズ風のフィルタ
    data[i] = (lastOut + 0.02 * white) / 1.02;
    lastOut = data[i];
  }
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = buffer;
  noiseSource.loop = true;
  noiseSource.start();
  return noiseSource;
}

/**
 * 季節に応じた環境音ノードを作成
 */
function createSeasonAmbient(ctx: AudioContext, season: SeasonName): { node: AudioNode; stop: () => void } {
  const seasonGain = ctx.createGain();
  seasonGain.gain.value = 1;
  const stops: (() => void)[] = [];

  try {
    if (season === '春') {
      // 水の流れ (バンドパスノイズ) + 柔らかな鳥のさえずり風パルス
      const noise = createNoiseNode(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 450;
      filter.Q.value = 2;

      const streamGain = ctx.createGain();
      streamGain.gain.value = 0.4;
      noise.connect(filter).connect(streamGain).connect(seasonGain);
      stops.push(() => { try { (noise as any).stop(); } catch {} });
    } else if (season === '夏') {
      // 水音 + 虫の声 (サイン波モジュレーション)
      const noise = createNoiseNode(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 700;

      const waterGain = ctx.createGain();
      waterGain.gain.value = 0.3;
      noise.connect(filter).connect(waterGain).connect(seasonGain);
      stops.push(() => { try { (noise as any).stop(); } catch {} });

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 4200;
      const insectGain = ctx.createGain();
      insectGain.gain.value = 0.03;
      osc.connect(insectGain).connect(seasonGain);
      osc.start();
      stops.push(() => { try { osc.stop(); } catch {} });
    } else if (season === '秋') {
      // 静かな風 + 控えめな秋の虫
      const noise = createNoiseNode(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 350;
      filter.Q.value = 1;

      const windGain = ctx.createGain();
      windGain.gain.value = 0.35;
      noise.connect(filter).connect(windGain).connect(seasonGain);
      stops.push(() => { try { (noise as any).stop(); } catch {} });

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 3200;
      const insectGain = ctx.createGain();
      insectGain.gain.value = 0.02;
      osc.connect(insectGain).connect(seasonGain);
      osc.start();
      stops.push(() => { try { osc.stop(); } catch {} });
    } else {
      // 冬: 静かな低い風
      const noise = createNoiseNode(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 220;

      const windGain = ctx.createGain();
      windGain.gain.value = 0.3;
      noise.connect(filter).connect(windGain).connect(seasonGain);
      stops.push(() => { try { (noise as any).stop(); } catch {} });
    }
  } catch {}

  return {
    node: seasonGain,
    stop: () => stops.forEach((s) => s()),
  };
}

/**
 * 季節の環境音をクロスフェード (約2秒) で切り替え
 */
export function updateSeasonAmbient(season: SeasonName): void {
  if (currentSeason === season) return;
  currentSeason = season;

  const ctx = getAudioContext();
  if (!ctx || !ambientGain) return;

  const prevSources = [...ambientSources];
  ambientSources = [];

  // 古い環境音を2秒でフェードアウトして破棄
  prevSources.forEach((src) => {
    setTimeout(() => src.stop(), 2100);
  });

  const ambient = createSeasonAmbient(ctx, season);
  const fadeGain = ctx.createGain();
  const t = ctx.currentTime;
  fadeGain.gain.setValueAtTime(0.001, t);
  fadeGain.gain.exponentialRampToValueAtTime(1, t + 2);

  ambient.node.connect(fadeGain).connect(ambientGain);
  ambientSources.push({
    stop: () => {
      const curT = ctx.currentTime;
      fadeGain.gain.cancelScheduledValues(curT);
      fadeGain.gain.setValueAtTime(fadeGain.gain.value, curT);
      fadeGain.gain.linearRampToValueAtTime(0.001, curT + 2);
      setTimeout(() => ambient.stop(), 2100);
    },
  });
}

/**
 * 一時停止時に環境音をフェードアウト
 */
export function pauseAmbient(): void {
  const ctx = getAudioContext();
  if (ctx && ambientGain) {
    const t = ctx.currentTime;
    ambientGain.gain.cancelScheduledValues(t);
    ambientGain.gain.setValueAtTime(ambientGain.gain.value, t);
    ambientGain.gain.linearRampToValueAtTime(0, t + 0.5);
  }
}

/**
 * 再開時に環境音をフェードイン
 */
export function resumeAmbient(): void {
  const ctx = getAudioContext();
  if (ctx && ambientGain) {
    const t = ctx.currentTime;
    ambientGain.gain.cancelScheduledValues(t);
    ambientGain.gain.setValueAtTime(ambientGain.gain.value, t);
    ambientGain.gain.linearRampToValueAtTime(0.15, t + 0.8);
  }
}

/**
 * タブ非表示・表示時の処理
 */
export function suspendAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'running') {
    ctx.suspend().catch(() => {});
  }
}

export function resumeAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended' && isUnlocked) {
    ctx.resume().catch(() => {});
  }
}

/**
 * 効果音の再生 (3種)
 */
export function playSfx(type: 'scene' | 'choice' | 'watch'): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx || !isUnlocked || !masterGain) return;

  try {
    const t = ctx.currentTime;
    if (type === 'scene') {
      // 場面出現チャイム
      [523.25, 783.99].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc.connect(gain).connect(masterGain!);
        osc.start(t);
        osc.stop(t + 0.6);
      });
    } else if (type === 'choice') {
      // 選択決定音
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.08);
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.linearRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain).connect(masterGain!);
      osc.start(t);
      osc.stop(t + 0.1);
    } else if (type === 'watch') {
      // 眺める出来事: 水のきらめきのような高いアルペジオ
      [659.25, 880, 1046.5].forEach((freq, idx) => {
        const delay = idx * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.05, t + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.5);
        osc.connect(gain).connect(masterGain!);
        osc.start(t + delay);
        osc.stop(t + delay + 0.5);
      });
    }
  } catch {}
}
