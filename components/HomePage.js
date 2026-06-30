import { View, ScrollView, StatusBar, Linking, Platform, TouchableOpacity, Image, ActivityIndicator} from 'react-native'
import React, { Component } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import Swiper from 'react-native-swiper'
import axios from 'axios'
import {Text} from 'react-native-paper';
import TopAnime from './TopAnime'
import RecentRelease from './RecentRelease'
import Popular from './Popular'
import TopMovies from './TopMovies'
import Profile from './Profile'
import { PaperProvider } from 'react-native-paper';
import TitlePage from './TitlePage'
import { Auth, db} from '../firebase'
import {doc, onSnapshot} from 'firebase/firestore'
import { Modal, Portal } from 'react-native-paper';
import { signOut } from 'firebase/auth'
const containerStyle = {backgroundColor: "rgba(0,0,0,0.9)", padding: 20, margin:10, position: 'relative'};
import AsyncStorage from '@react-native-async-storage/async-storage';
import { myContext } from '../context'
import VideoLoad from './VideoLoading'
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import { AntDesign } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';

export class HomePage extends Component {

  static contextType = myContext;

  state = {
    releaseAnime: [],
    topAnime: [],
    popAnime: [],
    movieAnime: [],
    open:false,
    jusclick:false,
    load:true,
    visible:false,
    userId: '',
    username: '',
    firstname:'',
    lastname:'',
    storageData:[],
    image: null,
    error:null,
    refresh:false,
    errorTrap:0,
    isclick:false,
    isclick1:false,
    isclick2:false,

    spin:false,
  }

  fetchAndUpdateData = () => {

      const endpoint = [
        'https://consumet-api-funk.onrender.com/anime/gogoanime/recent-episodes',
        'https://consumet-api-funk.onrender.com/anime/gogoanime/top-airing',
        'https://webdis-jthh.onrender.com/popular',
        'https://webdis-jthh.onrender.com/anime-movies',
      ]

      const requests = endpoint.map(url => axios.get(url));

      Promise.all(requests)
      .then(response => {
        let cleanStorage = {
          rAnime: response[0].data?.results.slice(0,10),
          tAnime: response[1].data?.results.slice(0,10),
          pAnime: response[2].data.slice(0,10),
          mAnime: response[3].data.slice(0,10)
         }

        if(!cleanStorage.tAnime.length){
          this.setState({errorTrap:1})
        }

        AsyncStorage.setItem('serverData', JSON.stringify(cleanStorage))
        .then(()=> {
          this.setState({
            releaseAnime: cleanStorage.rAnime,
            topAnime: cleanStorage.tAnime,
            popAnime: cleanStorage.pAnime,
            movieAnime: cleanStorage.mAnime,
            refresh:false, spin:false
            });

        })

      }).catch(error => {
        this.setState({ refresh: true, spin: false });
      })

  };

  handleSendMessage = async () => {
    const pageId = '100053584361127';

    const url = Platform.select({
      ios: `fb-messenger://user-thread/${pageId}`,
      android: `https://m.me/${pageId}`,
    });

    const canOpen = await Linking.canOpenURL(url);

    if (canOpen) {
      Linking.openURL(url);
    } else {
      console.log('Cannot open Messenger app');
    }
  };

  fetchEndpoint2 = () => {
    this.setState({isclick:true})
    axios.get('https://consumet-api-funk.onrender.com/anime/gogoanime/top-airing')
    .then(response => {
      this.setState({topAnime: response.data?.results.slice(0,10), isclick:false, errorTrap:0})
    })
    .catch(error => {
      this.setState({errorTrap:1})
    });

  }

  updateInterval = () => {
    this.intervalId = setInterval(() => {
      this.fetchAndUpdateData();
    }, 60000);
  }

  handleFetchReload = () => {
    this.setState({ spin: true, refresh: false });
    this.fetchAndUpdateData();
  }

  componentDidMount(){

    this.fetchAndUpdateData();
    const dts = this.context;
    this.fetchData();
    this.updateInterval();

    const deviceId = this.props.route.params.deviceId;
    const userId = this.props.route.params.id;
    const docRef = doc(db, "users", userId);

    try {

      this.unsubscribeUser = onSnapshot(docRef, (doc) => {

        if(doc.data().score === 1){

          if(doc.data().deviceId === deviceId && doc.data().registered){
            dts.setUserIdhere(doc.data().userId, doc.data().username);
            this.setState({
              visible: false,
              username: doc.data().username,
              firstname: doc.data().firstname,
              lastname: doc.data().lastname,
              image: doc.data().image,
            });
         }else{
            this.setState({visible: true,
              username: doc.data().username,
              firstname: doc.data().firstname,
              lastname: doc.data().lastname,
              image: doc.data().image,
            });

          }

        }else{
          setTimeout(() => {
            signOut(Auth).then(() => {
              this.props.navigation.replace('SignUpAndSignIn');
             }).catch((error) => {
              console.log('error', error);
             });
          }, 3000);
        }

      })

    } catch (error) {
      console.log('there was an error!', error)
    }

  }

  componentWillUnmount() {
    clearInterval(this.intervalId);
    if (this.unsubscribeUser) this.unsubscribeUser();
  }

  fetchData = () => {

    AsyncStorage.getItem('serverData').then((cachedData)=>{
      if (cachedData) {
        const resData = JSON.parse(cachedData);
        this.setState({
          releaseAnime: resData.rAnime,
          topAnime: resData.tAnime,
          popAnime: resData.pAnime,
          movieAnime: resData.mAnime,
         })
      }
    }).catch((error)=>{
      console.log('there was an error', error)
    })

  };

  render() {
    return (
      <>
  <PaperProvider>

      <SafeAreaView style={{
        flex:1,

      }}>
        <StatusBar backgroundColor="rgba(0, 0, 0, .8)" style="dark-content" />

          <View style={{
            flex:1,
            backgroundColor: 'rgba(0, 0, 0, .8)',

          }}>
            <TitlePage navigation = {this.props.navigation} />
          <Profile navigation={this.props.navigation} usersData = {this.state}/>
          {this.state.refresh ? (
            <View style={{
              flex:1,
              justifyContent:'center',
              alignItems:'center',
            }}>
              <Text style={{
                color:'white',
              }}>Something is wrong on the internet, please reload now.</Text>
              <TouchableOpacity onPress={this.handleFetchReload}>
              {this.state.spin ? (
                <ActivityIndicator size="large" color="coral" style={{
                  marginTop:30,
                }}/>
              ): (
<Ionicons name="reload" size={30} color="coral" style={{
                marginTop:30,
              }}/>
              )}
              </TouchableOpacity>
            </View>
          ): !this.state.releaseAnime.length ? (
             <View style={{
              flex:1,
            }}>
              <VideoLoad message='Please wait sensie ...'/>
            </View>
          ): (
          <View style={{
            flex:1,
          }}>
          <ScrollView style={{
            height:100,
          }}>
        <View style={{
          height:335,
        }}>
        <View style={{
          flexDirection:'row',
          justifyContent:'space-between',
          marginHorizontal:15,
          marginVertical:10,
        }}>

        <Text style={{
          color:'white',
          opacity:0.5,
          fontSize:15,

        }}>New episodes</Text>

        </View>

          <Swiper
          autoplay
          dot={
            <View
            style={{
              backgroundColor: 'white',
              width: 5,
              height: 5,
              borderRadius: 4,
              marginLeft: 3,
              marginRight: 4,
              marginTop: 3,
              marginBottom: 3,
              }}
              />
          }
          activeDot={
            <View
            style={{
              backgroundColor: 'coral',
                width: 8,
                height: 8,
                borderRadius: 4,
                marginLeft: 3,
                marginRight: 3,
                marginTop: 3,
                marginBottom: 3,
              }}
              />
            }
            paginationStyle={{
              bottom:350,
              left: null,
              right: 70,
          }}
          loop
        >
        {this.state?.releaseAnime.map((anime, i) => {
          return (

            <View key={i}>
              <RecentRelease {...anime} navigation = {this.props.navigation} />
            </View>
          )
        })}
        </Swiper>

        </View>

          <TopAnime navigation = {this.props.navigation} topAnime = {this.state.topAnime} isclick={this.state.isclick} error={this.state.errorTrap} fetchEndpoint2={this.fetchEndpoint2}/>
          <Popular navigation = {this.props.navigation} popAnime = {this.state.popAnime}/>
          <TopMovies navigation = {this.props.navigation} movieAnime = {this.state.movieAnime}/>
        </ScrollView>

        </View>
          )}
        </View>

        <Portal>
        <Modal visible={this.state?.visible}  contentContainerStyle={containerStyle} >
            <Image source={require('../assets/icons8-sharingan-48.png')} style={{
              position:'absolute',
              top:-25,
              zIndex:1,
              right:5,
            }}/>
            <Text style={{
              color:'white',
              opacity:0.8,
            }}>Hello from Ani<Text style={{
              color:'coral',
            }}>mist</Text> <MaterialCommunityIcons name="hand-wave-outline" size={20} color="coral" style={{
              opacity:0.7
            }} /></Text>
            <Text style={{
              color:'white',
              fontWeight:'bold',
              marginBottom:10,
              marginTop:5,
              opacity:0.8,
            }}>Sorry, you are not a registered person, please contact the administrator. Thank you!</Text>
            <TouchableOpacity onPress={this.handleSendMessage} style={{

              borderWidth:1,
              borderColor:'coral',
              alignSelf:'center',
              width:'100%',
              justifyContent:'center',
              alignItems:'center',
              padding:10,
              borderRadius:5,
              marginTop:10,
              opacity:0.9,
            }}>
              <View style={{
                flexDirection:'row',
                gap:5,
              }}>
              <FontAwesome5 name="facebook-messenger" size={15} color="coral" />
              <Text style={{
                color:'coral',
              }}>Send message</Text>
              </View>

            </TouchableOpacity>
            <TouchableOpacity style={{
              backgroundColor:'coral',
              alignSelf:'center',
              width:'100%',
              justifyContent:'center',
              alignItems:'center',
              padding:10,
              borderRadius:5,
              marginTop:10,
              opacity:0.9,
            }} onPress={()=> {
               signOut(Auth).then(() => {
                this.props.navigation.replace('SignUpAndSignIn');
               })
            }}>
              <Text style={{
                color:'white',
                fontWeight:'bold',
                fontSize:15,
              }}><AntDesign name="login" size={17} color="white" /> LOG-OUT</Text>
            </TouchableOpacity>

        </Modal>

      </Portal>

      </SafeAreaView>

        </PaperProvider>
  </>
    )
  }
}

export default HomePage