import { Pressable, StyleSheet, View } from 'react-native';
import { colors, soft } from '../theme';
import Icon from './Icon';
import { Pixel } from './Pixel';
import { Sans } from './ui';

export type TabId = 'setup' | 'town' | 'stats' | 'me';

const TABS: { id: TabId; label: string }[] = [
  { id: 'setup', label: 'Focus' },
  { id: 'town', label: 'Town' },
  { id: 'stats', label: 'Stats' },
  { id: 'me', label: 'Me' },
];

// 하단 탭: 아이콘 + 이름, 선택된 탭은 둥근 알약 배경과 분홍색
export default function TabBar({ tab, onChange }: { tab: TabId; onChange: (t: TabId) => void }) {
  return (
    <View style={styles.bar}>
      {TABS.map((t) => {
        const on = tab === t.id;
        const color = on ? colors.accent : soft.subtle;
        return (
          <Pressable key={t.id} style={styles.tab} onPress={() => onChange(t.id)}>
            <View style={[styles.pill, on && styles.pillOn]}>
              {t.id === 'setup' ? <Icon name="target" size={22} color={color} /> : null}
              {t.id === 'town' ? <Pixel name="house" size={24} style={{ opacity: on ? 1 : 0.55 }} /> : null}
              {t.id === 'stats' ? <Icon name="chart" size={22} color={color} /> : null}
              {t.id === 'me' ? <Icon name="user" size={22} color={color} /> : null}
            </View>
            <Sans style={[styles.label, { color }]}>{t.label}</Sans>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: '#23203a', paddingTop: 8, paddingBottom: 6 },
  tab: { flex: 1, alignItems: 'center' },
  pill: { width: 58, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: 'rgba(255,121,198,0.16)' },
  label: { fontSize: 10, marginTop: 4 },
});
