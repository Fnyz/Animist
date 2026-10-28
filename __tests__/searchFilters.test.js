import axios from 'axios';
import { activeFilterCount, aniListFilterVariables, filterChips, matchesFilters, NO_FILTERS, seasonOfMonth, withoutFilter, yearOptions } from '../searchFilters';
import { hasFreeEpisodes, searchAnime } from '../api';

const media = { id: 1, format: 'TV', seasonYear: 2024, startDate: { year: 2024, month: 10 }, title: { english: 'X' } };

describe('search filters', () => {
  it('matches format, season, year and free only', () => {
    expect(matchesFilters(media, NO_FILTERS)).toBe(true);
    expect(matchesFilters(media, { ...NO_FILTERS, format: 'TV', season: 'FALL', year: 2024 })).toBe(true);
    expect(matchesFilters(media, { ...NO_FILTERS, format: 'MOVIE' })).toBe(false);
    expect(matchesFilters(media, { ...NO_FILTERS, season: 'SPRING' })).toBe(false);
    expect(matchesFilters(media, { ...NO_FILTERS, year: 2023 })).toBe(false);
    expect(matchesFilters(media, { ...NO_FILTERS, freeOnly: true }, false)).toBe(false);
    expect(matchesFilters(media, { ...NO_FILTERS, freeOnly: true }, true)).toBe(true);
  });

  it('knows the season of each month', () => {
    expect([1, 3, 4, 6, 7, 9, 10, 12].map(seasonOfMonth)).toEqual(['WINTER', 'WINTER', 'SPRING', 'SPRING', 'SUMMER', 'SUMMER', 'FALL', 'FALL']);
    expect(seasonOfMonth(undefined)).toBeNull();
  });

  it('shows chips for active filters, and removes one at a time', () => {
    const f = { format: 'MOVIE', season: 'WINTER', year: 2025, freeOnly: true };
    expect(activeFilterCount(f)).toBe(4);
    expect(filterChips(f).map((c) => c.label)).toEqual(['Free to watch', 'Movie', 'Winter', '2025']);
    expect(withoutFilter(f, 'year')).toEqual({ ...f, year: null });
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
  });

  it('turns filters into AniList variables and offers the last 12 years', () => {
    expect(aniListFilterVariables({ format: 'TV', season: 'FALL', year: 2024, freeOnly: false })).toEqual({ format: 'TV', season: 'FALL', seasonYear: 2024 });
    expect(aniListFilterVariables(NO_FILTERS)).toEqual({});
    expect(yearOptions(new Date('2026-05-01'))).toHaveLength(12);
    expect(yearOptions(new Date('2026-05-01'))[0]).toBe(2026);
  });
});

describe('searching with filters', () => {
  afterEach(() => jest.restoreAllMocks());

  it('asks AniList with the filters, and lists popular matches without a search text', async () => {
    const post = jest.spyOn(axios, 'post').mockResolvedValue({ data: { data: { Page: { pageInfo: { currentPage: 1, hasNextPage: false }, media: [] } } } });
    await searchAnime('', 1, 20, { format: 'MOVIE', season: null, year: 2025, freeOnly: false });
    expect(post.mock.calls[0][1].variables).toMatchObject({ format: 'MOVIE', seasonYear: 2025, sort: ['POPULARITY_DESC'] });
    expect(post.mock.calls[0][1].variables.search).toBeUndefined();
  });

  it('"free to watch only" lists only anime that play in the app, without asking AniList', async () => {
    const post = jest.spyOn(axios, 'post');
    const { results } = await searchAnime('', 1, 50, { ...NO_FILTERS, freeOnly: true });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((a) => hasFreeEpisodes(a.id))).toBe(true);
    expect(post).not.toHaveBeenCalled();
  });

  it('filters the saved data when offline', async () => {
    jest.spyOn(axios, 'post').mockRejectedValue(new Error('Network Error'));
    const { results } = await searchAnime('', 1, 50, { ...NO_FILTERS, format: 'MOVIE' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((a) => a.type === 'Movie')).toBe(true);
  });
});
