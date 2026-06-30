import { View, Text, FlatList, TouchableOpacity} from 'react-native'
import React from 'react'
import axios from 'axios'
import { useState } from 'react'
import { Ionicons } from '@expo/vector-icons';
import { myContext } from '../context'
import { useContext } from 'react'
import { useEffect } from 'react';
import VideoLoad from './VideoLoading';
const Modals = ({handleBack,type,alldata, setData, setUrl, setNextEp, setClick,  choose, subOrDub, setChoose, clicking, setEpNum, setQuality}) => {

    const contextVal = useContext(myContext);

    const {getUserlikes, getAllLikes, getAllDisLikes, getDislikes, getUserWatchList} = contextVal;

    const [currentPage, setCurrentPage] = useState(1);

    const totalItems = alldata.length;
    const itemsPerPage = 10;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const [loading, setloading] = useState(false);

    const handlePreviousPage = () => {
      setloading(true);
        if (currentPage > 1) {
          setCurrentPage((prevState) => prevState - 1);
          setloading(true);
          setTimeout(() => {
            setloading(false);
          }, 2000);

        }
      };

    const handleNextPage = () => {

        if (currentPage < totalPages) {
         setCurrentPage((prevState) => prevState + 1);
         setloading(true);
         setTimeout(() => {
           setloading(false);
         }, 2000);

        }
      };

     const renderItems = () => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
        let data = alldata;

        const items = [];
        for (let i = startIndex; i < endIndex; i++) {
          items.push(

             <TouchableOpacity  onPress={()=> handleNewAnime(data[i].id, data[i].number)} style={{
                opacity:choose === data[i].id ? 1 : 0.7,
             }}>
              <View  style={{
                borderWidth:1,
                padding:15,
                borderRadius:5,
                marginBottom:10,
                borderColor:'coral',
                backgroundColor: choose === data[i].id ? 'coral':null,
              }}>
                <View style={{
                  flexDirection:'row',
                  alignItems:'center',
                  justifyContent:'space-between'
                }}>
                <Text style={{
                  fontWeight:'bold',
                  color:choose === data[i].id || choose === data[i].id ? 'white' : 'coral',
                }}>Episode {data[i].number}</Text>
                <View style={{
                  flexDirection:'row',
                  justifyContent:'center',
                  gap:5,
                }}>

                {clicking && choose === data[i].id ? (
                   <Text style={{
                    color:'white',
                    fontSize:15,
                    fontWeight:'bold'

                  }}>/ Please wait... </Text>
                ): (

                  <Text style={{
                    color:choose === data[i].id ? 'white' : 'coral',
                    fontSize:15,
                    fontWeight:'bold'

                  }}>/ {choose === data[i].id ? ' Watching...' : subOrDub} </Text>

                )}

                </View>

                </View>

              </View>
                </TouchableOpacity>

          );

        }

        return items.map((item, index) => <View key={index}>{item}</View>);
      };

    const handleNewAnime = async (id, i) => {
        setClick(true);
        setNextEp(true);
        try {
          const url = `https://consumet-api-funk.onrender.com/anime/gogoanime/watch/${id}`;
          const { data } = await axios.get(url, { params: { server: "vidstreaming" } });
         setData(data.sources);
         setUrl(data.sources[0].url);
         setQuality(data.sources[0].quality);
         setChoose(id);
         setEpNum(i);
         setClick(false);
         setNextEp(false);
         getAllLikes(id);
         getAllDisLikes(id);
         getDislikes(id);
         getUserlikes(id);
         getUserWatchList(id);

      } catch (err) {
          throw new Error(err.message);
      }

      }

  useEffect(()=>{

    setloading(true);
    setTimeout(() => {
      setloading(false);
    }, 5000);
  },[])

  if(loading){
    return (
      <View style={{
        justifyContent:'center',
        alignItems: 'center',
        flex:1,

      }}>
        <VideoLoad message='Fetching episodes, please wait..'/>
      </View>
    )
  }

  return (

        <>

        <View style={{
            flexDirection: 'row',
            justifyContent:'space-between',
            marginBottom:15,
            alignItems: 'center',
            marginHorizontal:5,
        }}>

        <Text
        style={{
            color:'white',
            fontWeight:'bold',
            opacity:0.6,
        }}
        >Episode List:</Text>
        <TouchableOpacity onPress={()=> handleBack(type)} activeOpacity={0}>
        <Ionicons name="ios-backspace" size={25} color="coral" />
        </TouchableOpacity>

        </View>

       <FlatList
          data={renderItems()}
          renderItem={({item})=> <View>{item}</View>}
          keyExtractor={(item, index) => index.toString()}
          removeClippedSubviews={false}
          maxToRenderPerBatch={10}

        />
        <View style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems:'center',
             gap:5,
             paddingTop:20,
             }}>
          <TouchableOpacity
           onPress={handlePreviousPage}
           disabled={currentPage === 1}
           style={{
            padding:10,
            borderBottomLeftRadius:15,
            borderTopLeftRadius:15,
            justifyContent:'center',
            alignItems:'center',
            backgroundColor:'coral',
            width:70,
            opacity:currentPage === 1? 0.5 : 0.8
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
            {currentPage}/{totalPages}
          </Text>

         <TouchableOpacity
          onPress={handleNextPage}
          disabled={currentPage === totalPages}
           style={{
            padding:10,
            borderBottomRightRadius:15,
            borderTopRightRadius:15,
            justifyContent:'center',
            alignItems:'center',
            backgroundColor:'coral',
            width:70,
            opacity:currentPage === totalPages? 0.5 : 0.8
        }}
        >
            <Text style={{
                color:'white'
            }}>Next</Text>

          </TouchableOpacity>
        </View>

            </>
  )
}

export default Modals