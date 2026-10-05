import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput } from 'react-native';
import { colors, font } from '../theme';
import { PixelButton, Txt } from './ui';

// 초대 코드(6자리)를 입력해 방에 들어간다
export default function JoinCodeSheet({ visible, onClose, onJoin }: { visible: boolean; onClose: () => void; onJoin: (code: string) => Promise<string | null> }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    setCode('');
    onClose();
  };

  const join = async () => {
    if (code.length < 6 || busy) return;
    setBusy(true);
    setError(null);
    const err = await onJoin(code);
    setBusy(false);
    if (err) setError(err);
    else close();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.box} onPress={() => {}}>
            <Txt style={styles.title}>JOIN A ROOM</Txt>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="ABC123"
              placeholderTextColor={colors.dim}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              style={styles.input}
            />
            {error ? <Txt style={styles.error}>{error}</Txt> : null}
            <PixelButton label={busy ? 'JOINING...' : 'JOIN'} onPress={join} style={[{ marginTop: 16 }, code.length < 6 && { opacity: 0.4 }]} />
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  box: { backgroundColor: colors.bg, borderWidth: 3, borderColor: colors.line, padding: 18 },
  title: { color: colors.accent, fontSize: 14, marginBottom: 16 },
  input: { fontFamily: font, fontSize: 26, color: colors.gold, textAlign: 'center', letterSpacing: 6, backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.line, paddingVertical: 16 },
  error: { color: colors.danger, fontSize: 8, lineHeight: 14, marginTop: 12 },
});
