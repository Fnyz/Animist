import { View, Text} from 'react-native'
import React from 'react'
import LottieView from 'lottie-react-native';

const SearchLoading = ({typing}) => {

  return (
    <View style={{
        marginTop:80,
        alignItems:'center',
        flex:1,
    }}>
     <LottieView style={{
        width:300,
     }} source={require('../assets/animation/82768-sloth-doing-meditation.json')} autoPlay loop/>
     <Text style={{
        color:'white',
        fontSize:typing ? 15: 20,
        opacity:0.8,
     }}>{typing ? 'Please press the search button after inputting. ': 'Search your favorite anime now. '}</Text>

    </View>
  )
}

export default SearchLoading