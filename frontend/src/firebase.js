// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Replace this with YOUR config object from Step 2C
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: "farmmate-three.vercel.app",
  projectId: "farmmate-9c4b4",
  storageBucket: "farmmate-9c4b4.firebasestorage.app",
  messagingSenderId: "855751012352",
  appId: "1:855751012352:web:09de4e2637aaba6e4c68e5"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);