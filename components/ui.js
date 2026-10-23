// Shared building blocks for the redesigned screens.
import React from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, space } from '../theme';

// The logo: "Ani" in white, "mist" in coral.
export const Wordmark = ({ size = 28, style }) => (
  <Text style={[styles.wordmark, { fontSize: size, letterSpacing: size > 40 ? -1.5 : -0.5 }, style]} accessibilityRole="header">
    Ani<Text style={{ color: colors.accent }}>mist</Text>
  </Text>
);

export const Title = ({ children, style, ...rest }) => (
  <Text style={[styles.title, style]} {...rest}>{children}</Text>
);

export const Label = ({ children, style, ...rest }) => (
  <Text style={[styles.label, style]} {...rest}>{children}</Text>
);

export const Button = ({ title, icon, onPress, loading, disabled, variant = 'primary', style }) => {
  const primary = variant === 'primary';
  const fg = primary ? colors.onAccent : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonGhost,
        (disabled || loading) && { opacity: 0.6 },
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={fg} />}
          <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
};

export const IconButton = ({ icon, onPress, label, size = 20, style, color = colors.text }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    hitSlop={8}
    style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }, style]}
  >
    <Ionicons name={icon} size={size} color={color} />
  </Pressable>
);

export const Chip = ({ label, active, onPress, icon }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected: !!active }}
    onPress={onPress}
    style={[styles.chip, active && styles.chipActive]}
  >
    {icon && <Ionicons name={icon} size={14} color={active ? colors.onAccent : colors.textSoft} />}
    <Text style={[styles.chipText, active && { color: colors.onAccent }]}>{label}</Text>
  </Pressable>
);

export const Tag = ({ label }) => (
  <View style={styles.tag}>
    <Text style={styles.tagText}>{label}</Text>
  </View>
);

// Cover image with a small badge (episode number, rank, "Movie", ...).
export const Poster = ({ anime, width = 112, onPress, badge, showMeta = true }) => (
  <Pressable onPress={() => onPress?.(anime)} style={{ width, gap: 6 }} accessibilityRole="button" accessibilityLabel={anime.title}>
    <View style={[styles.poster, { width, height: width * 1.46 }]}>
      <Image source={{ uri: anime.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
    {showMeta && (
      <>
        <Text style={styles.posterTitle} numberOfLines={1}>{anime.title}</Text>
        <Text style={styles.posterMeta} numberOfLines={1}>
          {[anime.type, anime.year].filter(Boolean).join(' · ')}
        </Text>
      </>
    )}
  </Pressable>
);

export const PosterRow = ({ title, items, onSeeAll, onPressItem, badgeFor }) => (
  <View style={{ gap: space.md }}>
    <View style={styles.rowHeader}>
      <Text style={styles.rowTitle}>{title}</Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} hitSlop={10}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      )}
    </View>
    <FlatList
      horizontal
      data={items}
      keyExtractor={(item, i) => `${item.id}-${item.episodeNumber ?? i}`}
      renderItem={({ item, index }) => (
        <Poster anime={item} onPress={onPressItem} badge={badgeFor?.(item, index)} />
      )}
      contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.md }}
      showsHorizontalScrollIndicator={false}
    />
  </View>
);

export const Loading = ({ style }) => (
  <View style={[styles.center, style]}>
    <ActivityIndicator size="large" color={colors.accent} />
  </View>
);

export const EmptyState = ({ icon = 'sparkles-outline', title, message, actionTitle, onAction, style }) => (
  <View style={[styles.center, { padding: space.xxl, gap: space.md }, style]}>
    <Ionicons name={icon} size={44} color={colors.accent} />
    <Text style={[styles.title, { fontSize: 20, textAlign: 'center' }]}>{title}</Text>
    {message ? <Text style={[styles.label, { textAlign: 'center', lineHeight: 20 }]}>{message}</Text> : null}
    {actionTitle ? <Button title={actionTitle} onPress={onAction} style={{ marginTop: space.sm, alignSelf: 'center', paddingHorizontal: space.xxl }} /> : null}
  </View>
);

export const ErrorState = ({ message, onRetry, style }) => (
  <EmptyState
    icon="cloud-offline-outline"
    title="Couldn't load this"
    message={message || 'Check your connection and try again.'}
    actionTitle={onRetry ? 'Try again' : undefined}
    onAction={onRetry}
    style={style}
  />
);

const styles = StyleSheet.create({
  wordmark: { fontFamily: fonts.display, color: colors.text },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.text },
  label: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  button: {
    height: 48,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonGhost: { borderWidth: 1.5, borderColor: '#4A4E5E', backgroundColor: 'transparent' },
  buttonText: { fontFamily: fonts.bodyBold, fontSize: 15 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.text },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tagText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.text },
  poster: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface2 },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(14,15,20,0.85)',
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.text },
  posterTitle: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.text },
  posterMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: space.xl,
  },
  rowTitle: { fontFamily: fonts.displaySemi, fontSize: 19, color: colors.text },
  seeAll: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.accent },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
