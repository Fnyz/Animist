// Matching helpers for scripts/find-episodes.js: which YouTube playlist is which anime,
// and which video is which episode. Kept separate so they can be unit tested.

// Words that mark a playlist as subtitled or dubbed in another language.
const OTHER_LANGUAGES = /\b(indonesia|indo|thai|vietnam(ese)?|tiếng việt|hindi|tamil|telugu|tagalog|filipino|malay|chinese|cantonese|mandarin|español|portugu[eê]s|arabic|korean)\b|中文|中字|繁中|简中|粵語|粤语|國語|国语/i;

const ORDINALS = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10 };

// Lowercase, without brackets, punctuation, "season" noise or channel names.
// (AniList sends null for missing titles, so `text` may be null.)
const normalize = (text) =>
  String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[[(【「].*?[\])】」]/g, ' ')
    .replace(/\b(eng(lish)?\s*sub(bed|s|title[sd]?)?|full episodes?|playlist|muse (asia|philippines|ph)|ani-?one( asia| philippines)?|hd remaster(ed)?|remaster(ed)?|director[’']?s cut|edited video)\b/g, ' ')
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    // One way to write seasons: "2nd Season", "Second Season" and "Season2" become "season 2",
    // and a trailing "Season 1" is just the base title ("Haikyu!! Season 1" = "Haikyu!!").
    .replace(/\bseason(\d+)\b/g, 'season $1')
    .replace(/\b(\d+)(?:st|nd|rd|th) season\b/g, 'season $1')
    .replace(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth) season\b/g, (_, word) => `season ${ORDINALS[word]}`)
    .replace(/\bseason 0*1$/, '')
    .replace(/\s+/g, ' ')
    .trim();

const titlesOf = (media) =>
  [media.title?.english, media.title?.romaji, ...(media.synonyms ?? [])]
    .map(normalize)
    .filter((t) => t.length >= 4);

// The separate titles inside a playlist name. Ani-One uses "《中文》|《English》【Ani-One Asia】",
// Muse Asia uses "[2026 Oct] English Title [English Sub]".
const CJK_NUMBERS = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

// Keep season markers as words ("(Season 7)" -> "season 7", "第四季" -> "season 4") so a later
// season never matches the first one; "Season 1" / "(S1)" is just the base title, so it's dropped.
const keepSeasons = (text) =>
  text
    .replace(/[(（]\s*(?:s|season\s*)(\d+)\s*[)）]/gi, (_, n) => (Number(n) === 1 ? ' ' : ` season ${n} `))
    .replace(/[(（]?\s*第\s*([一二三四五六七八九十]|\d+)\s*季\s*[)）]?/g, (_, n) => {
      const num = CJK_NUMBERS[n] ?? Number(n);
      return num === 1 ? ' ' : ` season ${num} `;
    });

// Words that don't identify a show on their own ("Final Season", "Part 2").
const GENERIC = new Set(['the', 'final', 'season', 'part', 'cour', 'movie', 'special', 'ova', 'ona', 'tv', 'series', 'new', 'all', 'episodes', 'ultra']);
const isGeneric = (normalized) => normalized.split(' ').every((w) => GENERIC.has(w) || /^\d+(st|nd|rd|th)?$/.test(w));

const titleParts = (playlistTitle) => {
  const raw = keepSeasons(String(playlistTitle ?? ''));
  const parts = [raw, ...raw.split(/[|｜]/), ...[...raw.matchAll(/《([^》]+)》/g)].map((m) => m[1])];
  return [...new Set(parts.map(normalize).filter((p) => p && !isGeneric(p)))];
};

// The later season a playlist name mentions anywhere ("S4", "Season 4", "第四季"), or null.
const seasonOf = (playlistTitle) => {
  const text = keepSeasons(String(playlistTitle ?? ''));
  const n = Number(text.match(/\b(?:s|season\s*)(\d+)\b/i)?.[1]);
  return n > 1 ? n : null;
};

// 100 when a playlist title equals the anime's main title, 80 for an alternate name, else 0.
// Containment isn't enough: "Another" is inside "Re:ZERO ... in Another World", and
// "Dr. STONE" is inside "Dr. STONE Season 4", which is a different season.
const scorePlaylist = (playlistTitle, media) => {
  if (OTHER_LANGUAGES.test(playlistTitle ?? '')) return 0;
  const parts = titleParts(playlistTitle);
  const season = seasonOf(playlistTitle);
  const fits = (title) =>
    parts.includes(title) && (!season || title.includes(`season ${season}`) || title.endsWith(` ${season}`));
  const main = [media.title?.english, media.title?.romaji].map(normalize).filter((t) => t.length >= 4);
  const alternate = (media.synonyms ?? []).map(normalize).filter((t) => t.length >= 4);
  if (main.some(fits)) return 100;
  if (alternate.some(fits)) return 80;
  return 0;
};

// For each anime, every playlist that matches it, best first (an anime can have playlists on
// several channels, which fill each other's gaps). Each playlist goes to one anime only, the one it
// matches best: a later season that lists the base title as an alternate name loses to the base
// season, and on a tie (same title) the more popular entry wins: the TV series over a same-named
// OVA or remake nobody watches.
const matchPlaylists = (playlists, mediaList) => {
  const best = new Map(); // playlist id -> { media, pl, score }
  for (const pl of playlists) {
    for (const media of mediaList) {
      const score = scorePlaylist(pl.title, media);
      const current = best.get(pl.id);
      if (score && (!current || score > current.score ||
          (score === current.score && (media.popularity ?? 0) > (current.media.popularity ?? 0)))) {
        best.set(pl.id, { media, pl, score });
      }
    }
  }
  const matches = new Map();
  for (const { media, pl, score } of best.values()) {
    if (!matches.has(media.id)) matches.set(media.id, []);
    matches.get(media.id).push({ ...pl, score });
  }
  // Exact titles before alternate names; otherwise keep the order the playlists came in
  // (find-episodes.js lists the preferred channels first).
  for (const list of matches.values()) list.sort((a, b) => b.score - a.score);
  return matches;
};

const NOT_AN_EPISODE = /\b(pv|trailer|teaser|preview|promo|recap|opening|ending|op|ed|special announcement|compilation|highlights?|clip)\b/i;
const EPISODE_RANGE = /\b(?:ep(?:isode)?s?\.?\s*)?\d+\s*(?:-|~|to)\s*\d+\b/i;
const EPISODE_PATTERNS = [
  /\bep(?:isode)?\.?\s*(\d{1,4})\b/i,
  /#\s*(\d{1,4})\b/,
  /第\s*(\d{1,4})\s*[話话集]/,
  /\s[-|]\s*(\d{1,4})\s*(?:[-|[(]|$)/,
];

// Recaps and previews written in Chinese/Japanese ("一分鐘回顧" = one-minute recap).
const NOT_AN_EPISODE_CJK = /回顧|回顾|預告|预告|總集|总集/;

// Only videos that say they're English-subtitled. Some official channels upload with
// Chinese subtitles only ("繁中字幕"), which doesn't suit an English app.
const ENGLISH_MARKERS = /\b(english|eng)\b|\ben\s*(dub|sub)|w\/\s*subtit/i;
const isEnglishSub = (videoTitle) => {
  const t = String(videoTitle ?? '');
  return !OTHER_LANGUAGES.test(t) && ENGLISH_MARKERS.test(t);
};

// The episode number in a video title, or null for trailers, recaps and compilations.
const episodeNumber = (videoTitle) => {
  videoTitle = String(videoTitle ?? '');
  if (/^(private|deleted) video$/i.test(videoTitle.trim())) return null;
  if (NOT_AN_EPISODE.test(videoTitle) || NOT_AN_EPISODE_CJK.test(videoTitle) || EPISODE_RANGE.test(videoTitle)) return null;
  for (const pattern of EPISODE_PATTERNS) {
    const n = Number(videoTitle.match(pattern)?.[1]);
    if (n > 0 && n < 2000) return n;
  }
  return null;
};

module.exports = { normalize, titleParts, seasonOf, scorePlaylist, matchPlaylists, episodeNumber, isEnglishSub, OTHER_LANGUAGES };
