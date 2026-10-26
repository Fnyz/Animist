import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getByGenre, getList, getRecentEpisodes } from '../api';
import { EmptyState, ErrorState, IconButton, Loading, Poster } from '../components/ui';
import { colors, fonts, space } from '../theme';

const COLUMNS = 3;

// route.params: { kind: 'recent' | 'trending' | 'airing' | 'popular' | 'movies' | 'genre', genre?, title }
const fetchPage = ({ kind, genre }, page) => {
  if (kind === 'recent') return getRecentEpisodes(page);
  if (kind === 'genre') return getByGenre(genre, page);
  return getList(kind, page);
};

const ListScreen = ({ route, navigation }) => {
  const { title } = route.params;
  const { width } = useWindowDimensions();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadNext = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPage(route.params, page + 1);
      setItems((prev) => [...prev, ...res.results]);
      setPage(page + 1);
      setHasMore(res.hasNextPage);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, route.params]);

  // First page.
  useEffect(() => {
    let alive = true;
    fetchPage(route.params, 1)
      .then((res) => {
        if (!alive) return;
        setItems(res.results);
        setPage(1);
        setHasMore(res.hasNextPage);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [route.params]);

  const gap = space.md;
  const cardWidth = (width - space.xl * 2 - gap * (COLUMNS - 1)) / COLUMNS;
  const badgeFor = (a) => {
    if (route.params.kind === 'recent') return `EP ${a.episodeNumber}`;
    if (route.params.kind === 'movies') return 'Movie';
    if (route.params.kind === 'free') return `▶ ${a.episodes.filter((e) => e.source === 'youtube').length} eps`;
    return null;
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" label="Back" onPress={() => navigation.goBack()} />
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>

      {items.length === 0 && loading && <Loading />}
      {items.length === 0 && error && <ErrorState message={error} onRetry={loadNext} />}

      <FlatList
        data={items}
        numColumns={COLUMNS}
        keyExtractor={(a, i) => `${a.id}-${a.episodeNumber ?? ''}-${i}`}
        renderItem={({ item }) => (
          <Poster anime={item} width={cardWidth} badge={badgeFor(item)} onPress={(a) => navigation.navigate('AnimeDetail', { animeId: a.id })} />
        )}
        columnWrapperStyle={{ gap }}
        contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.lg }}
        onEndReached={loadNext}
        onEndReachedThreshold={0.6}
        ListEmptyComponent={
          !loading && !error ? <EmptyState icon="albums-outline" title="Nothing here yet" message="Try another genre or check back later." /> : null
        }
        ListFooterComponent={items.length > 0 && loading ? <ActivityIndicator color={colors.accent} style={{ padding: space.lg }} /> : null}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.xl, paddingVertical: space.md },
  title: { flex: 1, fontFamily: fonts.display, fontSize: 24, color: colors.text },
});

export default ListScreen;
