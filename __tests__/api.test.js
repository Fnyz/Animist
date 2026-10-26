import {
  USE_STATIC_DATA, hasFreeEpisodes, episodeVideos, getHomeData, getList, getRecentEpisodes, searchAnime, getByGenre, getAnimeInfo, genreFilter, toAnime,
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

  it('explains when an anime is missing from the snapshot', async () => {
    await expect(getAnimeInfo(999999999)).rejects.toThrow(/offline data/);
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
