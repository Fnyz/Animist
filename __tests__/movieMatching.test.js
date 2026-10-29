const { isMovieCandidate, saysMovie, scoreMovie, bestMovie, movieSearchText, isFullMovie } = require('../scripts/movieMatching');

const movie = (english, romaji = null, synonyms = [], popularity = 1000) => ({ format: 'MOVIE', title: { english, romaji }, synonyms, popularity });

describe('finding full anime movies', () => {
  it('treats English uploads without an episode number as possible movies', () => {
    expect(isMovieCandidate('JUJUTSU KAISEN 0: The Movie [English Sub]')).toBe(true);
    expect(isMovieCandidate('Some Film (English Dub)')).toBe(true);
    expect(isMovieCandidate('Battle Movie', true)).toBe(true); // an English-language channel
  });

  it('skips episodes, trailers, other languages and removed videos', () => {
    expect(isMovieCandidate('Frieren Episode 3 [English Sub]')).toBe(false);
    expect(isMovieCandidate('JUJUTSU KAISEN 0 Official Trailer [English Sub]')).toBe(false);
    expect(isMovieCandidate('The Movie | Teaser PV [English Sub]')).toBe(false);
    expect(isMovieCandidate('劇場版 Some Title [Indonesia Sub]')).toBe(false);
    expect(isMovieCandidate('Some Movie')).toBe(false); // doesn't say it's English
    expect(isMovieCandidate('Private video', true)).toBe(false);
    expect(isMovieCandidate('JUJUTSU KAISEN 0 Reaction [English Sub]')).toBe(false);
    expect(isMovieCandidate('Watch Along: JUJUTSU KAISEN 0 (English Dub)')).toBe(false);
  });

  it('matches a video to its AniList movie, ignoring "movie" words', () => {
    const jjk0 = movie('JUJUTSU KAISEN 0', 'Gekijouban Jujutsu Kaisen 0');
    expect(scoreMovie('JUJUTSU KAISEN 0: The Movie [English Sub]', jjk0)).toBe(100);
    expect(scoreMovie('[English Sub] 劇場版 JUJUTSU KAISEN 0 | Muse Asia', jjk0)).toBe(100);
    expect(scoreMovie('Mobile Suit Gundam Hathaway (English Sub)', movie('Mobile Suit Gundam: Hathaway', null, ['Mobile Suit Gundam Hathaway']))).toBeGreaterThan(0);
  });

  it("doesn't match a TV series, a different movie or a mere part of a title", () => {
    const tv = { format: 'TV', title: { english: 'JUJUTSU KAISEN' } };
    expect(scoreMovie('JUJUTSU KAISEN The Movie [English Sub]', tv)).toBe(0);
    expect(scoreMovie('JUJUTSU KAISEN 0: The Movie [English Sub]', movie('JUJUTSU KAISEN'))).toBe(0);
    expect(scoreMovie('Another Movie [English Sub]', movie('Re:ZERO Another World Movie'))).toBe(0);
  });

  it('picks the best movie for a video', () => {
    const a = movie('Hello World', null, [], 10);
    const b = movie('Hello World', null, [], 900);
    expect(bestMovie('Hello World [English Sub]', [a, b])).toBe(b); // same title: the popular one
    expect(bestMovie('Unrelated [English Sub]', [a, b])).toBeNull();
  });

  it('builds a search text and knows a full movie is long', () => {
    expect(movieSearchText('[English Sub] 劇場版 Some Title: The Movie | Muse Asia')).toBe('Some Title');
    expect(saysMovie('Some Title The Movie')).toBe(true);
    expect(saysMovie('Some Title')).toBe(false);
    expect(isFullMovie(95)).toBe(true);
    expect(isFullMovie(24)).toBe(false);
  });
});
