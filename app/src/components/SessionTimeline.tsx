import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { colors, soft } from '../theme';
import { Sans } from './ui';
import { dayKey } from '../lib/streak';
import { tagColor } from '../lib/tags';
import { Session } from '../lib/types';

const DAYS = 7;
const ROW = 26;
const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// 최근 7일을 "하루 24시간 띠"로 보여주는 활동 그래프: 세션마다 시작 시각에 맞춰 길이만큼 칸이 놓이고, 색은 모드 색이다.
// 실패한 세션은 붉은 테두리의 흐린 칸이다. 줄을 누르면 그날의 세션 목록이 아래에 나온다.
export default function SessionTimeline({ sessions, selected, onSelect }: { sessions: Session[]; selected: string | null; onSelect: (key: string | null) => void }) {
  const [trackW, setTrackW] = useState(0);
  const [now] = useState(() => Date.now());

  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const key = dayKey(d.getTime());
    const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : `${NAMES[d.getDay()]} ${d.getDate()}`;
    return { key, label, items: sessions.filter((s) => dayKey(s.startedAt) === key) };
  });

  const modes = Array.from(new Set(sessions.filter((s) => days.some((d) => d.key === dayKey(s.startedAt))).map((s) => s.tag ?? '')));

  const onLayout = (e: LayoutChangeEvent) => setTrackW(e.nativeEvent.layout.width);

  return (
    <View>
      {days.map((d) => (
        <Pressable key={d.key} onPress={() => onSelect(selected === d.key ? null : d.key)} style={[styles.row, selected === d.key && styles.rowSel]}>
          <Sans style={[styles.label, d.items.length === 0 && { opacity: 0.55 }]} numberOfLines={1}>{d.label}</Sans>
          <View style={styles.track} onLayout={onLayout}>
            {[6, 12, 18].map((h) => (
              <View key={h} style={[styles.tick, { left: `${(h / 24) * 100}%` }]} />
            ))}
            {d.items.map((s) => {
              const dt = new Date(s.startedAt);
              const startHour = dt.getHours() + dt.getMinutes() / 60;
              const left = (startHour / 24) * trackW;
              const w = Math.max(7, (s.minutes / 60 / 24) * trackW);
              const color = tagColor(s.tag);
              return (
                <View
                  key={s.id}
                  style={[
                    styles.block,
                    { left: Math.min(left, Math.max(0, trackW - w)), width: w },
                    s.success ? { backgroundColor: color } : { backgroundColor: 'rgba(255,85,85,0.25)', borderWidth: 1.5, borderColor: colors.danger },
                  ]}
                />
              );
            })}
          </View>
        </Pressable>
      ))}

      {/* 시간 눈금 */}
      <View style={styles.axisRow}>
        <View style={{ width: LABEL_W }} />
        <View style={styles.axis}>
          {[0, 6, 12, 18, 24].map((h) => (
            <Sans key={h} style={[styles.axisText, { left: `${(h / 24) * 100}%` }, h === 24 && { transform: [{ translateX: -14 }] }, h === 0 && { transform: [{ translateX: 0 }] }, h !== 0 && h !== 24 && { transform: [{ translateX: -7 }] }]}>
              {h}h
            </Sans>
          ))}
        </View>
      </View>

      {/* 범례 */}
      <View style={styles.legend}>
        {modes.filter(Boolean).map((m) => (
          <View key={m} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: tagColor(m) }]} />
            <Sans style={styles.legendText}>{m.charAt(0) + m.slice(1).toLowerCase()}</Sans>
          </View>
        ))}
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: 'rgba(255,85,85,0.25)', borderWidth: 1.5, borderColor: colors.danger }]} />
          <Sans style={styles.legendText}>Failed</Sans>
        </View>
      </View>
    </View>
  );
}

const LABEL_W = 96;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: ROW + 10, borderRadius: 8, paddingHorizontal: 2 },
  rowSel: { backgroundColor: 'rgba(241,250,140,0.08)' },
  label: { width: LABEL_W, color: soft.subtle, fontSize: 12, fontWeight: '600' },
  track: { flex: 1, height: ROW, borderRadius: 6, backgroundColor: soft.sunken, overflow: 'hidden' },
  tick: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: soft.line },
  block: { position: 'absolute', top: 4, bottom: 4, borderRadius: 4 },
  axisRow: { flexDirection: 'row', marginTop: 6, paddingHorizontal: 2 },
  axis: { flex: 1, height: 16 },
  axisText: { position: 'absolute', color: soft.subtle, fontSize: 10 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: soft.subtle, fontSize: 12 },
});
