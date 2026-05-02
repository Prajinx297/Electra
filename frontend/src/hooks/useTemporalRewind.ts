import { useCallback } from 'react';

import { useElectraStore } from '@/engines/stateEngine';
import type { HistoryEntry, JourneyState } from '@/types';

interface UseTemporalRewindReturn {
  rewindTo: (nodeId: JourneyState) => void;
  canRewind: boolean;
  history: HistoryEntry[];
}

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
