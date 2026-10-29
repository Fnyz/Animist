// Rules for the daily movie search (scripts/search-movies.js), kept separate so they can be tested:
// which movies to search today, and what to do with each YouTube result.
const { isMovieCandidate, scoreMovie, isFullMovie } = require('./movieMatching');

// Searches per day (100 YouTube quota units each, of the free 10,000).
const SEARCHES_PER_DAY = 30;

// The movies to search today: the most popular movies not playing in the app yet, continuing where
// yesterday stopped and starting over at the end (a full round takes about ten days).
// movies: AniList MOVIE media; playing: Set of ids already in the app; next: where to continue.
const pickBatch = (movies, playing, next = 0, size = SEARCHES_PER_DAY) => {
  const pool = movies
    .filter((m) => !m.isAdult && !playing.has(String(m.id)))
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0) || a.id - b.id);
  if (!pool.length) return { batch: [], next: 0 };
  const start = next % pool.length;
  const batch = [];
  for (let i = 0; i < Math.min(size, pool.length); i++) batch.push(pool[(start + i) % pool.length]);
  return { batch, next: (start + batch.length) % pool.length };
};

// What a YouTube search result for `movie` is: 'accept' (an official channel's full English upload
// of this movie) or 'skip' (anything else: other channels are re-uploads or reaction videos).
// video: { title, channelId, minutes, embeddable }; official: Map(channelId -> { english, skip }).
const classifyResult = (video, movie, official) => {
  if (!video || video.embeddable === false || !isFullMovie(video.minutes ?? 0)) return 'skip';
  if (scoreMovie(video.title, movie) === 0) return 'skip';
  const channel = official.get(video.channelId);
  if (channel) {
    if (channel.skip?.test(video.title)) return 'skip';
    return isMovieCandidate(video.title, channel.english) ? 'accept' : 'skip';
  }
  return 'skip';
};

const searchQuery = (movie) => `${movie.title?.english || movie.title?.romaji} full movie`;

module.exports = { SEARCHES_PER_DAY, pickBatch, classifyResult, searchQuery };
