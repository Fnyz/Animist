import React, { useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, ActivityIndicator, Linking, useWindowDimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YouTubeView from './YouTubeView';
import { Button, IconButton } from './ui';
import { colors, fonts, radius, space } from '../theme';

export const openOnYouTube = (videoId) =>
  Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`).catch(() => {});

const formatTime = (s) => {
  const total = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

const EMPTY = { current: 0, duration: 0, paused: true, ended: false, ready: false, muted: false };

// Plays a YouTube trailer inside the app with our own controls. No API key is needed.
const TrailerModal = ({ videoId, title, onClose }) => {
  const { width, height } = useWindowDimensions();
  const player = useRef(null);
  const [status, setStatus] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [barWidth, setBarWidth] = useState(0);
  const [seekTo, setSeekTo] = useState(null);

  const [shownId, setShownId] = useState(videoId);
  if (shownId !== videoId) {
    // A different trailer opened: start from a clean state.
    setShownId(videoId);
    setStatus(EMPTY);
    setError(null);
    setSeekTo(null);
  }

  const onStatus = (s) => {
    setStatus(s);
    // Drop the optimistic seek position once the video has caught up.
    if (seekTo !== null && Math.abs(s.current - seekTo) < 1.5) setSeekTo(null);
  };

  const playing = status.ready && !status.paused && !status.ended;

  const togglePlay = () => {
    if (status.ended) {
      player.current?.seek(0);
      player.current?.play();
    } else if (playing) {
      player.current?.pause();
      setStatus((s) => ({ ...s, paused: true }));
    } else {
      player.current?.play();
      setStatus((s) => ({ ...s, paused: false }));
    }
  };

  const toggleMute = () => {
    player.current?.mute(!status.muted);
    setStatus((s) => ({ ...s, muted: !s.muted }));
  };

  const seek = (x) => {
    if (!barWidth || !status.duration) return;
    const seconds = Math.min(Math.max(x / barWidth, 0), 1) * status.duration;
    player.current?.seek(seconds);
    setSeekTo(seconds);
  };

  const playerWidth = Math.min(width, height * 1.6) - space.xl * 2;
  const playerHeight = Math.round((playerWidth * 9) / 16);
  const current = seekTo ?? status.current;
  const progress = status.duration ? Math.min(current / status.duration, 1) : 0;
  const icon = status.ended ? 'refresh' : playing ? 'pause' : 'play';

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

          <View style={[styles.player, { height: playerHeight }]}>
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="logo-youtube" size={36} color={colors.accent} />
                <Text style={styles.errorText}>This trailer can’t play inside the app.</Text>
                <Text style={styles.errorDetail} numberOfLines={2}>{error}</Text>
              </View>
            ) : (
              <>
                {videoId ? (
                  <YouTubeView
                    ref={player}
                    videoId={videoId}
                    onStatus={onStatus}
                    onError={(text) => setError(text || 'Unknown error')}
                    onMuted={() => setStatus((s) => ({ ...s, muted: true }))}
                  />
                ) : null}

                {/* Covers the video so taps reach our controls instead of YouTube's. */}
                <Pressable
                  style={styles.tapLayer}
                  onPress={togglePlay}
                  disabled={!status.ready}
                  accessibilityRole="button"
                  accessibilityLabel={status.ended ? 'Replay trailer' : playing ? 'Pause trailer' : 'Play trailer'}
                >
                  {!status.ready ? <ActivityIndicator color={colors.accent} size="large" /> : null}
                </Pressable>
              </>
            )}
          </View>

          {error ? (
            <Button title="Watch on YouTube" icon="open-outline" variant="ghost" onPress={() => openOnYouTube(videoId)} />
          ) : (
            <View style={styles.controls}>
              <Pressable onPress={togglePlay} disabled={!status.ready} hitSlop={8} style={styles.controlButton} accessibilityLabel={status.ended ? 'Replay' : playing ? 'Pause' : 'Play'}>
                <Ionicons name={icon} size={22} color={status.ready ? colors.text : colors.muted} />
              </Pressable>

              <Pressable
                style={styles.barHit}
                onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
                onPress={(e) => seek(e.nativeEvent.locationX)}
                accessibilityRole="adjustable"
                accessibilityLabel="Trailer position"
                accessibilityValue={{ min: 0, max: Math.round(status.duration), now: Math.round(current) }}
              >
                <View style={styles.bar}>
                  <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
                </View>
                <View style={[styles.barKnob, { left: Math.max(progress * barWidth - 6, 0) }]} />
              </Pressable>

              <Text style={styles.time}>{formatTime(current)} / {formatTime(status.duration)}</Text>

              <Pressable onPress={toggleMute} disabled={!status.ready} hitSlop={8} style={styles.controlButton} accessibilityLabel={status.muted ? 'Unmute' : 'Mute'}>
                <Ionicons name={status.muted ? 'volume-mute' : 'volume-high'} size={20} color={status.ready ? colors.text : colors.muted} />
              </Pressable>
            </View>
          )}
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
  player: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#000' },
  tapLayer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  controlButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  barHit: { flex: 1, height: 36, justifyContent: 'center' },
  bar: { height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' },
  barFill: { height: 4, backgroundColor: colors.accent },
  barKnob: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent, top: 12 },
  time: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.muted, fontVariant: ['tabular-nums'] },
  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm, padding: space.xl },
  errorText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text, textAlign: 'center' },
  errorDetail: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textAlign: 'center' },
});

export default TrailerModal;
