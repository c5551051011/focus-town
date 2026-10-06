import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors, soft } from '../theme';
import { Txt } from './ui';

// 집중이 끝난 뒤 보여주는 화면(성공/실패/탈락 등)의 공통 틀.
// 위쪽: 둥근 받침 위의 건물 + 제목, 아래쪽: 읽기 쉬운 큰 글씨 메시지 카드 + (선택) 추가 내용 + 둥근 버튼
export default function ResultLayout({
  hero,
  title,
  tone = 'neutral',
  message,
  children,
  button,
  onPress,
  secondary,
  onClose,
}: {
  hero: ReactNode;
  title: string;
  tone?: 'good' | 'bad' | 'neutral';
  message: string;
  children?: ReactNode;
  button?: string; // 없으면 아래 버튼을 그리지 않는다
  onPress?: () => void;
  secondary?: { label: string; onPress: () => void }; // 큰 버튼 아래의 보조 버튼 (예: 통화 패스를 쓰지 않고 넘어가기)
  onClose?: () => void; // 있으면 왼쪽 위에 X 버튼을 둔다 (아래 버튼 대신 쓰는 용도)
}) {
  const { width } = useWindowDimensions();
  // 한 줄에 한 문장이 다 들어가도록 글자 크기를 정한다 (픽셀 폰트는 글자 폭이 일정해서 폭 ÷ 글자 수로 계산)
  const lines = message.split('\n');
  const longest = Math.max(...lines.map((l) => l.length), 1);
  const size = Math.max(9, Math.min(14, Math.floor((width - 64) / longest)));
  const color = tone === 'good' ? colors.gold : tone === 'bad' ? colors.danger : colors.accent;
  return (
    <View style={styles.scroll}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} bounces={false}>
      <View style={styles.top}>
        <View style={styles.halo}>{hero}</View>
        <Txt style={[styles.title, { color }]}>{title}</Txt>
      </View>
      <View style={styles.bottom}>
        <View>
          {lines.map((line, i) => (
            <Txt key={i} style={[styles.msg, { fontSize: size, lineHeight: Math.round(size * 1.9) }]}>
              {line}
            </Txt>
          ))}
        </View>
        {children}
        {button && onPress ? (
          <Pressable onPress={onPress} style={({ pressed }) => [styles.btn, pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }]}>
            <Txt style={styles.btnText}>{button}</Txt>
          </Pressable>
        ) : null}
        {secondary ? (
          <Pressable onPress={secondary.onPress} style={({ pressed }) => [styles.btn2, pressed && { opacity: 0.8 }]}>
            <Txt style={styles.btn2Text}>{secondary.label}</Txt>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
    {onClose ? (
      <Pressable onPress={onClose} hitSlop={14} style={styles.close}>
        <Txt style={styles.closeText}>X</Txt>
      </Pressable>
    ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, justifyContent: 'space-between' },
  top: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  halo: { width: 250, height: 250, borderRadius: 125, backgroundColor: soft.card, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, lineHeight: 40, marginTop: 28, textAlign: 'center' },
  bottom: { gap: 16, paddingTop: 12 },
  msg: { color: colors.text, opacity: 0.92, textAlign: 'center' },
  btn: { paddingVertical: 20, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center' },
  btnText: { color: colors.bg, fontSize: 16 },
  btn2: { paddingVertical: 18, borderRadius: 18, backgroundColor: soft.card, alignItems: 'center' },
  btn2Text: { color: soft.subtle, fontSize: 13 },
  close: { position: 'absolute', top: 10, left: 18, padding: 6 },
  closeText: { color: soft.subtle, fontSize: 34, lineHeight: 40, opacity: 0.85 },
});
