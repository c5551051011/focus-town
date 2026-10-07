import { ReactNode, useRef, useState } from 'react';
import { Linking, NativeScrollEvent, Platform, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors, soft } from '../theme';
import Icon from '../components/Icon';
import { Pixel, SpriteName } from '../components/Pixel';
import { Txt } from '../components/ui';
import { PRIVACY_URL, TERMS_URL } from '../config';
import { ensureNotificationPermission } from '../lib/notifications';
import { screenTimeAvailable, setupScreenTime } from '../lib/screenTime';

type Consent = 'notifications' | 'screentime';
// cta 가 있는 장은 "동의" 장이다: 큰 버튼이 동의(허용)이고, SKIP 은 동의하지 않고 다음 장으로 넘어간다.
type Slide = { title: string; text: string; art: ReactNode; cta?: { label: string; kind: Consent } };

const row = (names: SpriteName[], size: number) => (
  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-end' }}>
    {names.map((n) => (
      <Pixel key={n} name={n} size={size} />
    ))}
  </View>
);

const ALL_SLIDES: Slide[] = [
  {
    title: 'BUILD YOUR TOWN',
    text: 'Focus for a while and a building rises in your very own town.',
    art: (
      <View style={{ alignItems: 'center' }}>
        <Pixel name="house" size={130} />
        <View style={{ marginTop: 4 }}>{row(['bear', 'cat', 'rabbit'], 36)}</View>
      </View>
    ),
  },
  {
    title: 'CHOOSE YOUR TIME',
    text: 'The longer you focus, the bigger the building you get.',
    art: (
      <View style={{ alignItems: 'center', gap: 14 }}>
        {row(['hut', 'house', 'tower'], 60)}
        {row(['library', 'castle'], 60)}
      </View>
    ),
  },
  {
    title: 'STAY IN THE APP',
    text: 'Leave the app for more than 30 seconds and your building collapses. Come back in time and all is well.',
    art: <Pixel name="ruins" size={140} />,
  },
  {
    title: 'GENTLE NUDGES',
    text: 'Allow notifications so we can warn you the moment you leave the app, and cheer you on each day.',
    art: <Icon name="bell" size={110} color={colors.gold} />,
    cta: { label: 'ALLOW', kind: 'notifications' },
  },
  {
    title: 'BLOCK DISTRACTIONS',
    text: screenTimeAvailable()
      ? 'Lock every app except the ones you allow while you focus. Say yes and pick the apps to keep. Towny and Phone are always allowed.'
      : 'Blocking distracting apps is coming soon. Say yes and we will turn it on when it is ready.',
    cta: { label: "I'M IN", kind: 'screentime' },
    art: (
      <View style={{ alignItems: 'center', gap: 14 }}>
        <Icon name="shield" size={110} color={colors.accent} />
        {screenTimeAvailable() ? null : <Txt style={{ color: colors.gold, fontSize: 11 }}>COMING SOON</Txt>}
      </View>
    ),
  },
  {
    title: 'GROW EVERY DAY',
    text: 'Focus a little each day to keep your streak alive and fill your town.',
    art: <Pixel name="flame" size={140} />,
  },
];

// 앱 차단 장은 기능이 켜져 있는 빌드에서만 보여준다
const SLIDES = ALL_SLIDES.filter((s) => s.cta?.kind !== 'screentime' || screenTimeAvailable());

export default function OnboardingScreen({ onFinish, onConsent }: { onFinish: (skipped: boolean) => void; onConsent?: (kind: Consent, agreed: boolean, enabled?: boolean) => void }) {
  const { width } = useWindowDimensions();
  const ref = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const last = page === SLIDES.length - 1;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  const slide = SLIDES[page];
  const goNext = () => {
    if (last) return onFinish(false);
    ref.current?.scrollTo({ x: (page + 1) * width, animated: true });
    setPage(page + 1);
  };
  // 큰 버튼: 동의 장에서는 동의(허용)하고 넘어간다
  const agree = async () => {
    if (slide.cta) {
      if (slide.cta.kind === 'notifications') onConsent?.('notifications', await ensureNotificationPermission());
      else if (Platform.OS === 'ios' && screenTimeAvailable()) onConsent?.(slide.cta.kind, true, (await setupScreenTime()).ok);
      else onConsent?.(slide.cta.kind, true, false);
    }
    goNext();
  };
  // SKIP: 동의하지 않고 다음 장으로
  const skip = () => {
    if (slide.cta) onConsent?.(slide.cta.kind, false);
    goNext();
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

      {/* 약관 안내: 마지막 장에서만 보이지만 자리는 항상 잡아 두어서, 그림 위치가 장마다 바뀌지 않게 한다 */}
      <View style={styles.legalSlot}>
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
      </View>

      {/* 아래쪽: 왼쪽 점, 오른쪽에 간단한 SKIP / NEXT */}
      <View style={styles.bottom}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View key={s.title} style={[styles.dot, i === page && styles.dotOn]} />
          ))}
        </View>
        <View style={styles.actions}>
          {slide.cta && !last && (
            <Txt style={styles.skip} onPress={skip}>
              SKIP
            </Txt>
          )}
          <Pressable onPress={agree} style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.85 }]}>
            <Txt style={styles.nextText}>{last ? "LET'S GO" : (slide.cta?.label ?? 'NEXT')}</Txt>
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
  halo: { minWidth: 230, minHeight: 230, borderRadius: 115, backgroundColor: soft.card, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  copy: { height: 196, paddingBottom: 22 },
  title: { color: colors.accent, fontSize: 18, lineHeight: 28 },
  bar: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.gold, marginTop: 14 },
  text: { color: colors.text, fontSize: 11, lineHeight: 22, marginTop: 14, opacity: 0.92 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, paddingBottom: 30, paddingTop: 10 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: soft.line },
  dotOn: { width: 28, backgroundColor: colors.accent },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  skip: { color: soft.subtle, fontSize: 11, padding: 8 },
  nextBtn: { paddingVertical: 14, paddingHorizontal: 26, borderRadius: 22, backgroundColor: colors.accent },
  nextText: { color: colors.bg, fontSize: 12 },
  legalSlot: { height: 66, justifyContent: 'center' },
  legal: { color: soft.subtle, fontSize: 7, lineHeight: 13, paddingHorizontal: 28 },
  link: { color: colors.gold, fontSize: 7, textDecorationLine: 'underline' },
});
