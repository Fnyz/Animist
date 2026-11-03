// Rules for My List's sort order and the Search tab's recent searches (kept here to be tested).
import { historyProgress } from './progress';

export const SORTS = [
  { key: 'recent', label: 'Recently added' },
  { key: 'title', label: 'A–Z' },
  { key: 'new', label: 'New episodes' },
];

// Free episodes you haven't reached yet in an anime you've started: the next one you'd watch and
// everything after it. 0 when you haven't started it (nothing is "new" to you yet).
// freeNumbers: episode numbers that play in the app; record: its history entry, or undefined.
export const newEpisodeCount = (freeNumbers, record) => {
  if (!record || !freeNumbers?.length) return 0;
  const { continueEp } = historyProgress(record.data);
  return freeNumbers.filter((n) => n >= continueEp).length;
};

const addedAt = (entry) => entry.data.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;

// entries: My List entries; mode: 'recent' | 'title' | 'new'; newCount(entry) for 'new'.
// "New episodes" puts anime with episodes waiting first (most first), then the rest by date added.
export const sortList = (entries, mode, newCount = () => 0) => {
  const list = [...entries];
  if (mode === 'title') return list.sort((a, b) => String(a.data.title ?? '').localeCompare(String(b.data.title ?? ''), undefined, { sensitivity: 'base' }));
  if (mode === 'new') return list.sort((a, b) => newCount(b) - newCount(a) || addedAt(b) - addedAt(a));
  return list.sort((a, b) => addedAt(b) - addedAt(a));
};

export const MAX_RECENT = 8;

// The recent searches with `query` added at the front (once, ignoring case), at most MAX_RECENT.
export const addRecentSearch = (recent, query) => {
  const q = String(query ?? '').trim();
  if (q.length < 2) return recent;
  return [q, ...recent.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENT);
};
