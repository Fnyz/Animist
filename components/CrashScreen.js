import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { Sentry } from '../sentry';
import { Button } from './ui';
import { colors, fonts, space } from '../theme';

const restart = () => Updates.reloadAsync().catch(() => {});

// What people see instead of a blank screen when something in the app crashes.
// `resetError` (from Sentry's error boundary) tries to show the app again without restarting.
const CrashScreen = ({ resetError }) => (
  <View style={styles.screen} accessibilityRole="alert">
    <Ionicons name="sad-outline" size={48} color={colors.accent} />
    <Text style={styles.title}>Something went wrong</Text>
    <Text style={styles.message}>Sorry about that. The problem has been reported. Try again, or restart the app.</Text>
    <View style={{ alignSelf: 'stretch', gap: space.sm }}>
      <Button title="Try again" icon="refresh" onPress={resetError} />
      <Button title="Restart the app" icon="reload" variant="ghost" onPress={restart} />
    </View>
  </View>
);

// Catches crashes in the screens below it, reports them to Sentry (when it's on) and shows CrashScreen.
export const CrashBoundary = ({ children }) => (
  <Sentry.ErrorBoundary fallback={({ resetError }) => <CrashScreen resetError={resetError} />}>{children}</Sentry.ErrorBoundary>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.xxl,
    backgroundColor: colors.bg,
  },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.text, textAlign: 'center' },
  message: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textSoft, textAlign: 'center', marginBottom: space.md },
});

export default CrashScreen;
