import { View, Text } from 'react-native'
import React, { useState } from 'react'
import { TextInput } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context';
import { TouchableOpacity } from 'react-native'
import { Auth } from '../firebase';
import { reauthenticateWithCredential, updatePassword, EmailAuthProvider} from 'firebase/auth';
import { ALERT_TYPE, Dialog, AlertNotificationRoot } from 'react-native-alert-notification';

const UpdatePassword = ({navigation}) => {
  const [secureEntry, setSecurityEntry] = useState(true);
  const [secureEntry1, setSecurityEntry1] = useState(true);
  const [currentpass, setCurrentpass] = useState('');
  const [newPass, setNewpass] = useState('');

  const updatePasswordInFirebase = async (currentPassword, newPassword) => {
    try {

      const user = Auth.currentUser;

      if (user) {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        Dialog.show({
            type: ALERT_TYPE.SUCCESS,
            title: 'SUCCESS',
            textBody: 'Password updated successfully.',
            button: 'close',
            onPressButton:()=>{
                navigation.navigate('Settings');
                Dialog.hide();
            }
        })
        setCurrentpass('');
        setNewpass('');
      } else {
        Dialog.show({
            type: ALERT_TYPE.DANGER,
            title: 'SUCCESS',
            textBody: 'No users found please try again.',
            button: 'close',
        })
      }
    } catch (error) {
        let errorMessage = null;

        switch(error.code) {
          case "auth/missing-password":
            errorMessage = "Password is missing, please try again.";
          break;
          case "auth/weak-password":
            errorMessage = "Password must be at least 6 characters long.";
          break;
          case "auth/wrong-password":
            errorMessage = "Password is incorrect, please try again.";
          break;
          case 'auth/too-many-requests':
            errorMessage = "Access to this account is temporarily disabled due to many failed login attemps. You can immediately restore it by resetting your password or you can try again later.";
          break;
          default:

        }

        if(errorMessage){
          setCurrentpass('');
          Dialog.show({
            type: ALERT_TYPE.DANGER,
            title: 'Oppps.',
            textBody: errorMessage,
            button: 'close',
          })
        }
    }
  };

  const handleShowPassword = () => {
    setSecurityEntry(prev => !prev);
  }
  const handleShowPassword1 = () => {
    setSecurityEntry1(prev => !prev);
  }

  const handlePasswordUpdate = () => {
    updatePasswordInFirebase(currentpass, newPass);
  };
  return (
    <AlertNotificationRoot theme='dark'>

    <SafeAreaView style={{
        flex:1,
        backgroundColor:'rgba(0,0,0,0.8)',
    }}>
      <View style={{
        marginHorizontal:10,
        marginVertical:10,
      }}>
      <Text style={{
        color:'white',
        fontWeight:'bold',
        fontSize:25,
      }}>Reset Password</Text>
      <Text style={{
        color:'white',
        opacity:0.6,
        marginBottom:15,
      }}>Please fill out the form.</Text>
      <Text style={{
        color:'white',
      }}>Current password</Text>
      <TextInput
      placeholder="e.g Password"
      placeholderTextColor='gray'
      mode='outlined'
      outlineColor='white'
      activeOutlineColor='coral'
      secureTextEntry={secureEntry}
      value={currentpass}
      onChangeText={(val)=> setCurrentpass(val)}
      style={{
        marginBottom:10,
        opacity:0.9,
      }}
      right={<TextInput.Icon icon={secureEntry? 'eye-off' : 'eye'} onPress={handleShowPassword} />}
      />
         <Text style={{
        color:'white',
      }}>New password</Text>
      <TextInput
      placeholder="e.g Password"
      placeholderTextColor='gray'
      mode='outlined'
      outlineColor='white'
      activeOutlineColor='coral'
      secureTextEntry={secureEntry1}
      value={newPass}
      onChangeText={(val)=> setNewpass(val)}
      style={{
        marginBottom:10,
        opacity:0.9,
      }}
      right={<TextInput.Icon icon={secureEntry1? 'eye-off' : 'eye'} onPress={handleShowPassword1} />}
      />
      </View>

      <View style={{
        marginHorizontal:10,
        flexDirection:'row',
        gap:10,
      }}>
        <TouchableOpacity
        style={{
            backgroundColor:'coral',
            width:180,
            paddingVertical:10,
            justifyContent:'center',
            alignItems:'center',
            borderTopLeftRadius:5,
            borderBottomLeftRadius:5,
        }}
        onPress={handlePasswordUpdate}
        >
            <Text style={{
                color:'white',
                fontWeight:'bold',
            }}>SUBMIT</Text>
        </TouchableOpacity>
        <TouchableOpacity
        style={{
            borderColor:'coral',
            borderWidth:1,
            width:180,
            paddingVertical:10,
            justifyContent:'center',
            alignItems:'center',
            borderTopRightRadius:5,
            borderBottomRightRadius:5,
        }}
        onPress={()=> {
            navigation.navigate('Settings');
        }}
        >
            <Text style={{
                color:'coral',
                fontWeight:'bold',
            }}>GO BACK</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
        </AlertNotificationRoot>
  )
}

export default UpdatePassword