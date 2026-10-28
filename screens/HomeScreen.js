import React, { useCallback, useContext, useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl, Pressable, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useDataVersion, getHomeData } from '../api';
import { myContext } from '../context';
import { Chip, Loading, ErrorState, PosterRow, Wordmark } from '../components/ui';
import HeroCarousel from '../components/HeroCarousel';
import ContinueRow from '../components/ContinueRow';
import { avatarFor } from '../avatars';
import { newBadge, newNote } from '../newOnAnimist';
import { useClipsAllowed } from '../heroClips';
import { colors, space } from '../theme';

export const HOME_GENRES = ['Action', 'Fantasy', 'Romance', 'Comedy', 'Sci-Fi', 'Slice of Life', 'Sports', 'Horror'];

const HomeScreen = ({ navigation }) => {
  const { profile, userData, historyRecords, signedIn } = useContext(myContext);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const clipsAllowed = useClipsAllowed();
  // The banner clips stop once the banner is mostly scrolled away.
  const [heroInView, setHeroInView] = useState(true);

  const load = useCallback(async () => {
    try {
      setData(await getHomeData());
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const retry = () => {
    setError(null);
    load();
  };

  // Loads again when newer data arrives (a downloaded list or snapshot, live AniList details).
  const dataVersion = useDataVersion();
  useEffect(() => {
    load();
  }, [load, dataVersion]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openAnime = (anime) => navigation.navigate('AnimeDetail', { animeId: anime.id });
  const seeAll = (kind, title) => navigation.navigate('List', { kind, title });
  const avatar = profile?.[0]?.data.image || avatarFor(userData?.id);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Wordmark />
        <Pressable onPress={() => navigation.navigate('Profile')} accessibilityLabel="Profile" style={styles.avatar}>
          {signedIn ? (
            <Image source={{ uri: avatar }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Ionicons name="person-outline" size={22} color={colors.accent} />
          )}
        </Pressable>
      </View>

      {!data && !error && <Loading />}
      {error && !data && <ErrorState message={error} onRetry={retry} />}

      {data && (
        <ScrollView
          contentContainerStyle={{ paddingBottom: space.xxl, gap: space.xxl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} colors={[colors.accent]} />}
          showsVerticalScrollIndicator={false}
          onScroll={(e) => setHeroInView(e.nativeEvent.contentOffset.y < 300)}
          scrollEventThrottle={100}
        >
          {data.trending.length > 0 && (
            <HeroCarousel
              items={data.trending.slice(0, 5)}
              onOpen={openAnime}
              onWatch={(anime, episode) => navigation.navigate('View', { animeId: anime.id, episode })}
              clips={clipsAllowed && heroInView}
            />
          )}

          <FlatList
            horizontal
            data={HOME_GENRES}
            keyExtractor={(g) => g}
            renderItem={({ item }) => (
              <Chip label={item} onPress={() => navigation.navigate('List', { kind: 'genre', genre: item, title: item })} />
            )}
            contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.sm }}
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: -space.sm }}
          />

          <ContinueRow
            historyRecords={historyRecords}
            onPlay={(animeId, episode) => navigation.navigate('View', { animeId, episode })}
          />

          {/* What the daily update added this week: anime that just became free, new movies and
              new episodes (newest first). */}
          {data.newOnAnimist?.length > 0 && (
            <PosterRow
              title="New on Animist"
              note={newNote(data.newOnAnimist)}
              items={data.newOnAnimist.map((a) => a.anime)}
              badgeFor={(_, i) => newBadge(data.newOnAnimist[i])}
              onPressItem={openAnime}
            />
          )}

          {data.free?.length > 0 && (
            <PosterRow
              title="Free to watch"
              items={data.free}
              onPressItem={openAnime}
              onSeeAll={() => seeAll('free', 'Free to watch')}
              badgeFor={(a) => `▶ ${a.episodes.filter((e) => e.source === 'youtube').length} eps`}
            />
          )}
          <PosterRow
            title="New episodes"
            items={data.recent}
            onPressItem={openAnime}
            onSeeAll={() => seeAll('recent', 'New episodes')}
            badgeFor={(a) => `EP ${a.episodeNumber}`}
          />
          <PosterRow
            title="Trending now"
            items={data.trending}
            onPressItem={openAnime}
            onSeeAll={() => seeAll('trending', 'Trending now')}
            badgeFor={(_, i) => `#${i + 1}`}
          />
          <PosterRow
            title="Airing this season"
            items={data.airing}
            onPressItem={openAnime}
            onSeeAll={() => seeAll('airing', 'Airing this season')}
            badgeFor={(a) => (a.nextEpisode ? `EP ${a.nextEpisode.episode - 1}` : null)}
          />
          <PosterRow
            title="All-time popular"
            items={data.popular}
            onPressItem={openAnime}
            onSeeAll={() => seeAll('popular', 'All-time popular')}
          />
          {/* Full movies that play in the app, free from official channels. */}
          {data.freeMovies?.length > 0 && (
            <PosterRow
              title="Free movies"
              note="Full anime movies, free from official channels"
              items={data.freeMovies}
              onPressItem={openAnime}
              onSeeAll={() => seeAll('freeMovies', 'Free movies')}
              badgeFor={() => '▶ Movie'}
            />
          )}
          <PosterRow
            title="Top movies"
            items={data.movies}
            onPressItem={openAnime}
            onSeeAll={() => seeAll('movies', 'Top movies')}
            badgeFor={() => 'Movie'}
          />
        </ScrollView>
      )}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    paddingBottom: space.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: '#2E4A7A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

export default HomeScreen;
