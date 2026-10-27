import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { searchAnime } from '../api';
import { myContext } from '../context';
import { useRequireAccount } from '../requireAccount';
import { Chip, EmptyState, ErrorState, WatchBadge } from '../components/ui';
import { colors, fonts, space } from '../theme';

// Genres and AniList tags people can browse without typing.
const BROWSE = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mecha', 'Music', 'Mystery', 'Psychological',
  'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller', 'Isekai', 'Shounen', 'School',
  'Martial-Arts', 'Super-Power', 'Military', 'Historica', 'Vampire',
];
const browseLabel = (g) => ({ 'Martial-Arts': 'Martial Arts', 'Super-Power': 'Super Power', Historica: 'Historical' }[g] ?? g);

const ResultRow = ({ anime, onOpen }) => {
  const { findInWatchList, addToWatchList, removeFromWatchList } = useContext(myContext);
  const saved = findInWatchList(anime.id);
  const requireAccount = useRequireAccount();
  const toggle = () =>
    requireAccount(
      () => (saved ? removeFromWatchList(saved.id) : addToWatchList(anime)).catch((e) => console.warn(e)),
      'Sign in to save anime to My List.'
    );

  return (
    <Pressable onPress={() => onOpen(anime)} style={styles.row}>
      <View style={styles.thumb}>
        <Image source={{ uri: anime.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        <WatchBadge id={anime.id} size={20} style={styles.thumbBadge} />
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={styles.rowTitle} numberOfLines={2}>{anime.title}</Text>
        <Text style={styles.rowMeta}>
          {[anime.type, anime.year, anime.totalEpisodes ? `${anime.totalEpisodes} episode${anime.totalEpisodes === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ')}
        </Text>
        <Text style={styles.rowGenres} numberOfLines={1}>{anime.genres.slice(0, 3).join(' · ')}</Text>
      </View>
      <Pressable onPress={toggle} style={[styles.addButton, saved && { backgroundColor: colors.accent, borderColor: colors.accent }]} accessibilityLabel={saved ? 'Remove from My List' : 'Add to My List'}>
        <Ionicons name={saved ? 'checkmark' : 'add'} size={20} color={saved ? colors.onAccent : colors.text} />
      </Pressable>
    </Pressable>
  );
};

const SearchScreen = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const latest = useRef('');

  const run = async (q, nextPage = 1) => {
    latest.current = q;
    setLoading(true);
    setError(null);
    try {
      const res = await searchAnime(q, nextPage);
      if (latest.current !== q) return; // a newer search started
      setResults((prev) => (nextPage === 1 ? res.results : [...prev, ...res.results]));
      setPage(nextPage);
      setHasMore(res.hasNextPage);
    } catch (e) {
      setError(e.message);
    } finally {
      if (latest.current === q) setLoading(false);
    }
  };

  // Search 400 ms after the person stops typing.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      // Too short to search; the genre grid shows instead of results.
      latest.current = '';
      return undefined;
    }
    const t = setTimeout(() => run(q), 400);
    return () => clearTimeout(t);
  }, [query]);

  const openAnime = (anime) => navigation.navigate('AnimeDetail', { animeId: anime.id });
  const searching = query.trim().length >= 2;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.top}>
        <Text style={styles.heading}>Search</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Titles, e.g. Frieren"
            placeholderTextColor="#6B6F80"
            selectionColor={colors.accent}
            style={styles.input}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search anime"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={20} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {!searching ? (
        <View style={{ paddingHorizontal: space.xl, gap: space.md }}>
          <Text style={styles.sectionLabel}>Browse by genre</Text>
          <View style={styles.genreGrid}>
            {BROWSE.map((g) => (
              <Chip key={g} label={browseLabel(g)} onPress={() => navigation.navigate('List', { kind: 'genre', genre: g, title: browseLabel(g) })} />
            ))}
          </View>
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => run(query.trim())} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(a) => String(a.id)}
          renderItem={({ item }) => <ResultRow anime={item} onOpen={openAnime} />}
          contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.md }}
          keyboardShouldPersistTaps="handled"
          onEndReached={() => hasMore && !loading && run(query.trim(), page + 1)}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            results.length ? <Text style={styles.count}>{results.length}{hasMore ? '+' : ''} {results.length === 1 && !hasMore ? 'result' : 'results'}</Text> : null
          }
          ListEmptyComponent={
            loading ? null : (
              <EmptyState icon="search-outline" title="No matches" message={`Nothing found for "${query.trim()}". Try another title.`} />
            )
          }
          ListFooterComponent={loading ? <ActivityIndicator color={colors.accent} style={{ padding: space.xl }} /> : null}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  top: { paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.lg, gap: 14 },
  heading: { fontFamily: fonts.display, fontSize: 28, color: colors.text },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  input: { flex: 1, height: '100%', fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  sectionLabel: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.muted },
  genreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  count: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, paddingBottom: 4 },
  row: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  thumb: { width: 72, height: 104, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.surface2 },
  thumbBadge: { position: 'absolute', top: 5, right: 5 },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.text },
  rowMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  rowGenres: { fontFamily: fonts.body, fontSize: 12, color: colors.textSoft },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SearchScreen;
