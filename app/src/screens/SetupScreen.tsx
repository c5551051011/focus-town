import { ReactNode, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { Pixel } from '../components/Pixel';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import TimeWheel from '../components/TimeWheel';
import SoundSheet from '../components/SoundSheet';
import TagSheet from '../components/TagSheet';
import FriendPicker from '../components/FriendPicker';
import { Pill, PixelButton, Txt } from '../components/ui';
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
          <Txt style={[styles.goal, todayMinutes >= dailyGoal && { color: colors.gold }]}>
            TODAY {Math.min(todayMinutes, dailyGoal)} / {dailyGoal} MIN
          </Txt>
        ) : null}
      </View>

      <View style={styles.center}>
        <Pixel name={b.id} size={170} />
        <Txt style={styles.name}>{b.name}</Txt>

        <Pressable onPress={() => setSheet('time')} style={styles.timeBox}>
          <Txt style={styles.time}>{minutes}:00</Txt>
        </Pressable>

        {/* 집중 모드: 색이 다른 알약 버튼 */}
        <View style={styles.pills}>
          {[...PRESET_TAGS, ...customTags].map((t) => (
            <Pill key={t} label={t} color={tagColor(t)} on={t === tag} onPress={() => update({ tag: t })} />
          ))}
          <Pill label="+" color={colors.dim} on={false} onPress={() => setSheet('newMode')} />
        </View>

        <View style={styles.chips}>
          <Chip onPress={() => setSheet('sound')} icon={<Icon name="bell" size={16} color={colors.dim} />} label={ambientLabel(ambient)} />
          <Chip
            onPress={() => setSheet('friends')}
            icon={invited.length ? null : <Icon name="user" size={16} color={colors.dim} />}
            label={invited.length ? '' : 'FRIENDS'}
            extra={invited.map((f) => <Avatar key={f.id} character={f} size={22} />)}
          />
        </View>
      </View>

      <PixelButton label={invited.length ? `START WITH ${invited.length}` : 'START'} onPress={start} style={styles.start} />

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
      <SoundSheet visible={sheet === 'sound'} selected={ambient} onSelect={(id) => update({ ambient: id })} onClose={() => setSheet(null)} />
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
        <Txt style={[styles.chipText, color ? { color } : null]} numberOfLines={1}>
          {label}
        </Txt>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, padding: 24 },
  top: { alignItems: 'center', paddingTop: 4 },
  logo: { color: colors.accent, fontSize: 14 },
  goal: { color: colors.dim, fontSize: 8, marginTop: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  name: { fontSize: 9, color: colors.dim, marginTop: 14 },
  timeBox: { marginTop: 22, paddingBottom: 6, borderBottomWidth: 3, borderBottomColor: colors.panel },
  time: { fontSize: 48, color: colors.gold },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 26 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 22, alignSelf: 'stretch' },
  chip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 6, backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.line },
  chipText: { fontSize: 8, color: colors.text, flexShrink: 1 },
  extra: { flexDirection: 'row', gap: 2 },
  start: { marginTop: 8 },
  dialBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  dialBox: { backgroundColor: colors.bg, borderWidth: 3, borderColor: colors.line, padding: 20 },
  dialName: { fontSize: 12, color: colors.text, textAlign: 'center', marginTop: 16, marginBottom: 18 },
  dialTitle: { color: colors.accent, fontSize: 12, textAlign: 'center', marginBottom: 14 },
});
