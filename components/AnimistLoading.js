import { View, Text} from 'react-native'
import React from 'react'
import LottieView from 'lottie-react-native';

const AnimistLoading = () => {

  return (

     <View style={{

     }}>
     <LottieView style={{
        width:1200,
        opacity:0.8,
        height:500,
     }} source={require('../assets/animation/60360-beautiful-page-loading-animation.json')} autoPlay loop/>
     <Text style={{
      color:'white',
      fontSize:20,
      position:'relative',
      left:205,
      fontWeight:'bold',
      opacity:0.5,
      bottom:20,
     }}>Please wait...</Text>
     </View>

  )
}

export default AnimistLoading