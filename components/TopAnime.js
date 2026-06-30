import { Text, View , ScrollView, TouchableOpacity, ActivityIndicator} from 'react-native'
import React, { Component } from 'react'
import TopAnimeInfo from './topAnimeInfo'
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti'

export class TopAnime extends Component {

  GotoDetails = ( id, navigation ) => {
    navigation.navigate('AnimeDetail', {
      animeId:id
    })
  }

  seeAll = () => {
    this.props.navigation.navigate('Movies',{
      type:'List of Top Animes',
      url:'https://consumet-api-funk.onrender.com/anime/gogoanime/top-airing',
      kindData:true,
    })
  }

  render() {

    const {topAnime} = this.props;

    return (
       <View style={{
        height:290,
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

        }}>Top animes</Text>
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
        {this.props.error === 1 ? (

            <View style={{
              height:270,
              justifyContent:'center',
              alignItems:'center',
              gap:20,
            }}>
              <Text style={{
                color:'white',
              }}>Something went wrong sensie, please reload here.</Text>
              <TouchableOpacity onPress={()=> this.props.fetchEndpoint2()} style={{
                padding:10,
                borderRadius:5,
              }}>
                {this.props.isclick ? (
                    <ActivityIndicator size="large" color="coral" />
                ):(
                  <Ionicons name="reload" size={30} color="coral" />
                )}
              </TouchableOpacity>
            </View>

        ):(
        <ScrollView horizontal>
        {topAnime.map((itm, index) => {
          return (
            <TouchableOpacity key={index} onPress={()=>this.GotoDetails(itm.id, this.props.navigation)}>
            <MotiView
            >
              <TopAnimeInfo {...itm} index={index}/>
            </MotiView>
            </TouchableOpacity>
          )
        })}
        </ScrollView>
        )}

       </View>

    )
  }
}

export default TopAnime