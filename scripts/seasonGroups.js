// Groups anime into franchises from AniList's prequel/sequel links, in release order, for the
// Seasons row on anime pages. Kept separate from seasons.js (which fetches the links) so it can be
// unit tested.

// Only the direct story chain: side stories, spin-offs and recaps stay off the row.
const CHAIN = new Set(['PREQUEL', 'SEQUEL']);

// entries: Map of id -> { id, year, month, day, relations: [{ id, type }] }.
// Returns arrays of ids (2 or more per franchise), each oldest first.
const buildGroups = (entries) => {
  const parent = new Map([...entries.keys()].map((id) => [id, id]));
  const find = (id) => {
    while (parent.get(id) !== id) {
      parent.set(id, parent.get(parent.get(id)));
      id = parent.get(id);
    }
    return id;
  };
  for (const entry of entries.values()) {
    for (const { id, type } of entry.relations ?? []) {
      if (CHAIN.has(type) && entries.has(id)) parent.set(find(id), find(entry.id));
    }
  }
  const groups = new Map();
  for (const id of entries.keys()) {
    const root = find(id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(id);
  }
  const date = (id) => {
    const e = entries.get(id);
    return [e.year ?? 9999, e.month ?? 12, e.day ?? 31, id];
  };
  const byDate = (a, b) => {
    const [x, y] = [date(a), date(b)];
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i];
    return 0;
  };
  return [...groups.values()].filter((g) => g.length > 1).map((g) => g.sort(byDate));
};

// TV-style seasons go in "Seasons"; movies, OVAs and specials in "Movies & specials". Announced
// entries have no format yet; they're nearly always the next season.
const SEASON_FORMATS = new Set(['TV', 'TV_SHORT', 'ONA']);
const isSeason = (format) => !format || SEASON_FORMATS.has(format);

module.exports = { buildGroups, isSeason, CHAIN };
