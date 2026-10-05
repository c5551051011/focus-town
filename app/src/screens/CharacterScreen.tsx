import { useEffect, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { colors, font } from '../theme';
import Avatar from '../components/Avatar';
import { PixelButton, Txt } from '../components/ui';
import { COLOR_HEX, COLOR_IDS, HAT_IDS, SPECIES } from '../lib/characterAssets';
import { Character, DEFAULT_CHARACTER, MAX_NAME_LENGTH, cleanName } from '../lib/character';
import { selection } from '../lib/haptics';

type Props = {
  initial: Character | null;
  mode: 'create' | 'edit';
  onSave: (c: Character) => void;
  onCancel?: () => void;
  onSignIn?: () => void; // 이미 계정이 있는 사람용 (새 기기에서 복원)
};

// 이름과 캐릭터(동물 · 색 · 모자)를 정하는 화면
export default function CharacterScreen({ initial, mode, onSave, onCancel, onSignIn }: Props) {
  const [c, setC] = useState<Character>(initial ?? DEFAULT_CHARACTER);
  const [bob] = useState(() => new Animated.Value(0));
  const valid = c.name.trim().length > 0;
  const set = (patch: Partial<Character>) => {
    selection();
    setC((prev) => ({ ...prev, ...patch }));
  };

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -8, duration: 400, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          {onCancel ? (
            <Txt style={styles.back} onPress={onCancel}>
              BACK
            </Txt>
          ) : null}
        </View>
        <Txt style={styles.title}>{mode === 'create' ? 'CREATE YOUR\nCHARACTER' : 'EDIT CHARACTER'}</Txt>

        <Animated.View style={[styles.preview, { transform: [{ translateY: bob }] }]}>
          <Avatar character={c} size={150} />
        </Animated.View>

        <TextInput
          value={c.name}
          onChangeText={(t) => setC((p) => ({ ...p, name: cleanName(t) }))}
          placeholder="YOUR NAME"
          placeholderTextColor={colors.dim}
          maxLength={MAX_NAME_LENGTH}
          style={styles.input}
          autoCorrect={false}
        />

        <Txt style={styles.label}>ANIMAL</Txt>
        <View style={styles.row}>
          {SPECIES.map((s) => (
            <Pressable key={s} onPress={() => set({ species: s })} style={[styles.cell, c.species === s && styles.cellOn]}>
              <Avatar character={{ species: s, color: c.color, hat: 'none' }} size={52} />
            </Pressable>
          ))}
        </View>

        <Txt style={styles.label}>COLOR</Txt>
        <View style={styles.rowWrap}>
          {COLOR_IDS.map((id) => (
            <Pressable key={id} onPress={() => set({ color: id })} style={[styles.swatch, { backgroundColor: COLOR_HEX[id] }, c.color === id && styles.swatchOn]} />
          ))}
        </View>

        <Txt style={styles.label}>HAT</Txt>
        <View style={styles.row}>
          {HAT_IDS.map((h) => (
            <Pressable key={h} onPress={() => set({ hat: h })} style={[styles.cell, styles.cellSm, c.hat === h && styles.cellOn]}>
              <Avatar character={{ species: c.species, color: c.color, hat: h }} size={44} />
            </Pressable>
          ))}
        </View>

        <PixelButton
          label={mode === 'create' ? "LET'S GO" : 'SAVE'}
          onPress={() => valid && onSave({ ...c, name: c.name.trim() })}
          style={[styles.save, !valid && { opacity: 0.4 }]}
        />
        {mode === 'create' && onSignIn ? (
          <Txt style={styles.signin} onPress={onSignIn}>
            ALREADY HAVE AN ACCOUNT? SIGN IN
          </Txt>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 24, paddingBottom: 48, alignItems: 'stretch' },
  top: { height: 36, alignItems: 'flex-start', justifyContent: 'center' },
  back: { color: colors.dim, fontSize: 10, padding: 6 },
  title: { color: colors.accent, fontSize: 16, lineHeight: 26, textAlign: 'center', marginTop: 4 },
  preview: { alignSelf: 'center', marginVertical: 22 },
  input: { fontFamily: font, fontSize: 14, color: colors.text, textAlign: 'center', backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.line, paddingVertical: 14 },
  label: { color: colors.dim, fontSize: 9, marginTop: 24, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.line },
  cellSm: { padding: 0 },
  cellOn: { borderColor: colors.gold, backgroundColor: '#3a3658' },
  swatch: { width: 34, height: 34, borderWidth: 3, borderColor: colors.line },
  swatchOn: { borderColor: colors.gold },
  save: { marginTop: 32 },
  signin: { color: colors.dim, fontSize: 8, textAlign: 'center', marginTop: 26, textDecorationLine: 'underline' },
});
