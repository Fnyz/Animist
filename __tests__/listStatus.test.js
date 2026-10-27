import { LIST_STATUSES, statusOf, statusInfo, statusAfterWatching } from '../listStatus';

const watch = (current, extra = {}) =>
  statusAfterWatching({ current, episode: 3, totalEpisodes: 12, finishedEpisode: false, finishedAiring: true, ...extra });

describe('My List statuses', () => {
  it('has the four AniList-style statuses', () => {
    expect(LIST_STATUSES.map((s) => s.key)).toEqual(['watching', 'planned', 'completed', 'dropped']);
  });

  it('treats entries from before statuses as Plan to watch', () => {
    expect(statusOf({ data: {} })).toBe('planned');
    expect(statusOf({ data: { status: 'nonsense' } })).toBe('planned');
    expect(statusOf({ data: { status: 'dropped' } })).toBe('dropped');
    expect(statusInfo('completed').label).toBe('Completed');
  });

  it('marks planned or dropped anime as Watching when an episode starts', () => {
    expect(watch('planned')).toBe('watching');
    expect(watch('dropped')).toBe('watching');
    expect(watch('watching')).toBeNull();
    expect(watch('completed')).toBeNull(); // a rewatch keeps Completed
  });

  it('marks Completed after the last episode of a finished show', () => {
    expect(watch('watching', { episode: 12, finishedEpisode: true })).toBe('completed');
    expect(watch('planned', { episode: 12, finishedEpisode: true })).toBe('completed');
    expect(watch('completed', { episode: 12, finishedEpisode: true })).toBeNull();
  });

  it('keeps airing shows and unfinished episodes as Watching', () => {
    expect(watch('watching', { episode: 12, finishedEpisode: true, finishedAiring: false })).toBeNull();
    expect(watch('watching', { episode: 12, finishedEpisode: false })).toBeNull();
    expect(watch('watching', { episode: 11, finishedEpisode: true })).toBeNull();
  });
});
