
import { createContext, useState, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';
import { where, query, and, onSnapshot, collection, addDoc, doc ,orderBy, serverTimestamp, updateDoc} from 'firebase/firestore';

const myContext = createContext();

const GlobalProvider = ({children}) => {

    const [userData, setUserData] = useState(null);
    const [likesData, setLikesData] = useState([]);
    const [allLikeData, setAllLikeData] = useState([]);
    const [episodeId, setEpisodeId] = useState(null);
    const [userWatchList, setUserWatch] = useState([]);
    const [allComments, setAllComments] = useState([]);
    const [historyRecords , setHistoryRecords] = useState([]);
    const [profile, setProfile] = useState(null);

    const likesUnsubRef = useRef(null);
    const allLikesUnsubRef = useRef(null);
    const watchListUnsubRef = useRef(null);
    const commentsUnsubRef = useRef(null);
    const historyUnsubRef = useRef(null);
    const profileUnsubRef = useRef(null);

    useEffect(() => {
      return () => {
        if (likesUnsubRef.current) likesUnsubRef.current();
        if (allLikesUnsubRef.current) allLikesUnsubRef.current();
        if (watchListUnsubRef.current) watchListUnsubRef.current();
        if (commentsUnsubRef.current) commentsUnsubRef.current();
        if (historyUnsubRef.current) historyUnsubRef.current();
        if (profileUnsubRef.current) profileUnsubRef.current();
      };
    }, []);

 const setUserIdhere = async (id, user) => {
      try {
        const userData = {
          user,
          id,
        }
        setUserData(userData);
        fetchHistory(userData.id);
        getUserWatchList(userData.id);
        getUserProfile(userData.id);
        await AsyncStorage.setItem('profile', JSON.stringify(userData));
      } catch (e) {
       console.log('error fetching user')
      }
};

const getEpisodeIdbyDefault = (id, num) => {
   let dt = {
    id,
    num,
   }
   setEpisodeId(dt);
}
const getUserlikes = (epID) => {
    if (likesUnsubRef.current) likesUnsubRef.current();
    try {
      const docs = collection(db, 'likes');
      const ref = query(docs, where('animeId', '==', epID));
      likesUnsubRef.current = onSnapshot(ref, (list) => {
        let value = [];
        list.docs.forEach(element => {
          value.push({ data: element.data(), id: element.id });
        });
        setLikesData(value);
      });
    } catch (error) {
      console.log('error fetching userlikes')
    }
}

const getUserWatchList = (id) => {
  if (watchListUnsubRef.current) watchListUnsubRef.current();
  try {
    const docs = collection(db, 'watchList');
    const ref = query(docs, where('userId', '==', id));
    watchListUnsubRef.current = onSnapshot(ref, (list) => {
      let value = [];
      list.docs.forEach(element => {
        value.push({ data: element.data(), id: element.id });
      });
      setUserWatch(value);
    });
  } catch (error) {
    console.log('error fetching userwatch')
  }
}

const getAllLikes = (epID) => {
  if (allLikesUnsubRef.current) allLikesUnsubRef.current();
  try {
    const docs = collection(db, 'likes');
    const ref = query(docs, where('animeId', '==', epID));
    allLikesUnsubRef.current = onSnapshot(ref, (list) => {
      let value = [];
      list.docs.forEach(element => {
        value.push({ data: element.data(), id: element.id });
      });
      setAllLikeData(value);
    });
  } catch (error) {
    console.log('error fetching alllikes')
  }
}

const getAllComments = (epId) => {
  if (commentsUnsubRef.current) commentsUnsubRef.current();
  try {
    const docs = collection(db, 'comments');
    const ref = query(docs, where('animeId', '==', epId), orderBy('createdAt', 'asc'));
    commentsUnsubRef.current = onSnapshot(ref, (list) => {
      let value = [];
      list.docs.forEach(element => {
        value.push({ data: element.data(), id: element.id });
      });
      setAllComments(value);
    });
  } catch (error) {
    console.log('error fetching comments')
  }
}

const fetchHistory = (id) => {
  if (historyUnsubRef.current) historyUnsubRef.current();
  const docs = collection(db, 'history');
  const ref = query(docs, where('userId', '==', id));
  historyUnsubRef.current = onSnapshot(ref, (list) => {
    let value = [];
    list.docs.forEach(element => {
      value.push({ data: element.data(), id: element.id });
    });
    setHistoryRecords(value);
  });
}

const getUserProfile = (id) => {
  if (profileUnsubRef.current) profileUnsubRef.current();
  const docs = collection(db, 'users');
  const ref = query(docs, where('userId', '==', id));
  profileUnsubRef.current = onSnapshot(ref, (list) => {
    let value = [];
    list.docs.forEach(element => {
      value.push({ data: element.data(), id: element.id });
    });
    setProfile(value);
  });
}

  return (
    <myContext.Provider value={{
     userData: userData,
     getUserlikes,
     likesData,
     getAllLikes,
     allLikeData,
     getUserWatchList,
     userWatchList,
     getAllComments,
     allComments,
     historyRecords,
     setUserIdhere,
     episodeId,
     getEpisodeIdbyDefault,
     fetchHistory,
     profile,
    }}>
    {children}
  </myContext.Provider>
  )
}

export {GlobalProvider, myContext};