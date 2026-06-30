import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, StatusBar, ActivityIndicator, TouchableWithoutFeedback, Animated , FlatList } from 'react-native';
import { Video } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import Slider from '@react-native-community/slider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimistLoading from './AnimistLoading';
import VideoLoad from './VideoLoading';
import axios from 'axios';
import MostRecentRelease from './MostRecentRelease';
import { myContext } from '../context';
import { useContext } from 'react';
import Comments from './Comments';
import NextEpisods from './NextEpisodes';
import { AntDesign } from '@expo/vector-icons';
import { db } from '../firebase';
import { collection, addDoc, doc ,deleteDoc, serverTimestamp, updateDoc} from 'firebase/firestore';
import LikesComp from './LikesComp';
import { useMemo } from 'react';
import { AppState } from 'react-native';
import { MotiView } from 'moti';

const recentEp = "  https://consumet-api-funk.onrender.com/anime/gogoanime/recent-episodes";

const CustomVideoPlayer = ({epId, epNumber, title, type, epData, subOrDub, navigation, animeStatus,titleId, current}) => {

  const contextValue = useContext(myContext);
  const {userData, getAllComments,  historyRecords,getEpisodeIdbyDefault, allLikeData,  likesData, getUserlikes, allComments} =  contextValue;

  const videoRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [status, setStatus] = React.useState({});
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [EpisodeData, setData] = useState([]);
  const [quality, setQuality] = useState(null);
  const [url, setUrl] = useState(null);
  const [choose, setChoose] = useState(null);
  const [number,setEpNum] = useState(null);
  const [clicking, setClick] = useState(false);
  const [nextEp, setNextEp] = useState(false);
  const [resentRelease, setRecents] = useState([]);
  const [istitle, setTitle] = useState('');
  const [position, setPosition] = useState(null);
  const [playNext, setPlayNext] = useState(false);
  const [userId, setUserId] = useState(null);
  const [vLoading, setVLoading] = useState(false);
  const [nexToPlayEp, setNextEpisodes] = useState(null);
  const [collectionId, setCollectionId] = useState(null);
  const [titleIds, setTitleIds] = useState(null);
  const [disAbled, setDisAbled] = useState(false)
  const [allQuality, setAllQuality] = useState([]);
  const [nVloading, setNVloading] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const [error, setError] = useState(false);
  const [spin, setSpin] = useState(false);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [animeStats, setAnimeStats] = useState(null);
  const source = axios.CancelToken.source();

  const controlsOpacity = useRef(new Animated.Value(1)).current;
  let hideControlsTimeout;
  let timer;

  useEffect(() => {
    if (isFullscreen) {
      enableFullScreen();
      return;
    }
    disableFullScreen();
  }, [isFullscreen]);

  useEffect(() => {
    resetTimer();
    return () => {
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      setAppState(nextAppState);
      if (nextAppState === 'active') {
        return;
      } else {
        let r1 = historyRecords.find(v => v.data.animeId === choose);
        if(!r1){
           addDoc(collection(db, 'history'), {
            userId: userData.id,
            animeId: choose,
            name: userData.user,
            quality: quality,
            count:1,
            url: url,
            titleId:titleIds,
            positionMillis: currentTime,
            durationMillis:duration,
            epiNumber:number,
            createdAt: serverTimestamp(),
          }).then(()=> console.log('Some updates in databse')).catch((err)=> console.log('went wrong!', err));
          return;
        }else{

         const r3 = doc(db, "history", r1.id);
         updateDoc(r3, {
           positionMillis:currentTime,
           quality:quality,
           url:url,
           count:1,
        }).then(()=>{
          console.log('Update in database');
        }).catch((error)=>{
          console.log('went wrong in update databse');
        });

          return;
        }
        return;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [appState]);

  const handleDebounceStart = useCallback(() => {
    setIsDebouncing(true);
  }, []);

  const handleDebounceEnd = useCallback(() => {
    setIsDebouncing(false);
  }, []);

  const handleVideoError = () => {
    setError(true);
  };

  const hideControls = useCallback(() => {
    Animated.timing(controlsOpacity, {
      toValue: 0,
      duration: 3000,
      useNativeDriver: true,
    }).start(() => setShowControls(false));
  },[showControls]);

  const handleTouch = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideControlsTimeout);
    resetTimer();
  },[showControls]);

  const resetTimer = () => {
    clearTimeout(timer);
    timer = setTimeout(hideControls, 3000);
  };

  const enableFullScreen = async () => {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  };

  const disableFullScreen = async () => {
    await ScreenOrientation.unlockAsync();
  };

  const handleVideoLoad = useCallback(async () => {

    const { durationMillis } = await videoRef.current.getStatusAsync();
    setDuration(durationMillis);
  }, [duration]);

  const handlePlaybackStatusUpdate = useCallback((status) => {

     if(!status.isLoaded && !status.didJustFinish){
     let r1 = historyRecords.find(v => v.data.animeId === choose);
     if(!r1){
        addDoc(collection(db, 'history'), {
         userId: userData.id,
         animeId: choose,
         name: userData.user,
         quality: quality,
         count:1,
         url: url,
         titleId:titleIds,
         positionMillis: currentTime,
         durationMillis:duration,
         epiNumber:number,
         createdAt: serverTimestamp(),
       }).then(()=>{
        console.log('added successfully');
       }).catch((error)=> console.log('Theres a problem in databse.'));
       return;
     }else{

      const r3 = doc(db, "history", r1.id);
      updateDoc(r3, {
        positionMillis:currentTime,
        quality:quality,
        url:url,
        count:1,
       }).then(()=>{
        console.log('update successfully');
       }).catch((error)=> console.log('there was an error!'));

       return;
     }

     }

    if (status.isBuffering && !status.isPlaying) {
      setIsVideoLoading(true);
      setIsVideoPaused(true);
    } else {
      setIsVideoLoading(false);
      setIsVideoPaused(false);
      setStatus(status);
      setCurrentTime(status.positionMillis);
    }

    if(type !== 'episode' && status.didJustFinish){
      setPosition(null);
      let h = historyRecords.find(e=> e.data?.animeId === choose);
      if(h?.data.animeId === choose){
      deleteDoc(doc(db, 'history', h.id)).then(()=> console.log('done deleting')).
      catch((error)=> console.log('there was an error'));
      }
      return;
    }

    if (type === "episode" && status.didJustFinish) {

      if(number < epData.length) {
        setPlayNext(true);
        let h = historyRecords.find(e=> e?.data.animeId === choose);
        if(h?.data.animeId === choose){
         deleteDoc(doc(db, 'history', h.id)).then(()=> console.log('deleted success')).catch((error)=>{
          console.log('something went wrong', error)
         });
        }
        let nextEp = epData.find(e => e.number > number);
        if(!nextEp){
          setPlayNext(false);
          nextEpisodes(1);
          return null;
        }
        if(nextEp.number){
          setPlayNext(true);
          setChoose(nextEp.id);
          getUserlikes(nextEp.id);
          setEpNum(nextEp.number);
          nextEpisodes(nextEp.number);
          getAllComments(nextEp.id);
          let datEp = fetchingPlayVideo(nextEp.id)
          datEp.then(data => {
          const qualy = data.sources?.filter(item => item.quality.match(/\d+/g));
            setData(data.sources);
            setUrl(qualy[3].url);
            setQuality(qualy[3].quality || qualy[0].quality);
            setPlayNext(false);
         })
        }

        return

      }
    }

  },[position, number , url, titleIds]);

  const handleBackward = useCallback(() => {
    const newTime = Math.max(0, currentTime - 100000);
    videoRef.current.setPositionAsync(newTime);
    setCurrentTime(newTime);
    setPosition(newTime);
    console.log('effect');
  }, [currentTime])

  const handleForward = useCallback(() => {
    const newTime = Math.min(duration, currentTime + 100000);
    videoRef.current.setPositionAsync(newTime);
    setCurrentTime(newTime);
    setPosition(newTime);
    console.log('effect')
  },[currentTime])

  const toggleFullscreen = async () => {
    setIsFullscreen(!isFullscreen);
  };

  const formatTime = (time) => {
    const seconds = Math.floor(time / 1000);
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const formattedSeconds = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${formattedSeconds}`;
  }

  const curr = useMemo(()=> formatTime(currentTime),[currentTime])
  const durr =  useMemo(()=> formatTime(duration),[duration])

  const togglePlayPause = useCallback (() => {
    if (status.isPlaying) {
      videoRef.current.pauseAsync();
    } else {
      videoRef.current.playAsync();
    }
  },[status.isPlaying]);

  const handleSliderValueChange = useCallback((value) => {
    setCurrentTime(value);
    setPosition(value)
  },[isSeeking, position]);

  const handleSliderSlidingStart = useCallback(() => {
    setIsSeeking(true);
  },[isSeeking,position]);

  const handleSliderSlidingComplete = useCallback(async (value) => {
    setIsSeeking(false);
    await videoRef.current.setPositionAsync(value);
  },[isSeeking, position]);

  const  vidQuality = useCallback ((quality) => {
    let {url} =  EpisodeData.find(item => item.quality === quality);
    setQuality(quality);
    setNextEp(true);
    setNVloading(true);
    setUrl(url);
    setTimeout(() => {
     setPosition(currentTime);
     setNVloading(false);
     setNextEp(false);
    }, 2000);

 },[quality, url, position, EpisodeData])

  const fetchingPlayVideo = useCallback(async (ep) => {

    try {
      const url = `https://consumet-api-funk.onrender.com/anime/gogoanime/watch/${ep}`;
      const { data } = await axios.get(url, { params: { server: "vidstreaming" } });
      return data;
    } catch (error) {
      console.log('theres an error here', error);
    }

  },[epId])

  const handleReset = useCallback(() => {
    if(status.didJustFinish){
      setPosition(0);
    }
  },[position])

  const getPlayEpisode = useCallback((source) => {
      try {
        const data2  = axios.get(recentEp, { params: { page: 1, type: 1 }, cancelToken: source.token});
        Promise.all([fetchingPlayVideo(epId), data2]).then(response => {
          let h = historyRecords.find(e=> e.data.animeId === epId);
          if(!h){
           setPosition(null);
           setData(response[0].sources);
          setUrl(response[0].sources[0].url);
          setQuality(response[0].sources[0].quality);
          setRecents(response[1].data.results);
          setAllQuality(response[0].sources.filter(item => item.quality.match(/\d+/g)))
          setTitle(title);
           return;
          }else{
            setData(response[0].sources);
            setUrl(h.data.url);
            setQuality(h.data.quality);
            setRecents(response[1].data.results);
            setAllQuality(response[0].sources.filter(item => item.quality.match(/\d+/g)))
            setTitle(title);

          }
        }).catch((error)=>{
          console.log('there was an error', error);
        })

    } catch (err) {

    }
  },[epId])

const handleBack = (type) => {

  if(type === 'episode') {
    navigation.goBack();
    return;
  }
  navigation.navigate('Home');

}

 const nextEpisodes = useCallback((epN) => {
  if (type === "episode") {
    if(epN === epData.length){
      let nextEp = epData.find(e => e.number === 1 || e.number === 0);
      setNextEpisodes(nextEp);
      return;
    }
    if(epN < epData.length) {
      let nextEp = epData.find(e => e.number > epN);
      setNextEpisodes(nextEp);
      return;
    }
  }

 },[nexToPlayEp])

 const butangPosition = (ee) => {
   let h = historyRecords.find(e=> e.data.animeId === ee);
   if(!h){
    setPosition(null);
    return;
   }else{
    setPosition(h.data.positionMillis);
    setCurrentTime(h.data.positionMillis);
    setCollectionId(h.id);
    setUrl(h.data.url);
    setQuality(h.data.quality);

    return;
   }
 }

  const updateHistoryss = () => {
    try {
      let v5 = historyRecords.find(e=> e?.data.count === 1 && e?.data.animeId === current && e?.data.titleId === titleId);
      if(!v5){
        return;
      }
      const r3 = doc(db, "history", v5.id);
      updateDoc(r3, {
      count:0,
     })

    } catch (error) {
      console.log(error)
    }

  }

  const reloadVideo = useCallback(() => {
    setSpin(true);
    setTimeout(async() => {
      setSpin(false);
      setError(false); // Clear the error state
      if (videoRef.current) {
        await videoRef.current.playAsync(); // Play the video
      }
    }, 3000);

  },[spin]);

  const records = (choose) => {
    let v6 = historyRecords.find(e=> e?.data.animeId === choose);
    return v6;
  }

  const data5 = (epData) => {
    return type === 'episode' ? epData :  null;
  }

  const hAllepi = (allQuality) => {
    return allQuality
  }

  const alldata = useMemo(()=> data5(epData), [epData])
  const v6 = useMemo(()=> records(choose),[choose])
  const qualities = useMemo(()=> hAllepi(allQuality),[allQuality]);

  useEffect(()=>{
    setTitleIds(titleId)
    setChoose(epId);
    setEpNum(epNumber);
    setVLoading(true);
    getPlayEpisode(source);
    getUserlikes(epId);
    nextEpisodes(epNumber);
    getAllComments(epId);
    butangPosition(epId);
    getEpisodeIdbyDefault(epId, epNumber);
    updateHistoryss();
    setNVloading(true);
    setAnimeStats(animeStatus)

   setTimeout(() => {
      setNVloading(false);

    }, 5000);

    setTimeout(() => {
      setVLoading(false);
    },7000);

    return () => {
      source.cancel('Component Unmounter');
    }

  }, [])

    if(!EpisodeData.length) {
      return (
        <SafeAreaView style={{
          flex:1,
          justifyContent: 'center',
          alignItems:'center',
          backgroundColor:'rgba(0, 0, 0, .8)'
        }}>
          <AnimistLoading />
        </SafeAreaView>
      )
    }

  return (

    <>

    <TouchableWithoutFeedback  onPress={handleTouch} >
    <View style={isFullscreen ? styles.container1: styles.container}>
    <StatusBar hidden={isFullscreen} />

      {error? (
        <View style={{
          justifyContent:'center',
          alignItems:'center',
          gap:20,
        }}>
          <Text style={{
            color:'white',
          }}>Something is wrong on the internet.</Text>

          {spin ? (
             <ActivityIndicator size="small" color="coral" />
          ): (
            <TouchableOpacity onPress={reloadVideo}>
                 <Ionicons name="reload" size={24} color="coral" />
            </TouchableOpacity>
          )}
        </View>
      ):nVloading ? (
        <View>
          <Text style={{
            color:'white',
          }}>
            <Text style={{
              fontWeight:'bold',
            }}>{v6? 'Resuming video...': 'Please wait...'}</Text>
          </Text>
        </View>
      ): (
        <Video
        ref={videoRef}
        source={{uri: url}}
        style={isFullscreen ? styles.fullscreenVideo : styles.video}
        resizeMode="contain"
        shouldPlay
        onError={handleVideoError}
        onLoad={handleVideoLoad}
        positionMillis={position}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        useNativeControls={false}
      />

      )}

     {(isVideoLoading || isVideoPaused) && (
        <View style={styles.loadingContainer}>
          {isVideoLoading && <ActivityIndicator size="large" color="coral" />}
        </View>
      )}

     {type === 'episode' && status.didJustFinish && playNext && (
        <View style={styles.loadingContainer}>
           <VideoLoad nextEp = {nextEp} message={`Playing next episode ${number}.`} />
        </View>
      )}

      {type !== 'episode' && status.didJustFinish && (
        <View style={styles.loadingContainer}>
           <TouchableOpacity onPress={handleReset}>
           <Ionicons name="reload" size={45} color="white"/>
           </TouchableOpacity>
        </View>
      )}

  {!error && showControls && (

      <View style={styles.controls}>

        <View style={{
          flexDirection:'row',
          position:'absolute',
          bottom:isFullscreen ? 150 : 80,
          gap:50,
          opacity: 1,
        }}>
          {isFullscreen && (
 <Text style={{
  color:'white',
  position:'absolute',
  top:-140,
  left:-275,
  fontWeight:'bold',
}}>You are watching episode {number}.</Text>
          )}

        <TouchableOpacity onPress={handleBackward}>
        <MaterialCommunityIcons name="fast-forward-10" size={50} color="white" style={{ transform: [{ scaleX: -1 }] }} />
        </TouchableOpacity>

          <TouchableOpacity onPress={togglePlayPause}>
            <Text style={styles.button}>{status.isPlaying ? <Ionicons name="pause" size={50} color="white" /> : <FontAwesome name="play" size={50} color="white" />}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleForward}>
          <MaterialCommunityIcons name="fast-forward-10" size={50} color="white"  />
        </TouchableOpacity>

        </View>

        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration}
          value={currentTime}
          minimumTrackTintColor="coral"
          maximumTrackTintColor="white"
          thumbTintColor="coral"
          onValueChange={handleSliderValueChange}
          onSlidingStart={handleSliderSlidingStart}
          onSlidingComplete={handleSliderSlidingComplete}
        />
        <View style={{
          position: 'absolute',
          bottom:25,
          justifyContent:'space-between',
          width:'100%',
          left:25,
        }}>
        <Text style={styles.time}>{curr} / {durr}</Text>
        </View>

        <TouchableOpacity onPress={toggleFullscreen}>
        <Ionicons
          name={isFullscreen ? 'md-contract' : 'md-expand'}
          size={24}
          color="white"
          style={{
            opacity:0.7,
            marginRight:20,
          }}
        />
        </TouchableOpacity>
      </View>

)}
    </View>
    </TouchableWithoutFeedback>
    {!isFullscreen && (
       <View style={{
        flex:1,
        backgroundColor:'rgba(0, 0, 0, .8)',
      }}>

      <View style={{
        flexDirection:'row',
        justifyContent:'space-between',
        gap:10,
        marginHorizontal:13,
        marginTop:10,
      }}>
        <View>
        <Text style={{
        color:'white',
        opacity:0.7,
        fontSize:10,
        fontStyle:'italic',
      }}>You are watching:</Text>

      <View  style={{width:230, flexDirection:'row', marginBottom:2}}>
          <Text style={{flex: 1, flexWrap: 'wrap',
          fontSize:istitle?.length > 20? 15:20,
          fontWeight:'bold',
          color:'coral',
          opacity:0.8
          }} numberOfLines={1} ellipsizeMode="tail" >{istitle}.
          </Text>
      </View>

     <Text style={{
        color:'white',
        opacity:0.7
      }}><Text style={{
        color:'white',
        opacity:1,
        textTransform:'capitalize'
      }}>{!subOrDub ? 'Sub': subOrDub} / Episode {number}</Text>
      </Text>
      <Text style={{
        color:'white',
        marginTop:7,
        opacity:0.8
      }}>Status: <Text style={{
        color:'coral',
        fontWeight:'bold',
      }}>{animeStats}.</Text></Text>
        </View>
        <View>
         <LikesComp
        choose={choose}
        allLikeData={allLikeData}
        likesData={likesData}
        setDisAbled={setDisAbled}
        userData={userData}
        isDebouncing={isDebouncing}
        onDebounceStart={handleDebounceStart}
        onDebounceEnd={handleDebounceEnd}
        />
        </View>

      </View>

      <Text style={{
      marginLeft:15,
      opacity:0.5,
      marginTop:10,
      marginBottom:5,
      color:'white',
      textAlign:'center',
     }}><Text style={{
      color:'coral',
      fontWeight:'bold',
     }}>/</Text> Choose quality</Text>

      <View style={{
        flexDirection:'row',
        gap:10,
        marginTop:10,
        justifyContent:'center',
        alignItems:'center',
      }}>
      {!qualities?.length ? (
          <Text style={{
            color:'white',
            fontSize:15,
            opacity:0.7
          }}>No quality found!</Text>
        ):(

          <FlatList
          removeClippedSubviews={true}
        data={qualities}
        initialNumToRender={4}
        renderItem={({item, index}) => (
<TouchableOpacity  onPress={()=> vidQuality(item.quality)}>
            <MotiView
            from={{
              opacity:0,
              translateX:-500,
              zIndex:0,
            }}
            animate={{
              opacity:1,
              translateX: nextEp ? 500: 0,
              zIndex:1,
            }}
            transition={{
              delay: index * 300,
              type:'timing',
            }}
            style={{
              borderWidth:1,
              padding:5,
              borderRadius:3,
              width:50,
              justifyContent:'center',
              alignItems:'center',
              borderColor:'coral',
              backgroundColor: item.quality === quality? 'coral' : null,
            }}>
              <Text style={{
                color:item.quality === quality? 'white' : 'coral',
              }}>{item.quality}</Text>
            </MotiView>
              </TouchableOpacity>

        )}
        contentContainerStyle={{
          flexDirection:'row',
          justifyContent:'center',
          alignItems:'center',
          gap:5,
        }}
        keyExtractor={(item, index) => index.toString()}
      />
        )

       }
      </View>

      <View style={{
        marginVertical:15,
        marginHorizontal:10,
        flex:1,
      }}>

{type !== 'episode' && (

<View style={{

  gap:10,

}}>
  <View style={{
    flexDirection:'row',
    justifyContent:'space-between',
    marginHorizontal:10,
  }}>
  <Text style={{
    color:'white',
    opacity:0.5,
  }}>
    Recent release:
  </Text>

      <TouchableOpacity onPress={()=> navigation.replace('ReleaseAnime')}>
        <Text style={{
          color:'white',
          opacity:0.5,
        }}>See more</Text>
        </TouchableOpacity>

  </View>

       {resentRelease?.length > 0 && (
        <MostRecentRelease
        setData={setData}
        setUrl={setUrl}
        setClick={setClick}
        clicking={clicking}
        setEpNum={setEpNum}
        setQuality={setQuality}
        setTitle={setTitle}
        setChoose={setChoose}
        choose={choose}
        resentRelease={resentRelease}
        setNextEp={setNextEp}
        navigation = {navigation}
        setTitleIds={setTitleIds}
        getUserlikes={getUserlikes}
        setAllQuality={setAllQuality}
        setAnimeStats={setAnimeStats}
        status={status}
        nextEp={nextEp}

  />

       )}

</View>
)}

     {nextEp && (

      <View style={{
        width:'100%',
        height:'100%',
        justifyContent:'center',
        alignItems:'center',
        zIndex:100,
        position:'absolute',
        backgroundColor:'rgba(0,0,0,0.3)',
      }}>

        <VideoLoad nextEp = {nextEp} message='Please wait...'/>

      </View>

      )}

      {type === 'episode' && (
        <>

         {vLoading ? (
          <View style={{
            justifyContent:'center',
            alignItems:'center',
            marginTop:40,
            marginBottom:20,
            flex:1,
            gap:10,
          }}>

            <ActivityIndicator size="large" color="coral" />
            <Text style={{
              color:'white',
              opacity:0.8,
              fontWeight:'bold',

            }}>Please wait...</Text>

        </View>
         ): (
          <>

<Comments
       choose={choose} userData={userData} disAbled = {disAbled} setDisAbled={setDisAbled}
       allComments={allComments}
       isDebouncing={isDebouncing}
          onDebounceStart={handleDebounceStart}
         onDebounceEnd={handleDebounceEnd}
       />
           <NextEpisods nexToPlayEp={nexToPlayEp}
            subOrDub={subOrDub}
            epNumber={epNumber}
            nextEpisodes={nextEpisodes}
            alldata={alldata}
            setData={setData}
            setUrl={setUrl}
            setChoose={setChoose}
            setNextEp={setNextEp}
            setClick={setClick}
            choose={choose}
            clicking={clicking}
            setEpNum={setEpNum}
            setQuality={setQuality}
            navigation={navigation}
            handleBack={handleBack}
            userId = {userId}
            number={number}
            status={status}
            butangPosition={butangPosition}
            setVLoading={setVLoading}
            setNVloading={setNVloading}
            setAllQuality={setAllQuality}

            />
            </>

         )}

         <TouchableOpacity style={{
          justifyContent:'center',
          alignItems:'center',
          height:40,
          flexDirection:'row',
          gap:5,
          paddingTop:10,
         }}
         onPress={()=> navigation.replace('AnimeDetail', {
          animeId:titleId,
        })}
         >
            <AntDesign name="arrowleft" size={22} color="coral" />
            <Text style={{
              color:'white',
              fontSize:15,
              fontWeight:'bold',
              opacity:0.8,
            }}>See more episodes </Text>
          </TouchableOpacity>
      </>
      )}

      </View>
      </View>

    )}

</>
  );
};

const styles = StyleSheet.create({
  container: {
    height:233,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',

  },

  fullscreenVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  container1: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingTop:50,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  controls: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    color: '#fff',
    fontSize: 18,
    marginHorizontal: 10,
  },
  slider: {
    flex:1,
    marginHorizontal: 10,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    width: '80%',
  },
  time: {
    color: '#fff',
    fontSize: 16,
  },
  fullscreenButton: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CustomVideoPlayer;
