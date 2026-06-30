
import React from 'react'
import { View, ActivityIndicator } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { TouchableOpacity } from 'react-native';
import { Modal, Portal, Text} from 'react-native-paper';
import { Image } from 'react-native';

const MessageModal = ({message, hideModal, visible, deletDocss, idToDelete, loadNow}) => {
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
            opacity:0.6,
            fontStyle:'italic'
          }}>Hello sensei,</Text>
          <Text style={{
            color:'white',
            fontWeight:'bold',
            fontSize:15,
            marginVertical:5,
            opacity:0.8,
          }}>{message}</Text>
          <View style={{
            flexDirection:'row',
            gap:5,
            marginTop:17,
          }}>
          <TouchableOpacity onPress={hideModal} style={{
            backgroundColor:'coral',
            padding:15,
            width:'50%',
            justifyContent:'center',
            alignItems:'center',
            borderTopLeftRadius:5,
            borderBottomLeftRadius:5,
            opacity:0.8,
          }}>
            <Text style={{
                color:'white',
                fontWeight:'bold',
            }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{
            borderWidth:1,
            borderColor:'coral',
            padding:15,
            width:'50%',
            justifyContent:'center',
            alignItems:'center',
            borderTopRightRadius:5,
            borderBottomRightRadius:5,
            opacity:0.8,
          }} onPress={()=> deletDocss(idToDelete)}>
            <Text style={{
                color:'coral',
                fontWeight:'bold',
            }}>{loadNow ? <ActivityIndicator size="small" color="coral" /> : `Yes, I'am`}</Text>
          </TouchableOpacity>

          </View>

        </Modal>

      </Portal>
    </PaperProvider>
  )
}

export default MessageModal