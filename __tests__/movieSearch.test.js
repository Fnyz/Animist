const { pickBatch, classifyResult, searchQuery } = require('../scripts/movieSearchLogic');
import { getList } from '../api';

const movie = (id, english, popularity = 100) => ({ id, format: 'MOVIE', title: { english }, synonyms: [], popularity, isAdult: false });

describe('choosing movies to search', () => {
  const movies = [movie(1, 'A', 10), movie(2, 'B', 50), movie(3, 'C', 30), movie(4, 'D', 40), { ...movie(5, 'X', 99), isAdult: true }];

  it('searches the most popular ones not in the app yet, and continues next time', () => {
    const first = pickBatch(movies, new Set(['4']), 0, 2);
    expect(first.batch.map((m) => m.id)).toEqual([2, 3]);
    const second = pickBatch(movies, new Set(['4']), first.next, 2);
    expect(second.batch.map((m) => m.id)).toEqual([1, 2]); // wraps around
  });

  it('has nothing to do when every movie plays already', () => {
    expect(pickBatch(movies, new Set(['1', '2', '3', '4']), 3)).toEqual({ batch: [], next: 0 });
  });

  it('searches for "<title> full movie"', () => {
    expect(searchQuery(movie(1, 'Your Name.'))).toBe('Your Name. full movie');
  });
});

describe('what to do with a search result', () => {
  const yourName = movie(1, 'Your Name.');
  const official = new Map([['UCofficial', { english: false }], ['UCenglish', { english: true }]]);
  const video = (extra) => ({ title: 'Your Name. [English Sub]', channelId: 'UCofficial', minutes: 106, embeddable: true, ...extra });

  it('accepts an official channel\'s full English upload', () => {
    expect(classifyResult(video(), yourName, official)).toBe('accept');
    expect(classifyResult(video({ title: 'Your Name.', channelId: 'UCenglish' }), yourName, official)).toBe('accept');
  });

  it('never takes uploads from other channels (re-uploads, reactions)', () => {
    expect(classifyResult(video({ channelId: 'UCsomeone' }), yourName, official)).toBe('skip');
  });

  it('skips reaction, review and watch-along videos, even from official channels', () => {
    for (const title of [
      'Your Name. REACTION [English Sub]',
      'Reacting to Your Name. [English Sub]',
      'Letts React: Your Name. [English Sub]',
      'Your Name. Movie Review [English Sub]',
      'Your Name. Watch Along [English Sub]',
      'First Time Watching Your Name. [English Sub]',
    ]) {
      expect(classifyResult(video({ title }), yourName, official)).toBe('skip');
    }
  });

  it('skips short videos, other movies, trailers and videos that only play on YouTube', () => {
    expect(classifyResult(video({ minutes: 3 }), yourName, official)).toBe('skip');
    expect(classifyResult(video({ title: 'Weathering With You [English Sub]' }), yourName, official)).toBe('skip');
    expect(classifyResult(video({ title: 'Your Name. Trailer [English Sub]' }), yourName, official)).toBe('skip');
    expect(classifyResult(video({ embeddable: false }), yourName, official)).toBe('skip');
    expect(classifyResult(video({ title: 'Your Name.' }), yourName, official)).toBe('skip'); // not English, not an English channel
  });
});

describe('Free movies on Home', () => {
  it('lists only full movies that play in the app', async () => {
    const { results } = await getList('freeMovies', 1, 20);
    expect(results.length).toBeGreaterThanOrEqual(5);
    expect(results.every((a) => a.type === 'Movie')).toBe(true);
  });
});
