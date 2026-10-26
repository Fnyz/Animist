#!/usr/bin/env node
// Saves a snapshot of real AniList data to data/animeSnapshot.json, used by api.js
// when USE_STATIC_DATA is true. Re-run to refresh it: node scripts/snapshot-anime.js
const fs = require('fs');
const path = require('path');

const ENDPOINT = 'https://graphql.anilist.co';
const OUT = path.join(__dirname, '..', 'data', 'animeSnapshot.json');

const { MEDIA_FIELDS } = require('./anilistFields');

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

  for (const genre of GENRES) {
    process.stdout.write(`${genre}… `);
    genres[genre] = (await gql(page(`sort: [POPULARITY_DESC], genre: "${genre}"`, 15))).Page.media.map(keep);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ savedAt: new Date().toISOString(), lists, recent, genres, media }));
  console.log(`\nSaved ${Object.keys(media).length} anime to ${path.relative(process.cwd(), OUT)}`);
})().catch((err) => {
  console.error('\nSnapshot failed:', err.message);
  process.exit(1);
});
