import { Text, View , ScrollView, TouchableOpacity} from 'react-native'
import React, { Component } from 'react'
import axios from 'axios'
import GoTopAnimeInfo from './GoTopAnimeInfo'

export class Popular extends Component {

  GotoDetails = ( id, navigation ) => {
    navigation.navigate('AnimeDetail', {
      animeId:id
    })
  }

  seeAll = () => {
    this.props.navigation.navigate('Movies',{
      type:'Popular Animes',
      url:'https://webdis-jthh.onrender.com/popular',
      kindData:false,
    })
  }

  render() {
    const {popAnime} = this.props;
    return (
       <View style={{
        height:280,
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

        }}>Popular animes</Text>
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
        {popAnime?.map((itm, index) => {
          return (
            <TouchableOpacity key={index} onPress={()=>this.GotoDetails(itm.animeId, this.props.navigation)}>
            <View>
              <GoTopAnimeInfo {...itm} index={index}/>
            </View>

            </TouchableOpacity>
          )
        })}
        </ScrollView>
       </View>

    )
  }
}

export default Popular