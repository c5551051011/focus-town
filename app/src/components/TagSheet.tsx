import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, font, soft } from '../theme';
import { Sans } from './ui';
import { MAX_CUSTOM_TAGS, MAX_TAG_LENGTH, PRESET_TAGS, cleanTag, tagColor } from '../lib/tags';

// 나만의 모드 추가/삭제 시트 (기본 모드는 삭제할 수 없다)
export default function TagSheet({
  visible,
  customTags,
  onAdd,
  onRemove,
  onClose,
}: {
  visible: boolean;
  customTags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const cleaned = cleanTag(text);
  const exists = PRESET_TAGS.includes(cleaned) || customTags.includes(cleaned);
  const full = customTags.length >= MAX_CUSTOM_TAGS;
  const disabled = !cleaned || exists || full;

  const add = () => {
    if (disabled) return;
    onAdd(cleaned);
    setText('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.box} onPress={() => {}}>
            <Sans style={styles.title}>NEW MODE</Sans>
            <View style={styles.addRow}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="e.g. READING"
                placeholderTextColor={soft.subtle}
                maxLength={MAX_TAG_LENGTH}
                autoCapitalize="characters"
                returnKeyType="done"
                onSubmitEditing={add}
                style={styles.input}
              />
              <Pressable onPress={add} style={[styles.addBtn, disabled && { opacity: 0.4 }]}>
                <Sans style={styles.addText}>Add</Sans>
              </Pressable>
            </View>
            <Sans style={styles.note}>
              {full ? `Up to ${MAX_CUSTOM_TAGS} custom modes.` : exists ? 'That mode already exists.' : `Up to ${MAX_TAG_LENGTH} characters.`}
            </Sans>

            {customTags.length > 0 && (
              <>
                <Sans style={styles.sub}>YOUR MODES</Sans>
                <View style={styles.list}>
                  {customTags.map((t) => (
                    <View key={t} style={[styles.chip, { borderColor: tagColor(t) }]}>
                      <Sans style={[styles.chipText, { color: tagColor(t) }]}>{t}</Sans>
                      <Pressable onPress={() => onRemove(t)} hitSlop={8}>
                        <Sans style={styles.del}>✕</Sans>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  box: { backgroundColor: soft.card, borderRadius: 22, padding: 18 },
  title: { color: soft.subtle, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 14, marginLeft: 4 },
  addRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, fontFamily: font, fontSize: 12, color: colors.text, backgroundColor: soft.sunken, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14 },
  addBtn: { backgroundColor: colors.accent, borderRadius: 14, paddingHorizontal: 18, justifyContent: 'center' },
  addText: { color: colors.bg, fontSize: 13 },
  note: { color: soft.subtle, fontSize: 11, marginTop: 10, marginLeft: 4 },
  sub: { color: soft.subtle, fontSize: 11, marginTop: 20, marginBottom: 10, marginLeft: 4 },
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  chipText: { fontSize: 11 },
  del: { color: soft.subtle, fontSize: 11 },
});
