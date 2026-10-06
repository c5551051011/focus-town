import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
}: {
  hero: ReactNode;
  title: string;
  tone?: 'good' | 'bad' | 'neutral';
  message: string;
  children?: ReactNode;
  button: string;
  onPress: () => void;
}) {
  const color = tone === 'good' ? colors.gold : tone === 'bad' ? colors.danger : colors.accent;
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} bounces={false}>
      <View style={styles.top}>
        <View style={styles.halo}>{hero}</View>
        <Txt style={[styles.title, { color }]}>{title}</Txt>
      </View>
      <View style={styles.bottom}>
        <View style={styles.msgCard}>
          <Txt style={styles.msg}>{message}</Txt>
        </View>
        {children}
        <Pressable onPress={onPress} style={({ pressed }) => [styles.btn, pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }]}>
          <Txt style={styles.btnText}>{button}</Txt>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, justifyContent: 'space-between' },
  top: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  halo: { width: 230, height: 230, borderRadius: 115, backgroundColor: soft.card, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, lineHeight: 34, marginTop: 28, textAlign: 'center' },
  bottom: { gap: 14, paddingTop: 12 },
  msgCard: { backgroundColor: soft.card, borderRadius: 20, paddingVertical: 20, paddingHorizontal: 18 },
  msg: { fontSize: 12, lineHeight: 22, color: '#cfcbe6', textAlign: 'center' },
  btn: { paddingVertical: 20, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center' },
  btnText: { color: colors.bg, fontSize: 16 },
});
