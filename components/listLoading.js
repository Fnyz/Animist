import { View, Text, ActivityIndicator} from 'react-native'
import React from 'react'
import LottieView from 'lottie-react-native';
import { MaterialIcons } from '@expo/vector-icons';

const ListLoading = ({nextEp, message}) => {

  return (
    <View style={{
        justifyContent:'center',
        alignItems:'center',
        flex:1,
    }}>
     <LottieView style={{
        width:300,
        opacity:0.8,
     }} source={require('../assets/animation/43270-loading-screen.json')} autoPlay loop/>

    </View>
  )
}

export default ListLoading