import { ReactNode, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { colors } from '../theme';
import Avatar from '../components/Avatar';
import { PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL } from '../config';
import { OptionSheet, Panel, Txt } from '../components/ui';
import { ensureNotificationPermission } from '../lib/notifications';
import { track } from '../lib/analytics';
import { Settings } from '../lib/settings';
import { setAmbientVolume } from '../lib/ambient';
import { VOLUME_VALUES, VolumeLevel } from '../lib/prefs';

type Props = {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onReset: () => void;
  onShowHelp: () => void;
  email: string | null; // 로그인한 이메일 (없으면 비로그인)
  onEditCharacter: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
};

export default function SettingsScreen({ settings, onChange, onReset, onShowHelp, email, onEditCharacter, onSignIn, onSignOut, onDeleteAccount }: Props) {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const open = (url: string) => Linking.openURL(url).catch(() => {});
  const sendFeedback = () =>
    open(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Focus Town feedback (v${version})`)}`);

  const [timeSheet, setTimeSheet] = useState(false);
  const hhmm = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  const toggleReminder = async () => {
    if (settings.reminderOn) {
      onChange({ reminderOn: false });
      track('reminder_changed', { enabled: false });
      return;
    }
    if (await ensureNotificationPermission()) {
      onChange({ reminderOn: true });
      track('reminder_changed', { enabled: true });
    } else {
      Alert.alert('Notifications are off', 'Turn on notifications for Focus Town in your phone settings to get daily reminders.');
    }
  };

  const confirmDelete = () =>
    Alert.alert('Delete your account?', 'Your account and profile will be permanently deleted. Records on this device stay until you reset them.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDeleteAccount },
    ]);

  const confirmReset = () =>
    Alert.alert('Reset all records?', 'Your town and stats will be erased. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: onReset },
    ]);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Txt style={styles.title}>SETTINGS</Txt>

      <Txt style={styles.section}>PROFILE</Txt>
      <Pressable onPress={onEditCharacter}>
        <Panel style={styles.profile}>
          {settings.character ? <Avatar character={settings.character} size={64} /> : null}
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Txt style={styles.profileName}>{settings.character?.name ?? '-'}</Txt>
            <Txt style={styles.note}>Edit character {'>'}</Txt>
          </View>
        </Panel>
      </Pressable>

      <Txt style={styles.section}>ACCOUNT</Txt>
      <Panel style={styles.links}>
        {email ? (
          <>
            <View style={styles.linkRow}>
              <Txt style={styles.rowLabel}>Signed in</Txt>
              <Txt style={[styles.note, { marginTop: 0 }]} numberOfLines={1}>{email}</Txt>
            </View>
            <LinkRow label="Sign out" onPress={onSignOut} />
            <LinkRow label="Delete account" onPress={confirmDelete} />
          </>
        ) : (
          <>
            <LinkRow label="Sign in with email" onPress={onSignIn} />
            <Txt style={[styles.note, { paddingBottom: 12 }]}>Sign in to play group sessions and keep your character on any device.</Txt>
          </>
        )}
      </Panel>

      <Txt style={styles.section}>GOAL & REMINDER</Txt>
      <Panel style={styles.group}>
        <View>
          <Txt style={styles.rowLabel}>Daily goal (minutes)</Txt>
          <View style={{ marginTop: 12, alignSelf: 'flex-start' }}>
            <Segment
              options={[['0', 'OFF'], ['30', '30'], ['60', '60'], ['90', '90'], ['120', '120']]}
              value={String(settings.dailyGoal)}
              onChange={(v) => onChange({ dailyGoal: Number(v) })}
            />
          </View>
        </View>
        <Row label="Daily reminder" note="A gentle nudge to start focusing.">
          <Toggle on={settings.reminderOn} onPress={toggleReminder} />
        </Row>
        {settings.reminderOn && <LinkRow label={`Reminder time  ${hhmm(settings.reminderHour, settings.reminderMinute)}`} onPress={() => setTimeSheet(true)} />}
      </Panel>
      <OptionSheet
        visible={timeSheet}
        title="REMINDER TIME"
        selected={settings.reminderHour}
        options={[7, 8, 9, 12, 15, 18, 19, 20, 21, 22].map((h) => ({ value: h, label: hhmm(h, 0) }))}
        onSelect={(h) => onChange({ reminderHour: h, reminderMinute: 0 })}
        onClose={() => setTimeSheet(false)}
      />

      <Txt style={styles.section}>SOUND</Txt>
      <Panel style={styles.group}>
        <Row label="Sound effects">
          <Toggle on={settings.sfx} onPress={() => onChange({ sfx: !settings.sfx })} />
        </Row>
        <Row label="Music volume">
          <Segment
            options={[['low', 'LOW'], ['mid', 'MID'], ['high', 'HIGH']]}
            value={settings.volume}
            onChange={(v) => {
              onChange({ volume: v as VolumeLevel });
              setAmbientVolume(VOLUME_VALUES[v as VolumeLevel]);
            }}
          />
        </Row>
      </Panel>

      <Txt style={styles.section}>FEEDBACK</Txt>
      <Panel style={styles.group}>
        <Row label="Vibration">
          <Toggle on={settings.haptics} onPress={() => onChange({ haptics: !settings.haptics })} />
        </Row>
        <Row label="Warning alerts" note="Notifies you when you leave the app.">
          <Toggle on={settings.notify} onPress={() => onChange({ notify: !settings.notify })} />
        </Row>
      </Panel>

      <Txt style={styles.section}>PRIVACY</Txt>
      <Panel style={styles.group}>
        <Row label="Share crash & usage data" note="Anonymous. Helps us fix bugs and improve the app.">
          <Toggle on={settings.analytics} onPress={() => onChange({ analytics: !settings.analytics })} />
        </Row>
      </Panel>

      <Txt style={styles.section}>HELP</Txt>
      <Panel style={styles.links}>
        <LinkRow label="How to play" onPress={onShowHelp} />
        {SUPPORT_EMAIL ? <LinkRow label="Send feedback" onPress={sendFeedback} /> : null}
        <LinkRow label="Privacy policy" onPress={() => open(PRIVACY_URL)} />
        <LinkRow label="Terms of service" onPress={() => open(TERMS_URL)} />
      </Panel>

      <Txt style={styles.section}>DATA</Txt>
      <Pressable onPress={confirmReset} style={styles.danger}>
        <Txt style={styles.dangerText}>RESET ALL RECORDS</Txt>
      </Pressable>

      <Txt style={styles.section}>ABOUT</Txt>
      <Panel style={styles.group}>
        <Txt style={styles.about}>FOCUS TOWN v{version}{'\n\n'}Lo-fi music: Open Lo-Fi collection (CC0, public domain).</Txt>
      </Panel>
    </ScrollView>
  );
}

function Row({ label, note, children }: { label: string; note?: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Txt style={styles.rowLabel}>{label}</Txt>
        {note ? <Txt style={styles.note}>{note}</Txt> : null}
      </View>
      {children}
    </View>
  );
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.linkRow}>
      <Txt style={styles.rowLabel}>{label}</Txt>
      <Txt style={styles.chev}>{'>'}</Txt>
    </Pressable>
  );
}

function Toggle({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.toggle, on && styles.toggleOn]}>
      <View style={[styles.knob, on && styles.knobOn]} />
    </Pressable>
  );
}

function Segment({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.seg}>
      {options.map(([v, label]) => (
        <Pressable key={v} onPress={() => onChange(v)} style={[styles.segItem, value === v && styles.segOn]}>
          <Txt style={[styles.segText, value === v && { color: colors.bg }]}>{label}</Txt>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingBottom: 40 },
  title: { color: colors.accent, fontSize: 16, marginTop: 8 },
  section: { color: colors.dim, fontSize: 9, marginTop: 26, marginBottom: 10 },
  group: { gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontSize: 9, lineHeight: 14 },
  note: { fontSize: 7, color: colors.dim, marginTop: 6, lineHeight: 12 },
  toggle: { width: 56, height: 28, backgroundColor: colors.bg, borderWidth: 3, borderColor: colors.line, padding: 2 },
  toggleOn: { backgroundColor: colors.accent },
  knob: { width: 18, height: 18, backgroundColor: colors.dim },
  knobOn: { backgroundColor: colors.text, marginLeft: 26 },
  seg: { flexDirection: 'row' },
  segItem: { paddingVertical: 8, paddingHorizontal: 8, backgroundColor: colors.bg, borderWidth: 3, borderColor: colors.line },
  segOn: { backgroundColor: colors.gold },
  segText: { fontSize: 7, color: colors.dim },
  profile: { flexDirection: 'row', alignItems: 'center' },
  profileName: { fontSize: 13 },
  links: { paddingVertical: 4 },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  chev: { color: colors.dim, fontSize: 10 },
  danger: { borderWidth: 3, borderColor: colors.danger, padding: 14, alignItems: 'center' },
  dangerText: { color: colors.danger, fontSize: 9 },
  about: { fontSize: 8, lineHeight: 14, color: colors.dim },
});
