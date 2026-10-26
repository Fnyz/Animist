// YouTube's RSS feeds: a channel's latest 15 uploads, free to read (no API key, no quota).
// Kept separate from check-feeds.js so the parsing can be unit tested.
const { episodeNumber, isEnglishSub, OTHER_LANGUAGES } = require('./episodeMatching');

const feedUrl = (channelId) => `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;

const XML_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decodeXml = (text) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e) =>
    e[0] === '#'
      ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)))
      : XML_ENTITIES[e.toLowerCase()]
  );

// [{ videoId, title, published }] from a feed's XML.
const parseFeed = (xml) =>
  [...String(xml ?? '').matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .map(([, entry]) => ({
      videoId: entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1],
      title: decodeXml(entry.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''),
      published: entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? null,
    }))
    .filter((v) => v.videoId);

// Every video id the app already knows about (main videos and backups).
const knownVideoIds = (episodeData) => {
  const ids = new Set();
  for (const anime of Object.values(episodeData?.anime ?? {})) {
    for (const ep of Object.values(anime.episodes ?? {})) {
      ids.add(ep.videoId);
      for (const alt of ep.alts ?? []) ids.add(alt.videoId);
    }
  }
  return ids;
};

// Uploads that look like a new English episode: an episode number, English (or an English-language
// channel), and not already in the app.
const newEpisodeVideos = (videos, knownIds, { english = false } = {}) =>
  videos.filter(
    (v) =>
      !knownIds.has(v.videoId) &&
      episodeNumber(v.title) &&
      (english ? !OTHER_LANGUAGES.test(v.title) : isEnglishSub(v.title))
  );

module.exports = { feedUrl, parseFeed, knownVideoIds, newEpisodeVideos };
