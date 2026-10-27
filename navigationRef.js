// Lets code outside the screens (notification taps) open a screen.
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

// The navigator mounts after sign-in state has loaded, so wait for it (up to `timeoutMs`).
export const navigateWhenReady = (name, params, timeoutMs = 15000) => {
  const started = Date.now();
  const attempt = () => {
    if (navigationRef.isReady()) navigationRef.navigate(name, params);
    else if (Date.now() - started < timeoutMs) setTimeout(attempt, 200);
  };
  attempt();
};
