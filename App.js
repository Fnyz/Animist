import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GenresDetails from './components/GenresDetails';
import HomePage from './components/HomePage';
import DetailsPage from './components/DetailsPage';
import Episode from './components/Episode';
import SearchAnime from './components/SearchAnime';
import Genres from './components/Genres';
import VideoPlayer from './components/WatchAnime';
import LoginAndSignUp from './components/LoginAndSignUp';
import ViewAllList from './components/ViewAllList';
import { GlobalProvider } from './context';
import HistoryPage from './components/HistoryPage';
import WatchListHistory from './components/WatchListHistory';
import Settingss from './components/Settings';
import NewReleaseAnime from './components/NewRelease';
import Toast from 'react-native-toast-message';
import ResetPassword from './components/ResetPassword';
import UpdatePassword from './components/UpdatePassword';

const Stack = createNativeStackNavigator();

function App() {
  return (
      <GlobalProvider>
    <NavigationContainer>
      <Stack.Navigator  screenOptions={{
      headerShown: false, gestureEnabled: false,
    }}>
       <Stack.Screen name="SignUpAndSignIn" component={LoginAndSignUp} />
        <Stack.Screen name="Home" component={HomePage} />
        <Stack.Screen name="Genres" component={Genres} />
        <Stack.Screen name="GenresDetails" component={GenresDetails} />
        <Stack.Screen name="AnimeDetail" component={DetailsPage} />
        <Stack.Screen name="Episodes" component={Episode} />
        <Stack.Screen name="Search" component={SearchAnime} />
        <Stack.Screen name="View" component={VideoPlayer} />
        <Stack.Screen name="Movies" component={ViewAllList} />
        <Stack.Screen name="History" component={HistoryPage} />
        <Stack.Screen name="WatchList" component={WatchListHistory} />
        <Stack.Screen name="Settings" component={Settingss} />
        <Stack.Screen name="ReleaseAnime" component={NewReleaseAnime} />
        <Stack.Screen name="ForgetPass" component={ResetPassword} />
        <Stack.Screen name="UpdatePass" component={UpdatePassword} />
      </Stack.Navigator>
    </NavigationContainer>
       <Toast />
      </GlobalProvider>

  );
}

export default App;

