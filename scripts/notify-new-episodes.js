#!/usr/bin/env node
// Sends new-episode notifications after an update with new episodes was published: everyone with
// one of those anime in My List gets "Jujutsu Kaisen: Episode 9 is free to watch in Animist."
// Run by the update workflows right after `eas update`, so tapping a notification finds the
// episode already published (the app loads the update before opening the anime).
//
// Usage: node scripts/notify-new-episodes.js --before <git ref> [--dry-run]
//   --before    the commit before the update (its data/episodes.json is compared with the current)
//   --dry-run   print the notifications instead of sending them
// Needs FIREBASE_SERVICE_ACCOUNT: a Firebase service account key (JSON) allowed to read Firestore.
// Without it, or without new episodes, it does nothing.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { summarizeChanges } = require('./episodeDiff');
const { newEpisodesById, buildMessages } = require('./episodeNotifications');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const BEFORE = args.includes('--before') ? args[args.indexOf('--before') + 1] : null;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const readAt = (ref, file) => {
  try {
    return JSON.parse(execFileSync('git', ['show', `${ref}:${file}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  } catch {
    return null; // first commit, or the file didn't exist yet
  }
};
const chunks = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

(async () => {
  if (!BEFORE || /^0+$/.test(BEFORE)) return console.log('No earlier commit to compare with: nothing to notify.');
  const before = readAt(BEFORE, 'data/episodes.json');
  const after = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'episodes.json'), 'utf8'));
  if (!before) return console.log(`No episode list at ${BEFORE}: nothing to notify.`);

  const newEpisodes = newEpisodesById(summarizeChanges(before, after), after);
  const ids = Object.keys(newEpisodes);
  if (!ids.length) return console.log('No new episodes in this update: nothing to notify.');
  console.log(`${ids.length} anime with new episodes.`);

  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    return console.log('FIREBASE_SERVICE_ACCOUNT is not set: notifications are off.');
  }
  const admin = require('firebase-admin');
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  const db = admin.firestore();

  // Who has these anime on their list (Firestore "in" queries take up to 30 values), then their phones.
  const watchlists = [];
  for (const part of chunks(ids.map(Number), 30)) {
    const snap = await db.collection('watchList').where('titleId', 'in', part).get();
    snap.forEach((d) => watchlists.push({ userId: d.get('userId'), titleId: d.get('titleId') }));
  }
  const userIds = [...new Set(watchlists.map((w) => w.userId))];
  const tokens = [];
  for (const part of chunks(userIds, 30)) {
    const snap = await db.collection('pushTokens').where('userId', 'in', part).get();
    snap.forEach((d) => tokens.push({ userId: d.get('userId'), token: d.get('token') }));
  }

  const snapshot = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'animeSnapshot.json'), 'utf8'));
  const titleOf = (id) => {
    const m = after.media?.[id] ?? snapshot.media?.[id];
    return m?.title?.english || m?.title?.romaji || 'An anime on your list';
  };
  const messages = buildMessages({ newEpisodes, watchlists, tokens, titleOf });
  console.log(`${watchlists.length} list entries, ${tokens.length} phones, ${messages.length} notifications.`);
  if (DRY_RUN) return messages.forEach((m) => console.log(`  ${m.title}: ${m.body}`));

  // Expo's push service takes up to 100 messages a request. Tokens of uninstalled apps are removed.
  let sent = 0;
  for (const part of chunks(messages, 100)) {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(part),
    });
    const { data = [] } = await res.json();
    for (const [i, ticket] of data.entries()) {
      if (ticket.status === 'ok') sent += 1;
      else if (ticket.details?.error === 'DeviceNotRegistered') await db.collection('pushTokens').doc(part[i].to).delete();
      else console.warn(`Not sent: ${ticket.message ?? ticket.details?.error}`);
    }
  }
  console.log(`Sent ${sent} of ${messages.length} notifications.`);
})().catch((err) => {
  // Notifications are a bonus: a failure here never fails the update that was already published.
  console.warn('Notifications failed:', err.message);
});
