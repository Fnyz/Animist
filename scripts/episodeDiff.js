// Compares two versions of data/episodes.json: what's new (for the pull request text), whether
// anything changed at all, and whether a run lost suspiciously many episodes.

const episodeTotal = (data) =>
  Object.values(data?.anime ?? {}).reduce((sum, a) => sum + Object.keys(a.episodes ?? {}).length, 0);

// True when the two versions hold the same episodes and anime (the timestamp doesn't count).
const sameContent = (before, after) =>
  JSON.stringify([before?.channels, before?.anime, before?.media]) ===
  JSON.stringify([after?.channels, after?.anime, after?.media]);

// A run that loses more than `maxDrop` of the episodes probably hit an API problem, not real removals.
const suspiciousDrop = (before, after, maxDrop = 0.1) => {
  const old = episodeTotal(before);
  return old > 0 && episodeTotal(after) < old * (1 - maxDrop);
};

// { newAnime: [id], updated: [{ id, added: [n] }], removedEpisodes, before, after } – episode numbers
// count as added when the anime didn't have them before.
const summarizeChanges = (before, after) => {
  const oldAnime = before?.anime ?? {};
  const newAnime = [];
  const updated = [];
  let removedEpisodes = 0;
  for (const [id, anime] of Object.entries(after?.anime ?? {})) {
    const old = oldAnime[id];
    if (!old) {
      newAnime.push(id);
      continue;
    }
    const added = Object.keys(anime.episodes).filter((n) => !old.episodes[n]).map(Number).sort((a, b) => a - b);
    if (added.length) updated.push({ id, added });
  }
  for (const [id, old] of Object.entries(oldAnime)) {
    const now = after?.anime?.[id]?.episodes ?? {};
    removedEpisodes += Object.keys(old.episodes).filter((n) => !now[n]).length;
  }
  return { newAnime, updated, removedEpisodes, before: episodeTotal(before), after: episodeTotal(after) };
};

// "EP 3", "EP 3–5", "EP 1, 4"
const episodeRanges = (numbers) => {
  const ranges = [];
  for (const n of numbers) {
    const last = ranges[ranges.length - 1];
    if (last && n === last[1] + 1) last[1] = n;
    else ranges.push([n, n]);
  }
  return `EP ${ranges.map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`)).join(', ')}`;
};

// Markdown for the pull request. `titleOf(id)` names an anime.
const summaryMarkdown = (changes, titleOf) => {
  const lines = [
    `**${changes.after}** episodes in the app (was ${changes.before}).`,
    '',
  ];
  if (changes.updated.length) {
    lines.push('### New episodes', '');
    for (const { id, added } of changes.updated) lines.push(`- ${titleOf(id)}: ${episodeRanges(added)}`);
    lines.push('');
  }
  if (changes.newAnime.length) {
    lines.push('### New anime', '');
    for (const id of changes.newAnime) lines.push(`- ${titleOf(id)}`);
    lines.push('');
  }
  if (changes.removedEpisodes) {
    lines.push(`${changes.removedEpisodes} episode(s) are gone (deleted, made private, or no longer embeddable on YouTube).`, '');
  }
  return lines.join('\n');
};

// The "New on Animist" list the app shows on Home: what each run added, kept for `keepDays`.
// previous: the last list ([{ id, kind, episodes?, at }]); changes: summarizeChanges(); `isMovie(id)`.
// kind: 'new' (an anime that just got free episodes), 'movie' (a newly found full movie) or
// 'episodes' (new episodes for an anime that had some; `episodes` lists them). Newest first; an
// anime appears once, with everything added to it in that time.
const recentAdditions = (previous, changes, now, isMovie = () => false, keepDays = 7, max = 40) => {
  const at = new Date(now).toISOString();
  const cutoff = new Date(now).getTime() - keepDays * 86400000;
  const kept = (previous ?? []).filter((a) => Date.parse(a.at) >= cutoff);
  const byId = new Map(kept.map((a) => [String(a.id), a]));
  const fresh = [];
  for (const id of changes.newAnime) fresh.push({ id: Number(id), kind: isMovie(id) ? 'movie' : 'new', at });
  for (const { id, added } of changes.updated) {
    const earlier = byId.get(String(id));
    // Episodes added to something that was itself new this week keep it "new".
    if (earlier && earlier.kind !== 'episodes') fresh.push({ ...earlier, at });
    else fresh.push({ id: Number(id), kind: 'episodes', episodes: [...new Set([...(earlier?.episodes ?? []), ...added])].sort((a, b) => a - b), at });
  }
  const freshIds = new Set(fresh.map((a) => String(a.id)));
  return [...fresh, ...kept.filter((a) => !freshIds.has(String(a.id)))].slice(0, max);
};

module.exports = { episodeTotal, sameContent, suspiciousDrop, summarizeChanges, episodeRanges, summaryMarkdown, recentAdditions };
