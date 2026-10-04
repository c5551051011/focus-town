import { ReactNode } from 'react';
import { Modal, Pressable, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle } from 'react-native';
import { colors, font } from '../theme';

// 모든 텍스트는 픽셀 폰트를 쓴다
export function Txt({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[styles.txt, style as StyleProp<TextStyle>]} />;
}

// 각진 레트로 버튼: 두꺼운 테두리 + 아래쪽 그림자
export function PixelButton({
  label,
  onPress,
  variant = 'primary',
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  style?: StyleProp<ViewStyle>;
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        primary ? styles.btnPrimary : styles.btnGhost,
        pressed && styles.btnPressed,
        style,
      ]}
    >
      <Txt style={[styles.btnText, !primary && { color: colors.text }]}>{label}</Txt>
    </Pressable>
  );
}

export function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Txt style={[styles.chipText, on && { color: colors.bg }]}>{label}</Txt>
    </Pressable>
  );
}

export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  txt: { fontFamily: font, color: colors.text },
  btn: { borderWidth: 3, borderColor: colors.line, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center', borderBottomWidth: 7 },
  btnPrimary: { backgroundColor: colors.accent },
  btnGhost: { backgroundColor: colors.panel },
  btnPressed: { borderBottomWidth: 3, marginTop: 4 },
  btnText: { color: colors.bg, fontSize: 14 },
  chip: { flex: 1, borderWidth: 3, borderColor: colors.line, backgroundColor: colors.panel, paddingVertical: 14, alignItems: 'center' },
  chipOn: { backgroundColor: colors.gold },
  chipText: { fontSize: 11, color: colors.dim },
  panel: { backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.line, padding: 12 },
});

// 값을 탭하면 열리는 선택 시트
export function OptionSheet<T extends string | number>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: { value: T; label: string; hint?: string }[];
  selected: T;
  onSelect: (v: T) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={sheet.backdrop} onPress={onClose}>
        <Pressable style={sheet.box} onPress={() => {}}>
          <Txt style={sheet.title}>{title}</Txt>
          {options.map((o) => (
            <Pressable
              key={String(o.value)}
              onPress={() => {
                onSelect(o.value);
                onClose();
              }}
              style={[sheet.row, o.value === selected && sheet.rowOn]}
            >
              <Txt style={[sheet.label, o.value === selected && { color: colors.bg }]}>{o.label}</Txt>
              {o.hint ? <Txt style={[sheet.hint, o.value === selected && { color: colors.bg }]}>{o.hint}</Txt> : null}
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const sheet = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  box: { backgroundColor: colors.bg, borderWidth: 3, borderColor: colors.line, padding: 16, gap: 8 },
  title: { color: colors.accent, fontSize: 12, marginBottom: 8 },
  row: { backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.line, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowOn: { backgroundColor: colors.gold },
  label: { fontSize: 10 },
  hint: { fontSize: 7, color: colors.dim },
});

// 모드 선택용 알약(pill) 버튼. 색은 모드마다 다르다.
export function Pill({ label, color, on, onPress }: { label: string; color: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[pill.base, { borderColor: color }, on && { backgroundColor: color }]}
    >
      <Txt style={[pill.text, { color: on ? colors.bg : color }]}>{label}</Txt>
    </Pressable>
  );
}

const pill = StyleSheet.create({
  base: { borderWidth: 3, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14, backgroundColor: 'transparent' },
  text: { fontSize: 8 },
});
