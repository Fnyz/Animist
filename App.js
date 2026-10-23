import "./devLogger";
import React, { useContext } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import {
  useFonts, BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { GlobalProvider, myContext } from './context';
import { colors, fonts } from './theme';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import SearchScreen from './screens/SearchScreen';
import MyListScreen from './screens/MyListScreen';
import ProfileScreen from './screens/ProfileScreen';
import DetailsScreen from './screens/DetailsScreen';
import ListScreen from './screens/ListScreen';
import VideoPlayer from './components/WatchAnime';
import Settingss from './components/Settings';
import ResetPassword from './components/ResetPassword';
import UpdatePassword from './components/UpdatePassword';

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

// Shows the main app to signed-in users with a verified email, and the login screens to everyone else.
const RootNavigator = () => {
  const { authReady, authUser, verified } = useContext(myContext);
  if (!authReady) return <Splash />;
  const signedIn = authUser && verified;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      {signedIn ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="AnimeDetail" component={DetailsScreen} />
          <Stack.Screen name="List" component={ListScreen} />
          <Stack.Screen name="View" component={VideoPlayer} />
          <Stack.Screen name="Settings" component={Settingss} />
          <Stack.Screen name="UpdatePass" component={UpdatePassword} />
        </>
      ) : (
        <>
          <Stack.Screen name="SignUpAndSignIn" component={AuthScreen} />
          <Stack.Screen name="ForgetPass" component={ResetPassword} />
        </>
      )}
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
    <GlobalProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      {fontsLoaded ? (
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
        </NavigationContainer>
      ) : (
        <Splash />
      )}
      <Toast />
    </GlobalProvider>
  );
}

export default App;
