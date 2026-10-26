import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useOnline } from '../connectivity';
import { colors, fonts, space } from '../theme';

const BACK_ONLINE_MS = 2500;

// A strip at the top of the app while the phone is offline, and a short "Back online" after.
const OfflineBanner = () => {
  const online = useOnline();
  const insets = useSafeAreaInsets();
  const [wasOffline, setWasOffline] = useState(false);
  const [showBack, setShowBack] = useState(false);

  // Remember going offline, so coming back can be announced.
  if (!online && !wasOffline) setWasOffline(true);
  if (online && wasOffline) {
    setWasOffline(false);
    setShowBack(true);
  }

  useEffect(() => {
    if (!showBack) return undefined;
    const timer = setTimeout(() => setShowBack(false), BACK_ONLINE_MS);
    return () => clearTimeout(timer);
  }, [showBack]);

  if (online && !showBack) return null;
  return (
    <View
      style={[styles.banner, { paddingTop: insets.top + 6 }, online && styles.back]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Ionicons name={online ? 'wifi' : 'cloud-offline-outline'} size={16} color={online ? colors.onAccent : colors.text} />
      <Text style={[styles.text, online && { color: colors.onAccent }]}>
        {online ? 'Back online' : "You're offline. Videos and your lists need the internet."}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingBottom: 8,
    backgroundColor: colors.surface2,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  back: { backgroundColor: colors.success, borderBottomColor: colors.success },
  text: { flexShrink: 1, fontFamily: fonts.bodySemi, fontSize: 12, color: colors.text },
});

export default OfflineBanner;
