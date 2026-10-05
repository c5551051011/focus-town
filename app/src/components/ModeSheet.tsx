import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { Pill, Txt } from './ui';
import { PRESET_TAGS, tagColor } from '../lib/tags';

// 집중 모드 고르기: 기본 모드 + 내가 만든 모드를 알약 버튼으로 보여주고, 새 모드는 + 로 추가한다
export default function ModeSheet({
  visible,
  selected,
  customTags,
  onSelect,
  onNew,
  onClose,
}: {
  visible: boolean;
  selected: string;
  customTags: string[];
  onSelect: (tag: string) => void;
  onNew: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.box} onPress={() => {}}>
          <Txt style={styles.title}>FOCUS MODE</Txt>
          <View style={styles.pills}>
            {[...PRESET_TAGS, ...customTags].map((t) => (
              <Pill
                key={t}
                label={t}
                color={tagColor(t)}
                on={t === selected}
                onPress={() => {
                  onSelect(t);
                  onClose();
                }}
              />
            ))}
            <Pill label="+ NEW" color={colors.dim} on={false} onPress={onNew} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  box: { backgroundColor: colors.bg, borderWidth: 3, borderColor: colors.line, padding: 18 },
  title: { color: colors.accent, fontSize: 12, marginBottom: 16 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
