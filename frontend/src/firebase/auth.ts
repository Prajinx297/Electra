import { signInAnonymously, onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "./config";

export const ensureAnonymousAuth = async (): Promise<User> => {
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
};

export const subscribeToAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const signInWithGoogle = loginWithGoogle;

export const logoutUser = () => signOut(auth);

export const getCurrentUserToken = async (): Promise<string | null> => {
  if (!auth.currentUser) return null;
  return auth.currentUser.getIdToken();
};
