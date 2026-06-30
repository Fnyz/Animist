import { View, Text,Image } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, TextInput } from 'react-native-paper'
import { useState } from 'react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { Auth } from '../firebase'
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native'
import { AlertNotificationRoot} from 'react-native-alert-notification';
import Modal from 'react-native-modal'
import { MaterialIcons } from '@expo/vector-icons';
import { Linking } from 'react-native'
import { ALERT_TYPE, Dialog } from 'react-native-alert-notification';

const ResetPassword = ({navigation}) => {

  const [visible, setvisible] = useState(false);
  const [email, setEmailAdd] = useState('');
  const openGoogleAccount = () => {
    const url = `mailto:${email}` || `https://accounts.google.com/AccountChooser?Email=${encodeURIComponent(email)}` ;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
          setvisible(false);
        } else {
          console.log(`Cannot open URL: ${url}`);
        }
      })
      .catch((error) => {
        console.log(error);
      });

  };

    const handleChangePassword = () => {

      if(!email){
        Dialog.show({
          type: ALERT_TYPE.DANGER,
          title: 'Oppps.',
          textBody: 'Please input the fields.',
          button: 'close',
        })
        return;
      }

        sendPasswordResetEmail(Auth, email.trim())
  .then(() => {
    setvisible(true);
    setEmailAdd('')
  })
  .catch((error) => {
    let errorMessage = '';
    switch(error.code) {
      case "auth/invalid-email":
        errorMessage = "These email is not valid, please try again.";
      break;
      case "auth/user-not-found":
        errorMessage = "User not found, please try again.";
      break;
      default:
    }

    if(errorMessage){
      setEmailAdd('');
      Dialog.show({
        type: ALERT_TYPE.DANGER,
        title: 'Oppps.',
        textBody: errorMessage,
        button: 'close',
      })
    }

  });
    };

  return (
    <AlertNotificationRoot theme='dark'>

    <SafeAreaView style={{
      flex:1,
        backgroundColor:'rgba(0,0,0,0.8)',
        paddingTop:20,
    }}>
        <View style={{
            marginHorizontal:15,
        }}>
        <Text style={{
            color: 'white',
            fontSize:25,
            fontWeight: 'bold',
        }}>Reset Password</Text>
       <Text style={{
            color: 'white',
            opacity:0.5,
            fontStyle:'italic'
        }}>Enter the email associated with your account and we'll send an email to with instructions to reset your password.
        </Text>
        <View style={{
            marginTop:15,
        }}>
        <Text style={{
            color:'white'
        }}>Email address</Text>
        <TextInput
                  mode='outlined'
                  activeOutlineColor='coral'
                  outlineColor='white'
                  placeholder="e.g noname@gmail.com"
                  textColor="gray"
                  value={email}
                  onChangeText={(val) => setEmailAdd(val)}
                  placeholderTextColor='gray'
                  style={{
                 opacity:0.9,
        }}/>

      <Button icon={"key-variant"} textColor='white' labelStyle={{
        fontSize:20,
        marginTop:13,
      }}
      onPress={handleChangePassword}
      mode="outlined" style={{
        padding:5,
        backgroundColor:'coral',
        borderWidth:0,

        marginTop:20,
        opacity:0.9,
      }}>
        Submit
      </Button>
      <TouchableOpacity style={{
        borderWidth:1,
        borderColor:'coral',
        padding:17,
        justifyContent:'center',
        alignItems:'center',
        borderRadius:17,
        marginTop:10,
        flexDirection:'row'
      }} onPress={()=> navigation.navigate('SignUpAndSignIn')}>
        <Ionicons name="arrow-back-sharp" size={20} color="coral" />
        <Text style={{
          color:'coral',
          fontWeight:'bold'
        }}> Go back to login</Text>
      </TouchableOpacity>

        </View>
        </View>

        <Modal isVisible={visible} animationIn='bounceIn' animationOut='bounceOut'>
        <View style={{
            height:220,
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
              justifyContent:'center',
              alignItems:'center'
             }}>
             <View style={{
              flexDirection:'row',
              gap:5,
              justifyContent:'center',

             }}>
             <MaterialIcons name="email" size={20} color="white" />
              <Text style={{
              color:'white',
              fontSize:20,
              fontWeight:'bold',
              marginBottom:5,
             }}>Check your email</Text>

             </View>

             <Text style={{
                color:'white',
                opacity:0.7,
                marginTop:5,
             }}>We have sent a password recover instructions to your email.</Text>
             </View>

             <TouchableOpacity style={{
                backgroundColor:'coral',
                width:307,
                marginBottom:10,
                borderRadius:10,
                justifyContent:'center',
                alignItems:'center',
                padding:15,

             }} onPress={openGoogleAccount}>
                <Text style={{
                    color:'white',
                    fontWeight:'bold',
                    fontSize:15,
                }}>Open email app</Text>
             </TouchableOpacity>

             <TouchableOpacity style={{
              marginTop:10,
              opacity:0.7,
             }} onPress={()=> {
              setvisible(false);
              setEmailAdd('');
             }}>
              <Text style={{
                color:'white'
              }}>Skip, I'll comfirm later.</Text>
             </TouchableOpacity>

        </View>
      </Modal>

    </SafeAreaView>
      </AlertNotificationRoot>
  )
}

export default ResetPassword