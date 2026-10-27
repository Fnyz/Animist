import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, KeyboardAvoidingView, StyleSheet, Linking, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, signOut,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Auth, db } from '../firebase';
import { myContext } from '../context';
import { getList } from '../api';
import { randomAvatar } from '../avatars';
import { messageFor } from '../authErrors';
import { googleSignInAvailable, signInWithGoogle } from '../googleAuth';
import { Button, Wordmark, Field, ErrorBanner, IconButton } from '../components/ui';
import { colors, fonts, radius, space } from '../theme';

// Three slowly offset rows of real posters behind the form.
const PosterWall = () => {
  const [posters, setPosters] = useState([]);
  const { width } = useWindowDimensions();

  useEffect(() => {
    getList('popular', 1, 18)
      .then((page) => setPosters(page.results.map((a) => a.image)))
      .catch(() => {});
  }, []);

  const size = width / 3.6;
  const rows = [0, 1, 2].map((r) => posters.slice(r * 6, r * 6 + 6));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.wall, { transform: [{ rotate: '-8deg' }, { scale: 1.25 }] }]}>
        {rows.map((row, r) => (
          <View key={r} style={[styles.wallRow, { marginLeft: r === 1 ? -size / 2 : 0 }]}>
            {row.map((uri) => (
              <Image key={uri} source={{ uri }} style={{ width: size, height: size * 1.45, borderRadius: radius.md }} contentFit="cover" />
            ))}
          </View>
        ))}
      </View>
      <LinearGradient
        colors={['rgba(14,15,20,0.35)', 'rgba(14,15,20,0.85)', colors.bg]}
        locations={[0, 0.45, 0.7]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
};

// Shown after sign-up, or when someone logs in before verifying their email.
const VerifyPanel = ({ email }) => {
  const { refreshUser } = useContext(myContext);
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return undefined;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const check = async () => {
    setChecking(true);
    setError(null);
    try {
      const ok = await refreshUser();
      if (!ok) setError("Your email isn't verified yet. Open the link in the email, then try again.");
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setChecking(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      await sendEmailVerification(Auth.currentUser);
      setNotice(`We sent a new link to ${email}.`);
      setCooldown(30);
    } catch (e) {
      setError(messageFor(e));
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.verifyIcon}>
        <Ionicons name="mail-unread-outline" size={30} color={colors.accent} />
      </View>
      <Text style={styles.cardTitle}>Check your inbox</Text>
      <Text style={styles.cardText}>
        We sent a verification link to <Text style={{ color: colors.text, fontFamily: fonts.bodyBold }}>{email}</Text>.
        Open it, then come back here. Check your spam folder if it isn’t there.
      </Text>
      <ErrorBanner message={error} />
      {notice && !error ? <Text style={[styles.cardText, { color: colors.success }]}>{notice}</Text> : null}
      <Button title="I've verified my email" icon="checkmark-circle" onPress={check} loading={checking} />
      <Button title="Open email app" icon="mail-outline" variant="ghost" onPress={() => Linking.openURL('mailto:').catch(() => {})} />
      <View style={styles.verifyLinks}>
        <Pressable onPress={resend} disabled={cooldown > 0} hitSlop={8}>
          <Text style={[styles.link, cooldown > 0 && { color: colors.muted }]}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
          </Text>
        </Pressable>
        <Pressable onPress={() => signOut(Auth)} hitSlop={8}>
          <Text style={styles.linkMuted}>Use another account</Text>
        </Pressable>
      </View>
    </View>
  );
};

// route.params: { reason } – why it opened, e.g. "Sign in to save anime to My List."
const AuthScreen = ({ navigation, route }) => {
  const { authUser, verified, signedIn } = useContext(myContext);
  const reason = route.params?.reason;
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ firstName: '', lastName: '', username: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const switchMode = (next) => {
    setMode(next);
    setError(null);
  };

  const validate = () => {
    const email = form.email.trim();
    if (!email || !form.password) return 'Enter your email and password.';
    if (isRegister) {
      if (!form.firstName.trim() || !form.lastName.trim()) return 'Enter your first and last name.';
      if (!/^[a-zA-Z0-9_.]{3,20}$/.test(form.username.trim())) {
        return 'Usernames are 3–20 letters, numbers, dots or underscores.';
      }
      if (form.password.length < 6) return 'Use at least 6 characters for your password.';
    }
    return null;
  };

  const submit = async () => {
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError(null);
    const email = form.email.trim();
    try {
      if (isRegister) {
        const { user } = await createUserWithEmailAndPassword(Auth, email, form.password);
        await setDoc(doc(db, 'users', user.uid), {
          firstname: form.firstName.trim(),
          lastname: form.lastName.trim(),
          username: form.username.trim(),
          userId: user.uid,
          image: randomAvatar(),
          registered: false,
          isSignUpTime: Date.now(),
          score: 1,
        });
        await sendEmailVerification(user);
      } else {
        const { user } = await signInWithEmailAndPassword(Auth, email, form.password);
        // merge: also creates the profile if it was never saved.
        await setDoc(doc(db, 'users', user.uid), { userId: user.uid, score: 1 }, { merge: true });
      }
      setForm((f) => ({ ...f, password: '' }));
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setBusy(false);
    }
  };

  const needsVerification = authUser && !verified;

  const [googleBusy, setGoogleBusy] = useState(false);
  const continueWithGoogle = async () => {
    setGoogleBusy(true);
    setError(null);
    try {
      await signInWithGoogle(); // Google accounts are verified, so this signs straight in.
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setGoogleBusy(false);
    }
  };

  // Signed in (and verified): back to where they came from.
  useEffect(() => {
    if (!signedIn) return;
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Main');
  }, [signedIn, navigation]);

  return (
    <View style={styles.screen}>
      <PosterWall />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {navigation.canGoBack() && (
              <IconButton icon="close" label="Close" onPress={() => navigation.goBack()} style={styles.close} />
            )}
            <View style={styles.brand}>
              <Wordmark size={52} />
              <Text style={styles.tagline}>{reason ?? 'Keep your list, your history and every episode where you left it.'}</Text>
            </View>

            {needsVerification ? (
              <VerifyPanel email={authUser.email} />
            ) : (
              <View style={styles.card}>
                <View style={styles.segment} accessibilityRole="tablist">
                  {[['login', 'Log in'], ['register', 'Create account']].map(([key, label]) => (
                    <Pressable
                      key={key}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: mode === key }}
                      onPress={() => switchMode(key)}
                      style={[styles.segmentItem, mode === key && styles.segmentActive]}
                    >
                      <Text style={[styles.segmentText, mode === key && { color: colors.onAccent }]}>{label}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.cardTitle}>{isRegister ? 'Join Animist' : 'Welcome back'}</Text>

                {googleSignInAvailable && (
                  <>
                    <Button title="Continue with Google" icon="logo-google" variant="ghost" onPress={continueWithGoogle} loading={googleBusy} />
                    <View style={styles.divider}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>or with email</Text>
                      <View style={styles.dividerLine} />
                    </View>
                  </>
                )}

                {isRegister && (
                  <>
                    <View style={{ flexDirection: 'row', gap: space.md }}>
                      <View style={{ flex: 1 }}>
                        <Field id="first" label="First name" icon="person-outline" value={form.firstName} onChangeText={set('firstName')} placeholder="Jez" autoComplete="given-name" textContentType="givenName" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Field id="last" label="Last name" icon="person-outline" value={form.lastName} onChangeText={set('lastName')} placeholder="Cruz" autoComplete="family-name" textContentType="familyName" />
                      </View>
                    </View>
                    <Field id="username" label="Username" icon="at-outline" value={form.username} onChangeText={set('username')} placeholder="otaku_jez" autoCapitalize="none" autoCorrect={false} autoComplete="username-new" />
                  </>
                )}
                <Field id="email" label="Email" icon="mail-outline" value={form.email} onChangeText={set('email')} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" />
                <Field
                  id="password"
                  label="Password"
                  icon="lock-closed-outline"
                  secure
                  value={form.password}
                  onChangeText={set('password')}
                  placeholder={isRegister ? 'At least 6 characters' : 'Your password'}
                  autoCapitalize="none"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  textContentType={isRegister ? 'newPassword' : 'password'}
                  onSubmitEditing={submit}
                  returnKeyType="go"
                />

                {!isRegister && (
                  <Pressable onPress={() => navigation.navigate('ForgetPass')} style={{ alignSelf: 'flex-end' }} hitSlop={8}>
                    <Text style={styles.link}>Forgot password?</Text>
                  </Pressable>
                )}

                <ErrorBanner message={error} />

                <Button
                  title={isRegister ? 'Create account' : 'Log in'}
                  icon={isRegister ? 'sparkles' : 'log-in-outline'}
                  onPress={submit}
                  loading={busy}
                />

                <Text style={styles.switchText}>
                  {isRegister ? 'Already have an account? ' : 'New to Animist? '}
                  <Text style={styles.link} onPress={() => switchMode(isRegister ? 'login' : 'register')}>
                    {isRegister ? 'Log in' : 'Create an account'}
                  </Text>
                </Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  wall: { position: 'absolute', top: -40, left: -30, right: -30, gap: space.md },
  wallRow: { flexDirection: 'row', gap: space.md },
  scroll: { flexGrow: 1, justifyContent: 'flex-end', padding: space.xl, gap: space.xl },
  brand: { gap: space.sm },
  close: { position: 'absolute', top: space.md, right: space.xl, zIndex: 1 },
  tagline: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.textSoft, lineHeight: 23, maxWidth: 320 },
  card: {
    backgroundColor: 'rgba(24,26,34,0.96)',
    borderRadius: radius.lg + 4,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.xl,
    gap: space.lg,
  },
  cardTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.text },
  cardText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSoft, lineHeight: 21 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: radius.md + 2,
    padding: 4,
    gap: 4,
  },
  segmentItem: { flex: 1, height: 40, borderRadius: radius.md - 2, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.accent },
  segmentText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.muted },
  link: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.accent },
  linkMuted: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.muted },
  divider: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
  dividerText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  switchText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center' },
  verifyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,122,89,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyLinks: { flexDirection: 'row', justifyContent: 'space-between' },
});

export default AuthScreen;
