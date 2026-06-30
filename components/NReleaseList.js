import { Dimensions, View, } from 'react-native'
import React, { Component } from 'react'
import { Text } from 'react-native-paper';
import { Image } from 'expo-image';
import axios from 'axios';
import ListLoading from './listLoading';

export class NRList extends Component {

  state = {
    animeData: {},
}

data = async () => {
    try {

        const url = `https://consumet-api-funk.onrender.com/anime/gogoanime/info/${this.props.id}`;
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
          subOrDub: data?.subOrDub,
      }
      this.setState({
          animeData: newData,
      })

    } catch (err) {
       console.log('theres an error here', err);
    }
};

componentDidMount(){

this.data();

}

  render() {

    const  {title, image, subOrDub} = this.state.animeData;

    if(!image){
        return (
            <View style={{
                width:'100%',
                height:140,
                justifyContent:'center',
                alignItems:'center',
            }}>
                <ListLoading />
            </View>
        )
    }

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
                width: 100,
                padding:3,
                borderBottomLeftRadius:5,
                borderTopRightRadius:5,
                opacity:0.9
            }}>

            <Text style={{
                color:'white',
                fontWeight:'bold',
                textAlign:'center'
            }}>New EP |  {this.props.episodeNumber}</Text>
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

export default NRList