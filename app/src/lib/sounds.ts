import { prefs } from './prefs';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

const SOURCES = {
  start: require('../../assets/sounds/start.wav'),
  warn: require('../../assets/sounds/warn.wav'),
  success: require('../../assets/sounds/success.wav'),
  collapse: require('../../assets/sounds/collapse.wav'),
};
export type SoundName = keyof typeof SOURCES;

const players: Partial<Record<SoundName, AudioPlayer>> = {};

export function playSound(name: SoundName) {
  if (!prefs.sfx) return;
  try {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true });
    const player = (players[name] ??= createAudioPlayer(SOURCES[name]));
    // 효과음은 배경 음악보다 작게: 볼륨 설정(낮음/중간/높음)에 맞춰 0.25 / 0.5 / 0.75
    player.volume = 0.5 * (prefs.volume / 0.6);
    player.seekTo(0);
    player.play();
  } catch {}
}
