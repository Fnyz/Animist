jest.mock('../firebase', () => ({ Auth: {}, db: {} }));
const { usernameFrom, googleSignInAvailable } = require('../googleAuth');

describe('Google sign-in', () => {
  it('is hidden where the native part is missing (tests, Expo Go)', () => {
    expect(googleSignInAvailable).toBe(false);
  });

  it('makes usernames that fit the app rules', () => {
    expect(usernameFrom('jez.cruz@gmail.com', 'Jez Cruz')).toBe('jez.cruz');
    expect(usernameFrom('a@gmail.com', 'Jo')).toBe('a_fan');
    expect(usernameFrom('_x_@mail.com', 'Ana Maria')).toBe('x_fan');
    expect(usernameFrom('verylongemailaddressname123@gmail.com')).toBe('verylongemailaddress');
    expect(usernameFrom(null, 'Ñoño Pé')).toBe('oop'); // letters outside a-z are dropped
    expect(usernameFrom(null, null)).toBe('fan');
  });
});
