export type Session = {
  id: string;
  startedAt: number;
  minutes: number;
  success: boolean;
  tag?: string; // 집중 모드 (예전 기록에는 없을 수 있음)
};
