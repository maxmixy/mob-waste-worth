import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

// Replace these with values from your Firebase console or keep current ones
const firebaseConfig = {
  apiKey: "AIzaSyCxj-RNwupirseU_-mGR7LtsLGA86P_GVM",
  authDomain: "waste-to-worth-7d5b0.firebaseapp.com",
  projectId: "waste-to-worth-7d5b0",
  storageBucket: "waste-to-worth-7d5b0.firebasestorage.app",
  messagingSenderId: "648267234726",
  appId: "1:648267234726:web:3e70721145557b2f316367",
  measurementId: "G-E8563BL8PJ",
};

const app = initializeApp(firebaseConfig);

// Initialize auth with persistence on native, fallback to web getAuth
let auth: Auth;
try {
  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    // For React Native, use getAuth with default persistence
    auth = getAuth(app);
  }
} catch (e) {
  // In case of any error, fallback to getAuth
  auth = getAuth(app);
}

// Firestore and Storage
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
