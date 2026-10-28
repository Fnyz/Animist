import { newBadge, newNote } from '../newOnAnimist';
const { recentAdditions } = require('../scripts/episodeDiff');

const NOW = Date.parse('2026-10-28T06:00:00Z');
const daysAgo = (d) => new Date(NOW - d * 86400000).toISOString();

describe('what the daily update added (finder side)', () => {
  it('records new anime, new movies and new episodes, newest first', () => {
    const changes = { newAnime: ['10', '20'], updated: [{ id: '30', added: [5, 6] }] };
    const list = recentAdditions([], changes, NOW, (id) => id === '20');
    expect(list.map((a) => [a.id, a.kind, a.episodes ?? null])).toEqual([
      [10, 'new', null],
      [20, 'movie', null],
      [30, 'episodes', [5, 6]],
    ]);
    expect(list.every((a) => a.at === new Date(NOW).toISOString())).toBe(true);
  });

  it('keeps a week, merges new episodes, and keeps a this-week anime "new"', () => {
    const previous = [
      { id: 30, kind: 'episodes', episodes: [4], at: daysAgo(2) },
      { id: 40, kind: 'new', at: daysAgo(3) },
      { id: 50, kind: 'episodes', episodes: [1], at: daysAgo(9) }, // too old
    ];
    const list = recentAdditions(previous, { newAnime: [], updated: [{ id: '30', added: [5] }, { id: '40', added: [2] }] }, NOW);
    expect(list.map((a) => [a.id, a.kind, a.episodes ?? null])).toEqual([
      [30, 'episodes', [4, 5]],
      [40, 'new', null],
    ]);
  });
});

describe('New on Animist (app side)', () => {
  it('labels posters', () => {
    expect(newBadge({ kind: 'new' })).toBe('NEW');
    expect(newBadge({ kind: 'movie' })).toBe('MOVIE');
    expect(newBadge({ kind: 'episodes', episodes: [3, 4, 5] })).toBe('+3 EP');
  });

  it("sums up the newest day's additions", () => {
    const items = [
      { kind: 'new', at: daysAgo(0) },
      { kind: 'new', at: daysAgo(0) },
      { kind: 'movie', at: daysAgo(0) },
      { kind: 'episodes', episodes: [1, 2, 3], at: daysAgo(0) },
      { kind: 'episodes', episodes: [9], at: daysAgo(3) },
    ];
    expect(newNote(items, NOW)).toBe('Today: 2 new anime, 1 new movie, 3 new episodes');
    expect(newNote([{ kind: 'episodes', episodes: [1], at: daysAgo(1) }], NOW)).toBe('Yesterday: 1 new episode');
    expect(newNote([], NOW)).toBeNull();
  });
});
