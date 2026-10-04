import { Session } from './types';
import { dayKey } from './streak';

export const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export type DayTotal = { minutes: number; success: number; failed: number };

// 날짜별 집중 분(성공 세션만)과 성공/실패 횟수
export function dayTotals(sessions: Session[]): Map<string, DayTotal> {
  const map = new Map<string, DayTotal>();
  for (const s of sessions) {
    const k = dayKey(s.startedAt);
    const t = map.get(k) ?? { minutes: 0, success: 0, failed: 0 };
    if (s.success) {
      t.minutes += s.minutes;
      t.success++;
    } else t.failed++;
    map.set(k, t);
  }
  return map;
}

export function lastDays(n: number, now = Date.now()): { key: string; label: string }[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now - (n - 1 - i) * 24 * 60 * 60 * 1000);
    return { key: dayKey(d.getTime()), label: WEEKDAYS[d.getDay()] };
  });
}

export function monthCells(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(first).fill(null);
  for (let d = 1; d <= count; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function timeLabel(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
