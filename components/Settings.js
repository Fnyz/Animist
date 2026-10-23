import { Text, View, TouchableOpacity, ActivityIndicator, ScrollView} from 'react-native'
import React, { Component } from 'react'
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context'
import { Avatar, TextInput } from 'react-native-paper';
import { EvilIcons } from '@expo/vector-icons';
import { myContext } from '../context';
import { doc, updateDoc} from 'firebase/firestore';
import { db } from '../firebase';
import { MaterialIcons } from '@expo/vector-icons';
import VideoLoad from './VideoLoading';
import { Entypo } from '@expo/vector-icons';
import Modal from './AppModal'
import { animedata } from '../animeData';
import { DEFAULT_AVATARS, avatarFor } from '../avatars';
import { Image } from 'expo-image';
import AnimistLoading from './AnimistLoading';

const Box = React.memo(({spyFamily, OnePiece, comedy, blackClover, image, handleCloseModal, pickImage, handlePickImage, click, handleSave}) => {

  return (
    <View style={{
      backgroundColor:'rgba(0,0,0,0.8)',
      height:625,
      padding:15,
    }}>
      <View style={{
        flexDirection:'row',
        justifyContent:'space-between',
        alignItems:'center'
      }}>
      <Text style={{
        color:'white',
        fontWeight:'bold',
        marginTop:5,
      }}><Text style={{
        color:'coral',
        fontWeight:'bold',
        fontSize:20,
      }}>|</Text> Choose your favorite image</Text>
      {click && (
        <TouchableOpacity onPress={handleSave}>
        <Text style={{
          color:'coral',
          fontWeight:'bold',
          marginRight:10,
          paddingTop:10,
        }}>SAVE</Text>
        </TouchableOpacity>
      )}

      </View>

      <View style={{
        marginTop:15,
      }}>
        <Text style={{
          color:'white',
          opacity:0.8,
          marginBottom:10,
        }}>Cute avatars</Text>
        <ScrollView horizontal={true}>
          {DEFAULT_AVATARS.map((uri)=> (
            <TouchableOpacity key={uri} style={{ marginRight:10 }} onPress={()=> handlePickImage(uri)}>
              <View style={{
                borderWidth:image === uri ? 1 : null,
                borderColor:image === uri ? 'coral': null,
                padding:2,
                borderRadius:50,
              }}>
                <Image style={{ width: 70, height: 70, borderRadius:50 }} source={{uri}} contentFit="cover" transition={300} />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={{
        marginTop:15,
      }}>
        <Text style={{
          color:'white',
          opacity:0.8,
          marginBottom:10,
        }}>Spy x Family</Text>
        <ScrollView horizontal={true}>
          {spyFamily.map((item, i)=> {
            return (
             <TouchableOpacity key={item.id} style={{
              marginRight:10,
             }} onPress={()=> handlePickImage(item.image)}>
          <View style={{
            borderWidth:image === item.image ? 1 : null,
            borderColor:image === item.image ? 'coral': null,
            padding:2,
            borderRadius:50,
          }}>
          <Image
        style={{ width: 70, height: 70, resizeMode:'cover', borderRadius:50}}
        source= {{uri:item.image}}
        contentFit="cover"
        transition={1000}
      />
          </View>

             </TouchableOpacity>

            )
          })}
        </ScrollView>

        <Text style={{
          color:'white',
          opacity:0.8,
          marginBottom:10,
          marginTop:15,
        }}>One piece</Text>
        <ScrollView horizontal={true}>
          {OnePiece.map((item, i)=> {
            return (

             <TouchableOpacity key={item.id} style={{
              marginRight:10,
             }} onPress={()=> handlePickImage(item.image)} >
               <View style={{
                borderWidth:image === item.image ? 1 : null,
                borderColor:image === item.image ? 'coral': null,
                padding:2,
                borderRadius:50,
              }}>
          <Image
        style={{ width: 70, height: 70, resizeMode:'cover', borderRadius:50}}
        source= {{uri:item.image}}
        contentFit="cover"
        transition={1000}
      />
        </View>
             </TouchableOpacity>

            )
          })}
        </ScrollView>

        <Text style={{
          color:'white',
          opacity:0.8,
          marginBottom:10,
          marginTop:15,
        }}>Black Clover</Text>
        <ScrollView horizontal={true}>
          {blackClover.map((item, i)=> {
            return (

             <TouchableOpacity key={item.id} style={{
              marginRight:10,
             }} onPress={()=> handlePickImage(item.image)}>
              <View style={{
                borderWidth:image === item.image ? 1 : null,
                borderColor:image === item.image ? 'coral': null,
                padding:2,
                borderRadius:50,
              }}>
          <Image
        style={{ width: 70, height: 70, resizeMode:'cover', borderRadius:50}}
        source= {{uri:item.image}}
        contentFit="cover"
        transition={1000}
      />
      </View>
             </TouchableOpacity>

            )
          })}
        </ScrollView>

        <Text style={{
          color:'white',
          opacity:0.8,
          marginBottom:10,
          marginTop:15,
        }}>Comedy</Text>
        <ScrollView horizontal={true}>
          {comedy.map((item, i)=> {
            return (
             <TouchableOpacity key={item.id} style={{
              marginRight:10,
             }} onPress={()=> handlePickImage(item.image)}>
               <View style={{
                borderWidth:image === item.image ? 1 : null,
                borderColor:image === item.image ? 'coral': null,
                padding:2,
                borderRadius:50,
              }}>
          <Image
        style={{ width: 70, height: 70, resizeMode:'cover', borderRadius:50}}
        source= {{uri:item.image}}
        contentFit="cover"
        transition={1000}
      />
      </View>
             </TouchableOpacity>

            )
          })}
        </ScrollView>
        <TouchableOpacity style={{
         borderWidth:1,
         marginTop:20,
         borderColor:'coral',
         paddingVertical:15,
         justifyContent:'center',
         alignItems:'center',
         borderRadius:5,
        }} onPress={pickImage}>
          <Text style={{
            color:'coral',
          }}>Choose image from gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={()=> handleCloseModal()}>
          <Text style={{
            color:'white',
            textAlign:'center',
            marginTop:15,
            opacity:0.6,
            fontWeight:'bold'
          }}>Skip from now</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
})

export class Settingss extends Component {
  static contextType = myContext;

  constructor(props){
    super(props);
    this.state = {
        firstname:'',
        lastname:'',
        username:'',
        image:null,
        isclick:false,
        timeout:3,
        startCount:false,
        visible:false,
        spyFamily:[],
        OnePiece:[],
        comedy:[],
        blackClover:[],
        click:false,
        loading:true,
    }

  }

  handleShowModal=()=>{
    this.setState({visible:true});
  }

  handleCloseModal=()=>{
    const {profile} = this.context;
    this.setState({visible:false, image: profile[0].data.image });
  }

  handlePickImage = (url) => {
    this.setState({image:url, click:true})
  }

  handleSave = () => {
    this.setState({click:false, visible:false})
  }

  handleUpdateAcount = async () => {
    this.setState({isclick:true, startCount:false});
    const {profile} = this.context;
    const ref = doc(db, "users", profile[0].id);
    updateDoc(ref, {
          firstname: this.state.firstname,
          lastname: this.state.lastname,
          username: this.state.username,
          image: this.state.image,
     }).then(()=>{

        this.setState({isclick:false});
        this.props.navigation.goBack();
     })

  }
  pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if(result.canceled){
        return null;
      }
      if (!result.canceled) {
       this.setState({image: result.assets[0].uri, visible:false})
      }
};

  componentDidMount(){

    const spyFamily = animedata.filter(item => item.category === 'spyFamily');
    const OnePiece = animedata.filter(item => item.category === 'OnePiece');
    const funny = animedata.filter(item => item.category === 'funny');
    const blackClover = animedata.filter(item => item.category === 'blackClover');

    const {profile} = this.context;
    this.setState({
        firstname: profile[0].data.firstname,
        lastname: profile[0].data.lastname,
        username: profile[0].data.username,
        image: profile[0].data.image,
        spyFamily,
        OnePiece,
        comedy:funny,
        blackClover,
     })

     setTimeout(() => {
      this.setState({loading:false})
     },3000);

  }

  render() {

    if(this.state.loading){
      return (
        <SafeAreaView style={{
          backgroundColor: 'rgba(0, 0, 0, .8)',
          flex:1,
          justifyContent:'center',
          alignItems:'center',
        }}>
          <AnimistLoading />
        </SafeAreaView>
      )
    }

    return (

      <SafeAreaView style={{
        flex:1,
        backgroundColor:'rgba(0,0,0,0.8)',
        position:'relative',
      }}>
        {this.state.isclick && (
        <View style={{
            position:'absolute',
            backgroundColor:'rgba(0,0,0,0.7)',
            zIndex:100,
            width:'100%',
            height:'100%',
            justifyContent:'center',
            alignItems: 'center',
        }}>
            <VideoLoad message='Please wait your profile is updated.' />
        </View>
        )}

        <View style={{
             flexDirection:'row',
             justifyContent:'center',
             alignItems:'center',
             gap:5,
             marginTop:15,
        }}>

        <MaterialIcons name="live-tv" size={25} color="coral" style={{
          opacity:0.8
        }}/>
         <Text style={{
           fontSize:20,
           fontWeight:'bold',
           color:'white',
           opacity:0.8,

          }}>
            Ani<Text style={{
              color:'coral',
              textAlign:'center',
              fontWeight:'bold',
            }}>mist</Text>
          </Text>
          <Text style={{
            color:'coral',
            fontSize:20,
            fontWeight:'bold',
          }}>/</Text>
          <Text style={{
            color:'white',
            fontSize:20,
            fontWeight:'bold',
            opacity:0.7,
          }}>Profile.</Text>

        </View>

        <View style={{
            marginTop:30,
            justifyContent:'center',
            alignItems:'center',
            position:'relative',
            opacity:0.9,
        }}>
           <View style={{
          borderWidth:1,
          padding:5,
          borderRadius:100,
          borderColor:'coral',
          }}>
       <Avatar.Image size={100} source={{uri: this.state.image || avatarFor(this.context.profile?.[0]?.data.userId)}} />
         </View>
        <TouchableOpacity style={{
            borderRadius:10,
            justifyContent:'center',
            alignItems:'center',
            padding:5,
            backgroundColor:'coral',
            position:'absolute',
            bottom:0,
            right:150,
        }} onPress={this.handleShowModal}>
        <View>
        <EvilIcons name="pencil" size={20} color="white" />
        </View>
        </TouchableOpacity>
        </View>

    <View style={{
        marginHorizontal:10,
    }}>
    <Text style={{
        color:'white',
        opacity:0.6,
        marginTop:25
    }}>Firstname</Text>
    <TextInput
  mode='outlined'
  activeOutlineColor='coral'
  outlineColor='white'
  textColor="gray"
  placeholderTextColor='gray'
  value={this.state.firstname}
  style={{
    opacity:0.9,
  }}
  onChangeText={val => this.setState({firstname:val})}
  />
   <Text style={{
        color:'white',
        opacity:0.6,
        marginTop:15
    }}>Lastname</Text>
     <TextInput
  mode='outlined'
  activeOutlineColor='coral'
  outlineColor='white'
  textColor="gray"
  placeholderTextColor='gray'
  value={this.state.lastname}
  onChangeText={val => this.setState({lastname:val})}
  style={{
    opacity:0.9,
  }}
  />
   <Text style={{
        color:'white',
        opacity:0.6,
        marginTop:15
    }}>Username</Text>
     <TextInput
  mode='outlined'
  activeOutlineColor='coral'
  outlineColor='white'
  textColor="gray"
  placeholderTextColor='gray'
  value={this.state.username}
  onChangeText={val => this.setState({username:val})}
  style={{
    opacity:0.9,
  }}
  />
  <View style={{
    marginTop:15,
    flexDirection:'row',
    gap:5,
  }}>
  <Text style={{
    color:'white',
    opacity:0.8
  }}>Do you want to change your password?</Text>
  <TouchableOpacity onPress={()=> this.props.navigation.navigate('UpdatePass')}>
  <Text style={{
    color:'coral',
    fontWeight:'bold',
    opacity:0.9,
  }}>Click here.</Text>
  </TouchableOpacity>
  </View>

    <View style={{
        marginTop:20,
        flexDirection:'row',
        gap:10,
    }}>
       <TouchableOpacity onPress={this.handleUpdateAcount}>
       <View style={{
            borderWidth:1,
            paddingVertical:this.state.isclick ? 14:15,
            width:180,
            justifyContent:'center',
            alignItems:'center',
            backgroundColor:'coral',
            borderBottomLeftRadius:15,
        }}>
            {this.state.isclick ? (
                <View style={{
                    flexDirection:'row',
                    justifyContent:'center',
                    alignItems:'center',
                    gap:10,
                }}>
                    <ActivityIndicator size="small" color="white" />
                    <Text style={{
                    color:'white',
                    fontWeight:'bold',
                }}>UPDATING...</Text>
                </View>

            ): (
                <Text style={{
                    color:'white',
                    fontWeight:'bold',
                }}>UPDATE</Text>
            )}
        </View>

       </TouchableOpacity>

      <TouchableOpacity onPress={()=> this.props.navigation.goBack()}>
      <View style={{
            borderWidth:1,
            paddingVertical:15,
            width:180,
            justifyContent:'center',
            alignItems:'center',
            borderColor:'coral',
            borderBottomRightRadius:15,
        }}>
            <Text style={{
                color:'coral',
                fontWeight:'bold',
                fontSize:15,
            }}><Entypo name="home" size={17} color="coral"/> {this.state.startCount ?this.state.timeout:'HOME' }</Text>
        </View>

      </TouchableOpacity>

    </View>
        </View>

        <Modal isVisible={this.state.visible} animationIn='slideInLeft' animationOut='fadeOut'>
        <Box
        image={this.state.image}
        handleCloseModal={this.handleCloseModal}
        handlePickImage={this.handlePickImage}
        pickImage={this.pickImage}
        spyFamily={this.state.spyFamily}
        OnePiece={this.state.OnePiece}
        comedy={this.state.comedy}
        blackClover={this.state.blackClover}
        handleSave={this.handleSave}
        click={this.state.click}
         />
       </Modal>

      </SafeAreaView>
    )
  }
}

export default Settingss