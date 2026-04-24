import { doc, getFirestore, setDoc } from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import { firebaseConfig } from "./config";
import type { SessionPayload } from "../types";

const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId
);
const app = hasFirebaseConfig ? getApps()[0] ?? initializeApp(firebaseConfig) : null;
const db = app ? getFirestore(app) : null;

export const persistSession = async (userId: string, payload: SessionPayload) => {
  if (!db) {
    return;
  }
  const ref = doc(db, "users", userId, "sessions", payload.journeyId);
  await setDoc(ref, payload, { merge: true });
};

export { db };
