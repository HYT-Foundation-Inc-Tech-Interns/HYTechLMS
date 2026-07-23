import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

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
let storage = null;
let functions = null;

export let firebaseInitError = '';

if (hasValidFirebaseConfig) {
  app = initializeApp(firebaseConfig);

  // App Check (optional): when a reCAPTCHA v3 site key is provided, attest that
  // requests come from this app. Enforce it in the Firebase console to block
  // API abuse from scripts/stolen configs. No-op when the key is absent.
  const appCheckSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (appCheckSiteKey) {
    try {
      if (import.meta.env.VITE_APPCHECK_DEBUG_TOKEN) {
        // eslint-disable-next-line no-undef
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
      }
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (appCheckErr) {
      console.warn('App Check init failed:', appCheckErr?.message);
    }
  }

  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app, 'asia-southeast1');
} else {
  firebaseInitError =
    'Firebase config is missing. Add VITE_FIREBASE_* values in .env.local and restart the dev server.';
  console.error(firebaseInitError);
}

export { app, auth, db, storage, functions, firebaseConfig, hasValidFirebaseConfig };
