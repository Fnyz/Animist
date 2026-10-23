// Development only: sends errors from the phone to the log server started by `npm run dev`
// (scripts/dev.js), so they show up in the VS Code terminal and in logs/device.log.
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const port = process.env.EXPO_PUBLIC_DEVICE_LOG_PORT || '8099';

// hostUri is the address of the computer running Expo, e.g. "192.168.1.5:8081".
const host = Constants.expoConfig?.hostUri?.split(':')[0];
const endpoint = host ? `http://${host}:${port}/log` : null;

const stringify = (value) => {
  if (value instanceof Error) return value.message;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const send = (level, args) => {
  if (!endpoint) return;
  const error = args.find((a) => a instanceof Error);
  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      level,
      message: args.map(stringify).join(' '),
      stack: error?.stack,
      platform: `${Platform.OS} ${Platform.Version}`,
      time: Date.now(),
    }),
  }).catch(() => {
    // The log server isn't running (plain `expo start`); ignore.
  });
};

if (__DEV__ && endpoint) {
  // console.error and console.warn also carry React render errors and unhandled promise rejections.
  for (const level of ['error', 'warn']) {
    const original = console[level];
    console[level] = (...args) => {
      send(level, args);
      original(...args);
    };
  }

  // Uncaught JS errors and crashes (the red screen).
  const previousHandler = global.ErrorUtils?.getGlobalHandler?.();
  global.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
    send(isFatal ? 'fatal' : 'error', [error]);
    previousHandler?.(error, isFatal);
  });
}
