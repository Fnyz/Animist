
import { createContext, useState, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, Auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { where, query, onSnapshot, collection, addDoc, deleteDoc, doc, setDoc, updateDoc, orderBy, serverTimestamp, writeBatch } from 'firebase/firestore';
import { offerEpisodeNotifications } from './notifications';
import { DEFAULT_STATUS } from './listStatus';

const myContext = createContext();

const GlobalProvider = ({children}) => {

    const [userData, setUserData] = useState(null);
    const [likesData, setLikesData] = useState([]);
    const [allLikeData, setAllLikeData] = useState([]);
    const [episodeId, setEpisodeId] = useState(null);
    const [userWatchList, setUserWatch] = useState([]);
    const [historyRecords , setHistoryRecords] = useState([]);
    const [profile, setProfile] = useState(null);
    // Firebase sign-in state. Anyone can browse and watch; saving a list, history and progress
    // needs a signed-in user with a verified email (`signedIn`).
    const [authUser, setAuthUser] = useState(null);
    const [verified, setVerified] = useState(false);
    const [authReady, setAuthReady] = useState(false);
    const signedIn = Boolean(authUser && verified);

    const likesUnsubRef = useRef(null);
    const allLikesUnsubRef = useRef(null);
    const watchListUnsubRef = useRef(null);
    const historyUnsubRef = useRef(null);
    const profileUnsubRef = useRef(null);

    const stopListeners = () => {
      for (const ref of [likesUnsubRef, allLikesUnsubRef, watchListUnsubRef, historyUnsubRef, profileUnsubRef]) {
        if (ref.current) ref.current();
        ref.current = null;
      }
    };


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
      } catch {
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
// The first time, it also offers new-episode notifications for the anime on the list.
const addToWatchList = async (anime, status = DEFAULT_STATUS) => {
  const added = await addDoc(collection(db, 'watchList'), {
    name: userData?.user ?? '',
    userId: userData.id,
    titleId: anime.id,
    title: anime.title,
    image: anime.image,
    type: anime.type ?? null,
    status,
    createdAt: serverTimestamp(),
  });
  offerEpisodeNotifications(userData.id);
  return added;
};

// Adds many anime at once (an AniList import): items [{ anime, status }]. Saved in batches (Firestore
// takes up to 500 writes in one), so a big list is a few requests, not hundreds. onProgress(saved).
const IMPORT_BATCH = 400;
const importToWatchList = async (items, onProgress) => {
  let saved = 0;
  for (let i = 0; i < items.length; i += IMPORT_BATCH) {
    const batch = writeBatch(db);
    for (const { anime, status } of items.slice(i, i + IMPORT_BATCH)) {
      batch.set(doc(collection(db, 'watchList')), {
        name: userData?.user ?? '',
        userId: userData.id,
        titleId: anime.id,
        title: anime.title,
        image: anime.image,
        type: anime.type ?? null,
        status,
        source: 'anilist',
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
    saved = Math.min(i + IMPORT_BATCH, items.length);
    onProgress?.(saved);
  }
  if (saved) offerEpisodeNotifications(userData.id);
  return saved;
};

const removeFromWatchList = (docId) => deleteDoc(doc(db, 'watchList', docId));

// Watching, Plan to watch, Completed or Dropped (see listStatus.js).
const setListStatus = (docId, status) => updateDoc(doc(db, 'watchList', docId), { status, statusAt: serverTimestamp() });

// One history entry per anime (the latest episode watched), shown in My List > History.
// `progress` ({ position, duration } in seconds) is kept per episode, so every episode resumes
// where it was left; merge keeps the other episodes' positions.
const recordWatch = (anime, episodeNumber, progress) => {
  if (!userData?.id) return Promise.resolve();
  const entry = {
    userId: userData.id,
    titleId: anime.id,
    title: anime.title,
    image: anime.image,
    epiNumber: episodeNumber,
    updatedAt: serverTimestamp(),
  };
  if (progress?.duration > 0) {
    entry.positions = { [episodeNumber]: Math.floor(progress.position) };
    entry.durations = { [episodeNumber]: Math.floor(progress.duration) };
  }
  return setDoc(doc(db, 'history', `${userData.id}_${anime.id}`), entry, { merge: true });
};

// Where an episode was left, in seconds, from History (0 when never started).
const watchProgress = (animeId, episodeNumber) => {
  const record = historyRecords.find((h) => String(h.data.titleId) === String(animeId));
  return {
    position: record?.data.positions?.[episodeNumber] ?? 0,
    duration: record?.data.durations?.[episodeNumber] ?? 0,
  };
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
    } catch {
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
  } catch {
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
  } catch {
    console.log('error fetching alllikes')
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
      // Runs once: the listener functions above only use state setters and refs.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

  return (
    <myContext.Provider value={{
     userData: userData,
     getUserlikes,
     likesData,
     getAllLikes,
     allLikeData,
     getUserWatchList,
     userWatchList,
     historyRecords,
     setUserIdhere,
     episodeId,
     getEpisodeIdbyDefault,
     fetchHistory,
     profile,
     authUser,
     verified,
     authReady,
     signedIn,
     refreshUser,
     findInWatchList,
     addToWatchList,
     importToWatchList,
     removeFromWatchList,
     setListStatus,
     recordWatch,
     watchProgress,
    }}>
    {children}
  </myContext.Provider>
  )
}

export {GlobalProvider, myContext};