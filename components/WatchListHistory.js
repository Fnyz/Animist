import { View, Text, FlatList, TouchableOpacity, Pressable, Alert } from 'react-native'
import React, { useEffect } from 'react'
import { myContext } from '../context'
import { useContext } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import { MaterialIcons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import AnimistLoading from './AnimistLoading'
import { Menu } from 'react-native-paper';
import { PaperProvider } from 'react-native-paper'
import { Entypo } from '@expo/vector-icons';
import { db } from '../firebase'
import { query, where, getDocs, deleteDoc, collection, and} from 'firebase/firestore'
import VideoLoad from './VideoLoading'
import WatchListList from './WatchListList'
import NotFound from './NotFound'
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react'
import MessageModal from './MessageModal'
import { MotiView } from 'moti'

const WatchListHistory = ({navigation}) => {

  const [currentPage, setCurrentPage] = useState(1);
   const [isLoading, setIsLoading] = useState(true);
   const ls = useContext(myContext);
   const {userWatchList, userData} = ls;
   const [choose, setchoose] = useState(null);
   const [visible, setVisible] = useState(false);
   const [isloading, setloading] = useState(false);
   const [select, setSelect] = useState(false);
   const [selectedItems, setSelectedItems] = useState([]);
   const [message, setMessage] = useState('');
   const [loadMore, setLoadMore] = useState(false);
   const [visible2, setVisible2] = useState(false);
   const [loadNow, setLoadNow] = useState(false);
   const [makechange, setMakechange] = useState(false);
   const totalItems = userWatchList.length;
   const itemsPerPage = 10;
   const totalPages = Math.ceil(totalItems / itemsPerPage);

   useEffect(()=>{
    setTimeout(() => {
        setIsLoading(false);
    }, 5000);
   },[])

   const handleItemSelection = useCallback((titleId) => {
    const updatedSelection = selectedItems.includes(titleId)
      ? selectedItems.filter((id) => id !== titleId)
      : [...selectedItems, titleId];
    setSelectedItems(updatedSelection);

  },[selectedItems.length]);

   const handlechange = useCallback((id) => {
    setchoose(id);
  },[choose])

  const openMenu = useCallback(() => {
    setVisible(true);
  },[visible])
  const closeMenu = useCallback(() => {
    setVisible(false);
  },[visible])

  const hideModal2 = useCallback(() => {
    setVisible2(false);
    setVisible(false);
    setSelect(false);
    setSelectedItems([]);
  },[visible2])
  const handleSelected = useCallback(() => {
    setSelect(true);
    setVisible(false);
  },[select, visible])

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev)=> prev - 1)
      setLoadMore(true);
      setMessage('Please wait fetching previous page...')
      setTimeout(() => {
        setLoadMore(false);
      },1000);
    }
  };

  const deletDocss = useCallback(async () => {
    setVisible2(false);
    setSelect(false);
    setloading(true);
    setLoadNow(true);
    setMakechange(true);
    setMessage('Please wait selected item will be deleted.')
    try {

      selectedItems.forEach(async (i) => {
         const q = query(collection(db, "watchList"), and(where("userId", "==", userData.id), where("titleId", "==", i)));
         const batch = [];
         const querySnapshot = await getDocs(q);
          querySnapshot.forEach((doc) => {
       batch.push(deleteDoc(doc.ref));
        });

          await Promise.all(batch).then(()=>{
           setloading(false);
           setVisible(false);
           setVisible2(false);
           setSelectedItems([]);
           setSelect(false);
           setMessage('')
           setLoadNow(false);
           setMakechange(false);
          });
      });

    } catch (error) {
      console.error('Error deleting selected items:', error);
    }

  },[visible2])

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev)=> prev + 1)
      setLoadMore(true);
      setMessage('Please wait fetching next page...')
      setTimeout(() => {
        setLoadMore(false);
      },1000);
    }

  };

  const handleSeletectItemDelete = useCallback(() => {
    setVisible2(true);
  },[visible2])

  const handleClose = () => {

    setloading(false);
    setVisible(false);
    setSelectedItems([]);
    setSelect(false);
    setMessage('');

  }

  const clearAllHistory = async () => {
    setloading(true);
    setVisible(false);
    setMessage('Please wait all items in history is deleted.');
    try {

      const q = query(collection(db, "watchList"), where("userId", "==", userData.id));
      const batch = [];
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
       batch.push(deleteDoc(doc.ref));
       });
      await Promise.all(batch)
      .then(()=> {
        setloading(false)
        setMessage('');
      });

    } catch (error) {
      console.error('An error occurred while deleting documents:', error);
    }
  }

  renderItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

    const list = userWatchList.sort((a, b) => b.data.createdAt - a.data.createdAt);

    const items = [];
    for (let i = startIndex; i < endIndex; i++) {

      items.push(
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
          delay: i * 200,
        }}
        >
        <WatchListList selectedItems={selectedItems}  handleItemSelection={handleItemSelection} select={select} list={list} i = {i} userWatchList={userWatchList} navigation={navigation} choose={choose} handlechange={handlechange} setLoadMore={setLoadMore} setMessage={setMessage} makechange={makechange}/>
        </MotiView>
      );

    }

    return items.map((item, index) => <View key={index}>{item}</View>);
  };

   if(isLoading) {
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

  let watchListHistory  = userWatchList.sort((a, b) => b.data.createdAt - a.data.createdAt);

  return (
    <>

    <PaperProvider>

    <SafeAreaView
    style={{
        flex:1,
        backgroundColor:'rgba(0,0,0,0.8)',
        position:'relative',
    }}>

         {isloading && (
          <View style={{
            position:'absolute',
           left:0,
           top:0,
           bottom:0,
           right:0,
           backgroundColor:'rgba(0,0,0,0.8)',
           zIndex:99,
          }}>
            <VideoLoad message={message}/>
          </View>
         )}
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
          }}>WatchList</Text>

        </View>
         <View style={{
          flexDirection:'row',
          justifyContent:'space-between',
          alignItems:'center',
          gap:5,
         }}>

         <Menu
            visible={visible}
            onDismiss={closeMenu}
            style={{
              position:'absolute',
              left:165,
              top:30,
              width:160,
              zIndex:10,
              height:50,

            }}
            anchor={
                 watchListHistory.length > 1 && (
                  <TouchableOpacity disabled={!select ?  false: true} onPress={openMenu}>
                  <Entypo name="dots-three-vertical" size={20} color="coral" style={{
                   paddingTop:2,

               }} />
                 </TouchableOpacity>
                 )
              }
            >

            <Menu.Item  onPress={() => handleSelected()} title="Select" leadingIcon='information-outline' />
            <Menu.Item onPress={() => clearAllHistory()} title="Clear history" leadingIcon='trash-can-outline' titleStyle={{
              color:'red'
            }} />
          </Menu>
        <TouchableOpacity onPress={()=> navigation.goBack()}>

        <FontAwesome name="home" size={24} color="coral" style={{
            opacity:0.8,
        }}/>

        </TouchableOpacity>

         </View>

        </View>

      {loadMore ? (
        <View style={{
          flex:1,
        }}>
          <VideoLoad message={message}/>
        </View>
      ): (
      <View style={{
        flex:1,
      }}>

      {!watchListHistory.length ? (
        <View style={{
            justifyContent: 'center',
            alignItems: 'center',
            flex:1,
            paddingTop:100,
        }}>
           <NotFound message='No watchlist found.'/>
        </View>
      ): (

        <View style={{
         flex:1,
         marginTop:10,
        }}>
        <FlatList
        data={renderItems()}
        renderItem = {({item})=> (
          <Pressable onPress={()=> handlechange(null)}>
            <PaperProvider>
              {item}
          </PaperProvider>
          </Pressable>

        )}
        keyExtractor={(item, index) => index.toString()}
        style={{
          paddingBottom:25,
          paddingHorizontal:10,
        }}
        contentContainerStyle={{
          paddingTop:25,

        }}
        />
        </View>

      )}

      {select && (

        <View style={{
          flexDirection:'row',
          position:'absolute',
          zIndex:11000,
          bottom:0,
        }}>

       <TouchableOpacity onPress={handleSeletectItemDelete} disabled={selectedItems.length ? false: true}>
        <View style={{
          borderWidth:1,
          width:320,
          justifyContent:'center',
          alignItems: 'center',
          paddingVertical:20,
          backgroundColor:'coral',
          opacity:0.8,
        }}>
        <Text style={{
          color:'white',
          fontSize:15,
          fontWeight:'bold',
        }}>{selectedItems.length ? 'Delete selected item.' : 'Select an item to delete.' }</Text>
      </View>
        </TouchableOpacity>

         <TouchableOpacity onPress={handleClose}>
        <View style={{
          borderWidth:1,
          width:75,
          borderColor:'coral',
          height:60,
          justifyContent:'center',
          alignItems:'center',
        }}>
         <Ionicons name="arrow-back-circle-outline" size={27} color="coral" />
        </View>
         </TouchableOpacity>

        </View>

      )}
</View>

      )}

      {!select && (

<View style={{
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems:'center',
   gap:5,
   paddingBottom:15,
   paddingTop:15,
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
disabled={currentPage === totalPages ? false: true}
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

      )}

       <View style={{
          position:'absolute',
          width:'100%',
          height:visible2 ? '100%': 0,
          opacity:visible2 ? 1: 0,
         }}>
      <MessageModal message={`Are you sure you to delete these ${selectedItems.length} selected items?`} visible={visible2} hideModal ={hideModal2} deletDocss={deletDocss} loadNow={loadNow} />
       </View>
    </SafeAreaView>
  </PaperProvider>
  </>
  )
}

export default WatchListHistory