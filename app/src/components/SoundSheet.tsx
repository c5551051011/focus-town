import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, soft } from '../theme';
import { Sans } from './ui';
import { AmbientId, TRACKS, startAmbient, stopAmbient } from '../lib/ambient';
import { PRESET_TAGS, tagColor } from '../lib/tags';

// 배경 사운드 선택 시트: 지금 모드에 어울리는 곡을 맨 위에 보여주고, 나머지는 모드별로 묶어서 보여준다.
// 각 줄의 Play 버튼으로 미리 들어볼 수 있다.
export default function SoundSheet({
  visible,
  tag,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  tag: string;
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

  const recommended = TRACKS.filter((t) => t.modes.includes(tag));
  const groups = PRESET_TAGS.map((m) => ({ mode: m, tracks: TRACKS.filter((t) => t.modes[0] === m && !recommended.includes(t)) })).filter((g) => g.tracks.length > 0);

  const renderRow = (id: string, title: string) => {
    const on = id === selected;
    return (
      <View key={id} style={[styles.row, on && styles.rowOn]}>
        <Pressable
          style={styles.main}
          onPress={() => {
            onSelect(id);
            close();
          }}
        >
          <Sans style={[styles.label, on && { color: colors.bg }]} numberOfLines={2}>{title}</Sans>
        </Pressable>
        {id !== 'off' && (
          <Pressable onPress={() => togglePreview(id)} style={[styles.play, playing === id && styles.playOn]} hitSlop={6}>
            {playing === id ? <View style={[styles.stopIcon, { backgroundColor: colors.bg }]} /> : <View style={[styles.playIcon, { borderLeftColor: colors.text }]} />}
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.box} onPress={() => {}}>
          <Sans style={styles.title}>BACKGROUND SOUND</Sans>
          <ScrollView style={{ maxHeight: 540 }} contentContainerStyle={{ gap: 8, paddingBottom: 4 }} showsVerticalScrollIndicator={false}>
            {renderRow('off', 'Off')}

            {recommended.length > 0 && (
              <>
                <Sans style={[styles.section, { color: tagColor(tag) }]}>FOR {tag}</Sans>
                {recommended.map((t) => renderRow(t.id, t.title))}
              </>
            )}

            {groups.map((g) => (
              <View key={g.mode} style={{ gap: 8 }}>
                <Sans style={[styles.section, { color: tagColor(g.mode) }]}>{g.mode}</Sans>
                {g.tracks.map((t) => renderRow(t.id, t.title))}
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  box: { backgroundColor: soft.card, borderRadius: 22, padding: 18 },
  title: { color: soft.subtle, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 14, marginLeft: 4 },
  section: { fontSize: 12, marginTop: 14, marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: soft.sunken, borderRadius: 14 },
  rowOn: { backgroundColor: colors.gold },
  main: { flex: 1, paddingVertical: 16, paddingHorizontal: 14 },
  label: { fontSize: 12, lineHeight: 18 },
  play: { marginRight: 10, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: soft.card },
  playIcon: { marginLeft: 3, borderTopWidth: 7, borderBottomWidth: 7, borderLeftWidth: 11, borderTopColor: 'transparent', borderBottomColor: 'transparent' },
  stopIcon: { width: 12, height: 12, borderRadius: 2 },
  playOn: { backgroundColor: colors.accent },
});
