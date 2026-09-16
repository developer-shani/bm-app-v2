import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyAVpsDS2MeGbo-YliX0kc5jSQM6BzJ2hJo",
  authDomain: "installmentsalesmanager.firebaseapp.com",
  projectId: "installmentsalesmanager",
  storageBucket: "installmentsalesmanager.firebasestorage.app",
  messagingSenderId: "115891816089",
  appId: "1:115891816089:web:9f042dc65f7386bd521a08",
  measurementId: "G-EYLETE02KB",
};

// Initialize Firebase App safely
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Safe lazy service accessors to prevent SSR node evaluation errors during Next.js static prerender
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

export const getFirebaseAuth = (): Auth => {
  if (!authInstance) {
    authInstance = getAuth(app);
  }
  return authInstance;
};

export const getFirebaseDb = (): Firestore => {
  if (!dbInstance) {
    dbInstance = getFirestore(app);
  }
  return dbInstance;
};

export const getFirebaseStorage = (): FirebaseStorage => {
  if (!storageInstance) {
    storageInstance = getStorage(app);
  }
  return storageInstance;
};

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

