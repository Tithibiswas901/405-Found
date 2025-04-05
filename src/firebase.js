import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA1UaPnyRW_cR9hDqwFH4pFVohUqJpEvQg",
  authDomain: "found-2a408.firebaseapp.com",
  projectId: "found-2a408",
  storageBucket: "found-2a408.firebasestorage.app",
  messagingSenderId: "268855966690",
  appId: "1:268855966690:web:3b22f0a2f8eb1db068d7bb",
  measurementId: "G-337ZYCTBY5",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Authentication
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };