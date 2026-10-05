import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { Pixel } from '../components/Pixel';
import TimeWheel from '../components/TimeWheel';
import SoundSheet from '../components/SoundSheet';
import TagSheet from '../components/TagSheet';
import { Pill, PixelButton, Txt } from '../components/ui';
import { PRESET_TAGS, tagColor } from '../lib/tags';
import { TIME_VALUES, buildingFor } from '../lib/buildings';
import { AmbientId, ambientLabel } from '../lib/ambient';
import { Settings } from '../lib/settings';
import { requestNotificationPermission } from '../lib/notifications';

type Props = {
  todayMinutes: number;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onStart: (minutes: number, ambient: AmbientId, tag: string) => void;
};

export default function SetupScreen({ todayMinutes, settings, onChange: update, onStart }: Props) {
  const [soundSheet, setSoundSheet] = useState(false);
  const [tagSheet, setTagSheet] = useState(false);
  const [dialOpen, setDialOpen] = useState(false);
  const { minutes, ambient, tag, customTags } = settings;
  const b = buildingFor(minutes);

  const start = async () => {
    await requestNotificationPermission();
    onStart(minutes, ambient, tag);
  };

  return (
    <View style={styles.wrap}>
      <Txt style={styles.logo}>FOCUS TOWN</Txt>

      {settings.dailyGoal > 0 && (
        <View style={styles.goalWrap}>
          <Txt style={styles.goalText}>
            TODAY {Math.min(todayMinutes, settings.dailyGoal)}/{settings.dailyGoal} MIN{todayMinutes >= settings.dailyGoal ? ' - DONE!' : ''}
          </Txt>
          <View style={styles.goalTrack}>
            <View style={[styles.goalFill, { width: `${Math.min(1, todayMinutes / settings.dailyGoal) * 100}%` }, todayMinutes >= settings.dailyGoal && { backgroundColor: colors.gold }]} />
          </View>
        </View>
      )}

      <View style={styles.preview}>
        <Pixel name={b.id} size={150} />
        <Txt style={styles.name}>{b.name}</Txt>
      </View>

      <Pressable onPress={() => setDialOpen(true)} style={styles.timeBox}>
        <Txt style={styles.time}>{minutes}:00</Txt>
        <Txt style={styles.tap}>TAP TO CHANGE</Txt>
      </Pressable>

      <View style={styles.pills}>
        {[...PRESET_TAGS, ...customTags].map((t) => (
          <Pill key={t} label={t} color={tagColor(t)} on={t === tag} onPress={() => update({ tag: t })} />
        ))}
        <Pill label="+" color={colors.dim} on={false} onPress={() => setTagSheet(true)} />
      </View>

      <Pressable onPress={() => setSoundSheet(true)} style={styles.soundRow}>
        <Txt style={styles.soundLabel}>SOUND</Txt>
        <Txt style={styles.soundValue}>{ambientLabel(ambient)} {'>'}</Txt>
      </Pressable>

      <PixelButton label="START" onPress={start} style={styles.start} />

      {/* 시간을 탭하면 열리는 다이얼 */}
      <Modal visible={dialOpen} transparent animationType="fade" onRequestClose={() => setDialOpen(false)}>
        <View style={styles.dialBackdrop}>
          <View style={styles.dialBox}>
            <Txt style={styles.dialTitle}>FOCUS TIME</Txt>
            <Pixel name={b.id} size={150} style={{ alignSelf: 'center' }} />
            <Txt style={styles.dialName}>{b.name}</Txt>
            <TimeWheel values={TIME_VALUES} value={minutes} onChange={(m) => update({ minutes: m })} />
            <PixelButton label="DONE" onPress={() => setDialOpen(false)} style={{ marginTop: 20, alignSelf: 'stretch' }} />
          </View>
        </View>
      </Modal>

      <TagSheet
        visible={tagSheet}
        customTags={customTags}
        onAdd={(t) => update({ customTags: [...customTags, t], tag: t })}
        onRemove={(t) => update({ customTags: customTags.filter((x) => x !== t), tag: tag === t ? PRESET_TAGS[0] : tag })}
        onClose={() => setTagSheet(false)}
      />

      <SoundSheet
        visible={soundSheet}
        selected={ambient}
        onSelect={(id) => update({ ambient: id })}
        onClose={() => setSoundSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, justifyContent: 'center' },
  logo: { color: colors.accent, fontSize: 16, textAlign: 'center' },
  goalWrap: { marginTop: 14, alignItems: 'center' },
  goalText: { color: colors.dim, fontSize: 8 },
  goalTrack: { width: 180, height: 10, marginTop: 8, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.line },
  goalFill: { height: '100%', backgroundColor: colors.accent },
  preview: { alignItems: 'center', marginTop: 24, marginBottom: 12 },
  name: { fontSize: 9, color: colors.dim, marginTop: 12, textAlign: 'center' },
  timeBox: { alignItems: 'center', paddingVertical: 12 },
  time: { fontSize: 44, color: colors.gold },
  tap: { fontSize: 7, color: colors.dim, marginTop: 10 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8, marginBottom: 14 },
  soundRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, borderTopWidth: 2, borderBottomWidth: 2, borderColor: colors.panel, marginTop: 8 },
  soundLabel: { fontSize: 9, color: colors.dim },
  soundValue: { fontSize: 9 },
  start: { marginTop: 20 },
  dialBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  dialBox: { backgroundColor: colors.bg, borderWidth: 3, borderColor: colors.line, padding: 20 },
  dialName: { fontSize: 12, color: colors.text, textAlign: 'center', marginTop: 16, marginBottom: 18 },
  dialTitle: { color: colors.accent, fontSize: 12, textAlign: 'center', marginBottom: 14 },
});
