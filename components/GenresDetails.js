import { Text, View,FlatList, TouchableOpacity, Dimensions, ActivityIndicator} from 'react-native'
import React, { Component } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import axios from 'axios'
import { AntDesign } from '@expo/vector-icons';
import ListAnime from './listAnime'
import AnimistLoading from './AnimistLoading';
import { Ionicons } from '@expo/vector-icons';

const width = (Dimensions.get('window').width - 4 * 10) / 2;
const height = Dimensions.get('window').height;

export class GenresDetails extends Component {

   state = {
    data: [],
    selected:null,
    spin:false,
    error:false
   }

    getAllDetailsGenre = async () => {

      try {

        const gn = this.props.route.params.genres.trim().toLowerCase();
        const genre = await axios.get(`https://webdis-jthh.onrender.com/genre/${gn}`,{
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        })

        this.setState({
          data: genre.data,
          spin:false,
          error:false,
        })

      } catch (error) {
        if(error.response.data.status === 404){
          this.setState({error:true})
        }
      }

    }

  componentDidMount(){
    this.getAllDetailsGenre();

  }
  handleDetails = (image, id) => {
    this.setState({
      selected: image
     })
     this.props.navigation.navigate('AnimeDetail', {
      animeId:id,

    })
  }

  render() {

    if(!this.state.data.length){
      return (
        <SafeAreaView style={{
          flex:1,
          justifyContent:'center',
          alignItems:'center',
          backgroundColor: 'rgba(0, 0, 0, .8)',
        }}>
           <AnimistLoading />

        </SafeAreaView>
      )
    }
    return (

      <SafeAreaView style={{
        backgroundColor: 'rgba(0, 0, 0, .8)',
      }}>

        <View style={{
          height:height,
          overflow:'hidden'
        }}>
          <View style={{
            flexDirection:'row',
            justifyContent:'space-between',
            alignItems:'center',
            marginHorizontal:20,
            marginBottom:5,
          }}>

          <View style={{
            flexDirection:'row',
            justifyContent:'center',
            alignItems:'center',
            gap:5,
          }}>
          <Text style={{
           color:'white',
           fontSize:25,
           fontWeight:'bold'
          }}>Ani<Text style={{
            color:'coral'
          }}>mist</Text></Text>
          <Text style={{
            fontSize:25,
            color:'white',
          }}>/</Text>
          <Text style={{

            fontSize:25,
            fontWeight:'bold',
            color:'white',
            opacity:0.8,
            marginBottom:15,
            marginTop:15,

          }}>{this.props.route.params.genres}.</Text>

          </View>

          <TouchableOpacity onPress={()=> this.props.navigation.navigate('Genres')}>
        <AntDesign name="back" size={24} color="white" style={{
            opacity:0.7,
            fontWeight:'bold'
        }} />

        </TouchableOpacity>
          </View>

          {this.state.error ? (
              <View style={{
                height:'100%',
                paddingTop:300,
                alignItems:'center',
                gap:20,
                backgroundColor:'rgba(0,0,0,0.6)'
              }}>
                <Text style={{
                  color:'white',
                }}>Something went wrong sensie, please reload here.</Text>
                <TouchableOpacity style={{
                  padding:10,
                  borderRadius:5,
                }} onPress={()=>{
                  this.setState({spin:true})
                 this.getAllDetailsGenre()}
                }>
                  {this.state.spin ? (
                      <ActivityIndicator size="large" color="coral" />
                  ):(
                    <Ionicons name="reload" size={30} color="coral" />
                  )}
                </TouchableOpacity>
              </View>
          ):!this.state.data.length ? (
            <View style={{
              flex:1,
              justifyContent:'center',
              alignItems:'center',
            }}>
               <Text style={{
               textAlign:'center',
               color:'white',
            }}>
              No genres found.
            </Text>
            </View>

          ): (

            <View style={{
              flex:1,
            }}>
            <FlatList data={this.state.data}
            renderItem={({item}) => (
             <TouchableOpacity onPress={()=> this.handleDetails(item.animeImg, item.animeId)} style={{
              margin:5,
              width:width,
             }}>
               <ListAnime {...item}/>
             </TouchableOpacity>
            )}
            numColumns={2}
            keyExtractor={item => item.animeId}
            contentContainerStyle={{
              justifyContent: 'space-between',
              alignItems:'center',
              gap:5,

            }}
            style={{
              marginBottom:35,
            }}
            columnWrapperStyle={{
              flexShrink:1,
            }}

            />
            </View>

          )}
        </View>

      </SafeAreaView>
    )
  }
}

export default GenresDetails