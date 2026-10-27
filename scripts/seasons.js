#!/usr/bin/env node
// Saves data/seasons.json: every franchise (seasons, movies, OVAs linked as prequel/sequel on
// AniList) that includes an anime in the app, in release order, for the Seasons row on anime pages.
// Run after snapshot-anime.js and find-episodes.js (the daily episode workflow does). About 20
// AniList requests and a minute; no key needed. If AniList answers with much less than last time,
// the old file is kept.
//
// Usage: node scripts/seasons.js
const fs = require('fs');
const path = require('path');
const { buildGroups, CHAIN } = require('./seasonGroups');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'seasons.json');
const read = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', file), 'utf8'));
const ENDPOINT = 'https://graphql.anilist.co';
const ROUNDS = 3; // how far past the app's anime to follow a chain (older seasons, movies)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const gql = async (query) => {
  await sleep(2200);
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (res.status === 429) {
    await sleep(60000);
    return gql(query);
  }
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
};

const FIELDS = 'id type isAdult format episodes title { english romaji } startDate { year month day } coverImage { large }';

(async () => {
  const snapshot = read('animeSnapshot.json');
  const episodes = read('episodes.json');
  let wanted = new Set([...Object.keys(snapshot.media), ...Object.keys(episodes.anime), ...Object.keys(episodes.media ?? {})].map(Number));

  const entries = new Map();
  const toEntry = (m, relations) => ({
    id: m.id,
    title: m.title?.english || m.title?.romaji,
    format: m.format,
    episodes: m.episodes ?? null,
    cover: m.coverImage?.large ?? null,
    year: m.startDate?.year ?? null,
    month: m.startDate?.month ?? null,
    day: m.startDate?.day ?? null,
    relations,
  });

  for (let round = 0; round < ROUNDS && wanted.size; round++) {
    const ids = [...wanted];
    wanted = new Set();
    console.log(`Round ${round + 1}: ${ids.length} anime`);
    for (let i = 0; i < ids.length; i += 50) {
      const data = await gql(`{ Page(perPage: 50) { media(id_in: [${ids.slice(i, i + 50).join(',')}], type: ANIME) {
        ${FIELDS} relations { edges { relationType node { ${FIELDS} } } } } } }`);
      for (const m of data.Page.media) {
        if (m.isAdult) continue;
        const relations = [];
        for (const { relationType, node } of m.relations?.edges ?? []) {
          if (node.type !== 'ANIME' || node.isAdult || !CHAIN.has(relationType)) continue;
          relations.push({ id: node.id, type: relationType });
          if (!entries.has(node.id) && !ids.includes(node.id)) wanted.add(node.id);
        }
        entries.set(m.id, toEntry(m, relations));
      }
    }
  }

  const groups = buildGroups(entries);
  const inGroups = new Set(groups.flat());
  const shown = {};
  for (const id of inGroups) {
    const { relations, month, day, ...entry } = entries.get(id);
    shown[id] = entry;
  }

  const before = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')).groups?.length ?? 0 : 0;
  if (before && groups.length < before * 0.8) {
    throw new Error(`only ${groups.length} franchises instead of ${before}; kept the old file`);
  }
  // Left alone when nothing changed, so the daily workflow doesn't commit just a new date.
  const old = before ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
  if (old && JSON.stringify([old.groups, old.entries]) === JSON.stringify([groups, shown])) {
    console.log(`No changes (${groups.length} franchises)`);
    return;
  }
  // Written without indentation: the file ships inside the app.
  fs.writeFileSync(OUT, JSON.stringify({ savedAt: new Date().toISOString(), groups, entries: shown }) + '\n');
  console.log(`Saved ${groups.length} franchises (${inGroups.size} anime) to data/seasons.json`);
})().catch((err) => {
  console.error('Seasons failed:', err.message);
  process.exit(1);
});
