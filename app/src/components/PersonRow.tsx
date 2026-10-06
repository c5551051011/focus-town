import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, soft } from '../theme';
import Avatar from './Avatar';
import { Sans } from './ui';
import ConfirmSheet from './ConfirmSheet';
import { Person, isFriend } from '../lib/social';

// 사람 한 줄: 캐릭터 + 이름(+친구 표시) + 팔로우 버튼
export default function PersonRow({ p, busy, onFollow, onUnfollow }: { p: Person; busy?: boolean; onFollow: () => void; onUnfollow: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const friend = isFriend(p);
  const label = p.i_follow ? 'Following' : p.follows_me ? 'Follow back' : 'Follow';
  const press = () => {
    if (busy) return;
    if (!p.i_follow) return onFollow();
    setConfirm(true);
  };
  return (
    <View style={styles.row}>
      <Avatar character={p} size={52} />
      <View style={styles.info}>
        <Sans style={styles.name} numberOfLines={1}>{p.name}</Sans>
        {friend ? (
          <View style={styles.badge}>
            <Sans style={styles.badgeText}>Friends</Sans>
          </View>
        ) : p.follows_me ? (
          <Sans style={styles.sub}>Follows you</Sans>
        ) : null}
      </View>
      <Pressable onPress={press} style={[styles.btn, p.i_follow ? styles.btnOn : styles.btnOff, busy && { opacity: 0.6 }]}>
        <Sans style={[styles.btnText, !p.i_follow && { color: colors.bg }]}>{label}</Sans>
      </Pressable>
      <ConfirmSheet
        visible={confirm}
        title={`Unfollow ${p.name}?`}
        text="You will no longer be able to invite each other to group sessions."
        confirmLabel="Unfollow"
        destructive
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          onUnfollow();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: soft.line },
  info: { flex: 1, marginLeft: 14, marginRight: 8 },
  name: { fontSize: 16, fontWeight: '700' },
  badge: { alignSelf: 'flex-start', marginTop: 6, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 10, backgroundColor: 'rgba(241,250,140,0.14)' },
  badgeText: { color: colors.gold, fontSize: 11, fontWeight: '700' },
  sub: { color: soft.subtle, fontSize: 12, marginTop: 5 },
  btn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, minWidth: 98, alignItems: 'center' },
  btnOff: { backgroundColor: colors.accent },
  btnOn: { borderWidth: 1.5, borderColor: soft.line, backgroundColor: 'transparent' },
  btnText: { color: soft.subtle, fontSize: 13, fontWeight: '800' },
});
