jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { clipsAllowed, modeFromStored } from '../heroClips';

describe('trailer clips setting', () => {
  it('defaults to Wi-Fi only, and keeps the old on/off choice', () => {
    expect(modeFromStored(null)).toBe('wifi');
    expect(modeFromStored('nonsense')).toBe('wifi');
    expect(modeFromStored('on')).toBe('always');
    expect(modeFromStored('off')).toBe('off');
    expect(modeFromStored('always')).toBe('always');
  });

  it('plays on Wi-Fi only when set so, and never on a metered hotspot', () => {
    expect(clipsAllowed('wifi', { type: 'wifi', expensive: false })).toBe(true);
    expect(clipsAllowed('wifi', { type: 'ethernet', expensive: false })).toBe(true);
    expect(clipsAllowed('wifi', { type: 'cellular', expensive: true })).toBe(false);
    expect(clipsAllowed('wifi', { type: 'wifi', expensive: true })).toBe(false);
    expect(clipsAllowed('wifi', null)).toBe(false);
  });

  it('always or never, whatever the connection', () => {
    expect(clipsAllowed('always', { type: 'cellular', expensive: true })).toBe(true);
    expect(clipsAllowed('always', null)).toBe(true);
    expect(clipsAllowed('off', { type: 'wifi', expensive: false })).toBe(false);
  });
});
