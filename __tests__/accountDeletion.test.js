// The database and sign-in are simulated: these tests check what gets deleted and in which order.
const calls = [];
const stored = {
  watchList: ['w1', 'w2'],
  history: ['h1'],
  likes: [],
  comments: ['c1'],
  pushTokens: ['t1'],
  users: ['u1'],
};

jest.mock('../firebase', () => ({ Auth: {}, db: {} }));
jest.mock('@react-native-async-storage/async-storage', () => ({ removeItem: jest.fn(() => Promise.resolve()) }));
jest.mock('../googleAuth', () => ({
  reauthenticateWithGoogle: jest.fn(async () => true),
  signOutGoogle: jest.fn(async () => {}),
}));
jest.mock('firebase/firestore', () => ({
  collection: (_db, name) => name,
  where: (field, op, value) => ({ field, op, value }),
  query: (name, filter) => ({ name, filter }),
  getDocs: async ({ name, filter }) => {
    calls.push(`read ${name} where ${filter.field}==${filter.value}`);
    const docs = stored[name].map((id) => ({ ref: `${name}/${id}` }));
    return { docs, size: docs.length };
  },
  writeBatch: () => {
    const refs = [];
    return { delete: (ref) => refs.push(ref), commit: async () => calls.push(`delete ${refs.join(',')}`) };
  },
}));
jest.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: (email, password) => ({ email, password }) },
  reauthenticateWithCredential: jest.fn(async (_user, credential) => {
    if (credential.password !== 'right') {
      const error = new Error('wrong');
      error.code = 'auth/invalid-credential';
      throw error;
    }
  }),
  deleteUser: jest.fn(async () => calls.push('delete account')),
  signOut: jest.fn(async () => {}),
}));

const { USER_COLLECTIONS, signInMethod, confirmIdentity, deleteAccount } = require('../accountDeletion');
const { reauthenticateWithGoogle } = require('../googleAuth');

const emailUser = { uid: 'me', email: 'me@mail.com', providerData: [{ providerId: 'password' }] };
const googleUser = { uid: 'me', email: 'me@gmail.com', providerData: [{ providerId: 'google.com' }] };

beforeEach(() => {
  calls.length = 0;
});

describe('account deletion', () => {
  it('knows how someone signs in', () => {
    expect(signInMethod(emailUser)).toBe('password');
    expect(signInMethod(googleUser)).toBe('google');
    expect(signInMethod(null)).toBe('password');
  });

  it('confirms email users with their password', async () => {
    await expect(confirmIdentity(emailUser, 'right')).resolves.toBe(true);
    await expect(confirmIdentity(emailUser, 'wrong')).rejects.toMatchObject({ code: 'auth/invalid-credential' });
  });

  it('confirms Google users by picking their account again', async () => {
    await expect(confirmIdentity(googleUser)).resolves.toBe(true);
    expect(reauthenticateWithGoogle).toHaveBeenCalledWith(googleUser);
  });

  it('deletes data in every collection, only the person’s own, then the account', async () => {
    await deleteAccount(emailUser);
    const reads = calls.filter((c) => c.startsWith('read'));
    expect(reads).toEqual(USER_COLLECTIONS.map((name) => `read ${name} where userId==me`));
    expect(calls).toContain('delete watchList/w1,watchList/w2');
    expect(calls).toContain('delete pushTokens/t1');
    expect(calls).toContain('delete users/u1');
    expect(calls[calls.length - 1]).toBe('delete account'); // data first, while still signed in
  });

  it('covers every collection the database rules know about', () => {
    const rules = require('fs').readFileSync(require('path').join(__dirname, '..', 'firestore.rules'), 'utf8');
    const collections = [...rules.matchAll(/match \/(\w+)\/\{/g)].map((m) => m[1]).filter((name) => name !== 'databases');
    expect([...collections].sort()).toEqual([...USER_COLLECTIONS].sort());
  });
});
