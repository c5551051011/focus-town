import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, soft } from '../theme';
import { Sans, Txt } from './ui';

// Stats 와 ME 가 같이 쓰는 카드 부품

export function SectionTitle({ children }: { children: string }) {
  return <Sans style={styles.section}>{children.toUpperCase()}</Sans>;
}

export function StatCard({ icon, value, unit, label, sub }: { icon: ReactNode; value: string; unit: string; label: string; sub?: string }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statIcon}>{icon}</View>
      <View style={styles.valueRow}>
        <Sans style={styles.statValue}>{value}</Sans>
        <Sans style={styles.statUnit}>{unit}</Sans>
      </View>
      <Sans style={styles.statLabel}>{label}</Sans>
      {sub ? <Sans style={styles.statSub}>{sub}</Sans> : null}
    </View>
  );
}

// 탭 위에 전체 화면으로 열리는 화면의 머리글: 둥근 뒤로가기 버튼 + 제목
export function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
        <Sans style={styles.backArrow}>‹</Sans>
      </Pressable>
      <Txt style={styles.headerTitle}>{title}</Txt>
      <View style={{ width: 40 }} />
    </View>
  );
}

export const statGrid = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
});

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: soft.card, alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: colors.accent, fontSize: 26, fontWeight: '700', lineHeight: 30 },
  headerTitle: { color: colors.accent, fontSize: 14 },
  section: { color: soft.subtle, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginTop: 30, marginBottom: 12 },
  stat: { width: '47.8%', backgroundColor: soft.card, borderRadius: 14, padding: 16 },
  statIcon: { height: 36, justifyContent: 'center' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 10 },
  statValue: { fontSize: 28, fontWeight: '800' },
  statUnit: { color: soft.subtle, fontSize: 13 },
  statLabel: { color: soft.subtle, fontSize: 13, marginTop: 4 },
  statSub: { color: colors.gold, fontSize: 12, marginTop: 6, fontWeight: '600' },
});
