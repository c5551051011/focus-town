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
    player.seekTo(0);
    player.play();
  } catch {}
}
