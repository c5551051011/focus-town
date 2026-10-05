const CHEERS = [
  'Nice work!',
  'You are doing great!',
  'Bricks are stacking up!',
  'Keep it up!',
  'Stay focused!',
  'Looking good!',
  'One brick at a time.',
  'Your town is proud of you!',
];

// 진행도와 경과 시간에 따라 바뀌는 응원 문구 (8초마다 교체)
export function statusMessage(progress: number, elapsedSec: number, recovered: boolean): string {
  if (recovered) return 'Welcome back!';
  if (progress < 0.08) return 'Laying the foundation...\nStay in the app.';
  if (progress > 0.9) return 'Almost there!\nJust a little more.';
  if (progress > 0.5 && Math.floor(elapsedSec / 8) % 5 === 0) return 'Halfway done!\nGreat focus.';
  return CHEERS[Math.floor(elapsedSec / 8) % CHEERS.length] + '\nBuilding...';
}
