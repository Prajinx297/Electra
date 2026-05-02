import { useCallback } from 'react';

import { useElectraStore } from '@/engines/stateEngine';
import type { HistoryEntry, JourneyState } from '@/types';

interface UseTemporalRewindReturn {
  rewindTo: (nodeId: JourneyState) => void;
  canRewind: boolean;
  history: HistoryEntry[];
}

/**
 * Exposes temporal rewind controls backed by the journey state engine.
 *
 * @example
 * ```ts
 * const { rewindTo, canRewind, history } = useTemporalRewind();
 * if (canRewind) rewindTo(history[0].state);
 * ```
 *
 * @returns Rewind handler and current history metadata.
 * @throws {Error} Never thrown directly; delegates to Zustand store actions.
 */
export function useTemporalRewind(): UseTemporalRewindReturn {
  const history = useElectraStore((state) => state.history);
  const rewindToState = useElectraStore((state) => state.rewindToState);

  const handleRewind = useCallback(
    (nodeId: JourneyState): void => {
      rewindToState(nodeId);
    },
    [rewindToState],
  );

  return {
    rewindTo: handleRewind,
    canRewind: history.length > 1,
    history,
  };
}
