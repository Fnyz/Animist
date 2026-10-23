import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, useWindowDimensions, AccessibilityInfo } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Image } from 'expo-image';
import { myContext } from '../context';
import { Button } from './ui';
import { colors, fonts, radius, space } from '../theme';

const AUTO_ADVANCE_MS = 6000;
const HERO_HEIGHT = 420;

const HeroSlide = ({ anime, rank, onOpen, onTrailer }) => {
  const { findInWatchList, addToWatchList, removeFromWatchList } = useContext(myContext);
  const [saving, setSaving] = useState(false);
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

  return (
    <Pressable onPress={() => onOpen(anime)} style={styles.hero} accessibilityRole="button" accessibilityLabel={`Open ${anime.title}`}>
      <Image source={{ uri: anime.banner }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
      <View style={styles.panel}>
        <Text style={styles.eyebrow}>#{rank} Trending this week</Text>
        <Text style={styles.title} numberOfLines={2}>{anime.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[anime.type, anime.totalEpisodes ? `${anime.totalEpisodes} episodes` : null, ...anime.genres.slice(0, 2)].filter(Boolean).join(' · ')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, paddingTop: 4 }}>
          {anime.trailer ? (
            <Button title="Watch trailer" icon="play" onPress={() => onTrailer(anime)} style={{ flex: 1 }} />
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

// The top trending anime as banners that pop in one after another.
const HeroCarousel = ({ items, onOpen, onTrailer, paused }) => {
  const { width } = useWindowDimensions();
  const focused = useIsFocused();
  const list = useRef(null);
  const [scrollX] = useState(() => new Animated.Value(0));
  const [index, setIndex] = useState(0);
  const [touching, setTouching] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

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

  // Move to the next banner every few seconds, unless the person is busy with the carousel.
  useEffect(() => {
    if (paused || touching || !focused || reduceMotion || items.length < 2) return undefined;
    const t = setTimeout(() => goTo((index + 1) % items.length), AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
  }, [index, paused, touching, focused, reduceMotion, items.length, goTo]);

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
            <View style={{ width, paddingHorizontal: space.xl }}>
              <Animated.View style={{ opacity, transform: [{ scale }, { translateY }] }}>
                <HeroSlide anime={item} rank={i + 1} onOpen={onOpen} onTrailer={onTrailer} />
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
    borderRadius: radius.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: colors.surface2,
  },
  panel: { padding: space.xl, gap: 10, backgroundColor: colors.scrim },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.accent },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 31, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.textSoft },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  dotActive: { width: 24, backgroundColor: colors.accent },
});

export default HeroCarousel;
