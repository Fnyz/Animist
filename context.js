
import { createContext, useState, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, Auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { where, query, onSnapshot, collection, addDoc, deleteDoc, doc, orderBy, serverTimestamp } from 'firebase/firestore';

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
    // Firebase sign-in state: the app shows the login screens until a verified user is signed in.
    const [authUser, setAuthUser] = useState(null);
    const [verified, setVerified] = useState(false);
    const [authReady, setAuthReady] = useState(false);

    const likesUnsubRef = useRef(null);
    const allLikesUnsubRef = useRef(null);
    const watchListUnsubRef = useRef(null);
    const commentsUnsubRef = useRef(null);
    const historyUnsubRef = useRef(null);
    const profileUnsubRef = useRef(null);

    const stopListeners = () => {
      for (const ref of [likesUnsubRef, allLikesUnsubRef, watchListUnsubRef, commentsUnsubRef, historyUnsubRef, profileUnsubRef]) {
        if (ref.current) ref.current();
        ref.current = null;
      }
    };

    useEffect(() => {
      // Stop listening as soon as the user signs out; signed-out reads are denied by the rules.
      const unsubscribeAuth = onAuthStateChanged(Auth, (user) => {
        setAuthUser(user);
        setVerified(!!user?.emailVerified);
        setAuthReady(true);
        if (user?.emailVerified) {
          startUserListeners(user);
          return;
        }
        stopListeners();
        setUserData(null);
        setUserWatch([]);
        setHistoryRecords([]);
        setProfile(null);
      });
      return () => {
        unsubscribeAuth();
        stopListeners();
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

// Loads everything that belongs to a signed-in, verified user.
const startUserListeners = (user) => {
  setUserData({ id: user.uid, user: user.email?.split('@')[0] });
  fetchHistory(user.uid);
  getUserWatchList(user.uid);
  getUserProfile(user.uid);
};

// Re-checks the signed-in user, e.g. after they click the verification link in their email.
const refreshUser = async () => {
  const user = Auth.currentUser;
  if (!user) return false;
  await user.reload();
  const fresh = Auth.currentUser;
  setAuthUser(fresh);
  setVerified(!!fresh?.emailVerified);
  if (fresh?.emailVerified) startUserListeners(fresh);
  return !!fresh?.emailVerified;
};

const findInWatchList = (animeId) =>
  userWatchList.find((w) => String(w.data.titleId) === String(animeId));

// Stores the title and poster too, so My List can show items without extra API requests.
const addToWatchList = (anime) =>
  addDoc(collection(db, 'watchList'), {
    name: userData?.user ?? '',
    userId: userData.id,
    titleId: anime.id,
    title: anime.title,
    image: anime.image,
    type: anime.type ?? null,
    createdAt: serverTimestamp(),
  });

const removeFromWatchList = (docId) => deleteDoc(doc(db, 'watchList', docId));

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
    const username = value[0]?.data.username;
    if (username) setUserData((prev) => (prev ? { ...prev, user: username } : prev));
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
     authUser,
     verified,
     authReady,
     refreshUser,
     findInWatchList,
     addToWatchList,
     removeFromWatchList,
    }}>
    {children}
  </myContext.Provider>
  )
}

export {GlobalProvider, myContext};