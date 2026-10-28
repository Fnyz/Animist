import React, { useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Chip } from './ui';
import { FORMAT_OPTIONS, NO_FILTERS, SEASON_OPTIONS, yearOptions } from '../searchFilters';
import { colors, fonts, radius, space } from '../theme';

const Section = ({ title, children }) => (
  <View style={{ gap: space.sm }}>
    <Text style={styles.section}>{title}</Text>
    <View style={styles.chips}>{children}</View>
  </View>
);

// A sheet from the bottom to pick search filters. Changes apply when "Show results" is tapped.
// visible, filters, onApply(filters), onClose()
const FilterSheet = ({ visible, filters, onApply, onClose }) => {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(filters);
  const [shownFor, setShownFor] = useState(null);
  // Start from the current filters each time the sheet opens.
  if (visible && shownFor !== filters) {
    setShownFor(filters);
    setDraft(filters);
  }
  const pick = (key, value) => setDraft((d) => ({ ...d, [key]: d[key] === value ? NO_FILTERS[key] : value }));

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close filters" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>Filters</Text>
          <Pressable onPress={() => setDraft(NO_FILTERS)} hitSlop={10} accessibilityRole="button">
            <Text style={styles.clear}>Clear all</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: space.lg }} showsVerticalScrollIndicator={false}>
          <Pressable
            onPress={() => setDraft((d) => ({ ...d, freeOnly: !d.freeOnly }))}
            style={[styles.free, draft.freeOnly && styles.freeOn]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: draft.freeOnly }}
          >
            <Ionicons name={draft.freeOnly ? 'checkbox' : 'square-outline'} size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.freeTitle}>Free to watch only</Text>
              <Text style={styles.freeText}>Anime with episodes that play in the app</Text>
            </View>
          </Pressable>
          <Section title="Format">
            {FORMAT_OPTIONS.map((o) => (
              <Chip key={o.key} label={o.label} active={draft.format === o.key} onPress={() => pick('format', o.key)} />
            ))}
          </Section>
          <Section title="Season">
            {SEASON_OPTIONS.map((o) => (
              <Chip key={o.key} label={o.label} active={draft.season === o.key} onPress={() => pick('season', o.key)} />
            ))}
          </Section>
          <Section title="Year">
            {yearOptions().map((y) => (
              <Chip key={y} label={String(y)} active={draft.year === y} onPress={() => pick('year', y)} />
            ))}
          </Section>
        </ScrollView>
        <Button title="Show results" icon="search" onPress={() => onApply(draft)} style={{ marginTop: space.md }} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5,6,10,0.6)' },
  sheet: {
    maxHeight: '82%',
    paddingTop: space.sm,
    paddingHorizontal: space.xl,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: space.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  title: { fontFamily: fonts.displaySemi, fontSize: 20, color: colors.text },
  clear: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.accent },
  section: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  free: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface2 },
  freeOn: { borderWidth: 1, borderColor: colors.accent },
  freeTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  freeText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
});

export default FilterSheet;
