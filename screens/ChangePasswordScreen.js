import React, { useState } from 'react';
import { Text, ScrollView, KeyboardAvoidingView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { reauthenticateWithCredential, updatePassword, EmailAuthProvider } from 'firebase/auth';
import { Auth } from '../firebase';
import { messageFor } from '../authErrors';
import { Button, ErrorBanner, Field, ScreenHeader } from '../components/ui';
import { colors, fonts, radius, space } from '../theme';

const ChangePasswordScreen = ({ navigation }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const save = async () => {
    if (!current || !next) return setError('Fill in your current and new password.');
    if (next.length < 6) return setError('Use at least 6 characters for your new password.');
    if (next !== confirm) return setError("The new passwords don't match.");
    if (next === current) return setError('Choose a password different from your current one.');

    setBusy(true);
    setError(null);
    try {
      const user = Auth.currentUser;
      // Firebase asks for the current password again before changing it.
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
      await updatePassword(user, next);
      setDone(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (e) {
      const wrongCurrent = ['auth/invalid-credential', 'auth/wrong-password'].includes(e?.code);
      setError(wrongCurrent ? 'Your current password is incorrect.' : messageFor(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Change password" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {done ? (
            <View style={styles.success}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              <Text style={styles.successText}>Password updated. Use your new password next time you log in.</Text>
            </View>
          ) : (
            <Text style={styles.text}>Enter your current password, then choose a new one with at least 6 characters.</Text>
          )}

          <Field id="current" label="Current password" icon="lock-closed-outline" secure value={current} onChangeText={setCurrent} placeholder="Your current password" autoCapitalize="none" autoComplete="current-password" textContentType="password" />
          <Field id="new" label="New password" icon="key-outline" secure value={next} onChangeText={setNext} placeholder="At least 6 characters" autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" />
          <Field id="confirm" label="Confirm new password" icon="key-outline" secure value={confirm} onChangeText={setConfirm} placeholder="Type it again" autoCapitalize="none" autoComplete="new-password" onSubmitEditing={save} returnKeyType="done" />

          <ErrorBanner message={error} />
          <Button title="Update password" icon="shield-checkmark-outline" onPress={save} loading={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space.xl, gap: space.lg },
  text: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.textSoft },
  success: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'flex-start',
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
  },
  successText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 20, color: colors.success },
});

export default ChangePasswordScreen;
