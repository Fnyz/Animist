// Keeps the downloaded data fresh without an app update (see remoteFile.js):
// - the episode list (data/episodes.json), about 0.8 MB compressed when it changed;
// - the AniList snapshot behind Home, Schedule and genres (data/animeSnapshot.json), about 0.35 MB.
import { episodeListGeneratedAt, replaceEpisodeData, replaceSnapshot, snapshotSavedAt } from './api';
import { isDue, isNewerList, makeRemoteFile } from './remoteFile';

export { isDue, isNewerList };

// The file shapes this app understands (the scripts write `format`). A file in a format the app
// doesn't know is ignored, and the app keeps its own copy.
export const EPISODES_FORMAT = 1;
export const SNAPSHOT_FORMAT = 1;

const hasTime = (time) => !Number.isNaN(Date.parse(time));
const isObject = (v) => Boolean(v) && typeof v === 'object';

export const isUsableList = (data) =>
  isObject(data) && (data.format ?? 1) === EPISODES_FORMAT && isObject(data.anime) && hasTime(data.generatedAt);

export const isUsableSnapshot = (data) =>
  isObject(data) &&
  (data.format ?? 1) === SNAPSHOT_FORMAT &&
  isObject(data.media) &&
  isObject(data.lists) &&
  Array.isArray(data.recent) &&
  hasTime(data.savedAt);

const episodes = makeRemoteFile({
  path: 'data/episodes.json',
  timeOf: (d) => d.generatedAt,
  isUsable: isUsableList,
  current: episodeListGeneratedAt,
  use: replaceEpisodeData,
});

const snapshot = makeRemoteFile({
  path: 'data/animeSnapshot.json',
  timeOf: (d) => d.savedAt,
  isUsable: isUsableSnapshot,
  current: snapshotSavedAt,
  use: replaceSnapshot,
});

export const EPISODES_URL = episodes.url;
export const refreshEpisodeList = episodes.refresh;
export const refreshSnapshot = snapshot.refresh;

// Both at once (at app start and when it comes back to the front): 'updated' if either changed.
export const refreshDownloadedData = async (options) => {
  const results = await Promise.all([episodes.refresh(options), snapshot.refresh(options)]);
  return results.includes('updated') ? 'updated' : results.includes('error') ? 'error' : 'latest';
};
