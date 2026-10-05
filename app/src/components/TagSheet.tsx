import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, font } from '../theme';
import { Txt } from './ui';
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

  const add = () => {
    if (!cleaned || exists || full) return;
    onAdd(cleaned);
    setText('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.box} onPress={() => {}}>
            <Txt style={styles.title}>NEW MODE</Txt>
            <View style={styles.addRow}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="e.g. READING"
                placeholderTextColor={colors.dim}
                maxLength={MAX_TAG_LENGTH}
                autoCapitalize="characters"
                returnKeyType="done"
                onSubmitEditing={add}
                style={styles.input}
              />
              <Pressable onPress={add} style={[styles.addBtn, (!cleaned || exists || full) && { opacity: 0.4 }]}>
                <Txt style={styles.addText}>ADD</Txt>
              </Pressable>
            </View>
            <Txt style={styles.note}>
              {full ? `Up to ${MAX_CUSTOM_TAGS} custom modes.` : exists ? 'That mode already exists.' : `Up to ${MAX_TAG_LENGTH} characters.`}
            </Txt>

            {customTags.length > 0 && (
              <>
                <Txt style={styles.sub}>YOUR MODES</Txt>
                <View style={styles.list}>
                  {customTags.map((t) => (
                    <View key={t} style={[styles.chip, { borderColor: tagColor(t) }]}>
                      <Txt style={[styles.chipText, { color: tagColor(t) }]}>{t}</Txt>
                      <Pressable onPress={() => onRemove(t)} hitSlop={8}>
                        <Txt style={styles.del}>X</Txt>
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  box: { backgroundColor: colors.bg, borderWidth: 3, borderColor: colors.line, padding: 16 },
  title: { color: colors.accent, fontSize: 12, marginBottom: 14 },
  addRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, fontFamily: font, fontSize: 10, color: colors.text, backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 12 },
  addBtn: { backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.line, paddingHorizontal: 14, justifyContent: 'center' },
  addText: { color: colors.bg, fontSize: 9 },
  note: { color: colors.dim, fontSize: 7, marginTop: 10 },
  sub: { color: colors.dim, fontSize: 8, marginTop: 20, marginBottom: 10 },
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 3, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  chipText: { fontSize: 8 },
  del: { color: colors.dim, fontSize: 9 },
});
