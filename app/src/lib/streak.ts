import { Session } from './types';

const DAY = 24 * 60 * 60 * 1000;

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 하루에 완공한 세션이 하나라도 있으면 그 날은 "집중한 날"
export function focusDays(sessions: Session[]): Set<string> {
  return new Set(sessions.filter((s) => s.success).map((s) => dayKey(s.startedAt)));
}

export function computeStreak(sessions: Session[], now = Date.now()) {
  const days = focusDays(sessions);

  // 현재 스트릭: 오늘 집중했으면 오늘부터, 아직이면 어제부터 거슬러 올라간다
  let cursor = days.has(dayKey(now)) ? now : now - DAY;
  let current = 0;
  while (days.has(dayKey(cursor))) {
    current++;
    cursor -= DAY;
  }

  // 최고 기록
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const k of sorted) {
    const [y, m, d] = k.split('-').map(Number);
    const t = new Date(y, m - 1, d, 12).getTime();
    run = prev !== null && Math.round((t - prev) / DAY) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return { current, best, doneToday: days.has(dayKey(now)) };
}
