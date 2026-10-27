// The notifications to send for an episode update: who gets which message. Kept separate from
// notify-new-episodes.js (which reads Firestore and sends them) so it can be unit tested.
const { episodeRanges } = require('./episodeDiff');

// Anime that gained episodes, or became playable in the app: { [animeId]: [episode numbers] }.
const newEpisodesById = (changes, after) => {
  const result = {};
  for (const { id, added } of changes.updated) result[id] = added;
  for (const id of changes.newAnime) result[id] = Object.keys(after.anime[id].episodes).map(Number).sort((a, b) => a - b);
  return result;
};

// "Episode 9 is free to watch in Animist." / "Episodes 9–10 are free…"
const bodyFor = (numbers) => {
  const text = episodeRanges(numbers).replace(/^EP /, '');
  return numbers.length === 1 ? `Episode ${text} is free to watch in Animist.` : `Episodes ${text} are free to watch in Animist.`;
};

// Expo push messages: one per phone and anime, or one summary when several anime on someone's
// list got episodes at once (so nobody gets a pile of notifications).
// watchlists: [{ userId, titleId }], tokens: [{ userId, token }], titleOf(id) -> name.
const buildMessages = ({ newEpisodes, watchlists, tokens, titleOf, channelId = 'new-episodes' }) => {
  const animeByUser = new Map();
  for (const { userId, titleId } of watchlists) {
    const id = String(titleId);
    if (!newEpisodes[id]) continue;
    if (!animeByUser.has(userId)) animeByUser.set(userId, new Set());
    animeByUser.get(userId).add(id);
  }
  const messages = [];
  for (const { userId, token } of tokens) {
    const ids = [...(animeByUser.get(userId) ?? [])];
    if (!ids.length) continue;
    const base = { to: token, channelId, sound: null, priority: 'default' };
    if (ids.length === 1) {
      const [id] = ids;
      messages.push({ ...base, title: titleOf(id), body: bodyFor(newEpisodes[id]), data: { animeId: id } });
    } else {
      const names = ids.map(titleOf);
      const shown = names.slice(0, 2).join(', ') + (names.length > 2 ? ` and ${names.length - 2} more` : '');
      messages.push({ ...base, title: 'New episodes on your list', body: `${shown} have new free episodes in Animist.`, data: { animeId: ids[0] } });
    }
  }
  return messages;
};

module.exports = { newEpisodesById, bodyFor, buildMessages };
