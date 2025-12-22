// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD0zqklJ1e-36v_FZ2t3UswaC7vjZ0iORU",
  authDomain: "bathroom-finder-12ffc.firebaseapp.com",
  projectId: "bathroom-finder-12ffc",
  storageBucket: "bathroom-finder-12ffc.firebasestorage.app",
  messagingSenderId: "581559285498",
  appId: "1:581559285498:web:4b74b99e91fd0f17bafb43",
  measurementId: "G-S892VTHC10"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
