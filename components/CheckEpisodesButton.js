import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { Button } from './ui';
import { formatTime } from '../progress';
import { cooldownLeft } from '../checkCooldown';
import { colors, fonts, space } from '../theme';

const MESSAGES = {
  latest: 'You have the newest episode list. New episodes from the official channels are added every day.',
  found: 'New episodes found. Restarting to load them…',
  dev: 'Checking for new episodes works in the installed app, not in Expo Go.',
  error: "Couldn't check right now. Check your internet connection and try again.",
};

// Where the last check's { at, result } is saved on the phone.
const STORAGE_KEY = 'animist.episodeCheck';

// New episodes reach the app as over-the-air updates (published by the daily episode workflow).
// This checks for one now instead of waiting for the next app start, and loads it right away.
// After a check it rests for a while (saved on the phone, so leaving the screen doesn't reset it).
const CheckEpisodesButton = () => {
  const [state, setState] = useState('idle'); // idle | checking | latest | found | dev | error
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
    // Expo Go and development builds can't load updates (__DEV__ is false in the installed APK).
    if (__DEV__ || !Updates.isEnabled) {
      setState('dev');
      return;
    }
    setState('checking');
    try {
      const { isAvailable } = await Updates.checkForUpdateAsync();
      if (!isAvailable) {
        finish('latest');
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
