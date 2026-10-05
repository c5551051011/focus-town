import { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { colors } from '../theme';
import { Pixel } from '../components/Pixel';
import SessionLayout from '../components/SessionLayout';
import { PixelButton, Txt } from '../components/ui';
import StopButton from '../components/StopButton';
import { AmbientId, setAmbientMuted, startAmbient, stopAmbient } from '../lib/ambient';
import { buildingFor } from '../lib/buildings';
import { EndReason, useFocusSession } from '../lib/useFocusSession';
import { statusMessage } from '../lib/messages';

type Props = { minutes: number; ambient: AmbientId; goal: number; todayBefore: number; onDone: (success: boolean, reason: EndReason) => void };

export default function TimerScreen({ minutes, ambient, goal, todayBefore, onDone }: Props) {
  useKeepAwake();
  const { phase, remainingMs, recovered, endReason, giveUp } = useFocusSession(minutes);
  const b = buildingFor(minutes);
  const [muted, setMuted] = useState(false);
  const toggleMute = () => {
    setAmbientMuted(!muted);
    setMuted(!muted);
  };
  const finished = phase === 'success' || phase === 'collapsed';

  // 배경 사운드: 세션 동안만 재생
  useEffect(() => {
    startAmbient(ambient);
    return stopAmbient;
  }, [ambient]);
  useEffect(() => {
    if (finished) stopAmbient();
  }, [finished]);

  // Android 뒤로가기로 실수로 세션을 나가지 못하게 막는다
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const sec = Math.ceil(remainingMs / 1000);
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  const progress = 1 - remainingMs / (minutes * 60 * 1000);

  if (finished) {
    const ok = phase === 'success';
    const goalHit = ok && goal > 0 && todayBefore < goal && todayBefore + minutes >= goal;
    return (
      <View style={styles.center}>
        <Pixel name={ok ? b.id : 'ruins'} size={160} />
        <Txt style={[styles.big, { color: ok ? colors.gold : colors.danger }]}>{ok ? 'COMPLETE!' : 'COLLAPSED'}</Txt>
        <Txt style={styles.msg}>
          {ok ? `${b.name} added to your town.\n+${minutes} min` : 'You left the app too long.\nTry again!'}
        </Txt>
        {goalHit && <Txt style={styles.goal}>DAILY GOAL REACHED! ({goal} MIN)</Txt>}
        <PixelButton label="TO TOWN" onPress={() => onDone(ok, endReason ?? (ok ? 'completed' : 'left_app'))} style={styles.btn} />
      </View>
    );
  }

  return (
    <SessionLayout
      building={b.id}
      progress={progress}
      big={`${mm}:${ss}`}
      message={statusMessage(progress, Math.floor(progress * minutes * 60), recovered)}
      warn={phase === 'warning'}
      topRight={
        ambient === 'off' ? null : (
          <Pressable onPress={toggleMute} hitSlop={12} style={styles.mute}>
            <Pixel name={muted ? 'speaker_off' : 'speaker_on'} size={40} style={{ opacity: muted ? 0.5 : 0.85 }} />
          </Pressable>
        )
      }
      bottom={<StopButton onStop={giveUp} />}
    />
  );
}

const styles = StyleSheet.create({
  mute: { padding: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  goal: { color: colors.gold, fontSize: 10, marginTop: 6, textAlign: 'center' },
  big: { fontSize: 20, marginTop: 20 },
  msg: { color: colors.dim, fontSize: 9, lineHeight: 16, textAlign: 'center', marginVertical: 8 },
  btn: { marginTop: 20, alignSelf: 'stretch' },
});
