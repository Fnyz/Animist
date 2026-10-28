// Bringing someone's AniList list into My List: which anime to add, with which status.
import { LIST_STATUSES } from './listStatus';

// AniList statuses -> My List statuses. Paused and rewatching count as Watching.
export const STATUS_FROM_ANILIST = {
  CURRENT: 'watching',
  REPEATING: 'watching',
  PAUSED: 'watching',
  PLANNING: 'planned',
  COMPLETED: 'completed',
  DROPPED: 'dropped',
};

// entries: [{ anime, status }] from getAniListUserList; watchList: My List as it is now.
// Anime already on My List keep their status there. Returns
// { toAdd: [{ anime, status }], alreadyOnList, counts: { watching, planned, completed, dropped } }.
export const planImport = (entries, watchList) => {
  const onList = new Set(watchList.map((w) => String(w.data.titleId)));
  const seen = new Set();
  const toAdd = [];
  let alreadyOnList = 0;
  for (const { anime, status } of entries) {
    const id = String(anime.id);
    if (seen.has(id)) continue; // an anime in two of someone's custom lists
    seen.add(id);
    if (onList.has(id)) {
      alreadyOnList += 1;
      continue;
    }
    toAdd.push({ anime, status: STATUS_FROM_ANILIST[status] ?? 'planned' });
  }
  const counts = Object.fromEntries(LIST_STATUSES.map((s) => [s.key, toAdd.filter((a) => a.status === s.key).length]));
  return { toAdd, alreadyOnList, counts };
};
