#!/usr/bin/env node
// Checks the official channels' RSS feeds for episodes the app doesn't have yet. Free: no API key
// and no quota, so it can run every day; the expensive search (find-episodes.js) only runs when
// this finds something.
//
// Usage: node scripts/check-feeds.js
// Prints the new uploads. In GitHub Actions it also sets the step output `new_videos` (a count).
const fs = require('fs');
const path = require('path');
const { CHANNELS } = require('./channels');
const { feedUrl, parseFeed, knownVideoIds, newEpisodeVideos } = require('./feeds');

const OUT = path.join(__dirname, '..', 'data', 'episodes.json');

(async () => {
  const data = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const known = knownVideoIds(data);
  const ids = new Map((data.channels ?? []).map((c) => [c.handle, c]));

  let total = 0;
  for (const { handle, english, skip } of CHANNELS) {
    const channel = ids.get(handle);
    if (!channel) {
      // Added to channels.js after the last full search: the weekly full run picks it up.
      console.log(`${handle}: not in data/episodes.json yet, skipped (the next full search adds it).`);
      continue;
    }
    const res = await fetch(feedUrl(channel.id));
    if (!res.ok) {
      console.warn(`${channel.title}: feed failed (HTTP ${res.status}), skipped.`);
      continue;
    }
    const fresh = newEpisodeVideos(parseFeed(await res.text()), known, { english, skip });
    total += fresh.length;
    console.log(`${channel.title}: ${fresh.length} new episode upload(s)`);
    for (const v of fresh) console.log(`  - ${v.title} (https://youtu.be/${v.videoId})`);
  }

  console.log(total ? `${total} new episode upload(s) found.` : 'No new episodes.');
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `new_videos=${total}\n`);
})().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
