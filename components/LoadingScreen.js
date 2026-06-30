import { View, Text} from 'react-native'
import React from 'react'
import LottieView from 'lottie-react-native';
import { MaterialIcons } from '@expo/vector-icons';

const LoadingScreen = ({data}) => {

  return (
    <View style={{
        marginTop:250,
        alignItems:'center',
        flex:1,
        position:'relative',
    }}>
     <Text style={{
       color:'white',
       fontSize:15,
       opacity:0.5,
       position:'relative',
       top:35,
       fontStyle:'italic',
      }}>Welcome to, </Text>
     <View style={{
       flexDirection:'row',
      }}>
     <MaterialIcons name="live-tv" size={80} color="coral" style={{
       opacity:0.7,
       marginRight:5,
      }}/>
     <Text style={{
       color:'white',
       fontSize:50,
       paddingTop:25,
       opacity:0.8,
       fontWeight:'bold',
      }}>Ani<Text style={{
        color:'coral',
      }}>mist.</Text></Text>
     </View>
     <LottieView style={{
        width:1000,
        position:'absolute',
        bottom:-80,
     }} source={require('../assets/animation/60360-beautiful-page-loading-animation.json')} autoPlay loop/>
    </View>
  )
}

export default LoadingScreen