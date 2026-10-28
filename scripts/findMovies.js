// Step 4 of scripts/find-episodes.js: full anime movies the official channels uploaded for free.
// A movie is often a single video outside any playlist, so the channels' uploads are read too.
// Each match is stored like a one-episode anime (the app plays movies as episode 1).
const { isMovieCandidate, saysMovie, bestMovie, movieSearchText, isFullMovie } = require('./movieMatching');

// How far back the uploads are read: everything in full runs (up to 15,000 videos per channel),
// only the newest in quick runs.
const UPLOAD_PAGES = { full: 300, quick: 2 };

// ctx: {
//   channels: [{ handle, title, english, skip, uploadsId }], playlistItems: Map(playlistId -> items),
//   playlists: [{ id, channel, english, skip }], movies: AniList MOVIE media already known,
//   all(endpoint, params, maxPages), yt(endpoint, params), searchMovies(text) -> [media],
//   minutesOf(isoDuration), cache: { movieSearches, rejected, media }, quick, log
// }
// Returns Map(movieId -> { media, videos: [{ videoId, title, channel, allowedIn?, blockedIn? }] }),
// best video first.
const findMovies = async (ctx) => {
  const { channels, playlistItems, playlists, all, yt, searchMovies, minutesOf, cache, quick, log } = ctx;

  // 1) Uploads that could be whole films, from the playlists already read and the channels' uploads.
  const videos = new Map();
  const add = (item, channel) => {
    const videoId = item.contentDetails?.videoId;
    const title = item.snippet?.title;
    if (!videoId || videos.has(videoId) || channel.skip?.test(title ?? '')) return;
    if (isMovieCandidate(title, channel.english)) videos.set(videoId, { videoId, title, channel: channel.title });
  };
  const channelOf = new Map(channels.map((c) => [c.title, c]));
  for (const pl of playlists) for (const item of playlistItems.get(pl.id) ?? []) add(item, channelOf.get(pl.channel) ?? pl);
  for (const channel of channels) {
    if (!channel.uploadsId) continue;
    const uploads = await all('playlistItems', { part: 'snippet,contentDetails', playlistId: channel.uploadsId }, quick ? UPLOAD_PAGES.quick : UPLOAD_PAGES.full);
    for (const item of uploads) add(item, channel);
  }
  log(`Movies: ${videos.size} uploads could be full movies.`);

  // 2) Which AniList movie each one is: the movies already known, then an AniList search for
  //    uploads that call themselves a movie (each search text once; quick runs reuse earlier ones).
  const pool = new Map(ctx.movies.map((m) => [m.id, m]));
  for (const m of Object.values(cache.media)) if (m?.format === 'MOVIE') pool.set(m.id, m);
  const unmatched = [...videos.values()].filter((v) => !bestMovie(v.title, [...pool.values()]) && saysMovie(v.title));
  const texts = [...new Set(unmatched.map((v) => movieSearchText(v.title)).filter(Boolean))];
  const toSearch = texts.filter((t) => !(quick && t in cache.movieSearches));
  if (toSearch.length) log(`Movies: searching AniList for ${toSearch.length} titles.`);
  for (const text of toSearch) {
    const found = (await searchMovies(text)).filter((m) => m.format === 'MOVIE' && !m.isAdult);
    cache.movieSearches[text] = found.map((m) => m.id);
    for (const m of found) cache.media[m.id] = m;
  }
  for (const text of texts) for (const id of cache.movieSearches[text] ?? []) if (cache.media[id]) pool.set(id, cache.media[id]);

  const byMovie = new Map();
  for (const v of videos.values()) {
    const m = bestMovie(v.title, [...pool.values()]);
    if (m) byMovie.set(m.id, [...(byMovie.get(m.id) ?? []), v]);
  }

  // 3) Keep full-length uploads that play inside other apps; note where each can be watched.
  const matched = [...byMovie.values()].flat();
  const unchecked = matched.filter((v) => !(quick && cache.rejected[v.videoId]));
  for (const v of matched) if (quick && cache.rejected[v.videoId]) v.rejected = true;
  for (let i = 0; i < unchecked.length; i += 50) {
    const batch = unchecked.slice(i, i + 50);
    const details = await yt('videos', { part: 'contentDetails,status', id: batch.map((v) => v.videoId).join(',') });
    for (const d of details.items ?? []) {
      const v = batch.find((x) => x.videoId === d.id);
      const r = d.contentDetails?.regionRestriction;
      if (r?.allowed) v.allowedIn = r.allowed;
      if (r?.blocked) v.blockedIn = r.blocked;
      v.minutes = minutesOf(d.contentDetails?.duration);
      if (d.status?.embeddable === false) cache.rejected[v.videoId] = 'embed';
      else if (!isFullMovie(v.minutes)) cache.rejected[v.videoId] = 'short';
      else delete cache.rejected[v.videoId];
      v.rejected = Boolean(cache.rejected[v.videoId]);
    }
    // Videos YouTube no longer returns (removed or private) can't play either.
    for (const v of batch) if (v.minutes === undefined) v.rejected = true;
  }

  const result = new Map();
  for (const [id, list] of byMovie) {
    const usable = list.filter((v) => !v.rejected).sort((a, b) => (b.minutes ?? 0) - (a.minutes ?? 0));
    if (usable.length) result.set(id, { media: pool.get(id), videos: usable.map(({ videoId, title, channel, allowedIn, blockedIn }) => ({ videoId, title, channel, allowedIn, blockedIn })) });
  }
  log(`Movies: ${result.size} full movies found.`);
  return result;
};

module.exports = { findMovies };
