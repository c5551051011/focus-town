import { Session } from './types';

const DAY = 24 * 60 * 60 * 1000;

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function computeStats(sessions: Session[]) {
  const today = startOfToday();
  const weekStart = today - 6 * DAY;
  const minutesSince = (from: number) =>
    sessions.filter((s) => s.success && s.startedAt >= from).reduce((sum, s) => sum + s.minutes, 0);
  const successCount = sessions.filter((s) => s.success).length;
  return {
    todayMinutes: minutesSince(today),
    weekMinutes: minutesSince(weekStart),
    total: sessions.length,
    successCount,
    successRate: sessions.length ? Math.round((successCount / sessions.length) * 100) : 0,
  };
}
