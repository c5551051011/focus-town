import { ReactNode, useRef, useState } from 'react';
import { Linking, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors, soft } from '../theme';
import Icon from '../components/Icon';
import { Pixel, SpriteName } from '../components/Pixel';
import { Txt } from '../components/ui';
import { PRIVACY_URL, TERMS_URL } from '../config';

type Slide = { title: string; text: string; art: ReactNode };

const row = (names: SpriteName[], size: number) => (
  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-end' }}>
    {names.map((n) => (
      <Pixel key={n} name={n} size={size} />
    ))}
  </View>
);

const SLIDES: Slide[] = [
  {
    title: 'BUILD YOUR TOWN',
    text: 'Focus for a while and a building rises in your very own town.',
    art: (
      <View style={{ alignItems: 'center', gap: 10 }}>
        <Pixel name="house" size={170} />
        {row(['bear', 'cat', 'rabbit'], 60)}
      </View>
    ),
  },
  {
    title: 'CHOOSE YOUR TIME',
    text: 'The longer you focus, the bigger the building you get.',
    art: (
      <View style={{ alignItems: 'center', gap: 14 }}>
        {row(['hut', 'house', 'tower'], 76)}
        {row(['library', 'castle'], 76)}
      </View>
    ),
  },
  {
    title: 'STAY IN THE APP',
    text: 'Leave the app for more than 15 seconds and your building collapses. Come back in time and all is well.',
    art: <Pixel name="ruins" size={180} />,
  },
  {
    title: 'BLOCK DISTRACTIONS',
    text: 'Coming soon: pick the apps to block while you focus, using your phone’s Screen Time settings.',
    art: (
      <View style={{ alignItems: 'center', gap: 14 }}>
        <Icon name="shield" size={150} color={colors.accent} />
        <Txt style={{ color: colors.gold, fontSize: 11 }}>COMING SOON</Txt>
      </View>
    ),
  },
  {
    title: 'GROW EVERY DAY',
    text: 'Focus a little each day to keep your streak alive and fill your town.',
    art: <Pixel name="flame" size={180} />,
  },
];

export default function OnboardingScreen({ onFinish }: { onFinish: (skipped: boolean) => void }) {
  const { width } = useWindowDimensions();
  const ref = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const last = page === SLIDES.length - 1;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  const next = () => {
    if (last) return onFinish(false);
    ref.current?.scrollTo({ x: (page + 1) * width, animated: true });
    setPage(page + 1);
  };

  return (
    <View style={styles.wrap}>
      <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScrollEnd} style={{ flex: 1 }}>
        {SLIDES.map((s) => (
          <View key={s.title} style={[styles.slide, { width }]}>
            <View style={styles.art}>
              <View style={styles.halo}>{s.art}</View>
            </View>
            <View style={styles.copy}>
              <Txt style={styles.title}>{s.title}</Txt>
              <View style={styles.bar} />
              <Txt style={styles.text}>{s.text}</Txt>
            </View>
          </View>
        ))}
      </ScrollView>

      {last && (
        <Txt style={styles.legal}>
          By continuing you agree to the{' '}
          <Txt style={styles.link} onPress={() => Linking.openURL(TERMS_URL).catch(() => {})}>
            Terms
          </Txt>{' '}
          and{' '}
          <Txt style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}>
            Privacy Policy
          </Txt>
          . Anonymous crash and usage data helps us improve the app; you can turn it off anytime in Settings.
        </Txt>
      )}

      {/* 아래쪽: 왼쪽 점, 오른쪽에 간단한 SKIP / NEXT */}
      <View style={styles.bottom}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View key={s.title} style={[styles.dot, i === page && styles.dotOn]} />
          ))}
        </View>
        <View style={styles.actions}>
          {!last && (
            <Txt style={styles.skip} onPress={() => onFinish(true)}>
              SKIP
            </Txt>
          )}
          <Pressable onPress={next} style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.85 }]}>
            <Txt style={styles.nextText}>{last ? "LET'S GO" : 'NEXT'}</Txt>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  slide: { justifyContent: 'space-between', paddingHorizontal: 28 },
  art: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  // 그림 뒤에 깔리는 둥근 받침
  halo: { minWidth: 280, minHeight: 280, borderRadius: 140, backgroundColor: soft.card, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  copy: { paddingBottom: 22 },
  title: { color: colors.accent, fontSize: 22, lineHeight: 34 },
  bar: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.gold, marginTop: 14 },
  text: { color: colors.text, fontSize: 13, lineHeight: 26, marginTop: 18, opacity: 0.92 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, paddingBottom: 30, paddingTop: 10 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: soft.line },
  dotOn: { width: 28, backgroundColor: colors.accent },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  skip: { color: soft.subtle, fontSize: 11, padding: 8 },
  nextBtn: { paddingVertical: 14, paddingHorizontal: 26, borderRadius: 22, backgroundColor: colors.accent },
  nextText: { color: colors.bg, fontSize: 12 },
  legal: { color: soft.subtle, fontSize: 7, lineHeight: 13, paddingHorizontal: 28 },
  link: { color: colors.gold, fontSize: 7, textDecorationLine: 'underline' },
});
