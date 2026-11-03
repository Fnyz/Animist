import React, { useState } from 'react';
import { Modal, View, Text, Pressable, FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, space } from '../theme';

// Pictures shown full screen over a dark background: swipe between them, close with ✕, a tap on the
// background, or Back. images: [{ uri, label }]; start: the index to open at, or null when closed.
const ImageViewer = ({ images, start, title, onClose }) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [openedAt, setOpenedAt] = useState(null);
  // Each time it opens, it starts at the picture that was tapped.
  if (start !== null && start !== openedAt) {
    setOpenedAt(start);
    setIndex(start);
  }
  if (start === null && openedAt !== null) setOpenedAt(null);

  const shown = images.filter((i) => i.uri);
  if (!shown.length) return null;

  return (
    <Modal visible={start !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <FlatList
          data={shown}
          horizontal
          pagingEnabled
          initialScrollIndex={Math.min(start ?? 0, shown.length - 1)}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          keyExtractor={(item) => item.uri}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <Pressable onPress={onClose} style={{ width, height, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Close picture">
              <Pressable onPress={() => {}} style={{ width: width - space.xl * 2, height: height * 0.72 }}>
                <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} contentFit="contain" transition={200} accessibilityLabel={`${item.label} of ${title}`} />
              </Pressable>
            </Pressable>
          )}
        />
        <View style={[styles.top, { top: insets.top + space.sm }]} pointerEvents="box-none">
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <Text style={styles.label}>{shown[index]?.label}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>
        {shown.length > 1 && (
          <View style={[styles.dots, { bottom: insets.bottom + space.xl }]} pointerEvents="none">
            {shown.map((item, i) => (
              <View key={item.uri} style={[styles.dot, i === index && styles.dotOn]} />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5,6,10,0.94)' },
  top: { position: 'absolute', left: space.xl, right: space.xl, flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { fontFamily: fonts.displaySemi, fontSize: 17, color: colors.text },
  label: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  dots: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotOn: { width: 22, backgroundColor: colors.accent },
});

export default ImageViewer;
