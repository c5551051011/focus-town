import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { prefs } from './prefs';

// lofi 트랙은 Open Lo-Fi(CC0) 음원. assets/music/LICENSE.md 참고.
export const AMBIENTS = [
  { id: 'off', label: 'OFF', hint: '' },
  { id: 'lofi1', label: 'LO-FI 1', hint: 'Coffee Ring' },
  { id: 'lofi2', label: 'LO-FI 2', hint: 'Lamplight' },
  { id: 'lofi3', label: 'LO-FI 3', hint: 'Brushstrokes' },
  { id: 'lofi4', label: 'LO-FI 4', hint: 'Floating' },
] as const;
export type AmbientId = (typeof AMBIENTS)[number]['id'];

const SOURCES: Record<Exclude<AmbientId, 'off'>, number> = {
  lofi1: require('../../assets/music/coffee-ring-notebook.mp3'),
  lofi2: require('../../assets/music/chapter-by-lamplight.mp3'),
  lofi3: require('../../assets/music/brushstrokes-and-rain.mp3'),
  lofi4: require('../../assets/music/almost-floating.mp3'),
};

let current: AudioPlayer | null = null;

export function ambientLabel(id: AmbientId) {
  return AMBIENTS.find((a) => a.id === id)?.label ?? 'OFF';
}

export function startAmbient(id: AmbientId) {
  stopAmbient();
  if (id === 'off') return;
  try {
    setAudioModeAsync({ playsInSilentMode: true });
    const player = createAudioPlayer(SOURCES[id]);
    player.loop = true;
    player.volume = prefs.volume;
    player.play();
    current = player;
  } catch {}
}

export function setAmbientMuted(muted: boolean) {
  try {
    if (!current) return;
    if (muted) current.pause();
    else current.play();
  } catch {}
}

export function setAmbientVolume(v: number) {
  try {
    if (current) current.volume = v;
  } catch {}
}

export function stopAmbient() {
  try {
    current?.pause();
    current?.remove();
  } catch {}
  current = null;
}
