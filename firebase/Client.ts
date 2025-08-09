import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from 'firebase/auth'
import { getFirestore } from "firebase/firestore"; 

const firebaseConfig = {
  apiKey: "AIzaSyDcqqIEJckudYww6XBiG6soawVt6sbCWd8",
  authDomain: "prepwise-dd0fa.firebaseapp.com",
  projectId: "prepwise-dd0fa",
  storageBucket: "prepwise-dd0fa.firebasestorage.app",
  messagingSenderId: "910317099553",
  appId: "1:910317099553:web:e8c196f22dbe8bd67b2160",
  measurementId: "G-682EBJ1PJ1"
};

// Initialize Firebase
const app = !getApps.length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);