import {
  GoogleAuthProvider,
  type UserCredential,
  type User,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  type Unsubscribe,
} from 'firebase/auth';

import { auth } from './config';

/**
 * Ensures the current session has at least anonymous authentication.
 *
 * @returns The authenticated Firebase user.
 * @throws {Error} When Firebase anonymous sign-in fails.
 */
export const ensureAnonymousAuth = async (): Promise<User> => {
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
};

/**
 * Subscribes to Firebase auth state changes for the active app.
 *
 * @param callback - Listener invoked whenever Firebase auth user changes.
 * @returns Firebase unsubscribe callback.
 * @throws {Error} When subscription wiring fails.
 */
export const subscribeToAuth = (callback: (user: User | null) => void): Unsubscribe => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Starts Google OAuth popup sign-in flow.
 *
 * @returns Firebase user credential produced by Google OAuth.
 * @throws {Error} When popup auth fails or is blocked.
 */
export const signInWithGoogle = async (): Promise<UserCredential> => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

/**
 * Retrieves a fresh ID token for the current Firebase user.
 *
 * @returns User token string, or null when no current user exists.
 * @throws {Error} When token refresh fails.
 */
export const getCurrentUserToken = async (): Promise<string | null> => {
  if (!auth.currentUser) return null;
  return auth.currentUser.getIdToken();
};
