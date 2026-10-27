// New-episode notifications: "Jujutsu Kaisen: Episode 9 is free in Animist", for anime on the
// person's My List. The phone's Expo push token is saved in Firestore (pushTokens/{token}); the
// update workflow sends the notifications when it publishes new episodes
// (scripts/notify-new-episodes.js).
// The native part only exists in APKs from 1.3.0 on, not in Expo Go or older APKs.
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// expo-notifications loads all of these as soon as it's imported, and stops the app if one is
// missing (Expo Go has only some of them), so every one must be there.
const NATIVE_MODULES = [
  'ExpoBackgroundNotificationTasksModule', 'ExpoBadgeModule', 'ExpoNotificationCategoriesModule',
  'ExpoNotificationChannelGroupManager', 'ExpoNotificationChannelManager', 'ExpoNotificationPermissionsModule',
  'ExpoNotificationPresenter', 'ExpoNotificationScheduler', 'ExpoNotificationsEmitter',
  'ExpoNotificationsHandlerModule', 'ExpoPushTokenManager', 'ExpoTopicSubscriptionModule',
  'NotificationsServerRegistrationModule',
];

export const notificationsAvailable =
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
  NATIVE_MODULES.every((name) => Boolean(requireOptionalNativeModule(name)));

// Loaded only when the native part exists: importing it without one stops the app.
const Notifications = notificationsAvailable ? require('expo-notifications') : null;

export const CHANNEL_ID = 'new-episodes';
const ASKED_KEY = 'animist.notificationsAsked';
const projectId = Constants.expoConfig?.extra?.eas?.projectId;

if (Notifications) {
  // Shown even while the app is open.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

const pushToken = async () => (await Notifications.getExpoPushTokenAsync({ projectId })).data;

const saveToken = async (userId) => {
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'New episodes',
    description: 'When an anime on your list gets a new free episode',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  const token = await pushToken();
  await setDoc(doc(db, 'pushTokens', token), { userId, token, platform: Platform.OS, updatedAt: serverTimestamp() });
  return token;
};

// Asks once, at the moment it makes sense (after adding an anime to My List). A "Don't allow" is
// respected: no more asking; it can be turned on later in Android's settings.
export const offerEpisodeNotifications = async (userId) => {
  if (!Notifications || !userId) return null;
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      if (await AsyncStorage.getItem(ASKED_KEY)) return null;
      await AsyncStorage.setItem(ASKED_KEY, '1');
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    return status === 'granted' ? await saveToken(userId) : null;
  } catch (e) {
    console.warn('notifications setup failed', e);
    return null;
  }
};

// On app start: keeps the saved token current when notifications are already allowed. Never asks.
export const refreshEpisodeNotifications = async (userId) => {
  if (!Notifications || !userId) return;
  try {
    if ((await Notifications.getPermissionsAsync()).status === 'granted') await saveToken(userId);
  } catch (e) {
    console.warn('notifications refresh failed', e);
  }
};

// Before signing out: this phone stops getting the account's notifications.
export const stopEpisodeNotifications = async () => {
  if (!Notifications) return;
  try {
    await deleteDoc(doc(db, 'pushTokens', await pushToken()));
  } catch {
    // No token was saved; nothing to remove.
  }
};

// Calls onOpen(animeId) when someone taps a notification, including the one that opened the app.
export const onNotificationOpened = (onOpen) => {
  if (!Notifications) return () => {};
  const open = (response) => {
    const animeId = response?.notification?.request?.content?.data?.animeId;
    if (animeId) onOpen(animeId);
  };
  open(Notifications.getLastNotificationResponse());
  Notifications.clearLastNotificationResponse();
  const sub = Notifications.addNotificationResponseReceivedListener(open);
  return () => sub.remove();
};
