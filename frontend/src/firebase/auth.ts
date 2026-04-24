import { initializeApp, getApps } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  type User
} from "firebase/auth";
import { firebaseConfig } from "./config";

const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId
);
const app = hasFirebaseConfig ? getApps()[0] ?? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const googleProvider = new GoogleAuthProvider();

export const ensureAnonymousAuth = async () => {
  if (!auth) {
    return null;
  }
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  return auth.currentUser;
};

export const signInWithGoogle = async () => {
  if (!auth) {
    return null;
  }
  if (auth.currentUser?.isAnonymous) {
    return linkWithPopup(auth.currentUser, googleProvider);
  }
  return signInWithPopup(auth, googleProvider);
};

export const subscribeToAuth = (callback: (user: User | null) => void) =>
  auth
    ? onAuthStateChanged(auth, callback)
    : (() => {
        callback(null);
        return () => undefined;
      })();

export const getCurrentUserToken = async () => auth?.currentUser?.getIdToken();

export { auth };
