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

// 카드 화면(Stats, ME, 설정, 타운, 친구)의 글씨.
// 이 화면들은 "일반 글꼴로 디자인한 크기"를 그대로 쓰되, 픽셀 폰트는 글자 하나가 훨씬 넓어서 크기를 한 단계 낮춰 매핑한다.
// (예: 16 → 12, 13 → 10, 28 → 21). 굵기는 픽셀 폰트에 없으므로 무시하고, 줄 높이는 글자 크기에 맞춰 다시 계산한다.
const pixelSize = (fs: number) => (fs <= 10 ? 8 : fs <= 13 ? 10 : fs <= 15 ? 11 : fs <= 16 ? 12 : Math.round(fs * 0.75));

export function Sans({ style, ...rest }: TextProps) {
  const flat = StyleSheet.flatten(style) ?? {};
  const { fontSize, lineHeight, fontWeight: _weight, ...other } = flat as TextStyle;
  const size = pixelSize(typeof fontSize === 'number' ? fontSize : 14);
  return (
    <Text
      {...rest}
      style={[{ color: colors.text, fontFamily: font }, other, { fontSize: size, lineHeight: Math.round(size * (lineHeight ? 1.7 : 1.6)) }]}
    />
  );
}
