import { View, Text} from 'react-native'
import React from 'react'
import LottieView from 'lottie-react-native';

const NotFound = ({message}) => {

  return (
    <View style={{
        marginTop:60,
        alignItems:'center',
        flex:1,
    }}>
     <LottieView style={{
        width:300,
        opacity:0.8,
     }} source={require('../assets/animation/93949-pex-not-found.json')} autoPlay loop/>
     <Text style={{
        color:'white',
        fontSize:20,
        opacity:0.8,
        marginTop:10,
        fontWeight:'bold'
     }}>{message}</Text>

    </View>
  )
}

export default NotFound