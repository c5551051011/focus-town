import { StyleSheet, View } from 'react-native';
import { Pixel, SpriteName } from './Pixel';
import { BUILDINGS } from '../lib/buildings';

export const TEAM_W = 230;
export const TEAM_H = 200;
const W = TEAM_W;
const H = TEAM_H;
// 가장 큰 건물(주 건물)의 기본 크기. 마을 지도에서 한 칸 건물 크기에 맞춰 줄일 때의 기준이다
export const TEAM_MAIN_SIZE = 150;

// 자리(slot): 가운데 기준 x, 바닥에서의 높이 b, 크기 s, main = 이번 팀이 지은 건물(아니면 한 단계 작은 이웃 건물)
// 뒤쪽 줄이 먼저 그려지고 앞쪽 줄이 그 위에 겹친다.
type Slot = { x: number; b: number; s: number; main: boolean };
const LAYOUTS: Record<number, Slot[]> = {
  1: [{ x: 0, b: 18, s: 150, main: true }],
  2: [
    { x: -40, b: 22, s: 138, main: true },
    { x: 44, b: 22, s: 122, main: false },
  ],
  3: [
    { x: -48, b: 56, s: 112, main: false },
    { x: 48, b: 56, s: 112, main: false },
    { x: 0, b: 12, s: 148, main: true },
  ],
  4: [
    { x: -46, b: 62, s: 104, main: false },
    { x: 46, b: 62, s: 104, main: false },
    { x: -38, b: 10, s: 124, main: true },
    { x: 40, b: 10, s: 112, main: false },
  ],
};

// 함께 지은 건물: 참여한 인원만큼 건물이 한 덩어리로 모여 있다.
// 내구성이 낮을수록 건물들이 기울고, 눌리고, 땅으로 꺼지고, 40% 아래에서는 한 채가 폐허가 된다.
export default function TeamBuilding({ building, members, durability, scale = 1, ground = true }: { building: SpriteName; members: number; durability: number; scale?: number; ground?: boolean }) {
  const n = Math.max(1, Math.min(4, members));
  const slots = LAYOUTS[n];
  const t = Math.max(0, Math.min(1, (100 - durability) / 100)); // 0 = 멀쩡, 1 = 무너짐
  const idx = BUILDINGS.findIndex((x) => x.id === building);
  const neighbor = BUILDINGS[Math.max(0, idx - 1)].id;
  // 폐허가 될 건물: 주 건물이 아닌 첫 번째 자리
  const ruinIndex = durability < 40 ? slots.findIndex((s) => !s.main) : -1;

  return (
    <View style={[styles.box, scale !== 1 && { transformOrigin: '50% 100%', transform: [{ scale }] }]}>
      {ground ? <View style={styles.ground} /> : null}
      {slots.map((s, i) => {
        const sign = i % 2 === 0 ? -1 : 1;
        const f = 0.6 + (((i * 37) % 10) / 10) * 0.4; // 건물마다 조금씩 다르게
        const sprite: SpriteName = i === ruinIndex ? 'ruins' : s.main ? building : neighbor;
        return (
          <Pixel
            key={i}
            name={sprite}
            size={s.s}
            style={{
              position: 'absolute',
              left: W / 2 + s.x - s.s / 2,
              bottom: s.b - t * 14 * f,
              transformOrigin: '50% 100%',
              transform: [{ rotate: `${sign * t * 22 * f}deg` }, { skewX: `${-sign * t * 12 * f}deg` }, { scaleY: 1 - t * 0.2 * f }],
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: W, height: H },
  ground: { position: 'absolute', left: 8, right: 8, bottom: 6, height: 34, borderRadius: 17, backgroundColor: '#1b1930', opacity: 0.7 },
});
