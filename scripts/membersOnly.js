// Videos only a channel's paying members can watch: the player shows "Members-only content" and never
// starts. Their titles don't always say so (Ani-One Philippines' "ULTRA" uploads mostly do, but its
// Chainsaw Man episodes 4 and 9 don't), so they're found through the hidden playlist YouTube keeps of
// them: the uploads list's id with "UUMO" in place of "UU". Channels without memberships have none.
const membersOnlyPlaylist = (channelId) => `UUMO${String(channelId).slice(2)}`;

// all(endpoint, params): every page of a YouTube list (as in find-episodes.js).
const membersOnlyVideos = async (channelId, all) => {
  try {
    const items = await all('playlistItems', { part: 'contentDetails', playlistId: membersOnlyPlaylist(channelId) });
    return items.map((i) => i.contentDetails?.videoId).filter(Boolean);
  } catch (e) {
    if (/cannot be found|playlistNotFound/i.test(e.message)) return [];
    throw e;
  }
};

// anime (as in data/episodes.json) without members-only videos: a backup takes an episode's place,
// an episode with none left is dropped, and so is an anime with no episodes left.
const dropMembersOnly = (anime, membersOnly) => {
  const out = {};
  for (const [id, entry] of Object.entries(anime)) {
    const episodes = {};
    for (const [n, ep] of Object.entries(entry.episodes)) {
      const { alts = [], ...main } = ep;
      const [first, ...rest] = [main, ...alts].filter((v) => !membersOnly.has(v.videoId));
      if (!first) continue;
      episodes[n] = { ...first, ...(rest.length ? { alts: rest } : {}) };
    }
    if (Object.keys(episodes).length) out[id] = { ...entry, episodes };
  }
  return out;
};

module.exports = { membersOnlyPlaylist, membersOnlyVideos, dropMembersOnly };
