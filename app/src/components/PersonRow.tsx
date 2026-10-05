import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import Avatar from './Avatar';
import { Txt } from './ui';
import { Person, isFriend } from '../lib/social';

// 사람 한 줄: 캐릭터 + 이름(+친구 표시) + 팔로우 버튼
export default function PersonRow({ p, busy, onFollow, onUnfollow }: { p: Person; busy?: boolean; onFollow: () => void; onUnfollow: () => void }) {
  const friend = isFriend(p);
  const label = p.i_follow ? 'FOLLOWING' : p.follows_me ? 'FOLLOW BACK' : 'FOLLOW';
  const press = () => {
    if (busy) return;
    if (!p.i_follow) return onFollow();
    Alert.alert(`Unfollow ${p.name}?`, 'You will no longer be able to invite each other to group sessions.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unfollow', style: 'destructive', onPress: onUnfollow },
    ]);
  };
  return (
    <View style={styles.row}>
      <Avatar character={p} size={48} />
      <View style={styles.info}>
        <Txt style={styles.name} numberOfLines={1}>{p.name}</Txt>
        {friend ? <Txt style={styles.badge}>FRIENDS</Txt> : p.follows_me ? <Txt style={styles.sub}>Follows you</Txt> : null}
      </View>
      <Pressable onPress={press} style={[styles.btn, p.i_follow ? styles.btnOn : styles.btnOff]}>
        <Txt style={[styles.btnText, !p.i_follow && { color: colors.bg }]}>{label}</Txt>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: colors.panel },
  info: { flex: 1, marginLeft: 12, marginRight: 8 },
  name: { fontSize: 11 },
  badge: { color: colors.gold, fontSize: 7, marginTop: 7 },
  sub: { color: colors.dim, fontSize: 7, marginTop: 7 },
  btn: { paddingVertical: 9, paddingHorizontal: 10, borderWidth: 3, minWidth: 96, alignItems: 'center' },
  btnOff: { backgroundColor: colors.accent, borderColor: colors.line },
  btnOn: { backgroundColor: 'transparent', borderColor: colors.dim },
  btnText: { fontSize: 7, color: colors.dim },
});
