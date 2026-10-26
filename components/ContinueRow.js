import React from 'react';
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { episodeCount, episodeThumbnail } from '../api';
import { byLatest, historyProgress, progressFraction, progressLabel } from '../progress';
import { colors, fonts, radius, space } from '../theme';

const CARD_WIDTH = 240;
const MAX_ITEMS = 10;

// What to show from the watch history: unfinished episodes, and finished ones that have a next
// episode, newest first.
export const continueItems = (historyRecords) =>
  [...historyRecords]
    .sort(byLatest)
    .map((record) => ({ record, ...historyProgress(record.data) }))
    .filter(({ record, done, episode }) => {
      const count = episodeCount(record.data.titleId);
      return !(done && count && episode >= count);
    })
    .slice(0, MAX_ITEMS);

// Home's "Continue watching": one tap back into the episode you were watching (or the next one).
const ContinueRow = ({ historyRecords, onPlay }) => {
  const items = continueItems(historyRecords);
  if (!items.length) return null;

  return (
    <View style={{ gap: space.md }}>
      <Text style={styles.heading}>Continue watching</Text>
      <FlatList
        horizontal
        data={items}
        keyExtractor={({ record }) => record.id}
        renderItem={({ item: { record, progress, done, continueEp } }) => {
          const { titleId, title, image } = record.data;
          const fraction = done ? 0 : progressFraction(progress);
          const label = done ? 'Up next' : progressLabel(progress) ?? 'Just started';
          return (
            <Pressable
              onPress={() => onPlay(titleId, continueEp)}
              style={styles.card}
              accessibilityRole="button"
              accessibilityLabel={`${done ? 'Play' : 'Continue'} episode ${continueEp} of ${title || 'this anime'}`}
            >
              <View style={styles.thumb}>
                <Image
                  source={{ uri: episodeThumbnail(titleId, continueEp) ?? image }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.playDot}>
                  <Ionicons name="play" size={16} color={colors.onAccent} />
                </View>
                {fraction > 0 && (
                  <View style={styles.bar}>
                    <View style={[styles.barFill, { width: `${fraction * 100}%` }]} />
                  </View>
                )}
              </View>
              <Text style={styles.title} numberOfLines={1}>{title || `Anime #${titleId}`}</Text>
              <Text style={styles.meta} numberOfLines={1}>EP {continueEp} · {label}</Text>
            </Pressable>
          );
        }}
        contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.md }}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  heading: { fontFamily: fonts.displaySemi, fontSize: 19, color: colors.text, paddingHorizontal: space.xl },
  card: { width: CARD_WIDTH, gap: 4 },
  thumb: {
    width: CARD_WIDTH,
    height: (CARD_WIDTH * 9) / 16,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  playDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, backgroundColor: 'rgba(0,0,0,0.5)' },
  barFill: { height: 4, backgroundColor: colors.accent },
  title: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.textSoft },
});

export default ContinueRow;
