// Opening and ending times for the "Skip intro" / "Skip outro" buttons, from AniSkip
// (https://api.aniskip.com, free, community-made, keyed by MyAnimeList id and episode number).
// Episodes nobody has timed yet simply get no button.
import axios from 'axios';

const API = 'https://api.aniskip.com/v2/skip-times';
const cache = new Map();

// AniSkip's answer -> [{ type: 'op' | 'ed', start, end, episodeLength }] (seconds).
export const parseSkipTimes = (data) =>
  (data?.found ? data.results ?? [] : [])
    .filter((r) => (r.skipType === 'op' || r.skipType === 'ed') && r.interval?.endTime > r.interval?.startTime)
    .map((r) => ({ type: r.skipType, start: r.interval.startTime, end: r.interval.endTime, episodeLength: r.episodeLength ?? 0 }));

// The times for this upload: AniSkip may know several versions of an episode; the one closest in
// length is used, and a small difference (a channel's logo at the start) shifts the times. Times
// for a version more than 30 s longer or shorter are dropped. One opening and one ending at most.
export const fitToVideo = (times, videoLength) => {
  const best = {};
  for (const t of times) {
    const diff = videoLength > 0 && t.episodeLength > 0 ? videoLength - t.episodeLength : 0;
    if (Math.abs(diff) > 30) continue;
    if (!best[t.type] || Math.abs(diff) < Math.abs(best[t.type].diff)) best[t.type] = { ...t, diff };
  }
  return Object.values(best).map(({ type, start, end, diff }) => {
    const shift = diff > 0 ? diff : 0; // extra seconds are at the start (a logo)
    return { type, start: start + shift, end: Math.min(end + shift, videoLength > 0 ? videoLength : Infinity) };
  });
};

// Raw times for an episode, or [] (unknown, or AniSkip unreachable). Asked once per episode.
export const fetchSkipTimes = (malId, episode) => {
  if (!malId || !episode) return Promise.resolve([]);
  const key = `${malId}/${episode}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      axios
        .get(`${API}/${malId}/${episode}`, { params: { 'types[]': ['op', 'ed'], episodeLength: 0 }, timeout: 8000 })
        .then((res) => parseSkipTimes(res.data))
        .catch((e) => (e?.response?.status === 404 ? [] : (cache.delete(key), [])))
    );
  }
  return cache.get(key);
};

// The skip button to show at `time`, or null: from the start of the part to 2 s before its end.
export const activeSkip = (skips, time) => skips.find((s) => time >= s.start && time < s.end - 2) ?? null;
