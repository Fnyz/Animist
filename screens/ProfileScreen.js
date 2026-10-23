import React, { useContext, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import Constants from 'expo-constants';
import { Auth } from '../firebase';
import { myContext } from '../context';
import { Button } from '../components/ui';
import { USE_STATIC_DATA } from '../api';
import { avatarFor, AVATAR_CREDIT } from '../avatars';
import { colors, fonts, radius, space } from '../theme';

const Row = ({ icon, label, detail, onPress }) => (
  <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
    <View style={styles.rowIcon}>
      <Ionicons name={icon} size={19} color={colors.accent} />
    </View>
    <Text style={styles.rowLabel}>{label}</Text>
    {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
    {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
  </Pressable>
);

const ProfileScreen = ({ navigation }) => {
  const { profile, userWatchList, authUser } = useContext(myContext);
  const [signingOut, setSigningOut] = useState(false);
  const me = profile?.[0]?.data ?? {};
  const fullName = [me.firstname, me.lastname].filter(Boolean).join(' ') || 'Anime fan';

  const logOut = async () => {
    setSigningOut(true);
    try {
      await signOut(Auth);
    } catch (e) {
      console.warn('sign out failed', e);
      setSigningOut(false);
    }
  };

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

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{userWatchList.length}</Text>
            <Text style={styles.statLabel}>In My List</Text>
          </View>
        </View>

        <View style={styles.group}>
          <Row icon="create-outline" label="Edit profile and avatar" onPress={() => navigation.navigate('Settings')} />
          <Row icon="key-outline" label="Change password" onPress={() => navigation.navigate('UpdatePass')} />
          <Row icon="bookmark-outline" label="My List" onPress={() => navigation.navigate('MyList')} />
        </View>

        <View style={styles.group}>
          <Row icon="server-outline" label="Anime data" detail={USE_STATIC_DATA ? 'Offline snapshot' : 'AniList (live)'} />
          <Row icon="information-circle-outline" label="Version" detail={Constants.expoConfig?.version ?? '1.0.0'} />
        </View>

        <Button title="Log out" icon="log-out-outline" variant="ghost" onPress={logOut} loading={signingOut} />
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
  name: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  handle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.accent },
  email: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  stats: { flexDirection: 'row', gap: space.md },
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
  rowLabel: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  rowDetail: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  credit: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, textAlign: 'center' },
});

export default ProfileScreen;
