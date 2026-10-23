import React, { useContext, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { myContext } from '../context';
import { EmptyState } from '../components/ui';
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
  const { userWatchList, historyRecords, removeFromWatchList } = useContext(myContext);
  const [tab, setTab] = useState('watchlist');

  const watchlist = useMemo(
    () =>
      [...userWatchList].sort(
        (a, b) => (b.data.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER) - (a.data.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER)
      ),
    [userWatchList]
  );

  const open = (titleId) => navigation.navigate('AnimeDetail', { animeId: titleId });

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
          data={watchlist}
          keyExtractor={(w) => w.id}
          contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: space.xxl, flexGrow: 1 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => open(item.data.titleId)} style={styles.row}>
              <View style={styles.thumb}>
                {item.data.image ? <Image source={{ uri: item.data.image }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={styles.rowTitle} numberOfLines={2}>{item.data.title || `Anime #${item.data.titleId}`}</Text>
                <Text style={styles.rowMeta}>{[item.data.type, timeAgo(item.data.createdAt)].filter(Boolean).join(' · ')}</Text>
              </View>
              <Pressable
                onPress={() => removeFromWatchList(item.id).catch((e) => console.warn(e))}
                hitSlop={8}
                style={styles.remove}
                accessibilityLabel={`Remove ${item.data.title || 'anime'} from My List`}
              >
                <Ionicons name="trash-outline" size={19} color={colors.muted} />
              </Pressable>
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="bookmark-outline"
              title="Your list is empty"
              message="Tap “My List” on any anime to save it here."
              actionTitle="Browse anime"
              onAction={() => navigation.navigate('Home')}
            />
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
          data={historyRecords}
          keyExtractor={(h) => h.id}
          contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: space.xxl }}
          renderItem={({ item }) => (
            <Pressable onPress={() => open(item.data.titleId)} style={styles.row}>
              <View style={[styles.thumb, styles.historyThumb]}>
                <Ionicons name="play" size={20} color={colors.text} />
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={styles.rowTitle} numberOfLines={2}>{item.data.title || `Anime #${item.data.titleId}`}</Text>
                <Text style={styles.rowMeta}>Episode {item.data.epiNumber ?? '?'}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
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
  historyThumb: { alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  rowMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});

export default MyListScreen;
