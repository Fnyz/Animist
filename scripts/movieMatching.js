// Matching helpers for full anime movies on the official channels (scripts/findMovies.js): which
// uploads are whole films, and which AniList movie each one is. Kept separate so they can be tested.
const { normalize, titleParts, episodeNumber, isEnglishSub, OTHER_LANGUAGES } = require('./episodeMatching');

// A full movie is long; trailers, clips and episodes are much shorter.
const MOVIE_MIN_MINUTES = 45;

// Words channels add to a film's title ("… The Movie", "劇場版 …").
const MOVIE_WORDS = /\b(?:the movie|movie|film)\b|劇場版|剧场版|映画/gi;
// Uploads about a movie that aren't the movie.
// Reaction, review and watch-along videos use the movie's title too, so they're excluded by name.
const NOT_A_MOVIE =
  /\b(pv|trailer|teaser|preview|promo|recap|opening|ending|op|ed|clip|highlights?|behind the scenes|making of|interview|reacts?|reaction|reacting|watch ?along|first time watching|commentary|review|explained|breakdown|analysis|amv|edit|event|stage|live|countdown|announcement|commercial|cm)\b|予告|預告|预告|特報|特报/i;

const stripMovieWords = (normalized) =>
  normalized
    .replace(/\b(?:the movie|movie|film)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// An English upload that could be a whole film: not an episode, not a trailer or clip.
// `englishChannel`: the channel's videos are English without saying so.
const isMovieCandidate = (videoTitle, englishChannel = false) => {
  const title = String(videoTitle ?? '');
  if (/^(private|deleted) video$/i.test(title.trim())) return false;
  const english = englishChannel ? !OTHER_LANGUAGES.test(title) : isEnglishSub(title);
  return english && !NOT_A_MOVIE.test(title) && episodeNumber(title) === null;
};

// Titles that call themselves a movie (worth an AniList search when they match no known movie).
const saysMovie = (videoTitle) => new RegExp(MOVIE_WORDS.source, 'i').test(String(videoTitle ?? ''));

// 100 when the video's title is an AniList movie's main title, 80 for an alternate name, else 0.
// "Movie" words are ignored on both sides ("JUJUTSU KAISEN 0: The Movie" = "Jujutsu Kaisen 0").
const scoreMovie = (videoTitle, media) => {
  if (media?.format !== 'MOVIE' || OTHER_LANGUAGES.test(videoTitle ?? '')) return 0;
  const parts = titleParts(String(videoTitle ?? '').replace(MOVIE_WORDS, ' ')).map(stripMovieWords).filter((p) => p.length >= 4);
  const titles = (list) => list.map((t) => stripMovieWords(normalize(t))).filter((t) => t.length >= 4);
  if (titles([media.title?.english, media.title?.romaji]).some((t) => parts.includes(t))) return 100;
  if (titles(media.synonyms ?? []).some((t) => parts.includes(t))) return 80;
  return 0;
};

// The best AniList movie for a video title, or null.
const bestMovie = (videoTitle, movies) =>
  movies
    .map((m) => ({ m, score: scoreMovie(videoTitle, m) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (b.m.popularity ?? 0) - (a.m.popularity ?? 0))[0]?.m ?? null;

// The English title inside a video title, for searching AniList, without "movie" words.
// "[English Sub] 劇場版 Some Title: The Movie | Muse Asia" -> "Some Title".
const movieSearchText = (videoTitle) => {
  const parts = String(videoTitle ?? '')
    .replace(/[[【(（][^\]】)）]*[\]】)）]/g, ' ')
    .replace(MOVIE_WORDS, ' ')
    .split(/[|｜《》]/)
    .map((p) => p.replace(/\s+/g, ' ').replace(/^[\s:：\-–]+|[\s:：\-–]+$/g, '').trim())
    .filter((p) => /[a-z]{3}/i.test(p));
  return parts[0] || null;
};

const isFullMovie = (minutes) => minutes >= MOVIE_MIN_MINUTES;

module.exports = { MOVIE_MIN_MINUTES, isMovieCandidate, saysMovie, scoreMovie, bestMovie, movieSearchText, isFullMovie };
