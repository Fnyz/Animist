// Crash and error reporting with Sentry (sentry.io, free tier). Errors from people's phones show up
// in the Sentry dashboard with the screen, device and app version.
// Only on in installed builds with EXPO_PUBLIC_SENTRY_DSN set (.env locally, the SENTRY_DSN
// repository variable in GitHub Actions); off in development and wherever no DSN is set.
import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const sentryEnabled = Boolean(dsn) && !__DEV__;

if (sentryEnabled) {
  Sentry.init({
    dsn,
    // No personal data (IP addresses, emails) and no performance tracing: errors only.
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
  // Which over-the-air update was running, since many updates share one app version.
  if (Updates.updateId) Sentry.setTag('update_id', Updates.updateId);
  Sentry.setTag('update_channel', Updates.channel ?? 'none');
}

// Wraps the root component so Sentry catches crashes anywhere in the app.
export const withSentry = (App) => (sentryEnabled ? Sentry.wrap(App) : App);

export { Sentry };
