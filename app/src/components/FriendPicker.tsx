import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import Avatar from './Avatar';
import { PixelButton, Txt } from './ui';
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
          <Txt style={styles.title}>FOCUS WITH FRIENDS</Txt>
          {friends.length === 0 ? (
            <>
              <Txt style={styles.empty}>You have no friends yet.{'\n\n'}Follow someone, and ask them to follow you back. You become friends when you both follow each other.</Txt>
              <PixelButton label="ADD FRIENDS" onPress={onAddFriends} style={{ marginTop: 6 }} />
            </>
          ) : (
            <>
              <Txt style={styles.note}>Pick up to {MAX_INVITES}. They get an invite and can join anytime in the first 3 minutes.</Txt>
              <ScrollView style={{ maxHeight: 320 }}>
                {friends.map((f) => {
                  const on = selected.includes(f.id);
                  return (
                    <Pressable key={f.id} onPress={() => toggle(f.id)} style={[styles.row, on && styles.rowOn]}>
                      <Avatar character={f} size={44} />
                      <Txt style={[styles.name, on && { color: colors.bg }]} numberOfLines={1}>{f.name}</Txt>
                      <View style={[styles.check, on && styles.checkOn]}>{on ? <Txt style={styles.checkMark}>OK</Txt> : null}</View>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <PixelButton label={selected.length ? `DONE (${selected.length})` : 'DONE'} onPress={onClose} style={{ marginTop: 14 }} />
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  box: { backgroundColor: colors.bg, borderWidth: 3, borderColor: colors.line, padding: 18 },
  title: { color: colors.accent, fontSize: 12, marginBottom: 12 },
  note: { color: colors.dim, fontSize: 8, lineHeight: 14, marginBottom: 12 },
  empty: { color: colors.dim, fontSize: 9, lineHeight: 16, marginVertical: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, marginBottom: 8, backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.line },
  rowOn: { backgroundColor: colors.gold },
  name: { flex: 1, fontSize: 11 },
  check: { width: 30, height: 30, borderWidth: 3, borderColor: colors.line, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.accent },
  checkMark: { fontSize: 7, color: colors.bg },
});
