// When the Home banners play muted trailer clips, saved on the phone: on Wi-Fi only (the default),
// always, or never. Profile has the setting.
import { useEffect, useState } from 'react';
import { NativeModules, TurboModuleRegistry } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'animist.heroClips';

export const CLIP_MODES = [
  { key: 'wifi', label: 'Wi-Fi only' },
  { key: 'always', label: 'Always' },
  { key: 'off', label: 'Off' },
];
const DEFAULT_MODE = 'wifi';

// Values saved by 1.3.0's on/off switch: "on" meant always.
export const modeFromStored = (value) =>
  value === 'on' ? 'always' : CLIP_MODES.some((m) => m.key === value) ? value : DEFAULT_MODE;

// Whether clips may play now. A metered Wi-Fi (a phone's hotspot) counts as mobile data; with no
// way to tell the connection type, "Wi-Fi only" plays nothing.
export const clipsAllowed = (mode, network) =>
  mode === 'always' ||
  (mode === 'wifi' && Boolean(network) && ['wifi', 'ethernet'].includes(network.type) && !network.expensive);

let mode = DEFAULT_MODE;
let loaded = null;
const listeners = new Set();

const load = () => {
  loaded ??= AsyncStorage.getItem(KEY)
    .then((value) => {
      mode = modeFromStored(value);
    })
    .catch(() => {})
    .finally(() => listeners.forEach((listener) => listener(mode)));
  return loaded;
};

export const setHeroClips = (value) => {
  mode = modeFromStored(value);
  listeners.forEach((listener) => listener(mode));
  AsyncStorage.setItem(KEY, mode).catch(() => {});
};

// [mode, setMode], the same everywhere in the app.
export const useHeroClips = () => {
  const [value, setValue] = useState(mode);
  useEffect(() => {
    listeners.add(setValue);
    load();
    return () => listeners.delete(setValue);
  }, []);
  return [value, setHeroClips];
};

// The connection type comes from @react-native-community/netinfo (native, from 1.4.0 on).
const NetInfo =
  TurboModuleRegistry.get('RNCNetInfo') || NativeModules.RNCNetInfo ? require('@react-native-community/netinfo').default : null;

// { type, expensive } of the current connection, or null when it can't be known.
export const useNetwork = () => {
  const [network, setNetwork] = useState(null);
  useEffect(() => {
    if (!NetInfo) return undefined;
    return NetInfo.addEventListener((state) =>
      setNetwork({ type: state.type, expensive: Boolean(state.details?.isConnectionExpensive) })
    );
  }, []);
  return network;
};

// Whether the Home banners may play clips right now.
export const useClipsAllowed = () => {
  const [value] = useHeroClips();
  const network = useNetwork();
  return clipsAllowed(value, network);
};
