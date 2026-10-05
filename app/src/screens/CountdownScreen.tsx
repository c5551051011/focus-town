import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { selection } from '../lib/haptics';
import { colors } from '../theme';
import SessionLayout from '../components/SessionLayout';
import { Txt } from '../components/ui';
import { buildingFor } from '../lib/buildings';
import { playSound } from '../lib/sounds';
import { Character } from '../lib/character';

const SECONDS = 5;

// START 직후 5초 유예. 타이머와 같은 레이아웃이라 끝나면 그대로 이어서 건설이 시작된다.
export default function CountdownScreen({ minutes, workers, onGo, onCancel }: { minutes: number; workers: Character[]; onGo: () => void; onCancel: () => void }) {
  const [left, setLeft] = useState(SECONDS);
  const b = buildingFor(minutes);
  const go = useRef(onGo);

  useEffect(() => {
    go.current = onGo;
  });

  useEffect(() => {
    playSound('start');
    const id = setInterval(() => setLeft((n) => n - 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (left <= 0) go.current();
    else selection();
  }, [left]);

  return (
    <SessionLayout
      building={b.id}
      progress={0}
      workers={workers}
      big={String(Math.max(left, 0))}
      message={'Get ready...\nStarting soon!'}
      bottom={
        <Txt style={styles.cancel} onPress={onCancel}>
          CANCEL
        </Txt>
      }
    />
  );
}

const styles = StyleSheet.create({
  cancel: { color: colors.text, fontSize: 12, paddingVertical: 14, paddingHorizontal: 28, borderWidth: 3, borderColor: 'rgba(255,255,255,0.35)', opacity: 0.8 },
});
