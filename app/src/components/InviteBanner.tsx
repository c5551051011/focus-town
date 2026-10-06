import { Pressable, StyleSheet, View } from 'react-native';
import { colors, soft } from '../theme';
import Avatar from './Avatar';
import { Txt } from './ui';
import { Invite } from '../lib/rooms';

// 친구가 보낸 그룹 초대 알림 (앱이 열려 있을 때 화면 위쪽에 뜬다)
export default function InviteBanner({ invite, busy, onJoin, onDismiss }: { invite: Invite; busy: boolean; onJoin: () => void; onDismiss: () => void }) {
  const free = invite.free_join_left_s > 0;
  return (
    <View style={styles.wrap}>
      <View style={styles.avatar}>
        <Avatar character={{ species: invite.host_species, color: invite.host_color, hat: invite.host_hat }} size={40} />
      </View>
      <View style={styles.info}>
        <Txt style={styles.title} numberOfLines={1}>
          {invite.host_name} invited you!
        </Txt>
        <Txt style={styles.sub} numberOfLines={1}>
          {invite.minutes} min · {invite.tag}
          {free ? '' : ' · needs approval'}
        </Txt>
      </View>
      <Pressable onPress={busy ? undefined : onJoin} style={({ pressed }) => [styles.join, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}>
        <Txt style={styles.joinText}>{busy ? '...' : 'JOIN'}</Txt>
      </Pressable>
      <Pressable onPress={onDismiss} hitSlop={10} style={styles.x}>
        <Txt style={styles.xText}>X</Txt>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 14,
    borderRadius: 22,
    backgroundColor: soft.card,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: soft.sunken, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  title: { fontSize: 11, lineHeight: 18 },
  sub: { color: soft.subtle, fontSize: 8, lineHeight: 14, marginTop: 4 },
  join: { backgroundColor: colors.accent, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 999 },
  joinText: { color: colors.bg, fontSize: 10 },
  x: { width: 26, height: 26, borderRadius: 13, backgroundColor: soft.sunken, alignItems: 'center', justifyContent: 'center' },
  xText: { color: soft.subtle, fontSize: 8 },
});
