import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { SpriteName } from './Pixel';
import ConstructionSite from './ConstructionSite';
import { Txt } from './ui';
import { Character } from '../lib/character';

// 카운트다운 화면과 타이머 화면이 똑같은 레이아웃을 써서, 화면이 바뀌어도 건물과 일꾼이 그대로 이어진다.
export default function SessionLayout({
  building,
  progress,
  big,
  message,
  bottom,
  warn,
  topRight,
  workers,
  extra,
}: {
  building: SpriteName;
  progress: number;
  big: string;
  message: string;
  bottom: ReactNode;
  warn?: boolean;
  topRight?: ReactNode;
  workers: Character[];
  extra?: ReactNode; // 메시지 아래에 끼워 넣는 영역 (그룹: 내구성 바 등)
}) {
  return (
    <View style={[styles.wrap, warn && styles.warn]}>
      <View style={styles.top}>{topRight}</View>
      <View style={styles.main}>
        <ConstructionSite building={building} progress={progress} workers={workers} />
        <Txt style={styles.big}>{big}</Txt>
        <View style={styles.bar}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
        <Txt style={styles.msg}>{message}</Txt>
        {extra}
      </View>
      <View style={styles.bottom}>{bottom}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24 },
  warn: { borderWidth: 6, borderColor: colors.danger },
  top: { height: 52, alignItems: 'flex-end', justifyContent: 'center' },
  main: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  big: { fontSize: 36, marginTop: 12 },
  bar: { width: '80%', height: 16, backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.line, marginVertical: 20 },
  fill: { height: '100%', backgroundColor: colors.accent },
  msg: { color: colors.dim, fontSize: 9, lineHeight: 16, textAlign: 'center', minHeight: 32 },
  bottom: { height: 110, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 28 },
});
