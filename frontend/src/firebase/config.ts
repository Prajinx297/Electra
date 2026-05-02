import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

import { initAppCheck } from './appCheck';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'test-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'electra.local',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'electra-local',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'electra-local.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '100000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:100000000000:web:electra',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? 'G-ELECTRA',
};

export const app = initializeApp(firebaseConfig);
initAppCheck(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Analytics is only supported in browser environments
export let analytics: Analytics | null = null;
void isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});
