import { Text, View,FlatList, TouchableOpacity, Dimensions } from 'react-native'
import React, { Component } from 'react'
import axios from 'axios'
import { Image } from 'expo-image';
import { useState} from 'react';
import { AntDesign } from '@expo/vector-icons';
import { useCallback } from 'react';
const height = Dimensions.get('window').height;
const width = (Dimensions.get('window').width - 4 * 10) / 2;
import { MotiView } from 'moti';

const  MostRecentRelease = ({setAllQuality,navigation,setData,resentRelease, choose, setChoose, setUrl, setClick, setEpNum, setQuality, setTitle, setNextEp, setTitleIds, getUserlikes, setAnimeStats, status}) => {

    const [currentPage, setCurrentPage] = useState(1);
    const totalItems = resentRelease.slice(0,4).length;
    const itemsPerPage = 10;

    const renderItems = () => {

            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
            let data = resentRelease;

            const items = [];
            for (let i = startIndex; i < endIndex; i++) {
              items.push(
                <TouchableOpacity  style={{
                    margin:5,
                    width:width,
                   }} onPress={()=> handleNewAnime(data[i].episodeId, data[i].episodeNumber, data[i].title, data[i].id)}
                   disabled={choose === data[i].episodeId ? true : false}
                >

               <View style={{
                   width: '100%',
                   position:'relative',
                   overflow:'hidden',

                }}>
                  {choose === data[i].episodeId && (
 <View style={{
  position:'absolute',
  top:0,
  height:'100%',
  width:'100%',
  zIndex:200,
  backgroundColor:'rgba(0,0,0,0.7)',
  justifyContent:'center',
  alignItems:'center'
}}>
  <MotiView
  from={{ scale: 0.5 }}
  animate={{ scale: 1 }}
  transition={{
    loop:true,
    type:'spring',
  }}
  >
  {status.isPlaying ? (
    <AntDesign name="pausecircleo" size={27} color="coral" />

  ): (
    <AntDesign name="playcircleo" size={27} color="coral" />
  )}
  </MotiView>
</View>
                  )}

                <View style={{

                    position:'absolute',
                    width:'100%',
                    zIndex:1,
                    height:'100%',
                    justifyContent:'space-between',
                }}>
                    <Text style={{
                        color:'black',
                        backgroundColor:'white',
                        width:25,
                        padding:2,
                        textAlign:'center',
                        borderBottomRightRadius:5,
                        fontWeight:'bold',
                        borderTopLeftRadius:5,
                        opacity:0.9
                    }}>HD</Text>

                    <View style={{
                        flexDirection:'row',
                        justifyContent:'space-between',

                    }}>
                    <View style={{
                        backgroundColor:'coral',
                        width:choose === data[i].episodeId ? 80 : 120,
                        padding:3,
                        borderBottomLeftRadius:5,
                        borderTopRightRadius:5,
                        opacity:0.9
                    }}>
                    <Text style={{
                        color:'white',
                        fontWeight:'bold',
                        textAlign:'center'
                    }}>{choose === data[i].episodeId ? 'Watching...' : `Watch now. / EP ${data[i].episodeNumber}`}</Text>
                    </View>

                    </View>

                </View>

                <Image
                style={{ width: 175, height: 175,borderRadius:5}}
                source= {{ uri: data[i].image }}
                contentFit="cover"
                transition={1000}
              />
                </View>
                <View style={{width:150, flexDirection:'row', alignSelf:'center', marginVertical:15,}}>
                  <Text style={{flex: 1, flexWrap: 'wrap', color:'white', textAlign:'center',fontWeight:'bold', opacity:0.7}}> {data[i].title}
                  </Text>
                </View>
                   </TouchableOpacity>

              );

            }

            return items.map((item, index) => <View key={index}>{item}</View>);

        }

  const handleNewAnime = useCallback(async (id, ipNum, title, tId) => {

    setClick(true);
    setNextEp(true);
    try {
      const url = `https://consumet-api-funk.onrender.com/anime/gogoanime/watch/${id}`;
      const { data } = await axios.get(url, { params: { server: "vidstreaming" } });

      if(data){
        setUrl(data.sources[0].url);
        setQuality(data.sources[0].quality);
        setTitle(title)
        setEpNum(ipNum);
        setClick(false);
        setChoose(id);
        setNextEp(false);
        setData(data.sources);
        setTitleIds(tId);
        getUserlikes(id);
        setAllQuality(data.sources.filter(item => item.quality.match(/\d+/g)));
        setAnimeStats('Ongoing');
      }

  } catch (err) {
      console.log('there was an error here', err);
  }

  },[choose])

    return (
      <View>

            <View style={{
                height:400,
            }}>
         <FlatList data={renderItems()}
          renderItem={({item})=> <View>{item}</View>}
          numColumns={2}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={{
            justifyContent: 'space-between',
            alignItems:'center',
            gap:5,
          }}

          columnWrapperStyle={{
            flexShrink:1,
          }}

          />

         <View style={{
             flexDirection: 'row',
             justifyContent: 'center',
             alignItems:'center',
             gap:5,
             padding:15,
             marginBottom:10,
             }}>
                <TouchableOpacity style={{
          justifyContent:'center',
          alignItems:'center',
          flexDirection:'row',
          gap:5,
         }}
         onPress={()=> navigation.goBack()}
         >
            <AntDesign name="arrowleft" size={22} color="coral" />
            <Text style={{
              color:'white',
              fontSize:15,
              fontWeight:'bold',
              opacity:0.8,
            }}>GO BACK.</Text>
          </TouchableOpacity>
        </View>

        </View>

      </View>
    )
  }

export default React.memo(MostRecentRelease)