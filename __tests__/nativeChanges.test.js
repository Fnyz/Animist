const { nativeChanges } = require('../scripts/nativeChanges');

const NATIVE = new Set(['expo-screen-orientation', '@sentry/react-native', 'react-native-webview']);
const isNative = (name) => NATIVE.has(name);
const app = (plugins = ['expo-image']) => ({ expo: { version: '1.1.0', plugins, android: { package: 'com.fnyz.animist' } } });
const pkg = (dependencies) => ({ dependencies });

describe('nativeChanges', () => {
  const before = { packageJson: pkg({ 'react-native-webview': '14.0.1', lodash: '4.17.21' }), appJson: app() };

  it('allows JavaScript-only changes', () => {
    const after = { packageJson: pkg({ 'react-native-webview': '14.0.1', lodash: '4.17.22', dayjs: '1.11.0' }), appJson: app() };
    expect(nativeChanges(before, after, isNative)).toEqual([]);
  });

  it('catches the change that broke v1.1.0 phones', () => {
    const after = {
      packageJson: pkg({ 'react-native-webview': '14.0.1', lodash: '4.17.21', 'expo-screen-orientation': '~58.0.3', '@sentry/react-native': '~8.28.0' }),
      appJson: app(['expo-image', ['@sentry/react-native', { disableAutoUpload: true }]]),
    };
    expect(nativeChanges(before, after, isNative)).toEqual([
      'added @sentry/react-native',
      'added expo-screen-orientation',
      'app.json plugins or android/ios settings changed',
    ]);
  });

  it('catches upgraded or removed native packages', () => {
    const after = { packageJson: pkg({ lodash: '4.17.21' }), appJson: app() };
    expect(nativeChanges(before, after, isNative)).toEqual(['removed react-native-webview']);
    const upgraded = { packageJson: pkg({ 'react-native-webview': '14.1.0', lodash: '4.17.21' }), appJson: app() };
    expect(nativeChanges(before, upgraded, isNative)).toEqual(['react-native-webview 14.0.1 -> 14.1.0']);
  });

  it('ignores the version number itself', () => {
    const after = { packageJson: before.packageJson, appJson: { expo: { ...app().expo, version: '1.2.0' } } };
    expect(nativeChanges(before, after, isNative)).toEqual([]);
  });
});
