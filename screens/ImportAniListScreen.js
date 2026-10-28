import React, { useContext, useState } from 'react';
import { Text, ScrollView, KeyboardAvoidingView, StyleSheet, View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { myContext } from '../context';
import { getAniListUserList } from '../api';
import { planImport } from '../aniListImport';
import { LIST_STATUSES } from '../listStatus';
import { Button, ErrorBanner, Field, ScreenHeader } from '../components/ui';
import { colors, fonts, radius, space } from '../theme';

// Profile > Import from AniList. Finds a public AniList list by username, shows what would be
// added (with statuses), and adds it to My List. Anime already on My List are left as they are.
const ImportAniListScreen = ({ navigation }) => {
  const { userWatchList, importToWatchList } = useContext(myContext);
  const [userName, setUserName] = useState('');
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState(null);
  const [found, setFound] = useState(null); // { user, entries }
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null); // number added
  const [progress, setProgress] = useState(0);

  const plan = found ? planImport(found.entries, userWatchList) : null;

  const find = async () => {
    setError(null);
    setFound(null);
    setFinding(true);
    try {
      setFound(await getAniListUserList(userName));
    } catch (e) {
      setError(e.message);
    } finally {
      setFinding(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      setSaved(await importToWatchList(plan.toAdd, setProgress));
    } catch (e) {
      console.warn('AniList import failed', e);
      setError("Couldn't save everything. Check your connection and try again; anime already added won't be added twice.");
    } finally {
      setSaving(false);
    }
  };

  if (saved !== null) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={[styles.body, { flex: 1, justifyContent: 'center' }]}>
          <View style={styles.doneIcon}>
            <Ionicons name="checkmark" size={30} color={colors.success} />
          </View>
          <Text style={styles.title}>{saved === 1 ? '1 anime added' : `${saved} anime added`}</Text>
          <Text style={[styles.text, { textAlign: 'center' }]}>They're on My List with their AniList status.</Text>
          <Button title="Open My List" icon="bookmark-outline" onPress={() => navigation.navigate('Main', { screen: 'MyList' })} />
          <Button title="Back to Profile" variant="ghost" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Import from AniList" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.text}>
            Bring an AniList anime list into My List, with Watching, Plan to watch, Completed and Dropped. The list has to be public on AniList.
          </Text>
          <Field
            id="anilist-user"
            label="AniList username"
            icon="person-outline"
            value={userName}
            onChangeText={(t) => {
              setUserName(t);
              setFound(null);
            }}
            placeholder="e.g. Josh"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={find}
          />
          <ErrorBanner message={error} />
          {!found && <Button title="Find list" icon="search" onPress={find} loading={finding} disabled={!userName.trim()} />}

          {found && plan && (
            <View style={styles.card}>
              <View style={styles.user}>
                {found.user.avatar ? <Image source={{ uri: found.user.avatar }} style={styles.avatar} /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{found.user.name}</Text>
                  <Text style={styles.muted}>{found.entries.length} anime on AniList</Text>
                </View>
              </View>

              {plan.toAdd.length > 0 ? (
                <>
                  <View style={styles.counts}>
                    {LIST_STATUSES.map((s) =>
                      plan.counts[s.key] ? (
                        <View key={s.key} style={styles.count}>
                          <Ionicons name={s.icon} size={15} color={colors.accent} />
                          <Text style={styles.countText}>
                            {plan.counts[s.key]} {s.label}
                          </Text>
                        </View>
                      ) : null
                    )}
                  </View>
                  <FlatList
                    horizontal
                    data={plan.toAdd.slice(0, 12)}
                    keyExtractor={(item) => String(item.anime.id)}
                    renderItem={({ item }) => <Image source={{ uri: item.anime.image }} style={styles.poster} contentFit="cover" />}
                    contentContainerStyle={{ gap: space.sm }}
                    showsHorizontalScrollIndicator={false}
                  />
                </>
              ) : null}

              <Text style={styles.muted}>
                {found.entries.length === 0
                  ? 'This AniList list is empty, so there is nothing to add.'
                  : plan.toAdd.length === 0
                  ? 'Everything on this list is already on My List.'
                  : plan.alreadyOnList
                    ? `${plan.alreadyOnList} already on My List stay as they are.`
                    : 'None of these are on My List yet.'}
              </Text>

              {plan.toAdd.length > 0 && (
                <Button
                  title={saving ? `Adding… ${progress}/${plan.toAdd.length}` : `Add ${plan.toAdd.length} to My List`}
                  icon="download-outline"
                  onPress={save}
                  loading={saving}
                />
              )}
              <Button
                title="Use another username"
                variant="ghost"
                onPress={() => {
                  setFound(null);
                  setUserName('');
                }}
              />
            </View>
          )}
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
  muted: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.muted },
  card: { gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  user: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface2 },
  userName: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  count: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: colors.surface2 },
  countText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.text },
  poster: { width: 64, height: 92, borderRadius: radius.sm, backgroundColor: colors.surface2 },
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

export default ImportAniListScreen;
