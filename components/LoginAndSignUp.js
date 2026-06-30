
import React, { Component } from 'react'
import { View , Text, TouchableOpacity, SafeAreaView, TouchableWithoutFeedback, Keyboard, Image, Platform, ActivityIndicator} from 'react-native';
import { TextInput, Button, PaperProvider} from 'react-native-paper';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification} from 'firebase/auth';
import { setDoc , doc, updateDoc} from 'firebase/firestore';
import { Auth } from '../firebase';
import { db } from '../firebase';
import * as Application from 'expo-application'
import * as Device from 'expo-device';
import { signOut } from 'firebase/auth';
import { ALERT_TYPE, Dialog, AlertNotificationRoot } from 'react-native-alert-notification';
import Modalism from './Modalism';
import Modal from 'react-native-modal'

export class LoginAndSignUp extends Component {
    state ={
        IsSignUp:false,
        secureEntry: true,
        firstName: '',
        lastName: '',
        username:'',
        email:'',
        password:'',
        isLogin:false,
        visible: false,
        DeviceId: null,
        status: {},
        visible1:false,
        image:null,

    }

    getPhoneId = async () => {

      if (Platform.OS === 'android') {
      const AndriodId =  Device.deviceName.split(' ').join('').toLowerCase().trim() + Application.androidId.trim();
      this.setState({ DeviceId: AndriodId});
      } else if (Platform.OS === 'ios') {
        const id = await Application.getIosIdForVendorAsync();
        const iosId = Device.deviceName.split(' ').join('').toLowerCase().trim() + id.trim();
        this.setState({ DeviceId: iosId });
      }

    }

    handlecloseModalism = () => {
      signOut(Auth).
      then(()=> {
        this.setState({visible1:false, email:'', password:''});
      });

    }
    handleVerifyModalism =() => {
      const user = Auth.currentUser;
      sendEmailVerification(user)
     .then(() => {
      this.setState({visible1:false});
      Dialog.show({
        type: ALERT_TYPE.SUCCESS,
        title: 'Success',
        textBody: 'Successfully send reset password, please check your email account now!',
        button: 'close',
        onPressButton: ()=> {
          this.setState({
            email:'',
            password:'',
          })
          Dialog.hide();
        }
      })
     }).catch((err) => {
      console.log('error');
     })

    }

    handleChange = () => {
        this.setState({IsSignUp:!this.state.IsSignUp});
    }
    handleSubmit =  () => {

      Keyboard.dismiss();

      if(!this.state.email || !this.state.password){
        this.setState({visible: false});
        Dialog.show({
          type: ALERT_TYPE.DANGER,
          title: 'Oppps.',
          textBody: 'Please input all required fields.',
          button: 'close',
        })
        return;
      }

      this.setState({visible:true});

        if(this.state.IsSignUp){
          this.setState({visible:true});

          if(!this.state.firstName || !this.state.lastName){
            this.setState({visible: false});
            Dialog.show({
              type: ALERT_TYPE.DANGER,
              title: 'Oppps',
              textBody: 'Please input all required fields',
              button: 'close',
            })
            return;
          }

          createUserWithEmailAndPassword(Auth,
            this.state.email,
            this.state.password
          ).then((users) => {

            const user = Auth.currentUser;
            sendEmailVerification(user)
           .then(() => {
             const ref = doc(db, 'users', users.user.uid)
            setDoc(ref,{
                firstname: this.state.firstName,
                lastname: this.state.lastName,
                username: this.state.username,
                userId: users.user.uid,
                image: this.state.image,
                deviceId: this.state.DeviceId,
                registered: false,
                isSignUpTime: Date.now(),
                score:1,
            })

            this.setState({email:'', firstName:'', lastName: '', password:'', username:'', visible: false, DeviceId:''});
            Dialog.show({
              type: ALERT_TYPE.SUCCESS,
              title: 'SUCCESS!',
              textBody: 'Account created successfully, please check your email to verify your account.',
              button: 'close',
              onPressButton:()=> {
                Dialog.hide();
                setTimeout(() => {
                  this.setState({IsSignUp:false});
                }, 2000);
              }

            })

  })
  .catch((error) => {
    console.log('network error', error);
  });

        }).catch((error) => {

          let errorMessage = null;

            switch(error.code) {
              case "auth/missing-password":
                errorMessage = "Password is missing, please try again!";
              break;
              case "auth/invalid-email":
                errorMessage = "Email is in valid format, please try again!";
              break;
              case "auth/weak-password":
                errorMessage = "Password must be at least 6 characters long.";
              break;
              case 'auth/email-already-in-use':
                errorMessage = "User email already exists.";
              break;
              default:
            }

            if(errorMessage){
              this.setState({visible:false});
              Dialog.show({
                type: ALERT_TYPE.DANGER,
                title: 'Oppps.',
                textBody: errorMessage,
                button: 'close',
              })
            }

        })

        return;

        }

        signInWithEmailAndPassword(Auth,
          this.state.email,
          this.state.password
        ).then((users)=> {

          if(!users.user.emailVerified){
            this.setState({visible:false, visible1:true});
            return;
          }

          const data = doc(db, "users", users.user.uid);
          updateDoc(data, {
          score:1,
          }).then(()=>{
            const profile = {
              email: users.user.email,
              id: users.user.uid,
              deviceId: this.state.DeviceId,
            }

            this.setState({email:'',password:''});
            this.props.navigation.replace('Home', profile);

          }).catch(()=>{
            console.log('Newtwork is not stable');
            this.setState({visible:false, email:'', password:''})
          });

        }).catch((error) => {
          let errorMessage = null;
          this.setState({visible:false});

          switch(error.code) {
            case "auth/missing-password":
              errorMessage = "Password is missing, please try again!";
            break;
            case "auth/invalid-email":
              errorMessage = "Email is in valid format, please try again!";
            break;
            case "auth/weak-password":
              errorMessage = "Password must be at least 6 characters long.";
            break;
            case "auth/wrong-password":
              errorMessage = "Password is incorrect!";
            break;
            case 'auth/user-not-found':
              errorMessage = "Email is not registered!";
            break;
            case 'auth/too-many-requests':
              errorMessage = "Access to this account is temporarily disabled due to many failed login attemps. You can immediately restore it by resetting your password or you can try again later.";
            break;
            default:

          }

          if(errorMessage){
            Dialog.show({
              type: ALERT_TYPE.DANGER,
              title: 'Oppps.',
              textBody: errorMessage,
              button: 'close',
            })

          }

        })

    }
    handleShowPassword = () => {
        this.setState({secureEntry:!this.state.secureEntry});
    }

  componentDidMount(){
    this.getPhoneId();
  }

  render() {

    return (
      <>

<PaperProvider>

   <AlertNotificationRoot theme='dark'>

     <TouchableWithoutFeedback onPress={()=>Keyboard.dismiss()}>

      <SafeAreaView style={{
        flex: 1,
        position:'relative',
        backgroundColor: 'rgba(0, 0, 0, .8)',

      }}>

        <Image source={require('../assets/loginPage.png')}
         style={{
          position:'absolute',
          width:'100%',
          height:'100%',
         }}
        />
         <View style={{
           gap:10,
            zIndex:1,
            backgroundColor:'rgba(0, 0, 0, .8)',
            position:'absolute',
            height:'100%',
            width:'100%',
            justifyContent:'center',
            padding:15,
         }}>

      <Text>
        {this.state.IsSignUp ? (
            <View style={{
                justifyContent:'center',
                alignItems: 'center',
                width:360,

            }}>
                <Text style={{
                    fontSize:45,
                    opacity:0.8,
                    color:'white',
                    textAlign:'center',
                    fontWeight:'bold',
                }}>Reg<Text style={{
                    color:'coral',
                    fontWeight:'bold',
                }}>ister</Text></Text>
                <Text style={{
                    fontSize:10,
                    opacity:0.6,
                    color:'white',
                    textAlign:'center',

                    marginTop:5,
                }}>Fill out the form.</Text>
            </View>
        ) : (
            <View style={{
                justifyContent:'center',
                alignItems: 'center',
                width:370,
                alignSelf:'center',
                marginLeft:20,
            }}>
               <Modalism visible={this.state.visible1} handlecloseModalism={this.handlecloseModalism} handleVerifyModalism={this.handleVerifyModalism} email={this.state.email}/>
                <Text style={{
                    fontSize:30,
                    opacity:0.8,
                    color:'white',
                    textAlign:'center',

                }}>Hello there,</Text>
                <Text style={{
                    fontSize:30,
                    opacity:0.8,
                    color:'white',
                    textAlign:'center',
                }}>Welcome to <Text style={{
                    fontWeight:'bold',
                }}>Ani</Text><Text style={{
                    color:'coral',
                    fontWeight:'bold',
                }}>mist.</Text></Text>
            </View>
        )}
      </Text>
      {this.state.IsSignUp && (
        <View style={{
            gap:10,
        }}>
            <TextInput
                  mode='outlined'
                  activeOutlineColor='coral'
                  outlineColor='white'
                  placeholder="e.g Firstname"
                  textColor="gray"
                  value={this.state.firstName}
                  onChangeText={(val)=> this.setState({firstName:val})}
                  placeholderTextColor='gray'
                  style={{
                    opacity:0.9,
            }}

            />
            <TextInput
            mode='outlined'
            activeOutlineColor='coral'
            outlineColor='white'
            placeholder="e.g Lastname"
            textColor="gray"
            placeholderTextColor='gray'
            value={this.state.lastName}
                  onChangeText={(val)=> this.setState({lastName:val})}
            style={{
              opacity:0.9,
      }}
            />
            <TextInput
            mode='outlined'
            activeOutlineColor='coral'
            outlineColor='white'
            placeholder="e.g Username"
            textColor="gray"
            placeholderTextColor='gray'
            value={this.state.username}
                  onChangeText={(val)=> this.setState({username:val})}
            style={{
              opacity:0.9,
      }}
            />
        </View>
      )}
      <TextInput
      mode='outlined'
      activeOutlineColor='coral'
      outlineColor='white'
      placeholder="e.g Email address"
      textColor="gray"
      placeholderTextColor='gray'
      value={this.state.email}
      onChangeText={(val)=> this.setState({email:val})}
      style={{
        opacity:0.9,
      }}
      />
      <TextInput
      placeholder="e.g Password"
      placeholderTextColor='gray'
      mode='outlined'
      outlineColor='white'
      activeOutlineColor='coral'
      secureTextEntry={this.state.secureEntry}
      value={this.state.password}
      onChangeText={(val)=> this.setState({password:val})}
      style={{
        marginBottom:10,
        opacity:0.9,
      }}
      right={<TextInput.Icon icon={this.state.secureEntry? 'eye-off' : 'eye'} onPress={this.handleShowPassword} />}
      />

      {!this.state.IsSignUp && (
        <TouchableOpacity onPress={()=> {
          this.props.navigation.navigate('ForgetPass');
        }}>
         <Text style={{
          color:'coral',
         alignSelf:'flex-end',
         marginRight:10,
         marginBottom:10,
         fontWeight:'bold',
         opacity:1,
        }}>Forget Password.</Text>
         </TouchableOpacity>
      )}

      <Button icon={this.state.IsSignUp? "account-plus": "key-variant"} loading={this.state.isLogin} textColor='white' labelStyle={{
        fontSize:20,
        marginTop:13,
      }} mode="outlined" onPress={this.handleSubmit} style={{
        padding:5,
        backgroundColor:'coral',
        borderWidth:0,
        width:330,
        marginLeft:17,
        opacity:0.9,
      }}>
        {this.state.IsSignUp ? 'REGISTER' : 'LOGIN'}
      </Button>
      <View style={{
        flexDirection:'row',
        gap:2,
        alignSelf:'center',

        marginVertical:5,
      }}>
      <Text style={{
        color:'white',
        opacity:0.9,
      }}>{this.state.IsSignUp? 'Do you have an account?': `Don't have an account?`}</Text>
      <TouchableOpacity onPress={this.handleChange}>
      <Text style={{
        color:'coral',
        fontWeight:'bold',
        fontStyle:'italic',
        opacity:0.9,
      }}>{this.state.IsSignUp? 'Login here.': `Register here.`}</Text>
      </TouchableOpacity>
      </View>
        </View>

      <View>
      <Modal isVisible={this.state.visible} animationIn='slideInLeft'>
        <View style={{ height:70,
        borderColor:'red',
        marginHorizontal:20,
        borderRadius:5,
        flexDirection:'row',
        justifyContent:'center',
        alignItems:'center',
        backgroundColor:'rgba(0,0,0,0.9)',
        gap:5,
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
          <ActivityIndicator animating={true} color='coral' size={25} style={{
              opacity:0.8,
              position:'relative',
              left:-10,
            }}/>

          <Text style={{
              fontSize:25,
              opacity:0.8,
              position:'relative',
              left:-5,
              color:'white',
              fontWeight:'bold',
            }}>{!this.state.IsSignUp ? 'Loggin in ..' : 'Registering ..'}</Text>
        </View>
      </Modal>
    </View>

      </SafeAreaView>
        </TouchableWithoutFeedback>
        </AlertNotificationRoot>
    </PaperProvider>

      </>
    )
  }
}

export default LoginAndSignUp