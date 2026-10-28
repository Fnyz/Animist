import React, { useContext, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import Constants from 'expo-constants';
import { Auth } from '../firebase';
import { signOutGoogle } from '../googleAuth';
import { stopEpisodeNotifications } from '../notifications';
import { signInMethod } from '../accountDeletion';
import { myContext } from '../context';
import { Button, Chip } from '../components/ui';
import { CLIP_MODES, useHeroClips } from '../heroClips';
import { animeGenres } from '../api';
import { computeStats } from '../stats';
import { avatarFor, AVATAR_CREDIT } from '../avatars';
import { colors, fonts, radius, space } from '../theme';

const Row = ({ icon, label, detail, onPress, danger }) => (
  <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
    <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
      <Ionicons name={icon} size={19} color={danger ? colors.danger : colors.accent} />
    </View>
    <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
    {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
    {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
  </Pressable>
);

// A setting with a few choices, shown as chips under its label.
const ChoiceRow = ({ icon, label, detail, options, value, onChange }) => (
  <View style={[styles.row, { alignItems: 'flex-start' }]}>
    <View style={styles.rowIcon}>
      <Ionicons name={icon} size={19} color={colors.accent} />
    </View>
    <View style={{ flex: 1, gap: space.sm }}>
      <View style={{ gap: 2 }}>
        <Text style={[styles.rowLabel, { flex: 0 }]}>{label}</Text>
        {detail ? <Text style={styles.switchDetail}>{detail}</Text> : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o) => (
          <Chip key={o.key} label={o.label} active={value === o.key} onPress={() => onChange(o.key)} />
        ))}
      </View>
    </View>
  </View>
);

const ProfileScreen = ({ navigation }) => {
  const { profile, userWatchList, historyRecords, authUser, signedIn } = useContext(myContext);
  const [signingOut, setSigningOut] = useState(false);
  const [clips, setClips] = useHeroClips();
  const me = profile?.[0]?.data ?? {};
  const fullName = [me.firstname, me.lastname].filter(Boolean).join(' ') || 'Anime fan';
  const stats = computeStats(historyRecords ?? [], userWatchList, animeGenres);

  const logOut = async () => {
    setSigningOut(true);
    try {
      // While still signed in: this phone stops getting the account's notifications.
      await stopEpisodeNotifications();
      await signOutGoogle();
      await signOut(Auth);
    } catch (e) {
      console.warn('sign out failed', e);
      setSigningOut(false);
    }
  };

  const appInfo = (
    <View style={styles.group}>
      <ChoiceRow
        icon="film-outline"
        label="Trailer clips on Home"
        detail="Muted trailers in the top banners. Wi-Fi only saves your mobile data."
        options={CLIP_MODES}
        value={clips}
        onChange={setClips}
      />
      <Row icon="server-outline" label="Anime data" detail="AniList · updated daily + live" />
      <Row icon="information-circle-outline" label="Version" detail={Constants.expoConfig?.version ?? '1.0.0'} />
    </View>
  );

  // Browsing without an account: what signing in adds, and the way in. An account that's still
  // waiting for email verification goes to the same screen, which shows the verification step.
  if (!signedIn) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.xxl }}>
          <Text style={styles.heading}>Profile</Text>
          <View style={styles.card}>
            <View style={[styles.avatar, styles.guestAvatar]}>
              <Ionicons name="person-outline" size={30} color={colors.accent} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.name}>{authUser ? 'Almost there' : 'Browsing as a guest'}</Text>
              <Text style={styles.email}>
                {authUser
                  ? `Verify ${authUser.email} to finish creating your account.`
                  : 'Sign in to keep a list, save your history and continue episodes where you left them.'}
              </Text>
            </View>
          </View>
          <Button
            title={authUser ? 'Verify your email' : 'Log in or create an account'}
            icon={authUser ? 'mail-outline' : 'log-in-outline'}
            onPress={() => navigation.navigate('SignUpAndSignIn')}
          />
          {appInfo}
          <Text style={styles.credit}>{AVATAR_CREDIT}</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.xxl }}>
        <Text style={styles.heading}>Profile</Text>

        <View style={styles.card}>
          <View style={styles.avatar}>
            <Image source={{ uri: me.image || avatarFor(authUser?.uid) }} style={StyleSheet.absoluteFill} contentFit="cover" />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={styles.name} numberOfLines={1}>{fullName}</Text>
            {me.username ? <Text style={styles.handle}>@{me.username}</Text> : null}
            <Text style={styles.email} numberOfLines={1}>{authUser?.email}</Text>
          </View>
        </View>

        {/* Your stats: from the watch history and My List. */}
        <View style={{ gap: space.md }}>
          <Text style={styles.sectionTitle}>Your stats</Text>
          <View style={styles.stats}>
            {[
              [stats.episodesWatched, stats.episodesWatched === 1 ? 'Episode watched' : 'Episodes watched'],
              [stats.hoursWatched, stats.hoursWatched === 1 ? 'Hour watched' : 'Hours watched'],
            ].map(([value, label]) => (
              <View key={label} style={styles.stat}>
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.stats}>
            {[
              [stats.onList, 'On My List'],
              [stats.completed, 'Completed'],
            ].map(([value, label]) => (
              <View key={label} style={styles.stat}>
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>
          {stats.topGenres.length ? (
            <View style={styles.genres}>
              <Text style={styles.statLabel}>Favorite genres</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {stats.topGenres.map((g, i) => (
                  <View key={g} style={[styles.genre, i === 0 && styles.genreTop]}>
                    <Text style={[styles.genreText, i === 0 && { color: colors.onAccent }]}>{g}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.group}>
          <Row icon="create-outline" label="Edit profile and avatar" onPress={() => navigation.navigate('Settings')} />
          {/* Google accounts have no Animist password to change. */}
          {signInMethod(authUser) === 'password' && (
            <Row icon="key-outline" label="Change password" onPress={() => navigation.navigate('UpdatePass')} />
          )}
          <Row icon="bookmark-outline" label="My List" onPress={() => navigation.navigate('MyList')} />
          <Row icon="download-outline" label="Import from AniList" onPress={() => navigation.navigate('ImportAniList')} />
        </View>

        {appInfo}

        <Button title="Log out" icon="log-out-outline" variant="ghost" onPress={logOut} loading={signingOut} />

        <View style={styles.group}>
          <Row icon="trash-outline" label="Delete account" danger onPress={() => navigation.navigate('DeleteAccount')} />
        </View>
        <Text style={styles.credit}>{AVATAR_CREDIT}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  heading: { fontFamily: fonts.display, fontSize: 28, color: colors.text },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: '#2E4A7A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  guestAvatar: { backgroundColor: 'rgba(255,122,89,0.1)' },
  name: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  handle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.accent },
  email: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  stats: { flexDirection: 'row', gap: space.md },
  sectionTitle: { fontFamily: fonts.displaySemi, fontSize: 19, color: colors.text },
  genres: { gap: space.sm, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.surface },
  genre: { paddingHorizontal: 12, height: 30, borderRadius: 15, justifyContent: 'center', backgroundColor: colors.surface2 },
  genreTop: { backgroundColor: colors.accent },
  genreText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.text },
  stat: { flex: 1, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.surface, gap: 2 },
  statValue: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  statLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  group: { borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,122,89,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: { backgroundColor: colors.dangerSoft },
  rowLabel: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  rowDetail: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  switchDetail: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: colors.muted },
  credit: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, textAlign: 'center' },
});

export default ProfileScreen;
