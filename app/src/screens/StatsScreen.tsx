import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, soft } from '../theme';
import Icon from '../components/Icon';
import { Pixel } from '../components/Pixel';
import { Sans, Txt } from '../components/ui';
import SessionTimeline from '../components/SessionTimeline';
import { SectionTitle, StatCard, statGrid } from '../components/cards';
import { BUILDINGS, buildingOf } from '../lib/buildings';
import { computeStats } from '../lib/stats';
import { computeStreak, dayKey } from '../lib/streak';
import { MONTHS, WEEKDAYS, dayTotals, lastDays, monthCells, timeLabel } from '../lib/history';
import { tagColor } from '../lib/tags';
import { Session } from '../lib/types';

type View_ = 'overview' | 'history';

const CARD = soft.card;
const LINE = soft.line;
const SUBTLE = soft.subtle;

export default function StatsScreen({ sessions, goal }: { sessions: Session[]; goal: number }) {
  const [view, setView] = useState<View_>('overview');

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Txt style={styles.title}>STATS</Txt>

      <View style={styles.tabs}>
        {(['overview', 'history'] as const).map((v) => (
          <Pressable key={v} onPress={() => setView(v)} style={[styles.tab, view === v && styles.tabOn]}>
            <Sans style={[styles.tabText, view === v && { color: colors.text }]}>{v === 'overview' ? 'Overview' : 'History'}</Sans>
          </Pressable>
        ))}
      </View>

      {view === 'overview' ? <Overview sessions={sessions} goal={goal} /> : <History sessions={sessions} />}
    </ScrollView>
  );
}

// ───────────────────────── 개요 ─────────────────────────
function Overview({ sessions, goal }: { sessions: Session[]; goal: number }) {
  const s = computeStats(sessions);
  const streak = computeStreak(sessions);
  const totals = dayTotals(sessions);
  const [todayKey] = useState(() => dayKey(Date.now()));
  const week = lastDays(7);
  const scale = Math.max(goal || 60, ...week.map((d) => totals.get(d.key)?.minutes ?? 0));
  const empty = sessions.length === 0;

  const owned: Record<string, number> = {};
  const byTag: Record<string, number> = {};
  sessions.filter((x) => x.success).forEach((x) => {
    const id = buildingOf(x).id;
    owned[id] = (owned[id] ?? 0) + 1;
    const t = x.tag ?? 'OTHER';
    byTag[t] = (byTag[t] ?? 0) + x.minutes;
  });
  const tagRows = Object.entries(byTag).sort((a, b) => b[1] - a[1]);
  const tagMax = Math.max(1, ...tagRows.map(([, m]) => m));

  const pct = goal > 0 ? Math.min(100, Math.round((s.todayMinutes / goal) * 100)) : 0;
  const reached = goal > 0 && s.todayMinutes >= goal;

  return (
    <>
      {/* 오늘 */}
      <View style={styles.hero}>
        <Sans style={styles.eyebrow}>TODAY</Sans>
        <View style={styles.heroRow}>
          <Txt style={styles.heroNum}>{s.todayMinutes}</Txt>
          <Sans style={styles.heroUnit}>min focused</Sans>
        </View>
        {goal > 0 ? (
          <>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct}%`, backgroundColor: reached ? colors.gold : colors.accent }]} />
            </View>
            <Sans style={[styles.heroSub, reached && { color: colors.gold }]}>
              {reached ? `Goal reached! (${goal} min)` : `${pct}% of your ${goal} min goal`}
            </Sans>
          </>
        ) : (
          <Sans style={styles.heroSub}>Set a daily goal in Settings to track it here.</Sans>
        )}
      </View>

      {empty ? (
        <View style={styles.empty}>
          <Pixel name="hut" size={64} />
          <Sans style={styles.emptyTitle}>No sessions yet</Sans>
          <Sans style={styles.emptyText}>Finish your first focus session and your stats will show up here.</Sans>
        </View>
      ) : null}

      {/* 핵심 숫자 4개 */}
      <View style={statGrid.grid}>
        <StatCard icon={<Pixel name="flame" size={34} style={streak.current === 0 && { opacity: 0.35 }} />} value={`${streak.current}`} unit={streak.current === 1 ? 'day' : 'days'} label="Current streak" sub={`Best ${streak.best}`} />
        <StatCard icon={<Icon name="target" size={30} color={colors.gold} />} value={`${s.weekMinutes}`} unit="min" label="Last 7 days" />
        <StatCard icon={<Pixel name="house" size={34} />} value={`${s.successCount}`} unit={s.successCount === 1 ? 'building' : 'buildings'} label="Built so far" />
        <StatCard icon={<Icon name="shield" size={30} color="#8be9fd" />} value={`${s.successRate}`} unit="%" label="Success rate" sub={`${s.successCount} of ${s.total}`} />
      </View>

      {/* 최근 7일 */}
      <SectionTitle>Last 7 days</SectionTitle>
      <View style={styles.card}>
        <View style={styles.chart}>
          {goal > 0 ? <View style={[styles.goalLine, { bottom: `${(goal / scale) * 100}%` }]} /> : null}
          {week.map((d) => {
            const m = totals.get(d.key)?.minutes ?? 0;
            const isToday = d.key === todayKey;
            return (
              <View key={d.key} style={styles.barCol}>
                <View style={styles.barArea}>
                  {m > 0 ? <Sans style={styles.barVal}>{m}</Sans> : null}
                  <View style={[styles.bar, { height: `${Math.max(m > 0 ? 4 : 0, (m / scale) * 100)}%`, backgroundColor: isToday ? colors.gold : colors.accent }]} />
                  {m === 0 ? <View style={styles.barEmpty} /> : null}
                </View>
                <Sans style={[styles.barDay, isToday && { color: colors.gold, fontWeight: '700' }]}>{d.label}</Sans>
              </View>
            );
          })}
        </View>
        {goal > 0 ? <Sans style={styles.chartNote}>Dashed line = your daily goal ({goal} min)</Sans> : null}
      </View>

      {/* 모드별 */}
      {tagRows.length > 0 && (
        <>
          <SectionTitle>By mode</SectionTitle>
          <View style={[styles.card, { gap: 16 }]}>
            {tagRows.map(([tag, m]) => (
              <View key={tag}>
                <View style={styles.modeHead}>
                  <View style={styles.modeName}>
                    <View style={[styles.modeDot, { backgroundColor: tagColor(tag) }]} />
                    <Sans style={styles.modeText}>{tag.charAt(0) + tag.slice(1).toLowerCase()}</Sans>
                  </View>
                  <Sans style={styles.modeMin}>{m} min</Sans>
                </View>
                <View style={styles.modeTrack}>
                  <View style={[styles.modeFill, { width: `${(m / tagMax) * 100}%`, backgroundColor: tagColor(tag) }]} />
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* 건물 도감 */}
      <SectionTitle>Collection</SectionTitle>
      <View style={styles.collection}>
        {BUILDINGS.map((b) => {
          const n = owned[b.id] ?? 0;
          return (
            <View key={b.id} style={styles.dex}>
              <View style={[styles.dexBox, n > 0 && styles.dexBoxOn]}>
                <Pixel name={b.id} size={44} style={n === 0 && { tintColor: '#000', opacity: 0.35 }} />
                {n > 0 ? (
                  <View style={styles.badge}>
                    <Sans style={styles.badgeText}>{n}</Sans>
                  </View>
                ) : null}
              </View>
              <Sans style={[styles.dexName, n === 0 && { opacity: 0.5 }]} numberOfLines={2}>
                {n > 0 ? b.name : '???'}
              </Sans>
            </View>
          );
        })}
      </View>
    </>
  );
}

// ───────────────────────── 기록 ─────────────────────────
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
      <View style={[styles.card, { marginTop: 18 }]}>
        <View style={styles.monthRow}>
          <Pressable onPress={() => shiftMonth(-1)} hitSlop={12} style={styles.arrowBtn}>
            <Sans style={styles.arrow}>‹</Sans>
          </Pressable>
          <Sans style={styles.month}>{MONTHS[month.m]} {month.y}</Sans>
          <Pressable onPress={() => shiftMonth(1)} hitSlop={12} style={styles.arrowBtn}>
            <Sans style={styles.arrow}>›</Sans>
          </Pressable>
        </View>

        <View style={styles.calGrid}>
          {WEEKDAYS.map((d, i) => (
            <View key={`h${i}`} style={styles.cell}>
              <Sans style={styles.wd}>{d}</Sans>
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
                  <Sans style={[styles.dayNum, level > 1 && { color: colors.bg, fontWeight: '700' }]}>{d}</Sans>
                  {t && t.failed > 0 ? <View style={styles.failDot} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.legend}>
          <Sans style={styles.legendText}>Less</Sans>
          {[0, 1, 2, 3].map((l) => (
            <View key={l} style={[styles.legendBox, LEVELS[l]]} />
          ))}
          <Sans style={styles.legendText}>More</Sans>
          <View style={[styles.failDot, { position: 'relative', marginLeft: 10, top: 0, right: 0 }]} />
          <Sans style={styles.legendText}>Failed</Sans>
        </View>
      </View>

      <SectionTitle>Recent activity</SectionTitle>
      <View style={styles.card}>
        <SessionTimeline sessions={sessions} selected={selected} onSelect={setSelected} />
        <Sans style={styles.chartNote}>Tap a day to see its sessions.</Sans>
      </View>

      <SectionTitle>{selected ? formatDay(selected) : 'Latest sessions'}</SectionTitle>
      {list.length === 0 ? (
        <Sans style={styles.noSessions}>{selected ? 'No sessions on this day.' : 'No sessions yet.'}</Sans>
      ) : (
        <View style={styles.card}>
          {list.map((x, i) => (
            <View key={x.id} style={[styles.sessionRow, i > 0 && styles.sessionLine]}>
              <Sans style={styles.sTime}>{timeLabel(x.startedAt)}</Sans>
              <View style={{ flex: 1 }}>
                <Sans style={styles.sMain}>
                  {x.minutes} min{x.group ? ' · with friends' : ''}
                </Sans>
                <View style={styles.sTagRow}>
                  <View style={[styles.modeDot, { backgroundColor: tagColor(x.tag) }]} />
                  <Sans style={styles.sTag}>{x.tag ? x.tag.charAt(0) + x.tag.slice(1).toLowerCase() : 'No mode'}</Sans>
                </View>
              </View>
              <View style={[styles.result, x.success ? styles.resultOk : styles.resultFail]}>
                <Sans style={[styles.resultText, { color: x.success ? colors.gold : colors.danger }]}>{x.success ? 'Built' : 'Failed'}</Sans>
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

function formatDay(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

const LEVELS = [
  { backgroundColor: '#23203a' },
  { backgroundColor: 'rgba(255,121,198,0.35)' },
  { backgroundColor: 'rgba(255,121,198,0.7)' },
  { backgroundColor: colors.accent },
];

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingBottom: 48 },
  title: { color: colors.accent, fontSize: 16, marginTop: 8 },

  tabs: { flexDirection: 'row', marginTop: 18, borderBottomWidth: 2, borderBottomColor: LINE },
  tab: { paddingVertical: 12, paddingHorizontal: 4, marginRight: 24, borderBottomWidth: 3, borderBottomColor: 'transparent', marginBottom: -2 },
  tabOn: { borderBottomColor: colors.accent },
  tabText: { fontSize: 15, color: SUBTLE, fontWeight: '600' },

  section: { color: SUBTLE, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginTop: 30, marginBottom: 12 },
  card: { backgroundColor: CARD, borderRadius: 14, padding: 16 },

  // 오늘
  hero: { backgroundColor: CARD, borderRadius: 16, padding: 20, marginTop: 20 },
  eyebrow: { color: SUBTLE, fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 10 },
  heroNum: { color: colors.gold, fontSize: 42 },
  heroUnit: { color: SUBTLE, fontSize: 15, paddingBottom: 4 },
  track: { height: 10, borderRadius: 5, backgroundColor: '#1b1930', marginTop: 16, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  heroSub: { color: SUBTLE, fontSize: 13, marginTop: 10 },

  empty: { alignItems: 'center', paddingVertical: 28 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptyText: { color: SUBTLE, fontSize: 13, textAlign: 'center', marginTop: 6, maxWidth: 260, lineHeight: 19 },

  // 핵심 숫자
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  stat: { width: '47.8%', backgroundColor: CARD, borderRadius: 14, padding: 16 },
  statIcon: { height: 36, justifyContent: 'center' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 10 },
  statValue: { fontSize: 28, fontWeight: '800' },
  statUnit: { color: SUBTLE, fontSize: 13 },
  statLabel: { color: SUBTLE, fontSize: 13, marginTop: 4 },
  statSub: { color: colors.gold, fontSize: 12, marginTop: 6, fontWeight: '600' },

  // 차트
  chart: { height: 170, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 10 },
  goalLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1.5, borderTopColor: 'rgba(241,250,140,0.55)', borderStyle: 'dashed' },
  chartNote: { color: SUBTLE, fontSize: 11, marginTop: 14, textAlign: 'center' },
  barCol: { flex: 1, height: '100%', alignItems: 'center' },
  barArea: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: 22, borderRadius: 5 },
  barEmpty: { width: 22, height: 4, borderRadius: 2, backgroundColor: LINE },
  barVal: { color: colors.text, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  barDay: { color: SUBTLE, fontSize: 12, marginTop: 8 },

  // 모드별
  modeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modeName: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modeDot: { width: 10, height: 10, borderRadius: 5 },
  modeText: { fontSize: 14, fontWeight: '600' },
  modeMin: { color: SUBTLE, fontSize: 13 },
  modeTrack: { height: 8, borderRadius: 4, backgroundColor: '#1b1930', overflow: 'hidden' },
  modeFill: { height: '100%', borderRadius: 4 },

  // 도감
  collection: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  dex: { flex: 1, alignItems: 'center' },
  dexBox: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center' },
  dexBoxOn: { borderWidth: 2, borderColor: LINE },
  badge: { position: 'absolute', right: -4, top: -6, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: colors.bg, fontSize: 12, fontWeight: '800' },
  dexName: { color: SUBTLE, fontSize: 10, textAlign: 'center', marginTop: 8, lineHeight: 12 }, // 10 → 픽셀 8 (좁은 칸에 "Library"가 들어가도록)

  // 기록: 달력
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  arrowBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#23203a' },
  arrow: { color: colors.accent, fontSize: 24, fontWeight: '700', lineHeight: 28 },
  month: { fontSize: 16, fontWeight: '700' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
  wd: { color: SUBTLE, fontSize: 12, fontWeight: '600' },
  day: { width: '100%', height: '100%', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  daySel: { borderWidth: 2, borderColor: colors.gold },
  dayToday: { borderWidth: 2, borderColor: SUBTLE },
  dayNum: { color: colors.text, fontSize: 13 },
  failDot: { position: 'absolute', right: 5, top: 5, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 14 },
  legendBox: { width: 14, height: 14, borderRadius: 4 },
  legendText: { color: SUBTLE, fontSize: 11 },

  // 기록: 세션 목록
  noSessions: { color: SUBTLE, fontSize: 14 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
  sessionLine: { borderTopWidth: 1, borderTopColor: LINE },
  sTime: { color: SUBTLE, fontSize: 14, width: 48, fontWeight: '600' },
  sMain: { fontSize: 15, fontWeight: '700' },
  sTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  sTag: { color: SUBTLE, fontSize: 12 },
  result: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12 },
  resultOk: { backgroundColor: 'rgba(241,250,140,0.12)' },
  resultFail: { backgroundColor: 'rgba(255,85,85,0.14)' },
  resultText: { fontSize: 12, fontWeight: '700' },
});
