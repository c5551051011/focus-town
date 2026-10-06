import { Pixel } from './Pixel';
import ResultLayout from './ResultLayout';

// 오래 벗어났다 돌아왔을 때, 하루 1회 "통화 패스"를 쓸지 묻는 화면 (다른 결과 화면과 같은 틀)
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
    <ResultLayout
      hero={<Pixel name="hammer" size={110} />}
      title="WELCOME BACK"
      tone="neutral"
      message={`You were away for ${away}.\nWere you on a phone call?\nA call pass pauses the timer.\nYou get 1 pass per day.`}
      button="USE CALL PASS"
      onPress={onUse}
      secondary={{ label: 'LET IT COLLAPSE', onPress: onDecline }}
    />
  );
}
