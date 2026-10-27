// Deleting an account from inside the app (also required for apps on Google Play): everything the
// person stored is removed, then the account itself. Firebase only allows it right after they've
// confirmed who they are (their password, or picking their Google account again).
import { EmailAuthProvider, deleteUser, reauthenticateWithCredential, signOut } from 'firebase/auth';
import { collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Auth, db } from './firebase';
import { reauthenticateWithGoogle, signOutGoogle } from './googleAuth';

// Every collection that keeps a person's data, by its `userId` field (see firestore.rules).
export const USER_COLLECTIONS = ['watchList', 'history', 'likes', 'comments', 'pushTokens', 'users'];

// How someone signs in: 'google' or 'password' (email and password).
export const signInMethod = (user) =>
  user?.providerData?.some((p) => p.providerId === 'google.com') ? 'google' : 'password';

// Step 1: confirm it's them. Resolves to false if they closed the Google account picker.
export const confirmIdentity = async (user, password) => {
  if (signInMethod(user) === 'google') return reauthenticateWithGoogle(user);
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  return true;
};

// Removes all documents of the person (Firestore allows 500 changes per batch).
const deleteUserData = async (uid) => {
  let deleted = 0;
  for (const name of USER_COLLECTIONS) {
    const snap = await getDocs(query(collection(db, name), where('userId', '==', uid)));
    for (let i = 0; i < snap.docs.length; i += 500) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + 500).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    deleted += snap.size;
  }
  return deleted;
};

// Step 2 (after confirmIdentity): the data first, while still signed in (the rules need it), then
// the account. Also forgets the Google account and the saved profile on this phone.
export const deleteAccount = async (user) => {
  await deleteUserData(user.uid);
  await deleteUser(user);
  await signOutGoogle();
  await AsyncStorage.removeItem('profile').catch(() => {});
  // deleteUser signs out too; this makes sure the app switches to guest mode either way.
  await signOut(Auth).catch(() => {});
};
