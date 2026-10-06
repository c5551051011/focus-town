import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, soft } from '../theme';
import Avatar from './Avatar';
import { Sans } from './ui';
import { Person } from '../lib/social';

export const MAX_INVITES = 3;

// 같이 집중할 친구를 고르는 시트 (서로 팔로우하는 친구만 보인다)
export default function FriendPicker({
  visible,
  friends,
  selected,
  onChange,
  onAddFriends,
  onClose,
}: {
  visible: boolean;
  friends: Person[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onAddFriends: () => void;
  onClose: () => void;
}) {
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else if (selected.length < MAX_INVITES) onChange([...selected, id]);
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.box} onPress={() => {}}>
          <Sans style={styles.title}>FOCUS WITH FRIENDS</Sans>
          {friends.length === 0 ? (
            <>
              <Sans style={styles.empty}>You have no friends yet. Follow someone and ask them to follow you back. You become friends when you both follow each other.</Sans>
              <Pressable onPress={onAddFriends} style={styles.primary}>
                <Sans style={styles.primaryText}>Add friends</Sans>
              </Pressable>
            </>
          ) : (
            <>
              <Sans style={styles.note}>Pick up to {MAX_INVITES}. They get an invite and can join anytime in the first 3 minutes.</Sans>
              <ScrollView style={{ maxHeight: 330 }} showsVerticalScrollIndicator={false}>
                {friends.map((f) => {
                  const on = selected.includes(f.id);
                  return (
                    <Pressable key={f.id} onPress={() => toggle(f.id)} style={[styles.row, on && styles.rowOn]}>
                      <Avatar character={f} size={58} />
                      <Sans style={[styles.name, on && { color: colors.bg }]} numberOfLines={1}>{f.name}</Sans>
                      <View style={[styles.check, on && styles.checkOn]}>{on ? <Sans style={styles.checkMark}>✓</Sans> : null}</View>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Pressable onPress={onClose} style={styles.primary}>
                <Sans style={styles.primaryText}>Done</Sans>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  box: { backgroundColor: soft.card, borderRadius: 22, padding: 18 },
  title: { color: soft.subtle, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12, marginLeft: 4 },
  note: { color: soft.subtle, fontSize: 12, lineHeight: 17, marginBottom: 14, marginLeft: 4 },
  empty: { color: soft.subtle, fontSize: 13, lineHeight: 19, marginVertical: 10, marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, marginBottom: 8, backgroundColor: soft.sunken, borderRadius: 14 },
  rowOn: { backgroundColor: colors.gold },
  name: { flex: 1, fontSize: 14 },
  check: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: soft.line, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.bg, borderColor: colors.bg },
  checkMark: { fontSize: 12, color: colors.gold },
  primary: { marginTop: 14, paddingVertical: 15, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center' },
  primaryText: { color: colors.bg, fontSize: 14 },
});
