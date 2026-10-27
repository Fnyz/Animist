import React, { useContext, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { myContext } from '../context';
import { Chip, EmptyState, WatchBadge } from '../components/ui';
import StatusSheet from '../components/StatusSheet';
import { LIST_STATUSES, statusInfo, statusOf } from '../listStatus';
import { byLatest, historyProgress, progressFraction, progressLabel } from '../progress';
import { colors, fonts, radius, space } from '../theme';

const timeAgo = (ts) => {
  const date = ts?.toDate?.();
  if (!date) return 'Just added';
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days < 1) return 'Added today';
  if (days === 1) return 'Added yesterday';
  if (days < 7) return `Added ${days} days ago`;
  return `Added ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
};

const MyListScreen = ({ navigation }) => {
  const { userWatchList, historyRecords, removeFromWatchList, setListStatus, signedIn } = useContext(myContext);
  const [tab, setTab] = useState('watchlist');
  // 'all' or a status key (watching, planned, completed, dropped).
  const [filter, setFilter] = useState('all');
  // The list entry whose status sheet is open.
  const [editing, setEditing] = useState(null);

  const watchlist = useMemo(
    () =>
      [...userWatchList].sort(
        (a, b) => (b.data.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER) - (a.data.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER)
      ),
    [userWatchList]
  );

  const counts = useMemo(() => {
    const result = { all: watchlist.length };
    for (const entry of watchlist) result[statusOf(entry)] = (result[statusOf(entry)] ?? 0) + 1;
    return result;
  }, [watchlist]);
  const shown = filter === 'all' ? watchlist : watchlist.filter((entry) => statusOf(entry) === filter);

  const open = (titleId) => navigation.navigate('AnimeDetail', { animeId: titleId });
  const changeEntry = (action) => {
    setEditing(null);
    action().catch((e) => console.warn('watchlist update failed', e));
  };

  // Lists and history live in the account, so guests get the way in instead.
  if (!signedIn) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.top}>
          <Text style={styles.heading}>My List</Text>
        </View>
        <EmptyState
          icon="bookmark-outline"
          title="Save anime and pick up where you left off"
          message="Sign in to keep a list, see your watch history and continue episodes on any phone."
          actionTitle="Log in or create an account"
          onAction={() => navigation.navigate('SignUpAndSignIn', { reason: 'Sign in to use My List.' })}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.top}>
        <Text style={styles.heading}>My List</Text>
        <View style={styles.segment} accessibilityRole="tablist">
          {[['watchlist', `Watchlist · ${watchlist.length}`], ['history', 'History']].map(([key, label]) => (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === key }}
              onPress={() => setTab(key)}
              style={[styles.segmentItem, tab === key && { backgroundColor: colors.accent }]}
            >
              <Text style={[styles.segmentText, tab === key && { color: colors.onAccent }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {tab === 'watchlist' ? (
        <FlatList
          data={shown}
          keyExtractor={(w) => w.id}
          contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: space.xxl, flexGrow: 1 }}
          ListHeaderComponent={
            watchlist.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} style={styles.filterRow}>
                <Chip label={`All · ${counts.all}`} active={filter === 'all'} onPress={() => setFilter('all')} />
                {LIST_STATUSES.map(({ key, label, icon }) => (
                  <Chip key={key} label={`${label} · ${counts[key] ?? 0}`} icon={icon} active={filter === key} onPress={() => setFilter(key)} />
                ))}
              </ScrollView>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => open(item.data.titleId)} style={styles.row}>
              <View style={styles.thumb}>
                {item.data.image ? <Image source={{ uri: item.data.image }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
                <WatchBadge id={item.data.titleId} size={18} style={styles.thumbBadge} />
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={styles.rowTitle} numberOfLines={2}>{item.data.title || `Anime #${item.data.titleId}`}</Text>
                <Text style={styles.rowMeta}>{[item.data.type, timeAgo(item.data.createdAt)].filter(Boolean).join(' · ')}</Text>
              </View>
              <Pressable
                onPress={() => setEditing(item)}
                hitSlop={8}
                style={styles.statusPill}
                accessibilityRole="button"
                accessibilityLabel={`${statusInfo(statusOf(item)).label}. Change status of ${item.data.title || 'anime'}`}
              >
                <Ionicons name={statusInfo(statusOf(item)).icon} size={14} color={colors.accent} />
                <Text style={styles.statusPillText}>{statusInfo(statusOf(item)).label}</Text>
                <Ionicons name="chevron-down" size={14} color={colors.muted} />
              </Pressable>
            </Pressable>
          )}
          ListEmptyComponent={
            watchlist.length > 0 ? (
              <EmptyState
                icon={statusInfo(filter).icon}
                title={`Nothing in ${statusInfo(filter).label} yet`}
                message="Change an anime's status from its page or from the list."
              />
            ) : (
              <EmptyState
                icon="bookmark-outline"
                title="Your list is empty"
                message="Tap “My List” on any anime to save it here."
                actionTitle="Browse anime"
                onAction={() => navigation.navigate('Home')}
              />
            )
          }
        />
      ) : historyRecords.length === 0 ? (
        <EmptyState
          icon="time-outline"
          title="No watch history yet"
          message="Episodes you watch will appear here once in-app playback is back."
        />
      ) : (
        <FlatList
          data={[...historyRecords].sort(byLatest)}
          keyExtractor={(h) => h.id}
          contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: space.xxl }}
          renderItem={({ item }) => {
            const { episode: ep, progress, done, continueEp } = historyProgress(item.data);
            const fraction = progressFraction(progress);
            const label = progressLabel(progress);
            return (
            <Pressable onPress={() => navigation.navigate('View', { animeId: item.data.titleId, episode: ep })} style={styles.row}>
              <View style={[styles.thumb, styles.historyThumb]}>
                {item.data.image ? <Image source={{ uri: item.data.image }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
                <View style={styles.playDot}>
                  <Ionicons name="play" size={14} color={colors.onAccent} />
                </View>
                {fraction > 0 && (
                  <View style={styles.thumbBar}>
                    <View style={[styles.thumbBarFill, { width: `${fraction * 100}%` }]} />
                  </View>
                )}
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={styles.rowTitle} numberOfLines={2}>{item.data.title || `Anime #${item.data.titleId}`}</Text>
                <Text style={styles.rowMeta}>Episode {ep}{label ? ` · ${label}` : ''}</Text>
              </View>
              <Pressable
                onPress={() => navigation.navigate('View', { animeId: item.data.titleId, episode: continueEp })}
                style={styles.continue}
                accessibilityLabel={`${done ? 'Play' : 'Continue'} episode ${continueEp} of ${item.data.title || 'this anime'}`}
              >
                <Text style={styles.continueText}>EP {continueEp}</Text>
                <Ionicons name="play-forward" size={14} color={colors.accent} />
              </Pressable>
            </Pressable>
            );
          }}
        />
      )}
      <StatusSheet
        visible={Boolean(editing)}
        title={editing?.data.title}
        current={editing ? statusOf(editing) : null}
        onPick={(key) => changeEntry(() => setListStatus(editing.id, key))}
        onRemove={() => changeEntry(() => removeFromWatchList(editing.id))}
        onClose={() => setEditing(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  top: { paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.md, gap: space.lg },
  heading: { fontFamily: fonts.display, fontSize: 28, color: colors.text },
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14, backgroundColor: colors.surface },
  segmentItem: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.muted },
  row: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2129',
  },
  thumb: { width: 56, height: 80, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.surface2 },
  thumbBadge: { position: 'absolute', top: 4, right: 4 },
  historyThumb: { alignItems: 'center', justifyContent: 'center' },
  thumbBar: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.25)' },
  thumbBarFill: { height: 3, backgroundColor: colors.accent },
  playDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  continue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  continueText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.accent },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  rowMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  statusPillText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.text },
  filterRow: { marginHorizontal: -space.xl, marginBottom: space.sm },
  filters: { paddingHorizontal: space.xl, gap: space.sm },
});

export default MyListScreen;
