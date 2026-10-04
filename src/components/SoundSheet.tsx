import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { Txt } from './ui';
import { AMBIENTS, AmbientId, startAmbient, stopAmbient } from '../lib/ambient';

// 배경 사운드 선택 시트. 각 줄의 PLAY 버튼으로 미리 들어볼 수 있다.
export default function SoundSheet({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: AmbientId;
  onSelect: (id: AmbientId) => void;
  onClose: () => void;
}) {
  const [playing, setPlaying] = useState<AmbientId | null>(null);

  const close = () => {
    stopAmbient();
    setPlaying(null);
    onClose();
  };

  const togglePreview = (id: AmbientId) => {
    if (playing === id) {
      stopAmbient();
      setPlaying(null);
    } else {
      startAmbient(id);
      setPlaying(id);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.box} onPress={() => {}}>
          <Txt style={styles.title}>BACKGROUND SOUND</Txt>
          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 8 }}>
            {AMBIENTS.map((a) => {
              const on = a.id === selected;
              return (
                <View key={a.id} style={[styles.row, on && styles.rowOn]}>
                  <Pressable
                    style={styles.main}
                    onPress={() => {
                      onSelect(a.id);
                      close();
                    }}
                  >
                    <Txt style={[styles.label, on && { color: colors.bg }]}>{a.label}</Txt>
                    {a.hint ? <Txt style={[styles.hint, on && { color: colors.bg }]}>{a.hint}</Txt> : null}
                  </Pressable>
                  {a.id !== 'off' && (
                    <Pressable onPress={() => togglePreview(a.id)} style={[styles.play, playing === a.id && styles.playOn]} hitSlop={6}>
                      <Txt style={styles.playText}>{playing === a.id ? 'STOP' : 'PLAY'}</Txt>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </ScrollView>
          <Txt style={styles.tip}>Tap a name to select.</Txt>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  box: { backgroundColor: colors.bg, borderWidth: 3, borderColor: colors.line, padding: 16 },
  title: { color: colors.accent, fontSize: 12, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.line },
  rowOn: { backgroundColor: colors.gold },
  main: { flex: 1, padding: 14 },
  label: { fontSize: 10 },
  hint: { fontSize: 7, color: colors.dim, marginTop: 8 },
  play: { marginRight: 10, paddingVertical: 10, paddingHorizontal: 10, backgroundColor: colors.bg, borderWidth: 3, borderColor: colors.line },
  playOn: { backgroundColor: colors.accent },
  playText: { fontSize: 8 },
  tip: { color: colors.dim, fontSize: 7, marginTop: 14, textAlign: 'center' },
});
