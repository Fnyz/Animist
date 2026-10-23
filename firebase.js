
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCmvFx8bIAEpu2IBRoHn-NO4X14ZnDEq7E",
  authDomain: "animist-67715.firebaseapp.com",
  projectId: "animist-67715",
  storageBucket: "animist-67715.firebasestorage.app",
  messagingSenderId: "140996729252",
  appId: "1:140996729252:web:e74f2922bf00b95aabc931",
  measurementId: "G-54T475KZGP"
};

const app = initializeApp(firebaseConfig);

// Persist the session in AsyncStorage so users stay signed in between launches.
export const Auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db = getFirestore(app)
