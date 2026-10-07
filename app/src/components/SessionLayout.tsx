import { ReactNode, useEffect, useState } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, soft } from '../theme';
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
  team,
  extra,
  onTap,
}: {
  building: SpriteName;
  progress: number;
  big: string;
  message: string;
  bottom: ReactNode;
  warn?: boolean; // 켜지면 화면 전체가 붉게 깜빡인다
  topRight?: ReactNode;
  workers: Character[];
  team?: ReactNode; // 전체 진행률 바로 아래에 붙는 영역 (그룹: 팀 빌딩 바)
  extra?: ReactNode; // 메시지 아래에 끼워 넣는 영역
  onTap?: () => void; // 화면 아무 데나 탭 (그룹: 이탈한 팀원에게 알림 보내기)
}) {
  return (
    <Pressable style={styles.wrap} onPress={onTap} disabled={!onTap}>
      <View style={styles.top}>{topRight}</View>
      <View style={styles.main}>
        <ConstructionSite building={building} progress={progress} workers={workers} />
        <Txt style={styles.big}>{big}</Txt>
        <View style={styles.bars}>
          <View style={styles.teamHead}>
            <Txt style={styles.teamLabel}>PROGRESS</Txt>
            <Txt style={[styles.teamLabel, { color: colors.accent }]}>{Math.floor(Math.max(0, Math.min(1, progress)) * 100)}%</Txt>
          </View>
          <View style={styles.bar}>
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
          </View>
          {team}
        </View>
        <Txt style={styles.msg}>{message}</Txt>
        {extra}
      </View>
      <View style={styles.bottom}>{bottom}</View>
      <RedFlash on={!!warn} />
    </Pressable>
  );
}

// 팀 빌딩(내구성) 바. 집중 중에는 전체 진행률 바와 같은 폭·높이로 그 바로 아래에 두고(pixel),
// 결과 화면에서는 테두리 없는 둥근 카드(soft)로 보여준다.
export function TeamBar({ pct, color, label = 'TEAM BUILDING', variant = 'pixel', style }: { pct: number; color: string; label?: string; variant?: 'pixel' | 'soft'; style?: StyleProp<ViewStyle> }) {
  if (variant === 'soft') {
    return (
      <View style={styles.softCard}>
        <View style={styles.teamHead}>
          <Txt style={styles.softLabel}>{label}</Txt>
          <Txt style={[styles.softLabel, { color }]}>{pct}%</Txt>
        </View>
        <View style={styles.softTrack}>
          <View style={[styles.softFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.team, style]}>
      <View style={styles.teamHead}>
        <Txt style={styles.teamLabel}>{label}</Txt>
        <Txt style={[styles.teamLabel, { color }]}>{pct}%</Txt>
      </View>
      <View style={styles.bar}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// 화면 전체가 붉게 깜빡이는 경고 (테두리만 빨갛게 하던 것을 대신한다). 터치는 그대로 통과한다.
function RedFlash({ on }: { on: boolean }) {
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!on) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 550, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [on, pulse]);
  if (!on) return null;
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.34] }) }]} />;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24 },
  flash: { backgroundColor: colors.danger },
  top: { height: 52, alignItems: 'flex-end', justifyContent: 'center' },
  main: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  big: { fontSize: 36, marginTop: 12 },
  bars: { width: '80%', marginTop: 20 },
  bar: { width: '100%', height: 16, backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.line },
  fill: { height: '100%', backgroundColor: colors.accent },
  team: { marginTop: 14 },
  teamHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  teamLabel: { fontSize: 9, color: soft.subtle },
  softCard: { backgroundColor: soft.card, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 18 },
  softLabel: { fontSize: 11, color: soft.subtle },
  softTrack: { height: 14, borderRadius: 7, backgroundColor: soft.sunken, overflow: 'hidden' },
  softFill: { height: '100%', borderRadius: 7 },
  msg: { color: '#cfcbe6', fontSize: 12, lineHeight: 22, textAlign: 'center', minHeight: 66, marginTop: 22, paddingHorizontal: 4 },
  bottom: { height: 110, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 28 },
});
