// My List statuses, like AniList's: where each anime on the list stands.
export const LIST_STATUSES = [
  { key: 'watching', label: 'Watching', icon: 'play-circle-outline' },
  { key: 'planned', label: 'Plan to watch', icon: 'bookmark-outline' },
  { key: 'completed', label: 'Completed', icon: 'checkmark-circle-outline' },
  { key: 'dropped', label: 'Dropped', icon: 'close-circle-outline' },
];

export const DEFAULT_STATUS = 'planned';

const BY_KEY = Object.fromEntries(LIST_STATUSES.map((s) => [s.key, s]));

// A list entry's status; entries saved before statuses existed count as "Plan to watch".
export const statusOf = (entry) => (BY_KEY[entry?.data?.status] ? entry.data.status : DEFAULT_STATUS);

export const statusInfo = (key) => BY_KEY[key] ?? BY_KEY[DEFAULT_STATUS];

// What watching an episode does to the status, or null for no change:
// - finishing the last episode of a show that finished airing -> Completed
// - starting an episode of something planned or dropped -> Watching
// Watching (and Completed, e.g. a rewatch) stay as they are.
export const statusAfterWatching = ({ current, episode, totalEpisodes, finishedEpisode, finishedAiring }) => {
  if (finishedEpisode && finishedAiring && totalEpisodes > 0 && episode >= totalEpisodes) {
    return current === 'completed' ? null : 'completed';
  }
  if (current === 'planned' || current === 'dropped') return 'watching';
  return null;
};
