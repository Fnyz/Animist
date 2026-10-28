import { computeStats } from '../stats';

const history = (titleId, positions, durations) => ({ id: `h${titleId}`, data: { titleId, positions, durations } });
const listed = (titleId, status) => ({ id: `w${titleId}`, data: { titleId, status } });
const GENRES = { 1: ['Action', 'Fantasy'], 2: ['Action', 'Comedy'], 3: ['Romance'] };

describe('your stats', () => {
  it('counts finished episodes and hours watched', () => {
    const s = computeStats(
      [history(1, { 1: 1440, 2: 1400, 3: 300 }, { 1: 1440, 2: 1440, 3: 1440 })],
      [],
      () => []
    );
    expect(s.episodesWatched).toBe(2); // the third is only 5 minutes in
    expect(s.hoursWatched).toBe(0.9); // 1440 + 1400 + 300 seconds
    expect(s.animeStarted).toBe(1);
  });

  it("never counts more time than an episode's length", () => {
    const s = computeStats([history(1, { 1: 9999 }, { 1: 1440 })], [], () => []);
    expect(s.hoursWatched).toBe(0.4);
  });

  it('counts My List and completed, and finds favorite genres (each anime once)', () => {
    const s = computeStats(
      [history(1, {}, {}), history(2, {}, {})],
      [listed(1, 'completed'), listed(3, 'watching'), listed(2, 'completed')],
      (id) => GENRES[id]
    );
    expect(s.onList).toBe(3);
    expect(s.completed).toBe(2);
    expect(s.topGenres).toEqual(['Action', 'Comedy', 'Fantasy']);
  });

  it('is all zeros for a new account', () => {
    expect(computeStats([], [], () => [])).toEqual({ episodesWatched: 0, hoursWatched: 0, animeStarted: 0, onList: 0, completed: 0, topGenres: [] });
  });
});
