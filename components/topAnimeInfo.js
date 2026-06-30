import { Text, View } from 'react-native'
import React, { Component } from 'react'
import axios from 'axios';
import { Image } from 'expo-image';
import ListLoading from './listLoading';
import { MotiView } from 'moti';

export class TopAnimeInfo extends Component {

    state = {
        animeData: {},
        error:null,
    }

    data = async () => {
        try {

            const url = `https://consumet-api-funk.onrender.com/anime/gogoanime/info/${this.props.id}`;
            const { data } = await axios.get(url);
            let newData = {
                id: data.id,
                title: data.title,
                image: data.image,
                subOrdub: data.subOrDub,
                tEpisodes: data.totalEpisodes,
            }

            this.setState({
                animeData: newData
            })
        } catch (err) {
            this.setState({ error: err});
        }
    };

  componentDidMount(){
    this.data();
  }

  render() {

    const  {title, image, subOrdub, tEpisodes} = this.state.animeData;
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
                width:60,
                padding:3,
                borderBottomLeftRadius:5,
                borderTopRightRadius:5,
                opacity:0.9
            }}>
            <Text style={{
                color:'white',
                fontWeight:'bold',
                textAlign:'center'
            }}>EP 1 / {tEpisodes}</Text>
            </View>
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
                }}>{subOrdub}</Text>
            </View>
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

export default TopAnimeInfo