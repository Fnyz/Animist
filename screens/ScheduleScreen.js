import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getSchedule } from '../api';
import { myContext } from '../context';
import { airTime, countdown, groupByDay, scheduleDays } from '../schedule';
import { Chip, EmptyState, ErrorState, Loading, WatchBadge } from '../components/ui';
import { colors, fonts, radius, space } from '../theme';

const Row = ({ item, now, onOpen }) => {
  const label = countdown(item.airingAt, now);
  const aired = label === 'Aired';
  return (
    <Pressable onPress={() => onOpen(item.anime)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]} accessibilityRole="button">
      <View style={styles.time}>
        <Text style={[styles.timeText, aired && { color: colors.muted }]}>{airTime(item.airingAt)}</Text>
      </View>
      <View style={styles.thumb}>
        <Image source={{ uri: item.anime.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        <WatchBadge id={item.anime.id} size={18} style={styles.thumbBadge} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.title} numberOfLines={2}>{item.anime.title}</Text>
        <Text style={styles.meta}>Episode {item.episode}</Text>
      </View>
      <View style={[styles.pill, aired && styles.pillAired]}>
        <Text style={[styles.pillText, aired && { color: colors.muted }]}>{label}</Text>
      </View>
    </Pressable>
  );
};

// What airs each day this week, in the phone's time zone, with countdowns.
const ScheduleScreen = ({ navigation }) => {
  const { signedIn, findInWatchList } = useContext(myContext);
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const days = useMemo(() => scheduleDays(new Date(now)), [now]);
  const [day, setDay] = useState(() => days[0].key);
  const [mineOnly, setMineOnly] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await getSchedule());
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Keeps the countdowns current.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const byDay = useMemo(() => {
    const listed = mineOnly ? (items ?? []).filter((item) => findInWatchList(item.anime.id)) : items ?? [];
    return groupByDay(listed);
  }, [items, mineOnly, findInWatchList]);

  const open = (anime) => navigation.navigate('AnimeDetail', { animeId: anime.id });
  const shown = byDay[day] ?? [];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.top}>
        <Text style={styles.heading}>Schedule</Text>
        <Text style={styles.sub}>New episodes this week, in your time zone.</Text>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
          {days.map((d) => (
            <Chip key={d.key} label={`${d.label}${byDay[d.key] ? ` · ${byDay[d.key].length}` : ''}`} active={day === d.key} onPress={() => setDay(d.key)} />
          ))}
        </ScrollView>
      </View>

      {signedIn && (
        <Pressable onPress={() => setMineOnly((v) => !v)} style={styles.toggle} accessibilityRole="switch" accessibilityState={{ checked: mineOnly }}>
          <Ionicons name={mineOnly ? 'checkbox' : 'square-outline'} size={20} color={colors.accent} />
          <Text style={styles.toggleText}>Only anime on My List</Text>
        </Pressable>
      )}

      {error && !items ? (
        <ErrorState message={error} onRetry={load} />
      ) : !items ? (
        <Loading />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(item) => `${item.anime.id}-${item.episode}`}
          renderItem={({ item }) => <Row item={item} now={now} onOpen={open} />}
          contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: space.xxl, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title={mineOnly ? 'None of your anime air this day' : 'Nothing airs this day'}
              message={mineOnly ? 'Turn off "Only anime on My List" to see everything.' : 'Pick another day above.'}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  top: { paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.md, gap: 2 },
  heading: { fontFamily: fonts.display, fontSize: 28, color: colors.text },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  days: { paddingHorizontal: space.xl, gap: space.sm, paddingBottom: space.md },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.xl, paddingBottom: space.md },
  toggleText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textSoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  time: { width: 62 },
  timeText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text, fontVariant: ['tabular-nums'] },
  thumb: { width: 54, height: 76, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.surface2 },
  thumbBadge: { position: 'absolute', top: 4, right: 4 },
  title: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.textSoft },
  pill: { paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: 'center', backgroundColor: 'rgba(255,122,89,0.14)' },
  pillAired: { backgroundColor: colors.surface2 },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.accent, fontVariant: ['tabular-nums'] },
});

export default ScheduleScreen;
