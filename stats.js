// "Your stats" on Profile, from the watch history and My List.
import { isFinished } from './progress';
import { statusOf } from './listStatus';

// historyRecords / watchList: as in context.js. genresOf(id): an anime's genres (may be []).
// Returns { episodesWatched, hoursWatched, animeStarted, onList, completed, topGenres }.
export const computeStats = (historyRecords, watchList, genresOf) => {
  let episodesWatched = 0;
  let seconds = 0;
  for (const { data } of historyRecords) {
    const positions = data.positions ?? {};
    const durations = data.durations ?? {};
    for (const ep of Object.keys(positions)) {
      const progress = { position: positions[ep] ?? 0, duration: durations[ep] ?? 0 };
      // Time watched in an episode can't be more than the episode itself.
      seconds += progress.duration > 0 ? Math.min(progress.position, progress.duration) : progress.position;
      if (isFinished(progress)) episodesWatched += 1;
    }
  }

  // Each anime counts once for genres, whether it's on My List, in the history, or both.
  const ids = new Set([...historyRecords, ...watchList].map((r) => String(r.data.titleId)));
  const genreCounts = new Map();
  for (const id of ids) {
    for (const g of genresOf(id) ?? []) genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
  }
  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([genre]) => genre);

  return {
    episodesWatched,
    hoursWatched: Math.round((seconds / 3600) * 10) / 10,
    animeStarted: historyRecords.length,
    onList: watchList.length,
    completed: watchList.filter((w) => statusOf(w) === 'completed').length,
    topGenres,
  };
};
