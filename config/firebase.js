import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA0iqNNG6MaQsnlZ6rLjvFMW3gCO-j68lw",
  authDomain: "bathroom-finder.firebaseapp.com",
  projectId: "bathroom-finder",
  storageBucket: "bathroom-finder.firebasestorage.app",
  messagingSenderId: "899288851959",
  appId: "1:899288851959:web:e7b7154da5acc6f77aa9df"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with minimum cache and force network first
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
  cacheSizeBytes: 1048576, // Minimum allowed (1MB)
});

export const auth = getAuth(app);

console.log('Firebase initialized with minimal cache');