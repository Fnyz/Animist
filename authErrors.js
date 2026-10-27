// Friendly text for Firebase errors, shared by the sign-in and password screens.
const ERROR_MESSAGES = {
  'auth/missing-email': 'Enter your email address.',
  'auth/requires-recent-login': 'For security, log out and log in again, then retry.',
  'auth/missing-password': 'Enter your password.',
  'auth/invalid-email': "That email address doesn't look right.",
  'auth/weak-password': 'Use at least 6 characters for your password.',
  'auth/email-already-in-use': 'This email already has an account. Log in instead.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/user-not-found': 'No account uses this email.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute, or reset your password.',
  'auth/network-request-failed': "You're offline. Check your connection and try again.",
  'permission-denied': 'The server refused the request. Try again later.',
  // Google sign-in (codes from the Google sign-in library)
  'auth/account-exists-with-different-credential': 'This email already has an account. Log in with your password instead.',
  PLAY_SERVICES_NOT_AVAILABLE: 'Google sign-in needs Google Play services on this phone. Use email instead.',
  IN_PROGRESS: 'Google sign-in is already open.',
  DEVELOPER_ERROR: "Google sign-in isn't set up for this version of the app. Use email for now.",
  10: "Google sign-in isn't set up for this version of the app. Use email for now.",
};

export const messageFor = (error) => {
  console.log('auth error', error?.code, error?.message);
  return ERROR_MESSAGES[error?.code] || `Something went wrong (${error?.code || 'unknown error'}).`;
};
