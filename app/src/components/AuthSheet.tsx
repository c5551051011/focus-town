import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput } from 'react-native';
import { colors, font, soft } from '../theme';
import { Txt } from './ui';
import { sendCode, verifyCode } from '../lib/auth';

// 이메일 코드 로그인: 1) 이메일 입력 → 2) 메일로 받은 6자리 코드 입력
// reason: 왜 로그인이 필요한지 한 줄 (친구 기능을 누르고 들어온 경우 등)
export default function AuthSheet({ visible, reason, onClose, onSignedIn }: { visible: boolean; reason?: string; onClose: () => void; onSignedIn: () => void }) {
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

  const codeReady = code.length >= 6;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.box} onPress={() => {}}>
            <Txt style={styles.title}>SIGN IN</Txt>
            {reason ? <Txt style={styles.reason}>{reason}</Txt> : null}
            {step === 'email' ? (
              <>
                <Txt style={styles.note}>We will email you a 6-digit code. No password needed.</Txt>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@email.com"
                  placeholderTextColor={soft.subtle}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  style={styles.input}
                />
                <Pressable onPress={busy ? undefined : send} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}>
                  <Txt style={styles.btnText}>{busy ? 'SENDING...' : 'SEND CODE'}</Txt>
                </Pressable>
              </>
            ) : (
              <>
                <Txt style={styles.note}>Enter the 6-digit code sent to {email}.</Txt>
                <TextInput
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 8))}
                  placeholder="123456"
                  placeholderTextColor={soft.subtle}
                  keyboardType="number-pad"
                  autoFocus
                  style={[styles.input, { letterSpacing: 6, textAlign: 'center' }]}
                />
                <Pressable onPress={busy || !codeReady ? undefined : verify} style={({ pressed }) => [styles.btn, !codeReady && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}>
                  <Txt style={styles.btnText}>{busy ? 'CHECKING...' : 'VERIFY'}</Txt>
                </Pressable>
                <Txt style={styles.link} onPress={reset}>
                  USE A DIFFERENT EMAIL
                </Txt>
              </>
            )}
            {error ? <Txt style={styles.error}>{error}</Txt> : null}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 },
  box: { backgroundColor: soft.card, borderRadius: 24, padding: 22 },
  title: { color: colors.accent, fontSize: 16, marginBottom: 14 },
  reason: { color: colors.gold, fontSize: 10, lineHeight: 18, marginBottom: 12 },
  note: { color: soft.subtle, fontSize: 9, lineHeight: 17, marginBottom: 16 },
  input: { fontFamily: font, fontSize: 12, color: colors.text, backgroundColor: soft.sunken, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16 },
  btn: { marginTop: 16, paddingVertical: 17, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center' },
  btnText: { color: colors.bg, fontSize: 12 },
  link: { color: soft.subtle, fontSize: 8, textAlign: 'center', marginTop: 18, textDecorationLine: 'underline' },
  error: { color: colors.danger, fontSize: 9, lineHeight: 16, marginTop: 14 },
});
