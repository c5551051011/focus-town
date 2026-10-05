import { Image, StyleProp, ImageStyle } from 'react-native';
import { ICON_IMAGES, IconName } from '../lib/iconAssets';

// 흰색 픽셀 아이콘에 원하는 색을 입혀서 쓴다
export default function Icon({ name, size = 24, color = '#f8f8f2', style }: { name: IconName; size?: number; color?: string; style?: StyleProp<ImageStyle> }) {
  return <Image source={ICON_IMAGES[name]} style={[{ width: size, height: size, tintColor: color }, style]} />;
}
