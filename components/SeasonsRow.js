import React from 'react';
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getSeasons } from '../api';
import { colors, fonts, radius, space } from '../theme';

const FORMAT = { TV: 'TV', TV_SHORT: 'TV Short', ONA: 'ONA', MOVIE: 'Movie', OVA: 'OVA', SPECIAL: 'Special', MUSIC: 'Music' };
const CARD = 112;

const Part = ({ part, onOpen }) => (
  <Pressable
    onPress={() => !part.current && onOpen(part.id)}
    style={({ pressed }) => [styles.card, pressed && !part.current && { opacity: 0.8 }]}
    accessibilityRole="button"
    accessibilityState={{ selected: part.current }}
    accessibilityLabel={`${part.title}${part.current ? ', this one' : ''}`}
  >
    <View style={[styles.cover, part.current && styles.coverCurrent]}>
      {part.cover ? <Image source={{ uri: part.cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
      {part.free && (
        <View style={styles.free}>
          <Ionicons name="play" size={10} color={colors.onAccent} />
        </View>
      )}
      {part.current && <Text style={styles.here}>Viewing</Text>}
    </View>
    <Text style={styles.title} numberOfLines={2}>{part.title}</Text>
    <Text style={styles.meta} numberOfLines={1}>
      {[FORMAT[part.format] ?? 'Upcoming', part.year, part.episodes && part.format !== 'MOVIE' ? `${part.episodes} eps` : null].filter(Boolean).join(' · ')}
    </Text>
  </Pressable>
);

const Shelf = ({ title, parts, onOpen }) => {
  // Long franchises open at the anime being viewed; short rows (and the first cards) simply start
  // at the left, however few cards there are.
  const current = parts.findIndex((p) => p.current);
  return (
    <View style={styles.shelf}>
      <Text style={styles.heading}>{title}</Text>
      <FlatList
        horizontal
        data={parts}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => <Part part={item} onOpen={onOpen} />}
        style={styles.shelfList}
        contentContainerStyle={styles.shelfContent}
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={current > 1 ? current : undefined}
        getItemLayout={(_, i) => ({ length: CARD + space.md, offset: (CARD + space.md) * i, index: i })}
      />
    </View>
  );
};

// An anime page's other parts: its seasons in release order, then movies, OVAs and specials.
// Nothing when the anime stands alone.
const SeasonsRow = ({ animeId, onOpen }) => {
  const franchise = getSeasons(animeId);
  if (!franchise) return null;
  const { seasons, extras } = franchise;
  return (
    <View style={styles.wrap}>
      {seasons.length > 1 || (seasons.length === 1 && !seasons[0].current) ? (
        <Shelf title="Seasons" parts={seasons} onOpen={onOpen} />
      ) : null}
      {extras.length > 0 ? <Shelf title="Movies & specials" parts={extras} onOpen={onOpen} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { paddingTop: space.xxl, gap: space.xl },
  shelf: { gap: space.md, alignSelf: 'stretch' },
  shelfList: { alignSelf: 'stretch', flexGrow: 0 },
  shelfContent: { flexGrow: 1, justifyContent: 'flex-start', paddingHorizontal: space.xl, gap: space.md },
  heading: { fontFamily: fonts.displaySemi, fontSize: 19, color: colors.text, paddingHorizontal: space.xl },
  card: { width: CARD, gap: 4 },
  cover: { width: CARD, height: CARD * 1.42, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface2, marginBottom: 4 },
  coverCurrent: { borderWidth: 2, borderColor: colors.accent },
  free: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  here: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 3,
    textAlign: 'center',
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.onAccent,
    backgroundColor: colors.accent,
  },
  title: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: 11, color: colors.textSoft },
});

export default SeasonsRow;
