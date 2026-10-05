import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import Avatar from './Avatar';
import { Txt } from './ui';
import { Invite } from '../lib/rooms';

// 친구가 보낸 그룹 초대 알림 (앱이 열려 있을 때 화면 위쪽에 뜬다)
export default function InviteBanner({ invite, busy, onJoin, onDismiss }: { invite: Invite; busy: boolean; onJoin: () => void; onDismiss: () => void }) {
  const free = invite.free_join_left_s > 0;
  return (
    <View style={styles.wrap}>
      <Avatar character={{ species: invite.host_species, color: invite.host_color, hat: invite.host_hat }} size={44} />
      <View style={styles.info}>
        <Txt style={styles.title} numberOfLines={1}>{invite.host_name} invited you!</Txt>
        <Txt style={styles.sub}>{invite.minutes} MIN · {invite.tag}{free ? '' : ' · needs approval'}</Txt>
      </View>
      <Pressable onPress={busy ? undefined : onJoin} style={styles.join}>
        <Txt style={styles.joinText}>{busy ? '...' : 'JOIN'}</Txt>
      </Pressable>
      <Pressable onPress={onDismiss} hitSlop={10} style={styles.x}>
        <Txt style={styles.xText}>X</Txt>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 12, marginBottom: 0, padding: 10, backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.gold },
  info: { flex: 1 },
  title: { fontSize: 10 },
  sub: { color: colors.dim, fontSize: 7, marginTop: 7 },
  join: { backgroundColor: colors.accent, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 3, borderColor: colors.line },
  joinText: { color: colors.bg, fontSize: 9 },
  x: { paddingHorizontal: 4 },
  xText: { color: colors.dim, fontSize: 10 },
});
