const { isTemporaryError } = require('../scripts/youtubeErrors');

describe('YouTube errors worth trying again', () => {
  it('are passing server errors', () => {
    expect(isTemporaryError(500, { message: 'Internal error encountered.', errors: [{ reason: 'backendError' }] })).toBe(true);
    expect(isTemporaryError(503, { message: 'The service is currently unavailable.' })).toBe(true);
    expect(isTemporaryError(200, { message: 'Internal error encountered.' })).toBe(true);
  });

  it('are not quota, key or missing-playlist errors', () => {
    expect(isTemporaryError(403, { message: 'The request cannot be completed because you have exceeded your quota.', errors: [{ reason: 'quotaExceeded' }] })).toBe(false);
    expect(isTemporaryError(400, { message: 'API key not valid. Please pass a valid API key.', errors: [{ reason: 'badRequest' }] })).toBe(false);
    expect(isTemporaryError(404, { message: 'The playlist identified with the request\'s playlistId parameter cannot be found.', errors: [{ reason: 'playlistNotFound' }] })).toBe(false);
  });
});
