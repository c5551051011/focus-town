import { memo, useState } from 'react';
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors, soft } from '../theme';
import { Pixel, SpriteName } from '../components/Pixel';
import { Sans, Txt } from '../components/ui';
import { BUILDINGS, buildingOf } from '../lib/buildings';
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

const LABELS: Record<string, string> = { DAY: 'Day', WEEK: 'Week', MONTH: 'Month', ALL: 'All' };
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
  const counts: Record<string, number> = {};
  let shown = 0;
  built.forEach((s, i) => {
    if (s.startedAt < period.start) return;
    const id = buildingOf(s).id;
    onTile.set(SLOTS[i % SLOTS.length], id);
    counts[id] = (counts[id] ?? 0) + 1;
    shown++;
  });

  const mapH = (2 * (SIZE - 1) * w) / 4 + w * 0.75;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Txt style={styles.title}>MY TOWN</Txt>
        <Sans style={styles.count}>
          {shown} {shown === 1 ? 'building' : 'buildings'}
        </Sans>
      </View>

      {/* 기간 선택: 둥근 알약 모양 구간 선택 */}
      <View style={styles.seg}>
        {PERIODS.map((p) => (
          <Pressable key={p} onPress={() => setPeriod({ id: p, start: periodStart(p) })} style={[styles.segItem, period.id === p && styles.segOn]}>
            <Sans style={[styles.segText, period.id === p && { color: colors.bg, fontWeight: '800' }]}>{LABELS[p]}</Sans>
          </Pressable>
        ))}
      </View>
      <View style={styles.mapArea}>
      <View style={styles.stage}>
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
      </View>
      {shown > 0 && (
        <View style={styles.summary}>
          {BUILDINGS.map((b) => (
            <View key={b.id} style={[styles.summaryItem, !counts[b.id] && { opacity: 0.35 }]}>
              <Pixel name={b.id} size={30} />
              <Sans style={styles.summaryCount}>{counts[b.id] ?? 0}</Sans>
            </View>
          ))}
        </View>
      )}

      {shown === 0 && (
        <View style={styles.hintCard}>
          <Sans style={styles.hintTitle}>{built.length === 0 ? 'Your town is waiting' : 'Nothing built in this period'}</Sans>
          <Sans style={styles.hintText}>{built.length === 0 ? 'Finish a focus session to build your first building.' : 'Try a longer period to see your buildings.'}</Sans>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 12, alignItems: 'center' },
  mapArea: { flex: 1, justifyContent: 'center' },
  stage: { paddingVertical: 26, paddingHorizontal: 4, borderRadius: 26, backgroundColor: '#23203a', borderWidth: 1.5, borderColor: soft.line },
  header: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, marginTop: 8 },
  title: { color: colors.accent, fontSize: 16 },
  count: { color: soft.subtle, fontSize: 14, fontWeight: '600' },
  seg: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 16, marginHorizontal: 8, padding: 4, borderRadius: 22, backgroundColor: soft.card },
  segItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 18 },
  segOn: { backgroundColor: colors.accent },
  segText: { fontSize: 14, color: soft.subtle, fontWeight: '600' },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', marginHorizontal: 8, marginBottom: 16, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 16, backgroundColor: soft.card },
  summaryItem: { alignItems: 'center', gap: 6 },
  summaryCount: { fontSize: 12, color: colors.text },
  hintCard: { alignSelf: 'stretch', marginHorizontal: 8, marginBottom: 16, padding: 16, borderRadius: 14, backgroundColor: soft.card, alignItems: 'center' },
  hintTitle: { fontSize: 15, fontWeight: '700' },
  hintText: { color: soft.subtle, fontSize: 13, marginTop: 6, textAlign: 'center' },
});
