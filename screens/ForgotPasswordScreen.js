import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Auth } from '../firebase';
import { messageFor } from '../authErrors';
import { Button, ErrorBanner, Field, ScreenHeader } from '../components/ui';
import { colors, fonts, space } from '../theme';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [sentTo, setSentTo] = useState(null);

  const send = async () => {
    const address = email.trim();
    if (!address) {
      setError('Enter the email you signed up with.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sendPasswordResetEmail(Auth, address);
      setSentTo(address);
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Reset password" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.icon}>
            <Ionicons name={sentTo ? 'mail-open-outline' : 'key-outline'} size={30} color={colors.accent} />
          </View>

          {sentTo ? (
            <>
              <Text style={styles.title}>Check your email</Text>
              <Text style={styles.text}>
                We sent a password reset link to <Text style={styles.strong}>{sentTo}</Text>. Open it to choose a new
                password, then log in. Check your spam folder if it isn’t there.
              </Text>
              <Button title="Open email app" icon="mail-outline" onPress={() => Linking.openURL('mailto:').catch(() => {})} />
              <Button title="Back to log in" variant="ghost" onPress={() => navigation.goBack()} />
              <Text style={styles.resend} onPress={() => setSentTo(null)}>Use a different email</Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>Forgot your password?</Text>
              <Text style={styles.text}>Enter the email you signed up with and we’ll send you a link to reset it.</Text>
              <Field
                id="reset-email"
                label="Email"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                onSubmitEditing={send}
                returnKeyType="send"
              />
              <ErrorBanner message={error} />
              <Button title="Send reset link" icon="paper-plane-outline" onPress={send} loading={busy} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space.xl, gap: space.lg },
  icon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,122,89,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  text: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.textSoft },
  strong: { fontFamily: fonts.bodyBold, color: colors.text },
  resend: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.accent, textAlign: 'center', padding: space.sm },
});

export default ForgotPasswordScreen;
