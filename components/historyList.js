import { View, Text, TouchableOpacity, ActivityIndicator} from 'react-native'
import React, { useEffect, useState } from 'react'
import axios from 'axios';
import { Image } from 'expo-image';
import moment from 'moment';
import { Entypo } from '@expo/vector-icons';
import { Menu } from 'react-native-paper';
import { deleteDoc, doc , updateDoc} from 'firebase/firestore';
import { db } from '../firebase';
import { Checkbox } from 'react-native-paper';
import { useCallback } from 'react';

const HistoryList = ({makechange,setLoadMore,setMessage, list,i, navigation,choose, handlechange, historyRecords, select, handleItemSelection, selectedItems, id}) => {

    const [img, setImage] = useState(null)
    const [animeTitle, setAnimeTitle] = useState(null);
    const [status, setStatus] = useState(null);
    const [isClick, setisClick] = useState(false);
    const [change, setChange] = useState(true);

    const handeRewatch = useCallback(async (titlePage,titleId, episodeNumber, episodeId, status) => {

     setisClick(true);
      try {

        const url = `https://consumet-api-funk.onrender.com/anime/gogoanime/info/${list[i].data.titleId}`;
        const dt = await axios.get(url, {
            headers:{
                'Content-Type': 'application/json',
                "Accept":'application/json',
            }
        });

        if(dt){
          setisClick(false);
          navigation.navigate('View', {
            episodeId,
            titlePage,
            epNumber:episodeNumber,
            allepp:dt.data.episodes,
            sOrD: dt.data.subOrDub,
            type:'episode',
            status,
            titleId,
            current:episodeId,
         })

        }

    } catch (err) {
        throw new Error(err.message);
    }

    },[isClick])

    const handlegotoAnimed = (tId) => {
      navigation.navigate('AnimeDetail', {
        animeId:tId
      })
    }

  const handleremovefromhistory = async (id, tId) => {
    setLoadMore(true);
    handlechange(id);
    setChange(false);
    setMessage('Please wait deleting a specific episode');
    let h = historyRecords.find(e=> e.data?.animeId === id && e.data.titleId === tId);
    let prev = historyRecords.filter(e=> e.data?.titleId === tId)
    .find(e => e?.data.epiNumber > h.data?.epiNumber || e.data.epiNumber < h.data?.epiNumber);

    if(h){
      await deleteDoc(doc(db, 'history', h.id))
      .then(()=>{
        setTimeout(() => {
          setLoadMore(false)
          setMessage('');
          handlechange(null);
          setChange(true);
        }, 2000);
        if(!prev){
          return;
        }else{
          const r3 = doc(db, "history", prev.id);
          updateDoc(r3, {
          count:1,
          })
        }
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

        } catch (err) {
           console.log('please try again', err);
        }
    };

 useEffect(()=>{

   datas();
 },[i, makechange])

     const {epiNumber, titleId, createdAt, animeId} = list[i].data;

    const remainingMilliseconds = list[i].data.durationMillis - list[i].data.positionMillis;
    const duration = moment.duration(remainingMilliseconds);
    const minutesLeft = duration.minutes();
    const secondsLeft = duration.seconds();
    const formattedDuration = moment.utc().minutes(minutesLeft).seconds(secondsLeft).format('mm:ss');

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
       status={selectedItems.includes(animeId) ? 'checked' : 'unchecked'}
       value={selectedItems}
       onPress={() => {
         handleItemSelection(animeId);
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
            justifyContent:'space-between',
            width:230,
        }}>
        <View style={{
            overflow: 'hidden',
            width:100,
        }}>
        <Text numberOfLines={1} ellipsizeMode="tail" style={{
            color:'white',
            textTransform:'capitalize',
            opacity:0.8,
        }}>{animeTitle} </Text>
        </View>

        <View style={{
          justifyContent:'center',
          alignItems:'center',
          flexDirection:'row',
          gap:5,
        }}>
             <Text style={{
          color:'white',
          opacity:0.8,
        }}> *</Text>
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
        }}>Episode {epiNumber}</Text>
          <Text style={{
            color:'white',
            opacity:0.6,
            fontSize:12,
            top:20,
          }}>/ {formattedDuration} left</Text>
          <View style={{
            left:150,
            flexDirection:'row',
            bottom:7,
            gap:5,
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
            }}>
            <TouchableOpacity disabled={!img ? true:false} onPress={()=>handeRewatch(animeTitle,titleId, epiNumber, animeId, status)}>
            <Text style={{
                color:'white',
                fontSize:12,
            }}>{isClick ? 'Please wait...': 'Watched'}</Text>
            </TouchableOpacity>
            </View>

            <Menu
            visible={animeId === choose? true:false}
            onDismiss={()=>handlechange(null)}
            style={{
              position:'absolute',
              left:145,
              top:15,
              width:200,
              zIndex:10,
              height:50,

            }}
            anchor={
              <TouchableOpacity disabled={!img ? true: false} onPress={()=>handlechange(animeId)}>
               <Entypo name="dots-three-vertical" size={24} color="coral" style={{
                paddingTop:2,
                paddingLeft:5,
            }} />
              </TouchableOpacity>
              }
            >

            <Menu.Item  onPress={() => handlegotoAnimed(titleId)} title="Anime details" leadingIcon='information-outline' />
            <Menu.Item onPress={() => handleremovefromhistory(animeId, titleId)} title="Remove from history" leadingIcon='trash-can-outline' titleStyle={{
              color:'red'
            }} />
          </Menu>

          </View>
      </View>
    </View>

      </>
  )
}

export default HistoryList