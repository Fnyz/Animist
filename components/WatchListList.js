import { View, Text, TouchableOpacity, ActivityIndicator} from 'react-native'
import React, { useEffect, useState } from 'react'
import axios from 'axios';
import { Image } from 'expo-image';
import moment from 'moment';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Checkbox } from 'react-native-paper';
import { EvilIcons } from '@expo/vector-icons';

const WatchListList = ({makechange,setLoadMore,setMessage,list, i, navigation,choose, handlechange, userWatchList, select, handleItemSelection, selectedItems, id}) => {

    const [img, setImage] = useState(null)
    const [animeTitle, setAnimeTitle] = useState(null);
    const [status, setStatus] = useState(null);
    const [isClick, setisClick] = useState(false);
    const [epiNumber, setEpiNumber] = useState(null);

    const handlegotoAnimed = (tId) => {
      setisClick(true);

      setTimeout(() => {
        navigation.navigate('AnimeDetail', {
            animeId:tId
          })
          setisClick(false);
      }, 1000);

    }

  const handleremovefromhistory = (id) => {
    setMessage('Please wait deleting a specific watchlist...');
    setLoadMore(true);
    let h = userWatchList.find(e=> e.data.titleId === id);
    if(h){
       deleteDoc(doc(db, 'watchList', h.id))
      .then(()=>{

        setTimeout(() => {
          setMessage('');
          setLoadMore(false);
        }, 2000);

      });
    }
  }

   const datas = async () => {
        try {

            const url = `https://consumet-api-funk.onrender.com/anime/gogoanime/info/${list[i].data.titleId}`;
            const dt = await axios.get(url, {
                headers:{
                    'Content-Type': 'application/json',
                    "Accept":'application/json',
                }
            });

            setImage(dt.data.image);
            setAnimeTitle(dt.data.title);
            setStatus(dt.data.status);
            setEpiNumber(dt.data.totalEpisodes);

        } catch (err) {
           console.log('error please try again', err);
        }
    };

 useEffect(()=>{
   datas();
 },[i, makechange])

     const {titleId, createdAt} = list[i].data;

  return (
    <>

    <View style={{
        position:'absolute',
        top:12,
        left:29,
        zIndex:1000,
      }}>
      {select && (
        <Checkbox
        uncheckedColor='white'
        color='coral'
       status={selectedItems.includes(titleId) ? 'checked' : 'unchecked'}
       value={selectedItems}
       onPress={() => {
         handleItemSelection(titleId);
       }}
     />
      )}

      </View>
    <View  style={{
      flexDirection:'row',
        marginBottom:25,
        position:'relative',
        height:105,
        elevation:1,
        borderBottomLeftRadius:10,
        borderTopRightRadius:10,
        opacity: select ? 0.4 :1,
    }}>

      <View >
        {!img ? (
            <View style={{
                height:99,
                width:100,
                justifyContent:'center',
                alignItems:'center',
            }}>
  <ActivityIndicator size="large" color="coral" />
            </View>

        ): (
            <Image
            style={{ width: 100, height: 100, resizeMode:'cover',
            borderBottomLeftRadius:10,
            borderTopRightRadius:10,
        position:'absolute',
        top:-15,
        left:-2,
        zIndex:1,

        }}
            source= {{ uri: img }}
            contentFit="cover"
            transition={1000}
          />

        )}
      </View>

      <View style={{
        position:'absolute',
        left:117,
        top:10,

      }}>
        <View style={{
            flexDirection:'row',
            gap:5,
            position:'relative',

        }}>
        <View style={{
            overflow: 'hidden',
            width:80,
        }}>
        <Text numberOfLines={1} ellipsizeMode="tail" style={{
            color:'white',
            textTransform:'capitalize',
            opacity:0.8,
        }}>{animeTitle} </Text>
        </View>
        <Text style={{
          color:'white',
          opacity:0.8,
        }}> *</Text>
        <View style={{
          justifyContent:'center',
          alignItems:'center',
        }}>
         <Text style={{
            color:'white',
            fontSize:12,
            opacity:0.5,
         }}>{moment(createdAt?.toDate()).calendar()}</Text>
        </View>
        </View>

        <Text style={{
            color:'coral',
            paddingTop:5,
            opacity:0.7,
            fontWeight:'bold',
        }}>Total Episode{epiNumber > 1? 's':''}: {epiNumber}</Text>
        <Text style={{
            color:'white',
            opacity:0.6,
            top:5,
            fontSize:13,
        }}>
            Status: <Text style={{
                color:'coral',
                fontWeight:'bold',
            }}>{status}</Text>
        </Text>
          <View style={{
            left:150,
            flexDirection:'row',
            bottom:7,
            gap:5,
            position:'relative'
          }}>
            <View style={{
                paddingVertical:7,
                paddingHorizontal:12,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor:'coral',
                borderRadius:2,
                justifyContent:'center',
                alignItems:'center',
                left:8,
            }}>
            <TouchableOpacity disabled={!img ? true:false} onPress={()=>handlegotoAnimed(titleId)}>
            <Text style={{
                color:'white',
                fontSize:12,
            }}>{isClick ? 'Please wait...': 'See more'}</Text>
            </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity disabled={!img ? true : false} onPress={()=>handleremovefromhistory(titleId)}>
            <EvilIcons name="close-o" size={30} color="coral" style={{
                top:-105,
                left:220,
            }}/>
            </TouchableOpacity>
      </View>
    </View>

      </>
  )
}

export default WatchListList