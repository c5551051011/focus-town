import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { Pixel, SpriteName } from './Pixel';
import Avatar from './Avatar';
import { Txt } from './ui';
import { Character, DEFAULT_CHARACTER } from '../lib/character';

const SIZE = 176;
const BANDS = 8; // 건물을 8개 층(띠)으로 나눠 아래부터 한 층씩 쌓는다
const BAND_H = SIZE / BANDS;
const HEADROOM = 64;

export function bandsFor(progress: number) {
  return Math.min(BANDS, 1 + Math.floor(progress * (BANDS - 1)));
}

// 망치질하는 일꾼: 사용자가 만든 캐릭터가 건물 윗면에 서서, 망치를 들었다가 건물 쪽으로 내리친다
function Worker({ character, size, delay }: { character: Character; size: number; delay: number }) {
  const [t] = useState(() => new Animated.Value(0));
  const hammer = Math.round(size * 0.64);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration: 260, useNativeDriver: true }), // 들어올리기
        Animated.timing(t, { toValue: 0, duration: 110, useNativeDriver: true }), // 내리치기
        Animated.delay(330 - delay),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, delay]);
  // 손잡이 맨 위를 축으로 회전: 0° = 아래로 늘어뜨림(건물을 때림), -75° = 머리 위로 들어올림
  const rot = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-75deg'] });
  const hop = t.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
  return (
    <Animated.View style={{ alignItems: 'center', transform: [{ translateY: hop }] }}>
      <Txt style={styles.name} numberOfLines={1}>
        {character.name}
      </Txt>
      <View style={{ width: size, height: size }}>
        <Avatar character={character} size={size} />
        <Animated.View
          style={{
            position: 'absolute',
            right: -size * 0.27,
            top: size * 0.45,
            transform: [{ translateY: -hammer / 2 }, { rotate: rot }, { translateY: hammer / 2 }],
          }}
        >
          <Pixel name="hammer" size={hammer} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// 새 층이 쌓일 때 튀어나가는 먼지 조각
function Puff() {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, [t]);
  const specks = [-60, -30, 0, 30, 60];
  return (
    <View pointerEvents="none" style={styles.puff}>
      {specks.map((dx, i) => (
        <Animated.View
          key={i}
          style={[
            styles.speck,
            {
              opacity: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              transform: [
                { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
                { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -18 - (i % 2) * 10] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function ConstructionSite({ building, progress, workers }: { building: SpriteName; progress: number; workers: Character[] }) {
  const crew = workers.length ? workers : [{ ...DEFAULT_CHARACTER, name: 'BUILDER' }];
  const size = crew.length <= 2 ? 56 : crew.length === 3 ? 48 : 40; // 인원이 많을수록 작게
  const bands = bandsFor(progress);
  const [h] = useState(() => new Animated.Value(bands * BAND_H));
  const [pulse] = useState(() => new Animated.Value(1));
  const [puffKey, setPuffKey] = useState(0);
  const prev = useRef(bands);

  useEffect(() => {
    Animated.spring(h, { toValue: bands * BAND_H, useNativeDriver: false, friction: 6 }).start();
    if (bands !== prev.current) {
      prev.current = bands;
      setPuffKey((k) => k + 1);
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 120, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [bands, h, pulse]);

  return (
    <View style={styles.site}>
      <Animated.View style={[styles.stage, { transform: [{ scale: pulse }] }]}>
        {/* 청사진: 완성될 모습의 희미한 윤곽 */}
        <Pixel name={building} size={SIZE} style={[styles.abs, { tintColor: colors.blueprint, opacity: 0.14 }]} />
        {/* 지금까지 쌓은 부분 */}
        <Animated.View style={[styles.clip, { height: h }]}>
          <Pixel name={building} size={SIZE} style={styles.clipImg} />
        </Animated.View>
        {/* 일꾼들은 쌓은 높이의 맨 위에서 작업 */}
        <Animated.View style={[styles.workers, { bottom: h }]}>
          {crew.map((c, i) => (
            <Worker key={`${c.name}-${i}`} character={c} size={size} delay={(i * 120) % 360} />
          ))}
        </Animated.View>
        {puffKey > 0 && <PuffAt key={puffKey} h={bands * BAND_H} />}
      </Animated.View>
    </View>
  );
}

function PuffAt({ h }: { h: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: SIZE / 2, bottom: h }}>
      <Puff />
    </View>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 6, color: colors.text, marginBottom: 4, maxWidth: 80 },
  site: { width: SIZE + 24, height: SIZE + HEADROOM, alignItems: 'center', justifyContent: 'flex-end' },
  stage: { width: SIZE, height: SIZE },
  abs: { position: 'absolute', left: 0, bottom: 0 },
  clip: { position: 'absolute', left: 0, bottom: 0, width: SIZE, overflow: 'hidden' },
  clipImg: { position: 'absolute', left: 0, bottom: 0 },
  workers: { position: 'absolute', left: 0, width: SIZE, flexDirection: 'row', justifyContent: 'space-around' },
  puff: { position: 'absolute', left: 0, bottom: 0 },
  speck: { position: 'absolute', width: 8, height: 8, backgroundColor: '#e8e8f0' },
});
