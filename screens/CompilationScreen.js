import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { compilationParts, useDataVersion } from '../api';
import { lengthLabel, partTitle, useCompilationProgress } from '../compilationTools';
import { formatTime, progressFraction, progressLabel, resumePoint } from '../progress';
import VideoPlayer from '../components/VideoPlayer';
import { ScreenHeader } from '../components/ui';
import { colors, fonts, radius, space } from '../theme';

const SAVE_EVERY_SECONDS = 15;

// Plays an anime's compilation (a season recut into a few long videos), one part after another.
// Where each part was left is kept on the phone, so a 2-hour video can be finished later.
// route.params: { animeId, title, part }
const CompilationScreen = ({ route, navigation }) => {
  const { animeId, title } = route.params;
  const { width } = useWindowDimensions();
  useDataVersion(); // shows a newer downloaded episode list
  const parts = compilationParts(animeId);
  const [partNumber, setPartNumber] = useState(route.params.part ?? parts[0]?.part);
  const [positions, savePosition] = useCompilationProgress(animeId);
  const lastSaved = useRef(0);
  // Where the part started when it was opened (fixed while it plays).
  const [opening, setOpening] = useState({ part: null, at: 0 });

  const index = Math.max(0, parts.findIndex((p) => p.part === partNumber));
  const part = parts[index];
  if (part && opening.part !== part.part) {
    setOpening({ part: part.part, at: resumePoint(positions[part.videoId] ?? { position: 0, duration: 0 }) });
  }

  if (!part) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title={title} onBack={() => navigation.goBack()} />
        <View style={styles.card}>
          <Text style={styles.muted}>This compilation isn’t available any more.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const next = parts[index + 1];
  const onProgress = ({ position, duration }) => {
    if (Math.abs(position - lastSaved.current) < SAVE_EVERY_SECONDS) return;
    lastSaved.current = position;
    savePosition(part.videoId, { position, duration });
  };
  const goTo = (p) => {
    lastSaved.current = 0;
    setPartNumber(p.part);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title={title} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={{ gap: space.sm }}>
          <View style={styles.fullBleed}>
            <VideoPlayer
              key="player"
              videoId={part.videoId}
              width={width}
              fullBleed
              label="Compilation"
              startAt={opening.part === part.part ? opening.at : 0}
              onProgress={onProgress}
              upNext={next ? { title: `Compilation · ${partTitle(parts, next)}`, onPlay: () => goTo(next) } : null}
            />
          </View>
          {opening.part === part.part && opening.at > 0 && (
            <View style={styles.resumeChip}>
              <Ionicons name="play-forward" size={14} color={colors.accent} />
              <Text style={styles.resumeText}>Resumed at {formatTime(opening.at)}</Text>
            </View>
          )}
        </View>

        <View style={{ gap: 6 }}>
          <Text style={styles.label}>{parts.length > 1 ? `Compilation · part ${part.part} of ${parts.length}` : 'Compilation'}</Text>
          <Text style={styles.muted}>The series recut into {parts.length > 1 ? `${parts.length} long videos` : 'one long video'} by the official channel.</Text>
          <View style={styles.badge}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={styles.badgeText} numberOfLines={1}>Official · {part.channel} on YouTube</Text>
          </View>
        </View>

        {parts.length > 1 && (
          <View style={{ gap: space.sm }}>
            <Text style={styles.sectionTitle}>Parts</Text>
            {parts.map((p) => {
              const current = p.part === part.part;
              const progress = positions[p.videoId] ?? { position: 0, duration: 0 };
              const fraction = progressFraction(progress);
              return (
                <Pressable key={p.videoId} onPress={() => goTo(p)} style={[styles.row, current && styles.rowCurrent]} accessibilityState={{ selected: current }}>
                  <View style={styles.rowThumb}>
                    <Image source={{ uri: `https://i.ytimg.com/vi/${p.videoId}/mqdefault.jpg` }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    <Text style={styles.rowNum}>{`PART ${p.part}`}</Text>
                    {fraction > 0 && (
                      <View style={styles.thumbBar}>
                        <View style={[styles.thumbBarFill, { width: `${fraction * 100}%` }]} />
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.rowTitle, current && { color: colors.accent }]} numberOfLines={1}>{partTitle(parts, p)}</Text>
                    <Text style={styles.muted} numberOfLines={1}>{progressLabel(progress) ?? lengthLabel(p.minutes)}</Text>
                  </View>
                  <Ionicons name="play-circle" size={18} color={colors.text} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.xl },
  fullBleed: { marginHorizontal: -space.xl },
  card: { margin: space.xl, padding: space.xl, borderRadius: radius.lg, backgroundColor: colors.surface, alignItems: 'center' },
  label: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.accent },
  muted: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
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
  sectionTitle: { fontFamily: fonts.displaySemi, fontSize: 19, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, borderRadius: radius.md },
  rowCurrent: { backgroundColor: colors.surface },
  rowThumb: { width: 96, height: 54, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  rowNum: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.text,
    backgroundColor: 'rgba(14,15,20,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  thumbBar: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.25)' },
  thumbBarFill: { height: 3, backgroundColor: colors.accent },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
});

export default CompilationScreen;
