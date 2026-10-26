import React from 'react';
import { Modal, View, Text, StyleSheet, useWindowDimensions, Pressable } from 'react-native';
import VideoPlayer from './VideoPlayer';
import { IconButton } from './ui';
import { colors, fonts, radius, space } from '../theme';

export { openOnYouTube } from './VideoPlayer';

// Plays a YouTube trailer in a popup. No API key is needed.
const TrailerModal = ({ videoId, title, onClose }) => {
  const { width, height } = useWindowDimensions();
  const playerWidth = Math.min(width, height * 1.6) - space.xl * 2;

  return (
    <Modal visible={!!videoId} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close trailer">
        <Pressable style={[styles.sheet, { width: playerWidth + space.lg * 2 }]} onPress={() => {}}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>Trailer</Text>
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
            </View>
            <IconButton icon="close" label="Close trailer" onPress={onClose} />
          </View>
          {videoId ? <VideoPlayer key={videoId} videoId={videoId} width={playerWidth} label="Trailer" /> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5,6,10,0.92)', alignItems: 'center', justifyContent: 'center' },
  sheet: {
    padding: space.lg,
    gap: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.accent },
  title: { fontFamily: fonts.displaySemi, fontSize: 18, color: colors.text },
});

export default TrailerModal;
