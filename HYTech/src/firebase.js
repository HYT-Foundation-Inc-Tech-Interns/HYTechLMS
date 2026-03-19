import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasValidFirebaseConfig =
  typeof firebaseConfig.apiKey === 'string' &&
  firebaseConfig.apiKey.trim().length > 0 &&
  typeof firebaseConfig.authDomain === 'string' &&
  firebaseConfig.authDomain.trim().length > 0 &&
  typeof firebaseConfig.projectId === 'string' &&
  firebaseConfig.projectId.trim().length > 0 &&
  typeof firebaseConfig.appId === 'string' &&
  firebaseConfig.appId.trim().length > 0;

let app = null;
let auth = null;
let db = null;

export let firebaseInitError = '';

if (hasValidFirebaseConfig) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  firebaseInitError =
    'Firebase config is missing. Add VITE_FIREBASE_* values in .env.local and restart the dev server.';
  console.error(firebaseInitError);
}

export { app, auth, db, firebaseConfig, hasValidFirebaseConfig };
