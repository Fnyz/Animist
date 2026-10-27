import { parseVersion, isNewer, isRequired, findNewerRelease } from '../appVersion';

describe('app versions', () => {
  it('reads tags and versions', () => {
    expect(parseVersion('v1.2.0')).toEqual([1, 2, 0]);
    expect(parseVersion('1.10.3')).toEqual([1, 10, 3]);
    expect(parseVersion('latest')).toBeNull();
    expect(parseVersion(null)).toBeNull();
  });

  it('compares numbers, not text', () => {
    expect(isNewer('v1.2.0', '1.1.0')).toBe(true);
    expect(isNewer('v1.10.0', '1.9.0')).toBe(true);
    expect(isNewer('v2.0.0', '1.99.99')).toBe(true);
    expect(isNewer('v1.1.0', '1.1.0')).toBe(false);
    expect(isNewer('v1.0.9', '1.1.0')).toBe(false);
    expect(isNewer('v1.2.0', null)).toBe(false);
  });
});

describe('isRequired', () => {
  it('finds the marker anywhere in the notes, in any case', () => {
    expect(isRequired('[required] Please update')).toBe(true);
    expect(isRequired('### Fixed\n- Playback after YouTube change [REQUIRED]')).toBe(true);
    expect(isRequired('Required reading: the new player')).toBe(false);
    expect(isRequired(null)).toBe(false);
  });
});

describe('findNewerRelease', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });
  const answer = (body, ok = true) => {
    global.fetch = jest.fn().mockResolvedValue({ ok, json: async () => body });
  };

  it('finds a newer release', async () => {
    answer({ tag_name: 'v1.2.0', html_url: 'https://github.com/Fnyz/Animist/releases/tag/v1.2.0', draft: false, prerelease: false, body: 'New stuff' });
    await expect(findNewerRelease('1.1.0')).resolves.toEqual({
      version: '1.2.0',
      notesUrl: 'https://github.com/Fnyz/Animist/releases/tag/v1.2.0',
      required: false,
    });
  });

  it('marks releases whose notes say [required]', async () => {
    answer({ tag_name: 'v1.3.0', html_url: 'u', draft: false, prerelease: false, body: '[required] YouTube changed its player.' });
    await expect(findNewerRelease('1.2.0')).resolves.toMatchObject({ version: '1.3.0', required: true });
  });

  it('stays quiet when up to date', async () => {
    answer({ tag_name: 'v1.2.0', draft: false, prerelease: false });
    await expect(findNewerRelease('1.2.0')).resolves.toBeNull();
  });

  it('ignores pre-releases', async () => {
    answer({ tag_name: 'v1.3.0', draft: false, prerelease: true });
    await expect(findNewerRelease('1.2.0')).resolves.toBeNull();
  });

  it('stays quiet when GitHub fails or the phone is offline', async () => {
    answer({ message: 'API rate limit exceeded' }, false);
    await expect(findNewerRelease('1.1.0')).resolves.toBeNull();
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    await expect(findNewerRelease('1.1.0')).resolves.toBeNull();
  });
});
