
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC_6I60n1Mac7PBMD8sqyGqxvxU_rqpE2s",
  authDomain: "smart-classroom-mk.firebaseapp.com",
  projectId: "smart-classroom-mk",
  storageBucket: "smart-classroom-mk.firebasestorage.app",
  messagingSenderId: "769161438468",
  appId: "1:769161438468:web:8cad6592f6a32ec7c4dc51",
};

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
