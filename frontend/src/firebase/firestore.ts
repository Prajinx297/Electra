import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
} from 'firebase/firestore';

import type {
  AuditResult,
  BallotEvent,
  OnboardingProfile,
  OracleHistoryEntry,
  SessionPayload,
  TallyResult,
  CertificationEvent,
} from '../types';

import { db } from './config';

interface StoredSession extends SessionPayload {
  updatedAt?: unknown;
}

interface OutdatedFlag {
  sessionId: string;
  sourceId: string;
  reason: string;
  createdAt?: unknown;
}

interface SimulationSnapshot {
  ballotEvent: BallotEvent | null;
  tally: TallyResult | null;
  certification: CertificationEvent | null;
  audit: AuditResult | null;
  completedAt: string;
  updatedAt?: unknown;
}

const sessionConverter: FirestoreDataConverter<StoredSession> = {
  toFirestore: (session) => session,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions) =>
    snapshot.data(options) as StoredSession,
};

export const persistSession = async (userId: string, payload: SessionPayload) => {
  await setDoc(
    doc(db, 'sessions', userId).withConverter(sessionConverter),
    { ...payload, updatedAt: serverTimestamp() },
    { merge: true },
  );
};

export const loadSession = async (userId: string) => {
  const snapshot = await getDoc(doc(db, 'sessions', userId).withConverter(sessionConverter));
  return snapshot.exists() ? snapshot.data() : null;
};

export const persistConversationTurn = async (
  userId: string,
  sessionId: string,
  entry: OracleHistoryEntry,
) => {
  await addDoc(collection(db, 'sessions', userId, 'conversations'), {
    ...entry,
    sessionId,
    createdAt: serverTimestamp(),
  });
};

export const persistOnboardingProfile = async (userId: string, profile: OnboardingProfile) => {
  await setDoc(
    doc(db, 'onboardingProfiles', userId),
    { ...profile, updatedAt: serverTimestamp() },
    { merge: true },
  );
};

export const flagSourceAsOutdated = async (flag: OutdatedFlag) => {
  await addDoc(collection(db, 'reviewQueue'), {
    ...flag,
    createdAt: serverTimestamp(),
  });
};

export const persistSimulationState = async (sessionId: string, snapshot: SimulationSnapshot) => {
  await setDoc(
    doc(db, 'simulationRuns', sessionId),
    { ...snapshot, updatedAt: serverTimestamp() },
    { merge: true },
  );
};
