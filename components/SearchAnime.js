import { FlatList, Text, View , TouchableOpacity, Dimensions, TouchableWithoutFeedback, Keyboard, ActivityIndicator} from 'react-native'
import React, { Component } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Searchbar } from 'react-native-paper';
import axios from 'axios';
import SearchList from './searchList';
import SearchLoading from './SearchLoading';
import { MaterialIcons } from '@expo/vector-icons';
import Searching from './Searchings';
import NotFound from './NotFound';
import { Ionicons } from '@expo/vector-icons';

const width = (Dimensions.get('window').width - 4 * 10) / 2;

export class SearchAnime extends Component {

  constructor(props) {
    super(props);

    this.state = {
      currentPage: 1,
      data: [],
      searchQuery: '',
      queryData: [],
      clicking: false,
      fetching: false,
      typing:false,
      error:false,
      spin:false,
    };

    this.limit = 10;
  }

  onChangeSearch = async (val) => {
    this.setState({searchQuery: val, typing:true, fetching:false});

    if(!val.length){
      this.setState({queryData:[]});
    }
  }

  handleDetails = (image, id) => {
    this.setState({
      selected: image
     })
     this.props.navigation.navigate('AnimeDetail', {
      animeId:id,

    })
  }

  handleSearch = async() => {
    Keyboard.dismiss();
    this.setState({clicking:true, fetching:true, typing:false});
      try {
        const {data} = await axios.get(`https://consumet-api-funk.onrender.com/anime/gogoanime/${this.state.searchQuery}?page=${this.state.currentPage}`,{
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        })

        if(data.results.length){

          this.setState({clicking:false, queryData: data.results, fetching:true, error:false, spin:false})
        }else{
          this.setState({clicking:false, queryData:[], spin:false, error:false})
        }
      } catch (error) {
        this.setState({error:true})
      }

  }

  handlePreviousPage = () => {
    if (this.state.currentPage > 1) {
      this.setState(
        (prevState) => ({
          currentPage: prevState.currentPage - 1,

        }),
        this.handleSearch
      );
    }
  };

  handleNextPage = () => {

    this.setState(
      (prevState) => ({
        currentPage: prevState.currentPage + 1,
      }),
      this.handleSearch
    );
  };

  render() {
    return (
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <SafeAreaView style={{
        flex: 1,
        backgroundColor:'rgba(0, 0, 0, 0.8)'
      }}>

         <View style={{
           flexDirection:'row',
          justifyContent:'center',
          alignItems:'center',
          marginTop:30,
          gap:5,
        }}>
        <MaterialIcons name="live-tv" size={40} color="coral" style={{
          opacity:0.8
        }}/>
         <Text style={{
           fontSize:35,
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

        </View>

        <View style={{
          flexDirection:'row',
          justifyContent:'center',
          gap:5,
          marginTop:20,
        }}>

        <Searchbar
      mode='view'
      placeholder="e.g search anime here"
      onChangeText={this.onChangeSearch}
      placeholderTextColor='white'
      value={this.state.searchQuery}
      traileringIconColor='white'
      style={{
        backgroundColor:'coral',
        opacity:0.8,
        borderTopLeftRadius:20,
        marginBottom:10,
        borderBottomLeftRadius:20,
        width:270,
      }}
      showDivider={false}

      inputStyle= {{
        color:'white'
      }}
      iconColor='white'
    />

    <TouchableOpacity onPress={this.handleSearch}>
      <View style={{
        borderWidth:1,
        height:72,
        padding:10,
        justifyContent:'center',
        alignItems:'center',
        borderColor:'coral',
        borderTopRightRadius:20,
        borderBottomRightRadius:20,
        width:75,

      }}>
        <Text style={{color:'coral'}}>Search</Text>
      </View>
    </TouchableOpacity>

        </View>

        <TouchableOpacity onPress={()=> this.props.navigation.navigate('Home')}>
      <View style={{
        borderWidth:1,
        height:50,
        padding:10,
        justifyContent:'center',
        alignItems:'center',
        borderColor:'coral',
        borderRadius:20,
        marginHorizontal:25,
        marginBottom:10,
      }}>
        <Text style={{color:'coral'}}>Go back to home</Text>
      </View>
    </TouchableOpacity>

    {!this.state.searchQuery.length && !this.state.clicking && (
      <View style={{
        flex:1,
        justifyContent:'center',
        alignItems:'center',
      }}>
       <SearchLoading />
      </View>
     )}

    {this.state.searchQuery.length > 0 && this.state.typing && (
      <View style={{
        flex:1,
        justifyContent:'center',
        alignItems:'center',
      }}>
        <SearchLoading typing = {this.state.typing}/>
      </View>
     )}

     {this.state.clicking && (
      <View style={{
        flex:1,
      justifyContent:'center',
      alignItems:'center',
      }}>
        <Searching />
      </View>
     )}

  {this.state.searchQuery.length > 0 && this.state.queryData.length > 0 && !this.state.clicking && (
      <View style={{
        flex:1,
      }}>
        <Text style={{
        color:'white',
        opacity:0.7,
        marginLeft:15,
        marginTop:10,
        marginBottom:10,
    }}>
        Search results:
    </Text>

        <View style={{
          flex:1,
        }}>

        <FlatList
          data={this.state.queryData}
          renderItem={({item}) => (
            <TouchableOpacity onPress={()=> this.handleDetails(item.image, item.id)} style={{

              margin:5,
              width:width,
             }}>
              <SearchList {...item}/>
             </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
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

      </View>
     )}

{!this.state.queryData.length && this.state.searchQuery.length > 0 && !this.state.clicking && this.state.fetching && (
      <View style={{
        flex:1,
        justifyContent:'center',
        alignItems:'center',
      }}>
        <NotFound message='Sensie anime not found.'/>
      </View>
     )}

{this.state.fetching && (

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
              Previous
            </Text>
          </TouchableOpacity>
          <Text style={{
            borderWidth:1,
            padding:12,
            borderColor:'coral',
            color:'coral',
            fontWeight:'bold',
            opacity:!this.state.queryData.length ? 0.5 : 0.8
          }}>
            Page {this.state.currentPage}
          </Text>
          <TouchableOpacity
          onPress={this.handleNextPage} disabled={!this.state.queryData.length ? true : false }
          style={{
            padding:10,
            width:70,
            borderTopRightRadius:15,
            borderBottomRightRadius:15,
            backgroundColor:'coral',
            justifyContent:'center',
            alignItems:'center',
            opacity:!this.state.queryData.length ? 0.5 : 0.8
           }}
          >
            <Text style={{
              color:'white',
            }}>
              Next
            </Text>
          </TouchableOpacity>

        </View>

        )}

      </SafeAreaView>
      </TouchableWithoutFeedback>
    )
  }
}

export default SearchAnime