import { Text, View, TouchableOpacity , FlatList} from 'react-native'
import React, { Component } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context';
import { EvilIcons } from '@expo/vector-icons';
import { AntDesign } from '@expo/vector-icons';
import NotFound from './NotFound';
import { myContext } from '../context';
import AnimistLoading from './AnimistLoading';
import { MotiView, MotiText } from 'moti';

export class Episode extends Component {

  static contextType = myContext;

    constructor(props) {
        super(props);

        this.state = {
          currentPage: 1,
          selected:0,
          loading:true,
          currentId:null,
        };

        this.totalItems = this.props.route.params.epData.length;
        this.itemsPerPage = 10;
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);

      }

      handlePreviousPage = () => {
        if (this.state.currentPage > 1) {
          this.setState((prevState) => ({
            currentPage: prevState.currentPage - 1,
          }));
        }
      };

      handleNextPage = () => {
        if (this.state.currentPage < this.totalPages) {
          this.setState((prevState) => ({
            currentPage: prevState.currentPage + 1,
          }));
        }
      };

      renderItems = () => {
        const ls = this.context;
        const { currentPage } = this.state;
        const startIndex = (currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, this.totalItems);
        const titleId = this.props.route.params.titleId
        let dt = ls.historyRecords.find(r => r?.data.count === 1 && r.data.titleId === titleId);

        let data = this.props.route.params.epData;

        const items = [];
        for (let i = startIndex; i < endIndex; i++) {

          items.push(

            <TouchableOpacity  onPress={()=> this.handleViewEpisodes(data[i]?.id, this.props.route.params.title, data[i]?.number, data, this.props.route.params.subOrDub,this.props.route.params.status, dt?.data.animeId)}>
            <MotiView
            from={{
              opacity:0,
              translateY:20,
            }}
            animate={{
              opacity: 1,
              translateY:0
            }}
            transition={{
              type:'spring',
              delay:400,
            }}
            style={{
                width:373,
                borderWidth:1,
                margin:10,
                flexDirection:'row',
                justifyContent:'space-between',
                padding:15,
                borderRadius:10,
                fontsize:30,
                borderColor:dt?.data.animeId === data[i]?.id? null : 'coral',
                backgroundColor:dt?.data.animeId === data[i]?.id? 'coral' : null,
                position:'relative',
                overflow:'hidden'
            }}>
            <Text style={{
                color:dt?.data.animeId === data[i]?.id? 'white' : 'coral',
            }}>Episode {data[i]?.number}</Text>
            <View style={{
                flexDirection:'row',
                gap:5,
            }}>
                <Text style={{
                    color: dt?.data.animeId === data[i]?.id? 'white' : 'coral',
                }}>/ {dt?.data.animeId === data[i]?.id ? 'Continue watching': 'Watch now.'}</Text>
                <EvilIcons name="arrow-down" size={25} color={dt?.data.animeId === data[i]?.id? 'white' : 'coral'} />
            </View>
            </MotiView>

            </TouchableOpacity>

          );

        }

        return items.map((item, index) => <View key={index}>{item}</View>);
      };

    handleViewEpisodes = (id, title, number, alleposodes, subOrDub, status, current) => {

      const titleId = this.props.route.params.titleId

        this.props.navigation.replace('View', {
          episodeId:id,
          titlePage:title,
          epNumber:number,
          allepp:alleposodes,
          sOrD: subOrDub,
          type:'episode',
          status,
          titleId,
          current,
       })

    }

    handleAutoPages =() => {
      const ls2 = this.context;
      const titleId = this.props.route.params.titleId
      let dt = ls2.historyRecords.find(r => r?.data.count === 1 && r?.data.titleId === titleId);
      if(!dt){
        return null;
      }

      if(dt?.data.epiNumber > 0){
        let pushPage = Math.ceil( dt?.data.epiNumber / this.itemsPerPage );
        this.setState({currentPage:pushPage});
        return;
      }else{
        this.setState({currentPage:1});
      }

    }

    componentDidMount(){
      this.handleAutoPages();
      setTimeout(()=>{
        this.setState({
          loading:false,
        })
      },3000)
    }

  render() {

    const title = this.props.route.params.title

    if(this.state.loading){
      return (
        <View style={{
          justifyContent:'center',
          alignItems:'center',
          flex:1,
          backgroundColor:'rgba(0, 0, 0,0.8)',
        }}>
         <AnimistLoading/>
        </View>
      )
    }

    return (

      <SafeAreaView style={{
        flex:1,
        backgroundColor: 'rgba(0, 0, 0, .8)',
      }}>

        <View style={{
          flexDirection:'row',
          justifyContent:'space-between',
            alignItems:'center',
            marginHorizontal:15,
            marginTop:20,
            marginBottom:10,
        }}>
        <View style={{
            width: title.length > 20 ? 120 : null,
        }}>
        <MotiText
        from={{
          translateX:-100,
          opacity:0,
        }}
        animate={{
          opacity:1,
          translateX:0,
        }}
        transition={{
          delay:200,
          type:'timing',
        }}
        numberOfLines={1} ellipsizeMode="tail" style={{
            color:'coral',
            fontSize:25,
            fontWeight:'bold',
            opacity:0.8,
            overflow: 'hidden',
        }}>{title}</MotiText>

        </View>
        <AntDesign name="back" size={25} color="white" onPress={()=> this.props.navigation.goBack()} style={{
        opacity:0.7,
      }}/>
        </View>
        <View style={{
            flex:1,
        }}>

          {!this.props.route.params.epData.length ? (

            <View style={{
              marginTop:100,
              justifyContent:'center',
              alignItems:'center',
              flex:1,
            }}>
              <NotFound message='Anime is still upcoming.'/>
            </View>
          ): (

<View>
        <FlatList
          data={this.renderItems()}
          renderItem={({item})=> <View>{item}</View>}
          keyExtractor={(item, index) => index.toString()}
          updateCellsBatchingPeriod={10}
          maxToRenderPerBatch={10}
          removeClippedSubviews={true}
          initialNumToRender={10}
          />
        <View style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems:'center',
             gap:5,
             paddingBottom:15,
             }}>

          <TouchableOpacity
           onPress={this.handlePreviousPage}
           disabled={this.state.currentPage === 1}
           style={{
            padding:10,
            borderBottomLeftRadius:15,
            borderTopLeftRadius:15,
            justifyContent:'center',
            alignItems:'center',
            backgroundColor:'coral',
            width:70,
            opacity:this.state.currentPage === 1? 0.5 : 0.8
           }}
          >
            <Text style={{
                color:'white',
                opacity:0.8
            }}>Previous</Text>
            </TouchableOpacity>

            <Text style={{
                color:'coral',
                borderWidth:1,
                padding:9,
                borderColor:'coral'
            }}>
            {this.state.currentPage}/{this.totalPages}
          </Text>

         <TouchableOpacity
          onPress={this.handleNextPage}
          disabled={this.state.currentPage === this.totalPages}
           style={{
            padding:10,
            borderBottomRightRadius:15,
            borderTopRightRadius:15,
            justifyContent:'center',
            alignItems:'center',
            backgroundColor:'coral',
            width:70,
            opacity:this.state.currentPage === this.totalPages? 0.5 : 0.8
           }}
          >
            <Text style={{
                color:'white'
            }}>Next</Text>

          </TouchableOpacity>
        </View>
      </View>

          )}

        </View>

      </SafeAreaView>
    )
}
}

export default React.memo(Episode)