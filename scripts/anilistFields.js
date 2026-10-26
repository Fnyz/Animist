// The AniList fields the app needs for each anime, shared by the data scripts.
const MEDIA_FIELDS = `
  id
  title { romaji english native }
  synonyms
  coverImage { extraLarge large }
  bannerImage
  format
  status
  episodes
  nextAiringEpisode { episode airingAt }
  seasonYear
  startDate { year month day }
  genres
  tags { name isMediaSpoiler }
  description(asHtml: false)
  averageScore
  popularity
  isAdult
  trailer { id site }
  externalLinks { site url type }
  streamingEpisodes { title thumbnail url site }
`;

module.exports = { MEDIA_FIELDS };
