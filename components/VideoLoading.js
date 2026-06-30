import { View, Text, ActivityIndicator} from 'react-native'
import React from 'react'
import LottieView from 'lottie-react-native';
import { MaterialIcons } from '@expo/vector-icons';

const VideoLoad = ({nextEp, message}) => {

  return (
    <View style={{
        justifyContent:'center',
        alignItems:'center',
        flex:1,
    }}>
     <LottieView style={{
        width:nextEp ? 250: 200,
        position:'relative',
        left:-15,
     }} source={require('../assets/animation/117326-cat-playing-animation (1).json')} autoPlay loop/>
     <Text
     style={{
        marginTop:20,
        color:'white',
        fontWeight:'bold',
        opacity:0.8,
     }}
     >{message}</Text>
    </View>
  )
}

export default VideoLoad