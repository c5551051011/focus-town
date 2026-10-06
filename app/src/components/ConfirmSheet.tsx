import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { colors, soft } from '../theme';
import { Sans } from './ui';

// 확인 창 (시스템 알림창 대신 앱 스타일의 둥근 카드). cancelLabel 을 null 로 주면 "확인"만 있는 안내 창이 된다.
export default function ConfirmSheet({
  visible,
  title,
  text,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel?: string | null;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.box} onPress={() => {}}>
          <Sans style={styles.title}>{title}</Sans>
          <Sans style={styles.text}>{text}</Sans>
          <View style={styles.buttons}>
            {cancelLabel ? (
              <Pressable onPress={onCancel} style={({ pressed }) => [styles.btn, styles.cancel, pressed && { opacity: 0.8 }]}>
                <Sans style={styles.cancelText}>{cancelLabel}</Sans>
              </Pressable>
            ) : null}
            <Pressable onPress={onConfirm} style={({ pressed }) => [styles.btn, { backgroundColor: destructive ? colors.danger : colors.accent }, pressed && { opacity: 0.85 }]}>
              <Sans style={styles.confirmText}>{confirmLabel}</Sans>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  box: { backgroundColor: soft.card, borderRadius: 24, padding: 22 },
  title: { fontSize: 18, fontWeight: '700' },
  text: { color: soft.subtle, fontSize: 14, lineHeight: 21, marginTop: 14 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 22 },
  btn: { flex: 1, paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
  cancel: { backgroundColor: soft.sunken },
  cancelText: { color: soft.subtle, fontSize: 14 },
  confirmText: { color: colors.bg, fontSize: 14 },
});
