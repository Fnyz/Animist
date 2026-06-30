import { Text, View, TouchableOpacity, FlatList, Dimensions, ActivityIndicator} from 'react-native'
import React, { Component } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import axios from 'axios';
import AnimistLoading from './AnimistLoading';
import SearchList from './searchList';
import { AntDesign } from '@expo/vector-icons';
import NotFound from './NotFound';
import { Ionicons } from '@expo/vector-icons';

const width = (Dimensions.get('window').width - 4 * 10) / 2;

export class ViewAllList extends Component {

    constructor(props) {
        super(props);

        this.state = {
          currentPage: 1,
          listMovies: [],
          click1:false,
          click2:false,
          selected:null,
          error:false,
          spin:false
        };

      }

    QuaryMoviesAnime = async () => {

        try {
            const {data} = await axios.get(`${this.props.route.params.url}?page=${this.state.currentPage}`,{
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                }
            })
             this.setState({listMovies:this.props.route.params.kindData ? data.results: data, click1:false, click2:false, spin:false, error:false});

        } catch (error) {
          if(error.response.data.status === 404){
            this.setState({error: true});
          };
        }

    }

    handlePreviousPage = () => {
        if (this.state.currentPage > 1) {
          this.setState(
            (prevState) => ({
              currentPage: prevState.currentPage - 1,
              click2:true,
            }),
            this.QuaryMoviesAnime
          );
        }
      };

      handleNextPage = () => {

        this.setState(
          (prevState) => ({
            currentPage: prevState.currentPage + 1,
            click1:true,
          }),
          this.QuaryMoviesAnime
        );

    };

    handleDetails = (image, id) => {
        this.setState({
          selected: image
         })
         this.props.navigation.navigate('AnimeDetail', {
          animeId:id,

        })
      }

    componentDidMount(){
        this.QuaryMoviesAnime();
    }

  render() {

    const {kindData} = this.props.route.params;

    if(!this.state.listMovies.length){

       return (
        <View style={{
            justifyContent:'center',
            alignItems:'center',
            flex:1,
            backgroundColor:'rgba(0, 0, 0,.8)',
          }}>
           <AnimistLoading/>
          </View>
       )
    }

    return (
      <SafeAreaView style={{
        flex:1,
        backgroundColor:'rgba(0, 0, 0,.8)',
      }}>

            <View style={{
            flexDirection:'row',
            justifyContent:'space-between',
            alignItems:'center',
            marginHorizontal:20,

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

          }}>{this.props.route.params.type}.</Text>

          </View>

          <TouchableOpacity onPress={()=> this.props.navigation.goBack()}>
        <AntDesign name="back" size={24} color="white" style={{
            opacity:0.7,
            fontWeight:'bold'
        }} />

        </TouchableOpacity>
          </View>
        {this.state.error? (
            <View style={{
              flex:1,
              justifyContent:'center',
              alignItems:'center',
              gap:20,
            }}>
              <Text style={{
                color:'white',
              }}>Something went wrong sensie, please reload here.</Text>
              <TouchableOpacity style={{
                padding:10,
                borderRadius:5,
              }} onPress={()=>{
                this.setState({spin:true})
                this.QuaryMoviesAnime()}
              }>
                {this.state.spin ? (
                    <ActivityIndicator size="large" color="coral" />
                ):(
                  <Ionicons name="reload" size={30} color="coral" />
                )}
              </TouchableOpacity>
            </View>
        ) : !this.state.listMovies.length ? (
            <NotFound />
        ): (

        <View style={{
            height:690,
        }}>
        <FlatList
          data={this.state.listMovies}
          renderItem={({item}) => (
            <TouchableOpacity onPress={()=> this.handleDetails(kindData ? item.image : item.animeImg, kindData ? item.id : item.animeId)} style={{
              margin:5,
              width:width,
            }}>
              <SearchList {...item}/>
             </TouchableOpacity>
          )}
          keyExtractor={(item) => kindData? item.id : item.animeId}
          numColumns={2}
          contentContainerStyle={{
              justifyContent: 'space-between',
              alignItems:'center',
            gap:5,

          }}

          columnWrapperStyle={{
              flexShrink:1,
            }}
            />

        </View>
)}

       <View style={{
           flexDirection: 'row',
           justifyContent: 'center',
        padding:15,
        gap:5,
        }}>

          <TouchableOpacity
           onPress={this.handlePreviousPage}
           disabled={this.state.currentPage === 1}
           style={{
            padding:10,
            width:70,
            borderTopLeftRadius:15,
            borderBottomLeftRadius:15,
            backgroundColor:'coral',
            justifyContent:'center',
            alignItems:'center',
            opacity:this.state.currentPage === 1 ?  0.5 : 0.8
           }}
          >
            <Text style={{
              color:'white',
            }}>
              {this.state.click2 ? <ActivityIndicator size="small" color="white" />: 'Previous'}
            </Text>
          </TouchableOpacity>
          <Text style={{
            borderWidth:1,
            padding:12,
            borderColor:'coral',
            color:'coral',
            fontWeight:'bold',
            opacity:!this.state.listMovies.length ? 0.5 : 0.8
          }}>
            Page {this.state.currentPage}
          </Text>
          <TouchableOpacity
          onPress={this.handleNextPage} disabled={!this.state.listMovies.length ? true : false }
          style={{
            padding:10,
            width: 70,
            borderTopRightRadius:15,
            borderBottomRightRadius:15,
            backgroundColor:'coral',
            justifyContent:'center',
            alignItems:'center',
            opacity:!this.state.listMovies.length ? 0.5 : 0.8
           }}
          >
            <Text style={{
              color:'white',
            }}>
              {this.state.click1 ? <ActivityIndicator size="small" color="white" />: 'Next'}
            </Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    )
  }
}

export default ViewAllList