import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, soft } from '../theme';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { Pixel } from '../components/Pixel';
import { Sans, Txt } from '../components/ui';
import { ScreenTitle, SectionTitle, StatCard, statGrid } from '../components/cards';
import { Character } from '../lib/character';
import { Social, isFriend } from '../lib/social';
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

// 내 프로필: 캐릭터, 팔로잉/팔로워, 친구 추가, 친구 목록, 내 기록 요약
export default function ProfileScreen({ character, social, hasAccount, sessions, onEditCharacter, onOpenSettings, onAddFriends, onOpenFollow, onSetupAccount }: Props) {
  const stats = computeStats(sessions);
  const streak = computeStreak(sessions);
  const built = sessions.filter((s) => s.success).length;
  const hours = Math.floor(sessions.filter((s) => s.success).reduce((a, s) => a + s.minutes, 0) / 60);
  const friends = social ? social.following.filter(isFriend) : [];

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <ScreenTitle
        title="ME"
        right={
          <Pressable onPress={onOpenSettings} hitSlop={12} style={styles.gear}>
            <Icon name="gear" size={26} color={soft.subtle} />
          </Pressable>
        }
      />

      {/* 프로필 카드 */}
      <View style={styles.hero}>
        {character ? <Avatar character={character} size={112} /> : null}
        <Txt style={styles.name}>{character?.name ?? '-'}</Txt>
        <Pressable onPress={onEditCharacter} style={styles.editBtn}>
          <Sans style={styles.editText}>Edit character</Sans>
        </Pressable>
      </View>

      {hasAccount ? (
        <>
          {/* 팔로잉 / 팔로워 */}
          <View style={styles.follows}>
            <Pressable style={styles.followCell} onPress={() => onOpenFollow('following')}>
              <Sans style={styles.followNum}>{social?.following.length ?? '–'}</Sans>
              <Sans style={styles.followLabel}>Following</Sans>
            </Pressable>
            <View style={styles.followLine} />
            <Pressable style={styles.followCell} onPress={() => onOpenFollow('followers')}>
              <Sans style={styles.followNum}>{social?.followers.length ?? '–'}</Sans>
              <Sans style={styles.followLabel}>Followers</Sans>
            </Pressable>
          </View>

          <Pressable onPress={onAddFriends} style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}>
            <Icon name="plus" size={20} color={colors.bg} />
            <Sans style={styles.addText}>Add friends</Sans>
          </Pressable>

          {/* 친구 목록(서로 팔로우) */}
          <SectionTitle>{`Friends${friends.length ? ` · ${friends.length}` : ''}`}</SectionTitle>
          {friends.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendRow}>
              {friends.map((f) => (
                <Pressable key={f.id} style={styles.friend} onPress={() => onOpenFollow('following')}>
                  <Avatar character={f} size={56} />
                  <Sans style={styles.friendName} numberOfLines={1}>{f.name}</Sans>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.hintCard}>
              <Sans style={styles.hintTitle}>No friends yet</Sans>
              <Sans style={styles.hintText}>Follow someone and ask them to follow you back. When you both follow each other, you can focus together.</Sans>
            </View>
          )}
        </>
      ) : (
        <View style={styles.setup}>
          <Sans style={styles.setupTitle}>Play with friends</Sans>
          <Sans style={styles.setupText}>Sign in to add friends, share your follow link and focus together in group sessions.</Sans>
          <Pressable onPress={onSetupAccount} style={styles.addBtn}>
            <Sans style={styles.addText}>Sign in</Sans>
          </Pressable>
        </View>
      )}

      <SectionTitle>My focus</SectionTitle>
      <View style={[statGrid.grid, { marginTop: 0 }]}>
        <StatCard icon={<Pixel name="flame" size={34} style={streak.current === 0 && { opacity: 0.35 }} />} value={`${streak.current}`} unit={streak.current === 1 ? 'day' : 'days'} label="Current streak" sub={`Best ${streak.best}`} />
        <StatCard icon={<Icon name="target" size={30} color={colors.gold} />} value={`${stats.weekMinutes}`} unit="min" label="Last 7 days" />
        <StatCard icon={<Pixel name="house" size={34} />} value={`${built}`} unit={built === 1 ? 'building' : 'buildings'} label="Built so far" />
        <StatCard icon={<Icon name="bell" size={28} color={colors.accent} />} value={`${hours}`} unit="hours" label="Total focus" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  gear: { padding: 6, borderRadius: 18, backgroundColor: soft.card },

  hero: { alignItems: 'center', backgroundColor: soft.card, borderRadius: 18, paddingVertical: 26, marginTop: 4 },
  name: { fontSize: 20, marginTop: 16 },
  editBtn: { marginTop: 16, paddingVertical: 9, paddingHorizontal: 18, borderRadius: 18, borderWidth: 1.5, borderColor: soft.line },
  editText: { color: soft.subtle, fontSize: 13, fontWeight: '600' },

  follows: { flexDirection: 'row', backgroundColor: soft.card, borderRadius: 14, marginTop: 14 },
  followCell: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  followLine: { width: 1.5, marginVertical: 14, backgroundColor: soft.line },
  followNum: { fontSize: 24, fontWeight: '800' },
  followLabel: { color: soft.subtle, fontSize: 13, marginTop: 4 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14, paddingVertical: 15, borderRadius: 14, backgroundColor: colors.accent },
  addText: { color: colors.bg, fontSize: 16, fontWeight: '800' },

  friendRow: { gap: 16, paddingRight: 8 },
  friend: { alignItems: 'center', width: 68 },
  friendName: { color: colors.text, fontSize: 10, marginTop: 8, maxWidth: 68 },
  hintCard: { backgroundColor: soft.card, borderRadius: 14, padding: 16 },
  hintTitle: { fontSize: 15, fontWeight: '700' },
  hintText: { color: soft.subtle, fontSize: 13, lineHeight: 19, marginTop: 6 },

  setup: { backgroundColor: soft.card, borderRadius: 16, padding: 18, marginTop: 14 },
  setupTitle: { color: colors.gold, fontSize: 16, fontWeight: '800' },
  setupText: { color: soft.subtle, fontSize: 13, lineHeight: 19, marginTop: 8 },
});
