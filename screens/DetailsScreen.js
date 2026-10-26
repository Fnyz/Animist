import React, { useCallback, useContext, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Share, Linking, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getAnimeInfo } from '../api';
import { myContext } from '../context';
import { Button, IconButton, Loading, ErrorState, Tag } from '../components/ui';
import TrailerModal from '../components/TrailerModal';
import CheckEpisodesButton from '../components/CheckEpisodesButton';
import { progressFraction, progressLabel } from '../progress';
import { colors, fonts, radius, space } from '../theme';

const EPISODES_SHOWN = 12;

const DetailsScreen = ({ route, navigation }) => {
  const { animeId } = route.params;
  const insets = useSafeAreaInsets();
  const { findInWatchList, addToWatchList, removeFromWatchList, watchProgress } = useContext(myContext);
  const [anime, setAnime] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [allEpisodes, setAllEpisodes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [scrollY] = useState(() => new Animated.Value(0));

  const load = useCallback(async () => {
    try {
      setAnime(await getAnimeInfo(animeId));
    } catch (e) {
      setError(e.message);
    }
  }, [animeId]);

  const retry = () => {
    setError(null);
    load();
  };

  useEffect(() => {
    load();
  }, [load]);

  const back = (
    <IconButton icon="chevron-back" label="Back" onPress={() => navigation.goBack()} style={[styles.floating, { top: insets.top + 8, left: 16 }]} />
  );

  if (error) {
    return (
      <View style={styles.screen}>
        {back}
        <ErrorState message={error} onRetry={retry} />
      </View>
    );
  }
  if (!anime) {
    return (
      <View style={styles.screen}>
        {back}
        <Loading />
      </View>
    );
  }

  const saved = findInWatchList(anime.id);
  const toggleList = async () => {
    setSaving(true);
    try {
      if (saved) await removeFromWatchList(saved.id);
      else await addToWatchList(anime);
    } catch (e) {
      console.warn('watchlist update failed', e);
    } finally {
      setSaving(false);
    }
  };

  const share = () =>
    Share.share({ message: `${anime.title} — https://anilist.co/anime/${anime.id}` }).catch(() => {});

  const episodes = allEpisodes ? anime.episodes : anime.episodes.slice(0, EPISODES_SHOWN);
  const tags = [anime.type, anime.totalEpisodes ? `${anime.totalEpisodes} episode${anime.totalEpisodes === 1 ? '' : 's'}` : null, anime.status, ...anime.genres].filter(Boolean);

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        <View style={styles.banner}>
          <Image source={{ uri: anime.banner }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
          <View style={styles.bannerShade} />
          {anime.trailer && (
            <Pressable onPress={() => setShowTrailer(true)} style={styles.playButton} accessibilityLabel="Play trailer">
              <Ionicons name="play" size={28} color={colors.onAccent} style={{ marginLeft: 3 }} />
            </Pressable>
          )}
        </View>

        <View style={styles.titleRow}>
          <View style={styles.poster}>
            <Image source={{ uri: anime.image }} style={StyleSheet.absoluteFill} contentFit="cover" />
          </View>
          <View style={{ flex: 1, gap: 6, paddingBottom: 4 }}>
            <Text style={styles.title}>{anime.title}</Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {[anime.otherName !== anime.title ? anime.otherName : null, anime.year].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>

        <View style={styles.tags}>
          {tags.map((t) => <Tag key={t} label={t} />)}
          {anime.score ? <Tag label={`★ ${anime.score}%`} /> : null}
        </View>

        <View style={styles.actions}>
          <Button
            title={saved ? 'In My List' : 'Add to My List'}
            icon={saved ? 'checkmark-circle' : 'bookmark-outline'}
            onPress={toggleList}
            loading={saving}
            variant={saved ? 'ghost' : 'primary'}
            style={{ flex: 1 }}
          />
          {anime.trailer && (
            <Button title="Trailer" icon="logo-youtube" variant="ghost" onPress={() => setShowTrailer(true)} style={{ paddingHorizontal: space.lg }} />
          )}
        </View>

        {anime.watchLinks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Where to watch</Text>
            <View style={styles.watchGrid}>
              {anime.watchLinks.map((link) => (
                <Pressable key={link.url} onPress={() => Linking.openURL(link.url).catch(() => {})} style={styles.watchLink}>
                  <Text style={styles.watchText} numberOfLines={1}>{link.site}</Text>
                  <Ionicons name="open-outline" size={16} color={colors.textSoft} />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.body} numberOfLines={expanded ? undefined : 5}>{anime.description}</Text>
          {anime.description.length > 260 && (
            <Pressable onPress={() => setExpanded(!expanded)} hitSlop={8}>
              <Text style={styles.link}>{expanded ? 'Show less' : 'Read more'}</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Episodes</Text>
            <Text style={styles.muted}>
              {anime.nextEpisode
                ? `EP ${anime.nextEpisode.episode} airs ${new Date(anime.nextEpisode.airingAt * 1000).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`
                : `${anime.episodes.length} released`}
            </Text>
          </View>
          {(() => {
            const onYouTube = anime.episodes.filter((e) => e.source === 'youtube');
            const linked = anime.episodes.find((e) => e.source === 'link');
            const channels = [...new Set(onYouTube.map((e) => e.youtube.channel))].join(' and ');
            const message = onYouTube.length
              ? `${onYouTube.length} episode${onYouTube.length > 1 ? 's play' : ' plays'} in the app, free from ${channels} on YouTube.`
              : linked
                ? `Episodes open on ${linked.link.site}, the official streaming service.`
                : 'No free official episodes yet. Try the services above.';
            return (
              <View style={[styles.notice, onYouTube.length > 0 && styles.noticeGood]}>
                <Ionicons
                  name={onYouTube.length ? 'checkmark-circle' : 'information-circle-outline'}
                  size={18}
                  color={onYouTube.length ? colors.success : colors.accent}
                />
                <Text style={styles.noticeText}>{message}</Text>
              </View>
            );
          })()}
          {/* Some episodes don't play in the app yet: maybe a channel has uploaded them since. */}
          {anime.episodes.some((e) => e.source !== 'youtube') && <CheckEpisodesButton />}
          {anime.episodes.length === 0 ? (
            <Text style={styles.muted}>No episodes have aired yet.</Text>
          ) : (
            episodes.map((ep) => {
              const progress = watchProgress(anime.id, ep.number);
              const fraction = progressFraction(progress);
              const label = progressLabel(progress);
              return (
              <Pressable
                key={ep.id}
                onPress={() => navigation.navigate('View', { animeId: anime.id, episode: ep.number })}
                style={styles.episode}
              >
                <View style={styles.episodeThumb}>
                  {ep.thumbnail ? <Image source={{ uri: ep.thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
                  <Text style={styles.episodeNum}>EP {ep.number}</Text>
                  {fraction > 0 && (
                    <View style={styles.thumbBar}>
                      <View style={[styles.thumbBarFill, { width: `${fraction * 100}%` }]} />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.episodeTitle} numberOfLines={1}>{ep.title ?? `Episode ${ep.number}`}</Text>
                  <Text style={styles.muted} numberOfLines={1}>
                    {label ?? (ep.source === 'youtube' ? 'Plays in the app' : ep.source === 'link' ? `Opens ${ep.link.site}` : 'Not available yet')}
                  </Text>
                </View>
                <Ionicons
                  name={ep.source === 'youtube' ? 'play-circle' : ep.source === 'link' ? 'open-outline' : 'lock-closed-outline'}
                  size={20}
                  color={ep.source === 'none' ? colors.muted : colors.text}
                />
              </Pressable>
              );
            })
          )}
          {anime.episodes.length > EPISODES_SHOWN && (
            <Button
              title={allEpisodes ? 'Show fewer' : `Show all ${anime.episodes.length} episodes`}
              variant="ghost"
              onPress={() => setAllEpisodes(!allEpisodes)}
            />
          )}
        </View>
      </Animated.ScrollView>

      {/* Solid bar that fades in once the banner scrolls away, so text never runs under the
          status bar or the back/share buttons. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.header,
          {
            height: insets.top + 60,
            paddingTop: insets.top,
            opacity: scrollY.interpolate({ inputRange: [150, 220], outputRange: [0, 1], extrapolate: 'clamp' }),
          },
        ]}
      >
        <Text style={styles.headerTitle} numberOfLines={1}>{anime.title}</Text>
      </Animated.View>

      {back}
      <IconButton icon="share-social-outline" label="Share" onPress={share} style={[styles.floating, { top: insets.top + 8, right: 16 }]} />
      <TrailerModal videoId={showTrailer ? anime.trailer : null} title={anime.title} onClose={() => setShowTrailer(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  floating: { position: 'absolute', backgroundColor: 'rgba(14,15,20,0.7)' },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    paddingHorizontal: 76,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerTitle: { fontFamily: fonts.displaySemi, fontSize: 17, color: colors.text, textAlign: 'center' },
  banner: { height: 280, backgroundColor: colors.surface2, justifyContent: 'center', alignItems: 'center' },
  bannerShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(14,15,20,0.25)' },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', gap: space.lg, paddingHorizontal: space.xl, marginTop: -52, alignItems: 'flex-end' },
  poster: {
    width: 108,
    height: 158,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.bg,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
  },
  title: { fontFamily: fonts.display, fontSize: 23, lineHeight: 27, color: colors.text },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingHorizontal: space.xl, paddingTop: space.lg },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: space.xl, paddingTop: space.lg },
  squareButton: { width: 48, height: 48, borderRadius: radius.md, borderWidth: 1.5, borderColor: '#4A4E5E', backgroundColor: 'transparent' },
  section: { paddingHorizontal: space.xl, paddingTop: space.xxl, gap: space.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionLabel: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.muted },
  sectionTitle: { fontFamily: fonts.displaySemi, fontSize: 19, color: colors.text },
  watchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  watchLink: {
    flexGrow: 1,
    flexBasis: '45%',
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  watchText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text, flexShrink: 1 },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 23, color: colors.textSoft },
  link: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.accent },
  muted: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  notice: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,122,89,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,122,89,0.25)',
  },
  noticeGood: { backgroundColor: colors.successSoft, borderColor: 'rgba(127,224,174,0.3)' },
  noticeText: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textSoft },
  episode: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'center',
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2129',
  },
  episodeThumb: {
    width: 104,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbBar: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.25)' },
  thumbBarFill: { height: 3, backgroundColor: colors.accent },
  episodeNum: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.text,
    backgroundColor: 'rgba(14,15,20,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  episodeTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
});

export default DetailsScreen;
