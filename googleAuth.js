// "Continue with Google": the Android account picker, signed in to the same Firebase accounts as
// email and password, so My List, history and progress work the same way.
// The native part only exists in APKs from 1.3.0 on; in Expo Go and older APKs the button is hidden.
import { TurboModuleRegistry } from 'react-native';
import Constants from 'expo-constants';
import { GoogleAuthProvider, reauthenticateWithCredential, signInWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Auth, db } from './firebase';
import { randomAvatar } from './avatars';

// The "Web client" OAuth ID from Firebase (Authentication > Google, or google-services.json).
// Public by design: it only names the app to Google.
const WEB_CLIENT_ID = Constants.expoConfig?.extra?.googleWebClientId;

const nativeModule = TurboModuleRegistry.get('RNGoogleSignin');
export const googleSignInAvailable = Boolean(nativeModule && WEB_CLIENT_ID);

// Loaded only when the native part exists: importing it without one stops the app.
const library = () => require('@react-native-google-signin/google-signin');

let configured = false;
const configure = () => {
  if (configured) return;
  library().GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  configured = true;
};

// A username for a new Google account, in the app's rules (3-20 letters, numbers, dots or
// underscores): the email's name part, else the person's name, else "fan".
export const usernameFrom = (email, name) => {
  const clean = (text) => String(text ?? '').toLowerCase().replace(/[^a-z0-9_.]+/g, '').replace(/^[._]+|[._]+$/g, '');
  const base = clean(String(email ?? '').split('@')[0]) || clean(name) || 'fan';
  return (base.length >= 3 ? base : `${base}_fan`).slice(0, 20);
};

// Signs in with Google. Resolves to the Firebase user, or null when the person closed the picker.
export const signInWithGoogle = async () => {
  const { GoogleSignin, isSuccessResponse } = library();
  configure();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return null;

  const { idToken, user: google } = response.data;
  const { user } = await signInWithCredential(Auth, GoogleAuthProvider.credential(idToken));

  // First time: the same profile an email sign-up creates. Later: keep what they've edited.
  const profile = doc(db, 'users', user.uid);
  if (!(await getDoc(profile)).exists()) {
    await setDoc(profile, {
      firstname: google.givenName ?? '',
      lastname: google.familyName ?? '',
      username: usernameFrom(google.email, google.name),
      userId: user.uid,
      image: randomAvatar(),
      registered: true,
      isSignUpTime: Date.now(),
      score: 1,
    });
  } else {
    await setDoc(profile, { userId: user.uid, score: 1 }, { merge: true });
  }
  return user;
};

// Confirms it's really them before something sensitive (deleting the account): they pick their
// Google account again. Resolves to true, or false when they closed the picker.
export const reauthenticateWithGoogle = async (user) => {
  const { GoogleSignin, isSuccessResponse } = library();
  configure();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return false;
  await reauthenticateWithCredential(user, GoogleAuthProvider.credential(response.data.idToken));
  return true;
};

// Forgets the Google account on this phone too, so the next sign-in shows the account picker.
export const signOutGoogle = async () => {
  if (!nativeModule) return;
  try {
    await library().GoogleSignin.signOut();
  } catch {
    // Not signed in with Google; nothing to forget.
  }
};
