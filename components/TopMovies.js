import { Text, View , ScrollView, TouchableOpacity} from 'react-native'
import React, { Component } from 'react'
import axios from 'axios'
import GotoTopMovie from './GotoTopMovie'

export class TopMovies extends Component {

  GotoDetails = ( id, navigation ) => {
    navigation.navigate('AnimeDetail', {
      animeId:id,

    })
  }

  seeAll = () => {
    this.props.navigation.navigate('Movies',{
      type:'List of Movies',
      url:'https://webdis-jthh.onrender.com/anime-movies',
      kindData:false,
    })
  }

  render() {

    const {movieAnime} = this.props;
    return (
       <View style={{
        height:300,
       }}>
        <View style={{
          flexDirection:'row',
          justifyContent:'space-between',
          marginHorizontal:15,
        }}>
        <Text style={{
          color:'white',
          opacity:0.5,
          fontSize:15,
          marginTop:10,

        }}>Anime movies</Text>
        <TouchableOpacity onPress={this.seeAll}>
        <Text style={{
          color:'white',
          opacity:0.5,
          fontSize:15,
          marginTop:10,
        }}>
          See all
        </Text>
        </TouchableOpacity>

        </View>

        <ScrollView horizontal>
        {movieAnime.map((itm, index) => {
          return (
            <TouchableOpacity key={index} onPress={()=>this.GotoDetails(itm.animeId, this.props.navigation)}>
            <View>
              <GotoTopMovie {...itm} index={index}/>
            </View>
            </TouchableOpacity>
          )
        })}
        </ScrollView>

       </View>

    )
  }
}

export default TopMovies