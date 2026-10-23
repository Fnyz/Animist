import React from 'react'
import { Modal, View, StyleSheet } from 'react-native'

// Replaces react-native-modal, which uses APIs removed from React Native
// (BackHandler.removeEventListener, InteractionManager). Same `isVisible` prop;
// `animationIn`/`animationOut` are accepted but every modal fades.
const AppModal = ({ isVisible, onBackButtonPress, children }) => (
  <Modal
    visible={!!isVisible}
    transparent
    animationType="fade"
    statusBarTranslucent
    onRequestClose={onBackButtonPress ?? (() => {})}
  >
    <View style={styles.backdrop}>
      <View style={styles.content}>{children}</View>
    </View>
  </Modal>
)

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    margin: '5%',
  },
})

export default AppModal
