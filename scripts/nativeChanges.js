// Compares the native side of the app (packages with Android/iOS code, and app.json plugins)
// between two versions of package.json and app.json. Over-the-air updates only carry JavaScript,
// so an update that needs native code the installed APK doesn't have stops the app at launch.
// Used by check-native-changes.js; kept separate so it can be unit tested.

// The parts of app.json that change the native app.
const nativeConfig = (appJson) => {
  const expo = appJson?.expo ?? {};
  return JSON.stringify({ plugins: expo.plugins ?? [], android: expo.android ?? {}, ios: expo.ios ?? {} });
};

// What changed natively between `before` and `after` ({ packageJson, appJson } each):
// a list of readable changes, empty when the installed apps can safely take the update.
// `isNative(name)` says whether a package has native code.
const nativeChanges = (before, after, isNative) => {
  const deps = (pkg) => ({ ...(pkg?.dependencies ?? {}) });
  const old = deps(before.packageJson);
  const now = deps(after.packageJson);
  const changes = [];
  for (const name of new Set([...Object.keys(old), ...Object.keys(now)])) {
    if (!isNative(name)) continue;
    if (!(name in old)) changes.push(`added ${name}`);
    else if (!(name in now)) changes.push(`removed ${name}`);
    else if (old[name] !== now[name]) changes.push(`${name} ${old[name]} -> ${now[name]}`);
  }
  if (nativeConfig(before.appJson) !== nativeConfig(after.appJson)) changes.push('app.json plugins or android/ios settings changed');
  return changes.sort();
};

module.exports = { nativeChanges, nativeConfig };
