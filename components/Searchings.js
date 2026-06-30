import { View, Text} from 'react-native'
import React from 'react'
import LottieView from 'lottie-react-native';

const Searching = () => {

  return (
    <View style={{
        marginTop:50,
        alignItems:'center',
        flex:1,
    }}>
     <LottieView style={{
        width:350,
        opacity:0.8,
     }} source={require('../assets/animation/78631-searching.json')} autoPlay loop/>
     <Text style={{
        color:'white',
        fontSize:20,
        opacity:0.8,
        fontWeight:'bold'
     }}>Please wait...
     </Text>

    </View>
  )
}

export default Searching