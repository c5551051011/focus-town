import { ReactNode, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, soft } from '../theme';
import { Pixel } from '../components/Pixel';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import TimeWheel from '../components/TimeWheel';
import SoundSheet from '../components/SoundSheet';
import TagSheet from '../components/TagSheet';
import FriendPicker from '../components/FriendPicker';
import { Pill, PixelButton, Sans, Txt } from '../components/ui';
import { TIME_VALUES, buildingFor } from '../lib/buildings';
import { AmbientId, ambientLabel } from '../lib/ambient';
import { Settings } from '../lib/settings';
import { requestNotificationPermission } from '../lib/notifications';
import { PRESET_TAGS, tagColor } from '../lib/tags';
import { Person } from '../lib/social';

type Props = {
  todayMinutes: number;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  friends: Person[]; // 서로 팔로우하는 친구
  invitees: string[]; // 이번 세션에 초대할 친구 id
  onInviteesChange: (ids: string[]) => void;
  onAddFriends: () => void;
  onStart: (minutes: number, ambient: AmbientId, tag: string) => void;
};

// 첫 화면: 건물 하나, 시간 하나, 선택 칩 세 개, 시작 버튼 하나. 세부 설정은 칩을 눌렀을 때만 나온다.
export default function SetupScreen({ todayMinutes, settings, onChange: update, friends, invitees, onInviteesChange, onAddFriends, onStart }: Props) {
  const [sheet, setSheet] = useState<'time' | 'newMode' | 'sound' | 'friends' | null>(null);
  const { minutes, ambient, tag, customTags, dailyGoal } = settings;
  const b = buildingFor(minutes);
  const invited = friends.filter((f) => invitees.includes(f.id));

  const start = async () => {
    await requestNotificationPermission();
    onStart(minutes, ambient, tag);
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.top}>
        <Txt style={styles.logo}>FOCUS TOWN</Txt>
        {dailyGoal > 0 ? (
          <View style={styles.goalPill}>
            <View style={styles.goalTrack}>
              <View style={[styles.goalFill, { width: `${Math.min(1, todayMinutes / dailyGoal) * 100}%` }, todayMinutes >= dailyGoal && { backgroundColor: colors.gold }]} />
            </View>
            <Sans style={[styles.goalText, todayMinutes >= dailyGoal && { color: colors.gold }]}>
              {Math.min(todayMinutes, dailyGoal)}/{dailyGoal} min today
            </Sans>
          </View>
        ) : null}
      </View>

      <View style={styles.center}>
        {/* 건물 미리보기: 둥근 받침 위에 올려 둔다 */}
        <View style={styles.plate}>
          <Pixel name={b.id} size={150} />
        </View>
        <Sans style={styles.name}>{b.name}</Sans>

        {/* 시간: 눌러서 바꾸는 둥근 버튼 */}
        <Pressable onPress={() => setSheet('time')} style={({ pressed }) => [styles.timeBox, pressed && { opacity: 0.85 }]}>
          <Txt style={styles.time}>{minutes}:00</Txt>
          <Sans style={styles.timeHint}>tap to change</Sans>
        </Pressable>

        {/* 집중 모드: 색이 다른 알약 버튼 */}
        <View style={styles.pills}>
          {[...PRESET_TAGS, ...customTags].map((t) => (
            <Pill key={t} label={t} color={tagColor(t)} on={t === tag} onPress={() => update({ tag: t })} />
          ))}
          <Pill label="+" color={colors.dim} on={false} onPress={() => setSheet('newMode')} />
        </View>

        <View style={styles.chips}>
          <Chip onPress={() => setSheet('sound')} icon={<Pixel name="speaker_on" size={20} style={{ tintColor: soft.subtle }} />} label={ambient === 'off' ? 'Sound off' : ambientLabel(ambient)} />
          <Chip
            onPress={() => setSheet('friends')}
            icon={invited.length ? null : <Icon name="user" size={18} color={soft.subtle} />}
            label={invited.length ? '' : 'Friends'}
            extra={invited.map((f) => <Avatar key={f.id} character={f} size={22} />)}
          />
        </View>
      </View>

      <Pressable onPress={start} style={({ pressed }) => [styles.start, pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }]}>
        <Txt style={styles.startText}>{invited.length ? `START WITH ${invited.length}` : 'START'}</Txt>
      </Pressable>

      {/* 시간을 탭하면 열리는 휠 */}
      <Modal visible={sheet === 'time'} transparent animationType="fade" onRequestClose={() => setSheet(null)}>
        <View style={styles.dialBackdrop}>
          <View style={styles.dialBox}>
            <Txt style={styles.dialTitle}>FOCUS TIME</Txt>
            <Pixel name={b.id} size={150} style={{ alignSelf: 'center' }} />
            <Txt style={styles.dialName}>{b.name}</Txt>
            <TimeWheel values={TIME_VALUES} value={minutes} onChange={(m) => update({ minutes: m })} />
            <PixelButton label="DONE" onPress={() => setSheet(null)} style={{ marginTop: 20, alignSelf: 'stretch' }} />
          </View>
        </View>
      </Modal>

      <TagSheet
        visible={sheet === 'newMode'}
        customTags={customTags}
        onAdd={(t) => update({ customTags: [...customTags, t], tag: t })}
        onRemove={(t) => update({ customTags: customTags.filter((x) => x !== t), tag: tag === t ? PRESET_TAGS[0] : tag })}
        onClose={() => setSheet(null)}
      />
      <FriendPicker
        visible={sheet === 'friends'}
        friends={friends}
        selected={invitees}
        onChange={onInviteesChange}
        onAddFriends={() => {
          setSheet(null);
          onAddFriends();
        }}
        onClose={() => setSheet(null)}
      />
      <SoundSheet visible={sheet === 'sound'} tag={tag} selected={ambient} onSelect={(id) => update({ ambient: id })} onClose={() => setSheet(null)} />
    </ScrollView>
  );
}

// 작은 선택 칩: [아이콘] 이름
function Chip({ icon, label, color, extra, onPress }: { icon?: ReactNode; label: string; color?: string; extra?: ReactNode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, pressed && { opacity: 0.8 }]}>
      {icon}
      {extra ? <View style={styles.extra}>{extra}</View> : null}
      {label ? (
        <Sans style={[styles.chipText, color ? { color } : null]} numberOfLines={1}>
          {label}
        </Sans>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, padding: 24 },
  top: { alignItems: 'center', paddingTop: 36 },
  logo: { color: colors.accent, fontSize: 14 },
  goalPill: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, backgroundColor: soft.card },
  goalTrack: { width: 64, height: 8, borderRadius: 4, backgroundColor: soft.sunken, overflow: 'hidden' },
  goalFill: { height: '100%', borderRadius: 4, backgroundColor: colors.accent },
  goalText: { color: soft.subtle, fontSize: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  plate: { width: 220, height: 196, borderRadius: 30, backgroundColor: soft.card, borderWidth: 1.5, borderColor: soft.line, alignItems: 'center', justifyContent: 'center' },
  name: { color: soft.subtle, fontSize: 13, marginTop: 14 },
  timeBox: { marginTop: 14, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 28, borderRadius: 22, borderWidth: 2, borderColor: soft.line },
  time: { fontSize: 44, lineHeight: 56, color: colors.gold },
  timeHint: { color: soft.subtle, fontSize: 11, marginTop: 2 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 22 },
  chips: { flexDirection: 'row', gap: 10, marginTop: 18, alignSelf: 'stretch' },
  chip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, paddingHorizontal: 8, borderRadius: 14, backgroundColor: soft.card },
  chipText: { fontSize: 13, color: colors.text, flexShrink: 1 },
  extra: { flexDirection: 'row', gap: 2 },
  start: { marginTop: 8, paddingVertical: 20, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center' },
  startText: { color: colors.bg, fontSize: 18 },
  dialBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  dialBox: { backgroundColor: colors.bg, borderWidth: 3, borderColor: colors.line, padding: 20 },
  dialName: { fontSize: 12, color: colors.text, textAlign: 'center', marginTop: 16, marginBottom: 18 },
  dialTitle: { color: colors.accent, fontSize: 12, textAlign: 'center', marginBottom: 14 },
});
