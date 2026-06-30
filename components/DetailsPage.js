import { Text, View, TouchableOpacity, ScrollView, ActivityIndicator} from 'react-native'
import React, { Component } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AnimistLoading from './AnimistLoading';
import { FontAwesome } from '@expo/vector-icons';
import { myContext } from '../context';
import { Feather } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { addDoc, collection, serverTimestamp , doc, deleteDoc} from 'firebase/firestore';
import { db } from '../firebase';
import MessageModal from './MessageModal';
import AddedToList from './AddedtoListModal';
import { Image } from 'expo-image';
import { MotiView, MotiText } from 'moti';
import { Ionicons } from '@expo/vector-icons';

export class DetailsPage extends Component {

  static contextType = myContext;
  dt = this.static;

  constructor(props) {
    super(props);

    this.state = {
      singleAnime: {},
      episodesDetails:false,
      load:true,
      animeIds:null,
      isWatchList:false,
      visible: false,
      idToDelete: null,
      visible1: false,
      loadNow: false,
      loadings:false,
      epinumber:null,
    }
  }

  deletDocsss = (id) => {
    this.setState({loadNow: true});
     deleteDoc(doc(db, 'watchList', id))
    .then(()=>  this.setState({isWatchList:false, visible: false, loadNow: false}));
  };
  hideModal = () =>  this.setState({visible:false, isWatchList:false});
  handleWatchlist = async (titleId) => {
    this.setState({isWatchList:true});
    const ls = this.context;

    const ext  = ls.userWatchList.find(w => w.data.titleId === titleId)

    if(ext){
      this.setState({visible:true, idToDelete:ext.id});

      return;
    }else{
      await addDoc(collection(db, 'watchList'), {
        name: ls.userData.user,
       userId: ls.userData.id,
       titleId,
       createdAt: serverTimestamp(),
    }).then(()=>{
      this.setState({isWatchList:false, visible1:true});
      setTimeout(() => {
        this.setState({visible1:false});
      }, 2000);
    });

    }

  }

  handleEpisode =(epData, animeTitle, subOrDub,status, image) => {

    this.props.navigation.navigate('Episodes',{
      epData,
      title:animeTitle,
      subOrDub,
      status,
      image,
      titleId:this.state.animeIds,
      watchListData:[],
    });

  }

  handleGobacktoHome = async () => {
   this.props.navigation.navigate('Home');
  }
  getSingleAnime = async () => {

    try {
      const title = this.props.route.params.animeId;
      const url = `https://consumet-api-funk.onrender.com/anime/gogoanime/info/${title}`;
      const { data } = await axios.get(url);
      this.setState({
              singleAnime: data,
              animeIds:title,

      });
  } catch (err) {
      console.log('this an error in details page', err) ;
  }
  }
 componentDidMount() {
  this.focusListener = this.props.navigation.addListener('focus', this.handleFocus);
  this.getSingleAnime();
 }

handleFocus = () => {
  this.setState({loadings:true})
  setTimeout(() => {
    this.setState({loadings:false})
  },3000);
};

  render() {

    const {title, type, releaseDate, status, genres, description, image, subOrDub, episodes, otherName} = this.state.singleAnime;
    const dt = this.context;
    const titleId = this.props.route.params.animeId;
    const {historyRecords, userWatchList} = dt;
    let res = historyRecords.find(a => a?.data.count === 1 && a?.data.titleId === titleId);
    let res1 = userWatchList.find(a => a?.data.titleId === titleId);

    return (

      <SafeAreaView style={{
        backgroundColor: 'rgba(0, 0, 0, .8)',
        flex:1,
        alignItems:'center',
      }} >

        {!image ? (
          <View style={{
            justifyContent:'center',
            alignItems:'center',
            flex:1,
          }}>
           <AnimistLoading/>
          </View>
        ): (

          <>

          <View style={{
            margin:10,
            height:730,
          }}>

          <ScrollView style={{
            paddingBottom:15,
            height:'100%',
          }}>
            <MotiView
            from={{
              translateX:-100,
              opacity:0,
            }}
            animate={{
              translateX:0,
              opacity:1
            }}
            transition={{
              type:'spring',
              delay:400,
            }}
            >
            <Image
        style={{
          width:'100%',
          height:undefined,
          aspectRatio:1,
          opacity:0.9,
          borderRadius:5,
        }}
        source={{uri:image}}
        contentFit="cover"
        transition={1000}
      />

            </MotiView>

         <MotiText
         from={{
          opacity:0,
          top:20,
         }}
         animate={{
          opacity:1,
          top:0,
         }}
         transition={{
          type:'timing',
          delay:600,
         }}
         style={{
          marginTop:5,
          color:'coral',
          fontSize:17,
          textAlign:'center',
         }}><Text style={{
          color:'white',
          fontWeight:'bold',
          opacity:0.8,
         }}>/</Text> {title}.</MotiText>

         <MotiView
         from={{
          opacity:0,
          top:20,
         }}
         animate={{
          opacity:1,
          top:0,
         }}
         transition={{
          type:'timing',
          delay:700,
         }}
         >
         <Text style={{marginTop:10, opacity:0.5, color:'white'}}>Other name: </Text>
         <Text style={{
          marginTop:2,
          color:'white',
          fontSize:12,
          opacity:0.9,
          fontWeight:'bold',
         }}>{otherName}.</Text>
         </MotiView>

         <MotiView
         from={{
          opacity:0,
          top:20,
         }}
         animate={{
          opacity:1,
          top:0,
         }}
         transition={{
          type:'timing',
          delay:800,
         }}
         style={{
          flexDirection:'row',
          marginTop:5,
         }}>

         <Text style={{ opacity:0.5, color:'white'}}>Type: </Text>
         <Text style={{
          marginTop:2,
          color:'white',
          fontSize:12,
          opacity:0.9,
          fontWeight:'bold',
         }}>{type}.</Text>

         </MotiView>

         <MotiView
         from={{
          opacity:0,
          top:20,
         }}
         animate={{
          opacity:1,
          top:0,
         }}
         transition={{
          type:'timing',
          delay:900,
         }}
         style={{
          flexDirection:'row',
          marginTop:5,
          alignItems:'center',
         }}>

         <Text style={{opacity:0.5, color:'white',  fontWeight:'bold',}}>Genre: </Text>
         <Text style={{
           marginTop:2,
           color:'white',
           fontSize:13,
           opacity:0.9,
          }}>{genres.join(', ')}.</Text>
          </MotiView>

         <MotiView
         from={{
          opacity:0,
          top:20,
         }}
         animate={{
          opacity:1,
          top:0,
         }}
         transition={{
          type:'timing',
          delay:1000,
         }}
         style={{
           flexDirection:'row',
           marginTop:5,
           alignItems:'center',
         }}>

         <Text style={{ opacity:0.5, color:'white'}}>Released: </Text>
         <Text style={{
          marginTop:2,
          color:'white',
          fontSize:12,
          opacity:0.9,
          fontWeight:'bold',
         }}>{releaseDate}.</Text>

         </MotiView>

        <MotiView
        from={{
          opacity:0,
          top:20,
         }}
         animate={{
          opacity:1,
          top:0,
         }}
         transition={{
          type:'timing',
          delay:1100,
         }}
        style={{
          flexDirection:'row',
                    marginTop:5,
                    alignItems:'center',

        }}>

        <Text style={{opacity:0.5, color:'white'}}>Status: </Text>
         <Text style={{
          marginTop:2,
          color:'coral',
          fontSize:12,
          opacity:0.9,
          fontWeight:'bold',
        }}>{status}.</Text>

        </MotiView>

        <MotiView
        from={{
          opacity:0,
          top:20,
         }}
         animate={{
          opacity:1,
          top:0,
         }}
         transition={{
          type:'timing',
          delay:1200,
         }}
        >
        <Text style={{marginTop:5, opacity:0.5, color:'white'}}>Plot Summary: </Text>
         <Text style={{
           marginTop:2,
           color:'white',
           fontSize:13,
           opacity:0.9,
           marginBottom:12,
          }}>{description}.</Text>
        </MotiView>
        </ScrollView>
          </View>

          <View style={{
          flexDirection:'row',
          alignItems:'center',
          justifyContent:'center',
          paddingTop:10,
          gap:10,
         }}>
          <TouchableOpacity disabled={this.state.loadings} onPress={()=>this.handleEpisode(episodes, title, subOrDub, status, image)}>
          <MotiView
          from={{
            scale:0.5,
            translateY:300,
          }}
          animate={{
            scale:1,
            translateY:0,
          }}
          transition={{
            type: 'spring',
            delay: 700,
          }}
          style={{
            padding:10,
            width:this.state.loadings? 170 : res?.data.titleId === titleId ? 170 : 150,
            justifyContent:'center',
            alignItems:'center',
            backgroundColor:'coral',
            borderTopLeftRadius:5,
            flexDirection:'row',
            gap:5,
          }}>
            {this.state.loadings ? (
              <ActivityIndicator size="small" color="white" />
            ): res?.data.titleId === titleId ? <Feather name="tv" size={15} color="white"/> :  <FontAwesome name="th-list" size={15} color="white" />  }
             <Text style={{
              color:'white',
              fontSize:15,
              fontWeight:'bold',
              gap:10,
            }}>{this.state.loadings ?(
              <Text>Please wait..</Text>
            ) :res?.data.titleId === titleId ? `/ CURRENT EP | ${res?.data.epiNumber}`: `VIEW EPISODE${episodes.length > 1 ? 'S': ''}`}</Text>

          </MotiView>

          </TouchableOpacity>

          <TouchableOpacity onPress={this.handleGobacktoHome}>

          <MotiView
          from={{
            scale:0.5,
            translateY:300,
          }}
          animate={{
            scale:1,
            translateY:0,
          }}
          transition={{
            type: 'spring',
            delay: 800,
          }}
          style={{
            borderWidth:1,
            padding:8,
            width:100,
            justifyContent:'center',
            alignItems:'center',
            borderColor:'coral',
          }}>
            <Text style={{
              color:'white',
              fontSize:15,
              fontWeight:'bold',

            }}>
              <Ionicons name="arrow-back-outline" size={24} color="coral" style={{
opacity:0.7,
fontWeight:'bold'
              }} />
            </Text>
          </MotiView>
          </TouchableOpacity>
          <TouchableOpacity onPress={()=>this.handleWatchlist(titleId)}>
          <MotiView
          from={{
            scale:0.5,
            translateY:300,
          }}
          animate={{
            scale:1,
            translateY:0,
          }}
          transition={{
            type: 'spring',
            delay: 900,
          }}
          style={{
            borderTopRightRadius:5,
            height:40,
            width:40,
            justifyContent:'center',
            alignItems:'center',
            backgroundColor:'coral',
            position:'relative',
          }}>
        {this.state.isWatchList && <ActivityIndicator size="small" color="white" style={{
          position:'absolute',
        }}/>}
        <View style={{
          opacity:this.state.isWatchList ? 0 : 1,
        }}>
        {res1 ? <MaterialCommunityIcons name="playlist-remove" size={24} color="white" />: <MaterialCommunityIcons name="playlist-plus" size={24} color="white" /> }
        </View>
         </MotiView>

          </TouchableOpacity>
         </View>
         <View style={{
          position:'absolute',
          width:'100%',
          height:this.state.visible ? '100%': 0,
          opacity:this.state.visible ? 1: 0,
         }}>
         <MessageModal message='Do you want to remove this on your watch list.' visible={this.state.visible} showModal={this.showModal} hideModal={this.hideModal} deletDocss={this.deletDocsss} idToDelete={this.state.idToDelete} loadNow={this.state.loadNow} />
         </View>
         <MotiView from={{
          opacity:0,
          translateY:100,
         }}
         animate={{
          opacity:1,
          translateY:0,
         }}
         exit={{
          opacity:0,
          translateY:100,
         }}
         transition={{
          type:'spring',
          delay:500,
         }}
         style={{
          position:'absolute',
          width:'100%',
          height:this.state.visible1 ? '100%': 0,
          opacity:this.state.visible1 ? 1: 0,
         }}>
          <AddedToList message='Successfully added to WatchList' visible={this.state.visible1}/>
         </MotiView>
          </>
        )}

      </SafeAreaView>

    )
  }
}

export default DetailsPage