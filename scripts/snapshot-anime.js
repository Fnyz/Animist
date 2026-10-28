#!/usr/bin/env node
// Saves a snapshot of real AniList data to data/animeSnapshot.json, used by api.js
// when USE_STATIC_DATA is true. Re-run to refresh it: node scripts/snapshot-anime.js
// The daily episode workflow runs it too, so Home's lists stay current. About 25 requests and a
// minute; no key needed. If AniList answers with much less than last time, the old file is kept.
const fs = require('fs');
const path = require('path');

const ENDPOINT = 'https://graphql.anilist.co';
const OUT = path.join(__dirname, '..', 'data', 'animeSnapshot.json');
const EPISODES = path.join(__dirname, '..', 'data', 'episodes.json');

const { MEDIA_FIELDS } = require('./anilistFields');

const SNAPSHOT_FORMAT = 1;

const LISTS = {
  trending: 'sort: [TRENDING_DESC, POPULARITY_DESC]',
  airing: 'sort: [POPULARITY_DESC], status: RELEASING',
  popular: 'sort: [POPULARITY_DESC]',
  movies: 'sort: [POPULARITY_DESC], format: MOVIE',
};

const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mahou Shoujo', 'Mecha', 'Music',
  'Mystery', 'Psychological', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// AniList allows about 30 requests a minute, so requests are spaced out.
const gql = async (query, variables = {}) => {
  await sleep(2200);
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
};

const page = (filter, perPage) => `{
  Page(perPage: ${perPage}) { media(type: ANIME, isAdult: false, ${filter}) { ${MEDIA_FIELDS} } }
}`;

(async () => {
  const media = {};
  const keep = (m) => {
    media[m.id] = m;
    return m.id;
  };
  const lists = {};
  const genres = {};

  for (const [name, filter] of Object.entries(LISTS)) {
    process.stdout.write(`${name}… `);
    lists[name] = (await gql(page(filter, 30))).Page.media.map(keep);
  }

  process.stdout.write('recent episodes… ');
  const now = Math.floor(Date.now() / 1000);
  const recentData = await gql(`{
    Page(perPage: 50) {
      airingSchedules(airingAt_lesser: ${now}, sort: TIME_DESC) { episode airingAt media { ${MEDIA_FIELDS} } }
    }
  }`);
  const recent = recentData.Page.airingSchedules
    .filter((s) => s.media && !s.media.isAdult && (s.media.popularity ?? 0) >= 2000)
    .slice(0, 30)
    .map((s) => ({ mediaId: keep(s.media), episode: s.episode, airingAt: s.airingAt }));

  // The coming week's episodes, for the Schedule tab (from a day back, so today's are all there).
  // airingAt is an exact time, so countdowns stay right even though this is refreshed once a day.
  process.stdout.write('schedule… ');
  const schedule = [];
  for (let page = 1; page <= 6; page++) {
    const data = await gql(`{
      Page(page: ${page}, perPage: 50) {
        pageInfo { hasNextPage }
        airingSchedules(airingAt_greater: ${now - 86400}, airingAt_lesser: ${now + 8 * 86400}, sort: TIME) {
          episode airingAt media { ${MEDIA_FIELDS} }
        }
      }
    }`);
    for (const s of data.Page.airingSchedules) {
      if (s.media && !s.media.isAdult && (s.media.popularity ?? 0) >= 2000) {
        schedule.push({ mediaId: keep(s.media), episode: s.episode, airingAt: s.airingAt });
      }
    }
    if (!data.Page.pageInfo.hasNextPage) break;
  }

  for (const genre of GENRES) {
    process.stdout.write(`${genre}… `);
    genres[genre] = (await gql(page(`sort: [POPULARITY_DESC], genre: "${genre}"`, 15))).Page.media.map(keep);
  }

  // Anime with episodes in the app whose data lives in this snapshot (the rest is stored in
  // data/episodes.json) stay in it even when they drop out of the lists above; otherwise their
  // pages would have no data. Fetched again too, so airing shows keep the right episode count.
  const episodes = fs.existsSync(EPISODES) ? JSON.parse(fs.readFileSync(EPISODES, 'utf8')) : { anime: {}, media: {} };
  const missing = Object.keys(episodes.anime ?? {})
    .map(Number)
    .filter((id) => !media[id] && !(episodes.media ?? {})[id]);
  for (let i = 0; i < missing.length; i += 50) {
    process.stdout.write('anime with episodes… ');
    const ids = missing.slice(i, i + 50);
    (await gql(`{ Page(perPage: 50) { media(id_in: [${ids.join(',')}], type: ANIME) { ${MEDIA_FIELDS} } } }`)).Page.media.forEach(keep);
  }

  // A much smaller answer than last time means AniList had a problem, not that anime vanished.
  let before = 0;
  try {
    before = Object.keys(JSON.parse(fs.readFileSync(OUT, 'utf8')).media ?? {}).length;
  } catch (e) {
    if (e.code !== 'ENOENT') throw e; // no snapshot yet is fine; a broken one isn't
  }
  const after = Object.keys(media).length;
  if (before && after < before * 0.8) {
    throw new Error(`only ${after} anime instead of ${before}; kept the old snapshot`);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  // `format` changes only when the file's shape changes in a way older apps can't read; apps that
  // download the snapshot (episodeData.js) ignore a format they don't know and keep their own copy.
  const snapshot = { format: SNAPSHOT_FORMAT, savedAt: new Date().toISOString(), lists, recent, schedule, genres, media };
  fs.writeFileSync(OUT, JSON.stringify(snapshot));
  console.log(`\nSaved ${Object.keys(media).length} anime to ${path.relative(process.cwd(), OUT)}`);
})().catch((err) => {
  console.error('\nSnapshot failed:', err.message);
  process.exit(1);
});
