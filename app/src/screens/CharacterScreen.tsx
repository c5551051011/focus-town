import { useEffect, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { colors, font, soft } from '../theme';
import Avatar from '../components/Avatar';
import { Sans, Txt } from '../components/ui';
import { ScreenHeader, SectionTitle, TITLE_HEIGHT } from '../components/cards';
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
      {onCancel ? (
        <ScreenHeader title="EDIT CHARACTER" onBack={onCancel} />
      ) : (
        <View style={styles.createTitle}>
          <Txt style={styles.createTitleText}>CREATE YOUR CHARACTER</Txt>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* 미리보기 */}
        <View style={styles.preview}>
          <Animated.View style={{ transform: [{ translateY: bob }] }}>
            <Avatar character={c} size={140} />
          </Animated.View>
        </View>

        <TextInput
          value={c.name}
          onChangeText={(t) => setC((p) => ({ ...p, name: cleanName(t) }))}
          placeholder="Your name"
          placeholderTextColor={soft.subtle}
          maxLength={MAX_NAME_LENGTH}
          style={styles.input}
          autoCorrect={false}
        />

        <SectionTitle>Animal</SectionTitle>
        <View style={styles.row}>
          {SPECIES.map((s) => (
            <Pressable key={s} onPress={() => set({ species: s })} style={[styles.cell, c.species === s && styles.cellOn]}>
              <Avatar character={{ species: s, color: c.color, hat: 'none' }} size={52} />
            </Pressable>
          ))}
        </View>

        <SectionTitle>Color</SectionTitle>
        <View style={styles.rowWrap}>
          {COLOR_IDS.map((id) => (
            <Pressable key={id} onPress={() => set({ color: id })} style={[styles.swatchWrap, c.color === id && styles.swatchWrapOn]}>
              <View style={[styles.swatch, { backgroundColor: COLOR_HEX[id] }]} />
            </Pressable>
          ))}
        </View>

        <SectionTitle>Hat</SectionTitle>
        <View style={styles.row}>
          {HAT_IDS.map((h) => (
            <Pressable key={h} onPress={() => set({ hat: h })} style={[styles.cell, c.hat === h && styles.cellOn]}>
              <Avatar character={{ species: c.species, color: c.color, hat: h }} size={44} />
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => valid && onSave({ ...c, name: c.name.trim() })} style={[styles.save, !valid && { opacity: 0.4 }]}>
          <Txt style={styles.saveText}>{mode === 'create' ? "LET'S GO" : 'SAVE'}</Txt>
        </Pressable>
        {mode === 'create' && onSignIn ? (
          <Pressable onPress={onSignIn} hitSlop={10}>
            <Sans style={styles.signin}>Already have an account? Sign in</Sans>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  createTitle: { height: TITLE_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  createTitleText: { color: colors.accent, fontSize: 14 },
  preview: { alignItems: 'center', paddingVertical: 26, marginTop: 4, marginBottom: 14, borderRadius: 20, backgroundColor: soft.card },
  input: { fontFamily: font, fontSize: 14, color: colors.text, textAlign: 'center', backgroundColor: soft.card, borderRadius: 14, paddingVertical: 16 },
  row: { flexDirection: 'row', gap: 10 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: soft.card, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  cellOn: { borderColor: colors.gold, backgroundColor: '#332f4f' },
  swatchWrap: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  swatchWrapOn: { borderColor: colors.gold },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  save: { marginTop: 34, paddingVertical: 19, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center' },
  saveText: { color: colors.bg, fontSize: 15 },
  signin: { color: soft.subtle, fontSize: 12, textAlign: 'center', marginTop: 22, textDecorationLine: 'underline' },
});
