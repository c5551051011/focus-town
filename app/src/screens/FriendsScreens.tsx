import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { colors, font, soft } from '../theme';
import Icon from '../components/Icon';
import PersonRow from '../components/PersonRow';
import { Sans, Txt } from '../components/ui';
import { ScreenHeader, SectionTitle } from '../components/cards';
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

  const shown = searching ? results : null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
      <ScreenHeader title="ADD FRIENDS" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <SectionTitle>Search by name</SectionTitle>
        <View style={styles.searchBox}>
          <Icon name="search" size={20} color={soft.subtle} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Name, or paste a link"
            placeholderTextColor={soft.subtle}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Sans style={styles.clear}>✕</Sans>
            </Pressable>
          ) : null}
        </View>
        {pasted ? <Sans style={styles.hint}>Friend code found: {pasted}</Sans> : null}
        {error && searching ? <Sans style={styles.error}>{error}</Sans> : null}

        {searching && shown !== null && shown.length === 0 ? <Sans style={styles.empty}>No players found.</Sans> : null}
        {shown && shown.length > 0 ? (
          <View style={styles.results}>
            {shown.map((p) => (
              <PersonRow key={p.id} p={p} busy={busy === p.id} onFollow={() => follow(p)} onUnfollow={() => unfollow(p)} />
            ))}
          </View>
        ) : null}

        <SectionTitle>Share your follow link</SectionTitle>
        <View style={styles.shareCard}>
          <Sans style={styles.shareLabel}>Your friend code</Sans>
          <View style={styles.codeBox}>
            <Txt style={styles.shareCode}>{code ?? '--------'}</Txt>
          </View>
          <Pressable onPress={share} style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.85 }]}>
            <Icon name="share" size={20} color={colors.bg} />
            <Sans style={styles.shareBtnText}>Share link</Sans>
          </Pressable>
          <Sans style={styles.shareNote}>Friends who open the link can follow you right away. You can also tell them your code to paste in the search box.</Sans>
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
      <ScreenHeader title="FRIENDS" onBack={onBack} />
      <View style={styles.tabs}>
        {(['following', 'followers'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabOn]}>
            <Sans style={[styles.tabText, tab === t && { color: colors.text }]}>
              {t === 'following' ? 'Following' : 'Followers'} {social ? (t === 'following' ? social.following.length : social.followers.length) : ''}
            </Sans>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {list.length === 0 ? (
          <View style={styles.emptyCard}>
            <Sans style={styles.emptyTitle}>{tab === 'following' ? 'Not following anyone yet' : 'No followers yet'}</Sans>
            <Sans style={styles.emptyText}>
              {tab === 'following' ? 'Tap "Add friends" on your profile to find people.' : 'Share your follow link to get some!'}
            </Sans>
          </View>
        ) : (
          list.map((p) => (
            <PersonRow key={p.id} p={p} busy={busy === p.id} onFollow={() => act(() => followUser(p.id), p.id)} onUnfollow={() => act(() => unfollowUser(p.id), p.id)} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },

  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: soft.card, borderRadius: 14, paddingHorizontal: 16 },
  input: { flex: 1, color: colors.text, fontFamily: font, fontSize: 12, paddingVertical: 17 },
  clear: { color: soft.subtle, fontSize: 16 },
  hint: { color: colors.gold, fontSize: 13, marginTop: 10 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19, marginTop: 10 },
  empty: { color: soft.subtle, fontSize: 14, textAlign: 'center', marginTop: 24 },
  results: { backgroundColor: soft.card, borderRadius: 14, marginTop: 14, paddingHorizontal: 16 },

  shareCard: { backgroundColor: soft.card, borderRadius: 16, padding: 20, alignItems: 'center' },
  shareLabel: { color: soft.subtle, fontSize: 13 },
  codeBox: { marginTop: 12, paddingVertical: 14, paddingHorizontal: 22, borderRadius: 12, backgroundColor: '#1b1930' },
  shareCode: { color: colors.gold, fontSize: 22, letterSpacing: 3 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, alignSelf: 'stretch', marginTop: 18, paddingVertical: 15, borderRadius: 14, backgroundColor: colors.accent },
  shareBtnText: { color: colors.bg, fontSize: 16, fontWeight: '800' },
  shareNote: { color: soft.subtle, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 14 },

  tabs: { flexDirection: 'row', marginHorizontal: 20, borderBottomWidth: 2, borderBottomColor: soft.line },
  tab: { paddingVertical: 12, paddingHorizontal: 4, marginRight: 24, borderBottomWidth: 3, borderBottomColor: 'transparent', marginBottom: -2 },
  tabOn: { borderBottomColor: colors.accent },
  tabText: { fontSize: 15, color: soft.subtle, fontWeight: '600' },
  emptyCard: { backgroundColor: soft.card, borderRadius: 14, padding: 20, marginTop: 20, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyText: { color: soft.subtle, fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 19 },
});
