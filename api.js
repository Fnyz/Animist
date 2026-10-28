// Anime data from the AniList GraphQL API (https://docs.anilist.co).
// Every screen gets its data from here, so swapping the source again only touches this file.
// Results are returned in the shapes the screens already use (title, image, episodes, ...).
import { useEffect, useState } from 'react';
import axios from 'axios';

// true: read from the saved snapshot in data/animeSnapshot.json (no network).
// false: load live data from AniList. Refresh the snapshot with: node scripts/snapshot-anime.js
export const USE_STATIC_DATA = true;

const ENDPOINT = 'https://graphql.anilist.co';
// The fields the snapshot has (shared with the data scripts), so live anime have the same shape.
const { MEDIA_FIELDS: FULL_FIELDS } = require('./scripts/anilistFields');
const { aniListFilterVariables, matchesFilters, NO_FILTERS } = require('./searchFilters');
// Search and genre pages wait this long for AniList before showing the saved data instead.
const LIVE_TIMEOUT_MS = 5000;
const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
const CACHE_MS = 5 * 60 * 1000;
const cache = new Map();

const MEDIA_FIELDS = `
  id
  title { romaji english native }
  synonyms
  coverImage { extraLarge large }
  bannerImage
  format
  status
  episodes
  nextAiringEpisode { episode airingAt }
  seasonYear
  startDate { year month day }
  genres
  description(asHtml: false)
  averageScore
  isAdult
  trailer { id site }
`;

const request = async (query, variables = {}) => {
  const key = JSON.stringify([query, variables]);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.time < CACHE_MS) return hit.data;

  const { data } = await axios.post(
    ENDPOINT,
    { query, variables },
    { headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, timeout: 15000 }
  );
  if (data.errors?.length) throw new Error(data.errors[0].message);

  cache.set(key, { time: Date.now(), data: data.data });
  return data.data;
};

const FORMAT_LABELS = {
  TV: 'TV', TV_SHORT: 'TV Short', MOVIE: 'Movie', SPECIAL: 'Special',
  OVA: 'OVA', ONA: 'ONA', MUSIC: 'Music',
};

const STATUS_LABELS = {
  RELEASING: 'Ongoing', FINISHED: 'Completed', NOT_YET_RELEASED: 'Upcoming',
  CANCELLED: 'Cancelled', HIATUS: 'On hiatus',
};

// HTML character codes AniList descriptions use ("&Eacute;clair", "&mdash;", "&#8195;").
const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', laquo: '«', raquo: '»', middot: '·', times: '×',
  eacute: 'é', Eacute: 'É', egrave: 'è', Egrave: 'È', aacute: 'á', Aacute: 'Á', agrave: 'à', iacute: 'í',
  oacute: 'ó', uacute: 'ú', ntilde: 'ñ', ouml: 'ö', uuml: 'ü', auml: 'ä', ccedil: 'ç', ecirc: 'ê', ocirc: 'ô',
};
const decodeEntities = (text) =>
  text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([A-Za-z]+);/g, (whole, name) => NAMED_ENTITIES[name] ?? whole);

// Removes HTML tags until none are left (one pass could turn "<scr<b>ipt>" into "<script>").
const stripTags = (text) => {
  let out = text;
  let before;
  do {
    before = out;
    out = out.replace(/<[^<>]*>/g, '');
  } while (out !== before);
  return out.replace(/[<>]/g, '');
};

// AniList sends null for anime without a description yet (brand-new entries). Tags go first, then
// character codes become letters; the result is plain text (shown in <Text>, never as HTML).
const cleanDescription = (text) =>
  decodeEntities(stripTags(String(text ?? '').replace(/<br\s*\/?>/gi, '\n')))
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// Episodes that are already out: for airing shows, everything before the next episode.
const releasedEpisodeCount = (media) => {
  if (media.status === 'NOT_YET_RELEASED') return 0;
  if (media.nextAiringEpisode) return media.nextAiringEpisode.episode - 1;
  return media.episodes ?? 0;
};

// Official full-episode YouTube playlists, matched to AniList ids by scripts/find-episodes.js.
// The app reads this file only; the YouTube API key never ships in the app.
// The copy built into the app; episodeData.js swaps in a newer downloaded list when there is one.
let EPISODE_DATA = require('./data/episodes.json');
let YOUTUBE_EPISODES = EPISODE_DATA.anime;
// AniList data for anime found through the YouTube channels that aren't in the snapshot.
let EPISODE_MEDIA = EPISODE_DATA.media ?? {};

// Screens showing anime data load again when it changes (a downloaded list or snapshot, or live
// AniList details): useDataVersion() returns a number that goes up each time.
const dataListeners = new Set();
let dataVersion = 0;
const dataChanged = () => {
  dataVersion += 1;
  dataListeners.forEach((listener) => listener(dataVersion));
};

export const useDataVersion = () => {
  const [version, setVersion] = useState(dataVersion);
  useEffect(() => {
    dataListeners.add(setVersion);
    return () => dataListeners.delete(setVersion);
  }, []);
  return version;
};

// When the episode list in use was made (ISO time).
export const episodeListGeneratedAt = () => EPISODE_DATA.generatedAt;

// Uses another episode list from now on (a newer one downloaded by episodeData.js), and tells the
// screens showing episodes to load again.
export const replaceEpisodeData = (data) => {
  EPISODE_DATA = data;
  YOUTUBE_EPISODES = data.anime;
  EPISODE_MEDIA = data.media ?? {};
  dataChanged();
};

// Every video for an episode, best first: the main one, then backups from other official
// channels. YouTube blocks some videos in some countries (Philippine channels often play only in
// the Philippines); the player moves on to the next video when YouTube refuses one.
export const episodeVideos = (entry, ep) =>
  ep ? [ep, ...(ep.alts ?? [])].map((v) => ({ videoId: v.videoId, channel: v.channel ?? entry.channel })) : [];

// Franchises (seasons, movies, specials linked as prequel/sequel on AniList), refreshed daily by
// scripts/seasons.js.
const SEASONS = require('./data/seasons.json');
const { isSeason } = require('./scripts/seasonGroups');
const GROUP_OF = new Map(SEASONS.groups.flatMap((group) => group.map((id) => [String(id), group])));

// The Seasons row of an anime page: { seasons, extras } in release order (TV seasons, then movies,
// OVAs and specials), or null when the anime has no other parts.
// Each part: { id, title, format, year, episodes, cover, current, free }.
export const getSeasons = (id) => {
  const group = GROUP_OF.get(String(id));
  if (!group) return null;
  const parts = group.map((partId) => ({
    ...SEASONS.entries[partId],
    id: partId,
    current: String(partId) === String(id),
    free: hasFreeEpisodes(partId),
  }));
  return { seasons: parts.filter((p) => isSeason(p.format)), extras: parts.filter((p) => !isSeason(p.format)) };
};

// True when the anime has official episodes that play inside the app. Works with just an id,
// so places that only store ids (My List, History) can show the badge too.
export const hasFreeEpisodes = (id) => Boolean(YOUTUBE_EPISODES[String(id)]);

// Which episode "Watch free" starts: the one the person was on (or the next, if it's free too),
// else the first free one. null when nothing plays in the app.
export const freeEpisodeToStart = (id, continueEp) => {
  const episodes = YOUTUBE_EPISODES[String(id)]?.episodes;
  if (!episodes) return null;
  if (continueEp && episodes[continueEp]) return continueEp;
  const numbers = Object.keys(episodes).map(Number).sort((a, b) => a - b);
  return numbers[0] ?? null;
};

const EPISODE_NUMBER = /\b(?:episode|ep\.?)\s*(\d+)/i;

// "Episode 3 - Killing Magic" -> "Killing Magic"
const cleanEpisodeTitle = (title = '') =>
  title.replace(/^\s*(?:episode|ep\.?)\s*\d+\s*[-–:|]?\s*/i, '').trim() || null;

// Every episode with its best source: an official YouTube video (plays in the app),
// else an official link such as Crunchyroll (opens outside), else nothing yet.
export const buildEpisodes = (media) => {
  const official = new Map();
  for (const ep of media.streamingEpisodes ?? []) {
    const n = Number(ep.title?.match(EPISODE_NUMBER)?.[1]);
    if (n && !official.has(n)) official.set(n, ep);
  }
  // More links than the anime has episodes: AniList attached another entry's list (the movie
  // Jujutsu Kaisen 0 carries the TV series' 24 episodes), so none of them are this anime's.
  if (media.episodes && official.size > media.episodes) official.clear();
  const yt = YOUTUBE_EPISODES[String(media.id)];
  const ytEpisodes = yt?.episodes ?? {};

  const count = Math.max(
    releasedEpisodeCount(media),
    ...official.keys(),
    ...Object.keys(ytEpisodes).map(Number),
    0
  );

  return Array.from({ length: count }, (_, i) => {
    const number = i + 1;
    const link = official.get(number);
    const videos = episodeVideos(yt, ytEpisodes[number]);
    const video = videos[0] ? { ...videos[0], alternatives: videos.slice(1) } : null;
    return {
      id: `${media.id}-episode-${number}`,
      number,
      title: cleanEpisodeTitle(link?.title),
      thumbnail: link?.thumbnail ?? (video ? `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg` : null),
      youtube: video,
      link: link ? { site: link.site, url: link.url } : null,
      source: video ? 'youtube' : link ? 'link' : 'none',
    };
  });
};

// One normalized anime, with the field names the existing screens use.
export const toAnime = (media) => {
  // Brand-new AniList entries can lack a cover, a description or dates; nothing here may assume them.
  const title = media.title?.english || media.title?.romaji || media.title?.native || 'Untitled';
  const image = media.coverImage?.extraLarge || media.coverImage?.large || null;
  const episodes = buildEpisodes(media);
  const { year, month, day } = media.startDate ?? {};

  return {
    id: media.id,
    animeId: media.id,
    title,
    animeTitle: title,
    otherName: [media.title?.romaji, media.title?.native].filter((t) => t && t !== title).join(' / ') || title,
    image,
    animeImg: image,
    banner: media.bannerImage || image,
    type: FORMAT_LABELS[media.format] ?? media.format ?? 'Unknown',
    subOrDub: FORMAT_LABELS[media.format] ?? media.format,
    status: STATUS_LABELS[media.status] ?? media.status,
    releaseDate: year ? [year, month, day].filter(Boolean).join('-') : 'Unknown',
    year: media.seasonYear ?? year,
    genres: media.genres ?? [],
    description: cleanDescription(media.description) || 'No summary available.',
    score: media.averageScore,
    totalEpisodes: media.episodes ?? episodes.length,
    episodes,
    episodesList: episodes,
    nextEpisode: media.nextAiringEpisode,
    trailer: media.trailer?.site === 'youtube' ? media.trailer.id : null,
    // Official streaming services (Crunchyroll, Netflix, ...), only on the details query.
    watchLinks: (media.externalLinks ?? [])
      .filter((l) => l.type === 'STREAMING')
      .map((l) => ({ site: l.site, url: l.url })),
  };
};

// A newly aired episode, shaped like the old "recent release" items.
const toRelease = (schedule) => ({
  ...toAnime(schedule.media),
  episodeNumber: schedule.episode,
  episodeId: `${schedule.media.id}-episode-${schedule.episode}`,
  airedAt: schedule.airingAt * 1000,
});

const pageOf = (page, items) => ({
  currentPage: page.pageInfo.currentPage,
  hasNextPage: page.pageInfo.hasNextPage,
  results: items,
});

// Airing schedules include adult and very obscure titles; keep known, safe ones.
const isListable = (media) => media && !media.isAdult && (media.popularity ?? 0) >= 2000;

const RECENT_QUERY = `
  query ($page: Int, $perPage: Int, $now: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { currentPage hasNextPage }
      airingSchedules(airingAt_lesser: $now, sort: TIME_DESC) {
        episode
        airingAt
        media { ${MEDIA_FIELDS} popularity }
      }
    }
  }
`;

const LIST_QUERY = `
  query ($page: Int, $perPage: Int, $sort: [MediaSort], $format: MediaFormat, $status: MediaStatus,
         $search: String, $genre: String, $tag: String) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { currentPage hasNextPage }
      media(type: ANIME, isAdult: false, sort: $sort, format: $format, status: $status,
            search: $search, genre: $genre, tag: $tag) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

const LISTS = {
  trending: { sort: ['TRENDING_DESC', 'POPULARITY_DESC'] },
  airing: { sort: ['POPULARITY_DESC'], status: 'RELEASING' },
  popular: { sort: ['POPULARITY_DESC'] },
  movies: { sort: ['POPULARITY_DESC'], format: 'MOVIE' },
};

const nowInSeconds = () => Math.floor(Date.now() / 1000);

// ---- Snapshot and live data -----------------------------------------------
// The data behind Home, Schedule and genres: the snapshot built into the app, or a newer one
// downloaded by episodeData.js. Anime pages, search and genre pages also ask AniList live (below).
let snapshot = require('./data/animeSnapshot.json');

export const snapshotSavedAt = () => snapshot.savedAt;

export const replaceSnapshot = (data) => {
  snapshot = data;
  dataChanged();
};

// Anime as AniList sent them live this session (details, search, genres): newer than the snapshot.
const liveMedia = new Map();
const rememberLive = (media) => {
  if (media?.id && !media.isAdult) liveMedia.set(String(media.id), media);
  return media;
};

const staticMedia = (id) => liveMedia.get(String(id)) ?? snapshot.media[String(id)] ?? EPISODE_MEDIA[String(id)];
// "New on Animist": what the daily update added this week, newest first (the episode list's
// `added`, written by scripts/find-episodes.js): [{ anime, kind: 'new' | 'movie' | 'episodes',
// episodes, at }]. Only anime the app has data for.
export const getNewOnAnimist = () =>
  (EPISODE_DATA.added ?? [])
    .map((a) => ({ ...a, media: staticMedia(a.id) }))
    .filter((a) => a.media && YOUTUBE_EPISODES[String(a.id)])
    .map(({ media, ...a }) => ({ ...a, anime: toAnime(media) }));

// An anime's genres from the saved or live data, or [] (for stats; no request).
export const animeGenres = (id) => staticMedia(id)?.genres ?? [];

// How many episodes an anime has so far, or null when it isn't in the offline data.
export const episodeCount = (id) => {
  const media = staticMedia(id);
  return media ? buildEpisodes(media).length : null;
};

// A frame from the episode's YouTube video, for episodes that play in the app; otherwise null.
export const episodeThumbnail = (id, number) => {
  const video = YOUTUBE_EPISODES[String(id)]?.episodes[number];
  return video ? `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg` : null;
};

const byPopularity = (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0);
const allStaticMedia = () =>
  Object.values({ ...EPISODE_MEDIA, ...snapshot.media })
    .filter((m) => !m.isAdult)
    .sort(byPopularity);

// Anime with episodes that play in the app, most popular first. The list comes from
// data/episodes.json, so it's the same in static and live mode.
const freeToWatchIds = () =>
  Object.keys(YOUTUBE_EPISODES)
    .map(staticMedia)
    .filter(Boolean)
    .sort(byPopularity)
    .map((m) => m.id);

const staticPage = (items, page, perPage, map) => {
  const start = (page - 1) * perPage;
  return {
    currentPage: page,
    hasNextPage: start + perPage < items.length,
    results: items.slice(start, start + perPage).map(map),
  };
};
const mediaPage = (ids, page, perPage) =>
  staticPage(ids.map(staticMedia).filter(Boolean), page, perPage, toAnime);

// Newly aired episodes (Home banner and "New releases" screen).
export const getRecentEpisodes = async (page = 1, perPage = 20) => {
  if (USE_STATIC_DATA) {
    const schedules = snapshot.recent.map((r) => ({ ...r, media: staticMedia(r.mediaId) }));
    return staticPage(schedules, page, perPage, toRelease);
  }
  // Over-fetch because obscure and adult titles are filtered out.
  const data = await request(RECENT_QUERY, { page, perPage: perPage * 3, now: nowInSeconds() });
  const items = data.Page.airingSchedules.filter((s) => isListable(s.media)).slice(0, perPage).map(toRelease);
  return pageOf(data.Page, items);
};

const SCHEDULE_QUERY = `
  query ($page: Int, $from: Int, $to: Int) {
    Page(page: $page, perPage: 50) {
      pageInfo { hasNextPage }
      airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: TIME) {
        episode
        airingAt
        media { ${MEDIA_FIELDS} popularity }
      }
    }
  }
`;

// The coming week's episodes for the Schedule tab, soonest first: [{ anime, episode, airingAt }]
// (airingAt in seconds). Starts a day back, so today's earlier episodes are there too.
export const getSchedule = async () => {
  let entries;
  if (USE_STATIC_DATA) {
    entries = (snapshot.schedule ?? []).map((s) => ({ ...s, media: staticMedia(s.mediaId) }));
  } else {
    const now = nowInSeconds();
    entries = [];
    for (let page = 1; page <= 6; page++) {
      const data = await request(SCHEDULE_QUERY, { page, from: now - 86400, to: now + 8 * 86400 });
      entries.push(...data.Page.airingSchedules);
      if (!data.Page.pageInfo.hasNextPage) break;
    }
  }
  return entries
    .filter((s) => isListable(s.media))
    .sort((a, b) => a.airingAt - b.airingAt)
    .map((s) => ({ anime: toAnime(s.media), episode: s.episode, airingAt: s.airingAt }));
};

// A named list: 'trending' | 'airing' | 'popular' | 'movies' | 'free' (episodes play in the app).
export const getList = async (kind, page = 1, perPage = 20) => {
  if (kind === 'free') return mediaPage(freeToWatchIds(), page, perPage);
  if (USE_STATIC_DATA) return mediaPage(snapshot.lists[kind] ?? [], page, perPage);
  const data = await request(LIST_QUERY, { page, perPage, ...LISTS[kind] });
  return pageOf(data.Page, data.Page.media.map(toAnime));
};

// Everything the Home screen shows, in one request.
export const getHomeData = async () => {
  const [free, recent, trending, airing, popular, movies] = await Promise.all([
    getList('free', 1, 10),
    getRecentEpisodes(1, 10),
    getList('trending', 1, 10),
    getList('airing', 1, 10),
    getList('popular', 1, 10),
    getList('movies', 1, 10),
  ]);
  return {
    newOnAnimist: getNewOnAnimist(),
    free: free.results,
    recent: recent.results,
    trending: trending.results,
    airing: airing.results,
    popular: popular.results,
    movies: movies.results,
  };
};

const LIVE_LIST_QUERY = `
  query ($page: Int, $perPage: Int, $sort: [MediaSort], $search: String, $genre: String, $tag: String,
         $format: MediaFormat, $season: MediaSeason, $seasonYear: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { currentPage hasNextPage }
      media(type: ANIME, isAdult: false, sort: $sort, search: $search, genre: $genre, tag: $tag,
            format: $format, season: $season, seasonYear: $seasonYear) {
        ${FULL_FIELDS}
      }
    }
  }
`;

// A page of anime straight from AniList (the whole catalog), or null when it can't be reached in
// time, so the caller shows the saved data instead.
const livePage = async (variables) => {
  try {
    const data = await withTimeout(request(LIVE_LIST_QUERY, variables), LIVE_TIMEOUT_MS);
    const items = data.Page.media.filter((m) => !m.isAdult).map((m) => toAnime(rememberLive(m)));
    return pageOf(data.Page, items);
  } catch {
    return null;
  }
};

const matchesTitle = (media, q) =>
  !q ||
  [media.title?.english, media.title?.romaji, media.title?.native, ...(media.synonyms ?? [])].some((t) =>
    t?.toLowerCase().includes(q)
  );

// Search, with optional filters (searchFilters.js): { format, season, year, freeOnly }. An empty
// search with filters lists the most popular matches. Live from AniList (every anime), or from the
// saved data when offline. "Free to watch only" always uses the app's own list of free anime.
export const searchAnime = async (search, page = 1, perPage = 20, filters = NO_FILTERS) => {
  const q = search.trim().toLowerCase();
  if (filters.freeOnly) {
    const matches = freeToWatchIds()
      .map(staticMedia)
      .filter((m) => m && matchesTitle(m, q) && matchesFilters(m, filters, true));
    return staticPage(matches, page, perPage, toAnime);
  }
  const live = await livePage({
    page,
    perPage,
    ...(q ? { search: search.trim(), sort: ['SEARCH_MATCH', 'POPULARITY_DESC'] } : { sort: ['POPULARITY_DESC'] }),
    ...aniListFilterVariables(filters),
  });
  if (live) return live;
  const matches = allStaticMedia().filter(
    (m) => matchesTitle(m, q) && matchesFilters(m, filters, Boolean(YOUTUBE_EPISODES[String(m.id)]))
  );
  return staticPage(matches, page, perPage, toAnime);
};

// The app's genre names (genre.js) mapped to AniList genres or tags.
const GENRES = new Set([
  'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy', 'Horror', 'Mahou Shoujo', 'Mecha',
  'Music', 'Mystery', 'Psychological', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller',
]);
const GENRE_ALIASES = {
  'sci-fi': { genre: 'Sci-Fi' },
  'slice-of-life': { genre: 'Slice of Life' },
  pyschological: { genre: 'Psychological' },
  suspence: { genre: 'Thriller' },
  dementia: { tag: 'Surreal Comedy' },
  family: { tag: 'Family Life' },
  game: { tag: 'Video Games' },
  harem: { tag: 'Female Harem' },
  historica: { tag: 'Historical' },
  'martial-arts': { tag: 'Martial Arts' },
  'super-power': { tag: 'Super Power' },
  'shoujo-ai': { tag: 'Yuri' },
  yaoi: { tag: "Boys' Love" },
  dub: {},
};

export const genreFilter = (name) => {
  const key = name.trim().toLowerCase();
  if (GENRE_ALIASES[key]) return GENRE_ALIASES[key];
  const titled = name.trim().replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return GENRES.has(titled) ? { genre: titled } : { tag: titled };
};

// Live from AniList (every anime in the genre), or from the saved data when offline.
export const getByGenre = async (name, page = 1, perPage = 30) => {
  const live = await livePage({ page, perPage, sort: ['POPULARITY_DESC'], ...genreFilter(name) });
  if (live) return live;
  if (USE_STATIC_DATA) {
    const { genre, tag } = genreFilter(name);
    const matches = allStaticMedia().filter((m) =>
      genre ? m.genres?.includes(genre) : tag ? m.tags?.some((t) => t.name === tag) : true
    );
    return staticPage(matches, page, perPage, toAnime);
  }
  const data = await request(LIST_QUERY, { page, perPage, sort: ['POPULARITY_DESC'], ...genreFilter(name) });
  return pageOf(data.Page, data.Page.media.map(toAnime));
};

const INFO_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      ${FULL_FIELDS}
    }
  }
`;

// What a live answer can change on an anime page: status, episode count, the next episode.
const changedLive = (next, before) =>
  !before ||
  next.status !== before.status ||
  next.episodes !== before.episodes ||
  next.nextAiringEpisode?.episode !== before.nextAiringEpisode?.episode ||
  next.nextAiringEpisode?.airingAt !== before.nextAiringEpisode?.airingAt;

// Asks AniList for the latest on one anime (an anime page shows the saved data first). When
// something changed, screens load again with it. Resolves to true when it did.
export const refreshAnimeLive = async (id) => {
  try {
    const data = await request(INFO_QUERY, { id: Number(id) });
    const media = data?.Media;
    if (!media || media.isAdult) return false;
    const before = staticMedia(id);
    rememberLive(media);
    if (!changedLive(media, before)) return false;
    dataChanged();
    return true;
  } catch {
    return false; // Offline or AniList is busy: the saved data stays.
  }
};

const USER_LIST_QUERY = `
  query ($userName: String) {
    MediaListCollection(userName: $userName, type: ANIME) {
      user { name avatar { medium } }
      lists { entries { status media { ${FULL_FIELDS} } } }
    }
  }
`;

// Someone's public anime list on AniList: { user: { name, avatar }, entries: [{ anime, status }] }
// where status is AniList's (CURRENT, PLANNING, COMPLETED, DROPPED, PAUSED, REPEATING). Adult
// titles are left out. Throws a readable message for unknown or private lists.
export const getAniListUserList = async (userName) => {
  const name = userName.trim().replace(/^@/, '');
  if (!name) throw new Error('Enter an AniList username.');
  let data;
  try {
    data = await request(USER_LIST_QUERY, { userName: name });
  } catch (e) {
    const status = e?.response?.status;
    const message = e?.response?.data?.errors?.[0]?.message ?? e?.message ?? '';
    // AniList answers 404 for private lists too, so the message decides.
    if (/private/i.test(message)) throw new Error(`${name}'s list is private on AniList. Make it public there, or try another username.`);
    if (status === 404 || /not found/i.test(message)) throw new Error(`No AniList user called "${name}".`);
    throw new Error("Couldn't reach AniList. Check your connection and try again.");
  }
  const collection = data?.MediaListCollection;
  if (!collection) throw new Error(`No AniList user called "${name}".`);
  const entries = (collection.lists ?? [])
    .flatMap((list) => list.entries ?? [])
    .filter((e) => e.media && !e.media.isAdult)
    .map((e) => ({ anime: toAnime(rememberLive(e.media)), status: e.status }));
  return { user: { name: collection.user?.name ?? name, avatar: collection.user?.avatar?.medium ?? null }, entries };
};

// Full details for one anime. `id` is the AniList id.
export const getAnimeInfo = async (id) => {
  const media = USE_STATIC_DATA ? staticMedia(id) : null;
  if (media) return toAnime(media);
  // Not in the offline data (e.g. an older season from the Seasons row): ask AniList directly.
  try {
    const data = await request(INFO_QUERY, { id: Number(id) });
    if (data?.Media) return toAnime(rememberLive(data.Media));
  } catch {
    // Offline or AniList is down; explained below.
  }
  throw new Error("This anime isn't in the offline data yet, and AniList couldn't be reached. Check your connection.");
};
