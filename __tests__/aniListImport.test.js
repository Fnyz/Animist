import axios from 'axios';
import { planImport, STATUS_FROM_ANILIST } from '../aniListImport';
import { getAniListUserList } from '../api';

const anime = (id) => ({ id, title: `Anime ${id}`, image: `https://img/${id}.jpg` });
const onList = (id) => ({ id: `doc${id}`, data: { titleId: id, status: 'completed' } });

describe('planning an AniList import', () => {
  it("maps AniList statuses to My List's", () => {
    expect(STATUS_FROM_ANILIST).toMatchObject({ CURRENT: 'watching', PLANNING: 'planned', COMPLETED: 'completed', DROPPED: 'dropped', PAUSED: 'watching', REPEATING: 'watching' });
  });

  it('adds what is new, leaves what is already on My List, and counts per status', () => {
    const entries = [
      { anime: anime(1), status: 'CURRENT' },
      { anime: anime(2), status: 'PLANNING' },
      { anime: anime(3), status: 'COMPLETED' },
      { anime: anime(3), status: 'COMPLETED' }, // in two custom lists
      { anime: anime(4), status: 'SOMETHING_NEW' },
    ];
    const plan = planImport(entries, [onList(2)]);
    expect(plan.toAdd.map((a) => [a.anime.id, a.status])).toEqual([
      [1, 'watching'],
      [3, 'completed'],
      [4, 'planned'],
    ]);
    expect(plan.alreadyOnList).toBe(1);
    expect(plan.counts).toEqual({ watching: 1, planned: 1, completed: 1, dropped: 0 });
  });
});

describe('getAniListUserList', () => {
  const media = (id, extra = {}) => ({ id, title: { english: `Show ${id}` }, coverImage: { large: 'x' }, genres: [], format: 'TV', status: 'FINISHED', episodes: 12, isAdult: false, ...extra });

  afterEach(() => jest.restoreAllMocks());

  it('reads a public list and leaves out adult titles', async () => {
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        data: {
          MediaListCollection: {
            user: { name: 'Josh', avatar: { medium: 'https://img/a.png' } },
            lists: [{ entries: [{ status: 'CURRENT', media: media(10) }, { status: 'COMPLETED', media: media(11, { isAdult: true }) }] }],
          },
        },
      },
    });
    const list = await getAniListUserList('  @Josh ');
    expect(list.user).toEqual({ name: 'Josh', avatar: 'https://img/a.png' });
    expect(list.entries.map((e) => [e.anime.title, e.status])).toEqual([['Show 10', 'CURRENT']]);
    expect(axios.post.mock.calls[0][1].variables).toEqual({ userName: 'Josh' });
  });

  it('explains unknown users, private lists and no connection', async () => {
    const fail = (status, message) => Object.assign(new Error('Request failed'), { response: { status, data: { errors: [{ message }] } } });
    jest.spyOn(axios, 'post').mockRejectedValueOnce(fail(404, 'User not found'));
    await expect(getAniListUserList('nobody123')).rejects.toThrow('No AniList user called "nobody123".');
    axios.post.mockRejectedValueOnce(fail(404, 'Private User')); // AniList's real answer
    await expect(getAniListUserList('secret')).rejects.toThrow(/private on AniList/);
    axios.post.mockRejectedValueOnce(new Error('Network Error'));
    await expect(getAniListUserList('offline')).rejects.toThrow(/Couldn't reach AniList/);
    await expect(getAniListUserList('  ')).rejects.toThrow('Enter an AniList username.');
  });
});
