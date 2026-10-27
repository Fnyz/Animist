import React, { useContext, useState } from 'react';
import { Text, ScrollView, KeyboardAvoidingView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Auth } from '../firebase';
import { myContext } from '../context';
import { messageFor } from '../authErrors';
import { confirmIdentity, deleteAccount, signInMethod } from '../accountDeletion';
import { Button, ErrorBanner, Field, ScreenHeader } from '../components/ui';
import { colors, fonts, radius, space } from '../theme';

const WHAT_GOES = [
  ['bookmark-outline', 'My List'],
  ['time-outline', 'Watch history and where you left each episode'],
  ['chatbubble-outline', 'Your likes and comments'],
  ['notifications-outline', 'New-episode notifications on your phones'],
  ['person-outline', 'Your profile and the account itself'],
];

// Profile > Delete account. Explains what's removed, asks them to confirm it's them, then deletes.
const DeleteAccountScreen = ({ navigation }) => {
  const { authUser } = useContext(myContext);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const usesGoogle = signInMethod(authUser) === 'google';

  const remove = async () => {
    const user = Auth.currentUser;
    if (!user) return;
    if (!usesGoogle && !password) return setError('Enter your password to confirm.');
    setBusy(true);
    setError(null);
    try {
      if (!(await confirmIdentity(user, password))) return; // closed the Google account picker
      await deleteAccount(user);
      setDone(true);
    } catch (e) {
      const wrongPassword = ['auth/invalid-credential', 'auth/wrong-password'].includes(e?.code);
      setError(wrongPassword ? 'That password is incorrect.' : messageFor(e));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={[styles.body, { flex: 1, justifyContent: 'center' }]}>
          <View style={styles.doneIcon}>
            <Ionicons name="checkmark" size={30} color={colors.success} />
          </View>
          <Text style={styles.title}>Your account was deleted</Text>
          <Text style={styles.text}>Everything you stored in Animist is gone. You can keep browsing and watching without an account.</Text>
          <Button title="Back to Home" icon="home-outline" onPress={() => navigation.navigate('Main', { screen: 'Home' })} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Delete account" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.text}>
            This permanently deletes your Animist account{authUser?.email ? ` (${authUser.email})` : ''} and everything in it:
          </Text>
          <View style={styles.list}>
            {WHAT_GOES.map(([icon, label]) => (
              <View key={label} style={styles.item}>
                <Ionicons name={icon} size={18} color={colors.danger} />
                <Text style={styles.itemText}>{label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.text}>It can't be undone. You can create a new account later, but it will start empty.</Text>

          {usesGoogle ? (
            <Text style={styles.text}>To confirm it's you, pick your Google account again.</Text>
          ) : (
            <Field
              id="password"
              label="Password"
              icon="lock-closed-outline"
              secure
              value={password}
              onChangeText={setPassword}
              placeholder="Your password, to confirm"
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              onSubmitEditing={remove}
              returnKeyType="done"
            />
          )}

          <ErrorBanner message={error} />
          <Button
            title={usesGoogle ? 'Confirm with Google and delete' : 'Delete my account'}
            icon="trash-outline"
            onPress={remove}
            loading={busy}
            style={styles.danger}
          />
          <Button title="Keep my account" variant="ghost" onPress={() => navigation.goBack()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space.xl, gap: space.lg },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.text, textAlign: 'center' },
  text: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.textSoft },
  list: { gap: space.sm, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.dangerSoft },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  itemText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  danger: { backgroundColor: colors.danger },
  doneIcon: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successSoft,
  },
});

export default DeleteAccountScreen;
