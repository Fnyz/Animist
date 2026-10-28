// Wording for Home's "New on Animist" row (the week's additions from api.getNewOnAnimist()).

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// The badge on a poster: NEW (just became free to watch), MOVIE, or +3 EP.
export const newBadge = (item) =>
  item.kind === 'movie' ? 'MOVIE' : item.kind === 'new' ? 'NEW' : `+${item.episodes?.length ?? 1} EP`;

const dayKey = (time) => new Date(time).toDateString();

// "Today: 2 new anime, 14 new episodes" for the newest day's additions ("Yesterday", or the
// weekday, when nothing was added since). null when there's nothing.
export const newNote = (items, now = Date.now()) => {
  if (!items.length) return null;
  const latest = items.reduce((max, a) => (Date.parse(a.at) > Date.parse(max) ? a.at : max), items[0].at);
  const day = items.filter((a) => dayKey(a.at) === dayKey(latest));
  const today = new Date(now);
  const yesterday = new Date(now - 86400000);
  const when =
    dayKey(latest) === today.toDateString()
      ? 'Today'
      : dayKey(latest) === yesterday.toDateString()
        ? 'Yesterday'
        : new Date(latest).toLocaleDateString(undefined, { weekday: 'long' });
  const anime = day.filter((a) => a.kind === 'new').length;
  const movies = day.filter((a) => a.kind === 'movie').length;
  const episodes = day.filter((a) => a.kind === 'episodes').reduce((n, a) => n + (a.episodes?.length ?? 1), 0);
  const parts = [
    anime ? `${anime} new anime` : null,
    movies ? plural(movies, 'new movie') : null,
    episodes ? plural(episodes, 'new episode') : null,
  ].filter(Boolean);
  return `${when}: ${parts.join(', ')}`;
};
