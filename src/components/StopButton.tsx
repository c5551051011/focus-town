import { useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { selection } from '../lib/haptics';
import { colors } from '../theme';
import { Txt } from './ui';

const HOLD_MS = 1500;

// 테두리만 있는 반투명 둥근 네모 정지 버튼. 꾹 누르면 안쪽이 채워지고, 다 차면 정지.
export default function StopButton({ onStop }: { onStop: () => void }) {
  const [fill] = useState(() => new Animated.Value(0));

  const pressIn = () => {
    selection();
    Animated.timing(fill, { toValue: 1, duration: HOLD_MS, useNativeDriver: false }).start();
  };
  const pressOut = () => {
    fill.stopAnimation();
    Animated.timing(fill, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  return (
    <View style={styles.wrap}>
      <Pressable onPressIn={pressIn} onPressOut={pressOut} onLongPress={onStop} delayLongPress={HOLD_MS} hitSlop={16}>
        <View style={styles.box}>
          <Animated.View style={[styles.fill, { height: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
      </Pressable>
      <Txt style={styles.hint}>HOLD TO STOP</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  box: { width: 44, height: 44, borderRadius: 12, borderWidth: 5, borderColor: 'rgba(255,255,255,0.45)', overflow: 'hidden', justifyContent: 'flex-end' },
  fill: { width: '100%', backgroundColor: 'rgba(255,85,85,0.7)' },
  hint: { color: colors.dim, fontSize: 10, marginTop: 14, opacity: 0.8 },
});
