import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, useWindowDimensions, AccessibilityInfo, AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { myContext } from '../context';
import { useRequireAccount } from '../requireAccount';
import { Button } from './ui';
import YouTubeView from './YouTubeView';
import { freeEpisodeToStart, hasFreeEpisodes } from '../api';
import { historyProgress } from '../progress';
import { colors, fonts, space } from '../theme';

const AUTO_ADVANCE_MS = 6000;
const HERO_HEIGHT = 460;
// Trailer clips: they start once a banner has stayed in place for a moment, play muted for up to
// CLIP_MS, and give up (keeping the poster) if they haven't started after CLIP_TIMEOUT_MS.
const CLIP_DELAY_MS = 900;
const CLIP_MS = 20000;
const CLIP_TIMEOUT_MS = 10000;
// The clip fills the top of the banner, cropped at the sides like a cover image.
const CLIP_HEIGHT = Math.round(HERO_HEIGHT * 0.62);
const CLIP_WIDTH = Math.round((CLIP_HEIGHT * 16) / 9);

// A muted trailer over the top of a banner. It stays invisible until the video is actually moving,
// so a slow or failed load just leaves the poster. onState('playing' | 'ended' | 'failed').
const HeroClip = ({ videoId, cardWidth, onState }) => {
  const player = useRef(null);
  const [shown] = useState(() => new Animated.Value(0));
  const playing = useRef(false);
  const done = useRef(false);

  const finish = useCallback(
    (state) => {
      if (done.current) return;
      done.current = true;
      onState(state);
    },
    [onState]
  );

  useEffect(() => {
    const timer = setTimeout(() => !playing.current && finish('failed'), CLIP_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [finish]);

  const onStatus = (status) => {
    if (!status.muted) player.current?.mute(true);
    if (status.ended) {
      finish('ended');
      return;
    }
    if (!playing.current && !status.paused && status.current > 0.2) {
      playing.current = true;
      player.current?.quality('medium');
      Animated.timing(shown, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      onState('playing');
    }
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: shown }]} pointerEvents="none">
      {/* The whole poster gives way to the page colour, and the clip fades into it. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />
      <View style={styles.clip}>
        <YouTubeView
          ref={player}
          videoId={videoId}
          muted
          onStatus={onStatus}
          onError={() => finish('failed')}
          style={{ position: 'absolute', top: 0, height: CLIP_HEIGHT, width: CLIP_WIDTH, left: (cardWidth - CLIP_WIDTH) / 2 }}
        />
        <LinearGradient
          colors={['rgba(14,15,20,0)', colors.bg]}
          style={{ position: 'absolute', left: 0, right: 0, top: CLIP_HEIGHT * 0.55, height: CLIP_HEIGHT * 0.45 + 1 }}
        />
      </View>
    </Animated.View>
  );
};

const HeroSlide = ({ anime, rank, onOpen, onWatch, clip, cardWidth, onClipState }) => {
  const { findInWatchList, addToWatchList, removeFromWatchList, historyRecords } = useContext(myContext);
  const [saving, setSaving] = useState(false);
  const requireAccount = useRequireAccount();
  const saved = findInWatchList(anime.id);
  const record = historyRecords.find((r) => String(r.data.titleId) === String(anime.id));
  const startEp = freeEpisodeToStart(anime.id, record ? historyProgress(record.data).continueEp : null);

  const toggleList = () => requireAccount(saveToList, 'Sign in to save anime to My List.');
  const saveToList = async () => {
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

  return (
    <Pressable onPress={() => onOpen(anime)} style={styles.hero} accessibilityRole="button" accessibilityLabel={`Open ${anime.title}`}>
      {/* The poster fills the card and fades into the page, with the text on the fade. */}
      <Image
        source={{ uri: anime.image }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="top"
        transition={400}
      />
      {clip ? <HeroClip key={clip} videoId={clip} cardWidth={cardWidth} onState={onClipState} /> : null}
      <LinearGradient
        colors={['rgba(14,15,20,0)', 'rgba(14,15,20,0.55)', colors.bg]}
        locations={[0.3, 0.58, 0.92]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.panel}>
        <View style={styles.eyebrowRow}>
          <Text style={styles.eyebrow}>#{rank} Trending this week</Text>
          {hasFreeEpisodes(anime.id) && (
            <View style={styles.freePill}>
              <Ionicons name="play" size={10} color={colors.onAccent} />
              <Text style={styles.freePillText}>Watch free</Text>
            </View>
          )}
        </View>
        <Text style={styles.title} numberOfLines={2}>{anime.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[anime.type, anime.totalEpisodes ? `${anime.totalEpisodes} episode${anime.totalEpisodes === 1 ? '' : 's'}` : null, ...anime.genres.slice(0, 2)].filter(Boolean).join(' · ')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, paddingTop: 4 }}>
          {startEp ? (
            <Button
              title={record ? `Episode ${startEp}` : 'Watch free'}
              icon="play"
              onPress={() => onWatch(anime, startEp)}
              style={{ flex: 1 }}
            />
          ) : (
            <Button title="Details" icon="information-circle" onPress={() => onOpen(anime)} style={{ flex: 1 }} />
          )}
          <Button
            title={saved ? 'In My List' : 'My List'}
            icon={saved ? 'checkmark' : 'add'}
            variant="ghost"
            onPress={toggleList}
            loading={saving}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </Pressable>
  );
};

// The top trending anime as full-width banners that pop in one after another. With `clips`, the
// banner in view plays its trailer muted (one at a time, only while Home is on screen and the app
// is open).
const HeroCarousel = ({ items, onOpen, onWatch, clips }) => {
  const { width } = useWindowDimensions();
  const focused = useIsFocused();
  const list = useRef(null);
  const [scrollX] = useState(() => new Animated.Value(0));
  const [index, setIndex] = useState(0);
  const [touching, setTouching] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  // The banner index that has stayed in place long enough for a clip, and the anime whose clip is playing.
  const [settledAt, setSettledAt] = useState(-1);
  const [playingId, setPlayingId] = useState(null);
  const [clipFailed, setClipFailed] = useState(() => new Set());

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setAppActive(state === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  const goTo = useCallback(
    (i) => {
      list.current?.scrollToOffset({ offset: i * width, animated: true });
      setIndex(i);
    },
    [width]
  );

  // Clips never play with reduced motion on, or off screen.
  const clipsOn = clips && focused && appActive && !reduceMotion;
  const current = items[index];
  const settled = settledAt === index && !touching;
  const clip = clipsOn && settled && current?.trailer && !clipFailed.has(current.id) ? current.trailer : null;

  // A clip waits until the banner has stopped moving.
  useEffect(() => {
    if (touching) return undefined;
    const t = setTimeout(() => setSettledAt(index), CLIP_DELAY_MS);
    return () => clearTimeout(t);
  }, [index, touching]);

  const next = useCallback(() => items.length > 1 && goTo((index + 1) % items.length), [items.length, index, goTo]);

  const onClipState = useCallback(
    (state) => {
      if (state === 'playing') setPlayingId(current?.id);
      else if (state === 'ended') next();
      else {
        // A trailer that won't play here (blocked, region-locked, slow) isn't tried again.
        setPlayingId(null);
        setClipFailed((failed) => new Set(failed).add(current?.id));
      }
    },
    [next, current?.id]
  );

  // Move to the next banner every few seconds (or when its clip has played a while), unless the
  // person is busy with the carousel.
  const playingClip = !!clip && playingId === current?.id;
  useEffect(() => {
    if (touching || !focused || reduceMotion || items.length < 2) return undefined;
    const t = setTimeout(next, playingClip ? CLIP_MS : AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
  }, [index, touching, focused, reduceMotion, items.length, next, playingClip]);

  const onScrollEnd = (e) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
    setTouching(false);
  };

  return (
    <View style={{ gap: space.md }}>
      <Animated.FlatList
        ref={list}
        data={items}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(a) => String(a.id)}
        extraData={`${index}:${clip}`}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => setTouching(true)}
        onMomentumScrollEnd={onScrollEnd}
        renderItem={({ item, index: i }) => {
          const range = [(i - 1) * width, i * width, (i + 1) * width];
          const scale = scrollX.interpolate({ inputRange: range, outputRange: [0.86, 1, 0.86], extrapolate: 'clamp' });
          const opacity = scrollX.interpolate({ inputRange: range, outputRange: [0.4, 1, 0.4], extrapolate: 'clamp' });
          const translateY = scrollX.interpolate({ inputRange: range, outputRange: [24, 0, 24], extrapolate: 'clamp' });
          return (
            <View style={{ width }}>
              <Animated.View style={{ opacity, transform: [{ scale }, { translateY }] }}>
                <HeroSlide
                  anime={item}
                  rank={i + 1}
                  onOpen={onOpen}
                  onWatch={onWatch}
                  clip={i === index ? clip : null}
                  cardWidth={width}
                  onClipState={onClipState}
                />
              </Animated.View>
            </View>
          );
        }}
      />

      <View style={styles.dots} accessibilityRole="tablist">
        {items.map((a, i) => (
          <Pressable
            key={a.id}
            onPress={() => goTo(i)}
            hitSlop={{ top: 12, bottom: 12, left: 4, right: 4 }}
            accessibilityRole="tab"
            accessibilityState={{ selected: index === i }}
            accessibilityLabel={`Show #${i + 1}, ${a.title}`}
          >
            <View style={[styles.dot, index === i && styles.dotActive]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: {
    height: HERO_HEIGHT,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: colors.bg,
  },
  clip: { position: 'absolute', top: 0, left: 0, right: 0, height: CLIP_HEIGHT, overflow: 'hidden' },
  panel: { padding: space.xl, paddingTop: 0, gap: 10 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  freePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: colors.accent,
  },
  freePillText: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.onAccent },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.accent },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 31, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.textSoft },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  dotActive: { width: 24, backgroundColor: colors.accent },
});

export default HeroCarousel;
