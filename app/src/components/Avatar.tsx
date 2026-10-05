import { Image, StyleProp, View, ViewStyle } from 'react-native';
import { BODY_IMAGES, HAT_IMAGES } from '../lib/characterAssets';
import { Character } from '../lib/character';

// 캐릭터 = 몸(종 × 색) 위에 모자를 겹친 이미지
export default function Avatar({ character, size, style }: { character: Pick<Character, 'species' | 'color' | 'hat'>; size: number; style?: StyleProp<ViewStyle> }) {
  const body = BODY_IMAGES[`${character.species}_${character.color}`];
  const hat = character.hat !== 'none' ? HAT_IMAGES[character.hat] : null;
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Image source={body} style={{ width: size, height: size, position: 'absolute' }} />
      {hat ? <Image source={hat} style={{ width: size, height: size, position: 'absolute' }} /> : null}
    </View>
  );
}
