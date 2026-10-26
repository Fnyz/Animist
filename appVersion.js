// Finds out whether a newer Animist APK has been released, from the GitHub Releases that the
// release workflow publishes. No server or key: one public request when the app opens.
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

export const RELEASES_API = 'https://api.github.com/repos/Fnyz/Animist/releases/latest';
// The same link as the QR code on the download page: always the newest APK.
export const APK_URL = 'https://github.com/Fnyz/Animist/releases/latest/download/animist.apk';

// "v1.2.0" -> [1, 2, 0]; null for anything that isn't a version.
export const parseVersion = (text) => {
  const m = String(text ?? '').trim().match(/^v?(\d+)\.(\d+)\.(\d+)/);
  return m ? m.slice(1).map(Number) : null;
};

// The version of the installed APK. Over-the-air updates never change it (they're tied to it).
// In Expo Go the runtime version isn't an app version ("exposdk:58.0.0"), so app.json's is used.
export const installedVersion = () =>
  [Updates.runtimeVersion, Constants.expoConfig?.version].find((v) => parseVersion(v)) ?? null;

// True when `latest` is a higher version than `current`.
export const isNewer = (latest, current) => {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
};

// { version, notesUrl } of a newer release, or null (also when offline or GitHub doesn't answer).
export const findNewerRelease = async (current = installedVersion(), timeoutMs = 8000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(RELEASES_API, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const release = await res.json();
    if (release.draft || release.prerelease || !isNewer(release.tag_name, current)) return null;
    return { version: release.tag_name.replace(/^v/, ''), notesUrl: release.html_url };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};
