import "./devLogger";
import { withSentry } from "./sentry";
import React, { useContext } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts, BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { GlobalProvider, myContext } from './context';
import { colors, fonts } from './theme';
import OfflineBanner from './components/OfflineBanner';
import UpdateNotice from './components/UpdateNotice';
import { CrashBoundary } from './components/CrashScreen';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import SearchScreen from './screens/SearchScreen';
import MyListScreen from './screens/MyListScreen';
import ProfileScreen from './screens/ProfileScreen';
import DetailsScreen from './screens/DetailsScreen';
import ListScreen from './screens/ListScreen';
import WatchScreen from './screens/WatchScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.tabBar,
    border: colors.line,
    primary: colors.accent,
    text: colors.text,
  },
};

const TAB_ICONS = {
  Home: ['home', 'home-outline'],
  Search: ['search', 'search-outline'],
  MyList: ['bookmark', 'bookmark-outline'],
  Profile: ['person', 'person-outline'],
};

const MainTabs = () => (
  <Tabs.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.muted,
      tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.line },
      tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 11 },
      tabBarIcon: ({ focused, color, size }) => (
        <Ionicons name={TAB_ICONS[route.name][focused ? 0 : 1]} size={size} color={color} />
      ),
    })}
  >
    <Tabs.Screen name="Home" component={HomeScreen} />
    <Tabs.Screen name="Search" component={SearchScreen} />
    <Tabs.Screen name="MyList" component={MyListScreen} options={{ title: 'My List' }} />
    <Tabs.Screen name="Profile" component={ProfileScreen} />
  </Tabs.Navigator>
);

const Splash = () => (
  <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
    <ActivityIndicator size="large" color={colors.accent} />
  </View>
);

// Everyone gets the app: browsing and watching need no account. Signing in (to keep a list,
// history and progress) is a screen people open when they need it, and it returns to where they were.
const RootNavigator = () => {
  const { authReady } = useContext(myContext);
  if (!authReady) return <Splash />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="AnimeDetail" component={DetailsScreen} />
      <Stack.Screen name="List" component={ListScreen} />
      <Stack.Screen name="View" component={WatchScreen} />
      <Stack.Screen name="Settings" component={EditProfileScreen} />
      <Stack.Screen name="UpdatePass" component={ChangePasswordScreen} />
      <Stack.Screen name="SignUpAndSignIn" component={AuthScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="ForgetPass" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
};

function App() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_800ExtraBold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  return (
    <SafeAreaProvider>
      <GlobalProvider>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        {fontsLoaded ? (
          <CrashBoundary>
            <NavigationContainer theme={navTheme}>
              <RootNavigator />
              <OfflineBanner />
              <UpdateNotice />
            </NavigationContainer>
          </CrashBoundary>
        ) : (
          <Splash />
        )}
      </GlobalProvider>
    </SafeAreaProvider>
  );
}

export default withSentry(App);
