const { newEpisodesById, bodyFor, buildMessages } = require('../scripts/episodeNotifications');

const titles = { 1: 'Jujutsu Kaisen', 2: 'Frieren', 3: 'Oshi no Ko' };
const titleOf = (id) => titles[id];

describe('episode notifications', () => {
  it('collects new episodes and newly playable anime', () => {
    const changes = { updated: [{ id: '1', added: [9] }], newAnime: ['3'] };
    const after = { anime: { 3: { episodes: { 2: {}, 1: {} } } } };
    expect(newEpisodesById(changes, after)).toEqual({ 1: [9], 3: [1, 2] });
  });

  it('writes one episode or a range', () => {
    expect(bodyFor([9])).toBe('Episode 9 is free to watch in Animist.');
    expect(bodyFor([9, 10, 11])).toBe('Episodes 9–11 are free to watch in Animist.');
  });

  it('notifies only people with the anime on their list, on every phone', () => {
    const messages = buildMessages({
      newEpisodes: { 1: [9] },
      watchlists: [{ userId: 'a', titleId: 1 }, { userId: 'b', titleId: 2 }],
      tokens: [{ userId: 'a', token: 'phone-a1' }, { userId: 'a', token: 'phone-a2' }, { userId: 'b', token: 'phone-b' }],
      titleOf,
    });
    expect(messages.map((m) => m.to)).toEqual(['phone-a1', 'phone-a2']);
    expect(messages[0]).toMatchObject({ title: 'Jujutsu Kaisen', body: 'Episode 9 is free to watch in Animist.', data: { animeId: '1' }, channelId: 'new-episodes' });
  });

  it('sends one summary when several anime on a list got episodes', () => {
    const [message, ...rest] = buildMessages({
      newEpisodes: { 1: [9], 2: [5], 3: [12] },
      watchlists: [1, 2, 3].map((titleId) => ({ userId: 'a', titleId })),
      tokens: [{ userId: 'a', token: 'phone-a' }],
      titleOf,
    });
    expect(rest).toEqual([]);
    expect(message.title).toBe('New episodes on your list');
    expect(message.body).toBe('Jujutsu Kaisen, Frieren and 1 more have new free episodes in Animist.');
  });

  it('sends nothing to people without a phone or a matching list', () => {
    expect(buildMessages({ newEpisodes: { 1: [9] }, watchlists: [{ userId: 'a', titleId: 1 }], tokens: [], titleOf })).toEqual([]);
  });
});
