// Small settings saved on the phone (autoplay, recent searches, My List order), the same everywhere
// in the app: useSetting(key, fallback) -> [value, setValue].
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'animist.setting.';
const values = new Map();
const loaded = new Map();
const listeners = new Map();

const notify = (key) => (listeners.get(key) ?? new Set()).forEach((listener) => listener(values.get(key)));

const load = (key) => {
  if (!loaded.has(key)) {
    loaded.set(
      key,
      AsyncStorage.getItem(PREFIX + key)
        .then((raw) => {
          if (raw !== null && !values.has(key)) values.set(key, JSON.parse(raw));
        })
        .catch(() => {})
        .finally(() => notify(key))
    );
  }
  return loaded.get(key);
};

export const setSetting = (key, value) => {
  values.set(key, value);
  notify(key);
  AsyncStorage.setItem(PREFIX + key, JSON.stringify(value)).catch(() => {});
};

export const useSetting = (key, fallback) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(listener);
    load(key);
    return () => listeners.get(key).delete(listener);
  }, [key]);
  return [values.has(key) ? values.get(key) : fallback, (value) => setSetting(key, value)];
};
