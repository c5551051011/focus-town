import { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { colors, soft } from '../theme';
import { Pixel } from '../components/Pixel';
import SessionLayout from '../components/SessionLayout';
import { Txt } from '../components/ui';
import ResultLayout from '../components/ResultLayout';
import StopButton from '../components/StopButton';
import { AmbientId, setAmbientMuted, startAmbient, stopAmbient } from '../lib/ambient';
import { buildingFor } from '../lib/buildings';
import { EndReason, useFocusSession } from '../lib/useFocusSession';
import { statusMessage } from '../lib/messages';
import { startLive, stopLive } from '../lib/liveProgress';
import { blockApps, unblockApps } from '../lib/screenTime';
import CallPassPrompt from '../components/CallPassPrompt';
import { Character } from '../lib/character';

type Props = {
  minutes: number;
  endAt: number;
  tag: string;
  ambient: AmbientId;
  workers: Character[];
  goal: number;
  todayBefore: number;
  onEnded: (success: boolean, reason: EndReason) => void; // 세션이 끝난 순간(기록용)
  onDone: () => void; // 결과 화면에서 "TO TOWN"
};

export default function TimerScreen({ minutes, endAt, tag, ambient, workers, goal, todayBefore, onEnded, onDone }: Props) {
  useKeepAwake();
  const { phase, remainingMs, recovered, endReason, awaySeconds, giveUp, acceptPass, declinePass } = useFocusSession(minutes, endAt);
  const [before] = useState(todayBefore); // 기록되기 전 오늘 집중 시간 (목표 달성 판정용)
  const b = buildingFor(minutes);
  const [muted, setMuted] = useState(false);
  const toggleMute = () => {
    setAmbientMuted(!muted);
    setMuted(!muted);
  };
  const finished = phase === 'success' || phase === 'collapsed';

  // 끝나는 순간 바로 기록한다 (결과 화면에서 앱을 꺼도 기록이 남도록)
  useEffect(() => {
    if (finished && endReason) onEnded(phase === 'success', endReason);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  // 앱을 벗어났을 때 보여줄 진행 카드(라이브 액티비티/알림 카드). 이어하기로 들어온 경우에도 남은 시간 기준으로 띄운다.
  useEffect(() => {
    startLive({ kind: 'solo', tag, buildingId: b.id, buildingName: b.name, startedAt: endAt - minutes * 60000, endAt });
    return () => stopLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 배경 사운드: 세션 동안만 재생
  useEffect(() => {
    startAmbient(ambient);
    return stopAmbient;
  }, [ambient]);
  useEffect(() => {
    if (finished) stopAmbient();
  }, [finished]);

  // 집중하는 동안 고른 앱을 잠근다 (끝나거나 멈추면 푼다)
  useEffect(() => {
    blockApps();
    return unblockApps;
  }, []);
  useEffect(() => {
    if (finished) unblockApps();
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
    const goalHit = ok && goal > 0 && before < goal && before + minutes >= goal;
    return (
      <ResultLayout
        hero={<Pixel name={ok ? b.id : 'ruins'} size={150} />}
        title={ok ? 'TA-DA!' : 'OOPS!'}
        tone={ok ? 'good' : 'bad'}
        message={ok ? `${b.name} is built!\n+${minutes} min` : endReason === 'gave_up' ? "You stopped the session.\nLet's try again!" : "You wandered off too long.\nLet's try again!"}
        onClose={onDone}
      >
        {goalHit && (
          <View style={styles.goalPill}>
            <Txt style={styles.goal}>DAILY GOAL REACHED! ({goal} MIN)</Txt>
          </View>
        )}
      </ResultLayout>
    );
  }

  if (phase === 'callPrompt') return <CallPassPrompt awaySeconds={awaySeconds} onUse={acceptPass} onDecline={declinePass} />;

  return (
    <SessionLayout
      building={b.id}
      progress={progress}
      workers={workers}
      big={`${mm}:${ss}`}
      message={statusMessage(progress, Math.floor(progress * minutes * 60), recovered)}
      warn={phase === 'warning' || recovered}
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
  goalPill: { alignSelf: 'center', backgroundColor: soft.card, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16 },
  goal: { color: colors.gold, fontSize: 10, textAlign: 'center' },
});
