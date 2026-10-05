import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { Pixel } from '../components/Pixel';
import { PixelButton, Txt } from '../components/ui';
import { Character } from '../lib/character';
import { Social } from '../lib/social';
import { computeStats } from '../lib/stats';
import { computeStreak } from '../lib/streak';
import { Session } from '../lib/types';

type Props = {
  character: Character | null;
  social: Social | null;
  hasAccount: boolean;
  sessions: Session[];
  onEditCharacter: () => void;
  onOpenSettings: () => void;
  onAddFriends: () => void;
  onOpenFollow: (tab: 'following' | 'followers') => void;
  onSetupAccount: () => void;
};

// 내 프로필: 캐릭터, 팔로잉/팔로워, 친구 추가, 내 기록 요약
export default function ProfileScreen({ character, social, hasAccount, sessions, onEditCharacter, onOpenSettings, onAddFriends, onOpenFollow, onSetupAccount }: Props) {
  const stats = computeStats(sessions);
  const streak = computeStreak(sessions);
  const built = sessions.filter((s) => s.success).length;
  const hours = Math.floor(sessions.filter((s) => s.success).reduce((a, s) => a + s.minutes, 0) / 60);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.top}>
        <Pressable onPress={onOpenSettings} hitSlop={12} style={styles.gear}>
          <Icon name="gear" size={28} color={colors.dim} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        {character ? <Avatar character={character} size={120} /> : null}
        <Txt style={styles.name}>{character?.name ?? '-'}</Txt>
        <Txt style={styles.edit} onPress={onEditCharacter}>
          EDIT CHARACTER
        </Txt>
      </View>

      {hasAccount ? (
        <>
          <View style={styles.follows}>
            <Pressable style={styles.followCell} onPress={() => onOpenFollow('following')}>
              <Txt style={styles.followNum}>{social?.following.length ?? '-'}</Txt>
              <Txt style={styles.followLabel}>FOLLOWING</Txt>
            </Pressable>
            <View style={styles.followLine} />
            <Pressable style={styles.followCell} onPress={() => onOpenFollow('followers')}>
              <Txt style={styles.followNum}>{social?.followers.length ?? '-'}</Txt>
              <Txt style={styles.followLabel}>FOLLOWERS</Txt>
            </Pressable>
          </View>
          <Pressable onPress={onAddFriends} style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}>
            <Icon name="plus" size={22} color={colors.bg} />
            <Txt style={styles.addText}>ADD FRIENDS</Txt>
          </Pressable>
        </>
      ) : (
        <View style={styles.setup}>
          <Txt style={styles.setupTitle}>PLAY WITH FRIENDS</Txt>
          <Txt style={styles.setupText}>Create a profile to follow friends and focus together in group sessions.</Txt>
          <PixelButton label="CREATE PROFILE" onPress={onSetupAccount} style={{ alignSelf: 'stretch', marginTop: 16 }} />
        </View>
      )}

      <Txt style={styles.section}>STATISTICS</Txt>
      <View style={styles.grid}>
        <Stat icon={<Pixel name="flame" size={30} />} value={`${streak.current}`} label="DAY STREAK" />
        <Stat icon={<Icon name="target" size={28} color={colors.gold} />} value={`${stats.weekMinutes}m`} label="THIS WEEK" />
        <Stat icon={<Pixel name="house" size={30} />} value={`${built}`} label="BUILDINGS" />
        <Stat icon={<Icon name="bell" size={26} color={colors.accent} />} value={`${hours}h`} label="TOTAL FOCUS" />
      </View>
    </ScrollView>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      {icon}
      <View style={{ marginLeft: 12 }}>
        <Txt style={styles.statValue}>{value}</Txt>
        <Txt style={styles.statLabel}>{label}</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  top: { height: 52, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 20 },
  gear: { padding: 4 },
  hero: { alignItems: 'center', paddingBottom: 22 },
  name: { fontSize: 18, marginTop: 14 },
  edit: { color: colors.dim, fontSize: 8, marginTop: 12, textDecorationLine: 'underline' },
  follows: { flexDirection: 'row', marginHorizontal: 20, borderTopWidth: 3, borderBottomWidth: 3, borderColor: colors.panel },
  followCell: { flex: 1, alignItems: 'center', paddingVertical: 18 },
  followLine: { width: 3, backgroundColor: colors.panel },
  followNum: { fontSize: 20, color: colors.text },
  followLabel: { color: colors.dim, fontSize: 8, marginTop: 10 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginHorizontal: 20, marginTop: 18, paddingVertical: 17, backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.line, borderBottomWidth: 7 },
  addText: { color: colors.bg, fontSize: 12 },
  setup: { marginHorizontal: 20, padding: 18, backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.line },
  setupTitle: { color: colors.gold, fontSize: 11 },
  setupText: { color: colors.dim, fontSize: 8, lineHeight: 15, marginTop: 10 },
  section: { color: colors.dim, fontSize: 9, marginTop: 30, marginBottom: 12, marginHorizontal: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20 },
  stat: { width: '48%', flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.line },
  statValue: { fontSize: 14, color: colors.gold },
  statLabel: { fontSize: 7, color: colors.dim, marginTop: 8 },
});
