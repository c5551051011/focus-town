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

// 값을 탭하면 열리는 선택 시트 (둥근 카드, 읽기 쉬운 글꼴)
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
          <Sans style={sheet.title}>{title}</Sans>
          {options.map((o) => {
            const on = o.value === selected;
            return (
              <Pressable
                key={String(o.value)}
                onPress={() => {
                  onSelect(o.value);
                  onClose();
                }}
                style={[sheet.row, on && sheet.rowOn]}
              >
                <Sans style={[sheet.label, on && { color: colors.bg, fontWeight: '800' }]}>{o.label}</Sans>
                {o.hint ? <Sans style={[sheet.hint, on && { color: colors.bg }]}>{o.hint}</Sans> : null}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const sheet = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  box: { backgroundColor: '#2a2740', borderRadius: 18, padding: 18, gap: 8 },
  title: { color: '#a9a5c4', fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6, marginLeft: 4 },
  row: { backgroundColor: '#1b1930', borderRadius: 12, paddingVertical: 15, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowOn: { backgroundColor: colors.gold },
  label: { fontSize: 16, fontWeight: '600' },
  hint: { fontSize: 12, color: '#a9a5c4' },
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

// 작은 글씨/숫자용 기본(시스템) 글꼴. 픽셀 폰트는 작은 크기에서 읽기 어려워서, 제목과 큰 숫자에만 쓰고 나머지는 이걸 쓴다.
export function Sans({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[{ color: colors.text }, style as StyleProp<TextStyle>]} />;
}
