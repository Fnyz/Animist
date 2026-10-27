import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LIST_STATUSES } from '../listStatus';
import { colors, fonts, radius, space } from '../theme';

// A sheet from the bottom to pick an anime's My List status, or remove it from the list.
// visible, title, current (status key), onPick(key), onRemove(), onClose()
const StatusSheet = ({ visible, title, current, onPick, onRemove, onClose }) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]} accessibilityRole="menu">
        <View style={styles.handle} />
        {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : null}
        {LIST_STATUSES.map(({ key, label, icon }) => {
          const selected = key === current;
          return (
            <Pressable
              key={key}
              onPress={() => onPick(key)}
              style={({ pressed }) => [styles.option, selected && styles.selected, pressed && { opacity: 0.8 }]}
              accessibilityRole="menuitem"
              accessibilityState={{ selected }}
            >
              <Ionicons name={icon} size={20} color={selected ? colors.onAccent : colors.accent} />
              <Text style={[styles.label, selected && { color: colors.onAccent }]}>{label}</Text>
              {selected ? <Ionicons name="checkmark" size={20} color={colors.onAccent} /> : null}
            </Pressable>
          );
        })}
        {onRemove ? (
          <Pressable onPress={onRemove} style={({ pressed }) => [styles.option, pressed && { opacity: 0.8 }]} accessibilityRole="menuitem">
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
            <Text style={[styles.label, { color: colors.danger }]}>Remove from My List</Text>
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5,6,10,0.6)' },
  sheet: {
    gap: space.xs,
    paddingTop: space.sm,
    paddingHorizontal: space.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: space.sm },
  title: { fontFamily: fonts.displaySemi, fontSize: 18, color: colors.text, paddingHorizontal: space.sm, paddingBottom: space.sm },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, paddingHorizontal: space.md, borderRadius: radius.md },
  selected: { backgroundColor: colors.accent },
  label: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
});

export default StatusSheet;
