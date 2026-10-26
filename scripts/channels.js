// Official licensors that upload full episodes for free with English subtitles or dubs. Used by
// find-episodes.js (full search) and check-feeds.js (daily check for new uploads).
// `english: true` marks English-language channels: their videos don't say "English" in the title,
// so every video counts, but only if it's at least MIN_MINUTES long (their playlists mix in clips).
// Checked and left out: Ani-One Asia (Chinese subtitles only; Ani-One Philippines has English);
// Crunchyroll, Crunchyroll Dubs, RetroCrush, TOHO animation, Pokémon and VIZ (clips, trailers or
// private videos, not full series).
const CHANNELS = [
  { handle: '@MuseAsia' },
  { handle: '@MusePhilippines' },
  { handle: '@AniOnePhilippines' },
  { handle: '@GundamInfo' },
  { handle: '@BeybladeOfficial', english: true },
  { handle: '@cardfightvanguard', english: true },
];

const MIN_MINUTES = 10;

module.exports = { CHANNELS, MIN_MINUTES };
