import axios from 'axios';
import {
  USE_STATIC_DATA, hasFreeEpisodes, episodeVideos, getSeasons, freeEpisodeToStart, getHomeData, getList, getRecentEpisodes, searchAnime, getByGenre, getAnimeInfo, genreFilter, toAnime,
} from '../api';

// These tests use the saved snapshot, so they run offline and give the same results every time.
describe('api (static snapshot)', () => {
  it('reads from the snapshot', () => {
    expect(USE_STATIC_DATA).toBe(true);
  });

  it('loads every Home row', async () => {
    const home = await getHomeData();
    for (const row of ['recent', 'trending', 'airing', 'popular', 'movies']) {
      expect(home[row].length).toBeGreaterThan(0);
      expect(home[row].length).toBeLessThanOrEqual(10);
    }
    expect(home.movies.every((a) => a.type === 'Movie')).toBe(true);
  });

  it('returns anime in the shape the screens use', async () => {
    const { results } = await getList('popular', 1, 5);
    for (const anime of results) {
      expect(anime).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          title: expect.any(String),
          image: expect.stringMatching(/^https:\/\//),
          genres: expect.any(Array),
          episodes: expect.any(Array),
        })
      );
    }
  });

  it('pages through a list without repeats', async () => {
    const first = await getList('trending', 1, 10);
    const second = await getList('trending', 2, 10);
    expect(first.hasNextPage).toBe(true);
    const ids = new Set(first.results.map((a) => a.id));
    expect(second.results.some((a) => ids.has(a.id))).toBe(false);
  });

  it('gives new episodes an episode number', async () => {
    const { results } = await getRecentEpisodes(1, 5);
    expect(results.length).toBeGreaterThan(0);
    for (const ep of results) expect(ep.episodeNumber).toBeGreaterThan(0);
  });

  it('finds anime by any title, ignoring case', async () => {
    const { results } = await searchAnime('one piece');
    expect(results.map((a) => a.title)).toContain('ONE PIECE');
  });

  it('returns no results for nonsense searches', async () => {
    const { results } = await searchAnime('zzqqxx-not-an-anime');
    expect(results).toEqual([]);
  });

  it('filters by genre and by tag', async () => {
    const action = await getByGenre('Action');
    expect(action.results.length).toBeGreaterThan(0);
    expect(action.results.every((a) => a.genres.includes('Action'))).toBe(true);

    const martialArts = await getByGenre('Martial-Arts');
    expect(martialArts.results.length).toBeGreaterThan(0);
  });

  it('loads details with streaming links', async () => {
    const [first] = (await getList('trending', 1, 1)).results;
    const info = await getAnimeInfo(first.id);
    expect(info.id).toBe(first.id);
    expect(Array.isArray(info.watchLinks)).toBe(true);
    expect(info.description).not.toMatch(/<[^>]+>/);
  });

  it("explains when an anime is missing from the snapshot and AniList can't be reached", async () => {
    const post = jest.spyOn(axios, 'post').mockRejectedValue(new Error('Network Error'));
    try {
      await expect(getAnimeInfo(999999999)).rejects.toThrow(/offline data/);
    } finally {
      post.mockRestore();
    }
  });

  it('loads anime that are not in the offline data from AniList', async () => {
    const media = { id: 5, title: { english: 'Older Season', romaji: 'Older' }, coverImage: { large: 'https://img/c.jpg' }, genres: [], format: 'TV', status: 'FINISHED', episodes: 12 };
    const post = jest.spyOn(axios, 'post').mockResolvedValue({ data: { data: { Media: media } } });
    try {
      await expect(getAnimeInfo(5)).resolves.toMatchObject({ id: 5, title: 'Older Season' });
    } finally {
      post.mockRestore();
    }
  });
});

describe('genreFilter', () => {
  it.each([
    ['Action', { genre: 'Action' }],
    ['Sci-fi', { genre: 'Sci-Fi' }],
    ['Slice-of-Life', { genre: 'Slice of Life' }],
    ['Pyschological', { genre: 'Psychological' }],
    ['Martial-Arts', { tag: 'Martial Arts' }],
    ['Historica', { tag: 'Historical' }],
    ['Vampire', { tag: 'Vampire' }],
    ['Dub', {}],
  ])('maps %s', (name, expected) => {
    expect(genreFilter(name)).toEqual(expected);
  });
});

describe('toAnime', () => {
  const media = {
    id: 1,
    title: { romaji: 'Sousou no Frieren', english: "Frieren: Beyond Journey's End", native: '葬送のフリーレン' },
    coverImage: { extraLarge: 'https://img/cover.jpg' },
    bannerImage: null,
    format: 'TV',
    status: 'RELEASING',
    episodes: 28,
    nextAiringEpisode: { episode: 5, airingAt: 1700000000 },
    startDate: { year: 2023, month: 9, day: 29 },
    genres: ['Adventure'],
    description: 'Line one<br><br>Line <i>two</i>',
    trailer: { id: 'abc123', site: 'youtube' },
  };

  it('prefers the English title and keeps the others as other names', () => {
    const anime = toAnime(media);
    expect(anime.title).toBe("Frieren: Beyond Journey's End");
    expect(anime.otherName).toContain('Sousou no Frieren');
  });

  it('only lists episodes that already aired', () => {
    expect(toAnime(media).episodes).toHaveLength(4);
  });

  it('strips HTML from descriptions', () => {
    expect(toAnime(media).description).toBe('Line one\n\nLine two');
  });

  it('falls back to the cover when there is no banner', () => {
    expect(toAnime(media).banner).toBe('https://img/cover.jpg');
  });

  it("ignores episode links that belong to another entry (a movie with the series' links)", () => {
    const movie = {
      ...media,
      format: 'MOVIE',
      status: 'FINISHED',
      episodes: 1,
      nextAiringEpisode: null,
      streamingEpisodes: [1, 2, 3].map((n) => ({ title: `Episode ${n} - Title`, url: `https://cr/${n}`, site: 'Crunchyroll' })),
    };
    const anime = toAnime(movie);
    expect(anime.episodes).toHaveLength(1);
    expect(anime.episodes[0].source).not.toBe('link');
  });

  it('keeps episode links that fit the anime', () => {
    const series = {
      ...media,
      status: 'FINISHED',
      episodes: 3,
      nextAiringEpisode: null,
      streamingEpisodes: [1, 2].map((n) => ({ title: `Episode ${n} - Title`, url: `https://cr/${n}`, site: 'Crunchyroll' })),
    };
    expect(toAnime(series).episodes.map((e) => e.source)).toEqual(['link', 'link', 'none']);
  });

    it('labels format and status for people', () => {
    const anime = toAnime(media);
    expect(anime.type).toBe('TV');
    expect(anime.status).toBe('Ongoing');
    expect(anime.trailer).toBe('abc123');
  });
});

describe('free to watch', () => {
  it('lists only anime with episodes that play in the app', async () => {
    const { results } = await getList('free', 1, 50);
    for (const anime of results) {
      expect(anime.episodes.some((e) => e.source === 'youtube')).toBe(true);
    }
  });

  it('is on the Home screen', async () => {
    const home = await getHomeData();
    expect(Array.isArray(home.free)).toBe(true);
  });
});

describe('hasFreeEpisodes', () => {
  it('matches the anime in the Free to watch list', async () => {
    const { results } = await getList('free', 1, 50);
    for (const anime of results) expect(hasFreeEpisodes(anime.id)).toBe(true);
  });

  it('is false for unknown ids', () => {
    expect(hasFreeEpisodes(999999999)).toBe(false);
  });
});

describe('episodeVideos', () => {
  const entry = { channel: 'Muse Asia', episodes: {} };

  it('lists the main video first, then backups from other channels', () => {
    const ep = { videoId: 'asia1', alts: [{ videoId: 'ph1', channel: 'Muse Philippines' }, { videoId: 'asia2' }] };
    expect(episodeVideos(entry, ep)).toEqual([
      { videoId: 'asia1', channel: 'Muse Asia' },
      { videoId: 'ph1', channel: 'Muse Philippines' },
      { videoId: 'asia2', channel: 'Muse Asia' },
    ]);
  });

  it('is empty when the episode has no video', () => {
    expect(episodeVideos(entry, undefined)).toEqual([]);
  });
});

describe('getSeasons', () => {
  it('lists Jujutsu Kaisen seasons and movies in order, marking the one being viewed', () => {
    const { seasons, extras } = getSeasons(145064); // Season 2
    expect(seasons[0].id).toBe(113415);
    expect(seasons.find((s) => s.current).id).toBe(145064);
    expect(seasons.every((s) => ['TV', 'TV_SHORT', 'ONA', null, undefined].includes(s.format))).toBe(true);
    expect(extras.some((e) => e.format === 'MOVIE')).toBe(true);
    expect(seasons.find((s) => s.id === 113415).free).toBe(true);
  });

  it('is empty for anime without other parts', () => {
    expect(getSeasons(999999999)).toBeNull();
  });
});

describe('freeEpisodeToStart', () => {
  const episodes = require('../data/episodes.json').anime;
  const [id, entry] = Object.entries(episodes).find(([, e]) => Object.keys(e.episodes).length > 2);
  const numbers = Object.keys(entry.episodes).map(Number).sort((a, b) => a - b);

  it('starts at the first free episode', () => {
    expect(freeEpisodeToStart(id)).toBe(numbers[0]);
  });

  it('continues where the person was when that episode is free', () => {
    expect(freeEpisodeToStart(id, numbers[1])).toBe(numbers[1]);
    expect(freeEpisodeToStart(id, 99999)).toBe(numbers[0]);
  });

  it('is null for anime without free episodes', () => {
    expect(freeEpisodeToStart(999999999, 1)).toBeNull();
  });
});
