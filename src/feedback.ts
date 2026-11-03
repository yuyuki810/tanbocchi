import { GameState } from './types';
import { toast } from './view/ui';

export const FEEDBACK_URL = 'REPLACE_ME';

export function getSituationCode(s: GameState): string {
  const goalStr = s.goal || 'なし';
  return `v${s.ver} y${s.y} h${s.h} n${s.cr.length} g${goalStr} m${s.money}`;
}

export function openFeedback(): void {
  if (FEEDBACK_URL && FEEDBACK_URL !== 'REPLACE_ME') {
    window.open(FEEDBACK_URL, '_blank', 'noopener,noreferrer');
  } else {
    alert('フィードバック用のURLがまだ設定されていません。');
  }
}

export async function copySituationCode(s: GameState): Promise<void> {
  const code = getSituationCode(s);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(code);
      toast('状況コードをコピーしました');
      return;
    } catch (e) {
      // clipboard writeText failed, fall back
    }
  }
  prompt('以下の状況コードをコピーしてください:', code);
}
