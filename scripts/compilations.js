// Official compilations: a season recut into a few long videos ("Chainsaw Man The Compilation Part 1").
// AniList has no entry for them, so they're attached to the series they recut and shown on its page
// apart from the episodes (data/episodes.json `compilations`: { animeId: [{ part, videoId, ... }] }).
const { normalize, titleParts, titlesOf, isEnglishSub, OTHER_LANGUAGES } = require('./episodeMatching');

const COMPILATION_MIN_MINUTES = 45;
const COMPILATION_WORDS = /\b(?:the\s+)?compilation\b|総集編|總集篇|总集篇/gi;
const PART = /\bpart\s*(\d+)\b/i;
// Uploads about a compilation that aren't it.
const NOT_A_COMPILATION = /\b(pv|trailer|teaser|preview|promo|clip|reacts?|reaction|review|amv)\b|予告|預告|预告/i;
const SERIES_FORMATS = new Set(['TV', 'TV_SHORT', 'ONA']);

// The part number of an English compilation upload (1 when it isn't split), else null.
// `englishChannel`: the channel's videos are English without saying so.
const compilationPart = (videoTitle, englishChannel = false) => {
  const title = String(videoTitle ?? '');
  if (!new RegExp(COMPILATION_WORDS.source, 'i').test(title) || NOT_A_COMPILATION.test(title)) return null;
  if (!(englishChannel ? !OTHER_LANGUAGES.test(title) : isEnglishSub(title))) return null;
  return Number(title.match(PART)?.[1] ?? 1);
};

// The series a compilation recuts: the one whose main title (else another name) is the title left
// once "The Compilation Part N" is taken out, the most popular on a tie. null when none is.
const compilationAnime = (videoTitle, media) => {
  const parts = titleParts(String(videoTitle ?? '').replace(COMPILATION_WORDS, ' ').replace(PART, ' '));
  const series = media.filter((m) => SERIES_FORMATS.has(m?.format));
  const main = (m) => [m.title?.english, m.title?.romaji].map(normalize).some((t) => t.length >= 4 && parts.includes(t));
  const named = series.filter(main);
  const found = named.length ? named : series.filter((m) => titlesOf(m).some((t) => parts.includes(t)));
  return found.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0] ?? null;
};

// uploads: [{ item (a playlistItems item), channel: { title, english, skip } }] from the channels;
// media: AniList anime to match; previous: the last run's compilations, kept (quick runs only read
// the newest uploads). Returns { animeId: [{ part, videoId, channel, minutes, allowedIn?, blockedIn? }] }.
const findCompilations = async ({ uploads, media, membersOnly, yt, minutesOf, previous = {} }) => {
  const found = new Map();
  for (const { item, channel } of uploads) {
    const videoId = item.contentDetails?.videoId;
    const title = item.snippet?.title;
    if (!videoId || found.has(videoId) || membersOnly.has(videoId) || channel.skip?.test(title ?? '')) continue;
    const part = compilationPart(title, channel.english);
    const anime = part ? compilationAnime(title, media) : null;
    if (anime) found.set(videoId, { animeId: anime.id, part, videoId, channel: channel.title });
  }

  // Only full-length uploads that play inside other apps; and where each can be watched.
  const checked = [];
  const list = [...found.values()];
  for (let i = 0; i < list.length; i += 50) {
    const batch = list.slice(i, i + 50);
    const details = await yt('videos', { part: 'contentDetails,status', id: batch.map((v) => v.videoId).join(',') });
    for (const d of details.items ?? []) {
      const v = batch.find((x) => x.videoId === d.id);
      const minutes = minutesOf(d.contentDetails?.duration);
      if (d.status?.embeddable === false || minutes < COMPILATION_MIN_MINUTES) continue;
      const r = d.contentDetails?.regionRestriction;
      checked.push({ ...v, minutes, ...(r?.allowed ? { allowedIn: r.allowed } : {}), ...(r?.blocked ? { blockedIn: r.blocked } : {}) });
    }
  }

  const result = {};
  for (const [id, parts] of Object.entries(previous ?? {})) {
    const free = parts.filter((p) => !membersOnly.has(p.videoId));
    if (free.length) result[id] = free;
  }
  const byAnime = new Map();
  for (const { animeId, ...v } of checked) byAnime.set(animeId, [...(byAnime.get(animeId) ?? []), v]);
  for (const [id, videos] of byAnime) {
    // One video per part (a channel may upload the same part twice), longest first.
    const parts = new Map();
    for (const v of videos.sort((a, b) => b.minutes - a.minutes)) if (!parts.has(v.part)) parts.set(v.part, v);
    result[id] = [...parts.values()].sort((a, b) => a.part - b.part);
  }
  return result;
};

module.exports = { COMPILATION_MIN_MINUTES, compilationPart, compilationAnime, findCompilations };
