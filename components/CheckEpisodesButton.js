import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { Button } from './ui';
import { formatTime } from '../progress';
import { cooldownLeft } from '../checkCooldown';
import { refreshDownloadedData } from '../episodeData';
import { colors, fonts, space } from '../theme';

const MESSAGES = {
  latest: 'You have the newest episode list. New episodes from the official channels are added every day.',
  updated: 'New episodes found and added.',
  found: 'An app update is ready. Restarting to load it…',
  error: "Couldn't check right now. Check your internet connection and try again.",
};

// Where the last check's { at, result } is saved on the phone.
const STORAGE_KEY = 'animist.episodeCheck';

// New episodes reach the app as a downloaded episode list (episodeData.js) and in over-the-air
// updates. This checks for both now instead of waiting: a newer list is used right away; an
// update restarts the app to load it.
// After a check it rests for a while (saved on the phone, so leaving the screen doesn't reset it).
const CheckEpisodesButton = () => {
  const [state, setState] = useState('idle'); // idle | checking | updated | latest | found | error
  const [last, setLast] = useState(null); // { at, result } of the last finished check
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (!saved) return;
        const parsed = JSON.parse(saved);
        setLast(parsed);
        if (cooldownLeft(parsed) > 0) setState(parsed.result);
      })
      .catch(() => {});
  }, []);

  const left = cooldownLeft(last, now);

  // Tick once a second while resting, for the countdown.
  useEffect(() => {
    if (left <= 0) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [left]);

  const finish = (result) => {
    const entry = { at: Date.now(), result };
    setLast(entry);
    setNow(entry.at);
    setState(result);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entry)).catch(() => {});
  };

  const check = async () => {
    if (left > 0) return;
    setState('checking');
    const list = await refreshDownloadedData({ force: true });
    // Expo Go and development builds can't load updates (__DEV__ is false in the installed APK).
    if (__DEV__ || !Updates.isEnabled) {
      finish(list);
      return;
    }
    try {
      const { isAvailable } = await Updates.checkForUpdateAsync();
      if (!isAvailable) {
        finish(list);
        return;
      }
      setState('found');
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch {
      finish('error');
    }
  };

  const busy = state === 'checking' || state === 'found';
  const title = state === 'checking' ? 'Checking…' : left > 0 ? `Check again in ${formatTime(Math.ceil(left / 1000))}` : 'Check for new episodes';

  return (
    <View style={{ gap: space.sm }}>
      <Button
        title={title}
        icon={left > 0 ? 'time-outline' : 'refresh'}
        variant="ghost"
        onPress={check}
        loading={busy}
        disabled={left > 0}
      />
      {MESSAGES[state] ? (
        <Text style={[styles.message, state === 'error' && { color: colors.accent }]} accessibilityLiveRegion="polite">
          {MESSAGES[state]}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  message: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.muted, textAlign: 'center' },
});

export default CheckEpisodesButton;
