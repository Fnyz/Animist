
import { initializeApp } from "firebase/app";
import {getAuth} from 'firebase/auth'
import {getFirestore} from 'firebase/firestore'

const firebaseConfig = {
    apiKey: "AIzaSyBGLik5JJRI6r97mCwNSu9lmGWeSwhla78",
    authDomain: "animist-f6538.firebaseapp.com",
    projectId: "animist-f6538",
    storageBucket: "animist-f6538.appspot.com",
    messagingSenderId: "747175310220",
    appId: "1:747175310220:web:6088a3be39f93e6789dca9"
  };

const app = initializeApp(firebaseConfig);

export const Auth = getAuth(app);
export const db = getFirestore(app)

