// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDzZ0JyjctawSH3V-Rl81pHlACfaRyy01c",
  authDomain: "absensi-mahasiswa-60487.firebaseapp.com",
  projectId: "absensi-mahasiswa-60487",
  storageBucket: "absensi-mahasiswa-60487.firebasestorage.app",
  messagingSenderId: "1016038298559",
  appId: "1:1016038298559:web:56e5d20928c69f67e9070a",
  measurementId: "G-4NC1SEM1GC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { app, db, analytics };