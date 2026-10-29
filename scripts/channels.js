// Official licensors that upload full episodes for free with English subtitles or dubs. Used by
// find-episodes.js (full search) and check-feeds.js (daily check for new uploads).
// `skip` matches playlist and video titles to ignore.
// `english: true` marks English-language channels: their videos don't say "English" in the title,
// so every video counts, but only if it's at least MIN_MINUTES long (their playlists mix in clips).
// `captions: 'en'` marks channels whose English subtitles are a caption track (not in the picture
// or the titles): their videos count when they have captions, and the app switches English on.
// Checked and left out:
// Crunchyroll, Crunchyroll Dubs, RetroCrush, TOHO animation, Pokémon and VIZ (clips, trailers or
// private videos, not full series).
const CHANNELS = [
  { handle: '@MuseAsia' },
  { handle: '@MusePhilippines' },
  // "ULTRA" uploads repeat the free ones for paying channel members, so they're skipped.
  { handle: '@AniOnePhilippines', skip: /\bULTRA\b/ },
  { handle: '@GundamInfo' },
  { handle: '@BeybladeOfficial', english: true },
  { handle: '@cardfightvanguard', english: true },
  // Titles are Chinese, but every episode has official English captions (and others). Last, so the
  // channels with English in the picture come first; it fills gaps and backs them up.
  { handle: '@AniOneAsia', skip: /\bULTRA\b/, captions: 'en' },
];

const MIN_MINUTES = 10;

module.exports = { CHANNELS, MIN_MINUTES };
