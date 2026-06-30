import { View, Text } from 'react-native'
import React from 'react'
import CustomVideoPlayer from './CustomVideoPlayer'

const VideoPlayer = ({route, navigation}) => {

  return (
    <View style={{
        flex:1,
    }}>
      <CustomVideoPlayer
      epNumber ={route.params.epNumber}
      epId = {route.params.episodeId}
      title = {route.params.titlePage}
      type = {route.params.type}
      epData = {route.params.allepp}
      subOrDub = {route.params.sOrD}
      navigation = {navigation}
      animeStatus={route.params.status}
      titleId = {route.params.titleId}
      current={route.params.current}
      />
    </View>
  )
}

export default VideoPlayer