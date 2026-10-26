import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { APK_URL, findNewerRelease } from '../appVersion';
import { Button } from './ui';
import { colors, fonts, radius, space } from '../theme';

// Tells people when a newer APK is out (APKs installed outside the Play Store get no update
// prompts). Checked once each time the app opens; "Later" hides it until the next launch.
const UpdateNotice = () => {
  const [release, setRelease] = useState(null);

  useEffect(() => {
    let cancelled = false;
    findNewerRelease().then((found) => {
      if (!cancelled) setRelease(found);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const close = () => setRelease(null);
  const download = () => {
    Linking.openURL(APK_URL).catch(() => {});
    close();
  };

  return (
    <Modal visible={!!release} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityRole="alert">
          <View style={styles.icon}>
            <Ionicons name="sparkles" size={24} color={colors.onAccent} />
          </View>
          <Text style={styles.title}>Animist {release?.version} is out</Text>
          <Text style={styles.message}>
            A new version is ready to download. Install it over this one; your account and lists stay as they are.
          </Text>
          {release?.notesUrl ? (
            <Pressable onPress={() => Linking.openURL(release.notesUrl).catch(() => {})} hitSlop={8} accessibilityRole="link">
              <Text style={styles.link}>See what’s new</Text>
            </Pressable>
          ) : null}
          <View style={{ alignSelf: 'stretch', gap: space.sm, marginTop: space.sm }}>
            <Button title="Download" icon="download-outline" onPress={download} />
            <Button title="Later" variant="ghost" onPress={close} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, backgroundColor: 'rgba(5,6,10,0.85)' },
  card: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: space.sm,
    padding: space.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    marginBottom: space.xs,
  },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.text, textAlign: 'center' },
  message: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textSoft, textAlign: 'center' },
  link: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accent },
});

export default UpdateNotice;
