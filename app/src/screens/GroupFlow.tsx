import { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { colors, soft } from '../theme';
import Avatar from '../components/Avatar';
import { Pixel } from '../components/Pixel';
import SessionLayout, { TeamBar } from '../components/SessionLayout';
import ResultLayout from '../components/ResultLayout';
import StopButton from '../components/StopButton';
import { PixelButton, Txt } from '../components/ui';
import { AmbientId, setAmbientMuted, startAmbient, stopAmbient } from '../lib/ambient';
import { buildingFor, tieredBuilding } from '../lib/buildings';
import { Character } from '../lib/character';
import { statusMessage } from '../lib/messages';
import { RoomMember, RoomState, durabilityTone, lateJoinLeftSec, lateJoin, leaveRoom, nudgeAway, respondJoin } from '../lib/rooms';
import { selection } from '../lib/haptics';
import { useGroupSession } from '../lib/useGroupSession';
import { playSound } from '../lib/sounds';
import { startLive, stopLive } from '../lib/liveProgress';

export type GroupRecord = {
  startedAt: number;
  minutes: number;
  success: boolean;
  tag: string;
  building?: string;
  members: number;
  durability: number;
  reason: 'completed' | 'collapsed' | 'dropped' | 'left';
};

type Props = {
  initial: RoomState;
  myId: string;
  ambient: AmbientId;
  onRecord: (r: GroupRecord) => void;
  onExit: () => void;
};

const toCharacter = (m: RoomMember): Character => ({ name: m.name, species: m.species, color: m.color, hat: m.hat });
const fmt = (ms: number) => {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
};
const toneColor = (pct: number) => ({ good: colors.accent, warn: '#ffb86c', bad: colors.danger })[durabilityTone(pct)];

// 그룹 방 전체 흐름: 대기실 → (늦은 참여 대기) → 함께 집중 → 결과
export default function GroupFlow({ initial, myId, ambient, onRecord, onExit }: Props) {
  const { state, apply, remainingMs, away, offset, sync } = useGroupSession(initial.room.id, initial, myId);
  const { room, members } = state;
  const mine = members.find((m) => m.user_id === myId);
  const recorded = useRef(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (fn: () => Promise<{ ok: boolean; error?: string } & Record<string, unknown>>) => {
    if (busy) return;
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (!r.ok) setNotice(r.error ?? 'Something went wrong.');
    else setNotice(null);
  };

  const terminal =
    room.status === 'done' ||
    room.status === 'collapsed' ||
    room.status === 'closed' ||
    (room.status === 'running' && (mine?.status === 'dropped' || mine?.status === 'left'));

  // 끝나는 순간 내 기록을 한 번만 남긴다 (참여하지 않았다면 기록하지 않음)
  useEffect(() => {
    if (!terminal || recorded.current || !mine?.active_since) return;
    recorded.current = true;
    const endMs = room.ends_at ? Date.parse(room.ends_at) : Date.now();
    const startMs = Date.parse(mine.active_since);
    const participants = members.filter((m) => m.active_since).length;
    const finished = room.status === 'done' && mine.status === 'active';
    const reason: GroupRecord['reason'] = finished ? 'completed' : room.status === 'collapsed' && mine.status === 'active' ? 'collapsed' : mine.status === 'left' ? 'left' : 'dropped';
    onRecord({
      startedAt: startMs,
      minutes: Math.max(1, Math.round(Math.min(room.minutes, (Math.min(endMs, Date.now()) - startMs) / 60000))),
      success: finished,
      tag: room.tag,
      building: finished ? tieredBuilding(room.minutes, room.building_tier ?? 0).id : undefined,
      members: participants,
      durability: state.durability_now,
      reason,
    });
    if (finished) playSound('success');
    else playSound('collapse');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminal]);

  if (!mine) {
    return <Notice title="ROOM" text="You are no longer in this room." onOk={onExit} />;
  }
  if (room.status === 'closed') {
    return <Notice title="ROOM CLOSED" text="This room was closed." onOk={onExit} />;
  }

  // ── 결과 ──
  if (room.status === 'done' || room.status === 'collapsed') {
    return <Result state={state} mine={mine} onExit={onExit} />;
  }

  // ── 중도 탈락 / 내가 나감 ──
  if (room.status === 'running' && (mine.status === 'dropped' || mine.status === 'left')) {
    const left = mine.status === 'left';
    return (
      <Notice
        title={left ? 'YOU LEFT' : 'YOU WERE DROPPED'}
        text={left ? 'You left the session. Your team keeps building.' : 'You were away too long. Your team keeps building without you.'}
        icon={<Pixel name="ruins" size={140} />}
        onOk={onExit}
        okLabel="TO TOWN"
      />
    );
  }

  // ── 예전 방식(READY 대기)으로 만들어진 방: 지금은 바로 시작하는 방만 쓴다 ──
  if (room.status === 'lobby') {
    return (
      <Notice
        title="OLD ROOM"
        text="This room is from an older version and is waiting to start. Please leave and start a new session."
        okLabel="LEAVE"
        onOk={async () => {
          await leaveRoom(room.id);
          onExit();
        }}
      />
    );
  }

  // ── 시작됐는데 아직 참여하지 않은 사람 ──
  if (mine.status === 'waiting' || mine.status === 'pending') {
    return (
      <LateScreen
        state={state}
        mine={mine}
        offset={offset}
        remainingMs={remainingMs}
        busy={busy}
        notice={notice}
        onJoin={() => run(async () => { const r = await lateJoin(room.id); return apply(r) ? { ok: true } : { ok: false, error: r.ok ? undefined : r.error }; })}
        onLeave={async () => {
          await leaveRoom(room.id);
          onExit();
        }}
      />
    );
  }

  // ── 함께 집중 중 ──
  return (
    <Running
      state={state}
      mine={mine}
      myId={myId}
      remainingMs={remainingMs}
      away={away}
      ambient={ambient}
      onVote={(joiner, allow) => run(async () => { const r = await respondJoin(room.id, joiner, allow); return apply(r) ? { ok: true } : { ok: false, error: r.ok ? undefined : r.error }; })}
      onLeave={async () => {
        await leaveRoom(room.id);
        sync();
      }}
    />
  );
}

// ───────────────────────── 하위 화면 ─────────────────────────

function Notice({ title, text, icon, onOk, okLabel = 'OK' }: { title: string; text: string; icon?: React.ReactNode; onOk: () => void; okLabel?: string }) {
  return <ResultLayout hero={icon ?? <Pixel name="hammer" size={90} />} title={title} tone={icon ? 'bad' : 'neutral'} message={text} button={okLabel} onPress={onOk} />;
}

function MemberCard({ m, sub }: { m: RoomMember; sub?: string }) {
  return (
    <View style={styles.card}>
      <Avatar character={toCharacter(m)} size={64} />
      <Txt style={styles.cardName} numberOfLines={1}>{m.name}</Txt>
      {m.is_host ? <Txt style={[styles.cardSub, { color: colors.gold }]}>HOST</Txt> : null}
      {sub ? <Txt style={styles.cardSub}>{sub}</Txt> : null}
    </View>
  );
}

function LateScreen({ state, mine, offset, remainingMs, busy, notice, onJoin, onLeave }: { state: RoomState; mine: RoomMember; offset: number; remainingMs: number; busy: boolean; notice: string | null; onJoin: () => void; onLeave: () => void }) {
  const { room, members } = state;
  const pending = mine.status === 'pending';
  const freeLeft = lateJoinLeftSec(state, offset);
  const need = members.filter((m) => m.status === 'active').length;
  return (
    <View style={styles.center}>
      <Pixel name={buildingFor(room.minutes).id} size={130} />
      <Txt style={styles.title}>{pending ? 'WAITING...' : 'IN PROGRESS'}</Txt>
      <Txt style={styles.text}>
        {pending
          ? `Waiting for everyone to agree.\n${mine.votes_allow}/${need} agreed.`
          : `The session is running. ${fmt(remainingMs)} left.\n${freeLeft > 0 ? `Join now! (${fmt(freeLeft * 1000)} left to join freely)` : 'Joining now needs everyone in the session to agree.'}`}
      </Txt>
      {notice ? <Txt style={styles.error}>{notice}</Txt> : null}
      {!pending && <PixelButton label={busy ? '...' : freeLeft > 0 ? 'JOIN NOW' : 'ASK TO JOIN'} onPress={onJoin} style={styles.fullBtn} />}
      <PixelButton label="LEAVE" variant="ghost" onPress={onLeave} style={styles.fullBtn} />
    </View>
  );
}

function Running({ state, mine, myId, remainingMs, away, ambient, onVote, onLeave }: { state: RoomState; mine: RoomMember; myId: string; remainingMs: number; away: boolean; ambient: AmbientId; onVote: (joiner: string, allow: boolean) => void; onLeave: () => void }) {
  useKeepAwake();
  const { room, members } = state;
  const [muted, setMuted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const base = buildingFor(room.minutes);
  const dur = state.durability_now;
  const progress = 1 - remainingMs / (room.minutes * 60 * 1000);
  const crew = members.filter((m) => m.status === 'active').map(toCharacter);
  const awayNames = members.filter((m) => m.status === 'active' && m.away_s > 0 && m.user_id !== myId).map((m) => m.name);
  const damaging = members.some((m) => m.status === 'active' && m.away_s > 15);
  const waitingFor = state.invites.filter((i) => i.status === 'pending').map((i) => i.name);
  const request = members.find((m) => m.status === 'pending' && m.my_vote === null && mine.status === 'active');

  useEffect(() => {
    startAmbient(ambient);
    return stopAmbient;
  }, [ambient]);
  // 앱을 벗어났을 때 보여줄 진행 카드 (서버 시각 기준의 종료 시각을 내 기기 시각으로 바꿔서 쓴다)
  useEffect(() => {
    if (!room.started_at || !room.ends_at) return;
    const off = Date.parse(state.server_now) - Date.now();
    startLive({ kind: 'group', tag: room.tag, buildingId: base.id, buildingName: base.name, startedAt: Date.parse(room.started_at) - off, endAt: Date.parse(room.ends_at) - off });
    return () => stopLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const showToast = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };
  // 이탈한 팀원이 있을 때 화면을 탭하면 그 팀원에게 "돌아와요" 알림을 보낸다
  const nudge = async () => {
    selection();
    const r = await nudgeAway(room.id);
    if (!r.ok) showToast(r.error);
    else showToast(r.data > 0 ? `Nudge sent to ${awayNames.join(', ')}!` : 'Just nudged!\nGive them a moment.');
  };

  const message = toast
    ? toast
    : away
      ? 'You are away!\nCome back quickly.'
      : awayNames.length > 0
        ? `${awayNames.join(', ')} ${awayNames.length > 1 ? 'are' : 'is'} away!\nTap the screen to nudge.`
        : statusMessage(progress, Math.floor(progress * room.minutes * 60), false);

  return (
    <SessionLayout
      building={base.id}
      progress={progress}
      workers={crew}
      big={fmt(remainingMs)}
      message={message}
      warn={damaging}
      onTap={awayNames.length > 0 ? nudge : undefined}
      team={<TeamBar pct={dur} color={toneColor(dur)} />}
      topRight={
        ambient === 'off' ? null : (
          <Pressable
            onPress={() => {
              setAmbientMuted(!muted);
              setMuted(!muted);
            }}
            hitSlop={12}
            style={{ padding: 4 }}
          >
            <Pixel name={muted ? 'speaker_off' : 'speaker_on'} size={40} style={{ opacity: muted ? 0.5 : 0.85 }} />
          </Pressable>
        )
      }
      extra={
        waitingFor.length > 0 || request ? (
          <View style={styles.extra}>
            {waitingFor.length > 0 ? <Txt style={styles.waiting}>WAITING FOR {waitingFor.join(', ')}</Txt> : null}
            {request ? (
              <View style={styles.request}>
                <Txt style={styles.requestText}>{request.name} wants to join</Txt>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable style={[styles.reqBtn, { backgroundColor: colors.accent }]} onPress={() => onVote(request.user_id, true)}>
                    <Txt style={[styles.reqBtnText, { color: colors.bg }]}>ALLOW</Txt>
                  </Pressable>
                  <Pressable style={styles.reqBtn} onPress={() => onVote(request.user_id, false)}>
                    <Txt style={styles.reqBtnText}>DENY</Txt>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        ) : null
      }
      bottom={<StopButton onStop={onLeave} />}
    />
  );
}

function Result({ state, mine, onExit }: { state: RoomState; mine: RoomMember; onExit: () => void }) {
  const { room, members } = state;
  const finished = room.status === 'done' && mine.status === 'active';
  const building = tieredBuilding(room.minutes, room.building_tier ?? 0);
  const dur = room.durability ?? state.durability_now;
  const participants = members.filter((m) => m.active_since);
  const title = finished ? 'COMPLETE!' : room.status === 'collapsed' ? 'COLLAPSED' : 'YOU WERE DROPPED';
  const message = finished
    ? `${building.name} added to your town.${building.id !== buildingFor(room.minutes).id ? '\nThe building was damaged, so it came out smaller.' : ''}`
    : room.status === 'collapsed'
      ? 'The team building fell apart.'
      : 'Your team finished without you.';
  return (
    <ResultLayout hero={<Pixel name={finished ? building.id : 'ruins'} size={150} />} title={title} tone={finished ? 'good' : 'bad'} message={message} button="TO TOWN" onPress={onExit}>
      <TeamBar pct={dur} color={toneColor(dur)} />
      <View style={styles.grid}>
        {participants.map((m) => (
          <MemberCard key={m.user_id} m={m} sub={m.status === 'active' ? (room.status === 'done' ? 'FINISHED' : 'WAS THERE') : 'DROPPED'} />
        ))}
      </View>
    </ResultLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  title: { color: colors.accent, fontSize: 18, marginTop: 22, textAlign: 'center' },
  text: { color: colors.dim, fontSize: 9, lineHeight: 17, textAlign: 'center', marginVertical: 16 },
  fullBtn: { alignSelf: 'stretch', marginTop: 14 },
  error: { color: colors.danger, fontSize: 8, lineHeight: 14, textAlign: 'center', marginTop: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  card: { width: '47%', alignItems: 'center', paddingVertical: 14, backgroundColor: soft.card, borderRadius: 16 },
  cardName: { fontSize: 10, marginTop: 8, maxWidth: 130 },
  cardSub: { fontSize: 8, color: soft.subtle, marginTop: 6 },
  extra: { alignSelf: 'stretch', marginTop: 4 },
  waiting: { color: soft.subtle, fontSize: 9, marginTop: 8, textAlign: 'center' },
  request: { marginTop: 8, padding: 14, backgroundColor: soft.card, borderRadius: 18, alignItems: 'center', gap: 12 },
  requestText: { fontSize: 10 },
  reqBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999, backgroundColor: soft.sunken },
  reqBtnText: { fontSize: 10 },
});
