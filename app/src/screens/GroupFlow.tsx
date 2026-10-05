import { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { colors } from '../theme';
import Avatar from '../components/Avatar';
import { Pixel } from '../components/Pixel';
import SessionLayout from '../components/SessionLayout';
import StopButton from '../components/StopButton';
import { PixelButton, Txt } from '../components/ui';
import { AmbientId, setAmbientMuted, startAmbient, stopAmbient } from '../lib/ambient';
import { buildingFor, tieredBuilding } from '../lib/buildings';
import { Character } from '../lib/character';
import { statusMessage } from '../lib/messages';
import { RoomMember, RoomState, durabilityTone, lateJoinLeftSec, lateJoin, leaveRoom, respondJoin, setReady, startRoom } from '../lib/rooms';
import { useGroupSession } from '../lib/useGroupSession';
import { playSound } from '../lib/sounds';

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

  // ── 대기실 ──
  if (room.status === 'lobby') {
    return (
      <Lobby
        state={state}
        mine={mine}
        busy={busy}
        notice={notice}
        onReady={() => run(async () => apply(await setReady(room.id, !mine.ready)) ? { ok: true } : { ok: false, error: 'Could not update. Try again.' })}
        onStart={() => run(async () => { const r = await startRoom(room.id); return apply(r) ? { ok: true } : { ok: false, error: r.ok ? undefined : r.error }; })}
        onLeave={async () => {
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
  return (
    <View style={styles.center}>
      {icon}
      <Txt style={styles.title}>{title}</Txt>
      <Txt style={styles.text}>{text}</Txt>
      <PixelButton label={okLabel} onPress={onOk} style={styles.fullBtn} />
    </View>
  );
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

function Lobby({ state, mine, busy, notice, onReady, onStart, onLeave }: { state: RoomState; mine: RoomMember; busy: boolean; notice: string | null; onReady: () => void; onStart: () => void; onLeave: () => void }) {
  const { room, members } = state;
  const readyCount = members.filter((m) => m.ready).length;
  const b = buildingFor(room.minutes);
  const share = () =>
    Share.share({ message: `Join my Focus Town room and build together!\nRoom code: ${room.code}\n${room.minutes} min · ${room.tag}` }).catch(() => {});
  return (
    <ScrollView contentContainerStyle={styles.lobby}>
      <Txt style={styles.label}>ROOM CODE</Txt>
      <Txt style={styles.code}>{room.code}</Txt>
      <PixelButton label="SHARE CODE" variant="ghost" onPress={share} style={{ alignSelf: 'stretch', marginTop: 14 }} />

      <View style={styles.infoRow}>
        <Pixel name={b.id} size={48} />
        <Txt style={styles.info}>{room.minutes} MIN · {room.tag}{'\n'}{b.name}</Txt>
      </View>

      <Txt style={styles.label}>PLAYERS {members.length}/{room.max_members}</Txt>
      <View style={styles.grid}>
        {members.map((m) => (
          <MemberCard key={m.user_id} m={m} sub={m.ready ? 'READY' : 'WAITING'} />
        ))}
      </View>

      <Txt style={styles.hint}>
        The host starts when ready. People who are not ready can still join within {Math.round(room.late_join_seconds / 60)} minutes after the start; after that everyone in the session must agree.
      </Txt>
      {notice ? <Txt style={styles.error}>{notice}</Txt> : null}

      {mine.is_host ? (
        <PixelButton label={busy ? '...' : `START (${readyCount} READY)`} onPress={onStart} style={styles.fullBtn} />
      ) : (
        <PixelButton label={mine.ready ? 'NOT READY' : 'READY!'} variant={mine.ready ? 'ghost' : 'primary'} onPress={onReady} style={styles.fullBtn} />
      )}
      <PixelButton label="LEAVE" variant="ghost" onPress={onLeave} style={styles.fullBtn} />
    </ScrollView>
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
  const base = buildingFor(room.minutes);
  const dur = state.durability_now;
  const progress = 1 - remainingMs / (room.minutes * 60 * 1000);
  const crew = members.filter((m) => m.status === 'active').map(toCharacter);
  const awayNames = members.filter((m) => m.status === 'active' && m.away_s > 0 && m.user_id !== myId).map((m) => m.name);
  const damaging = members.some((m) => m.status === 'active' && m.away_s > 15);
  const request = members.find((m) => m.status === 'pending' && m.my_vote === null && mine.status === 'active');

  useEffect(() => {
    startAmbient(ambient);
    return stopAmbient;
  }, [ambient]);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const message = away
    ? 'You are away!\nCome back quickly.'
    : awayNames.length > 0
      ? `${awayNames.join(', ')} ${awayNames.length > 1 ? 'are' : 'is'} away!\nThe building is taking damage.`
      : statusMessage(progress, Math.floor(progress * room.minutes * 60), false);

  return (
    <SessionLayout
      building={base.id}
      progress={progress}
      workers={crew}
      big={fmt(remainingMs)}
      message={message}
      warn={damaging}
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
        <View style={styles.durWrap}>
          <View style={styles.durHead}>
            <Txt style={styles.durLabel}>TEAM BUILDING</Txt>
            <Txt style={[styles.durLabel, { color: toneColor(dur) }]}>{dur}%</Txt>
          </View>
          <View style={styles.durTrack}>
            <View style={[styles.durFill, { width: `${dur}%`, backgroundColor: toneColor(dur) }]} />
          </View>
          {request ? (
            <View style={styles.request}>
              <Txt style={styles.requestText}>{request.name} wants to join</Txt>
              <View style={{ flexDirection: 'row', gap: 8 }}>
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
  return (
    <ScrollView contentContainerStyle={styles.lobby}>
      <View style={{ alignItems: 'center' }}>
        <Pixel name={finished ? building.id : 'ruins'} size={150} />
        <Txt style={[styles.title, { color: finished ? colors.gold : colors.danger }]}>{title}</Txt>
        <Txt style={styles.text}>
          {finished
            ? `${building.name} added to your town.${building.id !== buildingFor(room.minutes).id ? '\nThe building was damaged, so it came out smaller.' : ''}`
            : room.status === 'collapsed'
              ? 'The team building fell apart.'
              : 'Your team finished without you.'}
        </Txt>
      </View>

      <View style={styles.durWrap}>
        <View style={styles.durHead}>
          <Txt style={styles.durLabel}>TEAM BUILDING</Txt>
          <Txt style={[styles.durLabel, { color: toneColor(dur) }]}>{dur}%</Txt>
        </View>
        <View style={styles.durTrack}>
          <View style={[styles.durFill, { width: `${dur}%`, backgroundColor: toneColor(dur) }]} />
        </View>
      </View>

      <View style={styles.grid}>
        {participants.map((m) => (
          <MemberCard key={m.user_id} m={m} sub={m.status === 'active' ? (room.status === 'done' ? 'FINISHED' : 'WAS THERE') : 'DROPPED'} />
        ))}
      </View>
      <PixelButton label="TO TOWN" onPress={onExit} style={styles.fullBtn} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  lobby: { padding: 24, paddingBottom: 48, alignItems: 'stretch' },
  title: { color: colors.accent, fontSize: 18, marginTop: 22, textAlign: 'center' },
  text: { color: colors.dim, fontSize: 9, lineHeight: 17, textAlign: 'center', marginVertical: 16 },
  fullBtn: { alignSelf: 'stretch', marginTop: 14 },
  label: { color: colors.dim, fontSize: 9, marginTop: 22, marginBottom: 8, textAlign: 'center' },
  code: { color: colors.gold, fontSize: 36, textAlign: 'center', letterSpacing: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 8 },
  info: { color: colors.text, fontSize: 9, lineHeight: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 4 },
  card: { width: '47%', alignItems: 'center', paddingVertical: 14, backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.line },
  cardName: { fontSize: 10, marginTop: 8, maxWidth: 130 },
  cardSub: { fontSize: 7, color: colors.dim, marginTop: 6 },
  hint: { color: colors.dim, fontSize: 7, lineHeight: 13, textAlign: 'center', marginTop: 18 },
  error: { color: colors.danger, fontSize: 8, lineHeight: 14, textAlign: 'center', marginTop: 12 },
  durWrap: { alignSelf: 'stretch', marginTop: 12, paddingHorizontal: 10 },
  durHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  durLabel: { fontSize: 8, color: colors.dim },
  durTrack: { height: 14, backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.line },
  durFill: { height: '100%' },
  request: { marginTop: 12, padding: 10, backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.gold, alignItems: 'center', gap: 10 },
  requestText: { fontSize: 8 },
  reqBtn: { paddingVertical: 8, paddingHorizontal: 14, borderWidth: 3, borderColor: colors.line, backgroundColor: colors.bg },
  reqBtnText: { fontSize: 8 },
});
