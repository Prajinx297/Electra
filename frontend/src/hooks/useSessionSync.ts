import { useEffect } from 'react';
import { useDebounce } from 'use-debounce';

import { persistSession } from '../firebase/firestore';
import { logger } from '../lib/logger';
import type { SessionPayload } from '../types';

/**
 * Debounces and persists session state snapshots to Firestore.
 *
 * @param userId - Authenticated user ID (or guest marker).
 * @param sessionPayload - Session payload snapshot to persist.
 * @example
 * ```ts
 * useSessionSync(userId, payload);
 * ```
 * @returns No return value.
 * @throws {Error} Never thrown directly; persistence failures are logged.
 */
export function useSessionSync(userId: string, sessionPayload: SessionPayload): void {
  // Debounce the state payload by 2 seconds to prevent Firestore write amplification
  const [debouncedSession] = useDebounce(sessionPayload, 2000);

  useEffect((): void => {
    if (userId !== 'guest' && debouncedSession) {
      void persistSession(userId, debouncedSession).catch((error: unknown): void => {
        logger.error('Failed to sync session to Firestore', error);
      });
    }
  }, [debouncedSession, userId]);
}
