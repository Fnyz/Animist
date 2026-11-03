import { addRecentSearch, MAX_RECENT, newEpisodeCount, sortList } from '../listTools';
import { freeEpisodeNumbers, hasFreeEpisodes, randomFreeAnime } from '../api';

const entry = (id, title, addedMs) => ({ id: `w${id}`, data: { titleId: id, title, createdAt: { toMillis: () => addedMs } } });
// Watched episode 3 to the end (positions in seconds).
const watched3 = { data: { titleId: 1, epiNumber: 3, positions: { 3: 1440 }, durations: { 3: 1440 } } };

describe('My List sorting', () => {
  const list = [entry(1, 'bleach', 100), entry(2, 'Attack on Titan', 300), entry(3, 'Clannad', 200)];

  it('sorts by date added, newest first', () => {
    expect(sortList(list, 'recent').map((e) => e.data.title)).toEqual(['Attack on Titan', 'Clannad', 'bleach']);
  });

  it('sorts A–Z, ignoring case', () => {
    expect(sortList(list, 'title').map((e) => e.data.title)).toEqual(['Attack on Titan', 'bleach', 'Clannad']);
  });

  it('puts anime with episodes waiting first', () => {
    const counts = { w1: 5, w2: 0, w3: 2 };
    expect(sortList(list, 'new', (e) => counts[e.id]).map((e) => e.data.title)).toEqual(['bleach', 'Clannad', 'Attack on Titan']);
  });

  it('counts free episodes from the next one you would watch', () => {
    expect(newEpisodeCount([1, 2, 3, 4, 5, 6], watched3)).toBe(3); // 4, 5, 6
    expect(newEpisodeCount([1, 2, 3], watched3)).toBe(0);
    expect(newEpisodeCount([1, 2, 3], undefined)).toBe(0); // not started: nothing "new" yet
  });
});

describe('recent searches', () => {
  it('adds to the front once, ignoring case, and keeps the last few', () => {
    let recent = [];
    for (const q of ['frieren', 'bleach', 'FRIEREN', 'x', '  one piece ']) recent = addRecentSearch(recent, q);
    expect(recent).toEqual(['one piece', 'FRIEREN', 'bleach']);
    for (let i = 0; i < 20; i++) recent = addRecentSearch(recent, `anime ${i}`);
    expect(recent).toHaveLength(MAX_RECENT);
  });
});

describe('Surprise me', () => {
  it('picks an anime that plays in the app, never the excluded one', () => {
    for (let i = 0; i < 20; i++) expect(hasFreeEpisodes(randomFreeAnime().id)).toBe(true);
    const first = randomFreeAnime(null, () => 0);
    expect(randomFreeAnime(first.id, () => 0).id).not.toBe(first.id);
  });

  it('lists free episode numbers in order', () => {
    const anime = randomFreeAnime(null, () => 0);
    const numbers = freeEpisodeNumbers(anime.id);
    expect(numbers.length).toBeGreaterThan(0);
    expect([...numbers].sort((a, b) => a - b)).toEqual(numbers);
  });
});
