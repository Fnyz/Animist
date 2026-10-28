jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// A fake phone file system: one saved file.
const mockDisk = { text: null };
jest.mock('expo-file-system', () => ({
  Paths: { document: 'doc' },
  File: jest.fn().mockImplementation(() => ({
    get exists() {
      return mockDisk.text !== null;
    },
    text: async () => mockDisk.text,
    write: async (t) => {
      mockDisk.text = t;
    },
  })),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { episodeListGeneratedAt, hasFreeEpisodes } from '../api';
import { isDue, isNewerList, isUsableList, isUsableSnapshot, refreshEpisodeList, refreshSnapshot } from '../episodeData';
import { getList, snapshotSavedAt } from '../api';

const BUILT_IN = episodeListGeneratedAt();
const later = (days) => new Date(Date.parse(BUILT_IN) + days * 86400000).toISOString();
// A list with one extra anime the built-in list doesn't have.
const newerList = (days = 1) => ({ format: 1, generatedAt: later(days), channels: [], anime: { 999000001: { episodes: { 1: { videoId: 'x' } } } }, media: {} });

const reply = (status, body, etag = 'W/"abc"') => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: (h) => (h.toLowerCase() === 'etag' ? etag : null) },
  text: async () => JSON.stringify(body),
});

beforeEach(async () => {
  mockDisk.text = null;
  await AsyncStorage.clear();
  global.fetch = jest.fn();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('which lists the app accepts', () => {
  it('needs the known format, anime and a date', () => {
    expect(isUsableList(newerList())).toBe(true);
    expect(isUsableList({ ...newerList(), format: undefined })).toBe(true); // lists from before format existed
    expect(isUsableList({ ...newerList(), format: 2 })).toBe(false); // a future shape this app can't read
    expect(isUsableList({ ...newerList(), anime: undefined })).toBe(false);
    expect(isUsableList({ ...newerList(), generatedAt: 'soon' })).toBe(false);
    expect(isUsableList(null)).toBe(false);
  });

  it('compares lists by when they were made, and checks every 6 hours', () => {
    expect(isNewerList(later(1), BUILT_IN)).toBe(true);
    expect(isNewerList(BUILT_IN, later(1))).toBe(false);
    expect(isNewerList(later(0), undefined)).toBe(true);
    expect(isDue(undefined)).toBe(true);
    expect(isDue(Date.now() - 60 * 1000)).toBe(false);
    expect(isDue(Date.now() - 7 * 3600 * 1000)).toBe(true);
  });
});

describe('refreshing the episode list', () => {
  it('downloads a newer list, uses it right away and saves it', async () => {
    global.fetch.mockResolvedValue(reply(200, newerList()));
    expect(hasFreeEpisodes(999000001)).toBe(false);
    await expect(refreshEpisodeList()).resolves.toBe('updated');
    expect(hasFreeEpisodes(999000001)).toBe(true);
    expect(JSON.parse(mockDisk.text).generatedAt).toBe(later(1));
  });

  it('asks GitHub "only if changed" next time, and costs nothing when unchanged', async () => {
    global.fetch.mockResolvedValue(reply(200, newerList(2)));
    await refreshEpisodeList({ force: true });
    global.fetch.mockResolvedValue(reply(304, null));
    await expect(refreshEpisodeList({ force: true })).resolves.toBe('latest');
    expect(global.fetch.mock.calls[1][1].headers['If-None-Match']).toBe('W/"abc"');
  });

  it("doesn't download again within 6 hours unless asked", async () => {
    global.fetch.mockResolvedValue(reply(200, newerList(3)));
    await refreshEpisodeList({ force: true });
    await refreshEpisodeList();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('ignores a list in a format this app can not read, or an older one', async () => {
    global.fetch.mockResolvedValue(reply(200, { ...newerList(9), format: 2 }));
    await expect(refreshEpisodeList({ force: true })).resolves.toBe('error');
    expect(episodeListGeneratedAt()).not.toBe(later(9));
    global.fetch.mockResolvedValue(reply(200, { ...newerList(), generatedAt: '2001-01-01T00:00:00Z' }));
    await expect(refreshEpisodeList({ force: true })).resolves.toBe('latest');
  });

  it('keeps working offline', async () => {
    global.fetch.mockRejectedValue(new TypeError('Network request failed'));
    await expect(refreshEpisodeList({ force: true })).resolves.toBe('error');
  });
});

describe('the downloaded AniList snapshot', () => {
  const snap = (days) => ({
    format: 1,
    savedAt: new Date(Date.parse(snapshotSavedAt()) + days * 86400000).toISOString(),
    lists: { trending: [1] },
    recent: [],
    schedule: [],
    genres: {},
    media: { 1: { id: 1, title: { english: 'Fresh Trending' }, coverImage: { large: 'x' }, genres: [], format: 'TV', status: 'RELEASING', episodes: 12, isAdult: false } },
  });

  it('accepts only snapshots this app can read', () => {
    expect(isUsableSnapshot(snap(1))).toBe(true);
    expect(isUsableSnapshot({ ...snap(1), format: 2 })).toBe(false);
    expect(isUsableSnapshot({ ...snap(1), media: undefined })).toBe(false);
    expect(isUsableSnapshot({ ...snap(1), recent: undefined })).toBe(false);
  });

  it('uses a newer snapshot for Home right away', async () => {
    global.fetch.mockResolvedValue(reply(200, snap(1)));
    await expect(refreshSnapshot({ force: true })).resolves.toBe('updated');
    const { results } = await getList('trending', 1, 5);
    expect(results.map((a) => a.title)).toEqual(['Fresh Trending']);
  });
});
