import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';

// A layer above the whole app for the fullscreen video player. It lives in the app's own window:
// a Modal is a separate Android window that copies the status bar's state only once, when it
// opens, so the time, Wi-Fi and battery icons could stay on top of the video.
const SetLayer = createContext(null);

export const FullscreenHost = ({ children }) => {
  const [content, setContent] = useState(null);
  return (
    <SetLayer.Provider value={setContent}>
      <View style={styles.app}>
        {children}
        {content ? <View style={styles.layer}>{content}</View> : null}
      </View>
    </SetLayer.Provider>
  );
};

// Shows its children in the fullscreen layer while it's rendered (and they aren't null).
export const FullscreenLayer = ({ children }) => {
  const setLayer = useContext(SetLayer);
  const content = children ?? null;
  useEffect(() => {
    setLayer?.(content);
  });
  useEffect(() => () => setLayer?.(null), [setLayer]);
  return null;
};

const styles = StyleSheet.create({
  app: { flex: 1 },
  layer: { ...StyleSheet.absoluteFill, zIndex: 1000, elevation: 1000, backgroundColor: '#000' },
});
