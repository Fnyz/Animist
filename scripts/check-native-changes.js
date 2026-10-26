#!/usr/bin/env node
// Run before publishing an over-the-air update. Fails when native packages or native app.json
// settings changed since the APK of this version was released, because installed APKs can't run
// such an update (that's how v1.1.0 phones got stuck on the launch screen).
// Fix: bump "version" in app.json, add a CHANGELOG section, and release a new APK (tag vX.Y.Z).
//
// Usage: node scripts/check-native-changes.js   (needs the release tags: git fetch --tags)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { nativeChanges } = require('./nativeChanges');

const ROOT = path.join(__dirname, '..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const atTag = (tag, file) => JSON.parse(execFileSync('git', ['show', `${tag}:${file}`], { cwd: ROOT, encoding: 'utf8' }));

// A package has native code when it ships an Android or iOS folder, or is an Expo module.
const isNative = (name) => {
  const dir = path.join(ROOT, 'node_modules', name);
  return ['android', 'ios', 'expo-module.config.json'].some((entry) => fs.existsSync(path.join(dir, entry)));
};

const appJson = read('app.json');
const version = appJson.expo.version;
const tag = `v${version}`;

const tagExists = (() => {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`], { cwd: ROOT, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

if (!tagExists) {
  // No APK has this version yet, so no installed app receives this update.
  console.log(`No ${tag} release yet: nothing installed to protect.`);
  process.exit(0);
}

const changes = nativeChanges(
  { packageJson: atTag(tag, 'package.json'), appJson: atTag(tag, 'app.json') },
  { packageJson: read('package.json'), appJson },
  isNative
);

if (changes.length) {
  console.error(`Native changes since the ${tag} APK, which installed apps can't run:`);
  for (const change of changes) console.error(`  - ${change}`);
  console.error('Bump "version" in app.json, add a CHANGELOG section and release a new APK instead of an over-the-air update.');
  if (process.env.GITHUB_ACTIONS) {
    console.log(`::error::Native changes since ${tag} (${changes.join(', ')}). Bump the version and release a new APK.`);
  }
  process.exit(1);
}
console.log(`Safe: no native changes since the ${tag} APK.`);
