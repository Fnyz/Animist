import { checkOnline, isNetworkError } from '../connectivity';

describe('isNetworkError', () => {
  it.each([
    'net::ERR_INTERNET_DISCONNECTED',
    'net::ERR_NAME_NOT_RESOLVED',
    'net::ERR_CONNECTION_TIMED_OUT',
    'TypeError: Network request failed',
  ])('treats "%s" as offline', (text) => {
    expect(isNetworkError(text)).toBe(true);
  });

  it.each([
    'Video unavailable. The uploader has not made this video available in your country',
    'This video is private',
    null,
  ])('treats "%s" as a video problem', (text) => {
    expect(isNetworkError(text)).toBe(false);
  });
});

describe('checkOnline', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('is online when the check gets its empty reply', async () => {
    global.fetch = jest.fn().mockResolvedValue({ status: 204, ok: true });
    await expect(checkOnline()).resolves.toBe(true);
  });

  it('is offline when the request fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    await expect(checkOnline()).resolves.toBe(false);
  });

  it('is offline when the request takes too long', async () => {
    global.fetch = jest.fn((url, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))));
    await expect(checkOnline(20)).resolves.toBe(false);
  });

  it('shares one check between callers at the same time', async () => {
    global.fetch = jest.fn().mockResolvedValue({ status: 204, ok: true });
    await Promise.all([checkOnline(), checkOnline(), checkOnline()]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
