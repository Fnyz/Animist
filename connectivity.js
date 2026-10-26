// Whether the phone can reach the internet, without a native module (so it works in every build).
// It checks when the app starts, when it comes back to the foreground, when something reports a
// network error, and every few seconds while offline. While online it doesn't poll at all.
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

// Google's address for exactly this: an empty "204 No Content" reply.
const PROBE_URL = 'https://www.gstatic.com/generate_204';
const OFFLINE_RECHECK_MS = 8000;

let online = true;
let checking = null;
const listeners = new Set();

const setOnline = (value) => {
  if (value === online) return;
  online = value;
  for (const listener of listeners) listener(value);
};

export const checkOnline = async (timeoutMs = 5000) => {
  checking ??= (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(PROBE_URL, { method: 'HEAD', cache: 'no-store', signal: controller.signal });
      setOnline(res.status === 204 || res.ok);
    } catch {
      setOnline(false);
    } finally {
      clearTimeout(timer);
      checking = null;
    }
    return online;
  })();
  return checking;
};

// Call when a request failed in a way that may mean "no internet"; the banner updates if so.
export const reportNetworkError = () => {
  checkOnline();
};

// Error text from the WebView or fetch that means the phone is offline.
export const isNetworkError = (text) =>
  /ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_NETWORK_CHANGED|ERR_ADDRESS_UNREACHABLE|ERR_CONNECTION_(?:REFUSED|RESET|TIMED_OUT|ABORTED)|ERR_TIMED_OUT|Network request failed/i.test(
    String(text ?? '')
  );

// true/false, kept up to date.
export const useOnline = () => {
  const [value, setValue] = useState(online);

  useEffect(() => {
    listeners.add(setValue);
    checkOnline();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkOnline();
    });
    return () => {
      listeners.delete(setValue);
      sub.remove();
    };
  }, []);

  // While offline, look again every few seconds so the app notices when the connection returns.
  useEffect(() => {
    if (value) return undefined;
    const timer = setInterval(checkOnline, OFFLINE_RECHECK_MS);
    return () => clearInterval(timer);
  }, [value]);

  return value;
};
