
import React from 'react'
import { PaperProvider } from 'react-native-paper';
import { Modal, Portal, Text} from 'react-native-paper';
import { Image } from 'react-native';
import { MotiView } from 'moti';

const AddedToList = ({message, visible}) => {
    const containerStyle = {backgroundColor: 'rgba(0,0,0,0.9)', padding: 20, marginHorizontal:19, position:'relative',
borderColor:'coral',
borderLeftWidth:2,
};

  return (

    <PaperProvider>
      <Portal>
        <Modal visible={visible} contentContainerStyle={containerStyle}>
            <Image source={require('../assets/icons8-akatsuki-48.png')}
            style={{
                position:'absolute',
                zIndex:1,
                top:-25,
                right:10,
            }}
            />
          <Text style={{
            color:'white',
            fontWeight:'bold',
            fontSize:15,
            marginVertical:5,
            opacity:0.8,
            textAlign:'center',
          }}>{message}.</Text>

        </Modal>

      </Portal>

    </PaperProvider>
  )
}

export default AddedToList;