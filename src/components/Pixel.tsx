import { Image, ImageStyle, StyleProp } from 'react-native';

export const SPRITES = {
  hut: require('../../assets/pixel/hut.png'),
  castle: require('../../assets/pixel/castle.png'),
  house: require('../../assets/pixel/house.png'),
  tower: require('../../assets/pixel/tower.png'),
  library: require('../../assets/pixel/library.png'),
  ruins: require('../../assets/pixel/ruins.png'),
  bear: require('../../assets/pixel/bear.png'),
  cat: require('../../assets/pixel/cat.png'),
  rabbit: require('../../assets/pixel/rabbit.png'),
  grass: require('../../assets/pixel/grass.png'),
  fog: require('../../assets/pixel/fog.png'),
  hammer: require('../../assets/pixel/hammer.png'),
  speaker_on: require('../../assets/pixel/speaker_on.png'),
  speaker_off: require('../../assets/pixel/speaker_off.png'),
  flame: require('../../assets/pixel/flame.png'),
};
export type SpriteName = keyof typeof SPRITES;

export function Pixel({ name, size, style }: { name: SpriteName; size: number; style?: StyleProp<ImageStyle> }) {
  return <Image source={SPRITES[name]} style={[{ width: size, height: size }, style]} />;
}
