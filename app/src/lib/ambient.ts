import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { prefs } from './prefs';

// 배경 음악: Open Lo-Fi(CC0) 음원을 집중 모드에 어울리게 분류했다. assets/music/LICENSE.md 참고.
// modes: 이 곡이 어울리는 모드 (첫 번째가 대표 분류). 직접 만든 모드에는 분류가 없다.
// kind: 음악이 아닌 소리의 종류(비, 종소리, 싱잉볼)를 표시한다.
type Track = { id: string; title: string; modes: string[]; file: number; kind?: string };

export const TRACKS: Track[] = [
  // STUDY — 조용히 몰입
  { id: 'lofi1', title: 'Coffee Ring Notebook', modes: ['STUDY'], file: require('../../assets/music/coffee-ring-notebook.mp3') },
  { id: 'lofi2', title: 'Chapter By Lamplight', modes: ['STUDY', 'READING'], file: require('../../assets/music/chapter-by-lamplight.mp3') },
  { id: 'graphite', title: 'Graphite in the Quiet', modes: ['STUDY', 'WORK'], file: require('../../assets/music/graphite-in-the-quiet.mp3') },
  { id: 'penciled', title: 'Penciled Sunbeams', modes: ['STUDY'], file: require('../../assets/music/penciled-sunbeams.mp3') },
  // READING — 책 읽기 좋은 재즈풍
  { id: 'stacks', title: 'Stacks of Quiet Books', modes: ['READING', 'STUDY'], file: require('../../assets/music/stacks-of-quiet-books.mp3') },
  { id: 'hardcovers', title: 'Dust and Hardcovers', modes: ['READING'], file: require('../../assets/music/dust-and-hardcovers.mp3') },
  // WORK — 가볍게 이어지는 칠합
  { id: 'kettle', title: 'Kettle Before Work', modes: ['WORK', 'STUDY'], file: require('../../assets/music/kettle-before-work.mp3') },
  { id: 'softgold', title: 'Soft Gold Sky', modes: ['WORK'], file: require('../../assets/music/soft-gold-sky.mp3') },
  // EXERCISE — 리듬감 있는 펑크/소울
  { id: 'bounce', title: 'Cassette Basement Bounce', modes: ['EXERCISE'], file: require('../../assets/music/cassette-basement-bounce.mp3') },
  { id: 'rink', title: 'Roller Rink Reverie', modes: ['EXERCISE'], file: require('../../assets/music/roller-rink-reverie.mp3') },
  // REST — 쉬는 시간, 비와 그늘
  { id: 'lofi3', title: 'Brushstrokes and Rain', modes: ['REST', 'READING'], file: require('../../assets/music/brushstrokes-and-rain.mp3') },
  { id: 'hammock', title: 'Hammock in the Shade', modes: ['REST'], file: require('../../assets/music/hammock-in-the-shade.mp3') },
  { id: 'petals', title: 'Petals After Rain', modes: ['REST', 'READING'], file: require('../../assets/music/petals-after-rain.mp3') },
  // SLEEP — 잔잔한 앰비언트, 싱잉볼, 종소리, 빗소리
  { id: 'bowl', title: 'Singing Bowl', modes: ['SLEEP', 'REST'], kind: 'SINGING BOWL', file: require('../../assets/music/singing-bowl.wav') },
  { id: 'bells', title: 'Bells Before Sunrise', modes: ['SLEEP', 'REST'], kind: 'BELLS', file: require('../../assets/music/bells-before-sunrise.mp3') },
  { id: 'temple', title: 'Temple at Dawn', modes: ['SLEEP', 'READING'], kind: 'BELLS', file: require('../../assets/music/temple-at-dawn.mp3') },
  { id: 'storm', title: 'Storm Over Side Streets', modes: ['SLEEP', 'REST'], kind: 'RAIN', file: require('../../assets/music/storm-over-side-streets.mp3') },
  { id: 'puddles', title: 'Sidewalk Puddles', modes: ['REST', 'SLEEP'], kind: 'RAIN', file: require('../../assets/music/sidewalk-puddles.mp3') },
  { id: 'lofi4', title: 'Almost Floating', modes: ['SLEEP', 'REST'], file: require('../../assets/music/almost-floating.mp3') },
  { id: 'weightless', title: 'Soft Weightless Hours', modes: ['SLEEP'], file: require('../../assets/music/soft-weightless-hours.mp3') },
  { id: 'lullaby', title: 'Satellite Lullaby', modes: ['SLEEP', 'REST'], file: require('../../assets/music/satellite-lullaby.mp3') },
];

export const AMBIENTS = [{ id: 'off', label: 'OFF', hint: '' }, ...TRACKS.map((t) => ({ id: t.id, label: t.title, hint: [t.kind, ...t.modes].filter(Boolean).join(' · ') }))];
export type AmbientId = string;

const byId = new Map(TRACKS.map((t) => [t.id, t]));
export const isAmbientId = (id: string) => id === 'off' || byId.has(id);

export function ambientLabel(id: AmbientId) {
  return byId.get(id)?.title ?? 'OFF';
}

let current: AudioPlayer | null = null;

export function startAmbient(id: AmbientId) {
  stopAmbient();
  const track = byId.get(id);
  if (!track) return;
  try {
    setAudioModeAsync({ playsInSilentMode: true });
    const player = createAudioPlayer(track.file);
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
