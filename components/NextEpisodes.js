import { View, Text, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import { myContext } from '../context'
import { useContext } from 'react'
import axios from 'axios';
import { AntDesign } from '@expo/vector-icons';
import { Entypo } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import { MotiView } from 'moti';

const NextEpisods = ({nexToPlayEp, subOrDub, nextEpisodes,
    setData,
    setUrl,
    setChoose,
    setNextEp,
    setClick,
    setEpNum,
    setQuality,
    status,
    number,
    butangPosition,
    setNVloading,
    setAllQuality,
}) => {

  const contextVal = useContext(myContext);

  const {getAllComments, getEpisodeIdbyDefault, getUserlikes} = contextVal;

  const handleClicking = async (id,i) => {

    setClick(true);
    setNextEp(true);
    setNVloading(true);
    try {
      const url = `https://consumet-api-funk.onrender.com/anime/gogoanime/watch/${id}`;
      const { data } = await axios.get(url, { params: { server: "vidstreaming" } });
      if(data){

        setData(data.sources);
        setUrl(data.sources[0].url);
        setQuality(data.sources[0].quality);
        butangPosition(id);
        setChoose(id);
        setEpNum(i);
        nextEpisodes(i);
        getAllComments(id);
        getEpisodeIdbyDefault(id, i);
        getUserlikes(id);
        setAllQuality(data.sources.filter(item => item.quality.match(/\d+/g)))
        setTimeout(() => {
          setNextEp(false);
          setClick(false);
          setNVloading(false);
        }, 2000);
      }

  } catch (err) {
      throw new Error(err.message);
  }

  }
  return (
     <>
           <MotiView
           from={{
            translateY:500,
            opacity:0,
           }}
           animate={{
            translateY: 0,
            opacity:1,
           }}
           transition={{
            delay:300,
            type:'timing'
           }}
           style={{

       padding:13,
       backgroundColor:'coral',
       marginHorizontal:5,
       borderRadius:5,
       opacity:0.8,
       marginBottom:10,
       marginTop:15,

      }}>
       <View style={{
         flexDirection:'row',
         justifyContent:'space-between',
         alignItems:'center',

       }}>
       <Text style={{
         fontSize:15,
         color:'white',
         fontWeight:status.isPlaying? 'bold':'normal',
       }}>Episode / {number} </Text>
       <View style={{
         flexDirection:'row',
         justifyContent:'center',
         alignItems:'center',
         gap:3,
       }}>
       <Text style={{
         color:'white',
        fontSize:17,
        textTransform:'capitalize',
        fontWeight:'bold',
        paddingRight:2,
       }}>{status.isPlaying? <Entypo name="controller-paus" size={24} color="white" />:<FontAwesome name="play" size={24} color="white" />}</Text>
       </View>
       </View>
     </MotiView>
     {nexToPlayEp && (
      <TouchableOpacity onPress={()=> handleClicking(nexToPlayEp.id, nexToPlayEp.number)}>

      <MotiView
       from={{
        translateY:500,
        opacity:0
       }}
       animate={{
        translateY: 0,
        opacity: 1,
       }}
       transition={{
        delay: 400,
        type:'timing'
       }}
      style={{
       borderWidth:1,
       padding:13,
       borderColor:'coral',
       marginHorizontal:5,
       borderRadius:5,
       opacity:0.8,

      }}>
       <View style={{
         flexDirection:'row',
         justifyContent:'space-between',
         alignItems:'center',

       }}>
       <Text style={{
         fontSize:15,
         color:'coral',
       }}>Episode / {nexToPlayEp.number} </Text>
       <View style={{
         flexDirection:'row',
         justifyContent:'center',
         alignItems:'center',
         gap:3,
       }}>
       <Text style={{
         color:'coral',
        fontSize:17,
        textTransform:'capitalize',
       }}>{subOrDub} / </Text>
       <AntDesign name="playcircleo" size={20} color="coral" />
       </View>
       </View>
     </MotiView>
     </TouchableOpacity>
     )}
     </>
  )
}

export default React.memo(NextEpisods)