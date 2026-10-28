// Search filters: format, season, year and "free to watch only". AniList applies them live; the
// same rules filter the saved data when offline (matchesFilters).

export const FORMAT_OPTIONS = [
  { key: 'TV', label: 'TV' },
  { key: 'MOVIE', label: 'Movie' },
  { key: 'OVA', label: 'OVA' },
  { key: 'ONA', label: 'ONA' },
  { key: 'SPECIAL', label: 'Special' },
];

export const SEASON_OPTIONS = [
  { key: 'WINTER', label: 'Winter' },
  { key: 'SPRING', label: 'Spring' },
  { key: 'SUMMER', label: 'Summer' },
  { key: 'FALL', label: 'Fall' },
];

export const NO_FILTERS = { format: null, season: null, year: null, freeOnly: false };

// This year and the 11 before it, newest first.
export const yearOptions = (now = new Date()) => Array.from({ length: 12 }, (_, i) => now.getFullYear() - i);

// The season an anime started in, by month (seasons start in January, April, July and October).
export const seasonOfMonth = (month) =>
  month >= 1 && month <= 3 ? 'WINTER' : month <= 6 ? 'SPRING' : month <= 9 ? 'SUMMER' : month <= 12 ? 'FALL' : null;

// For saved AniList data (offline search, "free only"). `free` says whether it plays in the app.
export const matchesFilters = (media, filters, free = false) => {
  if (filters.freeOnly && !free) return false;
  if (filters.format && media.format !== filters.format) return false;
  const year = media.seasonYear ?? media.startDate?.year ?? null;
  if (filters.year && year !== filters.year) return false;
  if (filters.season && (media.season ?? seasonOfMonth(media.startDate?.month)) !== filters.season) return false;
  return true;
};

export const activeFilterCount = (filters) =>
  ['format', 'season', 'year'].filter((k) => filters[k]).length + (filters.freeOnly ? 1 : 0);

// The chips under the search box: [{ key, label }] for each active filter.
export const filterChips = (filters) => [
  ...(filters.freeOnly ? [{ key: 'freeOnly', label: 'Free to watch' }] : []),
  ...(filters.format ? [{ key: 'format', label: FORMAT_OPTIONS.find((o) => o.key === filters.format)?.label ?? filters.format }] : []),
  ...(filters.season ? [{ key: 'season', label: SEASON_OPTIONS.find((o) => o.key === filters.season)?.label ?? filters.season }] : []),
  ...(filters.year ? [{ key: 'year', label: String(filters.year) }] : []),
];

// The same filters without one of them (a chip's ✕).
export const withoutFilter = (filters, key) => ({ ...filters, [key]: NO_FILTERS[key] });

// AniList's search variables for the filters.
export const aniListFilterVariables = (filters) => ({
  ...(filters.format ? { format: filters.format } : {}),
  ...(filters.season ? { season: filters.season } : {}),
  ...(filters.year ? { seasonYear: filters.year } : {}),
});
