import { Text, View, StatusBar,TouchableOpacity, FlatList} from 'react-native'
import React, { Component } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialIcons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { genres } from '../genre';
import AnimistLoading from './AnimistLoading';
import { MotiView } from 'moti';

export class Genres extends Component {

    state = {
        genres,
        selected: 0,
        load:true,
    }

  componentDidMount () {

    setTimeout(()=> {
      this.setState({load:false});
    },2000)
  }

  render() {

    if(this.state.load) {
        return (
          <SafeAreaView style={{
            backgroundColor: 'rgba(0, 0, 0, .8)',
            flex:1,
            justifyContent:'center',
            alignItems:'center',
          }}>
            <AnimistLoading />
          </SafeAreaView>
        )
    }

    return (
      <SafeAreaView style={{
        flex:1,
        backgroundColor: 'rgba(0, 0, 0, .8)',
        paddingBottom:20,
    }}>
        <StatusBar backgroundColor="rgba(0, 0, 0, .8)" style="dark-content" />
        <View style={{
          flexDirection:'row',
          justifyContent:'space-between',
          alignItems:'center',
          marginHorizontal:17,
          marginTop:15,
          marginBottom:10,
        }}>
        <View style={{
             flexDirection:'row',
             justifyContent:'center',
             alignItems:'center',
             gap:5,
        }}>

        <MaterialIcons name="live-tv" size={25} color="coral" style={{
          opacity:0.8
        }}/>
         <Text style={{
           fontSize:20,
           fontWeight:'bold',
           color:'white',
           opacity:0.8,

          }}>
            Ani<Text style={{
              color:'coral',
              textAlign:'center',
              fontWeight:'bold',
            }}>mist</Text>
          </Text>
          <Text style={{
            color:'coral',
            fontSize:20,
            fontWeight:'bold',
          }}>/</Text>
          <Text style={{
            color:'white',
            fontSize:20,
            fontWeight:'bold',
            opacity:0.7,
          }}>Genres</Text>

        </View>

        <TouchableOpacity onPress={()=> this.props.navigation.goBack()}>

        <FontAwesome name="home" size={24} color="coral" style={{
            opacity:0.8,
        }}/>

        </TouchableOpacity>

        </View>

          <View>
          <FlatList data={genres}
          renderItem={({item}, i) => (
           <TouchableOpacity onPress={()=>{
            this.props.navigation.navigate('GenresDetails',{
                genres:item.genre,
            })
            this.setState({selected:item})
           }}>
            <MotiView
            from={{
              opacity:0,
              translateY:20,
            }}
            animate={{
              opacity:1,
              translateY:0,
            }}
            transition={{
              type:'timing',
              delay:300,
            }}

            style={{
                width:180,
                margin:5,
                height:90,
                justifyContent:'center',
                alignItems:'center',
                borderWidth:this.state.selected === item ? 1: null,
                borderColor:this.state.selected === item ? 'coral':null,
                borderRadius:5,
                position:'relative',
                overflow: 'hidden',
                opacity:0.8,
            }}>
                <Text style={{
                    color:this.state.selected === item ? 'coral':'white',
                    zIndex:2,
                    fontWeight:'bold',
                    fontSize:20,
                    opacity:0.9,
                }}>{item.genre}</Text>

                <View style={{
                    position:'absolute',
                    width:'100%',
                    height:'100%',
                    backgroundColor:'rgba(0, 0, 0, .7)',
                    zIndex:1,
                }}>
                </View>

                <Image
        style={{
          width:'100%',
          height:'100%',
          position:'absolute',
      }}
        source= {{ uri: item.img }}
        contentFit="cover"

      />

            </MotiView>

           </TouchableOpacity>
          )}
          numColumns={2}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={{
            justifyContent: 'space-between',
            alignItems:'center',
            gap:5,

          }}
          style={{
            marginBottom:70,
          }}
          columnWrapperStyle={{
            flexShrink:1,
          }}

          />

          </View>

      </SafeAreaView>
    )
  }
}

export default Genres