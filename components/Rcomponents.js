import { Dimensions, View, Image } from 'react-native'
import React, { Component } from 'react'
import { Text } from 'react-native-paper';

import axios from 'axios';
const width = (Dimensions.get('window').width - 4 * 10) / 2;

export class Rcomponents extends Component {

  state = {
    animeData: {}
}

data = async () => {
    try {

        const url = `https://webdis-jthh.onrender.com/anime-details/${this.props.id}`;
        const { data } = await axios.get(url, {
            headers:{
                'Content-Type': 'application/json',
                "Accept":'application/json',
            }
        });
        let newData = {
          id: this.props.animeId,
          title: data.animeTitle,
          image: data.animeImg,
          tEpisodes: data.episodesList,
          subOrDub: data?.subOrDub
      }
      this.setState({
          animeData: newData
      })

    } catch (err) {
        throw new Error(err.message);
    }
};

componentDidMount(){

this.data();

}

  render() {

    const  {title, image, tEpisodes, subOrDub} = this.state.animeData;

    return (

         <View>

        <View style={{
           width: '100%',
           position:'relative',

        }}>
        <View style={{

            position:'absolute',
            width:'100%',
            zIndex:1,
            height:'100%',
            justifyContent:'space-between',
        }}>
            <Text style={{
                color:'black',
                backgroundColor:'white',
                width:25,
                padding:2,
                textAlign:'center',
                borderBottomRightRadius:5,
                fontWeight:'bold',
                borderTopLeftRadius:5,
                opacity:0.9
            }}>HD</Text>

            <View style={{
                flexDirection:'row',
                justifyContent:'space-between',

            }}>
            <View style={{
                backgroundColor:'coral',
                width:!tEpisodes?.length ? 70 : 60,
                padding:3,
                borderBottomLeftRadius:5,
                borderTopRightRadius:5,
                opacity:0.9
            }}>
            <Text style={{
                color:'white',
                fontWeight:'bold',
                textAlign:'center'
            }}>{!tEpisodes?.length? 'Upcoming' : `EP 1 / ${tEpisodes?.length}`}</Text>
            </View>

            {subOrDub && (
            <View style={{
               backgroundColor:'white',
               paddingHorizontal:7,
               justifyContent:'center',
               borderBottomRightRadius:5,
               opacity:0.8
            }}>
                <Text style={{
                    textTransform:'capitalize',
                    fontWeight:'bold'
                }}>{subOrDub}</Text>
            </View>

            )}
            </View>

        </View>

        <Image
        style={{ width: 175, height: 175,borderRadius:5}}
        source= {{ uri: image }}
        contentFit="cover"
        transition={1000}
      />
        </View>
        <View style={{width:150, flexDirection:'row', alignSelf:'center', marginVertical:15,}}>
          <Text style={{flex: 1, flexWrap: 'wrap', color:'white', textAlign:'center',fontWeight:'bold', opacity:0.7}}> {title}
          </Text>
        </View>
      </View>

    )
  }
}

export default Rcomponents