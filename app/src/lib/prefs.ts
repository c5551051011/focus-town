// 설정 값을 어디서든 읽을 수 있게 모아 둔 모듈 (App이 설정이 바뀔 때마다 갱신한다)
export type VolumeLevel = 'low' | 'mid' | 'high';
export const VOLUME_VALUES: Record<VolumeLevel, number> = { low: 0.3, mid: 0.6, high: 0.9 };

export const prefs = {
  sfx: true,
  haptics: true,
  notify: true,
  volume: 0.6,
};
