import { memo, useState } from 'react';
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors } from '../theme';
import { Pixel, SpriteName } from '../components/Pixel';
import { Txt } from '../components/ui';
import { buildingOf } from '../lib/buildings';
import { Session } from '../lib/types';

const SIZE = 8;
const TOTAL = SIZE * SIZE;
const GRASS = require('../../assets/pixel/tile_grass.png');

const CENTER = (SIZE - 1) / 2;
const row = (i: number) => Math.floor(i / SIZE);
const col = (i: number) => i % SIZE;
const dist = (i: number) => Math.hypot(col(i) - CENTER, row(i) - CENTER);
const ALL_TILES = Array.from({ length: TOTAL }, (_, i) => i);

// 건물 자리: 먼저 한 칸씩 띄운 칸(짝수 행·열)에 흩어 놓고, 그 사이 빈 칸(홀수 행·열)은 나중에 채운다.
// 각 그룹 안에서는 중앙에서 바깥으로 퍼져 나간다.
const spreadSort = (tiles: number[]) =>
  tiles.sort((a, b) => Math.round(dist(a) * 1.5) - Math.round(dist(b) * 1.5) || ((a * 7919) % 101) - ((b * 7919) % 101));
const SLOTS = [
  ...spreadSort(ALL_TILES.filter((i) => row(i) % 2 === 0 && col(i) % 2 === 0)),
  ...spreadSort(ALL_TILES.filter((i) => row(i) % 2 === 1 && col(i) % 2 === 1)),
];
// 뒤쪽 칸부터 그려야 앞 건물이 위에 겹친다
const DRAW_ORDER = [...ALL_TILES].sort((a, b) => row(a) + col(a) - (row(b) + col(b)) || a - b);

const PERIODS = ['DAY', 'WEEK', 'MONTH', 'ALL'] as const;
type Period = (typeof PERIODS)[number];

function periodStart(p: Period): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (p === 'WEEK') d.setDate(d.getDate() - 6);
  if (p === 'MONTH') d.setDate(1);
  return p === 'ALL' ? 0 : d.getTime();
}

const Tile = memo(function Tile({ building, w, left, top }: { building?: SpriteName; w: number; left: number; top: number }) {
  const h = w * 0.75;
  const bs = w * 0.8;
  return (
    <View style={{ position: 'absolute', left, top, width: w, height: h }}>
      <Image source={GRASS} style={{ width: w, height: h }} />
      {building && (
        <Pixel name={building} size={bs} style={{ position: 'absolute', left: (w - bs) / 2, top: w * 0.31 - bs }} />
      )}
    </View>
  );
});

export default function TownScreen({ sessions }: { sessions: Session[] }) {
  const { width } = useWindowDimensions();
  const [period, setPeriod] = useState<{ id: Period; start: number }>(() => ({ id: 'ALL', start: 0 }));
  const w = Math.floor(Math.min(width - 24, 560) / SIZE);

  // 땅은 처음부터 전부 깔려 있다. 건물 자리는 "전체 기록" 순서로 정해져서, 기간을 바꿔도 건물이 움직이지 않는다
  const built = sessions.filter((s) => s.success).sort((a, b) => a.startedAt - b.startedAt);
  const onTile = new Map<number, SpriteName>();
  let shown = 0;
  built.forEach((s, i) => {
    if (s.startedAt < period.start) return;
    onTile.set(SLOTS[i % SLOTS.length], buildingOf(s).id);
    shown++;
  });

  const mapH = (2 * (SIZE - 1) * w) / 4 + w * 0.75;

  return (
    <View style={styles.wrap}>
      <Txt style={styles.title}>MY TOWN</Txt>
      <View style={styles.seg}>
        {PERIODS.map((p) => (
          <Pressable key={p} onPress={() => setPeriod({ id: p, start: periodStart(p) })} style={[styles.segItem, period.id === p && styles.segOn]}>
            <Txt style={[styles.segText, period.id === p && { color: colors.bg }]}>{p}</Txt>
          </Pressable>
        ))}
      </View>
      <Txt style={styles.sub}>Buildings {shown}</Txt>
      <View style={styles.mapArea}>
      <View style={{ width: w * SIZE, height: mapH }}>
        {DRAW_ORDER.map((idx) => (
          <Tile
            key={idx}
            building={onTile.get(idx)}
            w={w}
            left={((col(idx) - row(idx) + (SIZE - 1)) * w) / 2}
            top={((row(idx) + col(idx)) * w) / 4}
          />
        ))}
      </View>
      </View>
      {shown === 0 && (
        <Txt style={styles.hint}>{built.length === 0 ? 'Finish a session to build your first building!' : 'No buildings in this period.'}</Txt>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 12, alignItems: 'center' },
  mapArea: { flex: 1, justifyContent: 'center' },
  title: { color: colors.accent, fontSize: 16, marginTop: 8 },
  seg: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 16, marginHorizontal: 8 },
  segItem: { flex: 1, paddingVertical: 11, alignItems: 'center', backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.line },
  segOn: { backgroundColor: colors.accent },
  segText: { fontSize: 8, color: colors.dim },
  sub: { color: colors.dim, fontSize: 9, marginVertical: 14 },
  hint: { color: colors.gold, fontSize: 9, lineHeight: 16, textAlign: 'center', paddingBottom: 24 },
});
