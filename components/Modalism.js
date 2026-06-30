import { View, Text, Image } from 'react-native'
import React from 'react'
import Modal from "react-native-modal";
import { TouchableOpacity } from 'react-native';
import { Linking } from 'react-native';

const Modalism = ({visible, handlecloseModalism, handleVerifyModalism, email}) => {

    const openGoogleAccount = () => {
        const url = `mailto:${email}` || `https://accounts.google.com/AccountChooser?Email=${encodeURIComponent(email)}` ;
        Linking.canOpenURL(url)
          .then((supported) => {
            if (supported) {
              Linking.openURL(url);
              handlecloseModalism();
            } else {
              console.log(`Cannot open URL: ${url}`);
            }
          })
          .catch((error) => console.log('Error occurred:', error));
      };
  return (
    <View>
               <Modal isVisible={visible} animationIn='bounceIn'>
        <View style={{
            height:210,
            backgroundColor:'rgba(0,0,0,0.8)',
            borderRadius:10,
            justifyContent:'center',
            alignItems:'center',
            position:'relative'
        }}>
            <View style={{
              position:'absolute',
              zIndex:1,
              right:10,
              top:-25,
            }}>
              <Image source={require('../assets/icons8-akatsuki-48.png')} />
            </View>
             <View style={{
              paddingHorizontal:20,
              marginBottom:20,
             }}>
             <Text style={{
              color:'white',
              fontStyle:'italic'
             }}>Hello user,</Text>
             <Text style={{
                color:'white',
                fontSize:17,
                fontWeight:'bold',
                marginTop:5,
             }}>You are not a verified user please visit your email account to verify it.</Text>
             </View>

             <TouchableOpacity style={{
                borderColor:'coral',
                borderWidth:1,
                width:307,
                marginBottom:10,
                borderTopLeftRadius:10,
                borderTopRightRadius:10,
                justifyContent:'center',
                alignItems:'center',
                padding:10,

             }} onPress={openGoogleAccount}>
                <Text style={{
                    color:'coral',
                    fontWeight:'bold',
                    fontSize:15,
                }}>Go to Google account</Text>
             </TouchableOpacity>
            <View style={{
              flexDirection:'row',
              gap:5,
            }}>
            <TouchableOpacity style={{
                backgroundColor:'coral',
                width:150,
                justifyContent:'center',
                alignItems:'center',
                padding:10,
                borderBottomLeftRadius:10,
             }} onPress={handleVerifyModalism}>
                <Text style={{
                    color:'white',
                    fontWeight:'bold',
                    fontSize:15,
                }}>Verify</Text>
             </TouchableOpacity>

             <TouchableOpacity style={{
                borderColor:'coral',
                borderWidth:1,
                width:150,
                justifyContent:'center',
                alignItems:'center',
                padding:10,
                borderBottomRightRadius:10,
             }} onPress={handlecloseModalism}>
                <Text style={{
                    color:'coral',
                    fontWeight:'bold',
                    fontSize:15,
                }}>Close</Text>
             </TouchableOpacity>

            </View>

        </View>
      </Modal>

    </View>
  )
}

export default Modalism