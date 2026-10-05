import { ReactNode, useRef, useState } from 'react';
import { Linking, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors } from '../theme';
import { Pixel, SpriteName } from '../components/Pixel';
import { PixelButton, Txt } from '../components/ui';
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
        <Pixel name="house" size={150} />
        {row(['bear', 'cat', 'rabbit'], 56)}
      </View>
    ),
  },
  {
    title: 'CHOOSE YOUR TIME',
    text: 'The longer you focus, the bigger the building you get.',
    art: (
      <View style={{ alignItems: 'center', gap: 14 }}>
        {row(['hut', 'house', 'tower'], 72)}
        {row(['library', 'castle'], 72)}
      </View>
    ),
  },
  {
    title: 'STAY IN THE APP',
    text: 'Leave the app for more than 15 seconds and your building collapses. Come back in time and all is well.',
    art: <Pixel name="ruins" size={170} />,
  },
  {
    title: 'GROW EVERY DAY',
    text: 'Focus a little each day to keep your streak alive and fill your town.',
    art: <Pixel name="flame" size={170} />,
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
      <View style={styles.top}>
        {!last && (
          <Txt style={styles.skip} onPress={() => onFinish(true)}>
            SKIP
          </Txt>
        )}
      </View>

      <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScrollEnd} style={{ flex: 1 }}>
        {SLIDES.map((s) => (
          <View key={s.title} style={[styles.slide, { width }]}>
            <View style={styles.art}>{s.art}</View>
            <Txt style={styles.title}>{s.title}</Txt>
            <Txt style={styles.text}>{s.text}</Txt>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View key={s.title} style={[styles.dot, i === page && styles.dotOn]} />
          ))}
        </View>
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
        <PixelButton label={last ? "LET'S GO" : 'NEXT'} onPress={next} style={{ alignSelf: 'stretch' }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  top: { height: 52, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 24 },
  skip: { color: colors.dim, fontSize: 10, padding: 8 },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  art: { height: 240, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  title: { color: colors.accent, fontSize: 16, textAlign: 'center' },
  text: { color: colors.text, fontSize: 10, lineHeight: 20, textAlign: 'center', marginTop: 18 },
  bottom: { paddingHorizontal: 24, paddingBottom: 24, gap: 16 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 12, height: 12, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.line },
  dotOn: { backgroundColor: colors.accent },
  legal: { color: colors.dim, fontSize: 7, lineHeight: 13, textAlign: 'center' },
  link: { color: colors.gold, fontSize: 7, textDecorationLine: 'underline' },
});
