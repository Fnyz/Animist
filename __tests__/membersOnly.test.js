const { membersOnlyPlaylist, membersOnlyVideos, dropMembersOnly } = require('../scripts/membersOnly');

describe('members-only videos', () => {
  it("are read from the channel's hidden UUMO playlist", async () => {
    expect(membersOnlyPlaylist('UCZGEjiTMwMv-Mf-t3VLBlJQ')).toBe('UUMOZGEjiTMwMv-Mf-t3VLBlJQ');
    const all = jest.fn(async () => [{ contentDetails: { videoId: 'a' } }, { contentDetails: { videoId: 'b' } }]);
    expect(await membersOnlyVideos('UCxyz', all)).toEqual(['a', 'b']);
    expect(all).toHaveBeenCalledWith('playlistItems', { part: 'contentDetails', playlistId: 'UUMOxyz' });
  });

  it('are none on a channel without memberships, but other errors still stop the run', async () => {
    const missing = async () => {
      throw new Error("playlistItems: The playlist identified with the request's <code>playlistId</code> parameter cannot be found.");
    };
    expect(await membersOnlyVideos('UCxyz', missing)).toEqual([]);
    const quota = async () => {
      throw new Error('playlistItems: The request cannot be completed because you have exceeded your quota.');
    };
    await expect(membersOnlyVideos('UCxyz', quota)).rejects.toThrow('quota');
  });

  it('are taken out of the app: a backup takes their place, empty episodes and anime go', () => {
    const anime = {
      1: { channel: 'Ani-One Philippines', episodes: { 3: { videoId: 'free3' }, 4: { videoId: 'paid4' }, 9: { videoId: 'paid9', alts: [{ videoId: 'paid9b' }] } } },
      2: { channel: 'Muse Asia', episodes: { 1: { videoId: 'paid1', allowedIn: ['PH'], alts: [{ videoId: 'free1', channel: 'Muse Philippines' }, { videoId: 'free1b' }] } } },
      3: { channel: 'Ani-One Philippines', kind: 'movie', episodes: { 1: { videoId: 'paidMovie' } } },
    };
    const result = dropMembersOnly(anime, new Set(['paid4', 'paid9', 'paid9b', 'paid1', 'paidMovie']));
    expect(result[1].episodes).toEqual({ 3: { videoId: 'free3' } });
    expect(result[2].episodes[1]).toEqual({ videoId: 'free1', channel: 'Muse Philippines', alts: [{ videoId: 'free1b' }] });
    expect(result[3]).toBeUndefined();
    expect(dropMembersOnly(anime, new Set())).toEqual(anime);
  });
});
