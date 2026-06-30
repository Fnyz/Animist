import { Text, View } from 'react-native'
import React, { Component } from 'react'
import axios from 'axios';
import { Image } from 'expo-image';
import ListLoading from './listLoading';
import { MotiView } from 'moti';

export class GoTopAnimeInfo extends Component {

    state = {
        animeData: {}
    }

    data = async () => {
        try {

            const url = `https://consumet-api-funk.onrender.com/anime/gogoanime/info/${this.props.animeId}`;
            const { data } = await axios.get(url, {
                headers:{
                    'Content-Type': 'application/json',
                    "Accept":'application/json',
                }
            });
            let newData = {
                id: data.id,
                title: data.title,
                image: data.image,
                tEpisodes: data.episodes,
                subOrDub: data?.subOrDub,
            }
            this.setState({
                animeData: newData
            })
        } catch (err) {
            console.log('theres was an error', err);
        }
    };

  componentDidMount(){

    this.data();

  }

  render() {

    const  {title, image, tEpisodes, subOrDub} = this.state.animeData;
    const {index} = this.props;

    if(!image){
        return (
            <View style={{
                width:210,
                height:250,
                justifyContent:'center',
                alignItems:'center',
            }}>
                <ListLoading />
            </View>
        )
    }

    return (
      <MotiView
      from={{
        translateY:100,
        opacity:0,
      }}
      animate={{
        translateY:0,
        opacity:1,
      }}
      transition={{
        type:'spring',
        delay:index * 100,
      }}
      >

        <View style={{
           width: 200, height: 200, margin:10,
           position:'relative',

        }}>
        <View style={{

            position:'absolute',
            width:'100%',
            zIndex:1,
            height:'100%',
            justifyContent:'space-between'
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
        style={{ width: 200, height: 200, resizeMode:'cover',borderRadius:5, }}
        source= {{ uri: image }}
        contentFit="cover"
        transition={1000}
      />
        </View>
        <View style={{width:150, flexDirection:'row', alignSelf:'center'}}>
          <Text style={{flex: 1, flexWrap: 'wrap', color:'white', textAlign:'center',fontWeight:'bold', opacity:0.7}}> {title}
          </Text>
        </View>
      </MotiView>
    )
  }
}

export default GoTopAnimeInfo