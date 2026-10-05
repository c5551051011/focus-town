import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { Pixel } from './Pixel';
import { PixelButton, Txt } from './ui';

// 오래 벗어났다 돌아왔을 때, 하루 1회 "통화 패스"를 쓸지 묻는 화면
export default function CallPassPrompt({
  awaySeconds,
  onUse,
  onDecline,
}: {
  awaySeconds: number;
  onUse: () => void;
  onDecline: () => void;
}) {
  const m = Math.floor(awaySeconds / 60);
  const s = awaySeconds % 60;
  const away = m > 0 ? `${m}m ${s}s` : `${s}s`;
  return (
    <View style={styles.wrap}>
      <Pixel name="hammer" size={80} />
      <Txt style={styles.title}>WELCOME BACK</Txt>
      <Txt style={styles.text}>
        You were away for {away}.{'\n\n'}Were you on a phone call? Use today&apos;s call pass to pause the timer for that time and keep building.{'\n\n'}(1 pass per day)
      </Txt>
      <PixelButton label="USE CALL PASS" onPress={onUse} style={styles.btn} />
      <PixelButton label="LET IT COLLAPSE" variant="ghost" onPress={onDecline} style={styles.btn} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  title: { color: colors.accent, fontSize: 16, marginTop: 24 },
  text: { color: colors.text, fontSize: 9, lineHeight: 17, textAlign: 'center', marginVertical: 22 },
  btn: { alignSelf: 'stretch', marginTop: 12 },
});
