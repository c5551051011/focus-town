import { useEffect, useRef, useState } from 'react';
import { BackHandler, Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { PressStart2P_400Regular, useFonts } from '@expo-google-fonts/press-start-2p';
import { colors } from './src/theme';
import { Txt } from './src/components/ui';
import { Session } from './src/lib/types';
import { AmbientId } from './src/lib/ambient';
import { initAnalytics, track } from './src/lib/analytics';
import { initErrorReporting } from './src/lib/errors';
import { syncReminders } from './src/lib/notifications';
import { computeStats } from './src/lib/stats';
import { computeStreak } from './src/lib/streak';
import { PRESET_TAGS } from './src/lib/tags';
import { EndReason, GRACE_SECONDS } from './src/lib/useFocusSession';
import { ActiveRecord, clearActive, loadActive, patchActive, saveActive } from './src/lib/activeSession';
import { isPassAvailable, consumePass } from './src/lib/callPass';
import { RoomState, acceptInvite, createRoomWithInvites, declineInvite, getRoomState, myOpenRoom } from './src/lib/rooms';
import { deleteAccount, signOut } from './src/lib/auth';
import { supabase } from './src/lib/supabase';
import { unblockApps } from './src/lib/screenTime';
import { fetchProfile, saveProfile } from './src/lib/profile';
import { Character } from './src/lib/character';
import { parseFollowCode } from './src/lib/social';
import { useAccount, useInvites } from './src/lib/useAccount';
import { loadSessions, saveSessions } from './src/lib/storage';
import { DEFAULT_SETTINGS, Settings, applyPrefs, loadSettings, saveSettings } from './src/lib/settings';
import { TIME_VALUES } from './src/lib/buildings';
import CallPassPrompt from './src/components/CallPassPrompt';
import AuthSheet from './src/components/AuthSheet';
import ConfirmSheet from './src/components/ConfirmSheet';
import InviteBanner from './src/components/InviteBanner';
import ErrorBoundary from './src/components/ErrorBoundary';
import TabBar, { TabId } from './src/components/TabBar';
import GroupFlow, { GroupRecord } from './src/screens/GroupFlow';
import CharacterScreen from './src/screens/CharacterScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { AddFriendsScreen, FollowListScreen } from './src/screens/FriendsScreens';
import TownScreen from './src/screens/TownScreen';
import SetupScreen from './src/screens/SetupScreen';
import TimerScreen from './src/screens/TimerScreen';
import StatsScreen from './src/screens/StatsScreen';
import CountdownScreen from './src/screens/CountdownScreen';

initErrorReporting();

const modeOf = (tag: string) => (PRESET_TAGS.includes(tag) ? tag : 'custom'); // 직접 만든 모드 이름은 분석에 보내지 않는다

type Tab = TabId;

// 탭 위에 전체 화면으로 열리는 화면들
type Overlay = { type: 'settings' } | { type: 'add'; query?: string } | { type: 'follow'; tab: 'following' | 'followers' } | null;

type Pending = { minutes: number; ambient: AmbientId; tag: string; invitees: string[] };

export default function App() {
  const [fontsLoaded] = useFonts({ PressStart2P_400Regular });
  const [tab, setTab] = useState<Tab>('setup');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [invitees, setInvitees] = useState<string[]>([]); // 이번 세션에 초대할 친구
  const [active, setActive] = useState<{ minutes: number; startedAt: number; endAt: number; ambient: AmbientId; tag: string } | null>(null);
  const [recovery, setRecovery] = useState<{ rec: ActiveRecord; awaySeconds: number } | null>(null); // 강제 종료 후 복구 확인 중
  const recorded = useRef<number | null>(null); // 이미 기록한 세션(startedAt)

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [help, setHelp] = useState(false); // 설정에서 다시 연 "How to play"
  const [editingCharacter, setEditingCharacter] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState('');
  const [notice, setNotice] = useState<{ title: string; text: string } | null>(null); // 앱 스타일 안내 창
  const authResolve = useRef<((id: string | null) => void) | null>(null);
  const askLoginRef = useRef<(reason: string) => Promise<string | null>>(() => Promise.resolve(null)); // 링크로 열렸을 때 최신 로그인 함수를 쓰기 위해
  const [group, setGroup] = useState<RoomState | null>(null); // 참여 중인 그룹 방
  const [joining, setJoining] = useState(false);

  const account = useAccount();
  const { userId } = account;
  const idle = loaded && !pending && !active && !group && !recovery && !editingCharacter && !help && settings.onboarded;
  const inviteBox = useInvites(userId, idle);

  useEffect(() => {
    Promise.all([loadSessions(), loadSettings(), initAnalytics()]).then(async ([sess, s]) => {
      const fixed = TIME_VALUES.includes(s.minutes) ? s : { ...s, minutes: 25 };
      applyPrefs(fixed);
      setSettings(fixed);
      let list = sess;

      // 앱이 강제 종료됐을 때 진행 중이던 세션이 남아 있으면: 짧게 벗어났다면 이어서, 오래됐다면 통화 패스 확인 또는 실패 처리
      const rec = await loadActive();
      if (rec) {
        const away = (Date.now() - (rec.leftAt ?? rec.seenAt)) / 1000;
        if (away <= GRACE_SECONDS) {
          patchActive({ leftAt: null, seenAt: Date.now() });
          recorded.current = null;
          setActive({ minutes: rec.minutes, startedAt: rec.startedAt, endAt: rec.endAt, ambient: rec.ambient, tag: rec.tag });
        } else if (await isPassAvailable(away)) {
          setRecovery({ rec, awaySeconds: Math.round(away) });
        } else {
          list = [...sess, { id: String(rec.startedAt), startedAt: rec.startedAt, minutes: rec.minutes, success: false, tag: rec.tag }];
          saveSessions(list);
          clearActive();
          track('session_fail', { minutes: rec.minutes, mode: modeOf(rec.tag), reason: 'app_closed' });
          setNotice({ title: 'Your last session collapsed', text: 'The app was closed for too long during your focus session.' });
        }
      }
      setSessions(list);
      setLoaded(true);
      track('app_open');
    });
  }, []);

  // 하루 시작 알림: 설정이나 기록이 바뀔 때마다 앞으로 7일치를 다시 맞춘다
  useEffect(() => {
    if (!loaded) return;
    const streak = computeStreak(sessions);
    syncReminders({
      enabled: settings.reminderOn,
      hour: settings.reminderHour,
      minute: settings.reminderMinute,
      doneToday: streak.doneToday,
      streak: streak.current,
    });
  }, [loaded, sessions, settings.reminderOn, settings.reminderHour, settings.reminderMinute]);

  // 안드로이드 뒤로 가기: 열려 있는 화면(친구 추가·설정 등)을 먼저 닫는다
  useEffect(() => {
    if (!overlay) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setOverlay(null);
      return true;
    });
    return () => sub.remove();
  }, [overlay]);

  // 로그인하면: 서버에 저장된 프로필이 있으면 그 캐릭터를 불러오고(새 기기 복원), 없으면 기기의 캐릭터를 서버에 저장한다
  useEffect(() => {
    if (!loaded || !userId) return;
    (async () => {
      const remote = await fetchProfile(userId);
      if (remote) updateSettings({ character: remote });
      else if (settings.character) await saveProfile(userId, settings.character);
      account.refreshSocial();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, userId]);

  // 앱을 다시 켰을 때 진행 중이던 그룹 방이 있으면 이어서 들어간다
  useEffect(() => {
    if (!loaded || !userId) return;
    (async () => {
      const open = await myOpenRoom();
      if (!open.ok || !open.data) return;
      const s = await getRoomState(open.data);
      if (s.ok) setGroup(s.data);
    })();
  }, [loaded, userId]);

  // 친구 팔로우 링크(focustown://follow/CODE 또는 웹 링크)로 앱이 열리면 친구 추가 화면으로 간다
  useEffect(() => {
    const open = (url: string | null) => {
      const code = url ? parseFollowCode(url) : null;
      // 로그인한 뒤 친구 추가 화면으로 간다 (로그인 창을 닫으면 아무 일도 없다)
      if (code) askLoginRef.current('Sign in to follow your friend.').then((id) => id && setOverlay({ type: 'add', query: code }));
    };
    Linking.getInitialURL().then(open).catch(() => {});
    const sub = Linking.addEventListener('url', (e) => open(e.url));
    return () => sub.remove();
  }, []);

  const updateSettings = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    applyPrefs(next);
    setSettings(next);
    saveSettings(next);
  };

  const saveCharacter = (c: Character) => {
    updateSettings({ character: c });
    if (userId) saveProfile(userId, c);
    setEditingCharacter(false);
  };

  const resetRecords = () => {
    setSessions([]);
    saveSessions([]);
  };

  const finishOnboarding = (skipped: boolean) => {
    if (!settings.onboarded) track(skipped ? 'onboarding_skipped' : 'onboarding_done');
    updateSettings({ onboarded: true });
    setHelp(false);
  };

  // 친구/그룹 기능은 로그인이 필요하다. 로그인 창을 띄우고, 로그인하면 사용자 id 를 돌려준다 (닫으면 null).
  const askLogin = (reason: string): Promise<string | null> => {
    if (userId) return Promise.resolve(userId);
    return new Promise((resolve) => {
      authResolve.current = resolve;
      setAuthReason(reason);
      setAuthOpen(true);
    });
  };
  const finishAuth = async (signedIn: boolean) => {
    setAuthOpen(false);
    const resolve = authResolve.current;
    authResolve.current = null;
    if (!resolve) return;
    if (!signedIn) return resolve(null);
    const { data } = await supabase.auth.getSession();
    const u = data.session?.user;
    resolve(u && !u.is_anonymous ? u.id : null);
  };
  const needAccount = () => askLogin('Sign in to add friends and focus together.');

  const openAddFriends = async () => {
    if (await needAccount()) setOverlay({ type: 'add' });
  };


  useEffect(() => {
    askLoginRef.current = askLogin;
  });

  // 앱이 꺼진 사이 앱 잠금이 남아 있지 않도록, 켤 때마다 한 번 푼다 (집중 중이면 곧 다시 잠근다)
  useEffect(() => {
    unblockApps();
  }, []);

  // 친구를 초대해서 그룹으로 시작: 방을 만들자마자 시작한다
  const startGroup = async (p: Pending) => {
    const id = await needAccount();
    if (!id || !settings.character) return setPending(null);
    if (!(await saveProfile(id, settings.character))) {
      setPending(null);
      return setNotice({ title: 'Connection problem', text: 'Could not reach the server. Check your connection and try again.' });
    }
    const r = await createRoomWithInvites(p.minutes, p.tag, p.invitees);
    setPending(null);
    if (!r.ok) return setNotice({ title: 'Could not start', text: r.error });
    track('group_create', { minutes: p.minutes, mode: modeOf(p.tag), invited: p.invitees.length });
    setInvitees([]);
    setGroup(r.data);
  };

  const joinInvite = async (roomId: string) => {
    setJoining(true);
    const r = await acceptInvite(roomId);
    setJoining(false);
    if (!r.ok) {
      inviteBox.dismiss(roomId);
      return setNotice({ title: 'Could not join', text: r.error });
    }
    track('group_join', {});
    setGroup(r.data);
  };

  const recordGroup = (g: GroupRecord) => {
    const next = [...sessions, { id: `g-${g.startedAt}`, startedAt: g.startedAt, minutes: g.minutes, success: g.success, tag: g.tag, group: true, building: g.building, members: g.members }];
    setSessions(next);
    saveSessions(next);
    track(g.success ? 'group_complete' : 'group_fail', { minutes: g.minutes, members: g.members, durability: g.durability, reason: g.reason });
  };

  const todayBefore = computeStats(sessions).todayMinutes;

  // 세션이 끝나는 순간 기록한다 (결과 화면에서 앱을 꺼도 기록이 남도록)
  const record = (success: boolean, reason: EndReason) => {
    if (!active || recorded.current === active.startedAt) return;
    recorded.current = active.startedAt;
    clearActive();
    track(success ? 'session_complete' : 'session_fail', { minutes: active.minutes, mode: modeOf(active.tag), reason });
    if (success && settings.dailyGoal > 0 && todayBefore < settings.dailyGoal && todayBefore + active.minutes >= settings.dailyGoal) track('goal_reached', { goal: settings.dailyGoal });
    const next = [...sessions, { id: String(active.startedAt), startedAt: active.startedAt, minutes: active.minutes, success, tag: active.tag }];
    setSessions(next);
    saveSessions(next);
  };

  const leaveResult = () => {
    setActive(null);
    setTab('town');
  };

  const startSession = (p: { minutes: number; ambient: AmbientId; tag: string }) => {
    const startedAt = Date.now();
    const endAt = startedAt + p.minutes * 60 * 1000;
    saveActive({ ...p, startedAt, endAt, leftAt: null, seenAt: startedAt });
    setActive({ ...p, startedAt, endAt });
  };

  // 강제 종료 복구 화면의 선택 처리
  const resumeWithPass = async () => {
    if (!recovery) return;
    const { rec, awaySeconds } = recovery;
    await consumePass();
    const endAt = rec.endAt + awaySeconds * 1000;
    patchActive({ endAt, leftAt: null, seenAt: Date.now() });
    recorded.current = null;
    setActive({ minutes: rec.minutes, startedAt: rec.startedAt, endAt, ambient: rec.ambient, tag: rec.tag });
    setRecovery(null);
  };
  const endRecovered = () => {
    if (!recovery) return;
    const { rec } = recovery;
    const next = [...sessions, { id: String(rec.startedAt), startedAt: rec.startedAt, minutes: rec.minutes, success: false, tag: rec.tag }];
    setSessions(next);
    saveSessions(next);
    clearActive();
    track('session_fail', { minutes: rec.minutes, mode: modeOf(rec.tag), reason: 'app_closed' });
    setRecovery(null);
  };

  if (!fontsLoaded || !loaded) return <View style={styles.root} />;
  const showOnboarding = !settings.onboarded || help;
  const workers = settings.character ? [settings.character] : [];
  const needsCharacter = !showOnboarding && !settings.character;
  const accountInfo = { email: account.email, signedIn: !!userId };

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <SafeAreaView style={styles.root}>
          <StatusBar style="light" />
          {showOnboarding ? (
            <OnboardingScreen
              onFinish={finishOnboarding}
              onConsent={(kind, agreed, enabled) => {
                track('onboarding_consent', { kind, agreed });
                if (kind === 'screentime' && agreed) updateSettings({ screenTimeInterest: true, screenTimeBlock: !!enabled });
              }}
            />
          ) : needsCharacter || editingCharacter ? (
            <CharacterScreen
              initial={settings.character}
              mode={needsCharacter ? 'create' : 'edit'}
              onSave={saveCharacter}
              onCancel={needsCharacter ? undefined : () => setEditingCharacter(false)}
              onSignIn={() => askLogin('Sign in to keep your profile and friends.')}
            />
          ) : recovery ? (
            <CallPassPrompt awaySeconds={recovery.awaySeconds} onUse={resumeWithPass} onDecline={endRecovered} />
          ) : pending ? (
            <CountdownScreen
              minutes={pending.minutes}
              workers={workers}
              onCancel={() => {
                track('session_cancel', { minutes: pending.minutes });
                setPending(null);
              }}
              onGo={() => {
                if (pending.invitees.length > 0) {
                  startGroup(pending);
                } else {
                  track('session_start', { minutes: pending.minutes, mode: modeOf(pending.tag), ambient: pending.ambient });
                  startSession(pending);
                  setPending(null);
                }
              }}
            />
          ) : group && userId ? (
            <GroupFlow
              key={group.room.id}
              initial={group}
              myId={userId}
              ambient={settings.ambient}
              onRecord={recordGroup}
              onExit={() => {
                setGroup(null);
                setTab('town');
              }}
            />
          ) : active ? (
            <TimerScreen minutes={active.minutes} endAt={active.endAt} tag={active.tag} ambient={active.ambient} workers={workers} goal={settings.dailyGoal} todayBefore={todayBefore} onEnded={record} onDone={leaveResult} />
          ) : overlay?.type === 'settings' ? (
            <SettingsScreen
              settings={settings}
              onChange={updateSettings}
              onBack={() => setOverlay(null)}
              onReset={resetRecords}
              onShowHelp={() => {
                setOverlay(null);
                setHelp(true);
              }}
              account={accountInfo}
              onSignIn={() => askLogin('Sign in to keep your profile and friends.')}
              onSignOut={signOut}
              onDeleteAccount={async () => {
                const err = await deleteAccount();
                if (err) setNotice({ title: 'Could not delete account', text: err });
              }}
            />
          ) : overlay?.type === 'add' ? (
            <AddFriendsScreen
              social={account.social}
              initialQuery={overlay.query}
              onBack={() => setOverlay(null)}
              onChanged={account.refreshSocial}
            />
          ) : overlay?.type === 'follow' ? (
            <FollowListScreen social={account.social} initialTab={overlay.tab} onBack={() => setOverlay(null)} onChanged={account.refreshSocial} />
          ) : (
            <>
              {inviteBox.invite ? (
                <InviteBanner
                  invite={inviteBox.invite}
                  busy={joining}
                  onJoin={() => joinInvite(inviteBox.invite!.room_id)}
                  onDismiss={() => {
                    declineInvite(inviteBox.invite!.room_id);
                    inviteBox.dismiss(inviteBox.invite!.room_id);
                  }}
                />
              ) : null}
              <View style={styles.body}>
                {/* 탭 전환 시 다시 그리지 않도록 화면을 유지한 채 숨긴다 */}
                <View style={tab === 'setup' ? styles.body : styles.hidden}>
                  <SetupScreen
                    todayMinutes={todayBefore}
                    settings={settings}
                    onChange={updateSettings}
                    friends={account.friends}
                    invitees={invitees}
                    onInviteesChange={setInvitees}
                    onAddFriends={openAddFriends}
                    signedIn={!!userId}
                    onStart={(m, a, t) => setPending({ minutes: m, ambient: a, tag: t, invitees })}
                  />
                </View>
                <View style={tab === 'town' ? styles.body : styles.hidden}>
                  <TownScreen sessions={sessions} />
                </View>
                <View style={tab === 'stats' ? styles.body : styles.hidden}>
                  <StatsScreen sessions={sessions} goal={settings.dailyGoal} />
                </View>
                <View style={tab === 'me' ? styles.body : styles.hidden}>
                  <ProfileScreen
                    character={settings.character}
                    social={account.social}
                    hasAccount={!!userId}
                    sessions={sessions}
                    onEditCharacter={() => setEditingCharacter(true)}
                    onOpenSettings={() => setOverlay({ type: 'settings' })}
                    onAddFriends={openAddFriends}
                    onOpenFollow={(t) => setOverlay({ type: 'follow', tab: t })}
                    onSetupAccount={async () => {
                      if (await needAccount()) account.refreshSocial();
                    }}
                  />
                </View>
              </View>
              <TabBar tab={tab} onChange={setTab} />
            </>
          )}
          <ConfirmSheet visible={!!notice} title={notice?.title ?? ''} text={notice?.text ?? ''} confirmLabel="OK" cancelLabel={null} onConfirm={() => setNotice(null)} onCancel={() => setNotice(null)} />
          <AuthSheet visible={authOpen} reason={authReason} onClose={() => finishAuth(false)} onSignedIn={() => finishAuth(true)} />
        </SafeAreaView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  hidden: { display: 'none' },
});
