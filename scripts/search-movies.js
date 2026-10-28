#!/usr/bin/env node
// Searches all of YouTube for free full anime movies, a few each day (see movieSearchLogic.js):
// - uploads by the official channels in scripts/channels.js go into the app right away;
// - full uploads by channels we don't know are listed for review in the pull request (maybe a
//   licensor worth adding to channels.js, maybe a pirate). Nothing from them reaches the app.
// Saves data/movieSearch.json (what it found and where it stopped; find-episodes.js keeps the found
// movies) and adds new movies to data/episodes.json.
//
// Usage: node scripts/search-movies.js [--summary FILE] [--count N]
// About 3,000 of the free 10,000 daily YouTube quota units (30 searches), so it runs on its own day
// budget; the full episode search uses up to ~2,700.
const fs = require('fs');
const path = require('path');
const { CHANNELS } = require('./channels');
const { pickBatch, classifyResult, searchQuery, SEARCHES_PER_DAY } = require('./movieSearchLogic');
const { summarizeChanges, recentAdditions } = require('./episodeDiff');

const ROOT = path.join(__dirname, '..');
const EPISODES = path.join(ROOT, 'data', 'episodes.json');
const SNAPSHOT = path.join(ROOT, 'data', 'animeSnapshot.json');
const STATE = path.join(ROOT, 'data', 'movieSearch.json');
const args = process.argv.slice(2);
const SUMMARY_FILE = args.includes('--summary') ? args[args.indexOf('--summary') + 1] : null;
const COUNT = args.includes('--count') ? Number(args[args.indexOf('--count') + 1]) : SEARCHES_PER_DAY;
const MAX_REVIEW = 40; // channels kept for review
// Smaller channels aren't listed for review: official distributors are always bigger than this.
const MIN_REVIEW_SUBSCRIBERS = 10000;

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return fallback;
    throw e;
  }
};

const readKey = () => {
  if (process.env.YOUTUBE_API_KEY) return process.env.YOUTUBE_API_KEY;
  try {
    const line = fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n').find((l) => l.startsWith('YOUTUBE_API_KEY='));
    const value = line?.slice('YOUTUBE_API_KEY='.length).trim();
    if (value) return value;
  } catch {
    // no .env
  }
  console.error('Missing YOUTUBE_API_KEY. Add it to .env (see .env.example).');
  process.exit(1);
};
const KEY = readKey();
let units = 0;
const yt = async (endpoint, params, cost = 1) => {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  for (const [k, v] of Object.entries({ ...params, key: KEY })) url.searchParams.set(k, v);
  units += cost;
  const json = await (await fetch(url)).json();
  if (json.error) throw new Error(`${endpoint}: ${json.error.message}`);
  return json;
};

const minutesOf = (iso) => {
  const m = String(iso ?? '').match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  return m ? Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0) : 0;
};

// One video as the app stores it.
const stored = ({ videoId, channel, allowedIn, blockedIn }) => ({
  videoId,
  channel,
  ...(allowedIn ? { allowedIn } : {}),
  ...(blockedIn ? { blockedIn } : {}),
});

(async () => {
  const episodes = readJson(EPISODES, null);
  const snapshot = readJson(SNAPSHOT, { media: {} });
  if (!episodes) throw new Error('data/episodes.json is missing; run find-episodes.js first');
  const state = readJson(STATE, { version: 1, next: 0, found: {}, review: {} });

  // Official channels by YouTube id (episodes.json knows the ids of the handles in channels.js).
  const flags = new Map(CHANNELS.map((c) => [c.handle, c]));
  const official = new Map(
    (episodes.channels ?? []).map((c) => [c.id, { title: c.title, english: flags.get(c.handle)?.english ?? false, skip: flags.get(c.handle)?.skip ?? null }])
  );

  const movies = [...Object.values(snapshot.media ?? {}), ...Object.values(episodes.media ?? {})].filter((m) => m.format === 'MOVIE');
  const unique = [...new Map(movies.map((m) => [m.id, m])).values()];
  const playing = new Set([...Object.keys(episodes.anime ?? {}), ...Object.keys(state.found)]);
  const { batch, next } = pickBatch(unique, playing, state.next, COUNT);
  console.log(`Searching YouTube for ${batch.length} movies (about ${batch.length * 100} quota units).`);

  const newlyFound = [];
  const reviewSeen = [];
  for (const movie of batch) {
    const results = await yt(
      'search',
      { part: 'snippet', type: 'video', videoDuration: 'long', videoEmbeddable: 'true', maxResults: 10, q: searchQuery(movie) },
      100
    );
    const ids = (results.items ?? []).map((r) => r.id?.videoId).filter(Boolean);
    if (!ids.length) continue;
    const details = await yt('videos', { part: 'snippet,contentDetails,status', id: ids.join(',') });
    const accepted = [];
    for (const v of details.items ?? []) {
      const video = {
        videoId: v.id,
        title: v.snippet?.title,
        channelId: v.snippet?.channelId,
        channelTitle: v.snippet?.channelTitle,
        minutes: minutesOf(v.contentDetails?.duration),
        embeddable: v.status?.embeddable,
        allowedIn: v.contentDetails?.regionRestriction?.allowed,
        blockedIn: v.contentDetails?.regionRestriction?.blocked,
      };
      const verdict = classifyResult(video, movie, official);
      if (verdict === 'accept') accepted.push({ ...video, channel: official.get(video.channelId).title });
      if (verdict === 'review') {
        const entry = (state.review[video.channelId] ??= { title: video.channelTitle, url: `https://www.youtube.com/channel/${video.channelId}`, movies: [], firstSeen: new Date().toISOString() });
        const title = movie.title?.english || movie.title?.romaji;
        if (!entry.movies.includes(title)) entry.movies.push(title);
        entry.example = `https://www.youtube.com/watch?v=${video.videoId}`;
        reviewSeen.push(video.channelId);
      }
    }
    if (accepted.length) {
      accepted.sort((a, b) => b.minutes - a.minutes);
      state.found[movie.id] = { media: movie, videos: accepted.map(stored), foundAt: new Date().toISOString() };
      newlyFound.push(movie);
      console.log(`  ✓ ${movie.title?.english || movie.title?.romaji} on ${accepted[0].channel}`);
    }
  }
  state.next = next;

  // Channels to review: their subscriber counts, biggest first, at most MAX_REVIEW kept.
  const reviewIds = Object.keys(state.review);
  for (let i = 0; i < reviewIds.length; i += 50) {
    const info = await yt('channels', { part: 'statistics', id: reviewIds.slice(i, i + 50).join(',') });
    for (const c of info.items ?? []) state.review[c.id].subscribers = Number(c.statistics?.subscriberCount ?? 0);
  }
  state.review = Object.fromEntries(
    Object.entries(state.review)
      .filter(([, r]) => (r.subscribers ?? 0) >= MIN_REVIEW_SUBSCRIBERS)
      .sort((a, b) => (b[1].subscribers ?? 0) - (a[1].subscribers ?? 0))
      .slice(0, MAX_REVIEW)
  );
  fs.writeFileSync(STATE, JSON.stringify(state, null, 1) + '\n');

  // New movies go into the app now (find-episodes.js keeps them from data/movieSearch.json).
  if (newlyFound.length) {
    const before = JSON.parse(JSON.stringify(episodes));
    for (const movie of newlyFound) {
      const [main, ...alts] = state.found[movie.id].videos;
      const strip = (v) => (v.channel === main.channel ? { ...v, channel: undefined } : v);
      episodes.anime[movie.id] = { channel: main.channel, kind: 'movie', episodes: { 1: { ...strip(main), alts: alts.map(strip) } } };
      if (!snapshot.media?.[movie.id]) (episodes.media ??= {})[movie.id] = movie;
    }
    episodes.generatedAt = new Date().toISOString();
    episodes.added = recentAdditions(before.added, summarizeChanges(before, episodes), Date.now(), (id) => episodes.anime[id]?.kind === 'movie');
    fs.writeFileSync(EPISODES, JSON.stringify(episodes) + '\n');
  }

  console.log(`Found ${newlyFound.length} new free movies; ${[...new Set(reviewSeen)].filter((id) => state.review[id]).length} unknown channels to review. Quota used: about ${units} units.`);
  if (SUMMARY_FILE) {
    const lines = [];
    if (newlyFound.length) {
      lines.push('### Free movies found by search', '');
      for (const m of newlyFound) lines.push(`- ${m.title?.english || m.title?.romaji} (${state.found[m.id].videos[0].channel})`);
      lines.push('');
    }
    const fresh = [...new Set(reviewSeen)].map((id) => [id, state.review[id]]).filter(([, r]) => r);
    if (fresh.length) {
      lines.push('### Channels to review', '', 'Full uploads of anime movies from channels Animist doesn\'t use. Only add a channel to `scripts/channels.js` if it\'s an official licensor (studio, distributor, TV network); most are not.', '');
      for (const [, r] of fresh) lines.push(`- [${r.title}](${r.url}) · ${(r.subscribers ?? 0).toLocaleString('en-US')} subscribers · ${r.movies.slice(0, 3).join(', ')} ([example](${r.example}))`);
      lines.push('');
    }
    fs.writeFileSync(SUMMARY_FILE, lines.join('\n'));
  }
})().catch((err) => {
  console.error('Movie search failed:', err.message);
  process.exit(1);
});
