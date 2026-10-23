import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import { Ionicons } from '@expo/vector-icons';

// Temporary screen: the old player streamed from GogoAnime, which shut down.
// Episodes come back in v1.1 with official YouTube playlists and Crunchyroll links.
const VideoPlayer = ({ navigation }) => {

  return (
    <View style={{
        flex:1,
        backgroundColor:'black',
        alignItems:'center',
        justifyContent:'center',
        padding:24,
        gap:12,
    }}>
      <Ionicons name="film-outline" size={48} color="coral" />
      <Text style={{color:'white', fontSize:20, fontWeight:'bold', textAlign:'center'}}>Episodes are coming back</Text>
      <Text style={{color:'#bbb', fontSize:14, textAlign:'center', lineHeight:20}}>
        We're moving to official sources. In the next update, episodes play from official YouTube channels or open on Crunchyroll.
      </Text>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{marginTop:12, backgroundColor:'coral', paddingVertical:12, paddingHorizontal:28, borderRadius:10}}
      >
        <Text style={{color:'black', fontWeight:'bold'}}>Go back</Text>
      </TouchableOpacity>
    </View>
  )
}

export default VideoPlayer
