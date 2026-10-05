import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { Pixel } from '../components/Pixel';
import { Panel, Txt } from '../components/ui';
import { BUILDINGS, buildingFor } from '../lib/buildings';
import { computeStats } from '../lib/stats';
import { computeStreak, dayKey } from '../lib/streak';
import { tagColor } from '../lib/tags';
import { MONTHS, WEEKDAYS, dayTotals, lastDays, monthCells, timeLabel } from '../lib/history';
import { Session } from '../lib/types';

type View_ = 'overview' | 'history';

export default function StatsScreen({ sessions }: { sessions: Session[] }) {
  const [view, setView] = useState<View_>('overview');

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Txt style={styles.title}>STATS</Txt>
      <View style={styles.seg}>
        {(['overview', 'history'] as const).map((v) => (
          <Pressable key={v} onPress={() => setView(v)} style={[styles.segItem, view === v && styles.segOn]}>
            <Txt style={[styles.segText, view === v && { color: colors.bg }]}>{v.toUpperCase()}</Txt>
          </Pressable>
        ))}
      </View>
      {view === 'overview' ? <Overview sessions={sessions} /> : <History sessions={sessions} />}
    </ScrollView>
  );
}

function Overview({ sessions }: { sessions: Session[] }) {
  const s = computeStats(sessions);
  const streak = computeStreak(sessions);
  const totals = dayTotals(sessions);
  const [todayKey] = useState(() => dayKey(Date.now()));
  const week = lastDays(7);
  const weekMax = Math.max(60, ...week.map((d) => totals.get(d.key)?.minutes ?? 0));
  const owned: Record<string, number> = {};
  const byTag: Record<string, number> = {};
  sessions.filter((x) => x.success).forEach((x) => {
    const id = buildingFor(x.minutes).id;
    owned[id] = (owned[id] ?? 0) + 1;
    const t = x.tag ?? 'OTHER';
    byTag[t] = (byTag[t] ?? 0) + x.minutes;
  });
  const tagRows = Object.entries(byTag).sort((a, b) => b[1] - a[1]);
  const tagMax = Math.max(1, ...tagRows.map(([, m]) => m));

  return (
    <>
      {/* 오늘 */}
      <Panel style={styles.hero}>
        <Txt style={styles.heroLabel}>TODAY</Txt>
        <View style={styles.heroNumRow}>
          <Txt style={styles.heroNum}>{s.todayMinutes}</Txt>
          <Txt style={styles.heroUnit}>MIN</Txt>
        </View>
      </Panel>

      {/* 스트릭 */}
      <Panel style={styles.streak}>
        <Pixel name="flame" size={56} style={streak.current === 0 && { opacity: 0.3 }} />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <View style={styles.heroNumRow}>
            <Txt style={[styles.streakNum, streak.current === 0 && { color: colors.dim }]}>{streak.current}</Txt>
            <Txt style={styles.heroUnit}>DAY STREAK</Txt>
          </View>
          <Txt style={styles.streakBest}>BEST {streak.best} DAYS</Txt>
        </View>
      </Panel>

      {/* 요약 */}
      <View style={styles.row}>
        <Mini label="7 DAYS" value={`${s.weekMinutes}m`} />
        <Mini label="BUILT" value={String(s.successCount)} />
        <Mini label="SUCCESS" value={`${s.successRate}%`} />
      </View>

      <Txt style={styles.section}>LAST 7 DAYS</Txt>
      <Panel style={styles.bars}>
        {week.map((d) => {
          const m = totals.get(d.key)?.minutes ?? 0;
          const isToday = d.key === todayKey;
          return (
            <View key={d.key} style={styles.barCol}>
              <Txt style={styles.barVal}>{m || ''}</Txt>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: `${(m / weekMax) * 100}%` }, isToday && { backgroundColor: colors.gold }]} />
              </View>
              <Txt style={[styles.barDay, isToday && { color: colors.gold }]}>{d.label}</Txt>
            </View>
          );
        })}
      </Panel>

      {tagRows.length > 0 && (
        <>
          <Txt style={styles.section}>BY MODE</Txt>
          <Panel style={{ gap: 14 }}>
            {tagRows.map(([tag, m]) => (
              <View key={tag}>
                <View style={styles.tagHead}>
                  <Txt style={[styles.tagName, { color: tagColor(tag) }]}>{tag}</Txt>
                  <Txt style={styles.tagMin}>{m}m</Txt>
                </View>
                <View style={styles.tagTrack}>
                  <View style={[styles.tagFill, { width: `${(m / tagMax) * 100}%`, backgroundColor: tagColor(tag) }]} />
                </View>
              </View>
            ))}
          </Panel>
        </>
      )}

      <Txt style={styles.section}>COLLECTION</Txt>
      <View style={styles.dexGrid}>
        {BUILDINGS.map((b) => {
          const n = owned[b.id] ?? 0;
          return (
            <Panel key={b.id} style={styles.dex}>
              <Pixel name={b.id} size={56} style={n === 0 && { tintColor: '#000', opacity: 0.4 }} />
              <Txt style={styles.dexName}>{n ? b.name : '???'}</Txt>
              <Txt style={styles.dexCount}>x{n}</Txt>
            </Panel>
          );
        })}
      </View>
    </>
  );
}

function History({ sessions }: { sessions: Session[] }) {
  const totals = dayTotals(sessions);
  const [today] = useState(() => new Date());
  const todayKey = dayKey(today.getTime());
  const [month, setMonth] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = useState<string | null>(null);

  const shiftMonth = (d: number) => {
    const t = new Date(month.y, month.m + d, 1);
    setMonth({ y: t.getFullYear(), m: t.getMonth() });
    setSelected(null);
  };

  const cells = monthCells(month.y, month.m);
  const keyOf = (d: number) => dayKey(new Date(month.y, month.m, d, 12).getTime());
  const list = (selected ? sessions.filter((x) => dayKey(x.startedAt) === selected) : sessions.slice(-8))
    .slice()
    .sort((a, b) => b.startedAt - a.startedAt);

  return (
    <>
      <Panel style={{ marginTop: 18 }}>
        <View style={styles.monthRow}>
          <Txt style={styles.arrow} onPress={() => shiftMonth(-1)}>{'<'}</Txt>
          <Txt style={styles.month}>{MONTHS[month.m]} {month.y}</Txt>
          <Txt style={styles.arrow} onPress={() => shiftMonth(1)}>{'>'}</Txt>
        </View>
        <View style={styles.grid}>
          {WEEKDAYS.map((d, i) => (
            <View key={`h${i}`} style={styles.cell}>
              <Txt style={styles.wd}>{d}</Txt>
            </View>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <View key={i} style={styles.cell} />;
            const k = keyOf(d);
            const t = totals.get(k);
            const level = !t || !t.minutes ? 0 : t.minutes < 30 ? 1 : t.minutes < 60 ? 2 : 3;
            return (
              <Pressable key={i} style={styles.cell} onPress={() => setSelected(selected === k ? null : k)}>
                <View style={[styles.day, LEVELS[level], k === todayKey && styles.dayToday, selected === k && styles.daySel]}>
                  <Txt style={[styles.dayNum, level > 1 && { color: colors.bg }]}>{d}</Txt>
                  {t && t.failed > 0 && <View style={styles.failDot} />}
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.legend}>
          <Txt style={styles.legendText}>LESS</Txt>
          {[0, 1, 2, 3].map((l) => (
            <View key={l} style={[styles.legendBox, LEVELS[l]]} />
          ))}
          <Txt style={styles.legendText}>MORE</Txt>
        </View>
      </Panel>

      <Txt style={styles.section}>{selected ? selected : 'RECENT SESSIONS'}</Txt>
      {list.length === 0 ? (
        <Txt style={styles.empty}>{selected ? 'No sessions this day.' : 'No sessions yet.'}</Txt>
      ) : (
        <Panel style={styles.listBox}>
          {list.map((x, i) => (
            <View key={x.id} style={[styles.item, i > 0 && styles.itemLine]}>
              <Txt style={styles.itemTime}>{timeLabel(x.startedAt)}</Txt>
              <Txt style={styles.itemMain}>{x.minutes}m</Txt>
              <Txt style={[styles.itemName, { color: tagColor(x.tag) }]}>{x.tag ?? '-'}</Txt>
              <Txt style={[styles.itemRes, { color: x.success ? colors.gold : colors.danger }]}>{x.success ? 'BUILT' : 'FAIL'}</Txt>
            </View>
          ))}
        </Panel>
      )}
    </>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <Panel style={styles.mini}>
      <Txt style={styles.miniValue}>{value}</Txt>
      <Txt style={styles.miniLabel}>{label}</Txt>
    </Panel>
  );
}

const LEVELS = [
  { backgroundColor: colors.bg },
  { backgroundColor: 'rgba(255,121,198,0.35)' },
  { backgroundColor: 'rgba(255,121,198,0.7)' },
  { backgroundColor: colors.accent },
];

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingBottom: 40 },
  title: { color: colors.accent, fontSize: 16, marginTop: 8, marginBottom: 16 },
  seg: { flexDirection: 'row' },
  segItem: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.line },
  segOn: { backgroundColor: colors.accent },
  segText: { fontSize: 9, color: colors.dim },
  row: { flexDirection: 'row', gap: 8 },
  dexGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  section: { color: colors.text, fontSize: 11, marginTop: 28, marginBottom: 12 },
  hero: { alignItems: 'center', paddingVertical: 22, marginTop: 18 },
  heroLabel: { color: colors.dim, fontSize: 10 },
  heroNumRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 10 },
  heroNum: { color: colors.gold, fontSize: 44 },
  heroUnit: { color: colors.dim, fontSize: 10 },
  streak: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingVertical: 14 },
  streakNum: { color: colors.gold, fontSize: 30 },
  streakBest: { color: colors.dim, fontSize: 8, marginTop: 10 },
  mini: { flex: 1, alignItems: 'center', paddingVertical: 16, marginTop: 10 },
  miniValue: { fontSize: 14 },
  miniLabel: { color: colors.dim, fontSize: 8, marginTop: 10 },
  bars: { flexDirection: 'row', justifyContent: 'space-between', height: 170, paddingBottom: 10 },
  barCol: { flex: 1, alignItems: 'center' },
  barVal: { fontSize: 7, color: colors.gold, height: 12 },
  barTrack: { flex: 1, width: 24, justifyContent: 'flex-end', backgroundColor: colors.bg, borderWidth: 3, borderColor: colors.line, marginVertical: 6 },
  barFill: { width: '100%', backgroundColor: colors.accent },
  barDay: { fontSize: 9, color: colors.dim },
  tagHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  tagName: { fontSize: 9 },
  tagMin: { fontSize: 9, color: colors.gold },
  tagTrack: { height: 14, backgroundColor: colors.bg, borderWidth: 3, borderColor: colors.line },
  tagFill: { height: '100%', backgroundColor: colors.accent },
  dex: { width: '31.5%', alignItems: 'center', paddingVertical: 14 },
  dexName: { fontSize: 8, lineHeight: 13, textAlign: 'center', marginTop: 10 },
  dexCount: { color: colors.dim, fontSize: 9, marginTop: 8 },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  arrow: { fontSize: 16, color: colors.accent, paddingHorizontal: 14, paddingVertical: 6 },
  month: { fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
  wd: { fontSize: 9, color: colors.dim },
  day: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  daySel: { borderWidth: 3, borderColor: colors.gold },
  dayToday: { borderWidth: 2, borderColor: colors.dim },
  dayNum: { fontSize: 9 },
  failDot: { position: 'absolute', right: 3, top: 3, width: 6, height: 6, backgroundColor: colors.danger },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 12 },
  legendBox: { width: 14, height: 14, borderWidth: 2, borderColor: colors.line },
  legendText: { fontSize: 7, color: colors.dim },
  empty: { color: colors.dim, fontSize: 9 },
  listBox: { paddingVertical: 4 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  itemLine: { borderTopWidth: 2, borderTopColor: colors.bg },
  itemTime: { fontSize: 9, color: colors.dim, width: 48 },
  itemMain: { fontSize: 9, width: 44 },
  itemName: { fontSize: 8, flex: 1, color: colors.dim },
  itemRes: { fontSize: 8 },
});
