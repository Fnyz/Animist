import { DEFAULT_AVATARS, avatarFor, randomAvatar } from '../avatars';
import { messageFor } from '../authErrors';

describe('avatars', () => {
  it('has five https avatars', () => {
    expect(DEFAULT_AVATARS).toHaveLength(5);
    for (const url of DEFAULT_AVATARS) expect(url).toMatch(/^https:\/\/api\.dicebear\.com\//);
  });

  it('gives the same user the same avatar every time', () => {
    expect(avatarFor('user-123')).toBe(avatarFor('user-123'));
  });

  it('spreads different users across the avatars', () => {
    const used = new Set(Array.from({ length: 50 }, (_, i) => avatarFor(`user-${i}`)));
    expect(used.size).toBeGreaterThan(1);
  });

  it('always picks one of the avatars', () => {
    expect(DEFAULT_AVATARS).toContain(randomAvatar());
    expect(DEFAULT_AVATARS).toContain(avatarFor(undefined));
  });
});

describe('messageFor', () => {
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('explains known Firebase errors', () => {
    expect(messageFor({ code: 'auth/invalid-credential' })).toBe('Email or password is incorrect.');
    expect(messageFor({ code: 'auth/network-request-failed' })).toMatch(/offline/);
  });

  it('includes the code for unknown errors', () => {
    expect(messageFor({ code: 'auth/something-new' })).toMatch(/auth\/something-new/);
    expect(messageFor(undefined)).toMatch(/unknown error/);
  });
});
