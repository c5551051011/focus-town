import { ReactNode, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { colors } from '../theme';
import Icon from '../components/Icon';
import { Pixel } from '../components/Pixel';
import { OptionSheet, Txt } from '../components/ui';
import { PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL } from '../config';
import { Settings } from '../lib/settings';
import { setAmbientVolume } from '../lib/ambient';
import { VOLUME_VALUES, VolumeLevel } from '../lib/prefs';
import { IconName } from '../lib/iconAssets';
import { ensureNotificationPermission } from '../lib/notifications';
import { track } from '../lib/analytics';

type Props = {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onBack: () => void;
  onReset: () => void;
  onShowHelp: () => void;
  account: { email: string | null; guest: boolean; signedIn: boolean };
  onSignIn: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
};

const hhmm = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
const VOLUME_LABEL: Record<VolumeLevel, string> = { low: 'Low', mid: 'Medium', high: 'High' };

export default function SettingsScreen({ settings, onChange, onBack, onReset, onShowHelp, account, onSignIn, onSignOut, onDeleteAccount }: Props) {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const [sheet, setSheet] = useState<'goal' | 'volume' | 'time' | null>(null);
  const open = (url: string) => Linking.openURL(url).catch(() => {});

  const toggleReminder = async () => {
    if (settings.reminderOn) {
      onChange({ reminderOn: false });
      track('reminder_changed', { enabled: false });
    } else if (await ensureNotificationPermission()) {
      onChange({ reminderOn: true });
      track('reminder_changed', { enabled: true });
    } else {
      Alert.alert('Notifications are off', 'Turn on notifications for Focus Town in your phone settings to get daily reminders.');
    }
  };

  const confirmSignOut = () =>
    Alert.alert(
      account.guest ? 'Sign out of guest account?' : 'Sign out?',
      account.guest ? 'A guest account lives only on this device. If you sign out, you will lose your friends and group access for good.' : 'You can sign in again anytime with your email.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: onSignOut }],
    );
  const confirmDelete = () =>
    Alert.alert('Delete your account?', 'Your account, profile and friends will be permanently deleted. Records on this device stay until you reset them.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDeleteAccount },
    ]);
  const confirmReset = () =>
    Alert.alert('Reset all records?', 'Your town and stats will be erased. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: onReset },
    ]);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Txt style={styles.back} onPress={onBack}>
          {'< BACK'}
        </Txt>
        <Txt style={styles.title}>SETTINGS</Txt>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Section title="Daily focus">
          <Item icon="target" tint="#f1fa8c" label="Daily goal" value={settings.dailyGoal ? `${settings.dailyGoal} min` : 'Off'} onPress={() => setSheet('goal')} />
          <Item icon="bell" tint="#ff79c6" label="Daily reminder" right={<Switch on={settings.reminderOn} onPress={toggleReminder} />} />
          {settings.reminderOn && <Item label="Reminder time" indent value={hhmm(settings.reminderHour, settings.reminderMinute)} onPress={() => setSheet('time')} />}
        </Section>

        <Section title="Sound & feel">
          <Item icon="speaker_on" tint="#8be9fd" label="Sound effects" right={<Switch on={settings.sfx} onPress={() => onChange({ sfx: !settings.sfx })} />} />
          <Item label="Music volume" indent value={VOLUME_LABEL[settings.volume]} onPress={() => setSheet('volume')} />
          <Item icon="gear" tint="#bd93f9" label="Vibration" right={<Switch on={settings.haptics} onPress={() => onChange({ haptics: !settings.haptics })} />} />
          <Item
            icon="target"
            tint="#8be9fd"
            label="Progress card"
            note="Shows the countdown outside the app (lock screen or notification shade)."
            right={<Switch on={settings.liveProgress} onPress={() => onChange({ liveProgress: !settings.liveProgress })} />}
          />
          <Item
            icon="bell"
            tint="#ffb86c"
            label="Away alerts"
            note="Warns you when you leave the app during a session."
            right={<Switch on={settings.notify} onPress={() => onChange({ notify: !settings.notify })} />}
          />
        </Section>

        <Section title="Account">
          <Item icon="user" tint="#7ee787" label={account.signedIn ? (account.guest ? 'Guest account' : 'Signed in') : 'Not set up'} value={account.email ?? undefined} note={account.guest ? 'Lives on this device only.' : undefined} />
          {!account.email && <Item label="Sign in with email" indent link onPress={onSignIn} />}
          {account.signedIn && <Item label="Sign out" indent link onPress={confirmSignOut} />}
          {account.signedIn && <Item label="Delete account" indent link danger onPress={confirmDelete} />}
        </Section>

        <Section title="Privacy & help">
          <Item icon="shield" tint="#8be9fd" label="Share crash & usage data" note="Anonymous. Helps us fix bugs." right={<Switch on={settings.analytics} onPress={() => onChange({ analytics: !settings.analytics })} />} />
          <Item icon="help" tint="#f8f8f2" label="How to play" link onPress={onShowHelp} />
          {SUPPORT_EMAIL ? <Item label="Send feedback" indent link onPress={() => open(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Focus Town feedback (v${version})`)}`)} /> : null}
          <Item label="Privacy policy" indent link onPress={() => open(PRIVACY_URL)} />
          <Item label="Terms of service" indent link onPress={() => open(TERMS_URL)} />
        </Section>

        <Pressable onPress={confirmReset} style={styles.reset}>
          <Txt style={styles.resetText}>Reset all records</Txt>
        </Pressable>

        <Txt style={styles.about}>FOCUS TOWN v{version}{'\n'}Lo-fi music: Open Lo-Fi (CC0)</Txt>
      </ScrollView>

      <OptionSheet
        visible={sheet === 'goal'}
        title="DAILY GOAL"
        selected={settings.dailyGoal}
        options={[0, 30, 60, 90, 120].map((v) => ({ value: v, label: v ? `${v} MIN` : 'OFF' }))}
        onSelect={(v) => onChange({ dailyGoal: v })}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'volume'}
        title="MUSIC VOLUME"
        selected={settings.volume}
        options={(['low', 'mid', 'high'] as VolumeLevel[]).map((v) => ({ value: v, label: VOLUME_LABEL[v].toUpperCase() }))}
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
    </View>
  );
}

// ── 구성 요소 ──

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Txt style={styles.sectionTitle}>{title.toUpperCase()}</Txt>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

// 한 줄: [아이콘] 이름(+설명) ··· 값 / 스위치 / >
function Item({
  icon,
  tint,
  label,
  note,
  value,
  right,
  indent,
  link,
  danger,
  onPress,
}: {
  icon?: IconName | 'speaker_on';
  tint?: string;
  label: string;
  note?: string;
  value?: string;
  right?: ReactNode;
  indent?: boolean;
  link?: boolean;
  danger?: boolean;
  onPress?: () => void;
}) {
  const body = (
    <View style={styles.item}>
      <View style={styles.iconSlot}>{icon ? <ItemIcon name={icon} tint={tint} /> : null}</View>
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Txt style={[styles.label, indent && !icon && { color: colors.text }, danger && { color: colors.danger }]}>{label}</Txt>
        {note ? <Txt style={styles.note}>{note}</Txt> : null}
      </View>
      {right ?? (value ? <Txt style={styles.value} numberOfLines={1}>{value}</Txt> : null)}
      {!right && (onPress || link) ? <Txt style={styles.chev}>{'>'}</Txt> : null}
    </View>
  );
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => pressed && { backgroundColor: '#332f4d' }}>{body}</Pressable> : body;
}

function ItemIcon({ name, tint }: { name: IconName | 'speaker_on'; tint?: string }) {
  // speaker_on 은 다른 스프라이트 묶음에 있어서 Pixel 컴포넌트를 쓴다
  if (name === 'speaker_on') return <Pixel name="speaker_on" size={22} style={{ tintColor: tint }} />;
  return <Icon name={name} size={22} color={tint} />;
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 3, borderBottomColor: colors.panel },
  back: { color: colors.dim, fontSize: 10, width: 60 },
  title: { color: colors.accent, fontSize: 14 },
  scroll: { padding: 16, paddingBottom: 48 },
  section: { marginBottom: 26 },
  sectionTitle: { color: colors.dim, fontSize: 9, marginBottom: 10, marginLeft: 4 },
  group: { backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.line },
  item: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingVertical: 12, paddingRight: 14, borderBottomWidth: 2, borderBottomColor: colors.bg },
  iconSlot: { width: 52, alignItems: 'center' },
  label: { fontSize: 11, lineHeight: 17 },
  note: { color: colors.dim, fontSize: 8, lineHeight: 13, marginTop: 6 },
  value: { color: colors.gold, fontSize: 10, maxWidth: 160 },
  chev: { color: colors.dim, fontSize: 12, marginLeft: 10 },
  switch: { width: 52, height: 28, backgroundColor: colors.bg, borderWidth: 3, borderColor: colors.line, padding: 2 },
  switchOn: { backgroundColor: colors.accent },
  knob: { width: 16, height: 16, backgroundColor: colors.dim },
  knobOn: { backgroundColor: colors.text, marginLeft: 24 },
  reset: { alignSelf: 'center', paddingVertical: 14, paddingHorizontal: 20 },
  resetText: { color: colors.danger, fontSize: 10 },
  about: { color: colors.dim, fontSize: 8, lineHeight: 15, textAlign: 'center', marginTop: 10 },
});
