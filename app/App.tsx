import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
import { EndReason } from './src/lib/useFocusSession';
import ErrorBoundary from './src/components/ErrorBoundary';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { loadSessions, saveSessions } from './src/lib/storage';
import { DEFAULT_SETTINGS, Settings, applyPrefs, loadSettings, saveSettings } from './src/lib/settings';
import { TIME_VALUES } from './src/lib/buildings';
import SettingsScreen from './src/screens/SettingsScreen';
import TownScreen from './src/screens/TownScreen';
import SetupScreen from './src/screens/SetupScreen';
import TimerScreen from './src/screens/TimerScreen';
import StatsScreen from './src/screens/StatsScreen';
import CountdownScreen from './src/screens/CountdownScreen';

initErrorReporting();

const modeOf = (tag: string) => (PRESET_TAGS.includes(tag) ? tag : 'custom'); // 직접 만든 모드 이름은 분석에 보내지 않는다

type Tab = 'setup' | 'town' | 'stats' | 'settings';
const TABS: { id: Tab; label: string }[] = [
  { id: 'setup', label: 'FOCUS' },
  { id: 'town', label: 'TOWN' },
  { id: 'stats', label: 'STATS' },
  { id: 'settings', label: 'SET' },
];

export default function App() {
  const [fontsLoaded] = useFonts({ PressStart2P_400Regular });
  const [tab, setTab] = useState<Tab>('setup');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pending, setPending] = useState<{ minutes: number; ambient: AmbientId; tag: string } | null>(null);
  const [active, setActive] = useState<{ minutes: number; startedAt: number; ambient: AmbientId; tag: string } | null>(null);

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [help, setHelp] = useState(false); // 설정에서 다시 연 "How to play"

  useEffect(() => {
    loadSessions().then(setSessions);
    Promise.all([loadSettings(), initAnalytics()]).then(([s]) => {
      const fixed = TIME_VALUES.includes(s.minutes) ? s : { ...s, minutes: 25 };
      applyPrefs(fixed);
      setSettings(fixed);
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

  const updateSettings = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    applyPrefs(next);
    setSettings(next);
    saveSettings(next);
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

  const todayBefore = computeStats(sessions).todayMinutes;

  const finish = (success: boolean, reason: EndReason) => {
    if (!active) return;
    track(success ? 'session_complete' : 'session_fail', { minutes: active.minutes, mode: modeOf(active.tag), reason });
    if (success && settings.dailyGoal > 0 && todayBefore < settings.dailyGoal && todayBefore + active.minutes >= settings.dailyGoal) track('goal_reached', { goal: settings.dailyGoal });
    const next = [...sessions, { id: String(active.startedAt), startedAt: active.startedAt, minutes: active.minutes, success, tag: active.tag }];
    setSessions(next);
    saveSessions(next);
    setActive(null);
    setTab('town');
  };

  if (!fontsLoaded || !loaded) return <View style={styles.root} />;
  const showOnboarding = !settings.onboarded || help;

  return (
    <ErrorBoundary>
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        {showOnboarding ? (
          <OnboardingScreen onFinish={finishOnboarding} />
        ) : pending ? (
          <CountdownScreen
            minutes={pending.minutes}
            onCancel={() => {
              track('session_cancel', { minutes: pending.minutes });
              setPending(null);
            }}
            onGo={() => {
              track('session_start', { minutes: pending.minutes, mode: modeOf(pending.tag), ambient: pending.ambient });
              setActive({ ...pending, startedAt: Date.now() });
              setPending(null);
            }}
          />
        ) : active ? (
          <TimerScreen minutes={active.minutes} ambient={active.ambient} goal={settings.dailyGoal} todayBefore={todayBefore} onDone={finish} />
        ) : (
          <>
            <View style={styles.body}>
              {/* 탭 전환 시 다시 그리지 않도록 화면을 유지한 채 숨긴다 */}
              <View style={tab === 'setup' ? styles.body : styles.hidden}>
                <SetupScreen todayMinutes={todayBefore} settings={settings} onChange={updateSettings} onStart={(m, a, t) => setPending({ minutes: m, ambient: a, tag: t })} />
              </View>
              <View style={tab === 'town' ? styles.body : styles.hidden}>
                <TownScreen sessions={sessions} />
              </View>
              <View style={tab === 'stats' ? styles.body : styles.hidden}>
                <StatsScreen sessions={sessions} goal={settings.dailyGoal} />
              </View>
              <View style={tab === 'settings' ? styles.body : styles.hidden}>
                <SettingsScreen settings={settings} onChange={updateSettings} onReset={resetRecords} onShowHelp={() => setHelp(true)} />
              </View>
            </View>
            <View style={styles.tabs}>
              {TABS.map((t) => (
                <Pressable key={t.id} style={[styles.tab, tab === t.id && styles.tabOn]} onPress={() => setTab(t.id)}>
                  <Txt style={[styles.tabText, tab === t.id && { color: colors.accent }]}>{t.label}</Txt>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  hidden: { display: 'none' },
  tabs: { flexDirection: 'row', backgroundColor: colors.panel, borderTopWidth: 3, borderTopColor: colors.line },
  tab: { flex: 1, paddingVertical: 18, alignItems: 'center', borderTopWidth: 4, borderTopColor: 'transparent' },
  tabOn: { borderTopColor: colors.accent },
  tabText: { fontSize: 10, color: colors.dim },
});
