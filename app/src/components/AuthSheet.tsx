import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, font } from '../theme';
import { PixelButton, Txt } from './ui';
import { sendCode, verifyCode } from '../lib/auth';

// 이메일 코드 로그인: 1) 이메일 입력 → 2) 메일로 받은 6자리 코드 입력
export default function AuthSheet({ visible, onClose, onSignedIn }: { visible: boolean; onClose: () => void; onSignedIn: () => void }) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep('email');
    setCode('');
    setError(null);
    setBusy(false);
  };
  const close = () => {
    reset();
    onClose();
  };

  const send = async () => {
    const e = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) return setError('Enter a valid email address.');
    setBusy(true);
    setError(null);
    const err = await sendCode(e);
    setBusy(false);
    if (err) return setError(err);
    setEmail(e);
    setStep('code');
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    const err = await verifyCode(email, code.trim());
    setBusy(false);
    if (err) return setError(err);
    reset();
    onSignedIn();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.box} onPress={() => {}}>
            <Txt style={styles.title}>SIGN IN</Txt>
            {step === 'email' ? (
              <>
                <Txt style={styles.note}>We will email you a 6-digit code. No password needed.</Txt>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@email.com"
                  placeholderTextColor={colors.dim}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  style={styles.input}
                />
                <PixelButton label={busy ? 'SENDING...' : 'SEND CODE'} onPress={busy ? () => {} : send} style={{ marginTop: 16 }} />
              </>
            ) : (
              <>
                <Txt style={styles.note}>Enter the 6-digit code sent to {email}.</Txt>
                <TextInput
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 8))}
                  placeholder="123456"
                  placeholderTextColor={colors.dim}
                  keyboardType="number-pad"
                  autoFocus
                  style={[styles.input, { letterSpacing: 6, textAlign: 'center' }]}
                />
                <PixelButton label={busy ? 'CHECKING...' : 'VERIFY'} onPress={busy || code.length < 6 ? () => {} : verify} style={[{ marginTop: 16 }, code.length < 6 && { opacity: 0.4 }]} />
                <Txt style={styles.link} onPress={reset}>
                  USE A DIFFERENT EMAIL
                </Txt>
              </>
            )}
            {error ? <Txt style={styles.error}>{error}</Txt> : null}
            <View style={{ height: 4 }} />
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  box: { backgroundColor: colors.bg, borderWidth: 3, borderColor: colors.line, padding: 18 },
  title: { color: colors.accent, fontSize: 14, marginBottom: 14 },
  note: { color: colors.dim, fontSize: 8, lineHeight: 15, marginBottom: 14 },
  input: { fontFamily: font, fontSize: 11, color: colors.text, backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 14 },
  link: { color: colors.dim, fontSize: 8, textAlign: 'center', marginTop: 18, textDecorationLine: 'underline' },
  error: { color: colors.danger, fontSize: 8, lineHeight: 14, marginTop: 14 },
});
