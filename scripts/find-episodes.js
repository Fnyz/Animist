#!/usr/bin/env node
// Finds free, official full-episode playlists on YouTube channels and matches them to AniList anime:
// first the anime in data/animeSnapshot.json, then (discovery) any other show a channel has English
// episodes for, looked up on AniList by exact title. Writes data/episodes.json, which the app reads
// (it never sees the key), including the AniList data for discovered anime.
//
// Usage: put YOUTUBE_API_KEY=... in .env, then run: node scripts/find-episodes.js [options]
//   --quick          Fast refresh (about 5 minutes instead of 15-40): AniList is only searched for
//                    playlists it hasn't seen before (see data/finderCache.json), and videos already
//                    in the app keep their saved details instead of being checked again.
//   --summary FILE   Also write a Markdown summary of what changed (for the pull request).
//   --allow-drop     Save even when more than 10% of the episodes disappeared (normally a sign of
//                    an API problem, so the old file is kept).
// Uses roughly 1,500-2,500 of the free 10,000 daily YouTube API quota units. The full search takes
// 15-40 minutes, because AniList allows about 30 requests a minute.
const fs = require('fs');
const path = require('path');
const EPISODES_FORMAT = 1;
const {
  matchPlaylists, scorePlaylist, episodeNumber, isEnglishSub, continuedNumberingOffset, searchTextFor, OTHER_LANGUAGES,
} = require('./episodeMatching');
const { MEDIA_FIELDS } = require('./anilistFields');
const { CHANNELS, MIN_MINUTES } = require('./channels');
const { sameContent, suspiciousDrop, summarizeChanges, summaryMarkdown, recentAdditions } = require('./episodeDiff');
const { findMovies } = require('./findMovies');

const args = process.argv.slice(2);
const QUICK = args.includes('--quick');
const ALLOW_DROP = args.includes('--allow-drop');
const SUMMARY_FILE = args.includes('--summary') ? args[args.indexOf('--summary') + 1] : null;

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'episodes.json');
const SNAPSHOT = path.join(ROOT, 'data', 'animeSnapshot.json');
// What earlier runs learned, so quick runs can skip work: AniList's results for each search (the
// ids of the anime that match a playlist), their AniList data, and videos that were rejected (not
// embeddable, or clips). The app never reads this file, so it doesn't ship.
const CACHE_VERSION = 2;
const CACHE = path.join(ROOT, 'data', 'finderCache.json');

const MAX_PAGES_PER_PLAYLIST = 10; // 500 videos

const readKey = () => {
  if (process.env.YOUTUBE_API_KEY) return process.env.YOUTUBE_API_KEY;
  const envFile = path.join(ROOT, '.env');
  if (fs.existsSync(envFile)) {
    const line = fs.readFileSync(envFile, 'utf8').split('\n').find((l) => l.startsWith('YOUTUBE_API_KEY='));
    const value = line?.slice('YOUTUBE_API_KEY='.length).trim();
    if (value) return value;
  }
  console.error('Missing YOUTUBE_API_KEY. Add it to .env (see .env.example).');
  process.exit(1);
};

const KEY = readKey();
let unitsUsed = 0;

const yt = async (endpoint, params) => {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  for (const [k, v] of Object.entries({ ...params, key: KEY })) url.searchParams.set(k, v);
  const res = await fetch(url);
  unitsUsed += 1;
  const json = await res.json();
  if (json.error) throw new Error(`${endpoint}: ${json.error.message}`);
  return json;
};

// Every page of a paginated list.
const all = async (endpoint, params, maxPages = Infinity) => {
  const items = [];
  let pageToken;
  let pages = 0;
  do {
    const page = await yt(endpoint, { ...params, maxResults: 50, ...(pageToken ? { pageToken } : {}) });
    items.push(...(page.items ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken && ++pages < maxPages);
  return items;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// AniList search, spaced out for its ~30 requests/minute limit. `format` narrows it (e.g. MOVIE).
const anilistSearch = async (search, format = null) => {
  await sleep(2200);
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      query: `query ($search: String, $format: MediaFormat) { Page(perPage: 8) { media(search: $search, type: ANIME, isAdult: false, format: $format) { ${MEDIA_FIELDS} } } }`,
      variables: { search, ...(format ? { format } : {}) },
    }),
  });
  if (res.status === 429) {
    await sleep(60000);
    return anilistSearch(search, format);
  }
  const json = await res.json();
  return json.data?.Page?.media ?? [];
};

// English episodes in a playlist, by episode number, never above the season's length.
// On an English-language channel, any video not marked as another language counts; `skip` drops
// videos by title. Later seasons numbered on from the earlier ones are renumbered from 1.
const englishEpisodes = (items, maxEpisode = Infinity, englishChannel = false, skip = null) => {
  const found = [];
  for (const item of items) {
    const title = item.snippet.title;
    const n = episodeNumber(title);
    const videoId = item.contentDetails?.videoId;
    const english = englishChannel ? !OTHER_LANGUAGES.test(title) : isEnglishSub(title);
    if (n && videoId && english && !skip?.test(title)) found.push({ n, videoId, title });
  }
  const offset = continuedNumberingOffset(found.map((e) => e.n), maxEpisode);
  const episodes = {};
  for (const { n, videoId, title } of found) {
    const number = n - offset;
    if (number > maxEpisode || episodes[number]) continue;
    episodes[number] = { videoId, title };
  }
  return episodes;
};

// One video as stored: its id, its channel when it isn't the anime's main one, and where it plays.
const videoEntry = (e, shared = {}) => {
  const out = { videoId: e.videoId, ...(e.channel ? { channel: e.channel } : {}) };
  for (const key of ['allowedIn', 'blockedIn']) if (e[key] && !shared[key]) out[key] = e[key];
  return out;
};

// Keeps data/episodes.json small (it ships inside the app): video titles aren't shown, and the
// country lists are usually identical for a whole series, so they're stored once per anime
// (backup videos in `alts` always carry their own).
const compact = (entry) => {
  const eps = Object.values(entry.episodes);
  const same = (key) => eps.every((e) => JSON.stringify(e[key]) === JSON.stringify(eps[0][key]));
  const shared = {};
  for (const key of ['allowedIn', 'blockedIn']) if (eps[0]?.[key] && same(key)) shared[key] = eps[0][key];
  const episodes = {};
  for (const [n, e] of Object.entries(entry.episodes)) {
    episodes[n] = videoEntry(e, shared);
    if (e.alts?.length) episodes[n].alts = e.alts.map((alt) => videoEntry(alt));
  }
  return { ...entry, ...shared, episodes };
};

// "PT1H2M3S" -> 62 (whole minutes).
const minutesOf = (isoDuration) => {
  const m = String(isoDuration ?? '').match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  return m ? Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0) : 0;
};

const seasonLength = (media) =>
  media.episodes ?? (media.nextAiringEpisode ? media.nextAiringEpisode.episode - 1 : Infinity);

(async () => {
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
  const known = Object.values(snapshot.media).filter((m) => !m.isAdult);
  const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
  const saved = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
  // Version 1 kept one answer per search, which loses a season when two seasons' playlists search
  // for the same title; its searches are dropped (looked up again), the rest is still good.
  const cache = {
    version: CACHE_VERSION,
    searches: saved.version === CACHE_VERSION ? saved.searches ?? {} : {},
    media: saved.media ?? {},
    rejected: saved.rejected ?? {},
    movieSearches: saved.movieSearches ?? {},
  };
  for (const m of Object.values(previous?.media ?? {})) cache.media[m.id] ??= m;
  // Videos already in the app, with the countries saved for them (quick runs reuse these).
  const savedVideos = new Map();
  for (const entry of Object.values(previous?.anime ?? {})) {
    for (const ep of Object.values(entry.episodes)) {
      const main = ep.allowedIn || ep.blockedIn ? ep : { ...ep, allowedIn: entry.allowedIn, blockedIn: entry.blockedIn };
      for (const v of [main, ...(ep.alts ?? [])]) savedVideos.set(v.videoId, { allowedIn: v.allowedIn, blockedIn: v.blockedIn });
    }
  }

  // 1) Every playlist from the official channels, and its videos (read once).
  const channels = [];
  const channelInfo = []; // with each channel's uploads list, for step 4 (movies)
  const playlists = [];
  for (const { handle, english = false, skip = null } of CHANNELS) {
    const channel = (await yt('channels', { part: 'snippet,contentDetails', forHandle: handle })).items?.[0];
    if (!channel) {
      console.warn(`Channel ${handle} not found, skipping.`);
      continue;
    }
    const title = channel.snippet.title;
    channels.push({ handle, id: channel.id, title });
    channelInfo.push({ handle, title, english, skip, uploadsId: channel.contentDetails?.relatedPlaylists?.uploads });
    const lists = await all('playlists', { part: 'snippet,contentDetails', channelId: channel.id });
    const usable = lists.filter(
      (pl) => (pl.contentDetails?.itemCount ?? 0) > 0 && !OTHER_LANGUAGES.test(pl.snippet.title) && !skip?.test(pl.snippet.title)
    );
    for (const pl of usable) playlists.push({ id: pl.id, title: pl.snippet.title, channel: title, english, skip });
    console.log(`${title}: ${lists.length} playlists, ${usable.length} usable`);
  }
  const items = new Map();
  for (const [i, pl] of playlists.entries()) {
    items.set(pl.id, await all('playlistItems', { part: 'snippet,contentDetails', playlistId: pl.id }, MAX_PAGES_PER_PLAYLIST));
    if ((i + 1) % 100 === 0) console.log(`  read ${i + 1}/${playlists.length} playlists`);
  }

  // 2) Discovery: playlists that don't match a known anime but hold English episodes
  //    are looked up on AniList, and kept only on an exact title match.
  //    Quick mode only searches for titles no earlier run has searched for.
  const knownMatches = matchPlaylists(playlists, known);
  const usedPlaylists = new Set([...knownMatches.values()].flat().map((p) => p.id));
  const candidates = playlists.filter(
    (pl) => !usedPlaylists.has(pl.id) && Object.keys(englishEpisodes(items.get(pl.id), Infinity, pl.english, pl.skip)).length >= 2
  );
  const knownIds = new Set(known.map((m) => m.id));
  const discovered = new Map();
  // Playlists that share a search ("Frieren" Season 1 and Season 2) share one AniList search; each
  // playlist then picks its own best match from the results.
  const bySearch = new Map();
  for (const pl of candidates) {
    const search = searchTextFor(pl.title);
    if (search) bySearch.set(search, [...(bySearch.get(search) ?? []), pl]);
  }
  const toSearch = [...bySearch.keys()].filter((search) => !(QUICK && search in cache.searches));
  console.log(
    `Searching AniList for ${toSearch.length} titles (about ${Math.ceil(toSearch.length * 2.2 / 60)} min)` +
      (QUICK ? `; ${bySearch.size - toSearch.length} known from earlier runs.` : '.')
  );
  for (const [i, search] of toSearch.entries()) {
    // Only anime that match one of the playlists are kept, so the cache stays small.
    const fits = (await anilistSearch(search)).filter((m) => bySearch.get(search).some((pl) => scorePlaylist(pl.title, m) > 0));
    cache.searches[search] = fits.map((m) => m.id);
    for (const m of fits) cache.media[m.id] = m;
    if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${toSearch.length} searched`);
  }
  for (const [search, lists] of bySearch) {
    const results = (cache.searches[search] ?? []).map((id) => cache.media[id]).filter(Boolean);
    for (const pl of lists) {
      const best = results
        .map((m) => ({ m, score: scorePlaylist(pl.title, m) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score || (b.m.popularity ?? 0) - (a.m.popularity ?? 0))[0];
      if (best && !knownIds.has(best.m.id)) discovered.set(best.m.id, best.m);
    }
  }
  console.log(`${discovered.size} anime found beyond the snapshot.`);

  // 3) Final matching across known and discovered anime. An anime can match playlists on several
  //    channels: each episode comes from the best playlist that has it, the others fill the gaps.
  const allMedia = [...known, ...discovered.values()];
  const byId = new Map(allMedia.map((m) => [m.id, m]));
  const matches = matchPlaylists(playlists, allMedia);

  const anime = {};
  for (const [mediaId, lists] of matches) {
    const maxEpisode = seasonLength(byId.get(mediaId));
    // Every candidate video per episode number, best playlist first. A video counts once per anime:
    // the same upload often sits in several playlists ("Season 1" and "All Seasons").
    const candidates = {};
    const seen = new Set();
    for (const pl of lists) {
      for (const [n, ep] of Object.entries(englishEpisodes(items.get(pl.id), maxEpisode, pl.english, pl.skip))) {
        if (seen.has(ep.videoId)) continue;
        seen.add(ep.videoId);
        (candidates[n] ??= []).push({ ...ep, channel: pl.channel, english: pl.english, playlist: pl });
      }
    }

    // Which countries can watch each video, so the app can fall back where it's blocked. Quick runs
    // reuse what's saved for videos already in the app (or rejected before) and only ask about new ones.
    const all = Object.values(candidates).flat();
    const unchecked = [];
    for (const ep of all) {
      const saved = savedVideos.get(ep.videoId);
      const rejected = cache.rejected[ep.videoId];
      if (QUICK && saved) Object.assign(ep, saved);
      else if (QUICK && rejected === 'short') ep.tooShort = true;
      else if (QUICK && rejected === 'embed') ep.embeddable = false;
      else unchecked.push(ep);
    }
    for (let i = 0; i < unchecked.length; i += 50) {
      const batch = unchecked.slice(i, i + 50);
      const details = await yt('videos', { part: 'contentDetails,status', id: batch.map((e) => e.videoId).join(',') });
      for (const v of details.items ?? []) {
        for (const ep of batch.filter((e) => e.videoId === v.id)) {
          const r = v.contentDetails?.regionRestriction;
          if (r?.allowed) ep.allowedIn = r.allowed;
          if (r?.blocked) ep.blockedIn = r.blocked;
          if (v.status?.embeddable === false) ep.embeddable = false;
          if (ep.english && minutesOf(v.contentDetails?.duration) < MIN_MINUTES) ep.tooShort = true;
          if (ep.embeddable === false) cache.rejected[ep.videoId] = 'embed';
          else if (ep.tooShort) cache.rejected[ep.videoId] = 'short';
          else delete cache.rejected[ep.videoId];
        }
      }
    }

    // The best usable video per episode, plus backups from other playlists for countries where it's
    // blocked (Philippine channels often play only in the Philippines); the app picks the first one
    // that plays where the viewer is. Skipped: videos YouTube won't play inside other apps, and
    // clips on English-language channels.
    const episodes = {};
    for (const [n, options] of Object.entries(candidates)) {
      const usable = options.filter((e) => e.embeddable !== false && !e.tooShort);
      if (usable.length) episodes[n] = { ...usable[0], alts: usable.slice(1) };
    }
    if (!Object.keys(episodes).length) continue;

    // The playlist that supplied the most episodes names the anime's main channel.
    const counts = new Map();
    for (const ep of Object.values(episodes)) counts.set(ep.playlist, (counts.get(ep.playlist) ?? 0) + 1);
    const main = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    for (const ep of Object.values(episodes)) {
      for (const video of [ep, ...ep.alts]) if (video.channel === main.channel) delete video.channel;
    }
    anime[mediaId] = compact({ channel: main.channel, playlistId: main.id, playlistTitle: main.title, episodes });
  }

  // 4) Full movies the channels uploaded (often outside any playlist), stored as one-episode anime
  //    (the app plays a movie as episode 1). An anime already filled from playlists keeps those.
  const movies = await findMovies({
    channels: channelInfo,
    playlists,
    playlistItems: items,
    movies: allMedia.filter((m) => m.format === 'MOVIE'),
    all,
    yt,
    searchMovies: (text) => anilistSearch(text, 'MOVIE'),
    minutesOf,
    cache,
    quick: QUICK,
    log: console.log,
  });
  for (const [id, { media: movie, videos }] of movies) {
    if (anime[id]) continue;
    const [main, ...alts] = videos;
    const strip = (v) => (v.channel === main.channel ? { ...v, channel: undefined } : v);
    anime[id] = compact({ channel: main.channel, kind: 'movie', episodes: { 1: { ...strip(main), alts: alts.map(strip) } } });
    byId.set(id, movie);
  }

  // Movies the daily YouTube search found (scripts/search-movies.js), kept until a channel scan
  // finds the same anime itself.
  let searched = {};
  try {
    searched = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'movieSearch.json'), 'utf8')).found ?? {};
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  for (const [id, { media: movie, videos }] of Object.entries(searched)) {
    if (anime[id] || !videos?.length || !movie) continue;
    const [main, ...alts] = videos;
    const strip = (v) => (v.channel === main.channel ? { ...v, channel: undefined } : v);
    anime[id] = compact({ channel: main.channel, kind: 'movie', episodes: { 1: { ...strip(main), alts: alts.map(strip) } } });
    byId.set(Number(id), movie);
  }

  // AniList data for anime that aren't in the snapshot, so the app can show them.
  const media = {};
  for (const id of Object.keys(anime)) if (!knownIds.has(Number(id))) media[id] = byId.get(Number(id));

  // Saved even when the episodes didn't change, so the next quick run can skip this run's lookups.
  fs.writeFileSync(CACHE, JSON.stringify(cache) + '\n');

  // `format` changes only when the file's shape changes in a way older apps can't read; apps that
  // download the list (episodeData.js) ignore a format they don't know and keep their own list.
  const result = { format: EPISODES_FORMAT, generatedAt: new Date().toISOString(), channels, anime, media };
  const changes = summarizeChanges(previous, result);
  // What this run added, kept a week, for the app's "New on Animist" row on Home.
  result.added = recentAdditions(previous?.added, changes, Date.now(), (id) => anime[id]?.kind === 'movie');
  console.log(`YouTube API quota used: about ${unitsUsed} of 10,000 units.`);

  if (previous && sameContent(previous, result)) {
    console.log('No changes: data/episodes.json is already up to date.');
    return;
  }
  if (previous && !ALLOW_DROP && suspiciousDrop(previous, result)) {
    console.error(
      `Kept the old data/episodes.json: this run found ${changes.after} episodes instead of ${changes.before}, ` +
        'which usually means a YouTube or AniList problem. Run again later, or add --allow-drop if it is real.'
    );
    process.exit(1);
  }

  // Written without indentation: the file ships inside the app.
  fs.writeFileSync(OUT, JSON.stringify(result) + '\n');
  console.log(`Saved ${Object.keys(anime).length} anime (${Object.keys(media).length} discovered) with ${changes.after} episodes to data/episodes.json`);
  console.log(`${changes.updated.length} anime got new episodes, ${changes.newAnime.length} new anime, ${changes.removedEpisodes} episodes gone.`);

  if (SUMMARY_FILE) {
    const titleOf = (id) => {
      const m = byId.get(Number(id)) ?? snapshot.media[id];
      return m?.title?.english || m?.title?.romaji || `AniList #${id}`;
    };
    fs.writeFileSync(SUMMARY_FILE, summaryMarkdown(changes, titleOf));
  }
})().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
