import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { colors, font } from '../theme';
import Icon from '../components/Icon';
import PersonRow from '../components/PersonRow';
import { PixelButton, Txt } from '../components/ui';
import { Person, Social, followLink, followUser, parseFollowCode, searchProfiles, unfollowUser } from '../lib/social';

type Common = { onBack: () => void; onChanged: () => void };

// ───────────────────────── 친구 추가 ─────────────────────────
// 1) 이름으로 찾기  2) 내 팔로우 링크 공유   (나중에: 친구 추천)
export function AddFriendsScreen({ social, initialQuery, onBack, onChanged }: Common & { social: Social | null; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery ?? '');
  const [results, setResults] = useState<Person[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const code = social?.me?.friend_code;
  const pasted = parseFollowCode(query);
  const searching = (pasted ?? query.trim()).length >= 2; // 너무 짧은 입력이면 이전 결과를 보여주지 않는다

  // 입력이 멈추면 검색한다. 링크/코드를 붙여넣으면 그 사람을 바로 찾는다.
  useEffect(() => {
    const q = pasted ?? query.trim();
    if (q.length < 2) return;
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      const r = await searchProfiles(q);
      if (mine !== seq.current) return;
      if (r.ok) {
        setResults(r.data);
        setError(null);
      } else setError(r.error);
    }, 350);
    return () => clearTimeout(t);
  }, [query, pasted]);

  const update = (p: Person) => setResults((rs) => rs?.map((x) => (x.id === p.id ? p : x)) ?? null);

  const follow = async (p: Person) => {
    setBusy(p.id);
    const r = await followUser(p.id);
    setBusy(null);
    if (r.ok) {
      update(r.data);
      onChanged();
    } else setError(r.error);
  };
  const unfollow = async (p: Person) => {
    setBusy(p.id);
    const r = await unfollowUser(p.id);
    setBusy(null);
    if (r.ok) {
      update({ ...p, i_follow: false });
      onChanged();
    } else setError(r.error);
  };

  const share = () => {
    if (!code) return;
    Share.share({ message: `Follow me on Focus Town and let's focus together!\n${followLink(code)}\n\nFriend code: ${code}` }).catch(() => {});
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
      <Header title="ADD FRIENDS" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Txt style={styles.sectionTitle}>SEARCH BY NAME</Txt>
        <View style={styles.searchBox}>
          <Icon name="user" size={20} color={colors.dim} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Name, or paste a link"
            placeholderTextColor={colors.dim}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
        </View>
        {pasted ? <Txt style={styles.hint}>Friend code found: {pasted}</Txt> : null}
        {error && searching ? <Txt style={styles.error}>{error}</Txt> : null}

        {searching && results !== null && results.length === 0 ? <Txt style={styles.empty}>No players found.</Txt> : null}
        {(searching ? results : null)?.map((p) => (
          <PersonRow key={p.id} p={p} busy={busy === p.id} onFollow={() => follow(p)} onUnfollow={() => unfollow(p)} />
        ))}

        <View style={styles.divider} />

        <Txt style={styles.sectionTitle}>SHARE YOUR FOLLOW LINK</Txt>
        <View style={styles.shareCard}>
          <Txt style={styles.shareLabel}>YOUR FRIEND CODE</Txt>
          <Txt style={styles.shareCode}>{code ?? '--------'}</Txt>
          <PixelButton label="SHARE LINK" onPress={share} style={{ alignSelf: 'stretch', marginTop: 16 }} />
          <Txt style={styles.shareNote}>Friends who open the link can follow you right away. You can also tell them your code to paste in the search box.</Txt>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ───────────────────────── 팔로잉 / 팔로워 목록 ─────────────────────────
export function FollowListScreen({ social, initialTab, onBack, onChanged }: Common & { social: Social | null; initialTab: 'following' | 'followers' }) {
  const [tab, setTab] = useState(initialTab);
  const [busy, setBusy] = useState<string | null>(null);
  const list = social ? (tab === 'following' ? social.following : social.followers) : [];

  const act = async (fn: () => Promise<{ ok: boolean }>, id: string) => {
    setBusy(id);
    await fn();
    setBusy(null);
    onChanged();
  };

  return (
    <View style={styles.wrap}>
      <Header title="FRIENDS" onBack={onBack} />
      <View style={styles.seg}>
        {(['following', 'followers'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.segItem, tab === t && styles.segOn]}>
            <Txt style={[styles.segText, tab === t && { color: colors.bg }]}>
              {t.toUpperCase()} {social ? (t === 'following' ? social.following.length : social.followers.length) : ''}
            </Txt>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {list.length === 0 ? (
          <Txt style={styles.empty}>{tab === 'following' ? 'You are not following anyone yet.\nTap ADD FRIENDS on your profile.' : 'No followers yet.\nShare your follow link to get some!'}</Txt>
        ) : (
          list.map((p) => (
            <PersonRow key={p.id} p={p} busy={busy === p.id} onFollow={() => act(() => followUser(p.id), p.id)} onUnfollow={() => act(() => unfollowUser(p.id), p.id)} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Txt style={styles.back} onPress={onBack}>
        {'< BACK'}
      </Txt>
      <Txt style={styles.title}>{title}</Txt>
      <View style={{ width: 60 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 3, borderBottomColor: colors.panel },
  back: { color: colors.dim, fontSize: 10, width: 60 },
  title: { color: colors.accent, fontSize: 14 },
  scroll: { padding: 20, paddingBottom: 48 },
  sectionTitle: { color: colors.dim, fontSize: 9, marginBottom: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.line, paddingHorizontal: 14 },
  input: { flex: 1, fontFamily: font, fontSize: 11, color: colors.text, paddingVertical: 15 },
  hint: { color: colors.gold, fontSize: 8, marginTop: 10 },
  error: { color: colors.danger, fontSize: 8, lineHeight: 14, marginTop: 10 },
  empty: { color: colors.dim, fontSize: 9, lineHeight: 17, textAlign: 'center', marginTop: 28 },
  divider: { height: 3, backgroundColor: colors.panel, marginVertical: 30 },
  shareCard: { backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.line, padding: 18, alignItems: 'center' },
  shareLabel: { color: colors.dim, fontSize: 8 },
  shareCode: { color: colors.gold, fontSize: 24, letterSpacing: 3, marginTop: 12 },
  shareNote: { color: colors.dim, fontSize: 8, lineHeight: 14, textAlign: 'center', marginTop: 14 },
  seg: { flexDirection: 'row', margin: 20, marginBottom: 0 },
  segItem: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.line },
  segOn: { backgroundColor: colors.accent },
  segText: { fontSize: 8, color: colors.dim },
});
