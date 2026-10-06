import { useEffect, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, soft } from '../theme';
import { selection } from '../lib/haptics';
import { Sans, Txt } from './ui';

const ITEM = 56;
const ROWS = 3; // 보이는 줄 수 (가운데가 선택 값)

// 위아래로 밀어서 시간을 고르는 작은 휠
export default function TimeWheel({ values, value, onChange }: { values: number[]; value: number; onChange: (v: number) => void }) {
  const ref = useRef<ScrollView>(null);
  const last = useRef(value);
  const idx = Math.max(0, values.indexOf(value));

  useEffect(() => {
    const id = requestAnimationFrame(() => ref.current?.scrollTo({ y: idx * ITEM, animated: false }));
    return () => cancelAnimationFrame(id);
    // 처음 열릴 때만 현재 값 위치로 이동
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.min(values.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.y / ITEM)));
    if (values[i] !== last.current) {
      last.current = values[i];
      selection();
      onChange(values[i]);
    }
  };

  return (
    <View style={styles.wrap}>
      <View pointerEvents="none" style={styles.band} />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        contentContainerStyle={{ paddingVertical: ITEM * Math.floor(ROWS / 2) }}
      >
        {values.map((v, i) => {
          const dist = Math.abs(i - idx);
          return (
            <Pressable
              key={v}
              style={[styles.item, { opacity: Math.max(0.25, 1 - dist * 0.4) }]}
              onPress={() => ref.current?.scrollTo({ y: i * ITEM, animated: true })}
            >
              <Txt style={[styles.num, dist === 0 && { color: colors.gold }]}>{v}</Txt>
              <Sans style={styles.unit}>min</Sans>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: ITEM * ROWS, width: 220, alignSelf: 'center' },
  band: { position: 'absolute', left: 0, right: 0, top: ITEM * Math.floor(ROWS / 2), height: ITEM, borderRadius: 16, backgroundColor: 'rgba(255,121,198,0.16)' },
  item: { height: ITEM, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  num: { fontSize: 26, width: 90, textAlign: 'right' },
  unit: { fontSize: 13, color: soft.subtle, width: 44 },
});
