#!/usr/bin/env node
// Finds free, official full-episode playlists on YouTube channels and matches them to AniList anime:
// first the anime in data/animeSnapshot.json, then (discovery) any other show a channel has English
// episodes for, looked up on AniList by exact title. Writes data/episodes.json, which the app reads
// (it never sees the key), including the AniList data for discovered anime.
//
// Usage: put YOUTUBE_API_KEY=... in .env, then run: node scripts/find-episodes.js [options]
//   --quick          Skip the AniList search for new shows: only refresh episodes of anime the app
//                    already has (about 5 minutes instead of 15-40).
//   --summary FILE   Also write a Markdown summary of what changed (for the pull request).
//   --allow-drop     Save even when more than 10% of the episodes disappeared (normally a sign of
//                    an API problem, so the old file is kept).
// Uses roughly 1,500-2,500 of the free 10,000 daily YouTube API quota units. The full search takes
// 15-40 minutes, because AniList allows about 30 requests a minute.
const fs = require('fs');
const path = require('path');
const { matchPlaylists, scorePlaylist, episodeNumber, isEnglishSub, OTHER_LANGUAGES } = require('./episodeMatching');
const { MEDIA_FIELDS } = require('./anilistFields');
const { CHANNELS, MIN_MINUTES } = require('./channels');
const { sameContent, suspiciousDrop, summarizeChanges, summaryMarkdown } = require('./episodeDiff');

const args = process.argv.slice(2);
const QUICK = args.includes('--quick');
const ALLOW_DROP = args.includes('--allow-drop');
const SUMMARY_FILE = args.includes('--summary') ? args[args.indexOf('--summary') + 1] : null;

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'episodes.json');
const SNAPSHOT = path.join(ROOT, 'data', 'animeSnapshot.json');

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

// AniList search, spaced out for its ~30 requests/minute limit.
const anilistSearch = async (search) => {
  await sleep(2200);
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      query: `query ($search: String) { Page(perPage: 8) { media(search: $search, type: ANIME, isAdult: false) { ${MEDIA_FIELDS} } } }`,
      variables: { search },
    }),
  });
  if (res.status === 429) {
    await sleep(60000);
    return anilistSearch(search);
  }
  const json = await res.json();
  return json.data?.Page?.media ?? [];
};

// The English title inside a playlist name, for searching AniList.
// "《中文》|《Chainsaw Man》【Ani-One】" -> "Chainsaw Man"; "[2026 Oct] Title [English Sub]" -> "Title"
const searchTextFor = (playlistTitle) => {
  const parts = playlistTitle
    .replace(/[[【(（][^\]】)）]*[\]】)）]/g, ' ')
    .split(/[|｜《》]/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => /[a-z]{3}/i.test(p));
  return parts[0] ?? null;
};

// English episodes in a playlist, by episode number, never above the season's length.
// On an English-language channel, any video not marked as another language counts.
const englishEpisodes = (items, maxEpisode = Infinity, englishChannel = false) => {
  const episodes = {};
  for (const item of items) {
    const title = item.snippet.title;
    const n = episodeNumber(title);
    const videoId = item.contentDetails?.videoId;
    const english = englishChannel ? !OTHER_LANGUAGES.test(title) : isEnglishSub(title);
    if (!n || n > maxEpisode || !videoId || episodes[n] || !english) continue;
    episodes[n] = { videoId, title: item.snippet.title };
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

  // 1) Every playlist from the official channels, and its videos (read once).
  const channels = [];
  const playlists = [];
  for (const { handle, english = false } of CHANNELS) {
    const channel = (await yt('channels', { part: 'snippet', forHandle: handle })).items?.[0];
    if (!channel) {
      console.warn(`Channel ${handle} not found, skipping.`);
      continue;
    }
    const title = channel.snippet.title;
    channels.push({ handle, id: channel.id, title });
    const lists = await all('playlists', { part: 'snippet,contentDetails', channelId: channel.id });
    const usable = lists.filter((pl) => (pl.contentDetails?.itemCount ?? 0) > 0 && !OTHER_LANGUAGES.test(pl.snippet.title));
    for (const pl of usable) playlists.push({ id: pl.id, title: pl.snippet.title, channel: title, english });
    console.log(`${title}: ${lists.length} playlists, ${usable.length} usable`);
  }
  const items = new Map();
  for (const [i, pl] of playlists.entries()) {
    items.set(pl.id, await all('playlistItems', { part: 'snippet,contentDetails', playlistId: pl.id }, MAX_PAGES_PER_PLAYLIST));
    if ((i + 1) % 100 === 0) console.log(`  read ${i + 1}/${playlists.length} playlists`);
  }

  // 2) Discovery: playlists that don't match a known anime but hold English episodes
  //    are looked up on AniList, and kept only on an exact title match.
  //    Quick mode skips this and reuses the anime found by earlier runs.
  const knownMatches = matchPlaylists(playlists, known);
  const usedPlaylists = new Set([...knownMatches.values()].flat().map((p) => p.id));
  const candidates = QUICK
    ? []
    : playlists.filter(
        (pl) => !usedPlaylists.has(pl.id) && Object.keys(englishEpisodes(items.get(pl.id), Infinity, pl.english)).length >= 2
      );
  const knownIds = new Set(known.map((m) => m.id));
  const discovered = new Map();
  if (QUICK) {
    for (const m of Object.values(previous?.media ?? {})) if (!knownIds.has(m.id)) discovered.set(m.id, m);
    console.log(`Quick mode: no AniList search, reusing ${discovered.size} anime found earlier.`);
  } else {
    console.log(`Looking up ${candidates.length} more playlists on AniList (about ${Math.ceil(candidates.length * 2.2 / 60)} min)...`);
  }
  for (const [i, pl] of candidates.entries()) {
    const search = searchTextFor(pl.title);
    if (!search) continue;
    const best = (await anilistSearch(search))
      .map((m) => ({ m, score: scorePlaylist(pl.title, m) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || (b.m.popularity ?? 0) - (a.m.popularity ?? 0))[0];
    if (best && !knownIds.has(best.m.id)) discovered.set(best.m.id, best.m);
    if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${candidates.length} looked up, ${discovered.size} new anime found`);
  }

  // 3) Final matching across known and discovered anime. An anime can match playlists on several
  //    channels: each episode comes from the best playlist that has it, the others fill the gaps.
  const allMedia = [...known, ...discovered.values()];
  const byId = new Map(allMedia.map((m) => [m.id, m]));
  const matches = matchPlaylists(playlists, allMedia);

  const anime = {};
  for (const [mediaId, lists] of matches) {
    const maxEpisode = seasonLength(byId.get(mediaId));
    // Every candidate video per episode number, best playlist first.
    const candidates = {};
    for (const pl of lists) {
      for (const [n, ep] of Object.entries(englishEpisodes(items.get(pl.id), maxEpisode, pl.english))) {
        (candidates[n] ??= []).push({ ...ep, channel: pl.channel, english: pl.english, playlist: pl });
      }
    }

    // Which countries can watch each video, so the app can fall back where it's blocked.
    const all = Object.values(candidates).flat();
    for (let i = 0; i < all.length; i += 50) {
      const batch = all.slice(i, i + 50);
      const details = await yt('videos', { part: 'contentDetails,status', id: batch.map((e) => e.videoId).join(',') });
      for (const v of details.items ?? []) {
        for (const ep of batch.filter((e) => e.videoId === v.id)) {
          const r = v.contentDetails?.regionRestriction;
          if (r?.allowed) ep.allowedIn = r.allowed;
          if (r?.blocked) ep.blockedIn = r.blocked;
          if (v.status?.embeddable === false) ep.embeddable = false;
          if (ep.english && minutesOf(v.contentDetails?.duration) < MIN_MINUTES) ep.tooShort = true;
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

  // AniList data for anime that aren't in the snapshot, so the app can show them.
  const media = {};
  for (const id of Object.keys(anime)) if (!knownIds.has(Number(id))) media[id] = byId.get(Number(id));

  const result = { generatedAt: new Date().toISOString(), channels, anime, media };
  const changes = summarizeChanges(previous, result);
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
