import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBvEH9qYBComoC8nh1LaNIvFJW9_3gV-5Q",
  authDomain: "gozipp-706bd.firebaseapp.com",
  projectId: "gozipp-706bd",
  storageBucket: "gozipp-706bd.firebasestorage.app",
  messagingSenderId: "292265529664",
  appId: "1:292265529664:web:1bf9e0207928bba73beaa5",
  measurementId: "G-YVB28X6R5J"
};

// Initialize Firebase only if it hasn't been initialized already
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
