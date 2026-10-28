import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Linking, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useDataVersion, getAnimeInfo, refreshAnimeLive } from '../api';
import { myContext } from '../context';
import { formatTime, isFinished, progressFraction, progressLabel, resumePoint } from '../progress';
import { statusAfterWatching, statusOf } from '../listStatus';
import VideoPlayer from '../components/VideoPlayer';
import CheckEpisodesButton from '../components/CheckEpisodesButton';
import { Button, ErrorState, Loading, ScreenHeader } from '../components/ui';
import { colors, fonts, radius, space } from '../theme';

const SOURCE_ICON = { youtube: 'play-circle', link: 'open-outline', none: 'lock-closed-outline' };

const openLink = (url) => Linking.openURL(url).catch(() => {});

const SAVE_EVERY_SECONDS = 15;


// Plays one episode: in the app from an official YouTube channel, or opens the official site.
// route.params: { animeId, episode }
const WatchScreen = ({ route, navigation }) => {
  const { animeId } = route.params;
  const { width } = useWindowDimensions();
  const { recordWatch, watchProgress, signedIn, findInWatchList, setListStatus } = useContext(myContext);
  const [anime, setAnime] = useState(null);
  const [error, setError] = useState(null);
  const [number, setNumber] = useState(route.params.episode ?? 1);
  // The episode number the person chose to start over (ignores the saved position once).
  const [startOver, setStartOver] = useState(null);
  // Which of the episode's videos is playing (a backup when YouTube blocks the main one here).
  const [source, setSource] = useState({ number: null, index: 0 });
  // Where the episode started when it was opened. Fixed while it plays, so the progress saved along
  // the way doesn't move the "Resumed at" chip.
  const [opening, setOpening] = useState({ key: null, at: 0 });
  const latest = useRef(null);
  const lastSaved = useRef(0);

  const load = useCallback(async () => {
    try {
      setAnime(await getAnimeInfo(animeId));
    } catch (e) {
      setError(e.message);
    }
  }, [animeId]);

  // Loads again when newer data arrives (a downloaded list or snapshot, live AniList details).
  const dataVersion = useDataVersion();
  useEffect(() => {
    load();
  }, [load, dataVersion]);

  // The saved data shows at once; AniList's latest (status, next episode) follows when it differs.
  useEffect(() => {
    refreshAnimeLive(animeId);
  }, [animeId]);

  const episode = anime?.episodes.find((e) => e.number === number);

  // On My List: starting an episode marks the anime Watching; finishing the last episode of a show
  // that finished airing marks it Completed (see listStatus.js).
  const updateListStatus = (forAnime, episodeNumber, finishedEpisode) => {
    const entry = findInWatchList(forAnime.id);
    if (!entry) return;
    const next = statusAfterWatching({
      current: statusOf(entry),
      episode: episodeNumber,
      totalEpisodes: forAnime.totalEpisodes ?? forAnime.episodes.length,
      finishedEpisode,
      finishedAiring: forAnime.status === 'Completed',
    });
    if (next) setListStatus(entry.id, next).catch((e) => console.warn('status update failed', e));
  };

  // Remember what was watched, for My List > History.
  useEffect(() => {
    if (anime && episode && episode.source !== 'none') {
      recordWatch(anime, episode.number).catch((e) => console.warn('history update failed', e));
      updateListStatus(anime, episode.number, false);
    }
    // Only when the episode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anime?.id, episode?.number]);

  // Save the position every few seconds while playing, and once more when leaving the episode.
  const saveProgress = (entry) => {
    if (!entry) return;
    lastSaved.current = entry.position;
    recordWatch(entry.anime, entry.number, entry).catch((e) => console.warn('progress save failed', e));
    if (isFinished(entry)) updateListStatus(entry.anime, entry.number, true);
  };
  const onProgress = ({ position, duration }) => {
    latest.current = { anime, number, position, duration };
    if (Math.abs(position - lastSaved.current) >= SAVE_EVERY_SECONDS) saveProgress(latest.current);
  };
  useEffect(
    () => () => {
      // Leaving this episode (next/previous, back, or closing the screen).
      saveProgress(latest.current);
      latest.current = null;
      lastSaved.current = 0;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [number]
  );

  const openKey = anime ? `${anime.id}-${number}-${startOver === number}` : null;
  if (openKey && opening.key !== openKey) {
    setOpening({ key: openKey, at: startOver === number ? 0 : resumePoint(watchProgress(anime.id, number)) });
  }

  if (error) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title="Watch" onBack={() => navigation.goBack()} />
        <ErrorState message={error} onRetry={() => { setError(null); load(); }} />
      </SafeAreaView>
    );
  }
  if (!anime) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title="Watch" onBack={() => navigation.goBack()} />
        <Loading />
      </SafeAreaView>
    );
  }

  const total = anime.episodes.length;
  const isMovie = anime.type === 'Movie' && total === 1;
  const playerWidth = width - space.xl * 2;
  const hasPrev = number > 1;
  const hasNext = number < total;
  const goTo = (n) => setNumber(n);
  const startAt = opening.key === openKey ? opening.at : 0;
  const sourceIndex = source.number === number ? source.index : 0;
  const nextEpisode = anime.episodes.find((e) => e.number === number + 1);
  const upNextTitle = `Episode ${number + 1}${nextEpisode?.title ? ` · ${nextEpisode.title}` : ''}`;
  const playingFrom = episode?.youtube
    ? [episode.youtube, ...episode.youtube.alternatives][sourceIndex] ?? episode.youtube
    : null;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title={anime.title} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {!episode ? (
          <View style={styles.card}>
            <Text style={styles.cardText}>This episode isn’t listed yet.</Text>
          </View>
        ) : episode.source === 'youtube' ? (
          <View style={{ gap: space.sm }}>
            <View style={styles.fullBleed}>
              <VideoPlayer
                // One player for every episode, so fullscreen carries on into the next one;
                // "Start over" makes a fresh one.
                key={startOver === number ? `start-${number}` : 'player'}
                videoId={episode.youtube.videoId}
                alternatives={episode.youtube.alternatives.map((v) => v.videoId)}
                onSourceChange={(index) => setSource({ number, index })}
                width={width}
                fullBleed
                label="Episode"
                startAt={startAt}
                onProgress={onProgress}
                upNext={hasNext ? { title: upNextTitle, onPlay: () => goTo(number + 1) } : null}
                fallback={episode.link ? { title: `Watch on ${episode.link.site}`, onPress: () => openLink(episode.link.url) } : null}
              />
            </View>
            {!signedIn && (
              <Pressable
                onPress={() => navigation.navigate('SignUpAndSignIn', { reason: 'Sign in to save your progress and continue episodes later.' })}
                style={styles.guestHint}
                accessibilityRole="button"
              >
                <Ionicons name="bookmark-outline" size={14} color={colors.muted} />
                <Text style={styles.guestHintText}>
                  <Text style={styles.startOver}>Sign in</Text> to save your progress and continue later.
                </Text>
              </Pressable>
            )}
            {startAt > 0 && (
              <View style={styles.resumeChip}>
                <Ionicons name="play-forward" size={14} color={colors.accent} />
                <Text style={styles.resumeText}>Resumed at {formatTime(startAt)}</Text>
                <Pressable onPress={() => setStartOver(number)} hitSlop={8} accessibilityRole="button">
                  <Text style={styles.startOver}>Start over</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : episode.source === 'link' ? (
          <Pressable onPress={() => openLink(episode.link.url)} style={[styles.linkCard, { height: (playerWidth * 9) / 16 }]}>
            {episode.thumbnail ? <Image source={{ uri: episode.thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
            <View style={styles.linkShade} />
            <View style={styles.linkButton}>
              <Ionicons name="open-outline" size={18} color={colors.onAccent} />
              <Text style={styles.linkButtonText}>Watch on {episode.link.site}</Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.card}>
            <Ionicons name="time-outline" size={28} color={colors.accent} />
            <Text style={styles.cardTitle}>Not free to watch yet</Text>
            <Text style={styles.cardText}>
              {anime.watchLinks.length
                ? 'No official channel streams this episode for free yet. You can watch it on an official service:'
                : 'No official channel streams this episode for free yet.'}
            </Text>
            {/* The official services for this anime, so this is never a dead end. */}
            {anime.watchLinks.length > 0 && (
              <View style={styles.services}>
                {anime.watchLinks.map((link) => (
                  <Button key={link.url} title={`Watch on ${link.site}`} icon="open-outline" variant="ghost" onPress={() => openLink(link.url)} />
                ))}
              </View>
            )}
            <View style={styles.services}>
              <CheckEpisodesButton />
            </View>
          </View>
        )}

        {episode ? (
          <View style={{ gap: 6 }}>
            <Text style={styles.epLabel}>{isMovie ? 'Movie' : `Episode ${episode.number} of ${total}`}</Text>
            {episode.title ? <Text style={styles.epTitle}>{episode.title}</Text> : null}
            {episode.source === 'youtube' ? (
              <View style={styles.badge}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={styles.badgeText} numberOfLines={1}>Official · {playingFrom.channel} on YouTube</Text>
              </View>
            ) : episode.source === 'link' ? (
              <Text style={styles.muted}>Opens {episode.link.site}, the official streaming service.</Text>
            ) : null}
          </View>
        ) : null}

        {/* A movie is a single video: no Previous / Next or episode list. */}
        {!isMovie && (
          <>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <Button title="Previous" icon="play-back" variant="ghost" onPress={() => goTo(number - 1)} disabled={!hasPrev} style={{ flex: 1 }} />
              <Button title="Next" icon="play-forward" onPress={() => goTo(number + 1)} disabled={!hasNext} style={{ flex: 1 }} />
            </View>

            <View style={{ gap: space.sm }}>
              <Text style={styles.sectionTitle}>Episodes</Text>
              {anime.episodes.map((ep) => {
                const current = ep.number === number;
                const progress = watchProgress(anime.id, ep.number);
                const fraction = progressFraction(progress);
                const label = progressLabel(progress);
                return (
                  <Pressable
                    key={ep.id}
                    onPress={() => goTo(ep.number)}
                    style={[styles.row, current && styles.rowCurrent]}
                    accessibilityState={{ selected: current }}
                  >
                    <View style={styles.rowThumb}>
                      {ep.thumbnail ? <Image source={{ uri: ep.thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
                      <Text style={styles.rowNum}>{ep.number}</Text>
                      {fraction > 0 && (
                        <View style={styles.thumbBar}>
                          <View style={[styles.thumbBarFill, { width: `${fraction * 100}%` }]} />
                        </View>
                      )}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.rowTitle, current && { color: colors.accent }]} numberOfLines={1}>
                        {ep.title ?? `Episode ${ep.number}`}
                      </Text>
                      <Text style={styles.muted} numberOfLines={1}>
                        {label ?? (ep.source === 'youtube' ? 'Plays in the app' : ep.source === 'link' ? `Opens ${ep.link.site}` : 'Not available yet')}
                      </Text>
                    </View>
                    <Ionicons name={SOURCE_ICON[ep.source]} size={18} color={ep.source === 'none' ? colors.muted : colors.text} />
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.xl },
  // The video spans the whole screen width, past the page's side padding.
  fullBleed: { marginHorizontal: -space.xl },
  card: {
    padding: space.xl,
    gap: space.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  cardTitle: { fontFamily: fonts.displaySemi, fontSize: 18, color: colors.text, textAlign: 'center' },
  cardText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.textSoft, textAlign: 'center' },
  linkCard: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  linkShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(14,15,20,0.45)' },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 46,
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
  linkButtonText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onAccent },
  epLabel: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.accent },
  epTitle: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, color: colors.text },
  badge: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.successSoft,
  },
  badgeText: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 12, color: colors.success },
  muted: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  sectionTitle: { fontFamily: fonts.displaySemi, fontSize: 19, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, borderRadius: radius.md },
  rowCurrent: { backgroundColor: colors.surface },
  rowThumb: {
    width: 96,
    height: 54,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowNum: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.text,
    backgroundColor: 'rgba(14,15,20,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  thumbBar: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.25)' },
  thumbBarFill: { height: 3, backgroundColor: colors.accent },
  services: { alignSelf: 'stretch', gap: space.sm },
  guestHint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  guestHintText: { flexShrink: 1, fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  resumeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,122,89,0.12)',
  },
  resumeText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.text },
  startOver: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accent },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
});

export default WatchScreen;
