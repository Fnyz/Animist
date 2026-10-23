import React, { useContext, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { myContext } from '../context';
import { DEFAULT_AVATARS, avatarFor } from '../avatars';
import { animedata } from '../animeData';
import { Button, ErrorBanner, Field, ScreenHeader, Loading } from '../components/ui';
import { colors, fonts, space } from '../theme';

const SERIES_LABELS = { spyFamily: 'Spy x Family', OnePiece: 'One Piece', funny: 'Funny', blackClover: 'Black Clover' };

const AVATAR_GROUPS = [
  { title: 'Cute avatars', images: DEFAULT_AVATARS },
  ...Object.entries(SERIES_LABELS).map(([key, title]) => ({
    title,
    images: animedata.filter((a) => a.category === key).map((a) => a.image),
  })),
].filter((g) => g.images.length);

const EditProfileScreen = ({ navigation }) => {
  const { profile } = useContext(myContext);
  const me = profile?.[0];
  const [form, setForm] = useState(() => ({
    firstname: me?.data.firstname ?? '',
    lastname: me?.data.lastname ?? '',
    username: me?.data.username ?? '',
    image: me?.data.image || avatarFor(me?.data.userId),
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const original = useMemo(
    () => ({
      firstname: me?.data.firstname ?? '',
      lastname: me?.data.lastname ?? '',
      username: me?.data.username ?? '',
      image: me?.data.image || avatarFor(me?.data.userId),
    }),
    [me]
  );
  const changed = Object.keys(form).some((k) => form[k] !== original[k]);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  if (!me) return <Loading style={{ backgroundColor: colors.bg }} />;

  const save = async () => {
    const firstname = form.firstname.trim();
    const lastname = form.lastname.trim();
    const username = form.username.trim();
    if (!firstname || !lastname) return setError('Enter your first and last name.');
    if (!/^[a-zA-Z0-9_.]{3,20}$/.test(username)) return setError('Usernames are 3–20 letters, numbers, dots or underscores.');

    setBusy(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'users', me.id), { firstname, lastname, username, image: form.image });
      navigation.goBack();
    } catch (e) {
      console.warn('profile update failed', e);
      setError("Couldn't save your profile. Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Edit profile" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.preview}>
            <Image source={{ uri: form.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          </View>

          {AVATAR_GROUPS.map((group) => (
            <View key={group.title} style={{ gap: space.sm }}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md }}>
                {group.images.map((uri) => {
                  const selected = form.image === uri;
                  return (
                    <Pressable
                      key={uri}
                      onPress={() => set('image')(uri)}
                      style={[styles.option, selected && styles.optionSelected]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${group.title} avatar`}
                    >
                      <Image source={{ uri }} style={styles.optionImage} contentFit="cover" transition={200} />
                      {selected && (
                        <View style={styles.check}>
                          <Ionicons name="checkmark" size={14} color={colors.onAccent} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ))}

          <View style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <Field id="edit-first" label="First name" icon="person-outline" value={form.firstname} onChangeText={set('firstname')} autoComplete="given-name" />
            </View>
            <View style={{ flex: 1 }}>
              <Field id="edit-last" label="Last name" icon="person-outline" value={form.lastname} onChangeText={set('lastname')} autoComplete="family-name" />
            </View>
          </View>
          <Field id="edit-username" label="Username" icon="at-outline" value={form.username} onChangeText={set('username')} autoCapitalize="none" autoCorrect={false} />

          <ErrorBanner message={error} />
          <Button title="Save changes" icon="checkmark" onPress={save} loading={busy} disabled={!changed} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space.xl, paddingTop: space.sm, gap: space.xl },
  preview: {
    alignSelf: 'center',
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 3,
    borderColor: colors.accent,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
  },
  groupTitle: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.muted },
  option: { borderRadius: 40, padding: 3, borderWidth: 2, borderColor: 'transparent' },
  optionSelected: { borderColor: colors.accent },
  optionImage: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface2 },
  check: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
});

export default EditProfileScreen;
