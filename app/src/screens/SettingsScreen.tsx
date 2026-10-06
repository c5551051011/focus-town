import { Children, ReactNode, isValidElement, useState } from 'react';
import ConfirmSheet from '../components/ConfirmSheet';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { colors, soft } from '../theme';
import Icon from '../components/Icon';
import { Pixel } from '../components/Pixel';
import { OptionSheet, Sans } from '../components/ui';
import { ScreenHeader, SectionTitle } from '../components/cards';
import { PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL } from '../config';
import { Settings } from '../lib/settings';
import { setAmbientVolume } from '../lib/ambient';
import { VOLUME_VALUES, VolumeLevel } from '../lib/prefs';
import { IconName } from '../lib/iconAssets';
import { ensureNotificationPermission } from '../lib/notifications';
import { track } from '../lib/analytics';
import { blockedAppCount, pickBlockedApps, screenTimeAvailable, setupScreenTime } from '../lib/screenTime';

type Props = {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onBack: () => void;
  onReset: () => void;
  onShowHelp: () => void;
  account: { email: string | null; signedIn: boolean };
  onSignIn: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
};

const hhmm = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
const VOLUME_LABEL: Record<VolumeLevel, string> = { low: 'Low', mid: 'Medium', high: 'High' };

export default function SettingsScreen({ settings, onChange, onBack, onReset, onShowHelp, account, onSignIn, onSignOut, onDeleteAccount }: Props) {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const [sheet, setSheet] = useState<'goal' | 'volume' | 'time' | null>(null);
  const [confirm, setConfirm] = useState<'notif' | 'signout' | 'delete' | 'reset' | 'st_denied' | 'st_unavailable' | null>(null);
  const [blockedCount, setBlockedCount] = useState(() => blockedAppCount());
  const open = (url: string) => Linking.openURL(url).catch(() => {});

  const toggleReminder = async () => {
    if (settings.reminderOn) {
      onChange({ reminderOn: false });
      track('reminder_changed', { enabled: false });
    } else if (await ensureNotificationPermission()) {
      onChange({ reminderOn: true });
      track('reminder_changed', { enabled: true });
    } else {
      setConfirm('notif');
    }
  };

  // 집중 중 앱 잠금(iOS 스크린 타임)
  const lockAvailable = screenTimeAvailable();
  const toggleLock = async () => {
    if (settings.screenTimeBlock) return onChange({ screenTimeBlock: false });
    if (!lockAvailable) return setConfirm('st_unavailable');
    const r = await setupScreenTime();
    if (r.ok) {
      setBlockedCount(r.count);
      onChange({ screenTimeBlock: true });
    } else setConfirm(r.reason === 'denied' ? 'st_denied' : 'st_unavailable');
  };
  const chooseApps = async () => setBlockedCount(await pickBlockedApps());

  const confirmSignOut = () => setConfirm('signout');
  const confirmDelete = () => setConfirm('delete');
  const confirmReset = () => setConfirm('reset');
  const dialog = {
    notif: { title: 'Notifications are off', text: 'Turn on notifications for Focus Town in your phone settings to get daily reminders.', ok: 'OK', cancel: null, destructive: false, run: () => {} },
    signout: {
      title: 'Sign out?',
      text: 'You can sign in again anytime with your email. Friends and group sessions need you to be signed in.',
      ok: 'Sign out',
      cancel: 'Cancel',
      destructive: true,
      run: onSignOut,
    },
    delete: { title: 'Delete your account?', text: 'Your account, profile and friends will be permanently deleted. Records on this device stay until you reset them.', ok: 'Delete', cancel: 'Cancel', destructive: true, run: onDeleteAccount },
    st_denied: { title: 'Screen Time is off', text: "Allow Screen Time for Focus Town in your phone's Settings to lock apps while you focus.", ok: 'Open settings', cancel: 'Not now', destructive: false, run: () => Linking.openSettings().catch(() => {}) },
    st_unavailable: {
      title: Platform.OS === 'ios' ? 'Not available yet' : 'Coming to Android',
      text: Platform.OS === 'ios' ? "Locking apps needs Apple's approval for Screen Time, which this version doesn't have yet. It will switch on in a future update." : 'Locking apps while you focus is iPhone-only for now.',
      ok: 'OK',
      cancel: null,
      destructive: false,
      run: () => {},
    },
    reset: { title: 'Reset all records?', text: 'Your town and stats will be erased. This cannot be undone.', ok: 'Reset', cancel: 'Cancel', destructive: true, run: onReset },
  };
  const d = confirm ? dialog[confirm] : null;

  return (
    <View style={styles.wrap}>
      <ScreenHeader title="SETTINGS" onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <SectionTitle>Daily focus</SectionTitle>
        <Card>
          <Row icon="target" tint="#f1fa8c" label="Daily goal" value={settings.dailyGoal ? `${settings.dailyGoal} min` : 'Off'} onPress={() => setSheet('goal')} />
          <Row icon="bell" tint="#ff79c6" label="Daily reminder" note="A gentle nudge to start focusing." right={<Switch on={settings.reminderOn} onPress={toggleReminder} />} />
          {settings.reminderOn && <Row sub label="Reminder time" value={hhmm(settings.reminderHour, settings.reminderMinute)} onPress={() => setSheet('time')} />}
        </Card>

        <SectionTitle>Focus lock</SectionTitle>
        <Card>
          <Row
            icon="shield"
            tint="#8be9fd"
            label="Block distracting apps"
            note={lockAvailable ? 'Locks the apps you pick while you focus.' : 'iPhone only for now.'}
            right={<Switch on={settings.screenTimeBlock && lockAvailable} onPress={toggleLock} />}
          />
          {settings.screenTimeBlock && lockAvailable && <Row sub label="Apps to block" value={`${blockedCount} selected`} onPress={chooseApps} />}
        </Card>

        <SectionTitle>Sound & feel</SectionTitle>
        <Card>
          <Row icon="speaker_on" tint="#8be9fd" label="Sound effects" right={<Switch on={settings.sfx} onPress={() => onChange({ sfx: !settings.sfx })} />} />
          <Row sub label="Music volume" value={VOLUME_LABEL[settings.volume]} onPress={() => setSheet('volume')} />
          <Row icon="gear" tint="#bd93f9" label="Vibration" right={<Switch on={settings.haptics} onPress={() => onChange({ haptics: !settings.haptics })} />} />
          <Row
            icon="target"
            tint="#8be9fd"
            label="Progress card"
            note="Countdown on your lock screen."
            right={<Switch on={settings.liveProgress} onPress={() => onChange({ liveProgress: !settings.liveProgress })} />}
          />
          <Row icon="bell" tint="#ffb86c" label="Away alerts" note="Warns you when you leave the app." right={<Switch on={settings.notify} onPress={() => onChange({ notify: !settings.notify })} />} />
        </Card>

        <SectionTitle>Account</SectionTitle>
        <Card>
          <Row
            icon="user"
            tint="#7ee787"
            label={account.signedIn ? 'Signed in' : 'Not signed in'}
            value={account.email ?? undefined}
            note={account.signedIn ? undefined : 'Sign in to add friends and play together.'}
          />
          {!account.signedIn && <Row sub label="Sign in with email" link onPress={onSignIn} />}
          {account.signedIn && <Row sub label="Sign out" link onPress={confirmSignOut} />}
          {account.signedIn && <Row sub label="Delete account" link danger onPress={confirmDelete} />}
        </Card>

        <SectionTitle>Privacy & help</SectionTitle>
        <Card>
          <Row icon="shield" tint="#8be9fd" label="Share crash & usage data" note="Anonymous. Helps us fix bugs." right={<Switch on={settings.analytics} onPress={() => onChange({ analytics: !settings.analytics })} />} />
          <Row icon="help" tint="#f8f8f2" label="How to play" onPress={onShowHelp} chevron />
          {SUPPORT_EMAIL ? <Row sub label="Send feedback" link onPress={() => open(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Focus Town feedback (v${version})`)}`)} /> : null}
          <Row sub label="Privacy policy" link onPress={() => open(PRIVACY_URL)} />
          <Row sub label="Terms of service" link onPress={() => open(TERMS_URL)} />
        </Card>

        <Pressable onPress={confirmReset} style={styles.reset}>
          <Sans style={styles.resetText}>Reset all records</Sans>
        </Pressable>

        <Sans style={styles.about}>Focus Town v{version}</Sans>
        <Sans style={styles.about}>Lo-fi music: Open Lo-Fi (CC0)</Sans>
      </ScrollView>

      <OptionSheet
        visible={sheet === 'goal'}
        title="DAILY GOAL"
        selected={settings.dailyGoal}
        options={[0, 30, 60, 90, 120].map((v) => ({ value: v, label: v ? `${v} min` : 'Off' }))}
        onSelect={(v) => onChange({ dailyGoal: v })}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'volume'}
        title="MUSIC VOLUME"
        selected={settings.volume}
        options={(['low', 'mid', 'high'] as VolumeLevel[]).map((v) => ({ value: v, label: VOLUME_LABEL[v] }))}
        onSelect={(v) => {
          onChange({ volume: v });
          setAmbientVolume(VOLUME_VALUES[v]);
        }}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'time'}
        title="REMINDER TIME"
        selected={settings.reminderHour}
        options={[7, 8, 9, 12, 15, 18, 19, 20, 21, 22].map((h) => ({ value: h, label: hhmm(h, 0) }))}
        onSelect={(h) => onChange({ reminderHour: h, reminderMinute: 0 })}
        onClose={() => setSheet(null)}
      />
      <ConfirmSheet
        visible={!!d}
        title={d?.title ?? ''}
        text={d?.text ?? ''}
        confirmLabel={d?.ok ?? 'OK'}
        cancelLabel={d ? d.cancel : 'Cancel'}
        destructive={d?.destructive}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const run = d?.run;
          setConfirm(null);
          run?.();
        }}
      />
    </View>
  );
}

// ── 구성 요소 ──

// 둥근 카드 안에 줄을 모으고, 줄 사이에 얇은 구분선을 넣는다
function Card({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={styles.card}>
      {rows.map((r, i) => (
        <View key={i}>
          {i > 0 ? <View style={styles.divider} /> : null}
          {r}
        </View>
      ))}
    </View>
  );
}

function Row({
  icon,
  tint,
  label,
  note,
  value,
  right,
  sub,
  link,
  danger,
  chevron,
  onPress,
}: {
  icon?: IconName | 'speaker_on';
  tint?: string;
  label: string;
  note?: string;
  value?: string;
  right?: ReactNode;
  sub?: boolean; // 위 줄에 딸린 세부 항목 (아이콘 없이 들여쓰기)
  link?: boolean;
  danger?: boolean;
  chevron?: boolean;
  onPress?: () => void;
}) {
  const showChevron = !right && (chevron || (onPress && !link) || (onPress && link && !danger));
  const body = (
    <View style={styles.row}>
      <View style={styles.iconSlot}>
        {icon ? (
          <View style={[styles.iconBox, { backgroundColor: `${tint ?? '#ffffff'}2b` }]}>
            {icon === 'speaker_on' ? <Pixel name="speaker_on" size={20} style={{ tintColor: tint }} /> : <Icon name={icon} size={20} color={tint} />}
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Sans style={[styles.label, sub && { color: link ? colors.accent : soft.subtle, fontWeight: '600', fontSize: 15 }, danger && { color: colors.danger }]}>{label}</Sans>
        {note ? <Sans style={styles.note}>{note}</Sans> : null}
      </View>
      {right ?? (value ? <Sans style={styles.value} numberOfLines={1}>{value}</Sans> : null)}
      {showChevron ? <Sans style={styles.chev}>›</Sans> : null}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { backgroundColor: '#322e52' }}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

function Switch({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.switch, on && styles.switchOn]} hitSlop={8}>
      <View style={[styles.knob, on && styles.knobOn]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  card: { backgroundColor: soft.card, borderRadius: 16, overflow: 'hidden' },
  divider: { height: 1, backgroundColor: soft.line, marginLeft: 66 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingVertical: 12, paddingRight: 16 },
  iconSlot: { width: 66, alignItems: 'center' },
  iconBox: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16, fontWeight: '600' },
  note: { color: soft.subtle, fontSize: 12, lineHeight: 17, marginTop: 4 },
  value: { color: colors.gold, fontSize: 15, fontWeight: '600', maxWidth: 170 },
  chev: { color: soft.subtle, fontSize: 24, marginLeft: 8, lineHeight: 26 },
  switch: { width: 52, height: 30, borderRadius: 15, backgroundColor: '#1b1930', padding: 3, justifyContent: 'center' },
  switchOn: { backgroundColor: colors.accent },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: soft.subtle },
  knobOn: { backgroundColor: colors.bg, marginLeft: 22 },
  reset: { alignSelf: 'center', marginTop: 30, paddingVertical: 12, paddingHorizontal: 22, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,85,85,0.5)' },
  resetText: { color: colors.danger, fontSize: 14, fontWeight: '700' },
  about: { color: soft.subtle, fontSize: 12, textAlign: 'center', marginTop: 14 },
});
