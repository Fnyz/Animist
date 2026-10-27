import { useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { myContext } from '../context';
import { navigateWhenReady } from '../navigationRef';
import { onNotificationOpened, refreshEpisodeNotifications } from '../notifications';

// The anime a notification asked to open, kept across the restart that loads new episodes.
const PENDING_KEY = 'animist.openAfterUpdate';

const openAnime = (animeId) => navigateWhenReady('AnimeDetail', { animeId });

// Tapping "Episode 9 is free in Animist": new episodes travel as an over-the-air update, so the
// newest one is loaded first (a quick restart), then the anime opens with the episode in it.
const openFromNotification = async (animeId) => {
  if (!__DEV__ && Updates.isEnabled) {
    try {
      const { isAvailable } = await Updates.checkForUpdateAsync();
      if (isAvailable) {
        await AsyncStorage.setItem(PENDING_KEY, String(animeId));
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
        return;
      }
    } catch {
      // Offline or no update server: open what the app has.
    }
  }
  openAnime(animeId);
};

// No screen of its own: keeps notifications working while the app runs.
const NotificationBridge = () => {
  const { signedIn, userData } = useContext(myContext);

  // After the restart for a notification, open the anime it was about.
  useEffect(() => {
    AsyncStorage.getItem(PENDING_KEY)
      .then((animeId) => {
        if (!animeId) return;
        AsyncStorage.removeItem(PENDING_KEY).catch(() => {});
        openAnime(animeId);
      })
      .catch(() => {});
    return onNotificationOpened(openFromNotification);
  }, []);

  // Signed in: keep this phone's notification address current (never asks for permission).
  useEffect(() => {
    if (signedIn && userData?.id) refreshEpisodeNotifications(userData.id);
  }, [signedIn, userData?.id]);

  return null;
};

export default NotificationBridge;
