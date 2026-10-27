// For actions that need an account, such as saving to My List: runs the action when someone is
// signed in, otherwise opens the sign-in screen with a short reason. Browsing and watching never
// need an account.
import { useContext } from 'react';
import { useNavigation } from '@react-navigation/native';
import { myContext } from './context';

export const useRequireAccount = () => {
  const { signedIn } = useContext(myContext);
  const navigation = useNavigation();
  return (action, reason) => (signedIn ? action() : navigation.navigate('SignUpAndSignIn', { reason }));
};
