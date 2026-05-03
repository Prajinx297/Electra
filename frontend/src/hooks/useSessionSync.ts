import { useEffect } from 'react';
import { useDebounce } from 'use-debounce';

import { persistSession } from '../firebase/firestore';
import { logger } from '../lib/logger';
import type { SessionPayload } from '../types';

/**
 * Debounces and persists a non-guest civic journey session to Firestore.
 *
 * @param userId - Authenticated user id that owns the session
 * @param sessionPayload - Latest journey state snapshot to persist
 */
export function useSessionSync(userId: string, sessionPayload: SessionPayload): void {
  // Debounce the state payload by 2 seconds to prevent Firestore write amplification
  const [debouncedSession] = useDebounce(sessionPayload, 2000);

  useEffect(() => {
    if (userId !== 'guest' && debouncedSession) {
      persistSession(userId, debouncedSession).catch((error) => {
        logger.error('Failed to sync session to Firestore', error);
      });
    }
  }, [debouncedSession, userId]);
}
