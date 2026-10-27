// Whether the Home banners play muted trailer clips, saved on the phone. On by default; Profile has
// the switch. (Telling Wi-Fi from mobile data needs a native module the current APK doesn't have.)
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'animist.heroClips';

let enabled = true;
let loaded = null;
const listeners = new Set();

const load = () => {
  loaded ??= AsyncStorage.getItem(KEY)
    .then((value) => {
      if (value !== null) enabled = value === 'on';
    })
    .catch(() => {})
    .finally(() => listeners.forEach((listener) => listener(enabled)));
  return loaded;
};

export const setHeroClips = (value) => {
  enabled = value;
  listeners.forEach((listener) => listener(value));
  AsyncStorage.setItem(KEY, value ? 'on' : 'off').catch(() => {});
};

// [enabled, setEnabled], the same everywhere in the app.
export const useHeroClips = () => {
  const [value, setValue] = useState(enabled);
  useEffect(() => {
    listeners.add(setValue);
    load();
    return () => listeners.delete(setValue);
  }, []);
  return [value, setHeroClips];
};
