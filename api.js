// Anime data from the AniList GraphQL API (https://docs.anilist.co).
// Every screen gets its data from here, so swapping the source again only touches this file.
// Results are returned in the shapes the screens already use (title, image, episodes, ...).
import axios from 'axios';

// true: read from the saved snapshot in data/animeSnapshot.json (no network).
// false: load live data from AniList. Refresh the snapshot with: node scripts/snapshot-anime.js
export const USE_STATIC_DATA = true;

const ENDPOINT = 'https://graphql.anilist.co';
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

const cleanDescription = (text = '') =>
  text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// Episodes that are already out: for airing shows, everything before the next episode.
const releasedEpisodeCount = (media) => {
  if (media.status === 'NOT_YET_RELEASED') return 0;
  if (media.nextAiringEpisode) return media.nextAiringEpisode.episode - 1;
  return media.episodes ?? 0;
};

// One normalized anime, with the field names the existing screens use.
export const toAnime = (media) => {
  const title = media.title.english || media.title.romaji;
  const image = media.coverImage.extraLarge || media.coverImage.large;
  const released = releasedEpisodeCount(media);
  const episodes = Array.from({ length: released }, (_, i) => ({
    id: `${media.id}-episode-${i + 1}`,
    number: i + 1,
  }));
  const { year, month, day } = media.startDate ?? {};

  return {
    id: media.id,
    animeId: media.id,
    title,
    animeTitle: title,
    otherName: [media.title.romaji, media.title.native].filter((t) => t && t !== title).join(' / ') || title,
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
    totalEpisodes: media.episodes ?? released,
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

// ---- Static snapshot -------------------------------------------------------
const snapshot = USE_STATIC_DATA ? require('./data/animeSnapshot.json') : null;
const staticMedia = (id) => snapshot.media[String(id)];
const allStaticMedia = () =>
  Object.values(snapshot.media)
    .filter((m) => !m.isAdult)
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));

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

// A named list: 'trending' | 'airing' | 'popular' | 'movies'.
export const getList = async (kind, page = 1, perPage = 20) => {
  if (USE_STATIC_DATA) return mediaPage(snapshot.lists[kind] ?? [], page, perPage);
  const data = await request(LIST_QUERY, { page, perPage, ...LISTS[kind] });
  return pageOf(data.Page, data.Page.media.map(toAnime));
};

// Everything the Home screen shows, in one request.
export const getHomeData = async () => {
  const [recent, trending, airing, popular, movies] = await Promise.all([
    getRecentEpisodes(1, 10),
    getList('trending', 1, 10),
    getList('airing', 1, 10),
    getList('popular', 1, 10),
    getList('movies', 1, 10),
  ]);
  return {
    recent: recent.results,
    trending: trending.results,
    airing: airing.results,
    popular: popular.results,
    movies: movies.results,
  };
};

export const searchAnime = async (search, page = 1, perPage = 20) => {
  if (USE_STATIC_DATA) {
    const q = search.trim().toLowerCase();
    const matches = allStaticMedia().filter((m) =>
      [m.title.english, m.title.romaji, m.title.native, ...(m.synonyms ?? [])]
        .some((t) => t?.toLowerCase().includes(q))
    );
    return staticPage(matches, page, perPage, toAnime);
  }
  const data = await request(LIST_QUERY, { page, perPage, search, sort: ['SEARCH_MATCH', 'POPULARITY_DESC'] });
  return pageOf(data.Page, data.Page.media.map(toAnime));
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

export const getByGenre = async (name, page = 1, perPage = 30) => {
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
      ${MEDIA_FIELDS}
      externalLinks { site url type }
    }
  }
`;

// Full details for one anime. `id` is the AniList id.
export const getAnimeInfo = async (id) => {
  if (USE_STATIC_DATA) {
    const media = staticMedia(id);
    if (!media) throw new Error("This anime isn't in the offline data yet.");
    return toAnime(media);
  }
  const data = await request(INFO_QUERY, { id: Number(id) });
  return toAnime(data.Media);
};
