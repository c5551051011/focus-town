import { supabase } from './supabase';
import { Character } from './character';

// 그룹 방: 모든 읽기/쓰기는 서버(Supabase)의 RPC 함수로 한다. backend/supabase/migrations/0002_rooms.sql 참고.

export type MemberStatus = 'waiting' | 'active' | 'pending' | 'dropped' | 'left';
export type RoomStatus = 'lobby' | 'running' | 'done' | 'collapsed' | 'closed';

export type RoomMember = Character & {
  user_id: string;
  status: MemberStatus;
  ready: boolean;
  is_host: boolean;
  damage_s: number; // 초과 이탈(초)
  away_s: number; // 지금 앱을 벗어나 있는 시간(초), 아니면 0
  joined_at: string;
  active_since: string | null;
  votes_allow: number;
  my_vote: boolean | null;
};

export type Room = {
  id: string;
  code: string;
  host_id: string;
  minutes: number;
  tag: string;
  status: RoomStatus;
  max_members: number;
  late_join_seconds: number;
  started_at: string | null;
  ends_at: string | null;
  durability: number | null;
  building_tier: number | null;
};

export type RoomState = {
  server_now: string;
  room: Room;
  members: RoomMember[];
  durability_now: number;
  active_count: number;
  invites: { user_id: string; name: string; status: 'pending' | 'accepted' | 'declined' }[];
};

export type RoomResult<T = RoomState> = { ok: true; data: T } | { ok: false; error: string };

const MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: 'Please sign in first.',
  PROFILE_REQUIRED: 'Create your character first.',
  ROOM_NOT_FOUND: 'No room with that code.',
  ROOM_FULL: 'This room is full.',
  ROOM_CLOSED: 'This room has already ended.',
  ALREADY_IN_ROOM: 'You are already in a running session.',
  NOT_HOST: 'Only the host can do that.',
  NOT_IN_LOBBY: 'The session has already started.',
  NOT_RUNNING: 'The session is not running.',
  NOT_A_MEMBER: 'You are not in this room.',
  NOT_ACTIVE: 'Only people in the session can do that.',
  BAD_MINUTES: 'Pick a time between 1 and 120 minutes.',
  INVITE_NOT_FOUND: 'That invite is no longer available.',
};

function friendly(message: string | undefined): string {
  if (!message) return 'Something went wrong. Please try again.';
  const key = Object.keys(MESSAGES).find((k) => message.includes(k));
  if (key) return MESSAGES[key];
  if (/network|fetch|timeout/i.test(message)) return 'Network problem. Check your connection.';
  return 'Something went wrong. Please try again.';
}

async function call<T = RoomState>(fn: string, args?: Record<string, unknown>): Promise<RoomResult<T>> {
  try {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) return { ok: false, error: friendly(error.message) };
    return { ok: true, data: data as T };
  } catch (e) {
    return { ok: false, error: friendly(e instanceof Error ? e.message : undefined) };
  }
}

export type Invite = {
  room_id: string;
  minutes: number;
  tag: string;
  host_name: string;
  host_species: Character['species'];
  host_color: Character['color'];
  host_hat: Character['hat'];
  started_ago_s: number;
  free_join_left_s: number; // 0이면 전원 허용이 필요하다
  ends_in_s: number;
};

export const createRoomWithInvites = (minutes: number, tag: string, invitees: string[]) =>
  call('create_room_with_invites', { p_minutes: minutes, p_tag: tag, p_invitees: invitees });
export const myInvites = () => call<Invite[]>('my_invites');
export const acceptInvite = (room: string) => call('accept_invite', { p_room: room });
export const declineInvite = (room: string) => call<null>('decline_invite', { p_room: room });

export const createRoom = (minutes: number, tag: string) => call('create_room', { p_minutes: minutes, p_tag: tag });
export const joinRoom = (code: string) => call('join_room', { p_code: code.trim().toUpperCase() });
export const setReady = (room: string, ready: boolean) => call('set_ready', { p_room: room, p_ready: ready });
export const startRoom = (room: string) => call('start_room', { p_room: room });
export const lateJoin = (room: string) => call('late_join', { p_room: room });
export const respondJoin = (room: string, joiner: string, allow: boolean) => call('respond_join', { p_room: room, p_joiner: joiner, p_allow: allow });
export const heartbeat = (room: string, damage: number) => call('heartbeat', { p_room: room, p_damage_s: Math.round(damage) });
// 화면을 잠갔음을 서버에 알린다 (잠겨 있는 동안은 이탈/피해로 계산하지 않는다). 해제는 앱으로 돌아와 보내는 heartbeat 가 한다.
// 서버에 0005_lock.sql 이 아직 없으면 실패하지만, 앱은 그냥 넘어간다.
export const setLocked = (room: string, locked: boolean) => call<null>('set_locked', { p_room: room, p_locked: locked });
export const finishRoom = (room: string) => call('finish_room', { p_room: room });
export const leaveRoom = (room: string) => call<{ ok: boolean }>('leave_room', { p_room: room });
export const getRoomState = (room: string) => call('get_room_state', { p_room: room });
export const myOpenRoom = () => call<string | null>('my_open_room');
// 이탈 중인 팀원에게 "돌아와요" 알림을 보낸다. 알림을 받은 사람 수를 돌려준다 (0 이면 이탈한 사람이 없거나 방금 보냈다).
export const nudgeAway = (room: string) => call<number>('nudge_away', { p_room: room });
export const setPushToken = (token: string) => call<null>('set_push_token', { p_token: token });

// ── 시간 계산 ──
// 서버 시각과 내 기기 시각의 차이 (응답을 받을 때마다 갱신)
export const clockOffset = (s: RoomState) => Date.parse(s.server_now) - Date.now();
export const serverNow = (offset: number) => Date.now() + offset;
export const msUntilEnd = (s: RoomState, offset: number) => (s.room.ends_at ? Date.parse(s.room.ends_at) - serverNow(offset) : 0);
// 시작 후 경과 시간(초)
export const elapsedSec = (s: RoomState, offset: number) => (s.room.started_at ? (serverNow(offset) - Date.parse(s.room.started_at)) / 1000 : 0);
// 늦은 참여를 바로 할 수 있는 남은 시간(초). 0이면 전원 허용이 필요하다.
export const lateJoinLeftSec = (s: RoomState, offset: number) => Math.max(0, s.room.late_join_seconds - elapsedSec(s, offset));

export const DAMAGE_START_SEC = 15; // 이 시간까지는 피해 없음 (유예)
export const DROP_DAMAGE_SEC = 45; // 초과 이탈이 이 값에 이르면 탈락

export function durabilityTone(pct: number): 'good' | 'warn' | 'bad' {
  return pct >= 70 ? 'good' : pct >= 40 ? 'warn' : 'bad';
}
