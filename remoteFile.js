// A data file the app ships with but also downloads from GitHub when GitHub has a newer copy (the
// daily workflow commits the data files to main). The newer copy is saved on the phone and used
// right away, so fresh data reaches every app version from 1.4.0 on, not only the ones over-the-air
// updates still reach.
//
// A check costs almost nothing: GitHub answers "not modified" (no data) unless the file changed.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';

export const RAW_BASE = 'https://raw.githubusercontent.com/Fnyz/Animist/main/';
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;

export const isNewerList = (time, than) => Date.parse(time) > (Date.parse(than) || 0);

export const isDue = (checkedAt, now = Date.now()) => !checkedAt || now - checkedAt >= CHECK_EVERY_MS;

// path: the file in the repo (and the name it's saved under on the phone).
// timeOf(data): when a copy was made (ISO time); isUsable(data): this app can read it.
// current(): when the copy in use was made; use(data): switch to a newer copy.
export const makeRemoteFile = ({ path, timeOf, isUsable, current, use }) => {
  const url = RAW_BASE + path;
  const metaKey = `animist.remote.${path}`; // { etag, checkedAt, time } of the saved copy
  const savedFile = () => new File(Paths.document, path.replace(/\//g, '_'));

  const readMeta = async () => {
    try {
      return JSON.parse((await AsyncStorage.getItem(metaKey)) ?? 'null') ?? {};
    } catch {
      return {};
    }
  };
  const writeMeta = (meta) => AsyncStorage.setItem(metaKey, JSON.stringify(meta)).catch(() => {});

  // Switches to the copy saved on the phone, if it's newer than the one in use. true when it did.
  const switchToSaved = async (meta) => {
    if (!meta.time || !isNewerList(meta.time, current())) return false;
    try {
      const file = savedFile();
      if (!file.exists) return false;
      const data = JSON.parse(await file.text());
      if (!isUsable(data) || !isNewerList(timeOf(data), current())) return false;
      use(data);
      return true;
    } catch {
      return false;
    }
  };

  let running = null;

  // First the copy saved on the phone, then (when due, or with force) a download if GitHub's copy
  // changed. Resolves to 'updated' (a newer copy is now in use), 'latest' or 'error'. Calls at the
  // same time share one check.
  const refresh = ({ force = false } = {}) => {
    running ??= (async () => {
      const meta = await readMeta();
      let updated = await switchToSaved(meta);
      if (!force && !isDue(meta.checkedAt)) return updated ? 'updated' : 'latest';
      try {
        // The saved copy's tag lets GitHub answer "not modified"; without one, ask for it all.
        const headers = meta.etag && savedFile().exists ? { 'If-None-Match': meta.etag } : {};
        const res = await fetch(url, { headers });
        if (res.status === 304) {
          writeMeta({ ...meta, checkedAt: Date.now() });
          return updated ? 'updated' : 'latest';
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const data = JSON.parse(text);
        if (!isUsable(data)) throw new Error(`unexpected ${path}`);
        if (isNewerList(timeOf(data), current())) {
          await savedFile().write(text);
          use(data);
          updated = true;
        }
        writeMeta({ etag: res.headers.get('etag'), checkedAt: Date.now(), time: timeOf(data) });
        return updated ? 'updated' : 'latest';
      } catch (e) {
        console.warn(`${path} check failed`, e?.message);
        return updated ? 'updated' : 'error';
      }
    })().finally(() => {
      running = null;
    });
    return running;
  };

  return { refresh, url };
};
