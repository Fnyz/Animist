import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import { View, Text, StyleSheet, Linking, Pressable, Modal, StatusBar, Dimensions, useWindowDimensions } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import YouTubeView from './YouTubeView';
import { fullscreenBox } from './fullscreenBox';
import { isNetworkError, reportNetworkError, useOnline } from '../connectivity';
import { Button } from './ui';
import { colors, fonts, radius, space } from '../theme';

// Screen rotation for fullscreen, only when the installed app includes it: APKs before 1.2.0
// don't, and loading it there would stop the whole app. Without it, fullscreen still fills the
// screen; it just doesn't turn sideways by itself.
const ScreenOrientation = requireOptionalNativeModule('ExpoScreenOrientation') ? require('expo-screen-orientation') : null;

const lockOrientation = (landscape) =>
  ScreenOrientation
    ? ScreenOrientation.lockAsync(
        landscape ? ScreenOrientation.OrientationLock.LANDSCAPE : ScreenOrientation.OrientationLock.PORTRAIT_UP
      )
    : Promise.resolve();

export const openOnYouTube = (videoId) =>
  Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`).catch(() => {});

const formatTime = (s) => {
  const total = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

// Seconds the "Up next" card counts down before the next episode starts.
const UP_NEXT_SECONDS = 5;
// Longest the thumbnail covers the player while the video loads (see `started` in PlayerCore).
const COVER_MAX_MS = 10000;

// How long the center play/pause button (and the fullscreen controls) stay up while playing.
const CONTROLS_HIDE_MS = 3000;

const EMPTY = { current: 0, duration: 0, paused: true, ended: false, muted: false, qualities: [], quality: null };

// YouTube's quality names, highest first.
const QUALITY_LABELS = {
  hd2160: '2160p', hd1440: '1440p', hd1080: '1080p', hd720: '720p',
  large: '480p', medium: '360p', small: '240p', tiny: '144p',
};
const qualityLabel = (q) => (q && q !== 'auto' ? QUALITY_LABELS[q] ?? q : 'Auto');

// One running YouTube player with the app's controls. `fullscreen` changes the layout only.
// The controls always sit below the video and the video never changes size while playing:
// Android draws playing video above anything that overlaps it, and resizing YouTube's page
// mid-playback stretches the picture.
const PlayerCore = ({
  videoId, start, width, height, label, fullscreen, onToggleFullscreen, onProgress, onEnded, onError,
  quality, onQualityChange, edgePad, box, upNext, fullBleed,
}) => {
  const player = useRef(null);
  const wasEnded = useRef(false);
  const [status, setStatus] = useState({ ...EMPTY, current: start });
  const [barWidth, setBarWidth] = useState(0);
  const [seekTo, setSeekTo] = useState(null);
  const [qualityMenu, setQualityMenu] = useState(false);
  // Tapping the video shows or hides the center play/pause button (and, in fullscreen, the
  // controls). `shownAt` restarts the auto-hide timer whenever they're used.
  const [showControls, setShowControls] = useState(true);
  const [shownAt, setShownAt] = useState(0);
  // Seconds left before the next episode starts, while the "Up next" card shows.
  const [countdown, setCountdown] = useState(null);
  const playNext = useEffectEvent(() => upNext?.onPlay());

  useEffect(() => {
    if (countdown === null) return undefined;
    if (countdown <= 0) {
      playNext();
      return undefined;
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const levels = (status.qualities ?? []).filter((q) => QUALITY_LABELS[q]);
  const levelsKey = levels.join(',');

  // Apply the chosen quality once the video reports what it offers (and again after fullscreen).
  useEffect(() => {
    if (quality && quality !== 'auto' && levelsKey.split(',').includes(quality)) player.current?.quality(quality);
  }, [quality, levelsKey]);

  const pickQuality = (q) => {
    onQualityChange(q);
    player.current?.quality(q);
    setQualityMenu(false);
  };

  const playing = !status.paused && !status.ended;

  // Until the video really plays, the thumbnail covers the player, so whatever YouTube's page shows
  // while it loads (its title bar, logo, play button) never flashes, even on a slow connection.
  // If the video doesn't start by itself (or never reports it), the cover lifts after a while.
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), COVER_MAX_MS);
    return () => clearTimeout(timer);
  }, []);

  const onStatus = (s) => {
    if (!started && (!s.paused || s.ended)) setStarted(true);
    if (s.ended && !wasEnded.current) {
      onEnded?.();
      if (upNext) setCountdown(UP_NEXT_SECONDS);
    }
    wasEnded.current = s.ended;
    setStatus(s);
    onProgress?.(s);
    // Drop the optimistic seek position once the video has caught up.
    if (seekTo !== null && Math.abs(s.current - seekTo) < 1.5) setSeekTo(null);
  };

  const togglePlay = () => {
    if (status.ended) {
      setCountdown(null);
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

  // A tap on the video: play/pause inline, show/hide the controls in fullscreen.
  const onTapVideo = () => {
    setShowControls((v) => !v);
    setShownAt(Date.now());
  };

  const toggleMute = () => {
    player.current?.mute(!status.muted);
    setStatus((s) => ({ ...s, muted: !s.muted }));
  };

  const seekToSeconds = (seconds) => {
    player.current?.seek(seconds);
    setSeekTo(seconds);
  };

  // Dragging the progress bar: the knob and time follow the finger, and the video jumps on release.
  // A plain tap jumps too.
  const [scrubAt, setScrubAt] = useState(null);
  const drag = useRef({ pageX: 0, last: null });

  const toSeconds = (x) => {
    if (!barWidth || !status.duration) return null;
    return Math.min(Math.max(x / barWidth, 0), 1) * status.duration;
  };
  const moveScrub = (seconds) => {
    drag.current.last = seconds;
    setScrubAt(seconds);
  };
  const scrubHandlers = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e) => {
      drag.current.pageX = e.nativeEvent.pageX - e.nativeEvent.locationX;
      moveScrub(toSeconds(e.nativeEvent.locationX));
    },
    onResponderMove: (e) => moveScrub(toSeconds(e.nativeEvent.pageX - drag.current.pageX)),
    onResponderRelease: () => {
      const seconds = drag.current.last;
      drag.current.last = null;
      setScrubAt(null);
      if (seconds !== null) seekToSeconds(seconds);
    },
    onResponderTerminate: () => {
      drag.current.last = null;
      setScrubAt(null);
    },
  };
  const scrubbing = scrubAt !== null;

  // While playing, hide the button and controls again after a few seconds, unless they're in use.
  useEffect(() => {
    if (!showControls || !playing || scrubbing || qualityMenu) return undefined;
    const timer = setTimeout(() => setShowControls(false), CONTROLS_HIDE_MS);
    return () => clearTimeout(timer);
  }, [showControls, playing, scrubbing, qualityMenu, shownAt]);

  const current = scrubAt ?? seekTo ?? status.current;
  const progress = status.duration ? Math.min(current / status.duration, 1) : 0;
  const icon = status.ended ? 'refresh' : playing ? 'pause' : 'play';
  const lower = label.toLowerCase();

  const playButton = (
    <Pressable onPress={togglePlay} hitSlop={8} style={styles.controlButton} accessibilityLabel={status.ended ? 'Replay' : playing ? 'Pause' : 'Play'}>
      <Ionicons name={icon} size={22} color={colors.text} />
    </Pressable>
  );
  const knob = scrubbing ? 18 : 12;
  const seekBar = (
    <View
      style={styles.barHit}
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      {...scrubHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${label} position`}
      accessibilityValue={{ min: 0, max: Math.round(status.duration), now: Math.round(current), text: formatTime(current) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) =>
        seekToSeconds(Math.min(Math.max(current + (e.nativeEvent.actionName === 'increment' ? 10 : -10), 0), status.duration))
      }
    >
      <View style={[styles.bar, scrubbing && styles.barActive]}>
        <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
      </View>
      <View
        style={[
          styles.barKnob,
          { width: knob, height: knob, borderRadius: knob / 2, top: 18 - knob / 2, left: Math.max(progress * barWidth - knob / 2, 0) },
        ]}
      />
    </View>
  );
  const time = <Text style={styles.time}>{formatTime(current)} / {formatTime(status.duration)}</Text>;
  const muteButton = (
    <Pressable onPress={toggleMute} hitSlop={8} style={styles.controlButton} accessibilityLabel={status.muted ? 'Unmute' : 'Mute'}>
      <Ionicons name={status.muted ? 'volume-mute' : 'volume-high'} size={20} color={colors.text} />
    </Pressable>
  );
  const qualityButton = levels.length > 0 && (
    <Pressable
      onPress={() => setQualityMenu((v) => !v)}
      hitSlop={8}
      style={[styles.qualityButton, qualityMenu && styles.qualityButtonOpen]}
      accessibilityLabel={`Video quality: ${qualityLabel(quality)}`}
      accessibilityState={{ expanded: qualityMenu }}
    >
      <Ionicons name="settings-outline" size={14} color={colors.text} />
      <Text style={styles.qualityText}>{qualityLabel(quality)}</Text>
    </Pressable>
  );
  const fullscreenButton = (
    <Pressable
      onPress={() => onToggleFullscreen(current)}
      hitSlop={8}
      style={styles.controlButton}
      accessibilityLabel={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
    >
      <Ionicons name={fullscreen ? 'contract' : 'expand'} size={20} color={colors.text} />
    </Pressable>
  );

  // Landscape fullscreen has room for one row; portrait gets the seek bar on its own row.
  const controls = fullscreen ? (
    <View style={styles.controls}>
      {playButton}
      {seekBar}
      {time}
      {muteButton}
      {qualityButton}
      {fullscreenButton}
    </View>
  ) : (
    <View style={{ gap: 2 }}>
      <View style={styles.controls}>
        {seekBar}
        {time}
      </View>
      <View style={styles.controls}>
        {playButton}
        {muteButton}
        <View style={{ flex: 1 }} />
        {qualityButton}
        {fullscreenButton}
      </View>
    </View>
  );

  const qualityPicker = qualityMenu && levels.length > 0 && (
    <View style={[styles.qualityMenu, fullscreen && styles.qualityMenuFullscreen]} accessibilityRole="radiogroup">
      {fullscreen && (
        <Pressable onPress={() => setQualityMenu(false)} style={styles.qualityOption} accessibilityLabel="Close quality menu">
          <Ionicons name="close" size={16} color={colors.text} />
        </Pressable>
      )}
      {['auto', ...levels].map((q) => {
        const selected = (quality ?? 'auto') === q;
        return (
          <Pressable
            key={q}
            onPress={() => pickQuality(q)}
            style={[styles.qualityOption, selected && styles.qualityOptionSelected]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.qualityOptionText, selected && { color: colors.onAccent }]}>{qualityLabel(q)}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const video = (
    <View style={[styles.player, fullscreen ? [styles.playerFullscreen, box] : [{ width, height }, fullBleed && styles.playerFullBleed]]}>
      <YouTubeView
        ref={player}
        videoId={videoId}
        start={start}
        onStatus={onStatus}
        onError={(text) => onError(text || 'Unknown error')}
        onMuted={() => setStatus((s) => ({ ...s, muted: true }))}
        onTap={onTapVideo}
      />
      {!started && (
        <View style={styles.cover} pointerEvents="none">
          <Image source={{ uri: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` }} style={styles.coverImage} contentFit="cover" />
        </View>
      )}
      {/* Covers the video so taps reach the app instead of YouTube: a tap shows or hides the
          center play/pause button (and the controls in fullscreen). */}
      <Pressable
        style={styles.tapLayer}
        onPress={onTapVideo}
        accessibilityRole="button"
        accessibilityLabel={showControls ? 'Hide controls' : 'Show controls'}
      />
      {countdown === null && (showControls || !playing) && (
        <View style={styles.centerWrap} pointerEvents="box-none">
          <Pressable
            onPress={() => {
              togglePlay();
              setShowControls(true);
              setShownAt(Date.now());
            }}
            hitSlop={12}
            style={({ pressed }) => [styles.centerButton, pressed && { transform: [{ scale: 0.92 }] }]}
            accessibilityRole="button"
            accessibilityLabel={status.ended ? `Replay ${lower}` : playing ? `Pause ${lower}` : `Play ${lower}`}
          >
            <Ionicons name={icon} size={40} color="#fff" style={[styles.centerIcon, icon === 'play' && { marginLeft: 4 }]} />
          </Pressable>
        </View>
      )}
      {countdown !== null && upNext && (
        <View style={styles.upNext} accessibilityLiveRegion="polite">
          <Text style={styles.upNextLabel}>Up next</Text>
          <Text style={styles.upNextTitle} numberOfLines={2}>{upNext.title}</Text>
          <View style={styles.upNextButtons}>
            <Pressable
              onPress={() => {
                setCountdown(null);
                upNext.onPlay();
              }}
              style={styles.upNextPlay}
              accessibilityRole="button"
              accessibilityLabel={`Play ${upNext.title} now`}
            >
              <Ionicons name="play" size={16} color={colors.onAccent} />
              <Text style={styles.upNextPlayText}>Play in {countdown}</Text>
            </Pressable>
            <Pressable onPress={() => setCountdown(null)} style={styles.upNextCancel} accessibilityRole="button">
              <Text style={styles.upNextCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );

  if (fullscreen) {
    // The video fills the screen; the controls float over its bottom edge. The padding on the side
    // opposite the camera cutout keeps the picture centered on the physical screen.
    return (
      <View style={[styles.fullscreenBox, { paddingLeft: edgePad.left, paddingRight: edgePad.right }]}>
        {video}
        {showControls && (
          <View style={[styles.overlay, { left: edgePad.left, right: edgePad.right }]}>
            {qualityMenu ? qualityPicker : controls}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={{ width, gap: space.md }}>
      {video}
      <View style={[{ gap: space.md }, fullBleed && styles.belowFullBleed]}>
        {controls}
        {qualityPicker}
      </View>
    </View>
  );
};

// A YouTube video with the app's own controls: play/pause, seek bar, time, mute and fullscreen.
// Give it key={videoId} so switching videos starts from a clean state.
// `fallback` ({ title, icon, onPress }) is offered when YouTube refuses to play the video here.
// `startAt` (seconds) resumes the video there; `onProgress` gets { position, duration } as it plays.
// `fullBleed` makes the video span the whole `width` edge to edge (pass the screen width), with
// the controls below inset by the page margin.
// `alternatives` (video ids) are tried in order when YouTube refuses to play the video here, e.g.
// because it's blocked in this country; `onSourceChange(index)` says which one is playing
// (0 = `videoId`, 1 = the first alternative, ...).
const VideoPlayer = ({
  videoId, alternatives = [], width, label = 'Video', onEnded, fallback, startAt = 0, onProgress, onSourceChange, upNext,
  fullBleed = false,
}) => {
  const insets = useSafeAreaInsets();
  // The space the fullscreen view actually got (measured), for sizing and centering the video.
  const [root, setRoot] = useState(null);
  // Re-renders on rotation. The fullscreen player is created only once the screen is really
  // landscape: YouTube measures its page when it loads, so a player created mid-rotation keeps
  // the wrong size.
  const windowSize = useWindowDimensions();
  const landscape = windowSize.width > windowSize.height;
  const { box: fullscreenSize, edgePad } = root
    ? fullscreenBox({ screen: Dimensions.get('screen'), root, insets })
    : { box: { width: 0, height: 0 }, edgePad: { left: 0, right: 0 } };
  const [error, setError] = useState(null);
  const [sourceIndex, setSourceIndex] = useState(0);
  const sources = [videoId, ...alternatives];
  const currentId = sources[sourceIndex] ?? videoId;
  const [fullscreen, setFullscreen] = useState(false);
  // Each switch between inline and fullscreen starts a fresh player at the saved position.
  const [session, setSession] = useState({ id: 0, start: startAt });
  const [quality, setQuality] = useState('auto');
  const position = useRef(startAt);

  // A new video (the next episode): start fresh at its own position, staying in fullscreen if open.
  const [shownId, setShownId] = useState(videoId);
  if (shownId !== videoId) {
    setShownId(videoId);
    setSourceIndex(0);
    setError(null);
    setSession((s) => ({ id: s.id + 1, start: startAt }));
  }

  const toggleFullscreen = async (at) => {
    const next = !fullscreen;
    setSession((s) => ({ id: s.id + 1, start: at ?? position.current }));
    setFullscreen(next);
    try {
      await lockOrientation(next);
    } catch {
      // Some devices refuse orientation locks; the video still fills the screen.
    }
  };

  // Never leave the app stuck sideways.
  useEffect(
    () => () => {
      lockOrientation(false).catch(() => {});
    },
    []
  );

  const height = Math.round((width * 9) / 16);
  const lower = label.toLowerCase();

  const online = useOnline();
  const offlineError = Boolean(error) && isNetworkError(error);

  // Start the same video again where it was (after an error).
  const retry = () => {
    setError(null);
    setSession((s) => ({ id: s.id + 1, start: position.current ?? s.start }));
  };

  // Lost the connection while playing: start again by itself once it's back.
  const [retriedOnline, setRetriedOnline] = useState(false);
  if (offlineError && online && !retriedOnline) {
    setRetriedOnline(true);
    retry();
  }
  if (!offlineError && retriedOnline) setRetriedOnline(false);

  if (error) {
    return (
      <View style={{ width, gap: space.md }}>
        <View style={[styles.player, { width, height }, fullBleed && styles.playerFullBleed]}>
          {offlineError ? (
            <View style={styles.errorBox}>
              <Ionicons name="cloud-offline-outline" size={36} color={colors.accent} />
              <Text style={styles.errorText}>You’re offline</Text>
              <Text style={styles.errorDetail}>The {lower} starts again by itself when you’re back online.</Text>
            </View>
          ) : (
            <View style={styles.errorBox}>
              <Ionicons name="logo-youtube" size={36} color={colors.accent} />
              <Text style={styles.errorText}>This {lower} can’t play inside the app.</Text>
              <Text style={styles.errorDetail} numberOfLines={2}>{error}</Text>
            </View>
          )}
        </View>
        <View style={[{ gap: space.sm }, fullBleed && styles.belowFullBleed]}>
          <Button title="Try again" icon="refresh" variant={offlineError || !fallback ? 'primary' : 'ghost'} onPress={retry} />
          {!offlineError && fallback ? <Button title={fallback.title} icon={fallback.icon ?? 'open-outline'} onPress={fallback.onPress} /> : null}
          {!offlineError && (
            <Button title="Watch on YouTube" icon="logo-youtube" variant="ghost" onPress={() => openOnYouTube(currentId)} />
          )}
        </View>
      </View>
    );
  }

  // YouTube refused this video: try the next one (same position), or show the error. A network
  // error isn't the video's fault, so the backups would fail too: show it straight away.
  const onPlayError = (text) => {
    if (isNetworkError(text)) {
      reportNetworkError();
      setError(text);
    } else if (sourceIndex + 1 < sources.length) {
      setSourceIndex(sourceIndex + 1);
      setSession((s) => ({ id: s.id + 1, start: s.start }));
      onSourceChange?.(sourceIndex + 1);
    } else {
      setError(text);
    }
  };

  const core = (isFullscreen) => (
    <PlayerCore
      key={session.id}
      videoId={currentId}
      start={session.start}
      width={width}
      height={height}
      label={label}
      fullscreen={isFullscreen}
      onToggleFullscreen={toggleFullscreen}
      onProgress={(s) => {
        position.current = s.current;
        if (s.duration > 0) onProgress?.({ position: s.current, duration: s.duration });
      }}
      onEnded={onEnded}
      onError={onPlayError}
      quality={quality}
      onQualityChange={setQuality}
      edgePad={edgePad}
      box={fullscreenSize}
      upNext={upNext}
      fullBleed={fullBleed}
    />
  );

  return (
    <>
      {fullscreen ? (
        // Keeps the space on the page while the video plays fullscreen.
        <View style={{ width, gap: space.md }}>
          <View style={[styles.player, styles.placeholder, { width, height }, fullBleed && styles.playerFullBleed]}>
            <Ionicons name="expand" size={28} color={colors.muted} />
            <Text style={styles.placeholderText}>Playing in fullscreen</Text>
          </View>
        </View>
      ) : (
        core(false)
      )}

      <Modal
        visible={fullscreen}
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        supportedOrientations={['landscape', 'portrait']}
        onRequestClose={() => toggleFullscreen()}
      >
        <StatusBar hidden />
        <View style={styles.fullscreenRoot} onLayout={(e) => setRoot(e.nativeEvent.layout)}>
          {/* Without screen rotation (older APKs) the video plays fullscreen in portrait. */}
          {fullscreen && (landscape || !ScreenOrientation) && root ? core(true) : null}
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  player: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#000' },
  playerFullscreen: { borderRadius: 0 },
  // Edge to edge on the page: square corners, and the controls below keep the page's side margin.
  playerFullBleed: { borderRadius: 0 },
  belowFullBleed: { paddingHorizontal: space.xl },
  overlay: {
    position: 'absolute',
    bottom: 0,
    paddingHorizontal: space.xxl,
    paddingTop: space.md,
    paddingBottom: space.lg,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  placeholder: { alignItems: 'center', justifyContent: 'center', gap: space.sm },
  placeholderText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.muted },
  fullscreenRoot: { flex: 1, backgroundColor: '#000' },
  fullscreenBox: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  tapLayer: { ...StyleSheet.absoluteFill },
  cover: { ...StyleSheet.absoluteFill, backgroundColor: '#000' },
  coverImage: { ...StyleSheet.absoluteFill, opacity: 0.6 },
  centerWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  centerButton: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  // No background: a soft shadow keeps the icon readable on bright scenes.
  centerIcon: { textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  controlButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  barHit: { flex: 1, height: 36, justifyContent: 'center' },
  bar: { height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' },
  barFill: { height: 4, backgroundColor: colors.accent },
  barKnob: { position: 'absolute', backgroundColor: colors.accent },
  barActive: { height: 6, borderRadius: 3 },
  qualityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  qualityButtonOpen: { borderColor: colors.accent },
  qualityText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.text },
  qualityMenu: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  qualityMenuFullscreen: { flexWrap: 'nowrap', justifyContent: 'flex-end', alignItems: 'center' },
  qualityOption: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    backgroundColor: colors.surface2,
  },
  qualityOptionSelected: { backgroundColor: colors.accent },
  qualityOptionText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.text },
  time: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.textSoft, fontVariant: ['tabular-nums'] },
  upNext: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    padding: space.lg,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  upNextLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.accent },
  upNextTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text, textAlign: 'center' },
  upNextButtons: { flexDirection: 'row', gap: space.sm, paddingTop: 4 },
  upNextPlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: colors.accent,
  },
  upNextPlayText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.onAccent, fontVariant: ['tabular-nums'] },
  upNextCancel: { height: 36, paddingHorizontal: 16, borderRadius: 18, justifyContent: 'center', backgroundColor: colors.surface2 },
  upNextCancelText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm, padding: space.xl },
  errorText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text, textAlign: 'center' },
  errorDetail: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textAlign: 'center' },
});

export default VideoPlayer;
